import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';

export function useCanvas(roomId, isDrawer) {
  const canvasRef = useRef(null);
  const { socket } = useSocket();
  const drawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#141414');
  const [size, setSize] = useState(6);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  }, []);

  const getCanvasPos = useCallback((event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const point = event.touches ? event.touches[0] : event;

    return {
      x: (point.clientX - rect.left) * scaleX,
      y: (point.clientY - rect.top) * scaleY,
    };
  }, []);

  const drawSegment = useCallback((ctx, from, to, strokeColor, strokeSize, strokeTool) => {
    ctx.globalCompositeOperation = strokeTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const clearLocalCanvas = useCallback(() => {
    const ctx = getCtx();
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [getCtx]);

  const handlePointerDown = useCallback(
    (event) => {
      if (!isDrawer || !socket || !roomId) return;
      event.preventDefault();

      drawing.current = true;
      const pos = getCanvasPos(event);
      lastPos.current = pos;

      socket.emit('draw_start', {
        roomId,
        x: pos.x,
        y: pos.y,
        color,
        size,
        tool,
      });
    },
    [isDrawer, socket, roomId, getCanvasPos, color, size, tool]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!isDrawer || !drawing.current || !socket || !roomId) return;
      event.preventDefault();

      const pos = getCanvasPos(event);
      const ctx = getCtx();
      if (!ctx) return;

      drawSegment(ctx, lastPos.current, pos, color, size, tool);
      socket.emit('draw_move', { roomId, x: pos.x, y: pos.y });
      lastPos.current = pos;
    },
    [isDrawer, socket, roomId, getCanvasPos, getCtx, drawSegment, color, size, tool]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawer || !drawing.current || !socket || !roomId) return;
    drawing.current = false;
    socket.emit('draw_end', { roomId });
  }, [isDrawer, socket, roomId]);

  const clearCanvas = useCallback(() => {
    if (!socket || !roomId) return;
    clearLocalCanvas();
    socket.emit('canvas_clear', { roomId });
  }, [socket, roomId, clearLocalCanvas]);

  const undo = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit('draw_undo', { roomId });
  }, [socket, roomId]);

  const replay = useCallback(
    (strokes) => {
      const ctx = getCtx();
      if (!ctx || !canvasRef.current) return;

      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      let replayStart = { x: 0, y: 0 };
      let replayColor = '#141414';
      let replaySize = 6;
      let replayTool = 'pen';

      strokes.forEach((stroke) => {
        if (stroke.type === 'clear') {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          return;
        }

        if (stroke.type === 'start') {
          replayStart = { x: stroke.x, y: stroke.y };
          replayColor = stroke.color || '#141414';
          replaySize = stroke.size || 6;
          replayTool = stroke.tool || 'pen';
          return;
        }

        if (stroke.type === 'move') {
          const nextPos = { x: stroke.x, y: stroke.y };
          drawSegment(ctx, replayStart, nextPos, replayColor, replaySize, replayTool);
          replayStart = nextPos;
        }
      });
    },
    [getCtx, drawSegment]
  );

  useEffect(() => {
    if (!socket) return;

    let remoteStart = { x: 0, y: 0 };
    let remoteColor = '#141414';
    let remoteSize = 6;
    let remoteTool = 'pen';

    const onDrawData = (data) => {
      const ctx = getCtx();
      if (!ctx) return;

      if (data.type === 'clear') {
        clearLocalCanvas();
        return;
      }

      if (data.type === 'start') {
        remoteStart = { x: data.x, y: data.y };
        remoteColor = data.color || '#141414';
        remoteSize = data.size || 6;
        remoteTool = data.tool || 'pen';
        return;
      }

      if (data.type === 'move') {
        const newPos = { x: data.x, y: data.y };
        drawSegment(ctx, remoteStart, newPos, remoteColor, remoteSize, remoteTool);
        remoteStart = newPos;
      }
    };

    const onDrawUndo = ({ strokeHistory }) => replay(strokeHistory);
    const onCanvasReplay = ({ strokes }) => replay(strokes);

    socket.on('draw_data', onDrawData);
    socket.on('draw_undo', onDrawUndo);
    socket.on('canvas_replay', onCanvasReplay);

    return () => {
      socket.off('draw_data', onDrawData);
      socket.off('draw_undo', onDrawUndo);
      socket.off('canvas_replay', onCanvasReplay);
    };
  }, [socket, getCtx, drawSegment, clearLocalCanvas, replay]);

  return {
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
  };
}
