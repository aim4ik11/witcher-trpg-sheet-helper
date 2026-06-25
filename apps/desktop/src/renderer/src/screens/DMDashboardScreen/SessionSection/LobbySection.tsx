import type { Player, PlayerCredential } from "@wilmak/shared";
import PlayerInvitesList from "../../../components/PlayerInvitesList";
import "../../../components/PlayerInvitesList/PlayerInvitesList.css";

interface Props {
  credentials: PlayerCredential[];
  connected: Player[];
  serverActive: boolean;
  onAddPlayer: () => void;
}

export default function LobbySection({
  credentials,
  connected,
  serverActive,
  onAddPlayer,
}: Props) {
  return (
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
          connected={connected}
          onCopyCode={(code) => void navigator.clipboard.writeText(code)}
        />
      </div>
    </section>
  );
}
