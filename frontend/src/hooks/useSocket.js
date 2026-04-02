import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socketInstance = null;

export const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    if (!socketInstance) {
      socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });
    }

    socketRef.current = socketInstance;

    return () => {
      // Don't disconnect on component unmount — keep persistent connection
    };
  }, [isAuthenticated, accessToken]);

  const joinTeam = useCallback((teamId) => {
    socketRef.current?.emit('join:team', teamId);
  }, []);

  const leaveTeam = useCallback((teamId) => {
    socketRef.current?.emit('leave:team', teamId);
  }, []);

  const emitTyping = useCallback((taskId, teamId) => {
    socketRef.current?.emit('typing:start', { taskId, teamId });
  }, []);

  const emitStopTyping = useCallback((taskId, teamId) => {
    socketRef.current?.emit('typing:stop', { taskId, teamId });
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  return { socket: socketRef.current, joinTeam, leaveTeam, emitTyping, emitStopTyping, on, off };
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
