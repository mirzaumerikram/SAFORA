const turf = require('@turf/turf');

class SafetySentinel {
    constructor(io) {
        this.io = io;
        this.monitoredRides = new Map(); // rideId -> monitoring data
        this.DEVIATION_THRESHOLD = 500; // meters — alert fires immediately past this, no grace window
        this.SUSPICIOUS_STOP_DURATION = 300000; // 5 minutes
        this.SIGNAL_LOST_THRESHOLD = 75000; // 75s with no ping from either device is itself a risk signal

        // onSignalLost(rideId, alertObj) — set by index.js. Deviation/stop checks only run
        // when a location ping arrives, so total silence (driver phone dead/offline, no
        // internet) needs its own timer-driven sweep instead of waiting for the next ping.
        this.onSignalLost = null;
        this.signalCheckTimer = setInterval(() => this._checkSignalLoss(), 20000);
        this.signalCheckTimer.unref?.(); // don't keep the process alive on this timer alone (e.g. test scripts)
    }

    /**
     * Start monitoring a ride
     */
    startMonitoring(rideId, plannedRoute) {
        console.log(`Safety Sentinel: Started monitoring ride ${rideId}`);

        const now = Date.now();
        this.monitoredRides.set(rideId, {
            plannedRoute,
            lastLocation: null,
            lastMovementTime: now,
            isDeviated: false,
            driverLastUpdate: now,
            passengerLastUpdate: null,
            signalLost: false,
        });
    }

    /**
     * Stop monitoring a ride
     */
    stopMonitoring(rideId) {
        console.log(`Safety Sentinel: Stopped monitoring ride ${rideId}`);
        this.monitoredRides.delete(rideId);
    }

    /**
     * Update current location and check for anomalies.
     *
     * `source` is 'driver' (primary) or 'passenger' (redundant fallback). The passenger's
     * phone is present for the whole ride, so its GPS keeps the ride observable if the
     * driver's device goes dark — but it only takes over the actual deviation/stop math
     * once the driver's own feed has gone stale, so the driver's GPS stays the source of
     * truth whenever it's healthy.
     */
    async updateLocation(rideId, currentLocation, source = 'driver') {
        const monitoringData = this.monitoredRides.get(rideId);

        if (!monitoringData) {
            console.warn(`Ride ${rideId} is not being monitored`);
            return null;
        }

        const now = Date.now();
        monitoringData[`${source}LastUpdate`] = now;

        const driverIsStale = now - (monitoringData.driverLastUpdate || 0) > this.SIGNAL_LOST_THRESHOLD;
        if (source === 'passenger' && !driverIsStale) {
            // Driver feed is healthy — record the passenger ping as a live backup signal
            // but don't let it drive the route math.
            return null;
        }

        let signalRestored = false;
        if (monitoringData.signalLost) {
            monitoringData.signalLost = false;
            signalRestored = true;
            console.log(`Ride ${rideId}: Signal restored (via ${source} device)`);
        }

        const { plannedRoute, lastLocation } = monitoringData;

        // Calculate distance from planned route
        const currentPoint = turf.point([currentLocation.lng, currentLocation.lat]);
        const routeLine = turf.lineString(plannedRoute);
        const distance = turf.pointToLineDistance(currentPoint, routeLine, { units: 'meters' });

        let alert = null;
        const sourceNote = source === 'passenger' ? ' (tracked via passenger device — driver signal lost)' : '';

        // Check for route deviation — fires immediately on the first reading past the
        // 500m threshold, no sustained grace window. isDeviated only latches so a
        // continuously deviated ride does not re-alert on every single ping.
        if (distance > this.DEVIATION_THRESHOLD) {
            if (!monitoringData.isDeviated) {
                alert = {
                    type: 'route-deviation',
                    location: currentLocation,
                    description: `Vehicle deviated ${Math.round(distance)}m from planned route!${sourceNote}`,
                    distance: Math.round(distance)
                };
                monitoringData.isDeviated = true;
                console.log(`Ride ${rideId}: ALERT - Route deviation detected (${Math.round(distance)}m off route).`);
            }
        } else {
            // Reset deviation state once back on route
            if (monitoringData.isDeviated) {
                console.log(`Ride ${rideId}: Back on route`);
                monitoringData.isDeviated = false;
            }
        }

        // Check for suspicious stops
        if (lastLocation && !alert) {
            const movementDistance = turf.distance(
                turf.point([lastLocation.lng, lastLocation.lat]),
                currentPoint,
                { units: 'meters' }
            );

            if (movementDistance < 10) { // Less than 10 meters movement
                const stopDuration = now - monitoringData.lastMovementTime;

                if (stopDuration > this.SUSPICIOUS_STOP_DURATION) {
                    alert = {
                        type: 'suspicious-stop',
                        location: currentLocation,
                        description: `Vehicle stopped for ${Math.round(stopDuration / 60000)} minutes${sourceNote}`,
                        duration: Math.round(stopDuration / 1000)
                    };

                    console.log(`Ride ${rideId}: ALERT - Suspicious stop`);
                }
            } else {
                // Vehicle is moving
                monitoringData.lastMovementTime = now;
            }
        }

        // Update last location
        monitoringData.lastLocation = currentLocation;

        if (!alert && signalRestored) {
            alert = {
                type: 'signal-restored',
                location: currentLocation,
                description: source === 'passenger'
                    ? 'Driver location signal restored via passenger device fallback.'
                    : 'Driver location signal restored.',
            };
        }

        return alert;
    }

    /**
     * Timer-driven sweep — catches total silence (both driver and passenger devices
     * stopped reporting) that the ping-triggered checks above would never see, since
     * they only run when a location update actually arrives.
     */
    _checkSignalLoss() {
        const now = Date.now();

        for (const [rideId, monitoringData] of this.monitoredRides.entries()) {
            if (monitoringData.signalLost || !monitoringData.lastLocation) continue;

            const driverAge = now - (monitoringData.driverLastUpdate || 0);
            const passengerAge = monitoringData.passengerLastUpdate
                ? now - monitoringData.passengerLastUpdate
                : Infinity;

            // Only escalate when BOTH channels have gone dark — one device still
            // reporting means the ride isn't actually unobserved.
            if (driverAge > this.SIGNAL_LOST_THRESHOLD && passengerAge > this.SIGNAL_LOST_THRESHOLD) {
                monitoringData.signalLost = true;
                const silentSecs = Math.round(Math.min(driverAge, passengerAge) / 1000);
                const alert = {
                    type: 'signal-lost',
                    location: monitoringData.lastLocation,
                    description: `No location signal from driver or passenger device for ${silentSecs}s during an active trip.`,
                    duration: silentSecs,
                };
                console.warn(`Ride ${rideId}: ALERT - Signal lost (${silentSecs}s silent)`);
                if (typeof this.onSignalLost === 'function') {
                    this.onSignalLost(rideId, alert);
                }
            }
        }
    }

    /**
     * Get monitoring status for a ride
     */
    getMonitoringStatus(rideId) {
        return this.monitoredRides.has(rideId);
    }

    /**
     * Get all monitored rides
     */
    getMonitoredRides() {
        return Array.from(this.monitoredRides.keys());
    }
}

module.exports = SafetySentinel;
