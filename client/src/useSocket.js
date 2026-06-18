import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
}

/** Shared app-wide socket — do not disconnect on component unmount. */
export function useSocket() {
  return getSocket();
}
