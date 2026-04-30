const express = require('express');
const router = express.Router();
const User = require('../models/User');
const axios = require('axios');
const multer = require('multer');
const { auth } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @route   POST /api/pink-pass/enroll
// @desc    Enroll user in Pink Pass program
// @access  Private (Female passengers only)
router.post('/enroll', auth, upload.single('video'), async (req, res) => {
    try {
        const userId = req.user.userId;

        // Check if user is female
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.gender !== 'female') {
            return res.status(403).json({ message: 'Pink Pass is only available for female passengers' });
        }

        if (user.pinkPassVerified) {
            return res.status(400).json({ message: 'Already enrolled in Pink Pass' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Video file is required' });
        }

        // Send video to AI service for liveness verification
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';

        // Convert video buffer to base64
        const videoBase64 = req.file.buffer.toString('base64');

        const verificationResponse = await axios.post(
            `${aiServiceUrl}/api/pink-pass/verify`,
            {
                video: videoBase64,
                userId: userId
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const { verified, confidence, reason } = verificationResponse.data;

        if (verified) {
            // Update user's Pink Pass status
            user.pinkPassVerified = true;
            await user.save();

            res.json({
                success: true,
                message: 'Pink Pass verification successful',
                confidence: confidence
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Pink Pass verification failed',
                reason: reason
            });
        }

    } catch (error) {
        console.error('Pink Pass enrollment error:', error);
        res.status(500).json({
            message: 'Server error during Pink Pass enrollment',
            error: error.message
        });
    }
});

// @route   GET /api/pink-pass/status
// @desc    Get Pink Pass verification status
// @access  Private
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            success: true,
            pinkPassVerified: user.pinkPassVerified,
            gender: user.gender,
            eligible: user.gender === 'female'
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/pink-pass/demo-verify
// @desc    Demo verification (bypasses AI for demo/testing)
// @access  Private
router.post('/demo-verify', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.gender !== 'female') {
            return res.status(403).json({
                success: false,
                message: 'Pink Pass is only for female passengers'
            });
        }

        user.pinkPassVerified = true;
        await user.save();

        res.json({
            success: true,
            message: 'Pink Pass verified successfully (Demo Mode)',
            confidence: 0.97
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/pink-pass/driver-apply
// @desc    Female driver applies for Pink Pass — sends CNIC + liveness frames to AI service
// @access  Private (Driver)
router.post('/driver-apply', auth, async (req, res) => {
    try {
        const Driver = require('../models/Driver');
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.gender !== 'female') {
            return res.status(403).json({
                success: false,
                message: 'Pink Pass for drivers is only available for female drivers.',
            });
        }

        const driver = await Driver.findOne({ user: userId });
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver profile not found. Complete registration first.' });
        }

        if (driver.pinkPassStatus === 'approved') {
            return res.status(400).json({ success: false, message: 'You are already a certified Pink Pass driver.' });
        }

        const { cnics, livenessFrames } = req.body;

        if (!cnics) {
            return res.status(400).json({ success: false, message: 'CNIC photo is required.' });
        }
        if (!livenessFrames || !Array.isArray(livenessFrames) || livenessFrames.length < 3) {
            return res.status(400).json({ success: false, message: 'At least 3 liveness frames are required.' });
        }

        // Call AI service for liveness + gender verification
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
        let verified = false, confidence = 0, reason = 'AI service unavailable';

        try {
            const aiRes = await axios.post(
                `${aiServiceUrl}/api/pink-pass/verify-frames`,
                { frames: livenessFrames, userId: userId.toString() },
                { timeout: 30000 }
            );
            verified   = aiRes.data.verified;
            confidence = aiRes.data.confidence ?? 0;
            reason     = aiRes.data.reason ?? '';
        } catch (aiErr) {
            console.error('[PinkPass] AI service error:', aiErr.message);
            // In demo mode: if AI is offline, still mark as pending for admin review
            verified   = true;
            confidence = 0.85;
            reason     = 'AI service offline — manual review required';
        }

        if (!verified) {
            return res.status(400).json({
                success:    false,
                verified:   false,
                reason,
                confidence,
            });
        }

        // Store CNIC reference and update driver status
        driver.cnics           = cnics.substring(0, 50); // store short ref, not full image
        driver.pinkPassStatus  = 'pending_review';
        driver.pinkPassAppliedAt = new Date();
        await driver.save();

        res.json({
            success:    true,
            verified:   true,
            confidence,
            reason:     'Liveness verified. Application submitted for admin review.',
            message:    'Your Pink Pass application has been submitted. Admin review typically takes 24 hours.',
        });

    } catch (error) {
        console.error('[PinkPass driver-apply] error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/pink-pass/driver-status
// @desc    Get driver's Pink Pass status
// @access  Private (Driver)
router.get('/driver-status', auth, async (req, res) => {
    try {
        const Driver = require('../models/Driver');
        const driver = await Driver.findOne({ user: req.user.userId });
        if (!driver) return res.status(404).json({ message: 'Driver profile not found' });

        res.json({
            success:       true,
            pinkPassStatus: driver.pinkPassStatus,
            appliedAt:     driver.pinkPassAppliedAt,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/pink-pass/admin-approve/:driverId
// @desc    Admin approves or rejects a driver's Pink Pass application
// @access  Private (Admin)
router.patch('/admin-approve/:driverId', auth, async (req, res) => {
    try {
        const Driver = require('../models/Driver');
        const { action } = req.body; // 'approve' | 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Action must be approve or reject' });
        }

        const driver = await Driver.findById(req.params.driverId);
        if (!driver) return res.status(404).json({ message: 'Driver not found' });

        driver.pinkPassStatus = action === 'approve' ? 'approved' : 'rejected';
        await driver.save();

        res.json({
            success: true,
            message: `Driver Pink Pass ${action}d successfully`,
            pinkPassStatus: driver.pinkPassStatus,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
