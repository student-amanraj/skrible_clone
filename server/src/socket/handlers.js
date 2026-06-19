const GameRoom = require('../classes/GameRoom');
const Room = require('../models/Room');

// In-memory store of active rooms
const activeRooms = new Map(); // roomId -> GameRoom

function generateRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function clampSetting(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[+] Connected: ${socket.id}`);

    // ─── Room events ────────────────────────────────────────────────────────────

    socket.on('create_room', async ({ playerName, settings = {} }) => {
      let roomId = generateRoomCode();
      while (activeRooms.has(roomId)) roomId = generateRoomCode();

      const roomSettings = {
        maxPlayers: clampSetting(settings.maxPlayers, 8, 2, 20),
        rounds: clampSetting(settings.rounds, 3, 2, 20),
        drawTime: clampSetting(settings.drawTime, 80, 15, 240),
        wordCount: clampSetting(settings.wordCount, 3, 1, 5),
        hints: clampSetting(settings.hints, 2, 0, 5),
        isPrivate: Boolean(settings.isPrivate),
      };

      const room = new GameRoom(roomId, socket.id, playerName, roomSettings, io);
      activeRooms.set(roomId, room);

      // Persist to MongoDB
      try {
        await Room.create({ roomId, hostSocketId: socket.id, settings: roomSettings });
      } catch (e) {
        console.error('MongoDB save error:', e.message);
      }

      socket.join(roomId);
      socket.emit('room_created', {
        roomId,
        players: room.getPlayerList(),
        settings: roomSettings,
        hostSocketId: room.hostSocketId,
        isHost: true,
      });

      console.log(`Room ${roomId} created by ${playerName}`);
    });

    socket.on('join_room', ({ roomId, playerName }) => {
      const room = activeRooms.get(roomId);

      if (!room) {
        socket.emit('join_error', { message: 'Room not found' });
        return;
      }
      if (room.isFull()) {
        socket.emit('join_error', { message: 'Room is full' });
        return;
      }
      if (room.status === 'playing') {
        socket.emit('join_error', { message: 'Game already in progress' });
        return;
      }

      const success = room.addPlayer(socket.id, playerName);
      if (!success) {
        socket.emit('join_error', { message: 'Could not join room' });
        return;
      }

      socket.join(roomId);
      socket.emit('room_joined', {
        roomId,
        players: room.getPlayerList(),
        settings: room.settings,
        hostSocketId: room.hostSocketId,
        isHost: room.isHost(socket.id),
      });

      console.log(`${playerName} joined room ${roomId}`);
    });

    socket.on('set_ready', ({ roomId, ready }) => {
      const room = activeRooms.get(roomId);
      if (room) room.setReady(socket.id, ready);
    });

    socket.on('start_game', ({ roomId }) => {
      const room = activeRooms.get(roomId);
      if (!room) return;
      const result = room.startGame(socket.id);
      if (result.error) socket.emit('start_error', { message: result.error });
    });

    // ─── Drawing events ──────────────────────────────────────────────────────────

    socket.on('draw_start', ({ roomId, x, y, color, size, tool }) => {
      const room = activeRooms.get(roomId);
      if (room) room.handleDrawStart(socket.id, { x, y, color, size, tool });
    });

    socket.on('draw_move', ({ roomId, x, y }) => {
      const room = activeRooms.get(roomId);
      if (room) room.handleDrawMove(socket.id, { x, y });
    });

    socket.on('draw_end', ({ roomId }) => {
      const room = activeRooms.get(roomId);
      if (room) room.handleDrawEnd(socket.id);
    });

    socket.on('canvas_clear', ({ roomId }) => {
      const room = activeRooms.get(roomId);
      if (room) room.handleCanvasClear(socket.id);
    });

    socket.on('draw_undo', ({ roomId }) => {
      const room = activeRooms.get(roomId);
      if (room) room.handleUndo(socket.id);
    });

    // ─── Word selection ──────────────────────────────────────────────────────────

    socket.on('word_chosen', ({ roomId, word }) => {
      const room = activeRooms.get(roomId);
      if (room) room.handleWordChosen(socket.id, word);
    });

    // ─── Guess / Chat ────────────────────────────────────────────────────────────

    socket.on('guess', ({ roomId, text }) => {
      const room = activeRooms.get(roomId);
      if (room) room.handleGuess(socket.id, text);
    });

    socket.on('chat', ({ roomId, text }) => {
      const room = activeRooms.get(roomId);
      if (room) room.handleChat(socket.id, text);
    });

    // ─── Late-join state sync ────────────────────────────────────────────────────

    socket.on('request_game_state', ({ roomId }) => {
      const room = activeRooms.get(roomId);
      if (room && room.status === 'playing') {
        room.sendGameState(socket.id);
        room.sendCanvasReplay(socket.id);
      }
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      console.log(`[-] Disconnected: ${socket.id}`);
      activeRooms.forEach((room, roomId) => {
        if (room.players.has(socket.id)) {
          room.removePlayer(socket.id);
          if (room.isEmpty()) {
            activeRooms.delete(roomId);
            console.log(`Room ${roomId} deleted (empty)`);
          }
        }
      });
    });
  });
}

module.exports = { registerSocketHandlers };
