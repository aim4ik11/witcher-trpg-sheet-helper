import type { Character, CombatAttackResult } from "@wilmak/shared";
import { formatCritWoundTier, formatDamageBreakdown } from "@wilmak/game-data";

interface Props {
  preview: CombatAttackResult[];
  target: Character | undefined;
  applyDamage: boolean;
  onApplyDamageChange: (v: boolean) => void;
}

function hpBarPct(hp: number, max: number): number {
  return Math.max(0, Math.min(100, (hp / Math.max(1, max)) * 100));
}

function hpFillClass(pct: number): "ok" | "mid" | "low" {
  return pct > 60 ? "ok" : pct > 25 ? "mid" : "low";
}

export default function DamagePreview({ preview, target, applyDamage, onApplyDamageChange }: Props) {
  const hpMax = target?.vitals.hp.max ?? 1;

  // Chain HP across multiple hits so before/after is accurate per attack
  let runningHp = target?.vitals.hp.current ?? 0;
  const resultsWithHp = preview.map((r) => {
    const hpBefore = runningHp;
    const hpAfter =
      r.hit && r.finalDamage !== undefined
        ? Math.max(0, runningHp - r.finalDamage)
        : runningHp;
    runningHp = hpAfter;
    return { r, hpBefore, hpAfter };
  });

  return (
    <div className="attack-modal-form">
      <label className="field-toggle">
        <span className="field-toggle-label">Apply damage to character sheet</span>
        <input
          type="checkbox"
          checked={applyDamage}
          onChange={(e) => onApplyDamageChange(e.target.checked)}
        />
      </label>

      <div className="damage-preview-list">
        {resultsWithHp.map(({ r, hpBefore, hpAfter }) => (
          <div
            key={r.id}
            className={`damage-result${r.hit ? " damage-result--hit" : " damage-result--miss"}`}
          >
            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="damage-result-head">
              {r.attackIndex !== undefined && (
                <span className="damage-result-idx">Strike #{r.attackIndex}</span>
              )}
              <span className={`damage-outcome damage-outcome--${r.hit ? "hit" : "miss"}`}>
                {r.hit ? "HIT" : "MISS"}
              </span>
              {r.hit && r.hitLocation && (
                <span className="damage-location">
                  {r.hitLocation} ×{r.locationMultiplier}
                </span>
              )}
              {r.hit && r.critWoundTier !== "none" && (
                <span className="damage-crit-tier">
                  {formatCritWoundTier(r.critWoundTier)}
                </span>
              )}
            </div>

            {/* ── Roll comparison ───────────────────────────────────────── */}
            <div className="damage-rolls">
              <span className="damage-roll-num">{r.attackRoll.total}</span>
              <span className="damage-roll-label">atk</span>
              {(r.defenseRoll || r.defenseDc !== undefined) && (
                <>
                  <span className="damage-roll-sep">vs</span>
                  <span className="damage-roll-num">
                    {r.defenseRoll ? r.defenseRoll.total : `DC ${r.defenseDc}`}
                  </span>
                  {r.defenseRoll && <span className="damage-roll-label">def</span>}
                </>
              )}
              {r.hit && r.defenseRoll && (
                <span className="damage-margin">
                  +{r.attackRoll.total - r.defenseRoll.total}
                </span>
              )}
            </div>

            {/* ── Damage breakdown ─────────────────────────────────────── */}
            {r.hit && (
              <ol className="damage-breakdown">
                {formatDamageBreakdown(r).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            )}

            {/* ── HP before → after ────────────────────────────────────── */}
            {r.hit && target && applyDamage && (
              <div className="damage-hp-delta">
                <div className="damage-hp-track-wrap">
                  <div className="damage-hp-track">
                    <div
                      className={`damage-hp-fill damage-hp-fill--${hpFillClass(hpBarPct(hpBefore, hpMax))}`}
                      style={{ width: `${hpBarPct(hpBefore, hpMax)}%` }}
                    />
                  </div>
                  <span className="damage-hp-val">{hpBefore} HP</span>
                </div>
                <span className="damage-hp-arrow">→</span>
                <div className="damage-hp-track-wrap">
                  <div className="damage-hp-track">
                    <div
                      className={`damage-hp-fill damage-hp-fill--${hpFillClass(hpBarPct(hpAfter, hpMax))}`}
                      style={{ width: `${hpBarPct(hpAfter, hpMax)}%` }}
                    />
                  </div>
                  <span className="damage-hp-val">{hpAfter} HP</span>
                </div>
                {r.finalDamage !== undefined && (
                  <span className="damage-hp-taken">−{r.finalDamage}</span>
                )}
              </div>
            )}

            {/* ── Critical wound effect ─────────────────────────────────── */}
            {r.hit && r.criticalWoundEffect && (
              <div className="damage-crit-effect">
                <span className="damage-crit-roll">Roll {r.criticalWoundRoll}:</span>
                {" "}
                {r.criticalWoundEffect}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
