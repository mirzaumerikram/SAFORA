const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    ride: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride',
        required: false   // Optional: SOS can be triggered without an active ride
    },
    passenger: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    type: {
        type: String,
        enum: ['route-deviation', 'suspicious-stop', 'sos', 'speed-anomaly'],
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    description: String,
    status: {
        type: String,
        enum: ['active', 'resolved', 'false-alarm'],
        default: 'active'
    },
    notificationsSent: {
        admin: {
            sent: Boolean,
            sentAt: Date
        },
        emergencyContacts: [{
            phone: String,
            sent: Boolean,
            sentAt: Date
        }]
    },
    resolvedAt: Date,
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
