import type { Server as HttpServer } from "node:http";
import type { Server as SocketServer } from "socket.io";
import type {
  SessionConfig,
  Character,
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  CombatState,
} from "@wilmak/shared";

export type Io = SocketServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export const state = {
  config: {
    sessionName: "",
    port: 4317,
    players: [],
    playerWebDir: null,
  } as SessionConfig,
  io: undefined as Io | undefined,
  httpServer: undefined as HttpServer | undefined,
  connected: new Map<string, { nickname: string }>(),
  characters: new Map<string, Character>(),
  playerTokens: new Map<string, string>(), // token → nickname
  combat: null as CombatState | null,
};
