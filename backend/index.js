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
  socket.on('driver:location-update', async ({ rideId, lat, lng }) => {
    if (rideId) {
      // 1. Relay live location to passenger
      socket.to(`ride-${rideId}`).emit('driver:location', { lat, lng });

      // 2. SafetySentinel — check for route deviation / suspicious stops
      try {
        const alert = await safetySentinel.updateLocation(rideId, { lat, lng });
        if (alert) {
          // Emit deviation alert to passenger in ride room
          io.to(`ride-${rideId}`).emit('safety:deviation-alert', {
            rideId,
            type: alert.type,
            description: alert.description,
            distance: alert.distance,
            duration: alert.duration,
            location: alert.location,
            timestamp: new Date().toISOString()
          });
          // Also broadcast to admin dashboard
          io.emit('safety-alert', {
            alertId: `sentinel-${rideId}-${Date.now()}`,
            rideId,
            type: alert.type,
            severity: 'critical',
            message: alert.description,
            location: alert.location,
            timestamp: new Date().toISOString()
          });
          console.log(`[SafetySentinel] Alert emitted for ride ${rideId}: ${alert.type}`);
        }
      } catch (err) {
        console.error('[SafetySentinel] Error checking location:', err.message);
      }
    }
  });

  // SOS triggered from passenger app
  socket.on('sos:trigger', ({ rideId, timestamp }) => {
    io.emit('sos:active', { rideId, timestamp });
    console.log(`[SOS] Triggered for ride: ${rideId}`);
  });

  // In-app chat — passenger ↔ driver messaging
  socket.on('chat:join', ({ rideId }) => {
    if (rideId) socket.join(`chat-${rideId}`);
  });

  socket.on('chat:send', ({ rideId, text, sender, senderName }) => {
    if (!rideId || !text?.trim()) return;
    const message = {
      id:         `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text:       text.trim(),
      sender,
      senderName: senderName || sender,
      timestamp:  new Date().toISOString(),
    };
    // Broadcast to both sides in the chat room (including sender for confirmation)
    io.to(`chat-${rideId}`).emit('chat:message', message);
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
