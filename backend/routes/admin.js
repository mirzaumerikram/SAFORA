const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const Alert = require('../models/Alert');
const { auth, authorize } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(auth, authorize('admin'));

// @route   GET /api/admin/dashboard
// @desc    Get platform overview stats
// @access  Admin
router.get('/dashboard', async (req, res) => {
    try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [
            totalUsers,
            totalDrivers,
            activeDrivers,
            totalRidesToday,
            activeRides,
            openAlerts,
            pendingDriverApprovals,
            pendingPinkPassPassengers
        ] = await Promise.all([
            User.countDocuments({ role: 'passenger' }),
            Driver.countDocuments(),
            Driver.countDocuments({ status: 'online' }),
            Ride.countDocuments({ createdAt: { $gte: today } }),
            Ride.countDocuments({ status: { $in: ['requested', 'matched', 'accepted', 'started'] } }),
            Alert.countDocuments({ status: 'active', passenger: { $exists: true } }),
            Driver.countDocuments({ 'backgroundCheck.status': 'pending' }),
            User.countDocuments({ pinkPassStatus: 'pending_review' })
        ]);

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalDrivers,
                activeDrivers,
                totalRides: totalRidesToday,
                activeRides,
                openAlerts,
                pendingDriverApprovals,
                pendingPinkPassPassengers
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/admin/drivers/all
// @desc    Get all drivers
// @access  Admin
router.get('/drivers/all', async (req, res) => {
    try {
        const drivers = await Driver.find()
            .populate('user', 'name phone email gender cnic')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: drivers.length, drivers });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/admin/drivers/pending
// @desc    Get drivers pending approval
// @access  Admin
router.get('/drivers/pending', async (req, res) => {
    try {
        const drivers = await Driver.find({ 'backgroundCheck.status': 'pending' })
            .populate('user', 'name phone email gender cnic')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: drivers.length, drivers });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/admin/drivers/:id/approve
// @desc    Approve a driver
// @access  Admin
router.patch('/drivers/:id/approve', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ message: 'Driver not found' });

        driver.backgroundCheck.status = 'approved';
        driver.backgroundCheck.completedAt = new Date();
        driver.backgroundCheck.notes = req.body.notes || 'Approved by admin';
        await driver.save();

        res.json({ success: true, message: 'Driver approved', driver });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/admin/drivers/:id
// @desc    Update driver and user details
// @access  Admin
router.patch('/drivers/:id', async (req, res) => {
    try {
        const { name, phone, email, cnic, vehicleInfo } = req.body;
        
        // 1. Validation
        if (!name || !phone || !cnic) {
            return res.status(400).json({ message: 'Name, Phone, and CNIC are required' });
        }

        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ message: 'Driver not found' });

        // 2. Update Driver fields
        driver.cnic = cnic;
        if (vehicleInfo) {
            if (vehicleInfo.make) driver.vehicleInfo.make = vehicleInfo.make;
            if (vehicleInfo.model) driver.vehicleInfo.model = vehicleInfo.model;
            if (vehicleInfo.plateNumber) driver.vehicleInfo.plateNumber = vehicleInfo.plateNumber;
        }
        await driver.save();

        // 3. Update linked User fields
        let userId = driver.user?._id || driver.user;
        let user;

        if (userId) {
            user = await User.findById(userId);
        }

        // If no user linked, try to find by phone
        if (!user) {
            user = await User.findOne({ phone });
        }

        if (user) {
            // Update existing user
            user.name = name;
            user.phone = phone;
            if (email) user.email = email;
            user.cnic = cnic;
            await user.save();
            
            // Fix the link if it was broken
            if (!driver.user) {
                driver.user = user._id;
                await driver.save();
            }
        } else {
            // Create new user if none exists
            user = await User.create({
                name,
                phone,
                email: email || `${phone}@safora.me`,
                cnic,
                role: 'driver',
                verified: true
            });
            driver.user = user._id;
            await driver.save();
        }

        // Return fully populated driver to sync frontend state
        const updated = await Driver.findById(req.params.id).populate('user', 'name phone email gender cnic');
        res.json({ success: true, message: 'Driver updated successfully', driver: updated });
    } catch (error) {
        console.error('[Admin] Driver update error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// @route   PATCH /api/admin/drivers/:id/reject
// @desc    Reject a driver application
// @access  Admin
router.patch('/drivers/:id/reject', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ message: 'Driver not found' });

        driver.backgroundCheck.status = 'rejected';
        driver.backgroundCheck.completedAt = new Date();
        driver.backgroundCheck.notes = req.body.reason || 'Rejected by admin';
        await driver.save();

        res.json({ success: true, message: 'Driver rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/admin/alerts/active
// @desc    Get all active SOS alerts
// @access  Admin
router.get('/alerts/active', async (req, res) => {
    try {
        const alerts = await Alert.find({ status: 'active', passenger: { $exists: true } })
            .populate('passenger', 'name phone')
            .populate({
                path: 'ride',
                populate: {
                    path: 'passenger driver',
                    populate: { path: 'user', select: 'name phone' }
                }
            })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ success: true, count: alerts.length, alerts });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/admin/alerts/all
// @desc    Get all SOS alerts (history)
// @access  Admin
router.get('/alerts/all', async (req, res) => {
    try {
        const alerts = await Alert.find({ passenger: { $exists: true } })
            .populate('passenger', 'name phone')
            .populate({
                path: 'ride',
                populate: {
                    path: 'passenger driver',
                    populate: { path: 'user', select: 'name phone' }
                }
            })
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ success: true, count: alerts.length, alerts });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/admin/rides/active
// @desc    Get all currently active rides for monitoring
// @access  Admin
router.get('/rides/active', async (req, res) => {
    try {
        const rides = await Ride.find({
            status: { $in: ['matched', 'accepted', 'started'] }
        })
        .populate('passenger', 'name phone')
        .populate({
            path: 'driver',
            populate: { path: 'user', select: 'name phone' }
        })
        .sort({ createdAt: -1 });

        res.json({ success: true, count: rides.length, rides });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/admin/rides/completed
// @desc    Get all completed/cancelled rides for history
// @access  Admin
router.get('/rides/completed', async (req, res) => {
    try {
        const rides = await Ride.find({
            status: { $in: ['completed', 'cancelled'] }
        })
        .populate('passenger', 'name phone')
        .populate({
            path: 'driver',
            populate: { path: 'user', select: 'name phone' }
        })
        .sort({ createdAt: -1 })
        .limit(100);

        res.json({ success: true, count: rides.length, rides });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Admin
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find().select('-password -otp -otpExpires').skip(skip).limit(limit).sort({ createdAt: -1 }),
            User.countDocuments()
        ]);

        res.json({
            success: true,
            total,
            page,
            pages: Math.ceil(total / limit),
            users
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/admin/pinkpass/pending
// @desc    Get drivers with pending Pink Pass applications
// @access  Admin
router.get('/pinkpass/pending', async (req, res) => {
    try {
        const drivers = await Driver.find({ pinkPassStatus: 'pending_review' })
            .populate('user', 'name phone email gender')
            .sort({ pinkPassAppliedAt: -1 });

        res.json({
            success: true,
            count: drivers.length,
            drivers: drivers.map(d => ({
                _id:              d._id,
                name:             d.user?.name  || 'Unknown',
                phone:            d.user?.phone || '—',
                gender:           d.user?.gender || '—',
                licenseNumber:    d.licenseNumber,
                vehicleType:      d.vehicleType,
                vehicle:          d.vehicleInfo,
                pinkPassStatus:   d.pinkPassStatus,
                pinkPassAppliedAt: d.pinkPassAppliedAt,
            })),
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/admin/pinkpass/stats
// @desc    Get Pink Pass counts for dashboard badge
// @access  Admin
router.get('/pinkpass/stats', async (req, res) => {
    try {
        const [pendingDrivers, pendingPassengers] = await Promise.all([
            Driver.countDocuments({ pinkPassStatus: 'pending_review' }),
            User.countDocuments({ pinkPassStatus: 'pending_review' }),
        ]);
        res.json({ success: true, pendingDrivers, pendingPassengers, totalPending: pendingDrivers + pendingPassengers });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/admin/pinkpass/passengers/pending
// @desc    Get passengers with pending Pink Pass applications
// @access  Admin
router.get('/pinkpass/passengers/pending', async (req, res) => {
    try {
        const users = await User.find({ pinkPassStatus: 'pending_review' })
            .select('name phone email gender pinkPassStatus pinkPassAppliedAt pinkPassCnicPhoto pinkPassSelfiePhoto')
            .sort({ pinkPassAppliedAt: -1 });

        res.json({ success: true, count: users.length, users });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/admin/pinkpass/passengers/:id/verify
// @desc    Approve or reject passenger Pink Pass
// @access  Admin
router.patch('/pinkpass/passengers/:id/verify', async (req, res) => {
    try {
        const { action } = req.body; // 'approve' | 'reject'
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Passenger not found' });

        if (action === 'approve') {
            user.pinkPassStatus = 'approved';
            user.pinkPassVerified = true;
        } else {
            user.pinkPassStatus = 'rejected';
            user.pinkPassVerified = false;
        }
        
        // AUTO-DELETE SENSITIVE DATA AFTER AUDIT
        user.pinkPassCnicPhoto   = undefined;
        user.pinkPassSelfiePhoto = undefined;
        
        await user.save();
        res.json({ success: true, message: `Pink Pass ${action}d (Sensitive images have been purged)`, user });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/admin/list
// @desc    Get all admin users
// @access  Admin
router.get('/list', async (req, res) => {
    try {
        const admins = await User.find({ role: 'admin' }).select('name phone email createdAt');
        res.json({ success: true, admins });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   POST /api/admin/add
// @desc    Add or promote a user to admin
// @access  Admin
router.post('/add', async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        if (!phone || !name || !email) {
            return res.status(400).json({ message: 'Name, email and phone are required' });
        }

        let user = await User.findOne({ phone });
        
        if (user) {
            user.role = 'admin';
            user.name = name;
            user.email = email;
            user.verified = true;
            user.emailVerified = true;
            await user.save();
            res.json({ success: true, message: 'User updated and promoted to admin', user });
        } else {
            user = new User({
                name,
                email,
                phone,
                role: 'admin',
                verified: true,
                emailVerified: true,
                gender: 'other'
            });
            await user.save();
            res.json({ success: true, message: 'New admin account created', user });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/admin/users/:id
// @desc    Hard delete a user from the system
// @access  Admin
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ success: true, message: 'User record permanently removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/admin/:id
// @desc    Remove admin role from a user (demote to passenger)
// @access  Admin
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.role = 'passenger';
        await user.save();
        
        res.json({ success: true, message: 'Admin role removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PATCH /api/admin/users/:id
// @desc    Update passenger details
// @access  Admin
router.patch('/users/:id', async (req, res) => {
    try {
        const { name, phone, email, cnic, gender } = req.body;

        // 1. Validation
        if (!name || !phone || !cnic) {
            return res.status(400).json({ message: 'Name, Phone, and CNIC are required' });
        }
        if (name.length < 3) return res.status(400).json({ message: 'Name must be at least 3 characters' });
        if (phone.length !== 11) return res.status(400).json({ message: 'Phone must be exactly 11 digits' });
        if (cnic.length !== 13) return res.status(400).json({ message: 'CNIC must be exactly 13 digits' });
        if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Invalid email format' });

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Passenger not found' });

        // Check for duplicates if phone/cnic changed
        if (phone !== user.phone) {
            const existingPhone = await User.findOne({ phone, _id: { $ne: user._id } });
            if (existingPhone) return res.status(400).json({ message: 'Phone number already in use' });
        }
        if (cnic !== user.cnic) {
            const existingCnic = await User.findOne({ cnic, _id: { $ne: user._id } });
            if (existingCnic) return res.status(400).json({ message: 'CNIC already in use' });
        }

        // 2. Update fields
        user.name = name;
        user.phone = phone;
        user.email = email;
        user.cnic = cnic;
        if (gender) user.gender = gender;

        await user.save();
        res.json({ success: true, message: 'Passenger updated successfully', user });
    } catch (error) {
        console.error('[Admin] Passenger update error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// end of admin routes
// @route   DELETE /api/admin/alerts/:id
// @desc    Delete an alert
// @access  Admin
router.delete('/alerts/:id', async (req, res) => {
    try {
        await Alert.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Alert deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/admin/rides/:id
// @desc    Delete a ride record
// @access  Admin
router.delete('/rides/:id', async (req, res) => {
    try {
        await Ride.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Ride deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

