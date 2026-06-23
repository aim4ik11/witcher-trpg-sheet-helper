export interface PlayerCredential {
  nickname: string;
  code: string;
}

export function normalizeNickname(nickname: string): string {
  return nickname.trim().toLowerCase().replace(/\s/g, '');
}

export interface SessionConfig {
  sessionName: string;
  port: number;
  players: PlayerCredential[];
  characters?: Character[];
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
  token?: string;
  error?: string;
}

export interface ResumeAck {
  ok: boolean;
  nickname?: string;
  error?: string;
}

// ─── Character model ───────────────────────────────────────────────────────

export type CharacterType = 'player' | 'enemy';

export interface Vital {
  current: number;
  max: number;
}

export interface Vitals {
  hp: Vital;
  sta: Vital;
  resolve: Vital;
  woundThreshold: number;
}

export interface SkillEntry {
  level: number;
}

export interface Weapon {
  id: string;
  name: string;
  type: string;
  wa: number;
  dmg: string;
  rel: string;
  hand: string;
  rng: string;
  effect: string;
  conc: string;
  enhancements: string;
  weight: number;
  catalogId?: string;
}

export interface ArmorPiece {
  slot: string;
  name: string;
  sp: number;
  damage: number;
  effects: string;
  weight: number;
  catalogId?: string;
}

export interface Spell {
  id: string;
  category: string;
  name: string;
  staCost: number;
  range: string;
  duration: string;
  effect: string;
  catalogId?: string;
}

export interface ConsumableItem {
  id: string;
  qty: number;
  name: string;
  effect: string;
  weight: number;
}

export interface ProfessionAbility {
  id: string;
  name: string;
  stat: string;
  level: number;
  base: number;
}

export interface Wound {
  id: string;
  description: string;
  severity: string;
  days: number;
}

export interface StatusEffect {
  id: string;
  description: string;
}

export interface Character {
  id: string;
  type: CharacterType;
  name: string;
  race?: string;
  occupation?: string;
  nickname?: string;
  attributes: Record<string, number>;
  skills: Record<string, Record<string, SkillEntry>>;
  vitals: Vitals;
  luck?: { max: number; used: number };
  speed?: number;
  adrenaline?: number;
  movement?: { run: number; leap: number };
  recovery?: { stun: number; rec: number };
  improvementPoints?: { ip: number; trainingIp: number };
  weapons?: Weapon[];
  armor?: ArmorPiece[];
  armorNotes?: string;
  bonusMelee?: { punch: string; kick: string };
  consumables?: ConsumableItem[];
  spells?: Spell[];
  professionAbilities?: ProfessionAbility[];
  wounds?: Wound[];
  statusEffects?: StatusEffect[];
}

// ─── IPC ──────────────────────────────────────────────────────────────────

/** Electron main -> server (utilityProcess parentPort). */
export type HostToServer =
  | { type: 'start'; config: SessionConfig }
  | { type: 'gm:kick'; socketId: string }
  | { type: 'gm:broadcast'; payload: unknown }
  | { type: 'stop' }
  | { type: 'characters:getAll'; requestId: string }
  | { type: 'characters:get'; requestId: string; id: string }
  | { type: 'characters:create'; requestId: string; data: Partial<Character> }
  | { type: 'characters:update'; requestId: string; id: string; character: Character }
  | { type: 'characters:delete'; requestId: string; id: string }
  | { type: 'credentials:getAll'; requestId: string }
  | { type: 'credentials:add'; requestId: string; nickname: string; code?: string };

/** server -> Electron main. */
export type ServerToHost =
  | { type: 'ready'; port: number; urls: string[] }
  | { type: 'players'; players: Player[] }
  | { type: 'credentials'; credentials: PlayerCredential[] }
  | { type: 'error'; message: string }
  | { type: 'characters:result'; requestId: string; data: unknown }
  | { type: 'characters:error'; requestId: string; message: string }
  | { type: 'characters:changed' }
  | { type: 'character:updated'; character: Character };

// ─── Socket.IO ────────────────────────────────────────────────────────────

/** Socket.io: server -> client. */
export interface ServerToClientEvents {
  'players:update': (players: Player[]) => void;
  'game:event': (event: GameEvent) => void;
  'character-updated': (character: Character) => void;
  'characters-changed': () => void;
}

/** Socket.io: client -> server. */
export interface ClientToServerEvents {
  join: (data: PlayerCredential, ack: (res: JoinAck) => void) => void;
  resume: (data: { token: string }, ack: (res: ResumeAck) => void) => void;
  'player:action': (payload: unknown) => void;
  'join-character': (data: { characterId: string; isDM?: boolean }) => void;
  'update-character': (data: { characterId: string; character: Character }) => void;
}

/** Per-socket data stored server-side. */
export interface SocketData {
  nickname?: string;
  token?: string;
}

/** The preload bridge exposed to the GM renderer as window.api. */
export interface Api {
  loadLastSession(): Promise<SessionConfig | null>;
  saveLastSession(config: SessionConfig): Promise<void>;
  pickConfig(): Promise<SessionConfig | null>;
  startSession(config: SessionConfig): Promise<ServerInfo>;
  stopSession(): Promise<void>;
  kickPlayer(socketId: string): Promise<void>;
  broadcast(payload: unknown): Promise<void>;
  onPlayersUpdate(cb: (players: Player[]) => void): () => void;
  getCredentials(): Promise<PlayerCredential[]>;
  addCredential(nickname: string, code?: string): Promise<PlayerCredential>;
  onCredentialsUpdate(cb: (credentials: PlayerCredential[]) => void): () => void;
  characters: {
    getAll(): Promise<Character[]>;
    get(id: string): Promise<Character>;
    create(data: Partial<Character>): Promise<Character>;
    update(id: string, character: Character): Promise<Character>;
    delete(id: string): Promise<void>;
  };
  onCharactersChanged(cb: () => void): () => void;
  onCharacterUpdated(cb: (character: Character) => void): () => void;
}
