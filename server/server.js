const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const logger = require('./config/logger');

// Rate limiting and validation middlewares
const { authRateLimiter, generalRateLimiter, uploadRateLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Route imports
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const fileRoutes = require('./routes/fileRoutes');
const folderRoutes = require('./routes/folderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const channelRoutes = require('./routes/channelRoutes');
const messageRoutes = require('./routes/messageRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const billingRoutes = require('./routes/billingRoutes');

// Load env variables
dotenv.config();

// Initialize Express app & HTTP Server
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Initialize Socket.IO Server with JWT authentication & workspace rooms
initSocket(server);

// Essential Security & Utility Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan HTTP request logging (writes to console and winston logger)
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'logs/access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Global API rate limiter
app.use('/api/', generalRateLimiter);

// Rate-limited Auth Endpoints
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/auth/forgot-password', authRateLimiter);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/workspaces', fileRoutes);
app.use('/api/workspaces', folderRoutes);
app.use('/api/workspaces', channelRoutes);
app.use('/api/workspaces', messageRoutes);
app.use('/api/workspaces', meetingRoutes);
app.use('/api', billingRoutes);

// Serve local uploaded files fallback when Supabase is in local mode
app.get('/api/local-files/*', (req, res) => {
  const relativePath = decodeURIComponent(req.params[0] || req.path.replace('/api/local-files/', ''));
  const filePath = path.join(__dirname, 'uploads', relativePath);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  } else {
    return res.status(404).json({ success: false, message: 'Local file not found' });
  }
});

// Base route API greeting
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to NexusHub Production API Gateway',
    documentation: '/api/health',
  });
});

// 404 Not Found & Centralized Error Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`NexusHub API Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`
  ======================================================
    🚀 NexusHub API & Socket.IO Server running on port ${PORT}
    🔌 Socket.IO Gateway: Live with WebRTC Mesh & Rooms
    💳 Billing & Subscriptions: Razorpay Enabled
    💚 Health Endpoint: http://localhost:${PORT}/api/health
  ======================================================
  `);
});
