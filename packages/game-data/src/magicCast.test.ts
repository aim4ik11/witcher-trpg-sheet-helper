import { describe, expect, it } from "vitest";
import type { Character, Spell } from "@wilmak/shared";
import {
  applyMagicCastToCharacter,
  buildMagicCastResolved,
  casterVigorThreshold,
  resolveMagicCast,
  spellElement,
} from "./magicCast";

function testCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "c1",
    name: "Triss",
    type: "player",
    occupation: "Mage",
    attributes: { will: 10 },
    skills: { spellCasting: 9 },
    vitals: {
      hp: { current: 30, max: 30 },
      sta: { current: 20, max: 20 },
    },
    statusEffects: [],
    ...overrides,
  } as Character;
}

const fireball: Spell = {
  id: "s1",
  category: "spell",
  name: "Fireball",
  staCost: 5,
  range: "10m",
  duration: "instant",
  effect: "Boom",
  element: "fire",
};

describe("resolveMagicCast", () => {
  it("safe cast within vigor costs no HP", () => {
    const character = testCharacter();
    const result = resolveMagicCast({
      character,
      spell: fireball,
      dieRolls: [5],
    });
    expect(result.overexertionHp).toBe(0);
    expect(result.staAfter).toBe(15);
    expect(result.hpAfter).toBe(30);
    expect(result.spellSucceeds).toBe(true);
  });

  it("overexertion deducts HP when STA exceeds vigor", () => {
    const character = testCharacter();
    const expensive: Spell = { ...fireball, staCost: 8 };
    const result = resolveMagicCast({
      character,
      spell: expensive,
      dieRolls: [5],
    });
    expect(result.overexertionHp).toBe(15);
    expect(result.hpAfter).toBe(15);
  });

  it("fumble applies self-damage and elemental effect", () => {
    const character = testCharacter();
    const result = resolveMagicCast({
      character,
      spell: fireball,
      dieRolls: [1],
      fumbleSecondRoll: 8,
    });
    expect(result.check.outcome).toBe("fumble");
    expect(result.fumble?.onFire).toBe(true);
    expect(result.fumble?.spellSucceeds).toBe(false);
    expect(result.hpAfter).toBe(22);
    expect(result.statusEffectsAdded.some((s) => s.includes("On fire"))).toBe(true);
  });
});

describe("applyMagicCastToCharacter", () => {
  it("updates vitals and appends status effects", () => {
    const character = testCharacter();
    const result = resolveMagicCast({
      character,
      spell: fireball,
      dieRolls: [1],
      fumbleSecondRoll: 8,
    });
    const updated = applyMagicCastToCharacter(character, result);
    expect(updated.vitals?.hp.current).toBe(result.hpAfter);
    expect(updated.vitals?.sta.current).toBe(result.staAfter);
    expect(updated.statusEffects?.some((e) => e.description.includes("On fire"))).toBe(
      true,
    );
  });
});

describe("buildMagicCastResolved", () => {
  it("produces protocol payload", () => {
    const character = testCharacter();
    const result = resolveMagicCast({ character, spell: fireball, dieRolls: [6] });
    const payload = buildMagicCastResolved({
      requestId: "req-1",
      character,
      spell: fireball,
      modifier: 0,
      result,
    });
    expect(payload.requestId).toBe("req-1");
    expect(payload.spellName).toBe("Fireball");
    expect(payload.element).toBe("fire");
    expect(payload.spellSucceeds).toBe(true);
  });
});

describe("spellElement & vigor", () => {
  it("reads element from spell", () => {
    expect(spellElement(fireball)).toBe("fire");
  });

  it("mage vigor 5 from profession", () => {
    expect(casterVigorThreshold(testCharacter())).toBe(5);
  });
});
