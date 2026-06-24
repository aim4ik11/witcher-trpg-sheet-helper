import type { Character } from "@wilmak/shared";

const API = "/api";

export async function fetchPlayerCharacter(token: string): Promise<Character> {
  const res = await fetch(`${API}/player/me`, { headers: { "X-Player-Token": token } });
  if (res.status === 404) throw new Error("no-character");
  if (!res.ok) throw new Error("Session expired");
  return res.json() as Promise<Character>;
}

export async function updatePlayerCharacter(
  token: string,
  character: Character,
): Promise<Character> {
  const res = await fetch(`${API}/player/me`, {
    method: "PUT",
    headers: {
      "X-Player-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(character),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not save");
  }
  return res.json() as Promise<Character>;
}

const TOKEN_KEY = "witcher_player_token";
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string): void => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);
