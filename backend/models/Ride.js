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
            ratedAt: Date
        },
        driverRating: {
            score: { type: Number, min: 1, max: 5 },
            comment: String,
            ratedAt: Date
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Ride', rideSchema);
