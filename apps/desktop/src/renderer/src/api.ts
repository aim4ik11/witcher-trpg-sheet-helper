import type { Character } from '@wilmak/shared';

let baseUrl = '';

export function setApiBase(port: number): void {
  baseUrl = `http://localhost:${port}/api`;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
  await fetch(`${baseUrl}${path}`, { method: 'DELETE' });
}

export const api = {
  getHostInfo:      ()                          => get<{ urls: string[] }>('/host-info'),
  getCharacters:    ()                          => get<Character[]>('/characters'),
  getCharacter:     (id: string)                => get<Character>(`/characters/${id}`),
  createCharacter:  (data: Partial<Character>)  => post<Character>('/characters', data),
  updateCharacter:  (id: string, char: Character) => put<Character>(`/characters/${id}`, char),
  deleteCharacter:  (id: string)                => del(`/characters/${id}`),
};
