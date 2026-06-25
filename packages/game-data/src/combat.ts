import type { Character, CombatParticipant, CombatState } from "@wilmak/shared";
import { type DiceRng, defaultRng, rollDie } from "./dice";

export interface InitiativeRoll {
  ref: number;
  dieRoll: number;
  initiative: number;
}

/**
 * Initiative = REF + 1d10 (`curated/combat.md`, `sections/151-combat-basics.md`).
 *
 * Plain single d10 — open-ended crit/fumble chains apply to skill checks (attacks,
 * dodges, etc.), not initiative rolls.
 */
export function resolveInitiative(ref: number, dieRoll: number): InitiativeRoll {
  if (!Number.isInteger(dieRoll) || dieRoll < 1 || dieRoll > 10) {
    throw new RangeError(`resolveInitiative: dieRoll must be 1–10, got ${dieRoll}`);
  }
  return { ref, dieRoll, initiative: ref + dieRoll };
}

export function rollInitiativeRoll(ref: number, rng: DiceRng = defaultRng): InitiativeRoll {
  return resolveInitiative(ref, rollDie(10, rng));
}

export function characterRef(character: Character): number {
  return character.attributes?.ref ?? 0;
}

export function buildCombatParticipant(
  character: Character,
  dieRoll: number,
): CombatParticipant {
  const ref = characterRef(character);
  const roll = resolveInitiative(ref, dieRoll);
  return {
    characterId: character.id,
    name: character.name,
    type: character.type,
    ref: roll.ref,
    dieRoll: roll.dieRoll,
    initiative: roll.initiative,
  };
}

/** Higher initiative first; ties broken by higher die roll. */
export function sortCombatParticipants(
  participants: CombatParticipant[],
): CombatParticipant[] {
  return [...participants].sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    return b.dieRoll - a.dieRoll;
  });
}

export function createCombatState(participants: CombatParticipant[]): CombatState {
  return normalizeCombatState({
    active: true,
    round: 1,
    participants: sortCombatParticipants(participants),
    currentTurnIndex: 0,
    attackLog: [],
  });
}

/**
 * Add newcomers during an active fight. They act after everyone already in combat,
 * regardless of their rolled initiative (reinforcements / late joiners).
 */
export function addParticipantsToCombat(
  combat: CombatState,
  newcomers: CombatParticipant[],
): CombatState {
  const state = normalizeCombatState(combat);
  const existingIds = new Set(combat.participants.map((p) => p.characterId));
  const toAdd = newcomers.filter((p) => !existingIds.has(p.characterId));
  if (toAdd.length === 0) return state;
  return {
    ...state,
    participants: [...state.participants, ...toAdd],
  };
}

export function normalizeCombatState(combat: CombatState): CombatState {
  return {
    ...combat,
    currentTurnIndex: combat.currentTurnIndex ?? 0,
    attackLog: combat.attackLog ?? [],
  };
}

export function formatDieRolls(participant: CombatParticipant): string {
  if (participant.dieRolls && participant.dieRolls.length > 1) {
    return participant.dieRolls.join("+");
  }
  return String(participant.dieRoll);
}
