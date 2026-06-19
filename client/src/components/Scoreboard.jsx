import { useGame } from '../context/GameContext';

export default function Scoreboard() {
  const { state } = useGame();

  const sorted = [...state.players].sort((left, right) => {
    const leftScore = state.scores.find((score) => score.socketId === left.socketId)?.score || left.score || 0;
    const rightScore =
      state.scores.find((score) => score.socketId === right.socketId)?.score || right.score || 0;
    return rightScore - leftScore;
  });

  return (
    <section className="score-panel" aria-label="Scoreboard">
      <div className="panel-title">
        <span>Scoreboard</span>
        <small>{state.players.length}</small>
      </div>

      <div className="score-list">
        {sorted.map((player, index) => {
          const score = state.scores.find((item) => item.socketId === player.socketId)?.score || player.score || 0;
          const isDrawer = player.socketId === state.drawerId;

          return (
            <div className="score-row" key={player.socketId}>
              <span className="rank">#{index + 1}</span>
              <div className="score-player">
                <strong>{player.name}</strong>
                <span>{isDrawer ? 'Drawing' : player.hasGuessedCorrectly ? 'Guessed' : 'Guessing'}</span>
              </div>
              <strong className="score-value">{score}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
