const express = require('express');
const router  = express.Router();
const Ride    = require('../models/Ride');
const { auth } = require('../middleware/auth');

// Stripe initialised only when real key is provided
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('your_')) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// @route  POST /api/payment/cash
// @desc   Mark ride as paid by cash
// @access Private (passenger)
router.post('/cash', auth, async (req, res) => {
    try {
        const { rideId } = req.body;
        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        ride.paymentMethod = 'cash';
        ride.paymentStatus = 'paid';
        await ride.save();

        res.json({ success: true, message: 'Cash payment confirmed', ride });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route  POST /api/payment/create-intent
// @desc   Create Stripe payment intent for card payment
// @access Private (passenger)
router.post('/create-intent', auth, async (req, res) => {
    try {
        const { rideId } = req.body;
        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        if (!stripe) {
            // Demo mode — simulate a successful payment intent
            return res.json({
                success: true,
                demo: true,
                clientSecret: 'demo_secret_' + Date.now(),
                amount: ride.estimatedPrice,
                currency: 'pkr',
                message: 'Demo mode — Stripe not configured. Add STRIPE_SECRET_KEY to .env for real payments.'
            });
        }

        const amountPaise = Math.round((ride.estimatedPrice || 200) * 100);
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountPaise,
            currency: 'pkr',
            metadata: { rideId: rideId.toString(), passengerId: req.user.userId }
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            amount: ride.estimatedPrice,
            currency: 'PKR'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route  POST /api/payment/confirm
// @desc   Confirm card payment after Stripe success
// @access Private (passenger)
router.post('/confirm', auth, async (req, res) => {
    try {
        const { rideId, paymentIntentId } = req.body;
        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        ride.paymentMethod = 'card';
        ride.paymentStatus = 'paid';
        ride.paymentIntentId = paymentIntentId;
        await ride.save();

        res.json({ success: true, message: 'Card payment confirmed', ride });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route  GET /api/payment/status/:rideId
// @desc   Get payment status for a ride
// @access Private
router.get('/status/:rideId', auth, async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.rideId).select('paymentMethod paymentStatus estimatedPrice actualPrice');
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        res.json({ success: true, payment: {
            method: ride.paymentMethod,
            status: ride.paymentStatus,
            amount: ride.actualPrice || ride.estimatedPrice
        }});
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
