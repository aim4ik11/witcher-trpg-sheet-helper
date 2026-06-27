import { useMemo, useState } from "react";
import type { PlayerCredential } from "@wilmak/shared";
import Modal from "../../../components/Modal";
import PlayerInvitesList from "../../../components/PlayerInvitesList";
import PlayerInviteQrModal from "../../../components/PlayerInviteQrModal";
import "../../../components/PlayerInvitesList/PlayerInvitesList.css";

interface Props {
  credentials: PlayerCredential[];
  playUrls: string[];
  serverActive: boolean;
  onAddPlayer: () => void;
  onRemovePlayer: (nickname: string) => Promise<void>;
}

export default function LobbySection({
  credentials,
  playUrls,
  serverActive,
  onAddPlayer,
  onRemovePlayer,
}: Props) {
  const [qrCred, setQrCred] = useState<PlayerCredential | null>(null);
  const [confirmCred, setConfirmCred] = useState<PlayerCredential | null>(null);
  const [removing, setRemoving] = useState(false);

  const baseUrl = playUrls[0] ?? "";

  const inviteUrl = useMemo(() => {
    if (!baseUrl || !qrCred) return "";
    return `${baseUrl}?nickname=${encodeURIComponent(qrCred.nickname)}&code=${encodeURIComponent(qrCred.code)}`;
  }, [baseUrl, qrCred]);

  async function handleConfirmRemove() {
    if (!confirmCred) return;
    setRemoving(true);
    try {
      await onRemovePlayer(confirmCred.nickname);
    } finally {
      setRemoving(false);
      setConfirmCred(null);
    }
  }

  return (
    <>
      <section className="dm-section">
        <div className="dm-section-head">
          <h2>Lobby</h2>
          <span className="badge badge--count">{credentials.length}</span>
          <div className="dm-section-actions">
            <button
              type="button"
              className="btn-sm"
              onClick={onAddPlayer}
              disabled={!serverActive}
            >
              + Add Player
            </button>
          </div>
        </div>
        <p className="dm-section-hint">
          Players log in from a browser with their nickname and 4-digit code.
        </p>
        <div className="invite-panel">
          <PlayerInvitesList
            credentials={credentials}
            onCopyCode={(code) => void navigator.clipboard.writeText(code)}
            onQrInvite={baseUrl ? (cred) => setQrCred(cred) : undefined}
            onRemovePlayer={(cred) => setConfirmCred(cred)}
          />
        </div>
      </section>

      {qrCred && (
        <PlayerInviteQrModal
          credential={qrCred}
          inviteUrl={inviteUrl}
          onClose={() => setQrCred(null)}
        />
      )}

      {confirmCred && (
        <Modal
          title="Remove player"
          size="sm"
          onClose={() => !removing && setConfirmCred(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setConfirmCred(null)}
                disabled={removing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                disabled={removing}
                onClick={() => void handleConfirmRemove()}
              >
                {removing ? "Removing…" : "Remove"}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            Remove player <strong>{confirmCred.nickname}</strong>?
          </p>
          <p style={{ margin: "0.5rem 0 0", color: "var(--text-muted)", fontSize: "13px" }}>
            Any linked character will be unassigned but not deleted.
          </p>
        </Modal>
      )}
    </>
  );
}
