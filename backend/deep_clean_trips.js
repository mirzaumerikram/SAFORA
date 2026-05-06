const mongoose = require('mongoose');
const Ride = require('./models/Ride');
require('dotenv').config();

async function deepClean() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Delete ALL rides with price 145
        const result = await Ride.deleteMany({ estimatedPrice: 145 });
        console.log(`Deep Cleaned: ${result.deletedCount} trips removed.`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

deepClean();
