const wordList = require('../data/words');

class Game {
  constructor(players, settings, io, roomId, onGameEnd) {
    this.players = players; // Map<socketId, Player>
    this.settings = settings;
    this.io = io;
    this.roomId = roomId;
    this.onGameEnd = onGameEnd;

    this.turn = 0;
    this.currentDrawerIndex = 0;
    this.drawOrder = Array.from(players.keys());
    this.currentWord = '';
    this.wordOptions = [];
    this.roundActive = false;
    this.roundTimer = null;
    this.hintTimer = null;
    this.hintInterval = null;
    this.wordChoiceTimeout = null;
    this.revealedIndices = new Set();
    this.strokeHistory = []; // for canvas replay on new joins
    this.roundStartTime = null;
  }

  // ─── Word helpers ───────────────────────────────────────────────────────────

  pickWords(count) {
    const shuffled = [...wordList].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  getWordMask() {
    return this.currentWord
      .split('')
      .map((ch, i) =>
        ch === ' ' ? ' ' : this.revealedIndices.has(i) ? ch : '_'
      )
      .join('');
  }

  // ─── Round lifecycle ─────────────────────────────────────────────────────────

  startRound() {
    this.turn += 1;
    this.roundActive = false;
    this.revealedIndices = new Set();
    this.strokeHistory = [];
    this.currentWord = '';

    // Reset player round flags
    this.players.forEach((p) => p.resetRound());

    const drawerId = this.drawOrder[this.currentDrawerIndex];
    this.wordOptions = this.pickWords(this.settings.wordCount || 3);

    this.io.to(this.roomId).emit('draw_data', { type: 'clear' });

    // Send word choices only to the drawer
    this.io.to(drawerId).emit('round_start', {
      round: this.turn,
      totalRounds: this.settings.rounds,
      drawerId,
      wordOptions: this.wordOptions,
      isDrawer: true,
      drawTime: this.settings.drawTime,
    });

    // Tell everyone else a new round is starting
    this.io.to(this.roomId).except(drawerId).emit('round_start', {
      round: this.turn,
      totalRounds: this.settings.rounds,
      drawerId,
      wordOptions: null,
      isDrawer: false,
      drawTime: this.settings.drawTime,
    });

    // Drawer has 15s to choose a word; auto-pick if they don't
    this.wordChoiceTimeout = setTimeout(() => {
      if (!this.roundActive) {
        const autoWord =
          this.wordOptions[Math.floor(Math.random() * this.wordOptions.length)];
        this.handleWordChosen(autoWord);
      }
    }, 15000);
  }

  handleWordChosen(word) {
    clearTimeout(this.wordChoiceTimeout);
    this.wordChoiceTimeout = null;
    this.currentWord = word;
    this.roundActive = true;
    this.roundStartTime = Date.now();

    const drawerId = this.drawOrder[this.currentDrawerIndex];
    const wordLength = word.split('').map((ch) => (ch === ' ' ? ' ' : '_')).join('');

    // Drawer gets the real word; others get blanks
    this.io.to(drawerId).emit('word_chosen', { word, wordMask: word });
    this.io.to(this.roomId).except(drawerId).emit('word_chosen', {
      word: null,
      wordMask: wordLength,
      wordLength: word.replace(/ /g, '').length,
    });

    // Start countdown timer
    this.startRoundTimer();

    // Schedule hints
    if (this.settings.hints > 0) {
      this.scheduleHints();
    }
  }

  startRoundTimer() {
    let timeLeft = this.settings.drawTime;
    this.io.to(this.roomId).emit('timer_update', { timeLeft });

    this.roundTimer = setInterval(() => {
      timeLeft -= 1;
      this.io.to(this.roomId).emit('timer_update', { timeLeft });
      if (timeLeft <= 0) {
        this.endRound(false);
      }
    }, 1000);
  }

  scheduleHints() {
    const { hints, drawTime } = this.settings;
    const interval = Math.floor(drawTime / (hints + 1));

    let hintsGiven = 0;
    this.hintInterval = setInterval(() => {
      if (hintsGiven >= hints || !this.roundActive) {
        clearInterval(this.hintInterval);
        return;
      }
      this.revealHint();
      hintsGiven++;
    }, interval * 1000);
  }

  revealHint() {
    const letters = this.currentWord.split('');
    const unrevealed = letters
      .map((ch, i) => (ch !== ' ' && !this.revealedIndices.has(i) ? i : null))
      .filter((i) => i !== null);

    if (unrevealed.length === 0) return;

    const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    this.revealedIndices.add(idx);

    const drawerId = this.drawOrder[this.currentDrawerIndex];
    this.io.to(this.roomId).except(drawerId).emit('hint_reveal', {
      wordMask: this.getWordMask(),
    });
  }

  // ─── Guess handling ──────────────────────────────────────────────────────────

  handleGuess(socketId, text) {
    if (!this.roundActive) return;

    const player = this.players.get(socketId);
    if (!player || player.hasGuessedCorrectly) return;

    const drawerId = this.drawOrder[this.currentDrawerIndex];
    if (socketId === drawerId) return; // drawer can't guess

    const normalized = this.normalizeGuess(text);
    const answer = this.normalizeGuess(this.currentWord);
    const correct = normalized === answer;

    if (correct) {
      const elapsed = (Date.now() - this.roundStartTime) / 1000;
      const points = this.calcPoints(elapsed);
      player.addScore(points);
      player.hasGuessedCorrectly = true;

      // Bonus for drawer when someone guesses correctly
      const drawer = this.players.get(drawerId);
      if (drawer) drawer.addScore(Math.floor(points * 0.5));

      this.io.to(this.roomId).emit('guess_result', {
        correct: true,
        socketId,
        playerName: player.name,
        points,
        scores: this.getScores(),
        players: this.getPlayers(),
      });

      this.endRound(true);
    } else {
      // Broadcast as chat so everyone sees the wrong guess
      this.io.to(this.roomId).emit('chat_message', {
        socketId,
        playerName: player.name,
        text,
        isGuess: true,
      });

      // Check for close guess
      if (this.isClose(normalized, answer)) {
        this.io.to(socketId).emit('close_guess', { message: "You're close!" });
      }
    }
  }

  normalizeGuess(value) {
    return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
  }

  isClose(guess, answer) {
    if (Math.abs(guess.length - answer.length) > 2) return false;
    let diff = 0;
    const longer = guess.length > answer.length ? guess : answer;
    const shorter = guess.length > answer.length ? answer : guess;
    for (let i = 0; i < longer.length; i++) {
      if (longer[i] !== shorter[i]) diff++;
    }
    return diff <= 2;
  }

  calcPoints(elapsedSeconds) {
    const maxPoints = 250;
    const minPoints = 50;
    const ratio = Math.max(0, 1 - elapsedSeconds / this.settings.drawTime);
    return Math.round(minPoints + (maxPoints - minPoints) * ratio);
  }

  // ─── Round end ───────────────────────────────────────────────────────────────

  endRound(allGuessed) {
    if (!this.roundActive) return;
    this.roundActive = false;

    clearInterval(this.roundTimer);
    clearInterval(this.hintInterval);
    clearTimeout(this.wordChoiceTimeout);
    this.roundTimer = null;
    this.hintInterval = null;
    this.wordChoiceTimeout = null;

    this.io.to(this.roomId).emit('timer_update', { timeLeft: 0 });

    const isFinalTurn = this.turn >= this.settings.rounds;

    this.io.to(this.roomId).emit('round_end', {
      word: this.currentWord,
      scores: this.getScores(),
      players: this.getPlayers(),
      allGuessed,
      isFinalTurn,
    });

    // Move to next turn or end the game after a short pause
    setTimeout(() => {
      if (isFinalTurn) {
        this.endGame();
      } else {
        this.nextTurn();
      }
    }, 4000);
  }

  nextTurn() {
    this.currentDrawerIndex = (this.currentDrawerIndex + 1) % this.drawOrder.length;
    this.startRound();
  }

  endGame() {
    const leaderboard = this.getScores().sort((a, b) => b.score - a.score);
    const winner = leaderboard[0] || null;

    this.io.to(this.roomId).emit('game_over', { winner, leaderboard });

    if (this.onGameEnd) {
      this.onGameEnd();
    }
  }

  // ─── Stroke history (for canvas replay) ──────────────────────────────────────

  addStroke(strokeData) {
    this.strokeHistory.push(strokeData);
  }

  clearStrokeHistory() {
    this.strokeHistory = [];
  }

  // ─── Utilities ────────────────────────────────────────────────────────────────

  getScores() {
    return Array.from(this.players.values()).map((p) => ({
      socketId: p.socketId,
      name: p.name,
      score: p.score,
    }));
  }

  getPlayers() {
    return Array.from(this.players.values()).map((p) => p.toJSON());
  }

  getCurrentDrawerId() {
    return this.drawOrder[this.currentDrawerIndex];
  }

  removePlayer(socketId) {
    this.drawOrder = this.drawOrder.filter((id) => id !== socketId);
    if (this.currentDrawerIndex >= this.drawOrder.length) {
      this.currentDrawerIndex = 0;
    }
  }
}

module.exports = Game;
