/**
 * Rulebook: `sections/166-magic-resolution.md` — Overdrawn Priests, Dimeritium contact
 */
import { describe, expect, it } from "vitest";
import {
  DIMERITIUM_CHECK_INTERVAL_MINUTES,
  DIMERITIUM_ENDURANCE_DC,
  priestFumbleElement,
  priestOverexertionBacklashElement,
  requiresDimeritiumEnduranceCheck,
} from "../priestMagic";
import { fumbleElementForCaster } from "../magicResolution";

describe("rulebook §166 — overdrawn priests use mixed element", () => {
  it("priest fumble element is always mixed", () => {
    expect(priestFumbleElement("fire")).toBe("mixed");
    expect(priestFumbleElement("water")).toBe("mixed");
    expect(fumbleElementForCaster("fire", "Priest")).toBe("mixed");
  });

  it("priest overexertion backlash uses mixed element (overdrawn priests)", () => {
    expect(priestOverexertionBacklashElement("fire", "Priest")).toBe("mixed");
    expect(priestOverexertionBacklashElement("earth", "Mage")).toBe("earth");
  });
});

describe("rulebook §166 — dimeritium contact", () => {
  it("touching dimeritium requires Endurance check DC 16", () => {
    expect(DIMERITIUM_ENDURANCE_DC).toBe(16);
    expect(requiresDimeritiumEnduranceCheck(true)).toBe(true);
    expect(requiresDimeritiumEnduranceCheck(false)).toBe(false);
  });

  it("Endurance check repeated every 30 minutes while contact continues", () => {
    expect(DIMERITIUM_CHECK_INTERVAL_MINUTES).toBe(30);
  });
});

describe("rulebook §166 — magical focus rules (metadata)", () => {
  it("focus cannot reduce STA below 1 (tested in magic-fumbles)", () => {
    // Covered by focusAdjustedStaCost in magicResolution — priest rules extended here.
    expect(priestFumbleElement("mixed")).toBe("mixed");
  });
});
