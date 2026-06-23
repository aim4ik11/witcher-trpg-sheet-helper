import type { Player, PlayerCredential } from '@wilmak/shared';

interface Props {
  credentials: PlayerCredential[];
  connected: Player[];
  onCopyCode?: (code: string) => void;
}

export default function PlayerInvitesList({ credentials, connected, onCopyCode }: Props) {
  if (credentials.length === 0) {
    return <p className="invite-empty">No player invites yet. Add a player character or invite in DM Console.</p>;
  }

  const online = new Set(connected.map((p) => p.nickname));

  return (
    <ul className="invite-list">
      {credentials.map((c) => {
        const isOnline = online.has(c.nickname);
        return (
          <li key={c.nickname} className="invite-row">
            <span className="invite-nick">{c.nickname}</span>
            <span className={`status-pill ${isOnline ? 'status-pill--online' : 'status-pill--offline'}`}>
              <span className="status-pill__dot" />
              {isOnline ? 'online' : 'offline'}
            </span>
            <div className="invite-code-wrap">
              <code className="invite-code">{c.code}</code>
              {onCopyCode && (
                <button type="button" className="invite-copy" onClick={() => onCopyCode(c.code)}>
                  copy
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
