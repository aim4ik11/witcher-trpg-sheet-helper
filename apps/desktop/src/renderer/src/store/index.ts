import { create } from "zustand";
import type {
  SessionConfig,
  ServerInfo,
  Player,
  PlayerCredential,
} from "@wilmak/shared";

interface AppState {
  config: SessionConfig | null;
  server: ServerInfo | null;
  players: Player[];
  credentials: PlayerCredential[];
  setConfig: (config: SessionConfig | null) => void;
  setServer: (server: ServerInfo | null) => void;
  setPlayers: (players: Player[]) => void;
  setCredentials: (credentials: PlayerCredential[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  config: null,
  server: null,
  players: [],
  credentials: [],
  setConfig: (config) => set({ config }),
  setServer: (server) => set({ server }),
  setPlayers: (players) => set({ players }),
  setCredentials: (credentials) => set({ credentials }),
}));
