const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/database');
const Ride = require('./models/Ride');
const {
    notifyRideAccepted,
    notifyDriverArrived,
    notifyRideCompleted,
    notifyNewRideRequest,
    notifySOSAlert,
    notifyNewMessage,
} = require('./utils/notificationService');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const ALLOWED_ORIGINS = [
  // Production — passenger PWA
  'https://safora.me',
  'https://www.safora.me',
  // Production — admin dashboard
  'https://admin.safora.me',
  'https://www.admin.safora.me',
  // Vercel preview deployments
  'https://safora-app-two.vercel.app',
  'https://safora-nu.vercel.app',
  // Local development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:19006',
];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, React Native)
    if (!origin) return callback(null, origin || '*');
    // Allow specific origins or in development
    if (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, origin);
    }
    // Reject unknown origins in production
    callback(new Error(`CORS not allowed for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
};

const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] }
});

// Verify the JWT sent at handshake (if any) so room-join handlers can check real ownership.
// Connections with no token are still allowed (e.g. the admin dashboard's SOS listener, which
// only consumes global broadcasts) but `socket.user` stays undefined for them, and every
// room-scoped join below requires it to be set.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next();
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET); // { userId, role }
    next();
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
});

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
connectDB();

// Connect to Redis (graceful fallback if not configured)
const { redis, cacheDriverLocation } = require('./config/redis');

// Persists a SafetySentinel alert and broadcasts it to the ride room + admin dashboard.
// Shared by the driver ping handler, the passenger fallback ping handler, and the
// signal-loss sweep, so all three alert sources go through one consistent path.
async function handleSafetyAlert(rideId, alertObj) {
  try {
    const Alert = require('./models/Alert');

    const ride = await Ride.findById(rideId).populate('passenger', 'name phone');

    let severity = 'medium';
    if (alertObj.type === 'suspicious-stop') severity = 'high';
    else if (alertObj.type === 'route-deviation') severity = 'medium';
    else if (alertObj.type === 'signal-lost') severity = 'critical';
    else if (alertObj.type === 'signal-restored') severity = 'low';

    const newAlert = new Alert({
      ride: rideId,
      passenger: ride ? ride.passenger._id : undefined,
      type: alertObj.type,
      severity,
      location: {
        type: 'Point',
        coordinates: [alertObj.location.lng, alertObj.location.lat]
      },
      description: alertObj.description,
      status: 'active'
    });
    await newAlert.save();

    io.to(`ride-${rideId}`).emit('safety:deviation-alert', {
      rideId,
      type: alertObj.type,
      description: alertObj.description,
      location: alertObj.location,
      timestamp: newAlert.createdAt
    });
    io.emit('safety-alert', {
      alertId: newAlert._id,
      rideId,
      type: alertObj.type,
      severity,
      message: alertObj.description,
      location: alertObj.location,
      passenger: ride && ride.passenger ? {
        name: ride.passenger.name,
        phone: ride.passenger.phone
      } : { name: 'Unknown', phone: '' },
      timestamp: newAlert.createdAt
    });
  } catch (err) {
    console.error('[SafetySentinel] Error:', err.message);
  }
}

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Passenger or driver joins ride room to get live updates for their trip.
  // Only the ride's own passenger/driver (or an admin) may join — otherwise anyone
  // who guessed/leaked a rideId could eavesdrop on location, status and chat events.
  socket.on('join:ride', async ({ rideId }) => {
    if (!rideId) return;
    if (!socket.user) {
      return socket.emit('error', { message: 'Authentication required to join ride room' });
    }
    try {
      const ride = await Ride.findById(rideId).select('passenger driver');
      if (!ride) return socket.emit('error', { message: 'Ride not found' });

      const isPassenger = ride.passenger?.toString() === socket.user.userId;
      let isDriver = false;
      if (ride.driver) {
        const Driver = require('./models/Driver');
        const driverDoc = await Driver.findById(ride.driver).select('user');
        isDriver = driverDoc?.user?.toString() === socket.user.userId;
      }
      if (!isPassenger && !isDriver && socket.user.role !== 'admin') {
        return socket.emit('error', { message: 'Not authorized for this ride' });
      }

      socket.join(`ride-${rideId}`);
      console.log(`[Socket] Client joined ride room: ride-${rideId}`);
    } catch (err) {
      console.error('[Socket] join:ride failed:', err.message);
    }
  });

  // Driver joins their personal room to receive ride requests and manage status.
  // Only that driver's own account (or an admin) may join their room.
  socket.on('join:driver', async ({ driverId }, callback) => {
    if (!driverId) return;
    if (!socket.user) {
      socket.emit('error', { message: 'Authentication required to join driver room' });
      return typeof callback === 'function' && callback({ success: false });
    }
    try {
      const Driver = require('./models/Driver');
      const driverDoc = await Driver.findById(driverId).select('user');
      const isSelf = driverDoc?.user?.toString() === socket.user.userId;
      if (!isSelf && socket.user.role !== 'admin') {
        socket.emit('error', { message: 'Not authorized for this driver room' });
        return typeof callback === 'function' && callback({ success: false });
      }

      socket.join(`driver-${driverId}`);
      console.log(`[Socket] Driver ${driverId} joined room: driver-${driverId}`);
      // Acknowledge the join so the client can wait for it before marking itself
      // online in the DB — otherwise a ride can be matched to this driver (found
      // by the DB status='online' check) before the socket room join actually
      // lands, and the ride:request event fires into an empty room and is lost.
      if (typeof callback === 'function') callback({ success: true });
    } catch (err) {
      console.error('[Socket] join:driver failed:', err.message);
      if (typeof callback === 'function') callback({ success: false });
    }
  });

  // Driver broadcasts live GPS location during a trip or while online
  socket.on('driver:location-update', async ({ rideId, driverId, lat, lng }) => {
    if (!driverId || !lat || !lng) return;

    // 1. Relay live location to passenger if they are in a ride
    if (rideId) {
      socket.to(`ride-${rideId}`).emit('driver:location', { lat, lng });

      // 2. SafetySentinel — check for route deviation / suspicious stops
      try {
        const alertObj = await safetySentinel.updateLocation(rideId, { lat, lng }, 'driver');
        if (alertObj) await handleSafetyAlert(rideId, alertObj);
      } catch (err) {
        console.error('[SafetySentinel] Error:', err.message);
      }
    }

    // 3. Cache location in Redis (30s TTL) for quick dashboard lookups
    cacheDriverLocation(driverId, lat, lng).catch(() => {});

    // 4. Update Driver document in DB for persistent status
    try {
      const Driver = require('./models/Driver');
      await Driver.findByIdAndUpdate(driverId, {
        currentLocation: { type: 'Point', coordinates: [lng, lat] },
        lastLocationUpdate: new Date()
      });
    } catch (err) {
      console.error('[Socket] Driver DB update failed:', err.message);
    }
  });

  // Passenger's own phone also reports GPS during an active trip — a redundant fallback
  // channel so SafetySentinel isn't blind if the driver's phone loses power, is force-quit,
  // or drops connectivity. Only the ride's own passenger (or an admin) may report for it.
  socket.on('passenger:location-update', async ({ rideId, lat, lng }) => {
    if (!rideId || typeof lat !== 'number' || typeof lng !== 'number') return;
    if (!socket.user) return;

    try {
      const ride = await Ride.findById(rideId).select('passenger');
      if (!ride) return;
      const isPassenger = ride.passenger?.toString() === socket.user.userId;
      if (!isPassenger && socket.user.role !== 'admin') return;

      const alertObj = await safetySentinel.updateLocation(rideId, { lat, lng }, 'passenger');
      if (alertObj) await handleSafetyAlert(rideId, alertObj);
    } catch (err) {
      console.error('[SafetySentinel] passenger:location-update error:', err.message);
    }
  });

  // Driver arrived at pickup — relay to passenger + send push notification
  socket.on('driver:arrived', async ({ rideId }) => {
    if (rideId) {
      io.to(`ride-${rideId}`).emit('driver:arrived', { rideId });
      console.log(`[Socket] Driver arrived for ride ${rideId}`);

      // Push notification to passenger
      try {
        const ride = await Ride.findById(rideId).populate('passenger driver');
        if (ride?.passenger?.fcmToken) {
          const driverUser = await require('./models/User').findById(
            ride.driver?.user || ride.driver
          ).select('name');
          const driverName = driverUser?.name || 'Your driver';
          await notifyDriverArrived(ride.passenger.fcmToken, driverName, rideId);
        }
      } catch (err) {
        console.error('[FCM] driver:arrived notification failed:', err.message);
      }
    }
  });

  // SOS triggered from passenger app
  socket.on('sos:trigger', ({ rideId, timestamp }) => {
    io.emit('sos:active', { rideId, timestamp });
    console.log(`[SOS] Triggered for ride: ${rideId}`);
  });

  // In-app chat — passenger ↔ driver messaging. Same ownership rule as join:ride:
  // only the ride's own passenger/driver (or an admin) can read/send chat for it.
  socket.on('chat:join', async ({ rideId }) => {
    if (!rideId) return;
    if (!socket.user) {
      return socket.emit('error', { message: 'Authentication required to join chat' });
    }
    try {
      const ride = await Ride.findById(rideId).select('passenger driver');
      if (!ride) return;

      const isPassenger = ride.passenger?.toString() === socket.user.userId;
      let isDriver = false;
      if (ride.driver) {
        const Driver = require('./models/Driver');
        const driverDoc = await Driver.findById(ride.driver).select('user');
        isDriver = driverDoc?.user?.toString() === socket.user.userId;
      }
      if (!isPassenger && !isDriver && socket.user.role !== 'admin') {
        return socket.emit('error', { message: 'Not authorized for this chat' });
      }

      socket.join(`chat-${rideId}`);
    } catch (err) {
      console.error('[Socket] chat:join failed:', err.message);
    }
  });

  socket.on('chat:send', async ({ rideId, text, sender, senderName }) => {
    if (!rideId || !text?.trim()) return;
    const message = {
      id:         `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text:       text.trim(),
      sender,
      senderName: senderName || sender,
      timestamp:  new Date().toISOString(),
    };
    
    // Save to DB and find target token
    try {
      const ride = await Ride.findByIdAndUpdate(rideId, {
        $push: { chatMessages: message }
      }, { new: true }).populate('passenger driver');
      
      if (ride) {
        let targetToken = null;
        
        // Check who the sender is to determine the recipient
        const isPassenger = sender === ride.passenger?._id?.toString() || sender === ride.passenger?.id;
        
        if (isPassenger) {
          // Notify Driver
          const User = require('./models/User');
          const driverUser = await User.findById(ride.driver?.user || ride.driver);
          targetToken = driverUser?.fcmToken || ride.driver?.fcmToken;
        } else {
          // Notify Passenger
          targetToken = ride.passenger?.fcmToken;
        }

        if (targetToken) {
          await notifyNewMessage(targetToken, message.senderName, message.text, rideId);
        }
      }
    } catch (err) {
      console.error('[Chat] Save or notify failed:', err.message);
    }

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
// Timer-driven sweep inside SafetySentinel catches total silence (both driver and
// passenger devices dark) that no incoming ping would ever trigger on its own.
safetySentinel.onSignalLost = (rideId, alertObj) => handleSafetyAlert(rideId, alertObj);

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
