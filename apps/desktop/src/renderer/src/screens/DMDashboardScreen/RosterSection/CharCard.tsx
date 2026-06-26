import type { Character } from "@wilmak/shared";
import { raceLabel, occupationLabel } from "@wilmak/game-data";

function threatBadgeClass(threat: string): string {
  const t = threat.toLowerCase();
  if (t.includes("deadly") || t.includes("hard") || t.includes("difficult"))
    return "badge badge--danger";
  if (t.includes("easy") || t.includes("simple") || t.includes("medium"))
    return "badge badge--gold";
  return "badge badge--muted";
}

function hpFillClass(pct: number): string {
  if (pct > 0.6) return "char-vital-fill char-vital-fill--ok";
  if (pct > 0.3) return "char-vital-fill char-vital-fill--mid";
  return "char-vital-fill char-vital-fill--low";
}

interface Props {
  character: Character;
  loginCode?: string;
  onOpen: () => void;
  onDelete: () => void;
  onRest: () => void;
}

export default function CharCard({ character, loginCode, onOpen, onDelete, onRest }: Props) {
  const isMonster = character.enemyKind === "monster";
  const isPlayer = character.type === "player";
  const profile = character.monsterProfile;

  const hp = character.vitals.hp;
  const sta = character.vitals.sta;
  const hpPct = hp.max > 0 ? hp.current / hp.max : 0;
  const staPct = sta.max > 0 ? sta.current / sta.max : 0;
  const atFullHealth = hp.current >= hp.max && sta.current >= sta.max;
  const wounded = hp.current < character.vitals.woundThreshold;

  const woundCount = character.wounds?.filter((w) => w.days > 0).length ?? 0;
  const statusCount = character.statusEffects?.length ?? 0;

  const level = character.creation?.level;
  const ip = character.improvementPoints?.ip ?? 0;
  const trainingIp = character.improvementPoints?.trainingIp ?? 0;

  const subtitleParts: string[] = [];
  if (isMonster && profile?.monsterType) {
    subtitleParts.push(profile.monsterType);
  } else {
    if (character.race) subtitleParts.push(raceLabel(character.race));
    if (character.occupation) subtitleParts.push(occupationLabel(character.occupation));
  }

  const threatBadge =
    character.type === "enemy" &&
    (profile?.threat ? (
      <span className={threatBadgeClass(profile.threat)}>
        {profile.threat.split("/")[0]?.trim() ?? profile.threat}
      </span>
    ) : !isMonster ? (
      <span className="badge badge--muted">NPC</span>
    ) : null);

  return (
    <div className={`char-card${wounded ? " char-card--wounded" : ""}`}>
      {/* ── Header ───────────────────────────────────────── */}
      <div className="char-card-top">
        <div className="char-card-info">
          <button type="button" className="char-name-btn" onClick={onOpen}>
            {character.name}
          </button>
          {subtitleParts.length > 0 && (
            <div className="char-subtitle">{subtitleParts.join(" · ")}</div>
          )}
        </div>
        <div className="char-card-badges">
          {isPlayer && level != null && (
            <span className="badge badge--muted">Lv {level}</span>
          )}
          {threatBadge}
        </div>
      </div>

      {/* ── Player meta ──────────────────────────────────── */}
      {isPlayer && (
        <div className="char-login-meta">
          <span>
            nick <span className="mono">{character.nickname || "—"}</span>
          </span>
          {loginCode && (
            <span>
              code <span className="code">{loginCode}</span>
            </span>
          )}
          {(ip > 0 || trainingIp > 0) && (
            <span>
              I.P. <span className="mono">{ip}</span>
              {trainingIp > 0 && (
                <> · T.I.P. <span className="mono">{trainingIp}</span></>
              )}
            </span>
          )}
        </div>
      )}

      {/* ── Vitals ───────────────────────────────────────── */}
      <div className="char-vitals-section">
        <div className="char-vital">
          <div className="char-vital-row">
            <span className="char-vital-label">HP</span>
            <span className="char-vital-value">
              {hp.current}<span className="char-vital-max">/{hp.max}</span>
            </span>
          </div>
          <div className="char-vital-track">
            <div
              className={hpFillClass(hpPct)}
              style={{ width: `${Math.min(100, hpPct * 100)}%` }}
            />
          </div>
        </div>
        <div className="char-vital">
          <div className="char-vital-row">
            <span className="char-vital-label">STA</span>
            <span className="char-vital-value">
              {sta.current}<span className="char-vital-max">/{sta.max}</span>
            </span>
          </div>
          <div className="char-vital-track">
            <div
              className="char-vital-fill char-vital-fill--sta"
              style={{ width: `${Math.min(100, staPct * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Wounds & status effects ───────────────────────── */}
      {(woundCount > 0 || statusCount > 0) && (
        <div className="char-status-row">
          {woundCount > 0 && (
            <span className="badge badge--danger">
              {woundCount} wound{woundCount > 1 ? "s" : ""}
            </span>
          )}
          {statusCount > 0 && (
            <span className="badge badge--muted">
              {statusCount} effect{statusCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* ── Monster environment hint ──────────────────────── */}
      {isMonster && profile?.environment && (
        <div className="char-monster-env">{profile.environment}</div>
      )}

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="char-card-actions">
        <button type="button" className="btn-sm" onClick={onOpen}>
          Open sheet
        </button>
        <button
          type="button"
          className="btn-sm"
          onClick={onRest}
          disabled={atFullHealth}
          title={atFullHealth ? "Already at full HP and STA" : "Restore HP and STA to max"}
        >
          Rest
        </button>
        <button type="button" className="danger btn-sm" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
