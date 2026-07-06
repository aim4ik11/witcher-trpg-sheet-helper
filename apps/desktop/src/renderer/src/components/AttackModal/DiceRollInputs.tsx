import { GiD10 } from "react-icons/gi";
import type { CombatDefenseType } from "@wilmak/shared";

interface Props {
  isPlayerAttacker: boolean;
  isPlayerDefender: boolean;
  fastStrikeCount: number;
  attackerRollInput: string;
  onAttackerRollChange: (v: string) => void;
  defenderRollInputs: string[];
  onDefenderRollChange: (index: number, v: string) => void;
  resolvedDefenseType: CombatDefenseType;
  showAllDice: boolean;
  onToggleAllDice: () => void;
  damageDieRollInputs: string[];
  onDamageDieRollChange: (index: number, v: string) => void;
  weaponDmgExpression?: string;
}

export default function DiceRollInputs({
  isPlayerAttacker,
  isPlayerDefender,
  fastStrikeCount,
  attackerRollInput,
  onAttackerRollChange,
  defenderRollInputs,
  onDefenderRollChange,
  resolvedDefenseType,
  showAllDice,
  onToggleAllDice,
  damageDieRollInputs,
  onDamageDieRollChange,
  weaponDmgExpression,
}: Props) {
  return (
    <div className="attack-rolls">
      {/* Toggle button */}
      <div className="attack-rolls-header">
        <span className="attack-rolls-label">Dice rolls</span>
        <button
          type="button"
          className={`dice-toggle-btn${showAllDice ? " dice-toggle-btn--active" : ""}`}
          onClick={onToggleAllDice}
          title={showAllDice ? "Hide damage dice inputs" : "Enter all dice manually"}
        >
          <GiD10 />
          {showAllDice ? "Hide damage dice" : "Enter damage dice"}
        </button>
      </div>

      <div className="field">
        <label>Attacker d10{isPlayerAttacker ? "" : " (auto if empty)"}</label>
        <input
          value={attackerRollInput}
          onChange={(e) => onAttackerRollChange(e.target.value)}
          placeholder={isPlayerAttacker ? "e.g. 7 or 10,7" : "Leave empty to simulate"}
        />
      </div>

      {resolvedDefenseType !== "none" &&
        Array.from({ length: fastStrikeCount }, (_, i) => (
          <div key={i} className="field">
            <label>
              Defender d10
              {fastStrikeCount > 1 ? ` (strike #${i + 1})` : ""}
              {isPlayerDefender ? "" : " (auto if empty)"}
            </label>
            <input
              value={defenderRollInputs[i] ?? ""}
              onChange={(e) => onDefenderRollChange(i, e.target.value)}
              placeholder={isPlayerDefender ? "e.g. 6" : "Leave empty to simulate"}
            />
          </div>
        ))}

      {showAllDice &&
        Array.from({ length: fastStrikeCount }, (_, i) => (
          <div key={`dmg-${i}`} className="field">
            <label>
              Damage dice{fastStrikeCount > 1 ? ` (strike #${i + 1})` : ""}
              {weaponDmgExpression ? ` — ${weaponDmgExpression}` : ""}
              <span className="dice-optional-tag"> optional</span>
            </label>
            <input
              value={damageDieRollInputs[i] ?? ""}
              onChange={(e) => onDamageDieRollChange(i, e.target.value)}
              placeholder="e.g. 4,2 — leave empty to auto-roll"
            />
          </div>
        ))}
    </div>
  );
}
