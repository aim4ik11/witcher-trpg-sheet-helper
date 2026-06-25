/**
 * Summarize sign mechanical effects for the cast modal (§114).
 */
import {
  aardProneChancePercent,
  axiiStunSaveModifier,
  igniDamageDice,
  igniIgniteChancePercent,
  quenBlocksPerSta,
  yrdenSpdRefPenalty,
} from "./signEffects";

export function describeSignEffect(signName: string, staSpent: number): string | null {
  const name = signName.toLowerCase();
  if (name.includes("yrden")) {
    return `SPD/REF penalty ${yrdenSpdRefPenalty(staSpent)} in circle`;
  }
  if (name.includes("quen")) {
    return `Blocks ${quenBlocksPerSta(staSpent)} failed dodge/block`;
  }
  if (name.includes("aard")) {
    return `${aardProneChancePercent(staSpent)}% prone chance`;
  }
  if (name.includes("igni")) {
    return `${igniDamageDice(staSpent)} damage, ${igniIgniteChancePercent()}% ignite`;
  }
  if (name.includes("axii")) {
    return `Stun save ${axiiStunSaveModifier(staSpent)}`;
  }
  return null;
}
