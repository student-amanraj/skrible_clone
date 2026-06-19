import Canvas from '../components/Canvas';
import Chat from '../components/Chat';
import Scoreboard from '../components/Scoreboard';
import GameHeader from '../components/GameHeader';
import WordSelection from '../components/WordSelection';
import RoundEnd from '../components/RoundEnd';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';

export default function Game() {
  const { state } = useGame();
  const { socketId } = useSocket();
  const isDrawer = state.drawerId === socketId;

  return (
    <main className="game-screen">
      {state.gamePhase === 'word_selection' && isDrawer && (
        <WordSelection wordOptions={state.wordOptions || []} />
      )}

      {state.gamePhase === 'round_end' && <RoundEnd />}

      <div className="game-layout">
        <aside className="score-column">
          <Scoreboard />
        </aside>

        <section className="canvas-column" aria-label="Drawing area">
          <GameHeader />
          <Canvas />
        </section>

        <aside className="chat-column">
          <Chat />
        </aside>
      </div>
    </main>
  );
}
