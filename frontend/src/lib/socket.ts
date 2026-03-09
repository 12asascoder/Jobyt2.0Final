import { io, Socket } from 'socket.io-client';
import { API_BASE } from '@/constants';
import { authStorage } from './auth';

let socket: Socket | null = null;

const SERVER_URL = API_BASE.replace('/api/v1', '');

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  const token = authStorage.getAccessToken();
  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('[Socket] Connected'));
  socket.on('disconnect', () => console.log('[Socket] Disconnected'));
  socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;

export const joinConversation = (conversationId: string) => {
  socket?.emit('join_conversation', conversationId);
};

export const leaveConversation = (conversationId: string) => {
  socket?.emit('leave_conversation', conversationId);
};
