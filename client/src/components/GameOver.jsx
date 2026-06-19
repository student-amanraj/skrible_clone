import { useGame } from '../context/GameContext';

export default function GameOver() {
  const { state, dispatch } = useGame();
  const leaderboard = state.leaderboard.length > 0 ? state.leaderboard : [...state.scores].sort((a, b) => b.score - a.score);

  return (
    <main className="game-over-screen">
      <section className="results-panel">
        <p className="eyebrow">Game over</p>
        <h1>{state.winner?.name || 'No winner'}</h1>
        <p className="winner-line">
          {state.winner ? `Winner with ${state.winner.score} points` : 'The game ended before scores were recorded.'}
        </p>

        <div className="result-list final">
          {leaderboard.map((player, index) => (
            <div className={`result-row ${index === 0 ? 'winner-row' : ''}`} key={player.socketId}>
              <span>#{index + 1}</span>
              <strong>{player.name}</strong>
              <span>{player.score} pts</span>
            </div>
          ))}
        </div>

        <button className="primary-action" type="button" onClick={() => dispatch({ type: 'RESET' })}>
          Back to Home
        </button>
      </section>
    </main>
  );
}
