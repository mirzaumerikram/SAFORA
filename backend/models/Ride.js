const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    passenger: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },
    excludedDrivers: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }],
        default: []
    },
    pickupLocation: {
        address: String,
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    dropoffLocation: {
        address: String,
        coordinates: {
            type: [Number],
            required: true
        }
    },
    plannedRoute: {
        type: [[Number]], // Array of [longitude, latitude] pairs
        default: []
    },
    rerouteFlags: {
        // Audit log of driver-reported reroutes (traffic/closed road). Capped at 2 per
        // ride (enforced in the route handler) so it can't be used to blind monitoring.
        type: [{
            flaggedAt: { type: Date, default: Date.now },
            reason: String,
            fromLocation: { type: [Number] } // [lng, lat] where the driver was when flagging
        }],
        default: []
    },
    distance: {
        type: Number, // in kilometers
        required: true
    },
    estimatedDuration: {
        type: Number, // in minutes
        required: true
    },
    estimatedPrice: {
        type: Number,
        required: true
    },
    actualPrice: Number,
    status: {
        type: String,
        enum: ['requested', 'matched', 'accepted', 'started', 'completed', 'cancelled'],
        default: 'requested'
    },
    type: {
        type: String,
        enum: ['standard', 'pink-pass', 'eco'],
        default: 'standard'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'wallet'],
        default: 'cash'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelledBy: {
        type: String,
        enum: ['passenger', 'driver', 'system']
    },
    paymentIntentId: String,
    rating: {
        passengerRating: {
            score: { type: Number, min: 1, max: 5 },
            comment: String,
            aiSentimentTag: { type: String, enum: ['Positive', 'Neutral', 'Negative'] },
            polarityScore: Number,
            ratedAt: Date
        },
        driverRating: {
            score: { type: Number, min: 1, max: 5 },
            comment: String,
            aiSentimentTag: { type: String, enum: ['Positive', 'Neutral', 'Negative'] },
            polarityScore: Number,
            ratedAt: Date
        }
    },
    chatMessages: [{
        id: String,
        text: String,
        sender: { type: String, enum: ['passenger', 'driver'] },
        senderName: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Ride', rideSchema);
