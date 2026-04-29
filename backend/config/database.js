const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        console.error('Server will keep running — retrying connection in background...');
        // Retry after 5 seconds instead of crashing
        setTimeout(connectDB, 5000);
    }
};

module.exports = connectDB;
