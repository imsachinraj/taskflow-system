const { Server } = require('socket.io');
const { verifyAccessToken } = require('./utils/jwt');
const User = require('./models/User');
const logger = require('../utils/logger');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Authentication Middleware ─────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('name email avatar initials');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    logger.info(`🔌 Socket connected: ${socket.user.name} (${socket.id})`);

    // Join user's personal room for direct notifications
    socket.join(`user:${socket.user._id}`);

    // ── Join a team room ──────────────────────────────────────────────────────
    socket.on('join:team', (teamId) => {
      socket.join(`team:${teamId}`);
      logger.info(`${socket.user.name} joined team room: ${teamId}`);

      // Notify other team members
      socket.to(`team:${teamId}`).emit('user:online', {
        userId: socket.user._id,
        name: socket.user.name,
        avatar: socket.user.avatar,
      });
    });

    // ── Leave a team room ─────────────────────────────────────────────────────
    socket.on('leave:team', (teamId) => {
      socket.leave(`team:${teamId}`);
      socket.to(`team:${teamId}`).emit('user:offline', { userId: socket.user._id });
    });

    // ── User is typing a comment ──────────────────────────────────────────────
    socket.on('typing:start', ({ taskId, teamId }) => {
      socket.to(`team:${teamId}`).emit('user:typing', {
        taskId,
        user: { id: socket.user._id, name: socket.user.name },
      });
    });

    socket.on('typing:stop', ({ taskId, teamId }) => {
      socket.to(`team:${teamId}`).emit('user:stop_typing', {
        taskId,
        userId: socket.user._id,
      });
    });

    // ── Task being viewed (presence) ──────────────────────────────────────────
    socket.on('task:view', ({ taskId, teamId }) => {
      socket.to(`team:${teamId}`).emit('task:viewer_joined', {
        taskId,
        user: { id: socket.user._id, name: socket.user.name, avatar: socket.user.avatar },
      });
    });

    socket.on('task:unview', ({ taskId, teamId }) => {
      socket.to(`team:${teamId}`).emit('task:viewer_left', {
        taskId,
        userId: socket.user._id,
      });
    });

    // ── Disconnection ─────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket disconnected: ${socket.user.name} — ${reason}`);
      // Broadcast to all rooms the user was in
      io.emit('user:offline', { userId: socket.user._id });
    });

    socket.on('error', (err) => {
      logger.error(`Socket error for ${socket.user.name}: ${err.message}`);
    });
  });

  logger.info('✅ Socket.io initialized');
  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized. Call initializeSocket first.');
  return io;
};

module.exports = { initializeSocket, getIO };
