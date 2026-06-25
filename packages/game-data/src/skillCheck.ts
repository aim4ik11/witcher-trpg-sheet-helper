import type { SkillCheckResolved } from "@wilmak/shared";
import {
  type DiceRng,
  type SkillCheckResult,
  resolveManualSkillCheck,
  rollSkillCheck,
} from "./dice";

export interface EvaluatedSkillCheck extends SkillCheckResult {
  dc?: number;
  success: boolean | null;
  simulated: boolean;
}

export function evaluateSkillCheck(options: {
  base: number;
  modifier?: number;
  dc?: number;
  dieRolls?: number[];
  rng?: DiceRng;
}): EvaluatedSkillCheck {
  const modifier = options.modifier ?? 0;
  const dc = options.dc != null && Number.isFinite(options.dc) ? options.dc : undefined;

  let result: SkillCheckResult;
  let simulated = false;
  if (options.dieRolls && options.dieRolls.length > 0) {
    result = resolveManualSkillCheck({
      base: options.base,
      modifier,
      dieRolls: options.dieRolls,
    });
  } else {
    result = rollSkillCheck({ base: options.base, modifier, rng: options.rng });
    simulated = true;
  }

  const success = dc != null ? result.total > dc : null;
  return { ...result, dc, success, simulated };
}

export function formatSkillCheckRolls(rolls: number[]): string {
  return rolls.join("+");
}

export function formatSkillCheckOutcome(check: EvaluatedSkillCheck): string {
  const rolls = formatSkillCheckRolls(check.rolls);
  const dcPart = check.dc != null ? ` vs DC ${check.dc}` : "";
  const outcomeTag =
    check.outcome === "critical"
      ? " — Critical!"
      : check.outcome === "fumble"
        ? " — Fumble!"
        : "";
  const successPart =
    check.success === true ? " — Success" : check.success === false ? " — Failure" : "";
  return `d10 [${rolls}] + ${check.effectiveBase} = ${check.total}${dcPart}${outcomeTag}${successPart}`;
}

/** Build a protocol payload from evaluation inputs and result. */
export function buildSkillCheckResolved(options: {
  requestId: string;
  characterId: string;
  characterName: string;
  skillLabel: string;
  statSkillBase: number;
  modifier: number;
  dc?: number;
  check: EvaluatedSkillCheck;
}): SkillCheckResolved {
  return {
    requestId: options.requestId,
    characterId: options.characterId,
    characterName: options.characterName,
    skillLabel: options.skillLabel,
    base: options.statSkillBase,
    modifier: options.modifier,
    dc: options.dc,
    dieRolls: options.check.rolls,
    outcome: options.check.outcome,
    effectiveBase: options.check.effectiveBase,
    fumblePenalty: options.check.fumblePenalty,
    total: options.check.total,
    success: options.check.success,
    simulated: options.check.simulated,
    resolvedAt: Date.now(),
  };
}
