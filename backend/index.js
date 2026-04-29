const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/database');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:19006',
];

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Passenger joins ride room to get live updates for their trip
  socket.on('join:ride', ({ rideId }) => {
    socket.join(`ride-${rideId}`);
    console.log(`[Socket] Client joined ride room: ride-${rideId}`);
  });

  // Driver joins their personal room to receive ride requests
  socket.on('join:driver', ({ driverId }) => {
    socket.join(`driver-${driverId}`);
    console.log(`[Socket] Driver joined room: driver-${driverId}`);
  });

  // Driver broadcasts live GPS location during a trip → relay to passenger's ride room only
  socket.on('driver:location-update', ({ rideId, lat, lng }) => {
    if (rideId) {
      socket.to(`ride-${rideId}`).emit('driver:location', { lat, lng });
    }
  });

  // SOS triggered from passenger app
  socket.on('sos:trigger', ({ rideId, timestamp }) => {
    io.emit('sos:active', { rideId, timestamp });
    console.log(`[SOS] Triggered for ride: ${rideId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Initialize Safety Sentinel
const SafetySentinel = require('./utils/SafetySentinel');
const safetySentinel = new SafetySentinel(io);
app.set('safetySentinel', safetySentinel);

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'SAFORA Backend API - Running' });
});

// Import and use routes
const authRoutes    = require('./routes/auth');
const rideRoutes    = require('./routes/rides');
const safetyRoutes  = require('./routes/safety');
const pinkPassRoutes = require('./routes/pinkpass');
const driverRoutes  = require('./routes/drivers');
const adminRoutes   = require('./routes/admin');
const paymentRoutes = require('./routes/payment');

app.use('/api/auth',    authRoutes);
app.use('/api/rides',   rideRoutes);
app.use('/api/safety',  safetyRoutes);
app.use('/api/pink-pass', pinkPassRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/payment', paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SAFORA Backend running on port ${PORT}`);
});

module.exports = { app, io };
