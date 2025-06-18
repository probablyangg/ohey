/**
 * OHey WebSocket Server
 * Main server application handling real-time chat functionality
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const RoomManager = require('./utils/rooms');
const UsernameManager = require('./utils/usernames');

// Server configuration
const PORT = process.env.PORT || 3001;
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : ['*'];

// Initialize managers
const roomManager = new RoomManager();
const usernameManager = new UsernameManager();

// Rate limiters
const messageLimiter = new RateLimiterMemory({
  keyGenerator: (socket) => socket.id,
  points: 10, // 10 messages
  duration: 60, // per 60 seconds
});

const connectionLimiter = new RateLimiterMemory({
  keyGenerator: (socket) => socket.handshake.address,
  points: 50, // 50 connections (much more generous for development)
  duration: 60, // per 60 seconds
});

// Create Express app for health checks
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(cors({
  origin: function(origin, callback) {
    // Allow Chrome extensions (they have null origin)
    if (!origin || origin === 'null') {
      return callback(null, true);
    }
    // Allow localhost for development
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }
    // Allow configured origins
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(null, true); // Allow all for development
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    rooms: roomManager.getStats(),
    usernames: usernameManager.getStats(),
    environment: NODE_ENV
  };
  
  res.json(stats);
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'OHey Server Running',
    version: '0.1.0',
    rooms: roomManager.getStats().totalRooms,
    users: roomManager.getStats().totalUsers
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is accessible',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'no-origin'
  });
});

// Create HTTP server
const httpServer = http.createServer(app);

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: function(origin, callback) {
      // Allow Chrome extensions (they have null origin)
      if (!origin || origin === 'null') {
        return callback(null, true);
      }
      // Allow localhost for development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      // Allow configured origins
      if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'], // Try polling first
  allowEIO3: true
});

// Socket.IO middleware for rate limiting (disabled for development)
io.use(async (socket, next) => {
  if (NODE_ENV === 'production') {
    try {
      await connectionLimiter.consume(socket.handshake.address);
      next();
    } catch (rejRes) {
      console.log(`Connection rate limited: ${socket.handshake.address}`);
      next(new Error('Too many connections'));
    }
  } else {
    // Skip rate limiting in development
    next();
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  let currentRoom = null;
  let currentUsername = null;
  
  // Handle room joining
  socket.on('join-room', async (data) => {
    try {
      const { roomId, url, username: preferredUsername } = data;
      
      // Validate room ID
      if (!RoomManager.validateRoomId(roomId)) {
        socket.emit('error', { message: 'Invalid room ID' });
        return;
      }
      
      // Generate or validate username
      const username = usernameManager.generateUniqueUsername(roomId, preferredUsername);
      const usernameResult = usernameManager.reserveUsername(roomId, socket.id, username);
      
      if (!usernameResult.success) {
        socket.emit('error', { message: 'Failed to reserve username' });
        return;
      }
      
      // Join room
      const joinResult = roomManager.joinRoom(roomId, socket.id, username);
      
      if (!joinResult.success) {
        usernameManager.releaseUsername(socket.id);
        socket.emit('error', { message: 'Failed to join room' });
        return;
      }
      
      // Leave previous room if any
      if (currentRoom) {
        socket.leave(currentRoom);
        // Notify previous room of user leaving
        socket.to(currentRoom).emit('user-left', {
          username: currentUsername,
          userCount: roomManager.getRoomCount(currentRoom)
        });
      }
      
      // Join new room
      socket.join(roomId);
      currentRoom = roomId;
      currentUsername = username;
      
      // Send confirmation to user
      socket.emit('room-joined', {
        roomId,
        username,
        userCount: joinResult.userCount,
        users: joinResult.users.map(u => ({ username: u.username }))
      });
      
      // Notify room of new user
      socket.to(roomId).emit('user-joined', {
        username,
        userCount: joinResult.userCount
      });
      
      // Send user count update to all users in room
      io.to(roomId).emit('user-count', { count: joinResult.userCount });
      
      console.log(`${username} joined room ${roomId} (${joinResult.userCount} users)`);
      
    } catch (error) {
      console.error('Error handling join-room:', error);
      socket.emit('error', { message: 'Server error' });
    }
  });
  
  // Handle chat messages
  socket.on('send-message', async (data) => {
    try {
      // Rate limiting
      try {
        await messageLimiter.consume(socket.id);
      } catch (rejRes) {
        console.log(`Message rate limited: ${socket.id}`);
        socket.emit('error', { message: 'Too many messages. Please slow down.' });
        return;
      }
      
      const { text, roomId } = data;
      
      // Validate input
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        socket.emit('error', { message: 'Invalid message' });
        return;
      }
      
      if (text.length > 500) {
        socket.emit('error', { message: 'Message too long' });
        return;
      }
      
      if (!currentRoom || currentRoom !== roomId) {
        socket.emit('error', { message: 'Not in room' });
        return;
      }
      
      // Update user activity
      usernameManager.updateUserActivity?.(socket.id);
      roomManager.updateUserActivity(socket.id);
      roomManager.incrementMessageCount(roomId);
      
      // Broadcast message to room
      const messageData = {
        username: currentUsername,
        text: text.trim(),
        timestamp: Date.now(),
        roomId
      };
      
      io.to(roomId).emit('message', messageData);
      
      console.log(`Message in ${roomId} from ${currentUsername}: ${text.trim()}`);
      
    } catch (error) {
      console.error('Error handling send-message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Handle wave messages
  socket.on('send-wave', async (data) => {
    try {
      // Rate limiting (waves count as messages)
      try {
        await messageLimiter.consume(socket.id);
      } catch (rejRes) {
        socket.emit('error', { message: 'Too many actions. Please slow down.' });
        return;
      }
      
      const { roomId } = data;
      
      if (!currentRoom || currentRoom !== roomId) {
        socket.emit('error', { message: 'Not in room' });
        return;
      }
      
      // Update user activity
      usernameManager.updateUserActivity?.(socket.id);
      roomManager.updateUserActivity(socket.id);
      
      // Broadcast wave to room
      const waveData = {
        username: currentUsername,
        timestamp: Date.now(),
        roomId
      };
      
      io.to(roomId).emit('wave', waveData);
      
      console.log(`Wave in ${roomId} from ${currentUsername}`);
      
    } catch (error) {
      console.error('Error handling send-wave:', error);
      socket.emit('error', { message: 'Failed to send wave' });
    }
  });
  
  // Handle leaving room
  socket.on('leave-room', () => {
    try {
      if (currentRoom) {
        handleUserLeave();
      }
    } catch (error) {
      console.error('Error handling leave-room:', error);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    try {
      console.log(`User disconnected: ${socket.id} (${reason})`);
      handleUserLeave();
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
  
  // Helper function to handle user leaving
  function handleUserLeave() {
    try {
      if (currentRoom && currentUsername) {
        // Remove from room
        const leaveResult = roomManager.leaveCurrentRoom(socket.id);
        usernameManager.releaseUsername(socket.id);
        
        if (leaveResult) {
          // Notify room of user leaving
          socket.to(currentRoom).emit('user-left', {
            username: currentUsername,
            userCount: leaveResult.userCount
          });
          
          // Send updated user count
          io.to(currentRoom).emit('user-count', { count: leaveResult.userCount });
          
          console.log(`${currentUsername} left room ${currentRoom} (${leaveResult.userCount} users remaining)`);
        }
        
        socket.leave(currentRoom);
        currentRoom = null;
        currentUsername = null;
      }
    } catch (error) {
      console.error('Error in handleUserLeave:', error);
    }
  }
  
  // Handle ping for connection testing
  socket.on('ping', (data) => {
    socket.emit('pong', { timestamp: Date.now(), ...data });
  });
});

// Error handling
io.on('error', (error) => {
  console.error('Socket.IO error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  roomManager.stopCleanup();
  
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  
  roomManager.stopCleanup();
  
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Start the combined server (HTTP + WebSocket on same port)
httpServer.listen(PORT, () => {
  console.log(`🚀 OHey server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 WebSocket endpoint: http://localhost:${PORT}`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔒 CORS: All origins allowed for development`);
  console.log(`✅ Server ready for connections!`);
});

// Export for testing
module.exports = { app, httpServer, io, roomManager, usernameManager };