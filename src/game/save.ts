import type { Difficulty, RelicId, SkinId, WeaponId } from './types';

export interface SaveData {
  defeated: Record<string, boolean>;
  deaths: Record<string, number>;
  bestTimes: Record<string, number>;
  bestRun: number | null;
  unlockedWeapons: WeaponId[];
  unlockedRelics: RelicId[];
  unlockedSkins: SkinId[];
  beatenNormal: boolean;
  beatenNGPlus: boolean;
  equippedWeapon: WeaponId;
  equippedRelic: RelicId;
  equippedSkin: SkinId;
  difficulty: Difficulty;
  totalKills: number;
  showHitboxes: boolean;
  musicVolume: number;
  sfxVolume: number;
}

const KEY = 'ashen_gauntlet_save_v1';

export function defaultSave(): SaveData {
  return {
    defeated: {},
    deaths: {},
    bestTimes: {},
    bestRun: null,
    unlockedWeapons: ['longsword'],
    unlockedRelics: ['none'],
    unlockedSkins: ['silver'],
    beatenNormal: false,
    beatenNGPlus: false,
    equippedWeapon: 'longsword',
    equippedRelic: 'none',
    equippedSkin: 'silver',
    difficulty: 'normal',
    totalKills: 0,
    showHitboxes: false,
    musicVolume: 0.5,
    sfxVolume: 0.7,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...JSON.parse(raw) };
  } catch {
    return defaultSave();
  }
}

export function writeSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function resetSave() {
  localStorage.removeItem(KEY);
}
