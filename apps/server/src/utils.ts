import os from 'node:os';
import { randomUUID } from 'node:crypto';
import type { Character, Player, ServerToHost } from '@wilmak/shared';
import { state } from './store';

export function lanUrls(port: number): string[] {
  const out: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push(`http://${ni.address}:${port}`);
    }
  }
  return out.length ? out : [`http://localhost:${port}`];
}

export function notifyHost(msg: ServerToHost): void {
  process.parentPort?.postMessage(msg);
}

export function pushRoster(): void {
  const players: Player[] = [...state.connected.entries()].map(([socketId, v]) => ({
    socketId,
    nickname: v.nickname,
  }));
  notifyHost({ type: 'players', players });
  state.io?.emit('players:update', players);
}

export function makeCharacter(
  init: Partial<Character> & { type: Character['type']; name: string },
): Character {
  const id = randomUUID();
  const defaults: Character = {
    id,
    type:              init.type,
    name:              init.name,
    race:              '',
    occupation:        '',
    nickname:          '',
    attributes:        { ref: 1, emp: 1, int: 1, dex: 1, will: 1, cra: 1, body: 1 },
    skills:            {},
    vitals: {
      hp:      { current: 0, max: 0 },
      sta:     { current: 0, max: 0 },
      resolve: { current: 0, max: 0 },
      woundThreshold: 0,
    },
    luck:               { max: 5, used: 0 },
    speed:              0,
    adrenaline:         0,
    movement:           { run: 0, leap: 0 },
    recovery:           { stun: 0, rec: 0 },
    improvementPoints:  { ip: 0, trainingIp: 0 },
    weapons:            [],
    armor: [
      { slot: 'head',  name: '', sp: 0, damage: 0, effects: '', weight: 0 },
      { slot: 'torso', name: '', sp: 0, damage: 0, effects: '', weight: 0 },
      { slot: 'rArm',  name: '', sp: 0, damage: 0, effects: '', weight: 0 },
      { slot: 'lArm',  name: '', sp: 0, damage: 0, effects: '', weight: 0 },
      { slot: 'rLeg',  name: '', sp: 0, damage: 0, effects: '', weight: 0 },
      { slot: 'lLeg',  name: '', sp: 0, damage: 0, effects: '', weight: 0 },
    ],
    armorNotes:          '',
    bonusMelee:          { punch: '', kick: '' },
    consumables:         [],
    spells:              [],
    professionAbilities: [],
    wounds:              [],
    statusEffects:       [],
  };
  return { ...defaults, ...init, id };
}
