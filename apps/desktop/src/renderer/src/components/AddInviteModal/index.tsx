import { useState, useEffect } from "react";
import { normalizeNickname } from "../../utils/session";
import "../CreateCharacterModal/CreateCharacterModal.css";

interface Props {
  onSubmit: (nickname: string) => void | Promise<void>;
  onClose: () => void;
  error?: string;
}

export default function AddInviteModal({
  onSubmit,
  onClose,
  error: externalError,
}: Props) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nick = normalizeNickname(nickname);
    if (!nick) {
      setError("Nickname is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(nick);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add player.");
      setSubmitting(false);
    }
  }

  const displayError = externalError || error;

  return (
    <div className="create-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="create-modal panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="create-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="create-modal-title">Add player</h2>
        <p
          className="muted-text"
          style={{ marginBottom: "1rem", fontStyle: "normal", fontSize: "0.85rem" }}
        >
          A login code will be generated automatically.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="create-modal-form">
          <label>
            Nickname <span className="required">*</span>
            <input
              value={nickname}
              onChange={(e) => {
                setNickname(normalizeNickname(e.target.value));
                setError("");
              }}
              placeholder="e.g. mira"
              autoFocus
              autoComplete="off"
            />
          </label>
          {displayError && <p className="create-modal-error">{displayError}</p>}
          <div className="create-modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary"
              disabled={submitting || !nickname.trim()}
            >
              {submitting ? "Adding…" : "Add Player"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
