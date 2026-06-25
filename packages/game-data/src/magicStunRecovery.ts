/**
 * Rulebook §166 — STA exhaustion stun + REC recovery while stunned.
 */

export interface StunFromStaState {
  stunned: boolean;
  staCurrent: number;
  rec: number;
}

export function staExhaustionStuns(staBefore: number, staCost: number): boolean {
  return staCost > staBefore;
}

export function staRecoveredWhileStunned(rec: number, roundsStunned: number): number {
  return rec * Math.max(0, roundsStunned);
}

export function tickStunnedCasterRecovery(state: StunFromStaState): StunFromStaState {
  return {
    stunned: true,
    staCurrent: state.staCurrent + state.rec,
    rec: state.rec,
  };
}
