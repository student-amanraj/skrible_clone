class Player {
  constructor(socketId, name) {
    this.socketId = socketId;
    this.name = name;
    this.score = 0;
    this.hasGuessedCorrectly = false;
    this.isReady = false;
    this.joinedAt = Date.now();
  }

  addScore(points) {
    this.score += points;
  }

  resetRound() {
    this.hasGuessedCorrectly = false;
  }

  toJSON() {
    return {
      socketId: this.socketId,
      name: this.name,
      score: this.score,
      hasGuessedCorrectly: this.hasGuessedCorrectly,
      isReady: this.isReady,
    };
  }
}

module.exports = Player;
