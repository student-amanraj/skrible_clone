import { useCanvas } from '../hooks/useCanvas';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';

const COLORS = [
  '#141414',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#14b8a6',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#7c2d12',
  '#64748b',
];

const SIZES = [3, 6, 10, 16, 24];

export default function Canvas() {
  const { state } = useGame();
  const { socketId } = useSocket();
  const isDrawer = state.drawerId === socketId;

  const {
    canvasRef,
    tool,
    setTool,
    color,
    setColor,
    size,
    setSize,
    clearCanvas,
    undo,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useCanvas(state.roomId, isDrawer);

  return (
    <div className="canvas-shell">
      <div className="canvas-frame">
        <canvas
          ref={canvasRef}
          width={960}
          height={640}
          className={`drawing-canvas ${isDrawer ? 'active' : ''}`}
          aria-label="Shared drawing canvas"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      {isDrawer && (
        <div className="tool-panel" aria-label="Drawing tools">
          <div className="swatch-row" aria-label="Brush colors">
            {COLORS.map((nextColor) => (
              <button
                aria-label={`Use ${nextColor}`}
                className={`swatch-button ${color === nextColor && tool === 'pen' ? 'selected' : ''}`}
                key={nextColor}
                onClick={() => {
                  setColor(nextColor);
                  setTool('pen');
                }}
                style={{ '--swatch': nextColor }}
                type="button"
              />
            ))}
          </div>

          <div className="size-row" aria-label="Brush size">
            {SIZES.map((nextSize) => (
              <button
                aria-label={`Use ${nextSize}px brush`}
                className={`size-button ${size === nextSize ? 'selected' : ''}`}
                key={nextSize}
                onClick={() => setSize(nextSize)}
                type="button"
              >
                <span style={{ '--dot-size': `${nextSize}px` }} />
              </button>
            ))}
          </div>

          <div className="tool-row">
            <button
              className={`tool-button ${tool === 'pen' ? 'selected' : ''}`}
              onClick={() => setTool('pen')}
              type="button"
            >
              Pen
            </button>
            <button
              className={`tool-button ${tool === 'eraser' ? 'selected' : ''}`}
              onClick={() => setTool('eraser')}
              type="button"
            >
              Eraser
            </button>
            <button className="tool-button" onClick={undo} type="button">
              Undo
            </button>
            <button className="tool-button danger" onClick={clearCanvas} type="button">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
