const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true
    },
    cnic: {
        type: String,
        default: '',
        sparse: true,
    },
    vehicleInfo: {
        make: String,
        model: String,
        year: Number,
        color: String,
        plateNumber: {
            type: String,
            required: true,
            unique: true
        }
    },
    rating: {
        type: Number,
        default: 5.0,
        min: 0,
        max: 5
    },
    totalRides: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'on-ride'],
        default: 'offline'
    },
    currentLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0]
        }
    },
    idleTime: {
        type: Number,
        default: 0 // in minutes
    },
    onlineTime: {
        type: Number,
        default: 0 // in minutes
    },
    backgroundCheck: {
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        verifiedAt: Date
    },
    pinkPassStatus: {
        type: String,
        enum: ['none', 'pending_review', 'approved', 'rejected'],
        default: 'none'
    },
    pinkPassAppliedAt: Date,
    cnics: String,
    totalEarnings: {
        type: Number,
        default: 0
    },
    lastOnlineAt: Date,
    vehicleType: {
        type: String,
        enum: ['car', 'bike', 'rickshaw'],
        default: 'car'
    }
}, {
    timestamps: true
});

// Geospatial index for location-based queries
driverSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Driver', driverSchema);
