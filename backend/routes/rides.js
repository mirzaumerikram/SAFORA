const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');
const axios = require('axios');
const { RideStateMachine } = require('../utils/RideStateMachine');
const { auth, authorize } = require('../middleware/auth');

// Maps a ride's `type` to the numeric encoding the AI pricing model was trained on
// (see ai-service/train_model.py — ride_type: 0=standard, 1=pink-pass, 2=eco)
const RIDE_TYPE_ENCODING = { standard: 0, 'pink-pass': 1, eco: 2 };

// Shared driver-matching logic — used both on initial request and when re-matching
// after a driver rejects/times out. Mutates and saves `ride`, emits Socket.io events,
// and sends a push notification to the matched driver (if any).
async function attemptDriverMatch(ride, io, pLat, pLng, excludeDriverIds = []) {
    const matchQuery = {
        status: 'online',
        currentLocation: {
            $near: {
                $geometry: { type: 'Point', coordinates: [pLng, pLat] },
                $maxDistance: 15000 // 15km search radius
            }
        }
    };
    if (excludeDriverIds.length > 0) {
        matchQuery._id = { $nin: excludeDriverIds };
    }

    const nearbyDrivers = await Driver.find(matchQuery)
        .populate('user', 'name gender phone')
        .limit(10);

    let matchedDriver = null;
    if (ride.type === 'pink-pass') {
        matchedDriver = nearbyDrivers.find(
            d => d.user.gender === 'female' && d.pinkPassStatus === 'approved'
        );
    } else {
        matchedDriver = nearbyDrivers[0] || null;
    }

    if (matchedDriver) {
        ride.driver = matchedDriver._id;
        ride.status = 'matched';
        await ride.save();

        if (io) {
            const passUser = await User.findById(ride.passenger);
            io.to(`driver-${matchedDriver._id}`).emit('ride:request', {
                rideId: ride._id,
                passenger: { name: passUser ? passUser.name : 'Passenger' },
                pickup: ride.pickupLocation,
                dropoff: ride.dropoffLocation,
                estimatedPrice: ride.estimatedPrice,
                estimatedDuration: ride.estimatedDuration,
                distance: ride.distance,
                type: ride.type
            });
        }

        try {
            const { notifyNewRideRequest } = require('../utils/notificationService');
            if (matchedDriver.fcmToken) {
                await notifyNewRideRequest(matchedDriver.fcmToken, ride.pickupLocation?.address || 'your area', String(ride._id));
            }
        } catch (fcmErr) {
            console.error('[FCM] new ride request push failed:', fcmErr.message);
        }
    } else if (io) {
        // No candidate found (or exhausted) — let the passenger know instead of leaving them polling forever.
        io.to(`ride-${ride._id}`).emit('ride:no-driver', { rideId: ride._id });
    }

    return matchedDriver;
}

// @route   POST /api/rides/request
// @desc    Request a new ride
// @access  Private (Passenger)
router.post('/request', auth, async (req, res) => {
    try {
        console.log('[RIDE] New request from user:', req.user.userId, 'role:', req.user.role);
        console.log('[RIDE] Body:', JSON.stringify(req.body, null, 2));

        const { pickupLocation, dropoffLocation, type, estimatedPrice: clientPrice, distance: clientDistance, estimatedDuration: clientDuration } = req.body;
        
        if (!pickupLocation || !dropoffLocation) {
            return res.status(400).json({ success: false, message: 'Pickup and dropoff locations are required' });
        }

        // Robustness: ensure we have numbers for coordinates
        const pLat = parseFloat(pickupLocation.lat) || 0;
        const pLng = parseFloat(pickupLocation.lng) || 0;
        const dLat = parseFloat(dropoffLocation.lat) || 0;
        const dLng = parseFloat(dropoffLocation.lng) || 0;

        const passengerId = req.user.userId; // From auth middleware

        if (type === 'pink-pass') {
            const User = require('../models/User');
            const passUser = await User.findById(passengerId);
            if (!passUser || passUser.gender !== 'female' || !passUser.pinkPassVerified) {
                return res.status(403).json({ success: false, message: 'Pink Pass is strictly reserved for verified female passengers.' });
            }
        }

        // Calculate real distance using Haversine formula
        const toRad = (deg) => deg * (Math.PI / 180);
        const R = 6371; // Earth radius in km
        const diffLat = toRad(dLat - pLat);
        const diffLng = toRad(dLng - pLng);
        const a =
            Math.sin(diffLat / 2) ** 2 +
            Math.cos(toRad(pLat)) * Math.cos(toRad(dLat)) *
            Math.sin(diffLng / 2) ** 2;
        const distance = clientDistance || parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2)) || 1.0;
        const estimatedDuration = clientDuration || Math.max(5, Math.round(distance * 3)); // ~3 min/km average

        // Use client price if provided, otherwise fallback to formula
        let estimatedPrice = clientPrice || Math.round((distance * 35) + (estimatedDuration * 5) + 50); 
        
        try {
            // ONLY use AI service if passenger hasn't already confirmed a price
            if (!clientPrice) {
                const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
                const pricingResponse = await axios.post(`${aiServiceUrl}/api/pricing/predict`, {
                    distance,
                    duration: estimatedDuration,
                    time_of_day: new Date().getHours(),
                    day_of_week: new Date().getDay(),
                    demand_level: 'medium',
                    ride_type: RIDE_TYPE_ENCODING[type] ?? RIDE_TYPE_ENCODING.standard,
                    traffic_multiplier: 1.0
                }, { timeout: 3000 });
                if (pricingResponse.data?.estimated_price) {
                    estimatedPrice = pricingResponse.data.estimated_price;
                }
            }
        } catch {
            // AI service not running or clientPrice exists — use existing price
        }

        // Create ride request
        const ride = new Ride({
            passenger: passengerId,
            pickupLocation: {
                address: pickupLocation.address,
                coordinates: [pickupLocation.lng, pickupLocation.lat]
            },
            dropoffLocation: {
                address: dropoffLocation.address,
                coordinates: [dropoffLocation.lng, dropoffLocation.lat]
            },
            distance,
            estimatedDuration,
            estimatedPrice,
            type: type || 'standard',
            status: 'requested'
        });

        await ride.save();

        try {
            console.log(`[RIDE_DEBUG] Searching for drivers near: ${pLat}, ${pLng}`);
            const io = req.app.get('io');
            const matchedDriver = await attemptDriverMatch(ride, io, pLat, pLng);
            console.log(matchedDriver
                ? `[RIDE_DEBUG] Matched with driver: ${matchedDriver.user.name} (${matchedDriver._id})`
                : '[RIDE_DEBUG] No driver matched.');
        } catch (matchErr) {
            console.error('[RIDE] Matching failed but ride saved:', matchErr.message);
            // We still proceed since the ride was already saved as 'requested' at line 72
        }

        res.status(201).json({
            success: true,
            ride: {
                id: ride._id,
                estimatedPrice,
                estimatedDuration,
                status: ride.status,
                driverMatched: !!ride.driver
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/rides/active-ride
// @desc    Get current active ride for user (passenger or driver)
// @access  Private
router.get('/active-ride', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const driver = await Driver.findOne({ user: userId });
        
        query = { 
            $or: [
                { passenger: userId },
                { driver: userId },
                { driverId: userId } // Legacy/Backup ID check
            ],
            status: { $in: ['requested', 'matched', 'accepted', 'arrived', 'started'] } 
        };
        
        if (driver) {
            query.$or.push({ driver: driver._id });
        }

        const ride = await Ride.findOne(query)
            .populate({
                path: 'passenger',
                select: 'name phone profilePicture'
            })
            .populate({
                path: 'driver',
                populate: { path: 'user', select: 'name phone gender profilePicture' }
            })
            .sort({ createdAt: -1 });

        if (!ride) {
            return res.json({ success: true, ride: null });
        }

        res.json({ success: true, ride });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/rides/:id
// @desc    Get ride details
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id)
            .populate({
                path: 'passenger',
                select: 'name phone profilePicture'
            })
            .populate({
                path: 'driver',
                populate: { path: 'user', select: 'name phone gender profilePicture' }
            });

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        res.json({ success: true, ride });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/rides/:id/status
// @desc    Update ride status
// @access  Private (Driver)
router.patch('/:id/status', auth, authorize('driver'), async (req, res) => {
    try {
        const { status } = req.body;
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // State Pattern — validate transition before applying
        try {
            RideStateMachine.validateTransition(ride.status, status);
        } catch (stateErr) {
            return res.status(400).json({ message: stateErr.message });
        }

        ride.status = status;
        if (status === 'started')    ride.startedAt   = new Date();
        if (status === 'completed') {
            ride.completedAt = new Date();
            // Cash settlement assumed at trip end — finalize the fare and mark payment settled
            ride.actualPrice = ride.actualPrice || ride.estimatedPrice || 0;
            ride.paymentStatus = 'paid';
            // Update driver stats
            if (ride.driver) {
                await Driver.findByIdAndUpdate(ride.driver, {
                    $inc: { totalRides: 1, totalEarnings: ride.actualPrice }
                });
            }
        }

        await ride.save();

        // Emit Socket.io event for real-time update
        const io = req.app.get('io');
        io.to(`ride-${ride._id}`).emit('ride-status-updated', { rideId: ride._id, status });

        // Push notifications for key status transitions
        if (status === 'started' || status === 'completed') {
            try {
                const { sendPushNotification, notifyRideCompleted } = require('../utils/notificationService');
                const passenger = await User.findById(ride.passenger).select('fcmToken');
                if (status === 'started' && passenger?.fcmToken) {
                    await sendPushNotification(
                        passenger.fcmToken,
                        '🚗 Your ride has started!',
                        'You are on your way. Sit back and relax.',
                        { rideId: String(ride._id), event: 'ride_started' }
                    );
                } else if (status === 'completed' && passenger?.fcmToken) {
                    const fare = ride.actualPrice || ride.estimatedPrice || 0;
                    await notifyRideCompleted(passenger.fcmToken, fare, String(ride._id));
                }
            } catch (fcmErr) {
                console.error('[FCM] status push failed:', fcmErr.message);
            }
        }

        // SafetySentinel lifecycle
        const safetySentinel = req.app.get('safetySentinel');
        if (safetySentinel) {
            if (status === 'started') {
                // Road-following route from OSRM (falls back to a straight line if OSRM
                // is unreachable) — a real route means normal road curvature no longer
                // reads as a deviation the way a straight pickup->dropoff line did.
                const { getRoadRoute } = require('../utils/routingService');
                const plannedRoute = await getRoadRoute(
                    ride.pickupLocation.coordinates,
                    ride.dropoffLocation.coordinates
                );
                ride.plannedRoute = plannedRoute;
                await ride.save();
                safetySentinel.startMonitoring(ride._id.toString(), plannedRoute);
                console.log(`[SafetySentinel] Started monitoring ride ${ride._id} with a ${plannedRoute.length}-point route`);
            } else if (status === 'completed' || status === 'cancelled') {
                safetySentinel.stopMonitoring(ride._id.toString());
            }
        }

        res.json({ success: true, ride });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/rides/:id/reroute
// @desc    Driver reports a legitimate reroute (traffic/closed road) mid-trip. Re-baselines
//          SafetySentinel's planned route from the driver's current position to the dropoff
//          so the detour itself doesn't read as a deviation. Capped at 2 uses per ride and
//          always surfaced to the passenger — this can reduce false alarms, it can never
//          silence the passenger's own manual SOS button.
// @access  Private (Driver, must be the ride's assigned driver)
const MAX_REROUTE_FLAGS_PER_RIDE = 2;

router.post('/:id/reroute', auth, authorize('driver'), async (req, res) => {
    try {
        const { lat, lng, reason } = req.body;
        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return res.status(400).json({ message: 'Current lat/lng are required' });
        }

        const driver = await Driver.findOne({ user: req.user.userId });
        if (!driver) return res.status(404).json({ message: 'Driver not found' });

        const ride = await Ride.findById(req.params.id);
        if (!ride) return res.status(404).json({ message: 'Ride not found' });
        if (!ride.driver || ride.driver.toString() !== driver._id.toString()) {
            return res.status(403).json({ message: 'You are not the assigned driver for this ride' });
        }
        if (ride.status !== 'started') {
            return res.status(400).json({ message: 'Reroute can only be reported during an active trip' });
        }
        if (ride.rerouteFlags.length >= MAX_REROUTE_FLAGS_PER_RIDE) {
            return res.status(429).json({ message: 'Reroute limit reached for this ride' });
        }

        const { getRoadRoute } = require('../utils/routingService');
        const newRoute = await getRoadRoute([lng, lat], ride.dropoffLocation.coordinates);

        ride.plannedRoute = newRoute;
        ride.rerouteFlags.push({ reason: reason || 'Traffic/road closure reported by driver', fromLocation: [lng, lat] });
        await ride.save();

        // Re-baseline SafetySentinel against the new route — this also resets the
        // deviation timer/latch for this ride (startMonitoring replaces its state wholesale).
        const safetySentinel = req.app.get('safetySentinel');
        if (safetySentinel) {
            safetySentinel.startMonitoring(ride._id.toString(), newRoute);
        }

        // Transparent to the passenger — never a silent monitoring blackout.
        const io = req.app.get('io');
        io.to(`ride-${ride._id}`).emit('driver:reroute-notice', {
            rideId: ride._id,
            reason: ride.rerouteFlags[ride.rerouteFlags.length - 1].reason,
            at: ride.rerouteFlags[ride.rerouteFlags.length - 1].flaggedAt,
        });

        res.json({
            success: true,
            rerouteFlagsUsed: ride.rerouteFlags.length,
            rerouteFlagsRemaining: MAX_REROUTE_FLAGS_PER_RIDE - ride.rerouteFlags.length,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/rides/:id/accept
// @desc    Driver accepts a ride
// @access  Private (Driver)
router.post('/:id/accept', auth, authorize('driver'), async (req, res) => {
    try {
        const driver = await Driver.findOne({ user: req.user.userId });
        if (!driver) return res.status(404).json({ message: 'Driver not found' });

        const ride = await Ride.findById(req.params.id);
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        if (ride.status !== 'matched' && ride.status !== 'requested') {
            return res.status(400).json({ message: 'Ride is no longer available' });
        }

        ride.status = 'accepted';
        ride.driver = driver._id; // Assign the driver!
        await ride.save();

        const io = req.app.get('io');
        // Notify passenger via Socket.io
        io.to(`chat-${ride._id}`).emit('ride:accepted', {
            rideId: ride._id,
            driverId: driver._id
        });

        // Push notification to passenger
        try {
            const { notifyRideAccepted } = require('../utils/notificationService');
            const User = require('../models/User');
            const passenger = await User.findById(ride.passenger).select('fcmToken name');
            const driverUser = await User.findById(req.user.userId).select('name');
            if (passenger?.fcmToken) {
                await notifyRideAccepted(passenger.fcmToken, driverUser?.name || 'Your driver', String(ride._id));
            }
        } catch (fcmErr) {
            console.error('[FCM] ride:accepted notification failed:', fcmErr.message);
        }

        res.json({ success: true, ride });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/rides/:id/reject
// @desc    Driver rejects/times out on a ride — re-matches to the next-nearest driver
// @access  Private (Driver)
router.patch('/:id/reject', auth, authorize('driver'), async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id);
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        // Exclude this driver from future matches on this ride
        if (ride.driver && !ride.excludedDrivers.some(id => id.equals(ride.driver))) {
            ride.excludedDrivers.push(ride.driver);
        }
        ride.status = 'requested';
        ride.driver = null;
        await ride.save();

        const io = req.app.get('io');
        const pLat = ride.pickupLocation.coordinates[1];
        const pLng = ride.pickupLocation.coordinates[0];
        const matchedDriver = await attemptDriverMatch(ride, io, pLat, pLng, ride.excludedDrivers);

        res.json({
            success: true,
            message: matchedDriver ? 'Ride re-matched to next-nearest driver' : 'No other drivers available — ride returned to pool'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/rides/driver/earnings
// @desc    Get aggregated driver earnings, stats, and recent rides
// @access  Private (Driver)
router.get('/driver/earnings', auth, authorize('driver'), async (req, res) => {
    try {
        const driver = await Driver.findOne({ user: req.user.userId });
        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        const driverId = driver._id;
        
        // Find all completed rides for this driver
        const rides = await Ride.find({ driver: driverId, status: 'completed' })
            .sort({ completedAt: -1 })
            .populate('passenger', 'name');

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);

        let todayEarnings = 0;
        let weeklyEarnings = 0;
        let totalRatingScore = 0;
        let ratedTripsCount = 0;

        rides.forEach(ride => {
            const price = ride.estimatedPrice || 0;
            const completedDate = ride.completedAt ? new Date(ride.completedAt) : new Date(ride.createdAt);

            if (completedDate >= startOfToday) {
                todayEarnings += price;
            }
            if (completedDate >= startOfWeek) {
                weeklyEarnings += price;
            }

            if (ride.rating && ride.rating.driverRating && ride.rating.driverRating.score) {
                totalRatingScore += ride.rating.driverRating.score;
                ratedTripsCount++;
            }
        });

        const averageRating = ratedTripsCount > 0 ? (totalRatingScore / ratedTripsCount).toFixed(1) : '5.0';

        res.json({
            success: true,
            stats: {
                todayEarnings,
                weeklyEarnings,
                totalTrips: rides.length,
                averageRating,
            },
            recentRides: rides.slice(0, 10).map(r => ({
                id: r._id,
                date: r.completedAt || r.createdAt,
                fare: r.estimatedPrice,
                passengerName: r.passenger?.name || 'Passenger',
                distance: r.distance
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/rides/history/:userId
// @desc    Get ride history for a user or driver
// @access  Private
router.get('/history/:userId', auth, async (req, res) => {
    try {
        const rides = await Ride.find({
            $or: [
                { passenger: req.params.userId },
                { driver: req.params.userId }
            ],
            status: 'completed'
        })
        .sort({ completedAt: -1 })
        .limit(20)
        .populate('passenger', 'name phone')
        .populate('driver');

        res.json({ success: true, count: rides.length, rides });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/rides/:id/rate
// @desc    Rate a completed ride
// @access  Private
router.post('/:id/rate', auth, async (req, res) => {
    try {
        const { score, comment, raterRole } = req.body;
        if (!score || score < 1 || score > 5) {
            return res.status(400).json({ message: 'Score must be between 1 and 5' });
        }

        const ride = await Ride.findById(req.params.id);
        if (!ride) return res.status(404).json({ message: 'Ride not found' });
        if (ride.status !== 'completed') {
            return res.status(400).json({ message: 'Can only rate completed rides' });
        }

        let aiSentimentTag = 'Neutral';
        let polarityScore = 0;

        // NLP Sentiment Analysis Webhook Integration
        if (comment && comment.trim() !== '') {
            try {
                const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
                const sentimentResponse = await axios.post(`${aiServiceUrl}/api/analytics/sentiment`, {
                    text: comment
                }, { timeout: 3000 });
                
                if (sentimentResponse.data) {
                    aiSentimentTag = sentimentResponse.data.tag || 'Neutral';
                    polarityScore = sentimentResponse.data.polarity || 0;
                    console.log(`[RIDE NLP] Rated: ${score}/5 | Sentiment: ${aiSentimentTag} | Polarity: ${polarityScore.toFixed(2)}`);
                }
            } catch (nlpErr) {
                console.error('[RIDE NLP] Failed to reach AI Analytics Service:', nlpErr.message);
                // Fail gracefully, persist rating anyway
            }
        }

        const ratingField = raterRole === 'driver' ? 'passengerRating' : 'driverRating';
        ride.rating[ratingField] = { 
            score, 
            comment, 
            aiSentimentTag,
            polarityScore,
            ratedAt: new Date() 
        };
        await ride.save();

        res.json({ success: true, message: 'Rating submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/rides/:id/cancel
// @desc    Cancel a ride
// @access  Private
router.post('/:id/cancel', auth, async (req, res) => {
    try {
        const { cancelledBy } = req.body;
        const ride = await Ride.findById(req.params.id);
        if (!ride) return res.status(404).json({ message: 'Ride not found' });
        if (['completed', 'cancelled'].includes(ride.status)) {
            return res.status(400).json({ message: 'Ride already ended' });
        }

        ride.status      = 'cancelled';
        ride.cancelledAt = new Date();
        ride.cancelledBy = cancelledBy || 'passenger';
        await ride.save();

        const io = req.app.get('io');
        io.to(`ride-${ride._id}`).emit('ride:cancelled', { rideId: ride._id, cancelledBy: ride.cancelledBy });

        res.json({ success: true, message: 'Ride cancelled' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Compatibility alias for older clients calling /book
router.post('/book', auth, async (req, res) => {
    // Redirect the POST request to the new /request endpoint
    // 307 status ensures the POST method is preserved
    res.redirect(307, '/api/rides/request');
});

module.exports = router;
