import { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';

const initialRoomCode = new URLSearchParams(window.location.search)
  .get('room')
  ?.trim()
  .toUpperCase() || '';

export default function Home() {
  const { socket, connected } = useSocket();
  const { state, dispatch } = useGame();

  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState(initialRoomCode);
  const [tab, setTab] = useState(initialRoomCode ? 'join' : 'create');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [rounds, setRounds] = useState(3);
  const [drawTime, setDrawTime] = useState(80);
  const [wordCount, setWordCount] = useState(3);
  const [hints, setHints] = useState(2);
  const [isPrivate, setIsPrivate] = useState(false);

  const cleanName = playerName.trim();
  const canUseSocket = connected && socket;

  const clearNotice = () => dispatch({ type: 'CLEAR_NOTICE' });

  const handleCreate = (event) => {
    event.preventDefault();
    clearNotice();

    if (!cleanName) {
      dispatch({ type: 'SET_NOTICE', payload: { tone: 'error', text: 'Enter your name.' } });
      return;
    }

    dispatch({ type: 'SET_PLAYER_NAME', payload: cleanName });
    socket.emit('create_room', {
      playerName: cleanName,
      settings: { maxPlayers, rounds, drawTime, wordCount, hints, isPrivate },
    });
  };

  const handleJoin = (event) => {
    event.preventDefault();
    clearNotice();

    if (!cleanName) {
      dispatch({ type: 'SET_NOTICE', payload: { tone: 'error', text: 'Enter your name.' } });
      return;
    }
    if (!joinCode.trim()) {
      dispatch({ type: 'SET_NOTICE', payload: { tone: 'error', text: 'Enter a room code.' } });
      return;
    }

    dispatch({ type: 'SET_PLAYER_NAME', payload: cleanName });
    socket.emit('join_room', {
      roomId: joinCode.trim().toUpperCase(),
      playerName: cleanName,
    });
  };

  return (
    <main className="home-screen">
      <section className="brand-panel" aria-label="Game preview">
        <div className="brand-mark">SCRIBBLE ROOM</div>
        <div className="sample-board" aria-hidden="true">
          <span className="sample-stroke stroke-one" />
          <span className="sample-stroke stroke-two" />
          <span className="sample-stroke stroke-three" />
          <span className="sample-dot dot-one" />
          <span className="sample-dot dot-two" />
          <span className="sample-dot dot-three" />
        </div>
        <div className="home-status">
          <span className={connected ? 'status-light online' : 'status-light'} />
          {connected ? 'Server connected' : 'Connecting to server'}
        </div>
      </section>

      <section className="setup-panel" aria-label="Room setup">
        <div className="panel-heading">
          <p className="eyebrow">Multiplayer drawing game</p>
          <h1>Skribbl Clone</h1>
        </div>

        {state.notice && (
          <div className={`notice ${state.notice.tone || 'info'}`} role="alert">
            {state.notice.text}
          </div>
        )}

        <label className="field">
          <span>Your name</span>
          <input
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Player name"
            maxLength={20}
            autoComplete="name"
          />
        </label>

        <div className="segmented-control" role="tablist" aria-label="Room action">
          <button
            className={`tab-button ${tab === 'create' ? 'active' : ''}`}
            type="button"
            onClick={() => setTab('create')}
          >
            Create
          </button>
          <button
            className={`tab-button ${tab === 'join' ? 'active' : ''}`}
            type="button"
            onClick={() => setTab('join')}
          >
            Join
          </button>
        </div>

        {tab === 'create' ? (
          <form className="room-form" onSubmit={handleCreate}>
            <div className="settings-grid">
              <label className="field compact">
                <span>Max players</span>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={maxPlayers}
                  onChange={(event) => setMaxPlayers(Number(event.target.value))}
                />
              </label>
              <label className="field compact">
                <span>Rounds</span>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={rounds}
                  onChange={(event) => setRounds(Number(event.target.value))}
                />
              </label>
              <label className="field compact">
                <span>Draw time</span>
                <input
                  type="number"
                  min="15"
                  max="240"
                  value={drawTime}
                  onChange={(event) => setDrawTime(Number(event.target.value))}
                />
              </label>
              <label className="field compact">
                <span>Word choices</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={wordCount}
                  onChange={(event) => setWordCount(Number(event.target.value))}
                />
              </label>
              <label className="field compact">
                <span>Hints</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={hints}
                  onChange={(event) => setHints(Number(event.target.value))}
                />
              </label>
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(event) => setIsPrivate(event.target.checked)}
                />
                <span>Private room</span>
              </label>
            </div>

            <button className="primary-action" type="submit" disabled={!canUseSocket}>
              Create Room
            </button>
          </form>
        ) : (
          <form className="room-form" onSubmit={handleJoin}>
            <label className="field">
              <span>Room code</span>
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                inputMode="text"
              />
            </label>

            <button className="primary-action" type="submit" disabled={!canUseSocket}>
              Join Room
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
