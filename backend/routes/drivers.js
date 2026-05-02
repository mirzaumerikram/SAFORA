const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

// @route   POST /api/drivers/register
// @desc    Register as a driver
// @access  Private
router.post('/register', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { licenseNumber, cnic, vehicleType, vehicleInfo } = req.body;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already registered as driver
        const existingDriver = await Driver.findOne({ user: userId });
        if (existingDriver) {
            return res.status(400).json({ message: 'Already registered as driver' });
        }

        // Create driver profile
        const driver = new Driver({
            user: userId,
            licenseNumber,
            cnic: cnic || '',
            vehicleType: vehicleType || 'car',
            vehicleInfo,
            status: 'offline',
            backgroundCheck: { status: 'pending' },
            pinkPassStatus: 'none',
            totalEarnings: 0,
        });

        await driver.save();

        // Update user role
        user.role = 'driver';
        await user.save();

        res.status(201).json({
            success: true,
            driver: {
                id: driver._id,
                licenseNumber: driver.licenseNumber,
                vehicleInfo: driver.vehicleInfo,
                status: driver.status
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/drivers/status
// @desc    Update driver online/offline status
// @access  Private (Driver only)
router.patch('/status', auth, authorize('driver'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { status } = req.body;

        const driver = await Driver.findOne({ user: userId });
        if (!driver) {
            return res.status(404).json({ message: 'Driver profile not found' });
        }

        const previousStatus = driver.status;
        driver.status = status;

        // Track online time
        if (status === 'online' && previousStatus === 'offline') {
            driver.lastOnlineAt = new Date();
        }

        await driver.save();

        res.json({
            success: true,
            status: driver.status
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/drivers/location
// @desc    Update driver location
// @access  Private (Driver only)
router.patch('/location', auth, authorize('driver'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { lat, lng } = req.body;

        const driver = await Driver.findOne({ user: userId });
        if (!driver) {
            return res.status(404).json({ message: 'Driver profile not found' });
        }

        driver.currentLocation = {
            type: 'Point',
            coordinates: [lng, lat]
        };

        await driver.save();

        // Emit location update via Socket.io
        const io = req.app.get('io');
        io.emit('driver-location-updated', {
            driverId: driver._id,
            location: { lat, lng }
        });

        res.json({
            success: true,
            location: { lat, lng }
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/drivers/nearby
// @desc    Get nearby drivers
// @access  Private
router.get('/nearby', auth, async (req, res) => {
    try {
        const { lat, lng, radius = 5000 } = req.query; // radius in meters

        if (!lat || !lng) {
            return res.status(400).json({ message: 'Latitude and longitude are required' });
        }

        const drivers = await Driver.find({
            status: 'online',
            currentLocation: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(radius)
                }
            }
        }).populate('user', 'name gender').limit(20);

        res.json({
            success: true,
            count: drivers.length,
            drivers: drivers.map(d => ({
                id: d._id,
                name: d.user.name,
                gender: d.user.gender,
                rating: d.rating,
                vehicleInfo: d.vehicleInfo,
                location: {
                    lat: d.currentLocation.coordinates[1],
                    lng: d.currentLocation.coordinates[0]
                }
            }))
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/drivers/me
// @desc    Get current driver's full profile
// @access  Private (Driver)
router.get('/me', auth, async (req, res) => {
    try {
        const driver = await Driver.findOne({ user: req.user.userId })
            .populate('user', 'name phone email gender createdAt');

        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver profile not found. Please complete registration.' });
        }

        res.json({
            success: true,
            driver: {
                id:              driver._id,
                name:            driver.user?.name,
                phone:           driver.user?.phone,
                email:           driver.user?.email,
                gender:          driver.user?.gender,
                profilePicture:  driver.user?.profilePicture,
                joinedAt:        driver.user?.createdAt,
                licenseNumber:   driver.licenseNumber,
                cnic:            driver.cnic,
                vehicleType:     driver.vehicleType,
                vehicle:         driver.vehicleInfo,
                rating:          driver.rating,
                totalRides:      driver.totalRides,
                totalEarnings:   driver.totalEarnings,
                pinkPassStatus:  driver.pinkPassStatus,
                backgroundCheck: driver.backgroundCheck,
                status:          driver.status,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/drivers/profile
// @desc    Update driver profile fields
// @access  Private (Driver)
router.patch('/profile', auth, async (req, res) => {
    try {
        const driver = await Driver.findOne({ user: req.user.userId });
        if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

        const { vehicleColor, vehicleType } = req.body;
        if (vehicleColor) driver.vehicleInfo.color = vehicleColor;
        if (vehicleType)  driver.vehicleType = vehicleType;
        await driver.save();

        res.json({ success: true, message: 'Profile updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/drivers/update-profile
// @desc    Update driver's user record: name, gender, profilePicture
// @access  Private (Driver)
router.post('/update-profile', auth, async (req, res) => {
    try {
        const { name, gender, profilePicture } = req.body;
        const update = {};
        if (name)           update.name = name.trim();
        if (gender)         update.gender = gender;
        if (profilePicture) update.profilePicture = profilePicture;

        const user = await User.findByIdAndUpdate(req.user.userId, update, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ success: true, name: user.name, gender: user.gender, profilePicture: user.profilePicture });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/drivers/earnings
// @desc    Get driver earnings stats + recent rides
// @access  Private (Driver)
router.get('/earnings', auth, async (req, res) => {
    try {
        const Ride = require('../models/Ride');
        const userId = req.user.userId;
        const driver = await Driver.findOne({ user: userId });
        if (!driver) return res.status(404).json({ message: 'Driver not found' });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);

        const allRides = await Ride.find({ driver: driver._id, status: 'completed' })
            .populate('passenger', 'name')
            .sort({ completedAt: -1 })
            .limit(20);

        const todayRides  = allRides.filter(r => new Date(r.completedAt) >= today);
        const weeklyRides = allRides.filter(r => new Date(r.completedAt) >= weekStart);

        const sum = (rides) => rides.reduce((acc, r) => acc + (r.actualPrice || r.estimatedPrice || 0), 0);

        res.json({
            success: true,
            stats: {
                todayEarnings:   sum(todayRides),
                weeklyEarnings:  sum(weeklyRides),
                totalTrips:      driver.totalRides,
                averageRating:   driver.rating?.toFixed(1) ?? '5.0',
            },
            recentRides: allRides.map(r => ({
                id:            r._id,
                date:          r.completedAt || r.createdAt,
                fare:          r.actualPrice || r.estimatedPrice || 0,
                passengerName: r.passenger?.name || 'Passenger',
                distance:      r.distanceKm || 0,
            })),
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
