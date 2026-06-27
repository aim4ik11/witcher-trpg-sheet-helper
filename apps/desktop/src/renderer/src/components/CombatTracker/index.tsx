import { useMemo, useState } from "react";
import type { Character, CombatState } from "@wilmak/shared";
import {
  advanceTurn,
  applyAttackToCombatState,
  formatCritWoundTier,
  formatDieRolls,
  getCurrentParticipant,
} from "@wilmak/game-data";
import AttackModal, { type AttackSubmitPayload } from "../AttackModal";
import "../AttackModal/AttackModal.css";
import "../StartCombatModal/StartCombatModal.css";

interface Props {
  combat: CombatState;
  characters: Character[];
  onCombatChange: (combat: CombatState) => void | Promise<void>;
  onUpdateCharacter: (character: Character) => void | Promise<void>;
  onAdd: () => void;
  onEnd: () => void | Promise<void>;
  canAdd?: boolean;
}

export default function CombatTracker({
  combat,
  characters,
  onCombatChange,
  onUpdateCharacter,
  onAdd,
  onEnd,
  canAdd = true,
}: Props) {
  const current = getCurrentParticipant(combat);
  const [attackOpen, setAttackOpen] = useState(false);

  const characterById = useMemo(
    () => new Map(characters.map((c) => [c.id, c])),
    [characters],
  );

  const attackerCharacter =
    current && characterById.get(current.participant.characterId);

  const orphanParticipants = combat.participants.filter(
    (p) => !characterById.has(p.characterId),
  );

  const damageTaken = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of combat.attackLog) {
      if (entry.hit && entry.finalDamage !== undefined) {
        map.set(entry.targetId, (map.get(entry.targetId) ?? 0) + entry.finalDamage);
      }
    }
    return map;
  }, [combat.attackLog]);

  async function handleAttackSubmit(payload: AttackSubmitPayload) {
    for (const character of payload.updatedCharacters) {
      await onUpdateCharacter(character);
    }
    const next = applyAttackToCombatState(combat, payload.results);
    await onCombatChange(next);
    setAttackOpen(false);
  }

  async function handleNextTurn() {
    await onCombatChange(advanceTurn(combat));
  }

  const recentLog = combat.attackLog.slice(-10).reverse();

  return (
    <>
      <div className="combat-tracker">
        <div className="combat-tracker-head">
          <div>
            <div className="combat-tracker-title">Combat</div>
            <div className="combat-tracker-round">
              Round {combat.round}
              {current && (
                <span className="combat-current-turn">
                  · Acting: <strong>{current.participant.name}</strong>
                </span>
              )}
            </div>
          </div>
          <div className="combat-tracker-actions">
            {current && attackerCharacter && (
              <button
                type="button"
                className="primary btn-sm"
                onClick={() => setAttackOpen(true)}
              >
                Attack
              </button>
            )}
            <button type="button" className="btn-sm" onClick={() => void handleNextTurn()}>
              Next turn
            </button>
            <button type="button" className="btn-sm" onClick={onAdd} disabled={!canAdd}>
              + Add
            </button>
            <button type="button" className="btn-sm danger" onClick={() => void onEnd()}>
              End combat
            </button>
          </div>
        </div>

        {orphanParticipants.length > 0 && (
          <p className="combat-orphan-warning">
            {orphanParticipants.length} combatant(s) no longer on roster:{" "}
            {orphanParticipants.map((p) => p.name).join(", ")}
          </p>
        )}

        <div className="combat-body">
          <div className="combat-initiative-list">
            {combat.participants.map((p, index) => {
              const char = characterById.get(p.characterId);
              const isCurrent = current?.index === index;
              const hpCurrent = char?.vitals.hp.current ?? 0;
              const hpMax = char?.vitals.hp.max ?? 1;
              const staCurrent = char?.vitals.sta.current ?? 0;
              const staMax = char?.vitals.sta.max ?? 1;
              const hpPct = Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100));
              const staPct = Math.max(0, Math.min(100, (staCurrent / staMax) * 100));
              const hpTier = hpPct > 60 ? "ok" : hpPct > 25 ? "mid" : "low";
              const isWounded = char && hpCurrent < char.vitals.woundThreshold;
              const dmg = damageTaken.get(p.characterId);

              return (
                <div
                  key={p.characterId}
                  className={`combat-card${isCurrent ? " combat-card--current" : ""}`}
                >
                  <div className="combat-card-order">{index + 1}</div>

                  <div className="combat-card-body">
                    <div className="combat-card-name-row">
                      <span className="combat-card-name">{p.name}</span>
                      <span className="combat-type-pill">
                        {p.type === "player" ? "Player" : "NPC"}
                      </span>
                      {isCurrent && <span className="combat-acting-badge">acting</span>}
                      {isWounded && <span className="combat-wounded-badge">wounded</span>}
                      {!char && <span className="combat-orphan-badge">missing</span>}
                      {dmg !== undefined && (
                        <span className="combat-dmg-taken">{dmg} dmg</span>
                      )}
                    </div>

                    {char ? (
                      <div className="combat-card-vitals">
                        <div className="combat-vital-row">
                          <div className="combat-vital-bar">
                            <div
                              className={`combat-vital-fill combat-vital-fill--${hpTier}`}
                              style={{ width: `${hpPct}%` }}
                            />
                          </div>
                          <span className="combat-vital-text">
                            {hpCurrent}/{hpMax} HP
                          </span>
                        </div>
                        <div className="combat-vital-row combat-vital-row--sta">
                          <div className="combat-vital-bar combat-vital-bar--sta">
                            <div
                              className="combat-vital-fill combat-vital-fill--sta"
                              style={{ width: `${staPct}%` }}
                            />
                          </div>
                          <span className="combat-vital-text combat-vital-text--sta">
                            {staCurrent}/{staMax} STA
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="combat-vital-text">—</span>
                    )}
                  </div>

                  <div className="combat-card-init">
                    <div className="combat-card-init-val">{p.initiative}</div>
                    <div className="combat-card-init-break">
                      {p.ref}+{formatDieRolls(p)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="combat-log-panel">
            <h3 className="combat-attack-log-title">Recent attacks</h3>
            {recentLog.length === 0 ? (
              <p className="combat-log-empty">No attacks yet this combat.</p>
            ) : (
              <ul className="combat-attack-log-list">
                {recentLog.map((entry) => (
                  <li key={entry.id} className="combat-attack-log-item">
                    <div className="combat-log-item-head">
                      <span
                        className={`combat-hit-badge combat-hit-badge--${entry.hit ? "hit" : "miss"}`}
                      >
                        {entry.hit ? "HIT" : "MISS"}
                      </span>
                      <span className="combat-log-who">
                        R{entry.round} {entry.attackerName} → {entry.targetName}
                        {entry.attackIndex ? ` (#${entry.attackIndex})` : ""}
                      </span>
                    </div>
                    <div className="combat-attack-log-detail">
                      {entry.attackRoll.total}
                      {entry.defenseRoll
                        ? ` vs ${entry.defenseRoll.total}`
                        : entry.defenseDc !== undefined
                          ? ` vs DC ${entry.defenseDc}`
                          : ""}
                      {entry.hit && entry.finalDamage !== undefined && (
                        <> · <strong>{entry.finalDamage} dmg</strong> ({entry.hitLocation})</>
                      )}
                      {entry.hit &&
                        entry.hpBefore !== undefined &&
                        entry.hpAfter !== undefined && (
                          <> · HP {entry.hpBefore}→{entry.hpAfter}</>
                        )}
                      {entry.hit && entry.critWoundTier !== "none" && (
                        <> · {formatCritWoundTier(entry.critWoundTier)}</>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {attackOpen && attackerCharacter && (
        <AttackModal
          combat={combat}
          attacker={attackerCharacter}
          characters={characters}
          onSubmit={handleAttackSubmit}
          onClose={() => setAttackOpen(false)}
        />
      )}
    </>
  );
}
