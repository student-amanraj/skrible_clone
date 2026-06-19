import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';

export default function WordSelection({ wordOptions }) {
  const { socket } = useSocket();
  const { state } = useGame();

  const chooseWord = (word) => {
    socket.emit('word_chosen', { roomId: state.roomId, word });
  };

  return (
    <div className="overlay">
      <section className="dialog-panel" aria-label="Choose a word">
        <p className="eyebrow">Your turn</p>
        <h2>Choose a word</h2>
        <div className="word-options">
          {wordOptions.map((word) => (
            <button className="word-option" key={word} onClick={() => chooseWord(word)} type="button">
              {word}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
