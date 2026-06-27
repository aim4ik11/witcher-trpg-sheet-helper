import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type {
  Character,
  MagicCastRequest,
  MagicCastResolved,
  SkillCheckRequest,
  SkillCheckResolved,
} from "@wilmak/shared";
import { fetchPlayerCharacter, getToken, clearToken, updatePlayerCharacter } from "../../api";
import {
  disconnectPlayerSocket,
  getPlayerSocket,
  watchSessionResume,
} from "../../socket";
import CharacterSheet from "../../components/CharacterSheet";
import SkillCheckBanner from "../../components/SkillCheckBanner";
import MagicCastBanner from "../../components/MagicCastBanner";

export default function PlayerSheetScreen() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [waitingForSheet, setWaitingForSheet] = useState(false);
  const [unassigned, setUnassigned] = useState(false);
  const [pendingSkillCheck, setPendingSkillCheck] = useState<SkillCheckRequest | null>(
    null,
  );
  const [resolvedSkillCheck, setResolvedSkillCheck] = useState<SkillCheckResolved | null>(
    null,
  );
  const [pendingMagicCast, setPendingMagicCast] = useState<MagicCastRequest | null>(null);
  const [resolvedMagicCast, setResolvedMagicCast] = useState<MagicCastResolved | null>(
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
    const onUnassigned = (characterId: string) => {
      if (characterId === character?.id) setUnassigned(true);
    };
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
    const onMagicRequest = (request: MagicCastRequest) => {
      if (request.characterId === character?.id) {
        setPendingMagicCast(request);
        setResolvedMagicCast(null);
      }
    };
    const onMagicResolved = (result: MagicCastResolved) => {
      if (result.characterId === character?.id) {
        setPendingMagicCast(null);
        setResolvedMagicCast(result);
      }
    };
    const onMagicCancel = (requestId: string) => {
      setPendingMagicCast((prev) => (prev?.id === requestId ? null : prev));
    };
    socket.on("character:unassigned", onUnassigned);
    socket.on("character-updated", onUpdate);
    socket.on("skill-check:request", onSkillRequest);
    socket.on("skill-check:resolved", onSkillResolved);
    socket.on("skill-check:cancel", onSkillCancel);
    socket.on("magic-cast:request", onMagicRequest);
    socket.on("magic-cast:resolved", onMagicResolved);
    socket.on("magic-cast:cancel", onMagicCancel);

    return () => {
      stopResume();
      socket.off("character:unassigned", onUnassigned);
      socket.off("character-updated", onUpdate);
      socket.off("skill-check:request", onSkillRequest);
      socket.off("skill-check:resolved", onSkillResolved);
      socket.off("skill-check:cancel", onSkillCancel);
      socket.off("magic-cast:request", onMagicRequest);
      socket.off("magic-cast:resolved", onMagicResolved);
      socket.off("magic-cast:cancel", onMagicCancel);
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

  if (unassigned) {
    return (
      <div className="player-login">
        <div className="login-card panel">
          <div className="medallion-sm">🐺</div>
          <h1>Unassigned</h1>
          <p className="login-hint">
            The GM has unlinked this character from your account. Ask them to reassign it or create a new one.
          </p>
          <button type="button" className="primary" onClick={handleLogout}>
            Back to login
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
      <MagicCastBanner
        pending={pendingMagicCast}
        resolved={resolvedMagicCast}
        onDismissResolved={() => setResolvedMagicCast(null)}
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
