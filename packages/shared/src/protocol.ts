export interface PlayerCredential {
  nickname: string;
  code: string;
}

export function normalizeNickname(nickname: string): string {
  return nickname.trim().toLowerCase().replace(/\s/g, "");
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

export type CharacterType = "player" | "enemy";

export type EnemyKind = "npc" | "monster";

export interface MonsterProfile {
  catalogId: string;
  monsterType: string;
  threat?: string;
  bounty?: number;
  naturalArmor?: number;
  height?: string;
  weight?: string;
  environment?: string;
  intelligence?: string;
  organization?: string;
  abilities?: string;
  vulnerabilities?: string;
  loot?: string;
  vigor?: number;
  encumbrance?: number;
}

export interface Vital {
  current: number;
  max: number;
}

export interface Vitals {
  hp: Vital;
  sta: Vital;
  /** Derived from max HP — when current HP is below this, halve REF/DEX/INT/WILL (rulebook p.156). */
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
  /** Bestiary rate of fire — attacks per action when using this weapon. */
  rateOfFire?: number;
}

export interface ArmorPiece {
  slot: string;
  name: string;
  sp: number;
  damage: number;
  effects: string;
  weight: number;
  /** Encumbrance value — penalizes REF, DEX, Spell Casting. */
  ev?: number;
  catalogId?: string;
}

export interface Spell {
  id: string;
  category: string;
  name: string;
  staCost: number;
  staCostText?: string;
  range: string;
  duration: string;
  effect: string;
  defense?: string;
  catalogId?: string;
  element?: "mixed" | "earth" | "air" | "fire" | "water";
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

export interface CharacterCreationMeta {
  /** One-time stat/skill setup finished — stats locked unless DM uses manual edit. */
  complete: boolean;
  /** Campaign stat point-buy total (60–80). */
  pointBuy: number;
  /** Experience level tracked by the GM. */
  level: number;
}

/** DM → player: roll this skill and report the d10 result. */
export interface SkillCheckRequest {
  id: string;
  characterId: string;
  characterName: string;
  attrKey: string;
  skillKey: string;
  skillLabel: string;
  base: number;
  modifier: number;
  dc?: number;
  notes?: string;
  createdAt: number;
}

/** Resolved skill check broadcast to the table. */
export interface SkillCheckResolved {
  requestId: string;
  characterId: string;
  characterName: string;
  skillLabel: string;
  base: number;
  modifier: number;
  dc?: number;
  dieRolls: number[];
  outcome: "normal" | "critical" | "fumble";
  effectiveBase: number;
  fumblePenalty: number;
  total: number;
  /** `null` when no DC was set. */
  success: boolean | null;
  simulated: boolean;
  resolvedAt: number;
}

/** DM → player: roll Spell Casting for this magic. */
export interface MagicCastRequest {
  id: string;
  characterId: string;
  characterName: string;
  spellId: string;
  spellName: string;
  spellCategory: string;
  element: string;
  staCost: number;
  staCostText?: string;
  base: number;
  vigorThreshold: number;
  modifier: number;
  dc?: number;
  notes?: string;
  createdAt: number;
}

/** Resolved magic cast — roll, costs, fumble effects, vitals delta. */
export interface MagicCastResolved {
  requestId: string;
  characterId: string;
  characterName: string;
  spellId: string;
  spellName: string;
  spellCategory: string;
  element: string;
  base: number;
  modifier: number;
  dc?: number;
  dieRolls: number[];
  fumbleSecondRoll?: number;
  outcome: "normal" | "critical" | "fumble";
  effectiveBase: number;
  fumblePenalty: number;
  total: number;
  success: boolean | null;
  simulated: boolean;
  staCost: number;
  vigorThreshold: number;
  overexertionHp: number;
  fumble?: {
    tier: string;
    element: string;
    fumbleMargin: number;
    spellSucceeds: boolean;
    selfDamage: number;
    stunned: boolean;
    knockedBackMeters: number;
    onFire: boolean;
    frozen: boolean;
    focusExplodes: boolean;
    requiresRandomElementalRider: boolean;
  };
  spellSucceeds: boolean;
  hpBefore: number;
  hpAfter: number;
  staBefore: number;
  staAfter: number;
  stunnedFromSta: boolean;
  statusEffectsAdded: string[];
  resolvedAt: number;
}

export interface CombatParticipant {
  characterId: string;
  name: string;
  type: CharacterType;
  ref: number;
  /** Total d10 contribution (1–10 for initiative; can exceed 10 on open-ended skill checks). */
  dieRoll: number;
  initiative: number;
  /** Individual d10 results when open-ended chains apply (skill checks only). */
  dieRolls?: number[];
  /** Whether this participant has used their main action this round. */
  actionUsed?: boolean;
  /** STA spent on extra attacks / extra defenses this round. */
  staSpentThisRound?: number;
  /** Number of defensive actions taken beyond the first (each costs 1 STA after the first). */
  defensesThisRound?: number;
}

export type HitLocation =
  | "head"
  | "torso"
  | "rArm"
  | "lArm"
  | "rLeg"
  | "lLeg"
  | "special";

export type DamageType = "piercing" | "slashing" | "bludgeoning" | "elemental";

export type CombatAttackType = "normal" | "fast" | "strong" | "extra";

export type CombatDefenseType = "dodge" | "reposition" | "block" | "parry" | "none";

export type CritWoundTier = "none" | "simple" | "complex" | "difficult" | "deadly";

export interface CombatAttackWeapon {
  id?: string;
  name: string;
  dmg?: string;
  /** Weapon damage type from catalog (e.g. S/P, B). */
  damageType?: string;
  wa: number;
  isRanged: boolean;
  isThrown?: boolean;
  isUnarmed?: boolean;
  unarmedKind?: "punch" | "kick";
  /** Bestiary rate of fire — attacks per action. */
  rateOfFire?: number;
  effect?: string;
}

export interface CombatRollBreakdown {
  outcome: "normal" | "critical" | "fumble";
  rolls: number[];
  /** Stat + skill before fumble penalty. */
  statSkillBase: number;
  /** After fumble adjustment, before die. */
  effectiveBase: number;
  /** @deprecated Use statSkillBase — kept for log compatibility. */
  base: number;
  modifier: number;
  total: number;
}

export interface CombatAttackModifier {
  label: string;
  value: number;
}

export interface CombatAttackResult {
  id: string;
  round: number;
  /** 1-based index within a fast-strike action. */
  attackIndex?: number;
  attackerId: string;
  attackerName: string;
  targetId: string;
  targetName: string;
  attackType: CombatAttackType;
  weapon: CombatAttackWeapon;
  defenseType: CombatDefenseType;
  modifiers: CombatAttackModifier[];
  attackRoll: CombatRollBreakdown;
  defenseRoll?: CombatRollBreakdown;
  /** Used when defense is none (stunned/unaware/inanimate). */
  defenseDc?: number;
  hit: boolean;
  margin: number;
  critWoundTier: CritWoundTier;
  /** Damage resolution (present when hit and damage was rolled). */
  hitLocation?: HitLocation;
  locationRoll?: number;
  locationMultiplier?: number;
  damageExpression?: string;
  damageRolls?: number[];
  damageDiceSum?: number;
  damageModifier?: number;
  rawDamage?: number;
  strongStrikeMultiplier?: number;
  damageAfterResistance?: number;
  damageAfterArmor?: number;
  critWoundDamageBonus?: number;
  finalDamage?: number;
  armorSlot?: string;
  armorSpBefore?: number;
  armorSpAfter?: number;
  armorAblation?: number;
  criticalWoundRoll?: number;
  criticalWoundEffect?: string;
  stunSaveDc?: number;
  staCost?: number;
  hpBefore?: number;
  hpAfter?: number;
  damageApplied?: boolean;
  notes?: string;
  timestamp: string;
}

export interface CombatState {
  active: boolean;
  round: number;
  participants: CombatParticipant[];
  /** Index into `participants` for whose turn it is. */
  currentTurnIndex: number;
  attackLog: CombatAttackResult[];
}

export interface Character {
  id: string;
  type: CharacterType;
  name: string;
  race?: string;
  occupation?: string;
  nickname?: string;
  creation?: CharacterCreationMeta;
  /** Level of the profession defining skill (name/stat come from rulebook by occupation). */
  definingSkillLevel?: number;
  /** Profession skill tree ability levels keyed by ability id (e.g. "Bard:core", "Bard:0:t1"). */
  professionTree?: Record<string, number>;
  /** Set when created from the bestiary catalog or a custom NPC enemy. */
  enemyKind?: EnemyKind;
  /** Rulebook bestiary entry id (e.g. drowners, bandits). */
  bestiaryId?: string;
  monsterProfile?: MonsterProfile;
  attributes: Record<string, number>;
  skills: Record<string, Record<string, SkillEntry>>;
  vitals: Vitals;
  luck?: { max: number; used: number };
  speed?: number;
  movement?: { run: number; leap: number };
  recovery?: { stun: number; rec: number };
  improvementPoints?: { ip: number; trainingIp: number };
  weapons?: Weapon[];
  armor?: ArmorPiece[];
  armorNotes?: string;
  bonusMelee?: { punch: string; kick: string };
  consumables?: ConsumableItem[];
  spells?: Spell[];
  /** @deprecated Migrated to definingSkillLevel — kept for legacy saves. */
  professionAbilities?: ProfessionAbility[];
  wounds?: Wound[];
  statusEffects?: StatusEffect[];
}

// ─── IPC ──────────────────────────────────────────────────────────────────

/** Electron main -> server (utilityProcess parentPort). */
export type HostToServer =
  | { type: "start"; config: SessionConfig }
  | { type: "gm:kick"; socketId: string }
  | { type: "gm:broadcast"; payload: unknown }
  | { type: "stop" }
  | { type: "characters:getAll"; requestId: string }
  | { type: "characters:get"; requestId: string; id: string }
  | { type: "characters:create"; requestId: string; data: Partial<Character> }
  | { type: "characters:update"; requestId: string; id: string; character: Character }
  | { type: "characters:unassign"; requestId: string; id: string }
  | { type: "characters:delete"; requestId: string; id: string }
  | { type: "credentials:getAll"; requestId: string }
  | { type: "credentials:add"; requestId: string; nickname: string; code?: string }
  | { type: "credentials:remove"; requestId: string; nickname: string }
  | { type: "combat:get"; requestId: string }
  | { type: "combat:set"; requestId: string; combat: CombatState | null }
  | { type: "skill-check:request"; requestId: string; data: SkillCheckRequest }
  | { type: "skill-check:resolve"; requestId: string; data: SkillCheckResolved }
  | {
      type: "skill-check:cancel";
      requestId: string;
      characterId: string;
      skillCheckId: string;
    }
  | { type: "magic-cast:request"; requestId: string; data: MagicCastRequest }
  | { type: "magic-cast:resolve"; requestId: string; data: MagicCastResolved }
  | {
      type: "magic-cast:cancel";
      requestId: string;
      characterId: string;
      magicCastId: string;
    };

/** server -> Electron main. */
export type ServerToHost =
  | { type: "ready"; port: number; urls: string[] }
  | { type: "players"; players: Player[] }
  | { type: "credentials"; credentials: PlayerCredential[] }
  | { type: "error"; message: string }
  | { type: "characters:result"; requestId: string; data: unknown }
  | { type: "characters:error"; requestId: string; message: string }
  | { type: "characters:changed" }
  | { type: "character:updated"; character: Character }
  | { type: "combat:updated"; combat: CombatState | null }
  | { type: "skill-check:requested"; request: SkillCheckRequest }
  | { type: "skill-check:resolved"; result: SkillCheckResolved }
  | { type: "magic-cast:requested"; request: MagicCastRequest }
  | { type: "magic-cast:resolved"; result: MagicCastResolved };

// ─── Socket.IO ────────────────────────────────────────────────────────────

/** Socket.io: server -> client. */
export interface ServerToClientEvents {
  "players:update": (players: Player[]) => void;
  "game:event": (event: GameEvent) => void;
  "character-updated": (character: Character) => void;
  "character:unassigned": (characterId: string) => void;
  "characters-changed": () => void;
  "combat:update": (combat: CombatState | null) => void;
  "skill-check:request": (request: SkillCheckRequest) => void;
  "skill-check:resolved": (result: SkillCheckResolved) => void;
  "skill-check:cancel": (requestId: string) => void;
  "magic-cast:request": (request: MagicCastRequest) => void;
  "magic-cast:resolved": (result: MagicCastResolved) => void;
  "magic-cast:cancel": (requestId: string) => void;
}

/** Socket.io: client -> server. */
export interface ClientToServerEvents {
  join: (data: PlayerCredential, ack: (res: JoinAck) => void) => void;
  resume: (data: { token: string }, ack: (res: ResumeAck) => void) => void;
  "player:action": (payload: unknown) => void;
  "join-character": (data: { characterId: string; isDM?: boolean }) => void;
  "update-character": (data: { characterId: string; character: Character }) => void;
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
  removeCredential(nickname: string): Promise<void>;
  onCredentialsUpdate(cb: (credentials: PlayerCredential[]) => void): () => void;
  characters: {
    getAll(): Promise<Character[]>;
    get(id: string): Promise<Character>;
    create(data: Partial<Character>): Promise<Character>;
    update(id: string, character: Character): Promise<Character>;
    unassign(id: string): Promise<Character>;
    delete(id: string): Promise<void>;
  };
  onCharactersChanged(cb: () => void): () => void;
  onCharacterUpdated(cb: (character: Character) => void): () => void;
  getCombat(): Promise<CombatState | null>;
  setCombat(combat: CombatState | null): Promise<CombatState | null>;
  onCombatUpdate(cb: (combat: CombatState | null) => void): () => void;
  requestSkillCheck(request: SkillCheckRequest): Promise<SkillCheckRequest>;
  resolveSkillCheck(result: SkillCheckResolved): Promise<SkillCheckResolved>;
  cancelSkillCheck(characterId: string, skillCheckId: string): Promise<void>;
  onSkillCheckRequest(cb: (request: SkillCheckRequest) => void): () => void;
  onSkillCheckResolved(cb: (result: SkillCheckResolved) => void): () => void;
  requestMagicCast(request: MagicCastRequest): Promise<MagicCastRequest>;
  resolveMagicCast(result: MagicCastResolved): Promise<MagicCastResolved>;
  cancelMagicCast(characterId: string, magicCastId: string): Promise<void>;
  onMagicCastRequest(cb: (request: MagicCastRequest) => void): () => void;
  onMagicCastResolved(cb: (result: MagicCastResolved) => void): () => void;
}
