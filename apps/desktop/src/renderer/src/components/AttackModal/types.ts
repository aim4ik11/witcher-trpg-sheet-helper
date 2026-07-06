import type { Character, CombatAttackResult } from "@wilmak/shared";

export type WeaponChoice =
  | { kind: "weapon"; weaponId: string }
  | { kind: "unarmed"; unarmed: "punch" | "kick" };

export interface AttackSubmitPayload {
  results: CombatAttackResult[];
  updatedCharacters: Character[];
}
