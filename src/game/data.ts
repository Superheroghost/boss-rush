import type { WeaponDef, RelicDef, BuffDef, RunModifiers, WeaponId, RelicId, SkinId, Difficulty } from './types';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 430; // screen y of ground line
export const INPUT_BUFFER = 7; // frames
export const BASE_ZOOM = 1.3;

export const PLAYER = {
  maxHp: 100,
  maxStamina: 100,
  staminaRegen: 0.55, // per frame
  staminaDelay: 22, // frames after action before regen
  runSpeed: 3.6,
  sprintSpeed: 5.4,
  sprintCost: 0.28,
  dodgeFrames: 26,
  dodgeIframeStart: 3,
  dodgeIframes: 10,
  dodgeRecovery: 6,
  dodgeSpeed: 7.2,
  dodgeCost: 20,
  parryWindow: 5,
  blockCost: 0.55, // fraction of damage as stamina
  parryStun: 42,
  riposteWindow: 60,
  healFrames: 72,
  healPoint: 44,
  healAmount: 45,
  flaskMax: 3,
  hitstun: 18,
  postHitIframes: 12,
  guardBreakStun: 45,
  width: 28,
  height: 56,
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  longsword: {
    id: 'longsword',
    name: 'Knight\'s Longsword',
    desc: 'Balanced. Reliable 3-hit chain and a solid overhead heavy.',
    lightDmg: [9, 9, 13],
    lightWindup: 6,
    lightActive: 5,
    lightRecovery: 13,
    lightStamina: 12,
    lightPoise: 8,
    heavyDmg: 30,
    heavyWindup: 22,
    heavyActive: 7,
    heavyRecovery: 24,
    heavyStamina: 30,
    heavyPoise: 26,
    reach: 62,
    hyperArmor: false,
    bleed: 0,
    color: '#cbd5e1',
  },
  katana: {
    id: 'katana',
    name: 'Nightfang Katana',
    desc: 'Fast 4-hit chain that builds bleed. Bleed bursts for heavy damage.',
    lightDmg: [6, 6, 6, 10],
    lightWindup: 4,
    lightActive: 4,
    lightRecovery: 10,
    lightStamina: 10,
    lightPoise: 6,
    heavyDmg: 22,
    heavyWindup: 16,
    heavyActive: 6,
    heavyRecovery: 20,
    heavyStamina: 26,
    heavyPoise: 16,
    reach: 66,
    hyperArmor: false,
    bleed: 14,
    color: '#a78bfa',
  },
  greataxe: {
    id: 'greataxe',
    name: 'Gravedigger Greataxe',
    desc: 'Slow and brutal. Heavies have hyper-armor and shatter poise.',
    lightDmg: [14, 14, 20],
    lightWindup: 10,
    lightActive: 6,
    lightRecovery: 18,
    lightStamina: 17,
    lightPoise: 16,
    heavyDmg: 46,
    heavyWindup: 30,
    heavyActive: 8,
    heavyRecovery: 30,
    heavyStamina: 40,
    heavyPoise: 48,
    reach: 60,
    hyperArmor: true,
    bleed: 0,
    color: '#f59e0b',
  },
  spear: {
    id: 'spear',
    name: 'Sentinel Spear',
    desc: 'Long reach pokes. Safe spacing, moderate damage, quick heavy lunge.',
    lightDmg: [8, 8, 11],
    lightWindup: 7,
    lightActive: 5,
    lightRecovery: 12,
    lightStamina: 11,
    lightPoise: 7,
    heavyDmg: 26,
    heavyWindup: 18,
    heavyActive: 8,
    heavyRecovery: 20,
    heavyStamina: 28,
    heavyPoise: 20,
    reach: 96,
    hyperArmor: false,
    bleed: 0,
    color: '#5eead4',
  },
};

export const RELICS: RelicDef[] = [
  { id: 'none', name: 'No Relic', desc: 'Travel light.', unlockBoss: null },
  { id: 'ember', name: 'Ember Ring', desc: 'Heal 25% HP on boss kill. Flask refills +1 between gauntlet fights.', unlockBoss: 'fallen_knight' },
  { id: 'swift', name: 'Swift Sigil', desc: 'Stamina regenerates 20% faster.', unlockBoss: 'colossus' },
  { id: 'quickdraw', name: 'Quickdraw Vial', desc: 'The first flask use of each fight is near-instant.', unlockBoss: 'huntress' },
  { id: 'ironheart', name: 'Iron Heart', desc: '+25 max HP.', unlockBoss: 'wolf' },
  { id: 'mirror', name: 'Mirror Shard', desc: 'Parry window +2 frames. Parried projectiles reflect.', unlockBoss: 'sorcerer' },
  { id: 'wolffang', name: 'Wolf Fang', desc: '+15% damage, -15 max HP.', unlockBoss: 'twins' },
  { id: 'gravewalker', name: 'Gravewalker Charm', desc: 'Dodge i-frames +3, dodge costs 15% less stamina.', unlockBoss: 'warden' },
];

export const SKINS: { id: SkinId; name: string; desc: string; colors: { armor: string; trim: string; cape: string } }[] = [
  { id: 'silver', name: 'Ashen Knight', desc: 'Default plate.', colors: { armor: '#9ca3af', trim: '#e5e7eb', cape: '#7f1d1d' } },
  { id: 'crimson', name: 'Crimson Vow', desc: 'Defeat 5 bosses.', colors: { armor: '#991b1b', trim: '#fca5a5', cape: '#1c1917' } },
  { id: 'void', name: 'Voidwalker', desc: 'Complete the gauntlet.', colors: { armor: '#312e81', trim: '#a5b4fc', cape: '#6d28d9' } },
  { id: 'gilded', name: 'Gilded Sovereign', desc: 'Complete New Game+.', colors: { armor: '#ca8a04', trim: '#fef08a', cape: '#f8fafc' } },
];

export function defaultModifiers(): RunModifiers {
  return {
    iframesBonus: 0,
    parryBonus: 0,
    heavyHealPct: 0,
    flaskMult: 1,
    staminaRegenMult: 1,
    damageMult: 1,
    maxHpBonus: 0,
    dodgeCostMult: 1,
    perfectDodgeStamina: 0,
    poiseMult: 1,
    riposteMult: 1,
    flaskBonus: 0,
    lightSpeedMult: 1,
    bleedMult: 1,
  };
}

export const BUFFS: BuffDef[] = [
  { id: 'iframes', name: 'Phantom Step', desc: '+4 dodge i-frames.', apply: (m) => (m.iframesBonus += 4) },
  { id: 'parry', name: 'Mirror Instinct', desc: 'Parry window +2 frames.', apply: (m) => (m.parryBonus += 2) },
  { id: 'heavyheal', name: 'Bloodthirst', desc: 'Heavy attacks heal 5% max HP on hit.', apply: (m) => (m.heavyHealPct += 0.05) },
  { id: 'flask', name: 'Distilled Estus', desc: 'Flask heals 50% more.', apply: (m) => (m.flaskMult += 0.5) },
  { id: 'regen', name: 'Second Wind', desc: 'Stamina regen +25%.', apply: (m) => (m.staminaRegenMult += 0.25) },
  { id: 'dmg', name: 'Honed Edge', desc: '+15% damage.', apply: (m) => (m.damageMult += 0.15) },
  { id: 'hp', name: 'Vigor', desc: '+25 max HP.', apply: (m) => (m.maxHpBonus += 25) },
  { id: 'dodgecost', name: 'Featherweight', desc: 'Dodge costs 30% less stamina.', apply: (m) => (m.dodgeCostMult *= 0.7) },
  { id: 'perfect', name: 'Adrenaline', desc: 'Perfect dodges restore 20 stamina.', apply: (m) => (m.perfectDodgeStamina += 20) },
  { id: 'poise', name: 'Crushing Blows', desc: 'Poise damage +40%.', apply: (m) => (m.poiseMult += 0.4) },
  { id: 'riposte', name: 'Executioner', desc: 'Riposte & stagger damage +50%.', apply: (m) => (m.riposteMult += 0.5) },
  { id: 'flaskcharge', name: 'Spare Vial', desc: '+1 flask charge.', apply: (m) => (m.flaskBonus += 1) },
  { id: 'lightspeed', name: 'Quickened Hands', desc: 'Light attacks 15% faster.', apply: (m) => (m.lightSpeedMult *= 0.85) },
];

export const DIFFICULTY_INFO: Record<Difficulty, { name: string; desc: string; dmg: number; speed: number; hp: number }> = {
  normal: { name: 'Normal', desc: 'The intended challenge.', dmg: 1, speed: 1, hp: 1 },
  ngplus: { name: 'New Game+', desc: 'Bosses hit harder, move faster, and use new attacks.', dmg: 1.4, speed: 1.15, hp: 1.25 },
  nightmare: { name: 'Nightmare', desc: 'One hit kills. No flask. Perfect play only.', dmg: 999, speed: 1.15, hp: 1.1 },
};

export const RELIC_MAP: Record<RelicId, RelicDef> = Object.fromEntries(RELICS.map((r) => [r.id, r])) as Record<RelicId, RelicDef>;
