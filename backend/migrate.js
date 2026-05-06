const mongoose = require('mongoose');
const Ride = require('./models/Ride');

const DB_URI = 'mongodb+srv://mirzaumerikram114:safora123@cluster0.gzm47gv.mongodb.net/safora?retryWrites=true&w=majority&appName=Cluster0';

async function migrate() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(DB_URI);
        console.log('Connected.');
        
        const res = await Ride.updateMany(
            { status: { $in: ['matched', 'accepted', 'started', 'arrived'] } },
            { status: 'completed' }
        );
        
        console.log('Successfully migrated', res.modifiedCount, 'rides to Completed status.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
