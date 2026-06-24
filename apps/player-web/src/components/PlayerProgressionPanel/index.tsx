import { useState } from "react";
import type { Character } from "@wilmak/shared";
import {
  skillRaiseCost,
  statRaiseCost,
  spendSkillLevel,
  spendStatLevel,
  type ProgressionCharacter,
} from "@wilmak/game-data";
import { ATTRIBUTE_SKILLS } from "@wilmak/game-data";
import "../DmSessionControls/DmSessionControls.css";

interface Props {
  character: Character;
  onApply: (character: Character) => void;
}

export default function PlayerProgressionPanel({ character, onApply }: Props) {
  const [error, setError] = useState("");
  const ip = character.improvementPoints?.ip ?? 0;
  const trainingIp = character.improvementPoints?.trainingIp ?? 0;

  function trySpend(result: ReturnType<typeof spendSkillLevel>) {
    setError("");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onApply(result.character as Character);
  }

  if (!character.creation?.complete) return null;

  return (
    <section className="spend-panel">
      <div className="spend-panel-title">Spend improvement points</div>
      <div className="spend-panel-balances">
        <span>I.P. {ip}</span>
        <span>Training I.P. {trainingIp}</span>
      </div>
      <p className="spend-panel-hint">
        Skills cost I.P. equal to current level (×2 for difficult skills). Stats cost training
        I.P. equal to current level × 10. Use + on a skill or stat below when you have enough
        points.
      </p>
      {error && <p className="spend-error">{error}</p>}
    </section>
  );
}

interface SkillSpendProps {
  character: Character;
  attrKey: string;
  skillKey: string;
  label: string;
  special?: boolean;
  onApply: (character: Character) => void;
}

export function SkillSpendButton({
  character,
  attrKey,
  skillKey,
  onApply,
}: SkillSpendProps) {
  const level = character.skills?.[attrKey]?.[skillKey]?.level ?? 0;
  const special = ATTRIBUTE_SKILLS[attrKey]?.find((s) => s.key === skillKey)?.special;
  const actualCost = skillRaiseCost(level, special);
  const ip = character.improvementPoints?.ip ?? 0;
  const canSpend = ip >= actualCost && level < 10;

  return (
    <button
      type="button"
      className="spend-btn"
      disabled={!canSpend}
      title={`Costs ${actualCost} I.P.`}
      onClick={() => {
        const result = spendSkillLevel(
          character as ProgressionCharacter,
          attrKey,
          skillKey,
        );
        if (result.ok) onApply(result.character as Character);
      }}
    >
      +1 ({actualCost})
    </button>
  );
}

interface StatSpendProps {
  character: Character;
  attrKey: string;
  onApply: (character: Character) => void;
}

export function StatSpendButton({ character, attrKey, onApply }: StatSpendProps) {
  const level = character.attributes?.[attrKey] ?? 0;
  const cost = statRaiseCost(level);
  const train = character.improvementPoints?.trainingIp ?? 0;
  const canSpend = train >= cost && level < 10;

  return (
    <button
      type="button"
      className="spend-btn"
      disabled={!canSpend}
      title={`Costs ${cost} training I.P.`}
      onClick={() => {
        const result = spendStatLevel(character as ProgressionCharacter, attrKey);
        if (result.ok) onApply(result.character as Character);
      }}
    >
      +1 ({cost})
    </button>
  );
}
