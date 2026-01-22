const turf = require('@turf/turf');

class SafetySentinel {
    constructor(io) {
        this.io = io;
        this.monitoredRides = new Map(); // rideId -> monitoring data
        this.DEVIATION_THRESHOLD = 500; // meters
        this.DEVIATION_DURATION = 30000; // 30 seconds in milliseconds
        this.SUSPICIOUS_STOP_DURATION = 300000; // 5 minutes
    }

    /**
     * Start monitoring a ride
     */
    startMonitoring(rideId, plannedRoute) {
        console.log(`Safety Sentinel: Started monitoring ride ${rideId}`);

        this.monitoredRides.set(rideId, {
            plannedRoute,
            deviationStartTime: null,
            lastLocation: null,
            lastMovementTime: Date.now(),
            isDeviated: false
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
     * Update current location and check for anomalies
     */
    async updateLocation(rideId, currentLocation) {
        const monitoringData = this.monitoredRides.get(rideId);

        if (!monitoringData) {
            console.warn(`Ride ${rideId} is not being monitored`);
            return null;
        }

        const { plannedRoute, deviationStartTime, lastLocation } = monitoringData;

        // Calculate distance from planned route
        const currentPoint = turf.point([currentLocation.lng, currentLocation.lat]);
        const routeLine = turf.lineString(plannedRoute);
        const distance = turf.pointToLineDistance(currentPoint, routeLine, { units: 'meters' });

        const now = Date.now();
        let alert = null;

        // Check for route deviation
        if (distance > this.DEVIATION_THRESHOLD) {
            if (!deviationStartTime) {
                // Start deviation timer
                monitoringData.deviationStartTime = now;
                console.log(`Ride ${rideId}: Route deviation detected (${Math.round(distance)}m)`);
            } else {
                // Check if deviation has persisted
                const deviationDuration = now - deviationStartTime;

                if (deviationDuration > this.DEVIATION_DURATION && !monitoringData.isDeviated) {
                    // Trigger alert
                    alert = {
                        type: 'route-deviation',
                        location: currentLocation,
                        description: `Vehicle deviated ${Math.round(distance)}m from planned route for ${Math.round(deviationDuration / 1000)}s`,
                        distance: Math.round(distance),
                        duration: Math.round(deviationDuration / 1000)
                    };

                    monitoringData.isDeviated = true;
                    console.log(`Ride ${rideId}: ALERT - Sustained route deviation`);
                }
            }
        } else {
            // Reset deviation timer if back on route
            if (deviationStartTime) {
                console.log(`Ride ${rideId}: Back on route`);
                monitoringData.deviationStartTime = null;
                monitoringData.isDeviated = false;
            }
        }

        // Check for suspicious stops
        if (lastLocation) {
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
                        description: `Vehicle stopped for ${Math.round(stopDuration / 60000)} minutes`,
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

        return alert;
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
