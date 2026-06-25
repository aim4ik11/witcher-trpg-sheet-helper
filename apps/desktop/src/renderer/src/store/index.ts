import { create } from "zustand";
import type {
  SessionConfig,
  ServerInfo,
  Player,
  PlayerCredential,
  CombatState,
} from "@wilmak/shared";

interface AppState {
  config: SessionConfig | null;
  server: ServerInfo | null;
  players: Player[];
  credentials: PlayerCredential[];
  combat: CombatState | null;
  setConfig: (config: SessionConfig | null) => void;
  setServer: (server: ServerInfo | null) => void;
  setPlayers: (players: Player[]) => void;
  setCredentials: (credentials: PlayerCredential[]) => void;
  setCombat: (combat: CombatState | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  config: null,
  server: null,
  players: [],
  credentials: [],
  combat: null,
  setConfig: (config) => set({ config }),
  setServer: (server) => set({ server }),
  setPlayers: (players) => set({ players }),
  setCredentials: (credentials) => set({ credentials }),
  setCombat: (combat) => set({ combat }),
}));
