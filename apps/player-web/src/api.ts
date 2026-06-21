import type { Character } from '@wilmak/shared';

const API = '/api';

export async function fetchPlayerCharacter(token: string): Promise<Character> {
  const res = await fetch(`${API}/player/me`, { headers: { 'X-Player-Token': token } });
  if (!res.ok) throw new Error('Session expired');
  return res.json() as Promise<Character>;
}

const TOKEN_KEY = 'witcher_player_token';
export const getToken    = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken    = (t: string): void  => localStorage.setItem(TOKEN_KEY, t);
export const clearToken  = (): void           => localStorage.removeItem(TOKEN_KEY);
