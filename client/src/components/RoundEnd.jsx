import { useGame } from '../context/GameContext';

export default function RoundEnd() {
  const { state } = useGame();
  const sortedScores = [...state.scores].sort((left, right) => right.score - left.score);

  return (
    <div className="overlay">
      <section className="dialog-panel" aria-label="Round results">
        <p className="eyebrow">Round complete</p>
        <h2>{state.currentWord}</h2>

        <div className="result-list">
          {sortedScores.map((score, index) => (
            <div className="result-row" key={score.socketId}>
              <span>#{index + 1}</span>
              <strong>{score.name}</strong>
              <span>{score.score} pts</span>
            </div>
          ))}
        </div>

        <p className="dialog-note">
          {state.round >= state.totalRounds ? 'Final scores are loading...' : 'Next drawer is loading.'}
        </p>
      </section>
    </div>
  );
}
