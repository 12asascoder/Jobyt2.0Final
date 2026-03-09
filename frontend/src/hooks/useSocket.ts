'use client';

import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';

export const useSocket = () => {
  const { isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    socketRef.current = connectSocket();
    return () => { disconnectSocket(); };
  }, [isAuthenticated]);

  return socketRef.current;
};
