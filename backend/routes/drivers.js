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
        const { licenseNumber, vehicleInfo } = req.body;

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
            vehicleInfo,
            status: 'offline',
            backgroundCheck: {
                status: 'pending'
            }
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

module.exports = router;
