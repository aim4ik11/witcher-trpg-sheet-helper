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

  const recentLog = combat.attackLog.slice(-8).reverse();

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
              + Add to combat
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

        <table className="combat-init-table">
          <thead>
            <tr>
              <th className="order">#</th>
              <th>Name</th>
              <th>Type</th>
              <th>HP</th>
              <th>Initiative</th>
              <th>Roll</th>
            </tr>
          </thead>
          <tbody>
            {combat.participants.map((p, index) => {
              const char = characterById.get(p.characterId);
              return (
                <tr
                  key={p.characterId}
                  className={
                    current?.index === index ? "combat-init-row--current" : undefined
                  }
                >
                  <td className="order">{index + 1}</td>
                  <td>
                    {p.name}
                    {current?.index === index && (
                      <span className="combat-acting-badge">acting</span>
                    )}
                    {!char && <span className="combat-orphan-badge">missing</span>}
                  </td>
                  <td className="kind">{p.type === "player" ? "Player" : "NPC"}</td>
                  <td className="hp">
                    {char ? `${char.vitals.hp.current}/${char.vitals.hp.max}` : "—"}
                  </td>
                  <td className="initiative">{p.initiative}</td>
                  <td className="breakdown">
                    {p.ref} + {formatDieRolls(p)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {recentLog.length > 0 && (
          <div className="combat-attack-log">
            <h3 className="combat-attack-log-title">Recent attacks</h3>
            <ul className="combat-attack-log-list">
              {recentLog.map((entry) => (
                <li key={entry.id} className="combat-attack-log-item">
                  <span
                    className={`combat-hit-badge combat-hit-badge--${entry.hit ? "hit" : "miss"}`}
                  >
                    {entry.hit ? "HIT" : "MISS"}
                  </span>
                  <span>
                    R{entry.round} {entry.attackerName} → {entry.targetName}
                    {entry.attackIndex ? ` (#${entry.attackIndex})` : ""}
                  </span>
                  <span className="combat-attack-log-detail">
                    {entry.attackRoll.total}
                    {entry.defenseRoll
                      ? ` vs ${entry.defenseRoll.total}`
                      : entry.defenseDc !== undefined
                        ? ` vs DC ${entry.defenseDc}`
                        : ""}
                    {entry.hit && entry.finalDamage !== undefined && (
                      <> · {entry.finalDamage} dmg ({entry.hitLocation})</>
                    )}
                    {entry.hit && entry.hpBefore !== undefined && entry.hpAfter !== undefined && (
                      <> · HP {entry.hpBefore}→{entry.hpAfter}</>
                    )}
                    {entry.hit && entry.critWoundTier !== "none" && (
                      <> · {formatCritWoundTier(entry.critWoundTier)}</>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
