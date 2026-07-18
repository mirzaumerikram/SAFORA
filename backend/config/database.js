const mongoose = require('mongoose');
const dns = require('dns');

// On some Windows networks, Node's own DNS resolver fails SRV lookups
// ("querySrv ECONNREFUSED") for mongodb+srv:// URIs even though the OS
// resolver handles the same query fine. Pinning to public DNS servers here
// avoids that without needing the connection string itself to change.
dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);

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
