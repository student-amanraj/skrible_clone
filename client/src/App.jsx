import { SocketProvider } from './context/SocketContext';
import { GameProvider, useGame } from './context/GameContext';
import Home from './pages/Home';
import Lobby from './components/Lobby';
import Game from './pages/Game';
import GameOver from './components/GameOver';
import { useGameSocket } from './hooks/useGameSocket';

function AppRouter() {
  useGameSocket();

  const { state } = useGame();

  switch (state.gamePhase) {
    case 'home':
      return <Home />;
    case 'lobby':
      return <Lobby />;
    case 'word_selection':
    case 'drawing':
    case 'round_end':
      return <Game />;
    case 'game_over':
      return <GameOver />;
    default:
      return <Home />;
  }
}

export default function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <AppRouter />
      </GameProvider>
    </SocketProvider>
  );
}
