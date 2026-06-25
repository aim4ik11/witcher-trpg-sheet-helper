/**
 * Rulebook: `sections/166-magic-resolution.md` — STA exhaustion & REC recovery
 */
import { describe, expect, it } from "vitest";
import {
  staExhaustionStuns,
  staRecoveredWhileStunned,
  tickStunnedCasterRecovery,
} from "../magicStunRecovery";

describe("rulebook §166 — STA exhaustion stuns caster", () => {
  it("casting costs more STA than available → stunned", () => {
    expect(staExhaustionStuns(3, 5)).toBe(true);
    expect(staExhaustionStuns(10, 5)).toBe(false);
    expect(staExhaustionStuns(5, 5)).toBe(false);
  });
});

describe("rulebook §166 — recovery while stunned", () => {
  it("while stunned, recover STA at rate equal to REC per round", () => {
    expect(staRecoveredWhileStunned(5, 1)).toBe(5);
    expect(staRecoveredWhileStunned(5, 3)).toBe(15);
    expect(staRecoveredWhileStunned(0, 2)).toBe(0);
  });

  it("tickStunnedCasterRecovery adds REC each round until STA > 0", () => {
    const afterOne = tickStunnedCasterRecovery({
      stunned: true,
      staCurrent: 0,
      rec: 4,
    });
    expect(afterOne.staCurrent).toBe(4);
    expect(afterOne.stunned).toBe(true);

    const afterTwo = tickStunnedCasterRecovery({
      stunned: true,
      staCurrent: 4,
      rec: 4,
    });
    expect(afterTwo.staCurrent).toBe(8);
  });

  it("caster must make Stun save to recover from stunned (flagged for combat)", () => {
    const state = tickStunnedCasterRecovery({
      stunned: true,
      staCurrent: 0,
      rec: 3,
    });
    expect(state).toHaveProperty("stunned", true);
  });
});
