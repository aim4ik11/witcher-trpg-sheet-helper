import { useEffect, useMemo, useState } from "react";
import type { Character, SkillCheckRequest, SkillCheckResolved } from "@wilmak/shared";
import {
  buildSkillCheckResolved,
  evaluateSkillCheck,
  formatSkillCheckOutcome,
  formatSkillCheckRolls,
  parseManualDieRolls,
  skillBase,
} from "@wilmak/game-data";
import "../CreateCharacterModal/CreateCharacterModal.css";
import "./SkillCheckModal.css";

export interface SkillCheckTarget {
  character: Character;
  attrKey: string;
  skillKey: string;
  skillLabel: string;
}

interface Props {
  target: SkillCheckTarget;
  onClose: () => void;
}

function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export default function SkillCheckModal({ target, onClose }: Props) {
  const { character, attrKey, skillKey, skillLabel } = target;
  const statSkillBase = skillBase(character, attrKey, skillKey);
  const isPlayer = character.type === "player";

  const [requestId] = useState(() => crypto.randomUUID());
  const [modifier, setModifier] = useState("0");
  const [dc, setDc] = useState("");
  const [notes, setNotes] = useState("");
  const [rollInput, setRollInput] = useState("");
  const [notified, setNotified] = useState(false);
  const [resolved, setResolved] = useState<SkillCheckResolved | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const modifierNum = Number(modifier) || 0;
  const dcNum = parseOptionalInt(dc);

  const preview = useMemo(() => {
    const rolls = parseManualDieRolls(rollInput);
    if (!rolls) return null;
    try {
      return evaluateSkillCheck({
        base: statSkillBase,
        modifier: modifierNum,
        dc: dcNum,
        dieRolls: rolls,
      });
    } catch {
      return null;
    }
  }, [rollInput, statSkillBase, modifierNum, dcNum]);

  useEffect(() => {
    return () => {
      if (notified && !resolved && isPlayer) {
        void window.api.cancelSkillCheck(character.id, requestId);
      }
    };
  }, [character.id, isPlayer, notified, requestId, resolved]);

  async function handleNotifyPlayer() {
    setError(null);
    setBusy(true);
    try {
      const request: SkillCheckRequest = {
        id: requestId,
        characterId: character.id,
        characterName: character.name,
        attrKey,
        skillKey,
        skillLabel,
        base: statSkillBase,
        modifier: modifierNum,
        dc: dcNum,
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
      };
      await window.api.requestSkillCheck(request);
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
      base: statSkillBase,
      modifier: modifierNum,
      dc: dcNum,
    });
    setRollInput(formatSkillCheckRolls(check.rolls));
  }

  async function handleResolve(simulate = false) {
    setError(null);
    setBusy(true);
    try {
      let check;
      if (simulate) {
        check = evaluateSkillCheck({
          base: statSkillBase,
          modifier: modifierNum,
          dc: dcNum,
        });
        setRollInput(formatSkillCheckRolls(check.rolls));
      } else {
        const rolls = parseManualDieRolls(rollInput);
        if (!rolls) {
          setError('Enter the d10 roll (e.g. "7" or "10,7" for crit chain).');
          setBusy(false);
          return;
        }
        check = evaluateSkillCheck({
          base: statSkillBase,
          modifier: modifierNum,
          dc: dcNum,
          dieRolls: rolls,
        });
      }

      const result = buildSkillCheckResolved({
        requestId,
        characterId: character.id,
        characterName: character.name,
        skillLabel,
        statSkillBase,
        modifier: modifierNum,
        dc: dcNum,
        check,
      });
      await window.api.resolveSkillCheck(result);
      setResolved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve check.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="create-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="create-modal create-modal--wide panel skill-check-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="create-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="create-modal-title">Skill check — {character.name}</h2>
        <p className="skill-check-hint">
          {skillLabel} · base <strong>{statSkillBase}</strong>
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
              d10 [{formatSkillCheckRolls(resolved.dieRolls)}] + {resolved.effectiveBase} ={" "}
              <strong>{resolved.total}</strong>
              {resolved.dc != null && (
                <>
                  {" "}
                  vs DC {resolved.dc} —{" "}
                  <strong
                    className={
                      resolved.success ? "skill-check-pass" : "skill-check-fail"
                    }
                  >
                    {resolved.success ? "Success" : "Failure"}
                  </strong>
                </>
              )}
            </p>
            {resolved.simulated && (
              <p className="skill-check-note">Simulated roll for NPC.</p>
            )}
            <button type="button" className="primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <div className="skill-check-form">
            <div className="skill-check-grid">
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

            <label>
              Notes (optional)
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Climb the crumbling wall"
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

            {preview && (
              <div className="skill-check-preview">
                Preview: {formatSkillCheckOutcome(preview)}
              </div>
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
                {isPlayer ? "Resolve" : rollInput.trim() ? "Resolve" : "Simulate & resolve"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
