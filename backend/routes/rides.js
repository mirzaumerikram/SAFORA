const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const axios = require('axios');
const { RideStateMachine } = require('../utils/RideStateMachine');
const { auth, authorize } = require('../middleware/auth');

// @route   POST /api/rides/request
// @desc    Request a new ride
// @access  Private (Passenger)
router.post('/request', auth, async (req, res) => {
    try {
        console.log('[RIDE] New request from user:', req.user.userId, 'role:', req.user.role);
        console.log('[RIDE] Body:', JSON.stringify(req.body, null, 2));

        const { pickupLocation, dropoffLocation, type, estimatedPrice: clientPrice } = req.body;
        
        if (!pickupLocation || !dropoffLocation) {
            return res.status(400).json({ success: false, message: 'Pickup and dropoff locations are required' });
        }

        // Robustness: ensure we have numbers for coordinates
        const pLat = parseFloat(pickupLocation.lat) || 0;
        const pLng = parseFloat(pickupLocation.lng) || 0;
        const dLat = parseFloat(dropoffLocation.lat) || 0;
        const dLng = parseFloat(dropoffLocation.lng) || 0;

        const passengerId = req.user.userId; // From auth middleware

        // Calculate real distance using Haversine formula
        const toRad = (deg) => deg * (Math.PI / 180);
        const R = 6371; // Earth radius in km
        const diffLat = toRad(dLat - pLat);
        const diffLng = toRad(dLng - pLng);
        const a =
            Math.sin(diffLat / 2) ** 2 +
            Math.cos(toRad(pLat)) * Math.cos(toRad(dLat)) *
            Math.sin(diffLng / 2) ** 2;
        const distance = parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2)) || 1.0;
        const estimatedDuration = Math.max(5, Math.round(distance * 3)); // ~3 min/km average

        // Use client price if provided, otherwise fallback to formula
        let estimatedPrice = clientPrice || Math.round((distance * 35) + (estimatedDuration * 5) + 50); 
        
        try {
            const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
            const pricingResponse = await axios.post(`${aiServiceUrl}/api/pricing/predict`, {
                distance,
                duration: estimatedDuration,
                time_of_day: new Date().getHours(),
                day_of_week: new Date().getDay(),
                demand_level: 'medium',
                origin_area: 0,
                traffic_multiplier: 1.0
            }, { timeout: 3000 });
            if (pricingResponse.data?.estimated_price) {
                estimatedPrice = pricingResponse.data.estimated_price;
            }
        } catch {
            // AI service not running — use formula price
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
            
            // Driver matching: find nearest driver
            const matchQuery = {
                // status: 'online', // BYPASSED FOR TESTING
                currentLocation: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [pLng, pLat]
                        },
                        // $maxDistance: 15000 
                    }
                }
            };

            const nearbyDrivers = await Driver.find(matchQuery)
                .populate('user', 'name gender phone')
                .limit(10);

            console.log(`[RIDE_DEBUG] Found ${nearbyDrivers.length} potential drivers.`);

            let matchedDriver = null;

            if (type === 'pink-pass') {
                matchedDriver = nearbyDrivers.find(
                    d => d.user.gender === 'female' && d.pinkPassCertified
                );
            } else {
                matchedDriver = nearbyDrivers[0] || null;
            }

            if (matchedDriver) {
                console.log(`[RIDE_DEBUG] Matched with driver: ${matchedDriver.user.name} (${matchedDriver._id})`);
                ride.driver = matchedDriver._id;
                ride.status = 'matched';
                await ride.save();

                // Notify matched driver via Socket.io
                const io = req.app.get('io');
                if (io) {
                    const roomName = `driver:${matchedDriver._id}`;
                    console.log(`[RIDE_DEBUG] BROADCASTING ride:request to ALL for testing.`);
                    // Temporarily using io.emit instead of io.to(roomName).emit
                    io.emit('ride:request', {
                        rideId: ride._id,
                        passenger: { name: 'Passenger' },
                        pickup: pickupLocation,
                        dropoff: dropoffLocation,
                        estimatedPrice,
                        estimatedDuration,
                        distance,
                        type: ride.type
                    });
                }
            }
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
        let query = {};
        
        if (req.user.role === 'driver') {
            const driver = await Driver.findOne({ user: userId });
            if (!driver) return res.status(404).json({ message: 'Driver not found' });
            query = { driver: driver._id, status: { $in: ['accepted', 'arrived', 'started'] } };
        } else {
            query = { passenger: userId, status: { $in: ['requested', 'matched', 'accepted', 'arrived', 'started'] } };
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
        if (status === 'completed')  ride.completedAt = new Date();

        await ride.save();

        // Emit Socket.io event for real-time update
        const io = req.app.get('io');
        io.to(`ride-${ride._id}`).emit('ride-status-updated', { rideId: ride._id, status });

        // SafetySentinel lifecycle
        const safetySentinel = req.app.get('safetySentinel');
        if (safetySentinel) {
            if (status === 'started') {
                // Build a simple straight-line route between pickup and dropoff for monitoring
                const plannedRoute = [
                    ride.pickupLocation.coordinates,   // [lng, lat]
                    ride.dropoffLocation.coordinates   // [lng, lat]
                ];
                safetySentinel.startMonitoring(ride._id.toString(), plannedRoute);
                console.log(`[SafetySentinel] Started monitoring ride ${ride._id}`);
            } else if (status === 'completed' || status === 'cancelled') {
                safetySentinel.stopMonitoring(ride._id.toString());
            }
        }

        res.json({ success: true, ride });
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
        // Notify passenger
        io.to(`chat-${ride._id}`).emit('ride:accepted', {
            rideId: ride._id,
            driverId: driver._id
        });

        res.json({ success: true, ride });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/rides/:id/reject
// @desc    Driver rejects a ride — triggers re-matching
// @access  Private (Driver)
router.patch('/:id/reject', auth, authorize('driver'), async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id);
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        ride.status = 'requested';
        ride.driver = null;
        await ride.save();

        const io = req.app.get('io');
        io.to(`ride-${ride._id}`).emit('ride:no-driver', { rideId: ride._id });

        res.json({ success: true, message: 'Ride returned to pool' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/rides/driver/earnings
// @desc    Get aggregated driver earnings, stats, and recent rides
// @access  Private (Driver)
router.get('/driver/earnings', auth, authorize('driver'), async (req, res) => {
    try {
        const driverId = req.user.userId;
        
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

        const ratingField = raterRole === 'driver' ? 'passengerRating' : 'driverRating';
        ride.rating[ratingField] = { score, comment, ratedAt: new Date() };
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
