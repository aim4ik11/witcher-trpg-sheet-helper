import type { PlayerCredential } from "@wilmak/shared";

interface Props {
  credentials: PlayerCredential[];
  onCopyCode?: (code: string) => void;
  onQrInvite?: (cred: PlayerCredential) => void;
  onRemovePlayer?: (cred: PlayerCredential) => void;
}

export default function PlayerInvitesList({ credentials, onCopyCode, onQrInvite, onRemovePlayer }: Props) {
  if (credentials.length === 0) {
    return (
      <p className="invite-empty">
        No player invites yet. Add a player character or invite in GM Console.
      </p>
    );
  }

  return (
    <ul className="invite-list">
      {credentials.map((c) => (
        <li key={c.nickname} className="invite-row">
          <span className="invite-nick">{c.nickname}</span>
          <div className="invite-code-wrap">
            {
              onCopyCode && (
                <div
                  className='invite-code-wrapper'
                  onClick={() => onCopyCode(c.code)}
                >
                  <span>Code</span>
                  <code className="invite-code">{c.code}</code>
                </div>
              )
            }
            {onQrInvite && (
              <button
                type="button"
                className="btn-sm"
                onClick={() => onQrInvite(c)}
                title="Show QR invite"
              >
                Invite
              </button>
            )}
            {onRemovePlayer && (
              <button
                type="button"
                className="btn-sm danger"
                onClick={() => onRemovePlayer(c)}
                title="Remove player"
              >
                Remove
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
