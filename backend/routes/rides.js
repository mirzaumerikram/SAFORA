const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const axios = require('axios');

// @route   POST /api/rides/request
// @desc    Request a new ride
// @access  Private (Passenger)
router.post('/request', async (req, res) => {
    try {
        const { pickupLocation, dropoffLocation, type } = req.body;
        const passengerId = req.user.userId; // From auth middleware

        // Calculate route using Google Maps API (placeholder)
        // TODO: Implement actual Google Maps API integration
        const distance = 10; // km
        const estimatedDuration = 20; // minutes

        // Get price prediction from AI service
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
        const pricingResponse = await axios.post(`${aiServiceUrl}/api/pricing/predict`, {
            distance,
            duration: estimatedDuration,
            time_of_day: new Date().getHours(),
            day_of_week: new Date().getDay(),
            demand_level: 'medium',
            origin_area: 0,
            traffic_multiplier: 1.0
        });

        const estimatedPrice = pricingResponse.data.estimated_price;

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

        // TODO: Trigger driver matching algorithm
        // TODO: Send ride request to matched driver via Socket.io

        res.status(201).json({
            success: true,
            ride: {
                id: ride._id,
                estimatedPrice,
                estimatedDuration,
                status: ride.status
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/rides/:id
// @desc    Get ride details
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id)
            .populate('passenger', 'name phone')
            .populate('driver');

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
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        ride.status = status;
        if (status === 'started') {
            ride.startedAt = new Date();
        } else if (status === 'completed') {
            ride.completedAt = new Date();
        }

        await ride.save();

        // Emit Socket.io event for real-time update
        const io = req.app.get('io');
        io.to(`ride-${ride._id}`).emit('ride-status-updated', { rideId: ride._id, status });

        res.json({ success: true, ride });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
