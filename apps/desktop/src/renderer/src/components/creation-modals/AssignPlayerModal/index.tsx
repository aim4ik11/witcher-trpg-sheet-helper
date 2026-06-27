import { useState } from "react";
import type { Character } from "@wilmak/shared";
import { normalizeNickname } from "../../../utils/session";
import Modal from "../../Modal";
import "./AssignPlayerModal.css";

interface Props {
  character: Character;
  availablePlayers: string[];
  onAssign: (nickname: string) => Promise<void>;
  onClose: () => void;
}

export default function AssignPlayerModal({
  character,
  availablePlayers,
  onAssign,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [newNickname, setNewNickname] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const effectiveNick = selected ?? normalizeNickname(newNickname);

  function selectExisting(nick: string) {
    setSelected(nick);
    setNewNickname("");
    setError("");
  }

  function handleNewNickChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelected(null);
    setNewNickname(normalizeNickname(e.target.value));
    setError("");
  }

  async function handleSubmit() {
    if (!effectiveNick) {
      setError(
        availablePlayers.length > 0
          ? "Select a player or enter a new nickname."
          : "Nickname is required.",
      );
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onAssign(effectiveNick);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={`Assign player — ${character.name}`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            disabled={submitting || !effectiveNick}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Assigning…" : "Assign"}
          </button>
        </>
      }
    >
      {availablePlayers.length > 0 && (
        <>
          <p className="assign-player-hint">Players without a character:</p>
          <div className="assign-player-list">
            {availablePlayers.map((nick) => (
              <button
                key={nick}
                type="button"
                className={`assign-player-item${selected === nick ? " assign-player-item--active" : ""}`}
                onClick={() => selectExisting(nick)}
              >
                {nick}
              </button>
            ))}
          </div>
          <div className="assign-player-divider">or create new</div>
        </>
      )}
      <div className="field">
        <label>{availablePlayers.length > 0 ? "New nickname" : "Player nickname"}</label>
        <input
          value={newNickname}
          onChange={handleNewNickChange}
          placeholder="e.g. mira"
          autoFocus={availablePlayers.length === 0}
          autoComplete="off"
        />
      </div>
      {error && <p className="modal-error" style={{ marginTop: "0.5rem" }}>{error}</p>}
    </Modal>
  );
}
