import type { Character, CombatDefenseType } from "@wilmak/shared";

function hpTier(pct: number): "ok" | "mid" | "low" {
  return pct > 60 ? "ok" : pct > 25 ? "mid" : "low";
}

function vitalPct(current: number, max: number): number {
  return Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
}

interface Props {
  attacker: Character;
  targets: Character[];
  target: Character | undefined;
  targetId: string;
  onTargetChange: (id: string) => void;
  effectiveAtkBase: number | null;
  attackModifier: number;
  defBaseValue: number | null;
  margin: number | null;
  resolvedDefenseType: CombatDefenseType;
  isThrown: boolean | undefined;
  targetArmorSp: { label: string; sp: number }[];
}

export default function CombatantStrip({
  attacker,
  targets,
  target,
  targetId,
  onTargetChange,
  effectiveAtkBase,
  attackModifier,
  defBaseValue,
  margin,
  resolvedDefenseType,
  isThrown,
  targetArmorSp,
}: Props) {
  const atkHpPct = vitalPct(attacker.vitals.hp.current, attacker.vitals.hp.max);
  const atkStaPct = vitalPct(attacker.vitals.sta.current, attacker.vitals.sta.max);
  const atkWounded = attacker.vitals.hp.current < attacker.vitals.woundThreshold;

  const tgtHpPct = target ? vitalPct(target.vitals.hp.current, target.vitals.hp.max) : 0;
  const tgtStaPct = target ? vitalPct(target.vitals.sta.current, target.vitals.sta.max) : 0;
  const tgtWounded = target ? target.vitals.hp.current < target.vitals.woundThreshold : false;

  const edgeClass =
    margin === null ? "none" : margin >= 4 ? "strong" : margin >= -3 ? "even" : "weak";

  return (
    <div className="attack-vs-strip">
      {/* Attacker */}
      <div className="attack-vs-card">
        <div className="attack-vs-role">Attacker</div>
        <div className="attack-vs-name">
          {attacker.name}
          <span className="attack-vs-type-pill">
            {attacker.type === "player" ? "Player" : "NPC"}
          </span>
          {atkWounded && <span className="combat-wounded-badge">wounded</span>}
        </div>
        <div className="attack-vital-wrap">
          <div className="attack-vital-row">
            <div className="attack-vital-bar">
              <div
                className={`attack-vital-fill attack-vital-fill--${hpTier(atkHpPct)}`}
                style={{ width: `${atkHpPct}%` }}
              />
            </div>
            <span className="attack-vital-text">
              {attacker.vitals.hp.current}/{attacker.vitals.hp.max} HP
            </span>
          </div>
          <div className="attack-vital-row">
            <div className="attack-vital-bar attack-vital-bar--sta">
              <div
                className="attack-vital-fill attack-vital-fill--sta"
                style={{ width: `${atkStaPct}%` }}
              />
            </div>
            <span className="attack-vital-text attack-vital-text--sta">
              {attacker.vitals.sta.current}/{attacker.vitals.sta.max} STA
            </span>
          </div>
        </div>
        {effectiveAtkBase !== null && (
          <div className="attack-vs-stat">
            <span className="attack-vs-stat-label">Atk base</span>
            <span className="attack-vs-stat-val">{effectiveAtkBase}</span>
            {attackModifier !== 0 && (
              <span className="attack-vs-stat-mod">
                ({attackModifier > 0 ? "+" : ""}
                {attackModifier} type)
              </span>
            )}
          </div>
        )}
      </div>

      {/* VS divider */}
      <div className="attack-vs-divider">
        <span className="attack-vs-badge">VS</span>
        {margin !== null && (
          <span className={`attack-vs-edge attack-vs-edge--${edgeClass}`}>
            {margin >= 0 ? `+${margin}` : String(margin)}
          </span>
        )}
      </div>

      {/* Target */}
      <div className="attack-vs-card attack-vs-card--target">
        <div className="attack-vs-role">Target</div>
        <select
          className="attack-vs-target-select"
          value={targetId}
          onChange={(e) => onTargetChange(e.target.value)}
        >
          {targets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type === "player" ? "Player" : "NPC"})
            </option>
          ))}
        </select>
        {target && (
          <>
            {tgtWounded && <span className="combat-wounded-badge">wounded</span>}
            <div className="attack-vital-wrap">
              <div className="attack-vital-row">
                <div className="attack-vital-bar">
                  <div
                    className={`attack-vital-fill attack-vital-fill--${hpTier(tgtHpPct)}`}
                    style={{ width: `${tgtHpPct}%` }}
                  />
                </div>
                <span className="attack-vital-text">
                  {target.vitals.hp.current}/{target.vitals.hp.max} HP
                </span>
              </div>
              <div className="attack-vital-row">
                <div className="attack-vital-bar attack-vital-bar--sta">
                  <div
                    className="attack-vital-fill attack-vital-fill--sta"
                    style={{ width: `${tgtStaPct}%` }}
                  />
                </div>
                <span className="attack-vital-text attack-vital-text--sta">
                  {target.vitals.sta.current}/{target.vitals.sta.max} STA
                </span>
              </div>
            </div>
            {defBaseValue !== null && (
              <div className="attack-vs-stat">
                <span className="attack-vs-stat-label">Def base</span>
                <span className="attack-vs-stat-val">{defBaseValue}</span>
                {resolvedDefenseType === "parry" && (
                  <span className="attack-vs-stat-mod">
                    {isThrown ? "(−5 thrown)" : "(−3 parry)"}
                  </span>
                )}
              </div>
            )}
            {targetArmorSp.length > 0 && (
              <div className="attack-armor-slots">
                {targetArmorSp.map(({ label, sp }) => (
                  <div key={label} className="attack-armor-cell">
                    <span className="attack-armor-cell-label">{label}</span>
                    <span className="attack-armor-cell-sp">{sp}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
