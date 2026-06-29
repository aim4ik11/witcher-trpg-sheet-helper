import type { Character } from "@wilmak/shared";
import { raceLabel, occupationLabel } from "@wilmak/game-data";

interface Props {
  character: Character;
  hpMax: number;
  staMax: number;
  playerCanSpend: boolean;
}

function hpColorClass(current: number, max: number): "high" | "medium" | "low" {
  if (max === 0) return "low";
  const pct = current / max;
  if (pct > 0.6) return "high";
  if (pct > 0.25) return "medium";
  return "low";
}

function VitalBar({ label, current, max }: { label: string; current: number; max: number }) {
  const color = hpColorClass(current, max);
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div className="vital-bar-group">
      <span className="vital-bar-label">{label}</span>
      <div className="hp-bar-track">
        <div className={`hp-bar-fill hp-bar-fill--${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="vital-bar-val">
        <span className="vital-current">{current}</span>
        <span className="vital-sep">/</span>
        <span className="vital-max">{max}</span>
      </div>
    </div>
  );
}

export default function CharacterInfoBar({ character, hpMax, staMax, playerCanSpend }: Props) {
  const level = character.creation?.level ?? 1;
  const showLevel = character.creation?.complete === true;
  const luckUsed = character.luck?.used ?? 0;
  const luckMax = character.luck?.max ?? character.attributes?.luck ?? 0;
  const ip = character.improvementPoints?.ip ?? 0;
  const trainingIp = character.improvementPoints?.trainingIp ?? 0;
  const crowns = character.crowns ?? 0;
  const occupation = character.occupation || "";

  const metaParts = [
    character.race ? raceLabel(character.race) : "",
    occupation ? occupationLabel(occupation) : "",
  ].filter(Boolean);

  const showResources = luckMax > 0 || playerCanSpend || crowns > 0;

  return (
    <div className="char-info-bar">
      {metaParts.length > 0 && (
        <div className="char-info-identity">
          <span className="identity-meta">{metaParts.join(" · ")}</span>
          {character.nickname && (
            <span className="identity-nick"> · @{character.nickname}</span>
          )}
        </div>
      )}

      <div className="char-info-vitals">
        {showLevel && (
          <div className="level-badge">
            <span className="level-badge-label">LVL</span>
            <span className="level-badge-value">{level}</span>
          </div>
        )}
        <VitalBar label="HP" current={character.vitals.hp.current} max={hpMax} />
        <VitalBar label="STA" current={character.vitals.sta.current} max={staMax} />
        <div className="info-chip info-chip--static">
          <span className="chip-label">WT</span>
          <span className="chip-value">{character.vitals.woundThreshold}</span>
        </div>
      </div>

      {showResources && (
        <div className="char-info-resources">
          {luckMax > 0 && (
            <div className="luck-group">
              <span className="luck-group-label">Luck</span>
              <div className="luck-bar">
                {Array.from({ length: luckMax }).map((_, i) => (
                  <span
                    key={i}
                    className={`luck-pip luck-pip-static${i < luckUsed ? " used" : ""}`}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="info-chip info-chip--static info-chip--money">
            <span className="chip-label">Crowns</span>
            <span className="chip-value">{crowns}</span>
          </div>
          {playerCanSpend && (
            <>
              <div className="info-chip info-chip--static">
                <span className="chip-label">I.P.</span>
                <span className="chip-value">{ip}</span>
              </div>
              <div className="info-chip info-chip--static">
                <span className="chip-label">Train. I.P.</span>
                <span className="chip-value">{trainingIp}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
