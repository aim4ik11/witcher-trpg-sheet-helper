import { useEffect, useMemo, useState } from "react";
import type { Character, MagicCastRequest, MagicCastResolved, Spell } from "@wilmak/shared";
import {
  applyMagicCastToCharacter,
  buildMagicCastResolved,
  casterVigorThreshold,
  classifyMagicTargeting,
  describeSignEffect,
  effectiveVigorThreshold,
  evaluateSkillCheck,
  focusAdjustedStaCost,
  formatMagicCastRolls,
  magicCastModifierFromArmor,
  overexertionHpCost,
  parseMagicCastRolls,
  resolveMagicCast,
  resolveStaSpent,
  rollDie,
  skillBase,
  spellElement,
} from "@wilmak/game-data";
import {
  DIMERITIUM_ENDURANCE_DC,
  requiresDimeritiumEnduranceCheck,
} from "@wilmak/game-data";
import { api } from "../../api";
import "../CreateCharacterModal/CreateCharacterModal.css";
import "../SkillCheckModal/SkillCheckModal.css";
import "./MagicCastModal.css";

export interface MagicCastTarget {
  character: Character;
  spell: Spell;
}

interface Props {
  target: MagicCastTarget;
  onClose: () => void;
  onCharacterUpdated?: (character: Character) => void;
}

function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

function isVariableSta(spell: Spell): boolean {
  return (
    spell.staCostText?.toLowerCase().includes("variable") === true || spell.staCost <= 0
  );
}

export default function MagicCastModal({ target, onClose, onCharacterUpdated }: Props) {
  const { character, spell } = target;
  const castingBase = skillBase(character, "will", "spellCasting");
  const element = spellElement(spell);
  const vigorBase = casterVigorThreshold(character);
  const isPlayer = character.type === "player";
  const variableSta = isVariableSta(spell);

  const [requestId] = useState(() => crypto.randomUUID());
  const [modifier, setModifier] = useState("0");
  const [dc, setDc] = useState("");
  const [notes, setNotes] = useState("");
  const [staSpent, setStaSpent] = useState(String(spell.staCost || 0));
  const [focusReduction, setFocusReduction] = useState("0");
  const [dimeritiumUnits, setDimeritiumUnits] = useState("0");
  const [touchingDimeritium, setTouchingDimeritium] = useState(false);
  const [rollInput, setRollInput] = useState("");
  const [fumbleSecondInput, setFumbleSecondInput] = useState("");
  const [focusExplosionInput, setFocusExplosionInput] = useState("");
  const [notified, setNotified] = useState(false);
  const [resolved, setResolved] = useState<MagicCastResolved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const modifierNum = Number(modifier) || 0;
  const armorEvMod = magicCastModifierFromArmor(character);
  const totalModifier = modifierNum + armorEvMod;
  const dcNum = parseOptionalInt(dc);
  const staSpentNum = resolveStaSpent(spell, parseOptionalInt(staSpent));
  const focusNum = Math.max(0, parseOptionalInt(focusReduction) ?? 0);
  const dimeritiumNum = Math.max(0, parseOptionalInt(dimeritiumUnits) ?? 0);
  const effectiveSta = focusAdjustedStaCost(staSpentNum, focusNum);
  const vigorThreshold = effectiveVigorThreshold(
    vigorBase,
    dimeritiumNum,
    touchingDimeritium,
  );
  const overexertionPreview = overexertionHpCost(effectiveSta, vigorThreshold);

  const targetingMode = classifyMagicTargeting({
    range: spell.range,
    defense: spell.defense,
    category: spell.category,
  });
  const signEffect = spell.category === "sign" ? describeSignEffect(spell.name, staSpentNum) : null;
  const isHex = spell.category === "hex";
  const isRitual = spell.category === "ritual";

  const preview = useMemo(() => {
    const rolls = parseMagicCastRolls(rollInput);
    if (!rolls) return null;
    try {
      return evaluateSkillCheck({
        base: castingBase,
        modifier: totalModifier,
        dc: dcNum,
        dieRolls: rolls,
      });
    } catch {
      return null;
    }
  }, [rollInput, castingBase, totalModifier, dcNum]);

  useEffect(() => {
    return () => {
      if (notified && !resolved && isPlayer) {
        void window.api.cancelMagicCast(character.id, requestId);
      }
    };
  }, [character.id, isPlayer, notified, requestId, resolved]);

  async function handleNotifyPlayer() {
    setError(null);
    setBusy(true);
    try {
      const request: MagicCastRequest = {
        id: requestId,
        characterId: character.id,
        characterName: character.name,
        spellId: spell.id,
        spellName: spell.name,
        spellCategory: spell.category,
        element,
        staCost: effectiveSta,
        staCostText: spell.staCostText,
        base: castingBase,
        vigorThreshold,
        modifier: totalModifier,
        dc: dcNum,
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
      };
      await window.api.requestMagicCast(request);
      setNotified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to notify player.");
    } finally {
      setBusy(false);
    }
  }

  function handleSimulate() {
    setError(null);
    const check = evaluateSkillCheck({
      base: castingBase,
      modifier: totalModifier,
      dc: dcNum,
    });
    setRollInput(formatMagicCastRolls(check.rolls));
    if (check.outcome === "fumble") {
      const second = rollDie(10);
      setFumbleSecondInput(String(second));
    }
  }

  async function handleResolve(simulate = false) {
    setError(null);
    setBusy(true);
    try {
      let dieRolls: number[] | undefined;
      if (simulate) {
        const check = evaluateSkillCheck({
          base: castingBase,
          modifier: totalModifier,
          dc: dcNum,
        });
        dieRolls = check.rolls;
        setRollInput(formatMagicCastRolls(dieRolls));
      } else {
        const rolls = parseMagicCastRolls(rollInput);
        if (!rolls) {
          setError('Enter the d10 roll (e.g. "7" or "10,7" for crit chain).');
          setBusy(false);
          return;
        }
        dieRolls = rolls;
      }

      const check = evaluateSkillCheck({
        base: castingBase,
        modifier: totalModifier,
        dc: dcNum,
        dieRolls,
      });

      let fumbleSecondRoll: number | undefined;
      let focusExplosionRoll: number | undefined;
      if (check.outcome === "fumble") {
        const parsed = parseOptionalInt(fumbleSecondInput);
        if (parsed != null && parsed >= 1 && parsed <= 10) {
          fumbleSecondRoll = parsed;
        } else if (simulate) {
          fumbleSecondRoll = rollDie(10);
          setFumbleSecondInput(String(fumbleSecondRoll));
        } else {
          setError("Magic fumble — enter the second d10 roll (1–10).");
          setBusy(false);
          return;
        }
        if (fumbleSecondRoll === 10) {
          const boomParsed = parseOptionalInt(focusExplosionInput);
          if (boomParsed != null && boomParsed >= 1 && boomParsed <= 10) {
            focusExplosionRoll = boomParsed;
          } else if (simulate) {
            focusExplosionRoll = rollDie(10);
            setFocusExplosionInput(String(focusExplosionRoll));
          } else {
            setError("Catastrophic fumble — enter focus explosion d10 damage (1–10).");
            setBusy(false);
            return;
          }
        }
      }

      const result = resolveMagicCast({
        character,
        spell,
        modifier: modifierNum,
        dc: dcNum,
        dieRolls,
        fumbleSecondRoll,
        focusExplosionRoll,
        staSpent: staSpentNum,
        focusReduction: focusNum,
        dimeritiumUnitsWithin5m: dimeritiumNum,
        touchingDimeritium,
        armorEvPenalty: true,
      });

      const updated = applyMagicCastToCharacter(character, result);
      await api.updateCharacter(character.id, updated);
      onCharacterUpdated?.(updated);

      const payload = buildMagicCastResolved({
        requestId,
        character: updated,
        spell,
        modifier: modifierNum,
        dc: dcNum,
        result,
        fumbleSecondRoll,
      });
      await window.api.resolveMagicCast(payload);
      setResolved(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve cast.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="create-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="create-modal create-modal--wide panel skill-check-modal magic-cast-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="create-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="create-modal-title">Cast — {spell.name}</h2>
        <p className="skill-check-hint">
          {character.name} · Spell Casting base <strong>{castingBase}</strong>
          {armorEvMod !== 0 && (
            <>
              {" "}
              · armor EV <strong>{armorEvMod}</strong>
            </>
          )}
          {" · "}
          <span className="magic-cast-element">{element}</span>
          {" · "}
          <span className="magic-cast-targeting">{targetingMode}</span>
          {isPlayer
            ? " — ask the player to roll, then enter their d10 result."
            : " — enter a roll or simulate for this NPC."}
        </p>

        {resolved ? (
          <div className="skill-check-result panel">
            <h3>Result</h3>
            <p className="skill-check-result-line">
              <span
                className={`skill-check-outcome skill-check-outcome--${resolved.outcome}`}
              >
                {resolved.outcome}
              </span>
              {" · "}
              d10 [{formatMagicCastRolls(resolved.dieRolls)}] + {resolved.effectiveBase} ={" "}
              <strong>{resolved.total}</strong>
              {resolved.dc != null && (
                <>
                  {" "}
                  vs DC {resolved.dc} —{" "}
                  <strong
                    className={
                      resolved.spellSucceeds ? "skill-check-pass" : "skill-check-fail"
                    }
                  >
                    {resolved.spellSucceeds ? "Spell succeeds" : "Spell fails"}
                  </strong>
                </>
              )}
            </p>
            <p className="magic-cast-vitals">
              STA {resolved.staBefore} → {resolved.staAfter} (−{resolved.staCost})
              {resolved.overexertionHp > 0 && (
                <>
                  {" "}
                  · HP {resolved.hpBefore} → {resolved.hpAfter} (−{resolved.overexertionHp}{" "}
                  overexertion
                </>
              )}
              {resolved.fumble && resolved.fumble.selfDamage > 0 && (
                <> · fumble self-damage −{resolved.fumble.selfDamage}</>
              )}
            </p>
            {resolved.fumble && (
              <p className="magic-cast-fumble">
                Fumble ({resolved.fumble.tier}, {resolved.fumble.element}): second d10{" "}
                {resolved.fumbleSecondRoll}
                {resolved.fumble.onFire && " · On fire"}
                {resolved.fumble.frozen && " · Frozen"}
                {resolved.fumble.stunned && " · Stunned"}
                {resolved.fumble.knockedBackMeters > 0 &&
                  ` · Knocked back ${resolved.fumble.knockedBackMeters}m`}
                {resolved.fumble.focusExplodes && " · Focus explodes"}
                {resolved.fumble.requiresRandomElementalRider &&
                  " · GM picks elemental rider"}
              </p>
            )}
            {resolved.statusEffectsAdded.length > 0 && (
              <ul className="magic-cast-effects">
                {resolved.statusEffectsAdded.map((fx) => (
                  <li key={fx}>{fx}</li>
                ))}
              </ul>
            )}
            {resolved.simulated && (
              <p className="skill-check-note">Simulated roll for NPC.</p>
            )}
            <button type="button" className="primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <div className="skill-check-form">
            <div className="magic-cast-cost panel">
              <span>
                STA cost: <strong>{effectiveSta}</strong>
              </span>
              <span>
                Vigor threshold: <strong>{vigorThreshold}</strong>
              </span>
              {overexertionPreview > 0 && (
                <span className="magic-cast-overexert">
                  Overexertion: <strong>−{overexertionPreview} HP</strong>
                </span>
              )}
              {signEffect && (
                <span className="magic-cast-sign-effect">
                  Sign: <strong>{signEffect}</strong>
                </span>
              )}
            </div>

            {(isHex || isRitual) && (
              <p className="magic-cast-category-hint panel">
                {isHex &&
                  "Hex: failure does nothing; fumble has 50% chance to affix on the caster."}
                {isRitual &&
                  "Ritual: use Ritual Crafting after preparation; components are lost on failure."}
              </p>
            )}

            {touchingDimeritium && requiresDimeritiumEnduranceCheck(true) && (
              <p className="magic-cast-dimeritium-hint panel">
                Touching dimeritium — Endurance check DC {DIMERITIUM_ENDURANCE_DC} required
                (repeat every 30 min).
              </p>
            )}

            <div className="skill-check-grid">
              {variableSta && (
                <label>
                  STA spent (max 7 for signs)
                  <input
                    type="number"
                    min={0}
                    max={7}
                    value={staSpent}
                    onChange={(e) => setStaSpent(e.target.value)}
                  />
                </label>
              )}
              <label>
                Focus reduction
                <input
                  type="number"
                  min={0}
                  value={focusReduction}
                  onChange={(e) => setFocusReduction(e.target.value)}
                />
              </label>
              <label>
                Modifier
                <input
                  type="number"
                  value={modifier}
                  onChange={(e) => setModifier(e.target.value)}
                />
              </label>
              <label>
                DC (optional)
                <input
                  type="number"
                  min={0}
                  value={dc}
                  onChange={(e) => setDc(e.target.value)}
                  placeholder="—"
                />
              </label>
            </div>

            <div className="skill-check-grid">
              <label>
                Dimeritium within 5 m
                <input
                  type="number"
                  min={0}
                  value={dimeritiumUnits}
                  onChange={(e) => setDimeritiumUnits(e.target.value)}
                />
              </label>
              <label className="magic-cast-checkbox">
                <input
                  type="checkbox"
                  checked={touchingDimeritium}
                  onChange={(e) => setTouchingDimeritium(e.target.checked)}
                />
                Touching dimeritium
              </label>
            </div>

            <label>
              Notes (optional)
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Casting Aard at the ghoul"
              />
            </label>

            <label>
              d10 roll{isPlayer ? " (from player)" : ""}
              <input
                value={rollInput}
                onChange={(e) => setRollInput(e.target.value)}
                placeholder={isPlayer ? "e.g. 7 or 10,7" : "Leave empty to simulate"}
              />
            </label>

            {(preview?.outcome === "fumble" || fumbleSecondInput) && (
              <label>
                Magic fumble — second d10
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={fumbleSecondInput}
                  onChange={(e) => setFumbleSecondInput(e.target.value)}
                  placeholder="Required on natural 1"
                />
              </label>
            )}

            {(parseOptionalInt(fumbleSecondInput) === 10 || preview?.outcome === "fumble") &&
              parseOptionalInt(fumbleSecondInput) === 10 && (
                <label>
                  Focus explosion — d10 damage
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={focusExplosionInput}
                    onChange={(e) => setFocusExplosionInput(e.target.value)}
                    placeholder="Catastrophic fumble bomb damage"
                  />
                </label>
              )}

            {error && <p className="skill-check-error">{error}</p>}

            <div className="skill-check-actions">
              {isPlayer && (
                <button
                  type="button"
                  className="btn-sm"
                  onClick={() => void handleNotifyPlayer()}
                  disabled={busy || notified}
                >
                  {notified ? "Player notified" : "Ask player to roll"}
                </button>
              )}
              {!isPlayer && (
                <button
                  type="button"
                  className="btn-sm"
                  onClick={handleSimulate}
                  disabled={busy}
                >
                  Simulate roll
                </button>
              )}
              <button
                type="button"
                className="primary"
                onClick={() => void handleResolve(!isPlayer && !rollInput.trim())}
                disabled={busy}
              >
                {isPlayer ? "Resolve & apply" : rollInput.trim() ? "Resolve & apply" : "Simulate & apply"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
