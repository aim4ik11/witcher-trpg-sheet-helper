import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@wilmak/shared';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
let currentPort: number | null = null;

export function getSocket(port: number): AppSocket {
  if (!socket || currentPort !== port) {
    socket?.disconnect();
    socket = io(`http://localhost:${port}`, { autoConnect: true, reconnection: true });
    currentPort = port;
  }
  return socket;
}

export function useSocket(port: number | undefined): AppSocket | null {
  const ref = useRef<AppSocket | null>(null);

  useEffect(() => {
    if (!port) return;
    ref.current = getSocket(port);
    return () => {
      // keep socket alive across renders; disconnect handled by server lifecycle
    };
  }, [port]);

  return port ? (ref.current ?? getSocket(port)) : null;
}
