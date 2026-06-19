import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';

export default function GameHeader() {
  const { state } = useGame();
  const { socketId } = useSocket();
  const isDrawer = state.drawerId === socketId;
  const drawerName = state.players.find((player) => player.socketId === state.drawerId)?.name || 'Drawer';
  const timerTone = state.timeLeft <= 10 ? 'danger' : state.timeLeft <= 30 ? 'warn' : 'safe';
  const visibleWord = isDrawer ? state.currentWord : state.wordMask;

  return (
    <header className="game-header">
      <div className="round-block">
        <span>Round</span>
        <strong>
          {state.round}/{state.totalRounds}
        </strong>
      </div>

      <div className="word-block">
        <span>{isDrawer ? 'Your word' : `${drawerName} is drawing`}</span>
        <strong className={!visibleWord ? 'muted-word' : ''}>
          {visibleWord || 'Choosing word'}
        </strong>
      </div>

      <div className={`timer-block ${timerTone}`}>
        <span>Time</span>
        <strong>{state.timeLeft}s</strong>
      </div>
    </header>
  );
}
