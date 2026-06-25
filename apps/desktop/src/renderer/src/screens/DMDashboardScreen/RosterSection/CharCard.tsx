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

interface Props {
  character: Character;
  loginCode?: string;
  onOpen: () => void;
  onDelete: () => void;
  onRest: () => void;
}

export default function CharCard({ character, loginCode, onOpen, onDelete, onRest }: Props) {
  const isMonster = character.enemyKind === "monster";
  const profile = character.monsterProfile;
  const subtitleParts: string[] = [];
  const atFullHealth =
    character.vitals.hp.current >= character.vitals.hp.max &&
    character.vitals.sta.current >= character.vitals.sta.max;

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
    <div className="char-card">
      <div className="char-card-top">
        <div className="char-card-info">
          <button type="button" className="char-name-btn" onClick={onOpen}>
            {character.name}
          </button>
          {subtitleParts.length > 0 && (
            <div className="char-subtitle">{subtitleParts.join(" · ")}</div>
          )}
        </div>
        {threatBadge}
      </div>
      {character.type === "player" && (
        <div className="char-login-meta">
          <span>
            nick <span className="mono">{character.nickname || "—"}</span>
          </span>
          {loginCode && (
            <span>
              code <span className="code">{loginCode}</span>
            </span>
          )}
        </div>
      )}
      <div className="char-vitals">
        HP{" "}
        <span className="mono">
          {character.vitals.hp.current}/{character.vitals.hp.max}
        </span>
        <span className="char-vitals-sep">·</span>
        STA{" "}
        <span className="mono">
          {character.vitals.sta.current}/{character.vitals.sta.max}
        </span>
      </div>
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
