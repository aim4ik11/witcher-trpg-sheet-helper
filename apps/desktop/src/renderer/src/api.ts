import type { Character } from '@wilmak/shared';

// Port is no longer needed — all CRUD goes through IPC (window.api).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setApiBase(_port: number): void {}

export const api = {
  getCharacters:   ()                            => window.api.characters.getAll(),
  getCharacter:    (id: string)                  => window.api.characters.get(id),
  createCharacter: (data: Partial<Character>)    => window.api.characters.create(data),
  updateCharacter: (id: string, char: Character) => window.api.characters.update(id, char),
  deleteCharacter: (id: string)                  => window.api.characters.delete(id),
};
