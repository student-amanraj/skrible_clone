import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';

export default function Chat() {
  const { socket, socketId } = useSocket();
  const { state } = useGame();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const isDrawer = state.drawerId === socketId;
  const canGuess = state.gamePhase === 'drawing' && !isDrawer;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !socket) return;

    setInput('');
    socket.emit(canGuess ? 'guess' : 'chat', { roomId: state.roomId, text });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') handleSend();
  };

  return (
    <section className="chat-panel" aria-label="Chat and guesses">
      <div className="panel-title">
        <span>{canGuess ? 'Guesses' : 'Chat'}</span>
        <small>{state.messages.length}</small>
      </div>

      <div className="message-list">
        {state.messages.length === 0 && (
          <div className="empty-message">Messages will appear here.</div>
        )}

        {state.messages.map((message, index) => (
          <div
            className={`message ${message.type === 'system' ? 'system' : ''} ${
              message.isGuess ? 'guess' : ''
            }`}
            key={`${message.socketId || 'system'}-${index}`}
          >
            {message.type === 'system' ? (
              <span>{message.text}</span>
            ) : (
              <>
                <strong>{message.playerName}</strong>
                <span>{message.text}</span>
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={canGuess ? 'Type a guess' : 'Send a message'}
          maxLength={100}
        />
        <button type="button" onClick={handleSend} disabled={!input.trim()}>
          Send
        </button>
      </div>
    </section>
  );
}
