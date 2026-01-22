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
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

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
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const safetyRoutes = require('./routes/safety');
const pinkPassRoutes = require('./routes/pinkpass');
const driverRoutes = require('./routes/drivers');

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/pink-pass', pinkPassRoutes);
app.use('/api/drivers', driverRoutes);

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
