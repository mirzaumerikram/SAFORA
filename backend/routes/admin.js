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
        const [
            totalUsers,
            totalDrivers,
            activeDrivers,
            totalRides,
            activeRides,
            openAlerts,
            pendingDriverApprovals
        ] = await Promise.all([
            User.countDocuments({ role: 'passenger' }),
            Driver.countDocuments(),
            Driver.countDocuments({ status: 'online' }),
            Ride.countDocuments(),
            Ride.countDocuments({ status: { $in: ['matched', 'accepted', 'started'] } }),
            Alert.countDocuments({ status: 'active' }),
            Driver.countDocuments({ 'backgroundCheck.status': 'pending' })
        ]);

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalDrivers,
                activeDrivers,
                totalRides,
                activeRides,
                openAlerts,
                pendingDriverApprovals
            }
        });
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
        const alerts = await Alert.find({ status: 'active' })
            .populate('passenger', 'name phone')
            .sort({ createdAt: -1 })
            .limit(50);

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
        .populate('driver')
        .sort({ createdAt: -1 });

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
        const [pending, approved, rejected] = await Promise.all([
            Driver.countDocuments({ pinkPassStatus: 'pending_review' }),
            Driver.countDocuments({ pinkPassStatus: 'approved' }),
            Driver.countDocuments({ pinkPassStatus: 'rejected' }),
        ]);
        res.json({ success: true, pending, approved, rejected });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
