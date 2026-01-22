const express = require('express');
const router = express.Router();
const User = require('../models/User');
const axios = require('axios');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @route   POST /api/pink-pass/enroll
// @desc    Enroll user in Pink Pass program
// @access  Private (Female passengers only)
router.post('/enroll', upload.single('video'), async (req, res) => {
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
router.get('/status', async (req, res) => {
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

module.exports = router;
