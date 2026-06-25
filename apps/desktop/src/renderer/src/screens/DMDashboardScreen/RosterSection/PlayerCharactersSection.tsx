import type { Character } from "@wilmak/shared";
import { normalizeNickname } from "../../../utils/session";
import CharCard from "./CharCard";

interface Props {
  players: Character[];
  loading: boolean;
  credentialByNick: Map<string, string>;
  onOpen: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onRest: (character: Character) => void;
  onCreatePlayer: () => void;
}

export default function PlayerCharactersSection({
  players,
  loading,
  credentialByNick,
  onOpen,
  onDelete,
  onRest,
  onCreatePlayer,
}: Props) {
  return (
    <section className="dm-section">
      <div className="dm-section-head">
        <h2>Player characters</h2>
        <span className="badge badge--count">{players.length}</span>
        <div className="dm-section-actions">
          <button type="button" className="primary btn-sm" onClick={onCreatePlayer}>
            + New Player
          </button>
        </div>
      </div>
      {loading ? (
        <p className="dm-section-hint">Loading...</p>
      ) : players.length === 0 ? (
        <p className="dm-section-hint">
          No character sheets yet. Creating one also adds a login invite if needed.
        </p>
      ) : (
        <div className="char-grid">
          {players.map((c) => (
            <CharCard
              key={c.id}
              character={c}
              loginCode={c.nickname ? credentialByNick.get(normalizeNickname(c.nickname)) : undefined}
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
