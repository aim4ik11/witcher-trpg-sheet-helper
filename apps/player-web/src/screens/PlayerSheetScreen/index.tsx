import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Character, SkillCheckRequest, SkillCheckResolved } from "@wilmak/shared";
import { fetchPlayerCharacter, getToken, clearToken, updatePlayerCharacter } from "../../api";
import {
  disconnectPlayerSocket,
  getPlayerSocket,
  watchSessionResume,
} from "../../socket";
import CharacterSheet from "../../components/CharacterSheet";
import SkillCheckBanner from "../../components/SkillCheckBanner";

export default function PlayerSheetScreen() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [waitingForSheet, setWaitingForSheet] = useState(false);
  const [pendingSkillCheck, setPendingSkillCheck] = useState<SkillCheckRequest | null>(
    null,
  );
  const [resolvedSkillCheck, setResolvedSkillCheck] = useState<SkillCheckResolved | null>(
    null,
  );
  const navigate = useNavigate();
  const token = getToken();

  const invalidateSession = useCallback(() => {
    clearToken();
    disconnectPlayerSocket();
    navigate("/");
  }, [navigate]);

  const load = useCallback(async () => {
    if (!token) {
      navigate("/");
      return;
    }
    try {
      const char = await fetchPlayerCharacter(token);
      setCharacter(char);
      setWaitingForSheet(false);
    } catch (err) {
      if (err instanceof Error && err.message === "no-character") {
        setWaitingForSheet(true);
        return;
      }
      invalidateSession();
    }
  }, [token, navigate, invalidateSession]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!token) return;

    const joinCharacterRoom = () => {
      if (character?.id) {
        getPlayerSocket().emit("join-character", { characterId: character.id });
      }
    };

    const stopResume = watchSessionResume(token, joinCharacterRoom, invalidateSession);

    const socket = getPlayerSocket();
    const onUpdate = (updated: Character) => {
      if (updated.id === character?.id) setCharacter(updated);
    };
    const onSkillRequest = (request: SkillCheckRequest) => {
      if (request.characterId === character?.id) {
        setPendingSkillCheck(request);
        setResolvedSkillCheck(null);
      }
    };
    const onSkillResolved = (result: SkillCheckResolved) => {
      if (result.characterId === character?.id) {
        setPendingSkillCheck(null);
        setResolvedSkillCheck(result);
      }
    };
    const onSkillCancel = (requestId: string) => {
      setPendingSkillCheck((prev) => (prev?.id === requestId ? null : prev));
    };
    socket.on("character-updated", onUpdate);
    socket.on("skill-check:request", onSkillRequest);
    socket.on("skill-check:resolved", onSkillResolved);
    socket.on("skill-check:cancel", onSkillCancel);

    return () => {
      stopResume();
      socket.off("character-updated", onUpdate);
      socket.off("skill-check:request", onSkillRequest);
      socket.off("skill-check:resolved", onSkillResolved);
      socket.off("skill-check:cancel", onSkillCancel);
    };
  }, [token, character?.id, invalidateSession]);

  function handleLogout() {
    clearToken();
    disconnectPlayerSocket();
    navigate("/");
  }

  if (waitingForSheet) {
    return (
      <div className="player-login">
        <div className="login-card panel">
          <div className="medallion-sm">🐺</div>
          <h1>Logged in</h1>
          <p className="login-hint">
            Your DM has not created a character sheet for your nickname yet. Ask them to
            add one with the same login nickname.
          </p>
          <button type="button" className="primary" onClick={() => void load()}>
            Check again
          </button>
          <button type="button" style={{ marginTop: "0.5rem" }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (!character) return <p className="loading-msg">Loading sheet...</p>;

  async function handleChange(updated: Character) {
    if (!token) return;
    setCharacter(updated);
    try {
      const saved = await updatePlayerCharacter(token, updated);
      setCharacter(saved);
    } catch {
      void load();
    }
  }

  return (
    <>
      <SkillCheckBanner
        pending={pendingSkillCheck}
        resolved={resolvedSkillCheck}
        onDismissResolved={() => setResolvedSkillCheck(null)}
      />
      <CharacterSheet
        character={character}
        isDM={false}
        onChange={handleChange}
        onBack={handleLogout}
        backLabel="Logout"
      />
    </>
  );
}
