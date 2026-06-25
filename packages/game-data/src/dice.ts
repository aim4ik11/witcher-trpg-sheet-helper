/**
 * Witcher TRPG dice resolution.
 *
 * Rulebook refs:
 * - Skill checks: `data/rulebook/curated/statistics.md`, `sections/057-skill-resolution.md`
 * - d10 open-ended crits/fumbles: `sections/151-combat-basics.md` (Criticals and Fumbles)
 * - Damage / quantities: weapon `dmg` strings, crafting `1d6/2` notation
 */

/** Returns a value in [0, 1), same contract as `Math.random`. */
export type DiceRng = () => number;

export const defaultRng: DiceRng = Math.random;

/** Deterministic RNG for tests — each value maps to `floor(v * sides) + 1` per die roll. */
export function createSequenceRng(sequence: number[]): DiceRng {
  let index = 0;
  return () => {
    if (index >= sequence.length) {
      throw new Error("createSequenceRng: sequence exhausted");
    }
    return sequence[index++]!;
  };
}

export function rollDie(sides: number, rng: DiceRng = defaultRng): number {
  if (!Number.isInteger(sides) || sides < 1) {
    throw new RangeError(`rollDie: sides must be a positive integer, got ${sides}`);
  }
  return Math.floor(rng() * sides) + 1;
}

export function rollDice(count: number, sides: number, rng: DiceRng = defaultRng): number {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`rollDice: count must be a positive integer, got ${count}`);
  }
  let sum = 0;
  for (let i = 0; i < count; i++) {
    sum += rollDie(sides, rng);
  }
  return sum;
}

export interface DiceRollBreakdown {
  expression: string;
  count: number;
  sides: number;
  /** When set, sum of dice is divided by this (rounded up). */
  divisor?: number;
  modifier: number;
  rolls: number[];
  diceSum: number;
  total: number;
}

const DICE_EXPR =
  /^(\d+)\s*d\s*(\d+)(?:\s*\/\s*(\d+))?(?:\s*([+\-−]\s*\d+))?$/i;

/**
 * Roll a dice expression from catalogs / hand-to-hand table.
 * Examples: `2d6+2`, `1d6−4`, `4d6`, `1d6/2`
 *
 * `NdM/D` rolls NdM, then applies `ceil(sum / D)` (used for `1d6/2` quantities).
 */
export function rollDiceExpression(
  expression: string,
  rng: DiceRng = defaultRng,
): DiceRollBreakdown {
  const trimmed = expression.trim();
  const match = trimmed.match(DICE_EXPR);
  if (!match) {
    throw new SyntaxError(`rollDiceExpression: invalid expression "${expression}"`);
  }

  const count = Number(match[1]);
  const sides = Number(match[2]);
  const divisor = match[3] ? Number(match[3]) : undefined;
  const modifier = match[4] ? Number(match[4].replace(/\s/g, "").replace("−", "-")) : 0;

  const rolls: number[] = [];
  let diceSum = 0;
  for (let i = 0; i < count; i++) {
    const value = rollDie(sides, rng);
    rolls.push(value);
    diceSum += value;
  }

  let resolved = diceSum;
  if (divisor !== undefined) {
    if (!Number.isInteger(divisor) || divisor < 1) {
      throw new RangeError(`rollDiceExpression: invalid divisor in "${expression}"`);
    }
    resolved = Math.ceil(diceSum / divisor);
  }

  return {
    expression: trimmed,
    count,
    sides,
    divisor,
    modifier,
    rolls,
    diceSum,
    total: resolved + modifier,
  };
}

export type D10Outcome = "normal" | "critical" | "fumble";

export interface D10OpenEndedResult {
  outcome: D10Outcome;
  /** Every d10 rolled, including the opening natural. */
  rolls: number[];
  /**
   * Die contribution added to base.
   * Crit: sum of the open-ended chain. Normal: the single roll. Fumble: always 1.
   */
  dieTotal: number;
  /** On fumble, total subtracted from base (chains on 10s after the opening 1). */
  fumblePenalty: number;
}

/**
 * Roll 1d10 with open-ended crit/fumble resolution (combat / skill checks).
 *
 * Critical (natural 10): roll again and add; keep rolling while you roll 10.
 * Fumble (natural 1): roll again and subtract from base; if that roll is 10, chain further 10s.
 */
export function rollD10OpenEnded(rng: DiceRng = defaultRng): D10OpenEndedResult {
  const first = rollDie(10, rng);
  if (first === 10) {
    return rollD10CriticalChain(first, rng);
  }
  if (first === 1) {
    return rollD10FumbleChain(first, rng);
  }
  return { outcome: "normal", rolls: [first], dieTotal: first, fumblePenalty: 0 };
}

function rollD10CriticalChain(first: number, rng: DiceRng): D10OpenEndedResult {
  const rolls = [first];
  let dieTotal = first;
  let current = first;
  while (current === 10) {
    current = rollDie(10, rng);
    rolls.push(current);
    dieTotal += current;
  }
  return { outcome: "critical", rolls, dieTotal, fumblePenalty: 0 };
}

function rollD10FumbleChain(first: number, rng: DiceRng): D10OpenEndedResult {
  const rolls = [first];
  let penalty = 0;
  let current = rollDie(10, rng);
  rolls.push(current);
  penalty += current;
  while (current === 10) {
    current = rollDie(10, rng);
    rolls.push(current);
    penalty += current;
  }
  return { outcome: "fumble", rolls, dieTotal: 1, fumblePenalty: penalty };
}

export interface SkillCheckResult {
  outcome: D10Outcome;
  rolls: number[];
  dieTotal: number;
  fumblePenalty: number;
  /** Stat + skill (+ any flat modifier passed in). */
  base: number;
  /** After fumble penalty, floored at 0. Equals `base` for non-fumbles. */
  effectiveBase: number;
  total: number;
}

/**
 * Roll 1d10 + base vs DC or opponent.
 * Base = relevant stat + skill level (+ optional flat modifier).
 *
 * On fumble the natural 1 does not add to the total; penalty is subtracted from base
 * (see rulebook example: REF 7 + Swordsmanship 6, fumble follow-up 7 → total 6).
 */
export function rollSkillCheck(
  options: { base: number; modifier?: number; rng?: DiceRng },
): SkillCheckResult {
  const rng = options.rng ?? defaultRng;
  const base = options.base + (options.modifier ?? 0);
  const open = rollD10OpenEnded(rng);

  if (open.outcome === "fumble") {
    const effectiveBase = Math.max(0, base - open.fumblePenalty);
    return {
      outcome: open.outcome,
      rolls: open.rolls,
      dieTotal: open.dieTotal,
      fumblePenalty: open.fumblePenalty,
      base,
      effectiveBase,
      total: effectiveBase,
    };
  }

  return {
    outcome: open.outcome,
    rolls: open.rolls,
    dieTotal: open.dieTotal,
    fumblePenalty: 0,
    base,
    effectiveBase: base,
    total: open.dieTotal + base,
  };
}

/**
 * Resolve a skill check from explicit d10 roll(s), applying open-ended crit/fumble chains.
 * `dieRolls` must include the opening natural; further rolls only when chaining on 10.
 */
export function resolveManualSkillCheck(options: {
  base: number;
  modifier?: number;
  dieRolls: number[];
}): SkillCheckResult {
  const rolls = options.dieRolls;
  if (rolls.length === 0 || rolls.some((r) => !Number.isInteger(r) || r < 1 || r > 10)) {
    throw new RangeError("resolveManualSkillCheck: each dieRoll must be 1–10");
  }
  const base = options.base + (options.modifier ?? 0);
  const first = rolls[0]!;

  if (first === 10) {
    const dieTotal = rolls.reduce((sum, r) => sum + r, 0);
    return {
      outcome: "critical",
      rolls,
      dieTotal,
      fumblePenalty: 0,
      base,
      effectiveBase: base,
      total: dieTotal + base,
    };
  }

  if (first === 1 && rolls.length > 1) {
    const penalty = rolls.slice(1).reduce((sum, r) => sum + r, 0);
    const effectiveBase = Math.max(0, base - penalty);
    return {
      outcome: "fumble",
      rolls,
      dieTotal: 1,
      fumblePenalty: penalty,
      base,
      effectiveBase,
      total: effectiveBase,
    };
  }

  if (first === 1) {
    return {
      outcome: "fumble",
      rolls,
      dieTotal: 1,
      fumblePenalty: 0,
      base,
      effectiveBase: base,
      total: base,
    };
  }

  return {
    outcome: "normal",
    rolls,
    dieTotal: first,
    fumblePenalty: 0,
    base,
    effectiveBase: base,
    total: first + base,
  };
}

/** Parse manual roll input: "7", "10,7", "1,7" */
export function parseManualDieRolls(input: string): number[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[\s,]+/).map((p) => Number(p.trim()));
  if (parts.some((n) => !Number.isInteger(n) || n < 1 || n > 10)) return null;
  return parts;
}

/** Initiative = REF + 1d10 (`curated/combat.md`). Plain d10 — no open-ended chains. */
export function rollInitiative(ref: number, rng: DiceRng = defaultRng): number {
  return rollDie(10, rng) + ref;
}

/** Percentile roll (1–100), used in life events / witcher background tables. */
export function rollPercentile(rng: DiceRng = defaultRng): number {
  return rollDie(100, rng);
}

/** Roll-under check: succeed when roll ≤ target (e.g. WILL saves). */
export function rollUnder(target: number, rng: DiceRng = defaultRng): {
  roll: number;
  target: number;
  success: boolean;
} {
  const roll = rollDie(10, rng);
  return { roll, target, success: roll <= target };
}
