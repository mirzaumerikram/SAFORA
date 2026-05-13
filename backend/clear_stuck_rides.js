const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const Ride = require('./models/Ride');

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('MongoDB Connected.');
    
    const result = await Ride.updateMany(
        { status: { $in: ['requested', 'matched', 'accepted', 'started'] } },
        { $set: { status: 'completed' } }
    );
    
    console.log(`Cleaned up ${result.modifiedCount} stuck rides by setting them to completed.`);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
