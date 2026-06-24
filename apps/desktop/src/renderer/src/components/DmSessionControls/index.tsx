import type { Character } from "@wilmak/shared";

interface CounterProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function Counter({ label, value, onChange }: CounterProps) {
  return (
    <label className="session-control">
      {label}
      <div className="session-control-btns">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))}>
          −
        </button>
        <span>{value}</span>
        <button type="button" onClick={() => onChange(value + 1)}>+</button>
      </div>
    </label>
  );
}

interface Props {
  character: Character;
  manualEdit: boolean;
  onManualEditChange: (v: boolean) => void;
  onChange: (patch: Partial<Character>) => void;
}

export default function DmSessionControls({
  character,
  manualEdit,
  onManualEditChange,
  onChange,
}: Props) {
  const ip = character.improvementPoints?.ip ?? 0;
  const trainingIp = character.improvementPoints?.trainingIp ?? 0;
  const level = character.creation?.level ?? 1;

  return (
    <section className="session-controls panel">
      <div className="session-controls-head">
        <div>
          <div className="panel-title">Session mode</div>
          <p className="session-controls-hint">
            Award I.P. and training points after play. Stats and skills are locked unless
            you enable manual edit.
          </p>
        </div>
        <label className="session-toggle">
          <input
            type="checkbox"
            checked={manualEdit}
            onChange={(e) => onManualEditChange(e.target.checked)}
          />
          Manual edit
        </label>
      </div>
      {!manualEdit && (
        <div className="session-controls-grid">
          <Counter
            label="Level"
            value={level}
            onChange={(v) =>
              onChange({
                creation: {
                  complete: true,
                  pointBuy: character.creation?.pointBuy ?? 70,
                  level: v,
                },
              })
            }
          />
          <Counter
            label="I.P."
            value={ip}
            onChange={(v) =>
              onChange({ improvementPoints: { ip: v, trainingIp } })
            }
          />
          <Counter
            label="Training I.P."
            value={trainingIp}
            onChange={(v) =>
              onChange({ improvementPoints: { ip, trainingIp: v } })
            }
          />
        </div>
      )}
    </section>
  );
}
