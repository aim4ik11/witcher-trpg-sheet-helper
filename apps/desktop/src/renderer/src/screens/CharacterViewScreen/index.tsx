import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Character } from "@wilmak/shared";
import { api } from "../../api";
import CharacterSheet from "../../components/CharacterSheet";
import SkillCheckModal, {
  type SkillCheckTarget,
} from "../../components/SkillCheckModal";

export default function CharacterViewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [skillCheck, setSkillCheck] = useState<SkillCheckTarget | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const char = await api.getCharacter(id);
      setCharacter(char);
    } catch {
      navigate("/session");
    }
  }, [id, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    return window.api.onCharacterUpdated((updated) => {
      if (updated.id === id) setCharacter(updated);
    });
  }, [id]);

  async function handleChange(updated: Character) {
    setCharacter(updated);
    await api.updateCharacter(updated.id, updated);
  }

  if (!character) return <p className="loading-msg">Loading...</p>;

  return (
    <>
      <CharacterSheet
        character={character}
        onChange={handleChange}
        isDM
        onBack={() => navigate("/session")}
        backLabel="← DM Console"
        onSkillCheck={(params) =>
          setSkillCheck({ character, ...params })
        }
      />
      {skillCheck && (
        <SkillCheckModal
          target={skillCheck}
          onClose={() => setSkillCheck(null)}
        />
      )}
    </>
  );
}
