import { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';

export default function Lobby() {
  const { socket, socketId, connected } = useSocket();
  const { state } = useGame();
  const [copied, setCopied] = useState(false);

  const currentPlayer = state.players.find((player) => player.socketId === socketId);
  const inviteLink = `${window.location.origin}?room=${state.roomId}`;

  const handleStart = () => {
    socket.emit('start_game', { roomId: state.roomId });
  };

  const handleReady = () => {
    socket.emit('set_ready', {
      roomId: state.roomId,
      ready: !currentPlayer?.isReady,
    });
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className="lobby-screen">
      <section className="lobby-panel">
        <div className="lobby-topline">
          <div>
            <p className="eyebrow">{state.settings.isPrivate ? 'Private room' : 'Open room'}</p>
            <h1>Lobby {state.roomId}</h1>
          </div>
          <button className="secondary-action" type="button" onClick={copyLink}>
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        </div>

        {state.notice && (
          <div className={`notice ${state.notice.tone || 'info'}`} role="alert">
            {state.notice.text}
          </div>
        )}

        <dl className="settings-strip">
          <div>
            <dt>Draw</dt>
            <dd>{state.settings.drawTime}s</dd>
          </div>
          <div>
            <dt>Rounds</dt>
            <dd>{state.settings.rounds}</dd>
          </div>
          <div>
            <dt>Players</dt>
            <dd>
              {state.players.length}/{state.settings.maxPlayers}
            </dd>
          </div>
          <div>
            <dt>Hints</dt>
            <dd>{state.settings.hints}</dd>
          </div>
          <div>
            <dt>Words</dt>
            <dd>{state.settings.wordCount}</dd>
          </div>
        </dl>

        <div className="player-list" aria-label="Players in lobby">
          {state.players.map((player) => (
            <div className="player-row" key={player.socketId}>
              <div className="avatar-chip">{player.name.slice(0, 2).toUpperCase()}</div>
              <div className="player-meta">
                <strong>{player.name}</strong>
                <span>{player.socketId === state.hostSocketId ? 'Host' : 'Player'}</span>
              </div>
              <span className={`ready-pill ${player.isReady ? 'ready' : ''}`}>
                {player.isReady ? 'Ready' : 'Waiting'}
              </span>
            </div>
          ))}
        </div>

        <div className="lobby-actions">
          {state.isHost ? (
            <button
              className="primary-action"
              type="button"
              onClick={handleStart}
              disabled={!connected || state.players.length < 2}
            >
              Start Game
            </button>
          ) : (
            <button className="primary-action" type="button" onClick={handleReady} disabled={!connected}>
              {currentPlayer?.isReady ? 'Not Ready' : 'Ready Up'}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
