const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// Check if a room exists and its status
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({
      roomId: room.roomId,
      status: room.status,
      settings: room.settings,
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// List public waiting rooms
router.get('/rooms', async (req, res) => {
  try {
    const rooms = await Room.find({ status: 'waiting', 'settings.isPrivate': false })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(rooms);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
