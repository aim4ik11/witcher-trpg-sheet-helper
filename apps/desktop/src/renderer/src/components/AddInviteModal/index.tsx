import { useState } from "react";
import { normalizeNickname } from "../../utils/session";
import Modal from "../Modal";

interface Props {
  onSubmit: (nickname: string) => void | Promise<void>;
  onClose: () => void;
  error?: string;
}

const FORM_ID = "add-player-form";

export default function AddInviteModal({
  onSubmit,
  onClose,
  error: externalError,
}: Props) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    <Modal
      title="Add player"
      size="md"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form={FORM_ID}
            className="primary"
            disabled={submitting || !nickname.trim()}
          >
            {submitting ? "Adding…" : "Add Player"}
          </button>
        </>
      }
    >
      <p
        className="muted-text"
        style={{ marginBottom: "1rem", fontStyle: "normal", fontSize: "0.85rem" }}
      >
        A login code will be generated automatically.
      </p>
      <form id={FORM_ID} onSubmit={(e) => void handleSubmit(e)} className="create-modal-form">
        <div className="field">
          <label>Nickname <span className="required">*</span></label>
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
        </div>
        {displayError && <p className="modal-error">{displayError}</p>}
      </form>
    </Modal>
  );
}
