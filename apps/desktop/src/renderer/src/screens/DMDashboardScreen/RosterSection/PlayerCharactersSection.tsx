import { useMemo, useState } from "react";
import type { Character } from "@wilmak/shared";
import { normalizeNickname } from "../../../utils/session";
import AssignPlayerModal from "../../../components/creation-modals/AssignPlayerModal";
import CharCard from "./CharCard";

interface Props {
  players: Character[];
  loading: boolean;
  credentialByNick: Map<string, string>;
  onOpen: (id: string) => void;
  onAssign: (charId: string, nickname: string) => Promise<void>;
  onUnassign: (id: string) => Promise<void>;
  onDelete: (id: string, name: string) => void;
  onRest: (character: Character) => void;
  onCreatePlayer: () => void;
}

export default function PlayerCharactersSection({
  players,
  loading,
  credentialByNick,
  onOpen,
  onAssign,
  onUnassign,
  onDelete,
  onRest,
  onCreatePlayer,
}: Props) {
  const [assigningChar, setAssigningChar] = useState<Character | null>(null);

  const availablePlayers = useMemo(() => {
    const assignedNicks = new Set(
      players
        .filter((c) => c.nickname)
        .map((c) => normalizeNickname(c.nickname!)),
    );
    return [...credentialByNick.keys()].filter((nick) => !assignedNicks.has(nick));
  }, [players, credentialByNick]);

  async function handleAssignSubmit(nickname: string) {
    if (!assigningChar) return;
    await onAssign(assigningChar.id, nickname);
    setAssigningChar(null);
  }

  return (
    <>
      <section className="dm-section">
        <div className="dm-section-head">
          <h2>Player characters</h2>
          <span className="badge badge--count">{players.length}</span>
          <div className="dm-section-actions">
            <button type="button" className="primary btn-sm" onClick={onCreatePlayer}>
              + New Character
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
                loginCode={
                  c.nickname
                    ? credentialByNick.get(normalizeNickname(c.nickname))
                    : undefined
                }
                onOpen={() => onOpen(c.id)}
                onAssign={!c.nickname ? () => setAssigningChar(c) : undefined}
                onUnassign={c.nickname ? () => onUnassign(c.id) : undefined}
                onDelete={() => onDelete(c.id, c.name)}
                onRest={() => onRest(c)}
              />
            ))}
          </div>
        )}
      </section>

      {assigningChar && (
        <AssignPlayerModal
          character={assigningChar}
          availablePlayers={availablePlayers}
          onAssign={handleAssignSubmit}
          onClose={() => setAssigningChar(null)}
        />
      )}
    </>
  );
}
