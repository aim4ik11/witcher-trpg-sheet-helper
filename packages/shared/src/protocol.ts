export interface PlayerCredential {
  nickname: string;
  code: string;
}

export interface SessionConfig {
  sessionName: string;
  port: number;
  players: PlayerCredential[];
  playerWebDir?: string | null;
}

export interface Player {
  socketId: string;
  nickname: string;
}

export interface ServerInfo {
  urls: string[];
  port: number;
}

export interface GameEvent {
  from: string;
  payload: unknown;
}

export interface JoinAck {
  ok: boolean;
  nickname?: string;
  error?: string;
}

/** Electron main -> server (utilityProcess parentPort). */
export type HostToServer =
  | { type: 'start'; config: SessionConfig }
  | { type: 'gm:kick'; socketId: string }
  | { type: 'gm:broadcast'; payload: unknown }
  | { type: 'stop' };

/** server -> Electron main. */
export type ServerToHost =
  | { type: 'ready'; port: number; urls: string[] }
  | { type: 'players'; players: Player[] }
  | { type: 'error'; message: string };

/** Socket.io: server -> client (player). */
export interface ServerToClientEvents {
  'players:update': (players: Player[]) => void;
  'game:event': (event: GameEvent) => void;
}

/** Socket.io: client (player) -> server. */
export interface ClientToServerEvents {
  join: (data: PlayerCredential, ack: (res: JoinAck) => void) => void;
  'player:action': (payload: unknown) => void;
}

/** Per-socket data stored server-side. */
export interface SocketData {
  nickname?: string;
}

/** The preload bridge exposed to the GM renderer as window.api. */
export interface Api {
  pickConfig(): Promise<SessionConfig | null>;
  startSession(config: SessionConfig): Promise<ServerInfo>;
  kickPlayer(socketId: string): Promise<void>;
  broadcast(payload: unknown): Promise<void>;
  onPlayersUpdate(cb: (players: Player[]) => void): () => void;
}
