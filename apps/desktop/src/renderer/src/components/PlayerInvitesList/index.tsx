import type { Player, PlayerCredential } from '@wilmak/shared';

interface Props {
  credentials: PlayerCredential[];
  connected: Player[];
  onCopyCode?: (code: string) => void;
}

export default function PlayerInvitesList({ credentials, connected, onCopyCode }: Props) {
  if (credentials.length === 0) {
    return <p className="muted-text">No player invites yet. Add a player character or invite in DM Console.</p>;
  }

  const online = new Set(connected.map((p) => p.nickname));

  return (
    <ul className="invite-list">
      {credentials.map((c) => (
        <li key={c.nickname} className="invite-row">
          <div className="invite-info">
            <span className="invite-nick">{c.nickname}</span>
            <span className={`invite-status ${online.has(c.nickname) ? 'online' : 'offline'}`}>
              {online.has(c.nickname) ? 'online' : 'offline'}
            </span>
          </div>
          <div className="invite-code-wrap">
            <code className="invite-code">{c.code}</code>
            {onCopyCode && (
              <button type="button" className="copy-btn" onClick={() => onCopyCode(c.code)}>
                Copy
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
