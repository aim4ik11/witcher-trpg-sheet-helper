import type { Character } from "@wilmak/shared";
import CharCard from "./CharCard";

interface Props {
  enemies: Character[];
  onOpen: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onRest: (character: Character) => void;
  onCreateEnemy: () => void;
}

export default function EnemiesSection({
  enemies,
  onOpen,
  onDelete,
  onRest,
  onCreateEnemy,
}: Props) {
  return (
    <section className="dm-section">
      <div className="dm-section-head">
        <h2>Enemies & NPCs</h2>
        <span className="badge badge--count">{enemies.length}</span>
        <div className="dm-section-actions">
          <button type="button" className="btn-sm" onClick={onCreateEnemy}>
            + New Enemy
          </button>
        </div>
      </div>
      {enemies.length === 0 ? (
        <p className="dm-section-hint">No enemies yet.</p>
      ) : (
        <div className="char-grid">
          {enemies.map((c) => (
            <CharCard
              key={c.id}
              character={c}
              onOpen={() => onOpen(c.id)}
              onDelete={() => onDelete(c.id, c.name)}
              onRest={() => onRest(c)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
