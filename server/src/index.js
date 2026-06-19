require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const roomRoutes = require('./routes/rooms');
const { registerSocketHandlers } = require('./socket/handlers');

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.IO setup ──────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// ─── Express middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// ─── REST routes ──────────────────────────────────────────────────────────────
app.use('/api', roomRoutes);

app.get('/', (req, res) => res.json({ status: 'Skribbl server running ✓' }));

// ─── Socket handlers ──────────────────────────────────────────────────────────
registerSocketHandlers(io);

// ─── MongoDB connection ───────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/skribbl';
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected ✓'))
  .catch((err) => console.warn('MongoDB not connected (running without DB):', err.message));

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
