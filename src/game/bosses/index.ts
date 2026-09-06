import type { BossDef } from '../types';
import { FALLEN_KNIGHT, CRIMSON_DUELIST, TWIN_SENTINELS, HOLLOW_KING } from './knights';
import { COLOSSUS, PLAGUE_WARDEN, EXECUTIONER } from './brutes';
import { HUNTRESS, SORCERER } from './ranged';
import { WOLF, DRAKE } from './beasts';

/** Gauntlet order */
export const BOSSES: BossDef[] = [
  FALLEN_KNIGHT,
  WOLF,
  HUNTRESS,
  COLOSSUS,
  CRIMSON_DUELIST,
  SORCERER,
  TWIN_SENTINELS,
  EXECUTIONER,
  PLAGUE_WARDEN,
  DRAKE,
  HOLLOW_KING,
];

export const BOSS_MAP: Record<string, BossDef> = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

export function bossIndex(id: string) {
  return BOSSES.findIndex((b) => b.id === id);
}
