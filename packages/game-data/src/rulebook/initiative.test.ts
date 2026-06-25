/**
 * Rulebook: `sections/151-combat-basics.md` (Initiative), `172-example-combat.md`
 */
import { describe, expect, it } from "vitest";
import {
  addParticipantsToCombat,
  buildCombatParticipant,
  createCombatState,
  resolveInitiative,
  rollInitiativeRoll,
  sortCombatParticipants,
} from "../combat";
import { createSequenceRng } from "../dice";

describe("rulebook §151 — initiative = REF + 1d10", () => {
  it("adds a single d10 to REF", () => {
    expect(resolveInitiative(7, 3)).toEqual({ ref: 7, dieRoll: 3, initiative: 10 });
  });

  it("rejects die values outside 1–10", () => {
    expect(() => resolveInitiative(5, 0)).toThrow();
    expect(() => resolveInitiative(5, 11)).toThrow();
  });
});

describe("rulebook §172 — example combat initiative roster", () => {
  it("orders participants by initiative descending", () => {
    const wren = buildCombatParticipant(
      { id: "w", type: "player", name: "Wren", attributes: { ref: 8 } } as never,
      9,
    );
    const hanson = buildCombatParticipant(
      { id: "h", type: "player", name: "Hanson", attributes: { ref: 7 } } as never,
      8,
    );
    const johan = buildCombatParticipant(
      { id: "j", type: "player", name: "Johan", attributes: { ref: 6 } } as never,
      7,
    );
    const storm = buildCombatParticipant(
      { id: "s", type: "player", name: "Storm", attributes: { ref: 5 } } as never,
      4,
    );
    const ghouls = buildCombatParticipant(
      { id: "g", type: "enemy", name: "Ghouls", attributes: { ref: 5 } } as never,
      5,
    );

    expect(wren.initiative).toBe(17);
    expect(hanson.initiative).toBe(15);
    expect(johan.initiative).toBe(13);
    expect(ghouls.initiative).toBe(10);
    expect(storm.initiative).toBe(9);

    const order = sortCombatParticipants([storm, ghouls, johan, hanson, wren]).map(
      (p) => p.name,
    );
    expect(order).toEqual(["Wren", "Hanson", "Johan", "Ghouls", "Storm"]);
  });
});

describe("rulebook §151 — party initiative tie-break", () => {
  it("breaks equal initiative by higher die roll", () => {
    const a = buildCombatParticipant(
      { id: "a", type: "player", name: "A", attributes: { ref: 5 } } as never,
      3,
    );
    const b = buildCombatParticipant(
      { id: "b", type: "player", name: "B", attributes: { ref: 3 } } as never,
      5,
    );
    expect(a.initiative).toBe(b.initiative);
    const sorted = sortCombatParticipants([a, b]);
    expect(sorted[0]!.name).toBe("B");
  });
});

describe("rulebook combat — late joiners", () => {
  it("append reinforcements after existing initiative order", () => {
    const combat = createCombatState([
      buildCombatParticipant(
        { id: "a", type: "player", name: "A", attributes: { ref: 8 } } as never,
        5,
      ),
    ]);
    const newcomer = buildCombatParticipant(
      { id: "b", type: "enemy", name: "Reinforcement", attributes: { ref: 10 } } as never,
      10,
    );
    const next = addParticipantsToCombat(combat, [newcomer]);
    expect(next.participants.map((p) => p.name)).toEqual(["A", "Reinforcement"]);
  });
});

describe("rulebook combat — simulated initiative roll", () => {
  it("uses one d10 per participant", () => {
    const roll = rollInitiativeRoll(6, createSequenceRng([0.0]));
    expect(roll.dieRoll).toBe(1);
    expect(roll.initiative).toBe(7);
  });
});
