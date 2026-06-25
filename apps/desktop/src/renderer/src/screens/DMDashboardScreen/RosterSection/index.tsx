import { useState } from "react";
import type { Character } from "@wilmak/shared";
import CreateCharacterModal from "../../../components/CreateCharacterModal";
import PlayerCharactersSection from "./PlayerCharactersSection";
import EnemiesSection from "./EnemiesSection";

interface Props {
  players: Character[];
  enemies: Character[];
  loading: boolean;
  credentialByNick: Map<string, string>;
  onOpen: (id: string) => void;
  onDelete: (id: string, name: string) => Promise<void>;
  onRest: (character: Character) => Promise<void>;
  onCreateCharacter: (data: Partial<Character>) => Promise<void>;
}

export default function RosterSection({
  players,
  enemies,
  loading,
  credentialByNick,
  onOpen,
  onDelete,
  onRest,
  onCreateCharacter,
}: Props) {
  const [createType, setCreateType] = useState<"player" | "enemy" | null>(null);

  async function handleCreate(data: Partial<Character>) {
    await onCreateCharacter(data);
    setCreateType(null);
  }

  return (
    <>
      <PlayerCharactersSection
        players={players}
        loading={loading}
        credentialByNick={credentialByNick}
        onOpen={onOpen}
        onDelete={onDelete}
        onRest={onRest}
        onCreatePlayer={() => setCreateType("player")}
      />
      <EnemiesSection
        enemies={enemies}
        onOpen={onOpen}
        onDelete={onDelete}
        onRest={onRest}
        onCreateEnemy={() => setCreateType("enemy")}
      />

      {createType && (
        <CreateCharacterModal
          type={createType}
          onSubmit={handleCreate}
          onClose={() => setCreateType(null)}
        />
      )}
    </>
  );
}
