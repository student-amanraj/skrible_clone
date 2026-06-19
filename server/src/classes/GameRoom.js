const Player = require('./Player');
const Game = require('./Game');

class GameRoom {
  constructor(roomId, hostSocketId, hostName, settings, io) {
    this.roomId = roomId;
    this.hostSocketId = hostSocketId;
    this.settings = settings;
    this.io = io;
    this.players = new Map(); // socketId -> Player
    this.game = null;
    this.status = 'waiting'; // waiting | playing | finished
    this.createdAt = Date.now();

    // Add host as first player
    this.addPlayer(hostSocketId, hostName);
  }

  // ─── Player management ────────────────────────────────────────────────────────

  addPlayer(socketId, name) {
    if (this.players.size >= this.settings.maxPlayers) return false;
    const player = new Player(socketId, name);
    this.players.set(socketId, player);
    this.broadcast('player_joined', {
      player: player.toJSON(),
      players: this.getPlayerList(),
      hostSocketId: this.hostSocketId,
    });
    return true;
  }

  removePlayer(socketId) {
    if (!this.players.has(socketId)) return;
    this.players.delete(socketId);
    if (this.game) this.game.removePlayer(socketId);

    this.broadcast('player_left', {
      socketId,
      players: this.getPlayerList(),
      hostSocketId: this.hostSocketId,
    });

    // Transfer host if host left
    if (socketId === this.hostSocketId && this.players.size > 0) {
      this.hostSocketId = this.players.keys().next().value;
      this.broadcast('host_changed', {
        hostSocketId: this.hostSocketId,
        players: this.getPlayerList(),
      });
    }

    // If game is running and fewer than 2 players remain, end game
    if (this.status === 'playing' && this.players.size < 2) {
      this.broadcast('game_aborted', { reason: 'Not enough players' });
      this.status = 'finished';
    }
  }

  setReady(socketId, ready) {
    const player = this.players.get(socketId);
    if (player) {
      player.isReady = ready;
      this.broadcast('player_ready', {
        socketId,
        ready,
        players: this.getPlayerList(),
        hostSocketId: this.hostSocketId,
      });
    }
  }

  // ─── Game lifecycle ───────────────────────────────────────────────────────────

  startGame(socketId) {
    if (socketId !== this.hostSocketId) return { error: 'Only the host can start the game' };
    if (this.players.size < 2) return { error: 'Need at least 2 players' };
    if (this.status === 'playing') return { error: 'Game already started' };

    this.status = 'playing';
    this.game = new Game(this.players, this.settings, this.io, this.roomId, () => {
      this.status = 'finished';
    });

    this.broadcast('game_started', {
      settings: this.settings,
      players: this.getPlayerList(),
      hostSocketId: this.hostSocketId,
    });

    this.game.startRound();
    return { success: true };
  }

  // ─── Delegation to Game ───────────────────────────────────────────────────────

  handleWordChosen(socketId, word) {
    if (!this.game) return;
    if (socketId !== this.game.getCurrentDrawerId()) return;
    this.game.handleWordChosen(word);
  }

  handleGuess(socketId, text) {
    if (!this.game || this.status !== 'playing') return;
    this.game.handleGuess(socketId, text);
  }

  handleDrawStart(socketId, data) {
    if (!this.game || socketId !== this.game.getCurrentDrawerId()) return;
    const stroke = { type: 'start', ...data };
    this.game.addStroke(stroke);
    this.io.to(this.roomId).except(socketId).emit('draw_data', stroke);
  }

  handleDrawMove(socketId, data) {
    if (!this.game || socketId !== this.game.getCurrentDrawerId()) return;
    const stroke = { type: 'move', ...data };
    this.game.addStroke(stroke);
    this.io.to(this.roomId).except(socketId).emit('draw_data', stroke);
  }

  handleDrawEnd(socketId) {
    if (!this.game || socketId !== this.game.getCurrentDrawerId()) return;
    const stroke = { type: 'end' };
    this.game.addStroke(stroke);
    this.io.to(this.roomId).except(socketId).emit('draw_data', stroke);
  }

  handleCanvasClear(socketId) {
    if (!this.game || socketId !== this.game.getCurrentDrawerId()) return;
    this.game.clearStrokeHistory();
    this.game.addStroke({ type: 'clear' });
    this.io.to(this.roomId).except(socketId).emit('draw_data', { type: 'clear' });
  }

  handleUndo(socketId) {
    if (!this.game || socketId !== this.game.getCurrentDrawerId()) return;
    // Remove strokes back to last 'start' boundary
    const history = this.game.strokeHistory;
    let i = history.length - 1;
    while (i >= 0 && history[i].type !== 'start') i--;
    if (i >= 0) history.splice(i);
    this.io.to(this.roomId).emit('draw_undo', { strokeHistory: history });
  }

  // ─── Replay for late joiners ──────────────────────────────────────────────────

  sendCanvasReplay(socketId) {
    if (this.game && this.game.strokeHistory.length > 0) {
      this.io.to(socketId).emit('canvas_replay', {
        strokes: this.game.strokeHistory,
      });
    }
  }

  sendGameState(socketId) {
    if (!this.game) return;
    const drawerId = this.game.getCurrentDrawerId();
    this.io.to(socketId).emit('game_state', {
      round: this.game.turn,
      totalRounds: this.settings.rounds,
      drawerId,
      wordMask: this.game.getWordMask(),
      scores: this.game.getScores(),
      players: this.getPlayerList(),
      hostSocketId: this.hostSocketId,
      status: this.status,
    });
  }

  // ─── Chat ─────────────────────────────────────────────────────────────────────

  handleChat(socketId, text) {
    const player = this.players.get(socketId);
    if (!player) return;
    this.broadcast('chat_message', {
      socketId,
      playerName: player.name,
      text,
      isGuess: false,
    });
  }

  // ─── Utilities ────────────────────────────────────────────────────────────────

  broadcast(event, data) {
    this.io.to(this.roomId).emit(event, data);
  }

  getPlayerList() {
    return Array.from(this.players.values()).map((p) => p.toJSON());
  }

  isFull() {
    return this.players.size >= this.settings.maxPlayers;
  }

  isEmpty() {
    return this.players.size === 0;
  }

  isHost(socketId) {
    return socketId === this.hostSocketId;
  }
}

module.exports = GameRoom;
