const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { sendVerificationEmail } = require('../utils/mailer');
const { auth } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, cnic, gender, role } = req.body;

        // Check if user already exists (only check email and phone, cnic may be absent)
        const orQuery = [];
        if (email) orQuery.push({ email });
        if (phone) orQuery.push({ phone });
        if (cnic) orQuery.push({ cnic });
        if (orQuery.length === 0) {
            return res.status(400).json({ message: 'Please provide email or phone' });
        }

        const existingUser = await User.findOne({ $or: orQuery });
        if (existingUser) {
            return res.status(400).json({ message: 'An account with this email or phone already exists' });
        }

        // Create new user — cnic and gender are optional
        const user = new User({
            name,
            email: email || undefined,
            phone,
            password,
            cnic: cnic || undefined,
            gender: gender || 'other',
            role: role || 'passenger'
        });

        // Generate email verification token
        if (email) {
            const verifyToken = crypto.randomBytes(32).toString('hex');
            user.emailVerificationToken = verifyToken;
            user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h
        }

        await user.save();

        // Send verification email (non-blocking — don't fail registration if email fails)
        if (email) {
            sendVerificationEmail(email, name, user.emailVerificationToken).catch(err =>
                console.error('[Mail] Verification email failed:', err.message)
            );
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.status(201).json({
            success: true,
            token,
            emailVerificationSent: !!email,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'No account found with this email. Please register first.' });
        }
        if (!user.password) {
            return res.status(401).json({ message: 'This account uses Phone OTP login. Please use the Phone OTP tab.' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                pinkPassVerified: user.pinkPassVerified
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/auth/complete-profile
// @desc    Complete registration after OTP — updates placeholder user with real details
// @access  Private (JWT from verify-otp)
router.post('/complete-profile', auth, async (req, res) => {
    try {
        const { name, email, gender, password } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check email uniqueness if provided
        if (email && email !== user.email) {
            const existing = await User.findOne({ email, _id: { $ne: user._id } });
            if (existing) return res.status(400).json({ message: 'This email is already registered' });
            user.email = email;
        }

        user.name     = name.trim();
        user.gender   = gender || 'other';
        user.verified = true;
        if (password && password.length >= 8) user.password = password;

        await user.save();

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role, gender: user.gender }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        // TODO: Add auth middleware to verify token
        const user = await User.findById(req.user.userId).select('-password');
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/auth/send-otp
// @desc    Send OTP to phone number
// @access  Public
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: 'Please provide a phone number' });
        }

        // Generate 5-digit OTP
        const otp = process.env.NODE_ENV === 'development' ? '12345' : Math.floor(10000 + Math.random() * 90000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Find user or create temporary placeholder (no CNIC — avoids duplicate key)
        let user = await User.findOne({ phone });
        const isNewUser = !user;
        if (!user) {
            user = new User({ phone, name: 'New User', gender: 'other' });
        }

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        console.log(`[AUTH] OTP for ${phone}: ${otp}`);

        res.json({
            success: true,
            message: 'OTP sent successfully',
            isNewUser,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and return token
// @access  Public
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ message: 'Please provide phone and OTP' });
        }

        const user = await User.findOne({ 
            phone, 
            otp, 
            otpExpires: { $gt: Date.now() } 
        }).select('+otp +otpExpires');

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Clear OTP after verification
        user.otp = undefined;
        user.otpExpires = undefined;
        user.verified = true;
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        const isNewUser = user.name === 'New User';

        res.json({
            success: true,
            token,
            isNewUser,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                pinkPassVerified: user.pinkPassVerified
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/auth/profile
// @desc    Update logged-in user name and email
// @access  Private
router.patch('/profile', auth, async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name && name.trim()) user.name = name.trim();
        if (email && email.trim()) {
            const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
            if (exists) return res.status(400).json({ message: 'Email already in use' });
            user.email = email.toLowerCase();
        }
        await user.save();

        res.json({ success: true, user: {
            id: user._id, name: user.name, email: user.email,
            phone: user.phone, role: user.role, gender: user.gender,
            pinkPassVerified: user.pinkPassVerified
        }});
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/auth/emergency-contacts
// @desc    Save up to 3 emergency contacts
// @access  Private
router.patch('/emergency-contacts', auth, async (req, res) => {
    try {
        const { contacts } = req.body;
        if (!Array.isArray(contacts)) return res.status(400).json({ message: 'contacts must be an array' });

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.emergencyContacts = contacts.slice(0, 3);
        await user.save();

        res.json({ success: true, emergencyContacts: user.emergencyContacts });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email address via link
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            emailVerificationToken: req.params.token,
            emailVerificationExpires: { $gt: Date.now() }
        }).select('+emailVerificationToken +emailVerificationExpires');

        if (!user) {
            return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
            <style>body{margin:0;background:#0d0d0d;font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;}
            .box{background:#1a1a1a;border-radius:16px;padding:48px 40px;text-align:center;max-width:400px;}
            h2{color:#e74c3c;font-size:22px;margin:0 0 12px;}p{color:#aaa;font-size:14px;}</style></head>
            <body><div class="box"><div style="font-size:48px">❌</div>
            <h2>Link Expired</h2><p>This verification link has expired or is invalid. Please request a new one from the app.</p></div></body></html>`);
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        user.verified = true;
        await user.save();

        res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>body{margin:0;background:#0d0d0d;font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;}
        .box{background:#1a1a1a;border-radius:16px;padding:48px 40px;text-align:center;max-width:400px;}
        h1{color:#f5c518;font-size:28px;font-weight:900;letter-spacing:3px;margin:0 0 8px;}
        h2{color:#fff;font-size:20px;margin:0 0 12px;}p{color:#aaa;font-size:14px;line-height:1.6;}
        .check{font-size:56px;margin-bottom:16px;}</style></head>
        <body><div class="box"><div class="check">✅</div>
        <h1>SAFORA</h1><h2>Email Verified!</h2>
        <p>Your email address has been verified successfully.<br>You can now return to the app.</p></div></body></html>`);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Private
router.post('/resend-verification', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('+emailVerificationToken +emailVerificationExpires');
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!user.email) return res.status(400).json({ message: 'No email on this account' });
        if (user.emailVerified) return res.status(400).json({ message: 'Email already verified' });

        const verifyToken = crypto.randomBytes(32).toString('hex');
        user.emailVerificationToken = verifyToken;
        user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        await sendVerificationEmail(user.email, user.name, verifyToken);
        res.json({ success: true, message: 'Verification email sent' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/auth/verify-firebase-token
// @desc    Verify Firebase phone auth ID token and issue our JWT
// @access  Public
router.post('/verify-firebase-token', async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ message: 'ID token required' });

        // Verify Firebase ID token using REST API
        const apiKey = process.env.FIREBASE_API_KEY;
        const { data } = await axios.post(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
            { idToken }
        );

        const firebaseUser = data.users?.[0];
        if (!firebaseUser) return res.status(401).json({ message: 'Invalid Firebase token' });

        const phone = firebaseUser.phoneNumber;
        if (!phone) return res.status(400).json({ message: 'No phone number in token' });

        // Find or create user
        let user = await User.findOne({ phone });
        const isNewUser = !user;
        if (!user) {
            user = new User({ phone, name: 'New User', gender: 'other', verified: true });
        } else {
            user.verified = true;
        }
        await user.save();

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        res.json({
            success: true,
            token,
            isNewUser: isNewUser || user.name === 'New User',
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                pinkPassVerified: user.pinkPassVerified
            }
        });
    } catch (error) {
        if (error.response?.status === 400) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
