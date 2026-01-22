const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const Ride = require('../models/Ride');
const User = require('../models/User');

// Initialize Twilio client only if credentials are provided and valid
let twilioClient = null;
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;

// Check if credentials exist and are not placeholder values
if (twilioSid && twilioToken &&
    twilioSid !== 'your_account_sid' &&
    twilioToken !== 'your_auth_token' &&
    twilioSid.startsWith('AC')) {
    const twilio = require('twilio');
    twilioClient = twilio(twilioSid, twilioToken);
    console.log('Twilio SMS service initialized');
} else {
    console.warn('Twilio credentials not configured - SMS alerts disabled');
}

// @route   POST /api/safety/alert
// @desc    Create a safety alert
// @access  Private
router.post('/alert', async (req, res) => {
    try {
        const { rideId, type, location, description } = req.body;

        // Validate ride exists
        const ride = await Ride.findById(rideId).populate('passenger');
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Determine severity based on alert type
        let severity = 'medium';
        if (type === 'sos' || type === 'route-deviation') {
            severity = 'critical';
        } else if (type === 'suspicious-stop') {
            severity = 'high';
        }

        // Create alert
        const alert = new Alert({
            ride: rideId,
            type,
            severity,
            location: {
                type: 'Point',
                coordinates: [location.lng, location.lat]
            },
            description,
            status: 'active'
        });

        await alert.save();

        // Send real-time notification to admin dashboard via Socket.io
        const io = req.app.get('io');
        io.emit('safety-alert', {
            alertId: alert._id,
            rideId,
            type,
            severity,
            location,
            passenger: {
                name: ride.passenger.name,
                phone: ride.passenger.phone
            },
            timestamp: alert.createdAt
        });

        // Send SMS to emergency contacts
        const emergencyContacts = ride.passenger.emergencyContacts || [];
        let smsResults = [];

        if (twilioClient && emergencyContacts.length > 0) {
            const smsPromises = emergencyContacts.map(async (contact) => {
                try {
                    const message = await twilioClient.messages.create({
                        body: `SAFORA ALERT: ${ride.passenger.name} may be in danger. Type: ${type}. Location: https://maps.google.com/?q=${location.lat},${location.lng}`,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: contact.phone
                    });

                    return {
                        phone: contact.phone,
                        sent: true,
                        sentAt: new Date(),
                        messageId: message.sid
                    };
                } catch (error) {
                    console.error(`Failed to send SMS to ${contact.phone}:`, error);
                    return {
                        phone: contact.phone,
                        sent: false,
                        sentAt: new Date()
                    };
                }
            });

            smsResults = await Promise.all(smsPromises);
        } else {
            console.log('SMS alerts skipped - Twilio not configured or no emergency contacts');
            smsResults = emergencyContacts.map(contact => ({
                phone: contact.phone,
                sent: false,
                sentAt: new Date(),
                reason: 'Twilio not configured'
            }));
        }

        // Update alert with notification status
        alert.notificationsSent = {
            admin: {
                sent: true,
                sentAt: new Date()
            },
            emergencyContacts: smsResults
        };

        await alert.save();

        res.status(201).json({
            success: true,
            alert: {
                id: alert._id,
                type,
                severity,
                status: alert.status
            },
            notificationsSent: {
                admin: true,
                smsCount: smsResults.filter(r => r.sent).length
            }
        });

    } catch (error) {
        console.error('Safety alert error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/safety/alerts
// @desc    Get all active alerts
// @access  Private (Admin only)
router.get('/alerts', async (req, res) => {
    try {
        const { status = 'active' } = req.query;

        const alerts = await Alert.find({ status })
            .populate({
                path: 'ride',
                populate: {
                    path: 'passenger driver',
                    select: 'name phone'
                }
            })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            success: true,
            count: alerts.length,
            alerts
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/safety/alerts/:id/resolve
// @desc    Resolve a safety alert
// @access  Private (Admin only)
router.patch('/alerts/:id/resolve', async (req, res) => {
    try {
        const { notes } = req.body;

        const alert = await Alert.findById(req.params.id);
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        alert.status = 'resolved';
        alert.resolvedAt = new Date();
        alert.resolvedBy = req.user.userId;
        alert.notes = notes;

        await alert.save();

        // Notify via Socket.io
        const io = req.app.get('io');
        io.emit('alert-resolved', {
            alertId: alert._id,
            resolvedAt: alert.resolvedAt
        });

        res.json({
            success: true,
            alert
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
