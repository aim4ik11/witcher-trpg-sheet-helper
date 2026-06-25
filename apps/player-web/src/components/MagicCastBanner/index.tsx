import type { MagicCastRequest, MagicCastResolved } from "@wilmak/shared";
import { formatMagicCastRolls } from "@wilmak/game-data";
import "../SkillCheckBanner/SkillCheckBanner.css";
import "./MagicCastBanner.css";

interface Props {
  pending: MagicCastRequest | null;
  resolved: MagicCastResolved | null;
  onDismissResolved: () => void;
}

export default function MagicCastBanner({
  pending,
  resolved,
  onDismissResolved,
}: Props) {
  if (!pending && !resolved) return null;

  return (
    <div className="skill-check-banner-wrap">
      {pending && (
        <div className="skill-check-banner skill-check-banner--pending panel magic-cast-banner">
          <div className="skill-check-banner-title">Magic cast requested</div>
          <p className="skill-check-banner-body">
            Cast <strong>{pending.spellName}</strong> ({pending.element}) — Spell Casting
            base {pending.base}
            {pending.modifier !== 0 && (
              <>
                {" "}
                {pending.modifier > 0 ? "+" : ""}
                {pending.modifier}
              </>
            )}
            ){pending.dc != null && <> vs DC {pending.dc}</>}. STA cost{" "}
            <strong>{pending.staCost}</strong> (vigor threshold {pending.vigorThreshold}).
          </p>
          {pending.notes && (
            <p className="skill-check-banner-notes">{pending.notes}</p>
          )}
          <p className="skill-check-banner-hint">
            Roll your d10 for Spell Casting and tell your GM the result.
          </p>
        </div>
      )}

      {resolved && (
        <div className="skill-check-banner skill-check-banner--resolved panel magic-cast-banner">
          <div className="skill-check-banner-head">
            <div className="skill-check-banner-title">Magic cast result</div>
            <button
              type="button"
              className="skill-check-banner-dismiss"
              onClick={onDismissResolved}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
          <p className="skill-check-banner-body">
            <strong>{resolved.spellName}</strong>: d10 [
            {formatMagicCastRolls(resolved.dieRolls)}] + {resolved.effectiveBase} ={" "}
            <strong>{resolved.total}</strong>
            {resolved.dc != null && (
              <>
                {" "}
                vs DC {resolved.dc} —{" "}
                <span
                  className={
                    resolved.spellSucceeds
                      ? "skill-check-banner-pass"
                      : "skill-check-banner-fail"
                  }
                >
                  {resolved.spellSucceeds ? "Spell succeeds" : "Spell fails"}
                </span>
              </>
            )}
            {resolved.outcome === "critical" && (
              <span className="skill-check-banner-crit"> · Critical!</span>
            )}
            {resolved.outcome === "fumble" && (
              <span className="skill-check-banner-fumble"> · Fumble!</span>
            )}
          </p>
          <p className="magic-cast-banner-vitals">
            STA {resolved.staBefore} → {resolved.staAfter}
            {resolved.overexertionHp > 0 && ` · HP −${resolved.overexertionHp} overexertion`}
          </p>
        </div>
      )}
    </div>
  );
}
