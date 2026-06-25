import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Character } from "@wilmak/shared";
import { restCharacterVitals } from "@wilmak/game-data";
import { api } from "../../../api";

export function useCharacters() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const chars = await api.getCharacters();
      setCharacters(chars);
    } catch {
      setCharacters([]);
      navigate("/session");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return window.api.onCharactersChanged(() => void load());
  }, [load]);

  async function handleCreateCharacter(data: Partial<Character>) {
    await api.createCharacter(data);
    void load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    await api.deleteCharacter(id);
    void load();
  }

  async function handleRest(character: Character) {
    const rested = restCharacterVitals(character);
    await api.updateCharacter(rested.id, rested);
    setCharacters((prev) => prev.map((c) => (c.id === rested.id ? rested : c)));
  }

  async function handleUpdateCharacter(character: Character) {
    await api.updateCharacter(character.id, character);
    setCharacters((prev) => prev.map((c) => (c.id === character.id ? character : c)));
  }

  return {
    characters,
    loading,
    players: characters.filter((c) => c.type === "player"),
    enemies: characters.filter((c) => c.type === "enemy"),
    handleCreateCharacter,
    handleDelete,
    handleRest,
    handleUpdateCharacter,
  };
}
