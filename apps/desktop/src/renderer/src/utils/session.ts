import { normalizeNickname, type PlayerCredential, type SessionConfig } from '@wilmak/shared';

export { normalizeNickname };

export function normalizePlayers(players: PlayerCredential[]): PlayerCredential[] {
  return players.map((p) => ({
    ...p,
    nickname: normalizeNickname(p.nickname),
  }));
}

export function withPlayers(config: SessionConfig, players: PlayerCredential[]): SessionConfig {
  return { ...config, players: normalizePlayers(players) };
}
