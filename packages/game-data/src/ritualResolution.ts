/**
 * Rulebook §166 p.168, §116 — Ritual crafting, interruption, group helpers.
 */

import { ritualFumbleHpDamage } from "./magicResolution";

export type RitualInterruptionKind =
  | "shaken_bumped_yelled"
  | "physically_harmed"
  | "removed_from_area";

export interface RitualDefinition {
  id: string;
  name: string;
  preparationRounds: number;
  dc: number;
  staCost: number;
  components: string[];
}

export interface RitualCraftInput {
  ritual: RitualDefinition;
  ritualCraftingTotal: number;
  vigorSpent: number;
  helpers?: number;
  dieRolls?: number[];
  fumbleSecondRoll?: number;
}

export interface RitualCraftResult {
  success: boolean;
  fumble: boolean;
  componentsConsumed: boolean;
  ritualEffect: boolean;
  fumbleHpDamage: number;
  effectiveDc: number;
}

export function groupRitualDcReduction(helpers: number): number {
  return Math.min(4, Math.max(0, helpers));
}

export function ritualInterruptionContinueDc(kind: RitualInterruptionKind): number {
  if (kind === "physically_harmed") return 18;
  return 15;
}

export function removedFromAreaContinueDc(): number {
  return 16;
}

export function resolveRitualCraft(input: RitualCraftInput): RitualCraftResult {
  const effectiveDc = input.ritual.dc - groupRitualDcReduction(input.helpers ?? 0);
  const fumble = input.dieRolls?.[0] === 1;

  if (fumble) {
    return {
      success: false,
      fumble: true,
      componentsConsumed: true,
      ritualEffect: false,
      fumbleHpDamage: ritualFumbleHpDamage(input.vigorSpent),
      effectiveDc,
    };
  }

  const success = input.ritualCraftingTotal > effectiveDc;
  return {
    success,
    fumble: false,
    componentsConsumed: !success,
    ritualEffect: success,
    fumbleHpDamage: 0,
    effectiveDc,
  };
}
