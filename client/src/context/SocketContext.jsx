import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    const nextSocket = io(SERVER_URL, { autoConnect: true });
    socketRef.current = nextSocket;
    setSocket(nextSocket);

    nextSocket.on('connect', () => setConnected(true));
    nextSocket.on('disconnect', () => setConnected(false));

    return () => {
      nextSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, socketId: socket?.id || null }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
