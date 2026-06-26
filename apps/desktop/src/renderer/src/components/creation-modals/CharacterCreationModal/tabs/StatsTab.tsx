import { useState } from "react";
import { ATTRIBUTES, POINT_BUY_OPTIONS } from "@wilmak/game-data";
import Stepper from "../../../Stepper";
import ValueInputModal from "../../../ValueInputModal";

interface Props {
  pointBuy: number;
  onPointBuyChange: (v: number) => void;
  level: number;
  onLevelChange: (v: number) => void;
  attributes: Record<string, number>;
  onAttributeChange: (key: string, v: number) => void;
  pickupBudget: number;
}

export default function StatsTab({
  pointBuy,
  onPointBuyChange,
  level,
  onLevelChange,
  attributes,
  onAttributeChange,
  pickupBudget,
}: Props) {
  const [editingStat, setEditingStat] = useState<{ key: string; label: string } | null>(null);
  const [editingLevel, setEditingLevel] = useState(false);

  function validateStat(key: string, value: number): string | null {
    const current = attributes[key] ?? 1;
    const total = Object.values(attributes).reduce((a, b) => a + b, 0);
    const newTotal = total - current + value;
    if (newTotal > pointBuy) {
      return `Total ${newTotal} exceeds budget of ${pointBuy}`;
    }
    return null;
  }

  return (
    <>
      <div className="wizard-row">
        <div className="field">
          <label>Campaign power</label>
          <select value={pointBuy} onChange={(e) => onPointBuyChange(Number(e.target.value))}>
            {POINT_BUY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field wizard-level-row">
          <label>Level</label>
          <Stepper value={level} min={1} max={99} onChange={onLevelChange} onValClick={() => setEditingLevel(true)} />
        </div>
      </div>
      <p className="wizard-hint">
        Distribute {pointBuy} points across stats (min 1, max 10 each). Pickup skill budget
        = INT + REF = {pickupBudget}.
      </p>
      <div className="wizard-stat-grid">
        {Object.entries(ATTRIBUTES).map(([key, attr]) => (
          <div key={key} className="wizard-stat">
            <span className="wizard-stat-label">{attr.short}</span>
            <Stepper
              value={attributes[key] ?? 1}
              min={1}
              max={10}
              onValClick={() => setEditingStat({ key, label: attr.label })}
              onChange={(v) => onAttributeChange(key, v)}
            />
          </div>
        ))}
      </div>
      <p className="wizard-counter">
        Stat points: {Object.values(attributes).reduce((a, b) => a + b, 0)} / {pointBuy}
      </p>

      {editingLevel && (
        <ValueInputModal
          type="number"
          title="Level"
          initial={level}
          min={1}
          max={99}
          onConfirm={(v) => { onLevelChange(v); setEditingLevel(false); }}
          onClose={() => setEditingLevel(false)}
        />
      )}

      {editingStat && (
        <ValueInputModal
          type="number"
          title={editingStat.label}
          initial={attributes[editingStat.key] ?? 1}
          min={1}
          max={10}
          validate={(v) => validateStat(editingStat.key, v)}
          onConfirm={(v) => {
            const val = Math.min(v, 10);
            onAttributeChange(editingStat.key, val);
            setEditingStat(null);
          }}
          onClose={() => setEditingStat(null)}
        />
      )}
    </>
  );
}
