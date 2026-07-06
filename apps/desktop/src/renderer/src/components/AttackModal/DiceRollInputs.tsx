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
}: Props) {
  return (
    <div className="attack-rolls">
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
    </div>
  );
}
