import type { SkillCheckRequest, SkillCheckResolved } from "@wilmak/shared";
import { formatSkillCheckRolls } from "@wilmak/game-data";
import "./SkillCheckBanner.css";

interface Props {
  pending: SkillCheckRequest | null;
  resolved: SkillCheckResolved | null;
  onDismissResolved: () => void;
}

export default function SkillCheckBanner({
  pending,
  resolved,
  onDismissResolved,
}: Props) {
  if (!pending && !resolved) return null;

  return (
    <div className="skill-check-banner-wrap">
      {pending && (
        <div className="skill-check-banner skill-check-banner--pending panel">
          <div className="skill-check-banner-title">Skill check requested</div>
          <p className="skill-check-banner-body">
            Roll <strong>{pending.skillLabel}</strong> (base {pending.base}
            {pending.modifier !== 0 && (
              <>
                {" "}
                {pending.modifier > 0 ? "+" : ""}
                {pending.modifier}
              </>
            )}
            ){pending.dc != null && <> vs DC {pending.dc}</>}.
          </p>
          {pending.notes && (
            <p className="skill-check-banner-notes">{pending.notes}</p>
          )}
          <p className="skill-check-banner-hint">
            Roll your d10 and tell your GM the result.
          </p>
        </div>
      )}

      {resolved && (
        <div className="skill-check-banner skill-check-banner--resolved panel">
          <div className="skill-check-banner-head">
            <div className="skill-check-banner-title">Skill check result</div>
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
            <strong>{resolved.skillLabel}</strong>: d10 [
            {formatSkillCheckRolls(resolved.dieRolls)}] + {resolved.effectiveBase} ={" "}
            <strong>{resolved.total}</strong>
            {resolved.dc != null && (
              <>
                {" "}
                vs DC {resolved.dc} —{" "}
                <span
                  className={
                    resolved.success ? "skill-check-banner-pass" : "skill-check-banner-fail"
                  }
                >
                  {resolved.success ? "Success" : "Failure"}
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
        </div>
      )}
    </div>
  );
}
