import type { BossDef } from '../types';
import { mkAttack, frontBox, aroundBox, dash, halt, face, chase, shockwave, hazard, projectile, aimedShot, teleportTo, MODES, dist, dirToPlayer, clampToArena } from './helpers';

// ===================== THE FALLEN KNIGHT (Duelist / tutorial) =====================
export const FALLEN_KNIGHT: BossDef = {
  id: 'fallen_knight',
  name: 'The Fallen Knight',
  title: 'Oathbreaker of the Ashen Order',
  archetype: 'Duelist',
  icon: '🗡️',
  hp: 520,
  poiseMax: 100,
  width: 52,
  height: 118,
  speed: 2.6,
  arenaWidth: 820,
  body: 'knight',
  weapon: 'greatsword',
  colors: { primary: '#475569', secondary: '#1e293b', accent: '#94a3b8', glow: '#f59e0b' },
  arenaTheme: 'crypt',
  unlocksRelic: 'ember',
  lore: 'Once the first blade of the Ashen Order, he knelt at the throne when the fire guttered and swore to hold the door forever. The oath outlived his mind. Now he cuts down anything that approaches the stair — the faithful and the damned alike — and weeps behind his visor when the bodies stop moving.',
  music: { bpm: 112, root: 45, mode: MODES.phrygian, bassPattern: [0, -1, 0, 0, 3, -1, 0, 1], arpPattern: [0, 4, 7, 4, 0, 5, 7, 2] },
  phases: [
    { hpThreshold: 1, speedMult: 1, aggression: 0.4, name: 'The Oath', attackIds: ['combo1', 'slam', 'thrust'] },
    { hpThreshold: 0.5, speedMult: 1.28, aggression: 0.72, name: 'Broken Vow', attackIds: ['combo1', 'slam', 'thrust', 'spin'], announce: 'THE KNIGHT REMEMBERS HIS OATH', tint: '#f59e0b' },
  ],
  attacks: [
    mkAttack({
      id: 'combo1', name: 'Oathcutter I', windup: 26, active: 6, recovery: 8, damage: 16, poise: 10, weight: 3, maxRange: 150, telegraph: 'slash',
      chain: 'combo2',
      hitbox: (_t, c) => [frontBox(c.boss, 135, 90, 10)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 6) face(c); dash(c, t > 12 ? 2.4 : 0); } else if (ph === 'active') dash(c, 3); else halt(c); },
    }),
    mkAttack({
      id: 'combo2', name: 'Oathcutter II', windup: 17, active: 6, recovery: 8, damage: 16, poise: 10, weight: 0, telegraph: 'slash',
      chain: 'combo3', chainChance: 0.85,
      hitbox: (_t, c) => [frontBox(c.boss, 135, 90, 10)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 4) face(c); dash(c, 2.2); } else if (ph === 'active') dash(c, 3); else halt(c); },
    }),
    mkAttack({
      id: 'combo3', name: 'Oathcutter III', windup: 24, active: 8, recovery: 36, damage: 24, poise: 18, weight: 0, telegraph: 'slam', color: '#fbbf24',
      hitbox: (_t, c) => [frontBox(c.boss, 150, 110, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 4) face(c); dash(c, t > 8 ? 3 : 0); } else if (ph === 'active') dash(c, 4); else halt(c); },
    }),
    mkAttack({
      id: 'slam', name: 'Judgement Slam', windup: 48, active: 8, recovery: 44, damage: 36, poise: 30, weight: 2, maxRange: 190, unblockable: true, telegraph: 'slam', color: '#ef4444',
      sfxWindup: 'windup_slam', sfxActive: 'slam',
      hitbox: (_t, c) => [frontBox(c.boss, 165, 70, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 10) face(c); dash(c, t > 20 && t < 40 ? 1.6 : 0); } else halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t === 0) {
          c.shake(14);
          c.particles(c.boss.x + c.boss.facing * 110, 4, 22, '#fbbf24', 5, 'shard');
          if (c.boss.phase >= 1) shockwave(c, 7, 18, '#f59e0b');
        }
      },
    }),
    mkAttack({
      id: 'thrust', name: 'Oathseeker Thrust', windup: 30, active: 12, recovery: 34, damage: 26, poise: 16, weight: 2.5, minRange: 150, maxRange: 560, telegraph: 'thrust', color: '#38bdf8',
      sfxWindup: 'windup_thrust', faceLock: true,
      hitbox: (_t, c) => [frontBox(c.boss, 125, 50, 30)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 12) face(c); dash(c, t > 20 ? -1.5 : 0); } else if (ph === 'active') dash(c, t < 8 ? 15 : 6); else halt(c); },
    }),
    mkAttack({
      id: 'spin', name: 'Whirlwind of Ash', windup: 38, active: 42, recovery: 42, damage: 14, poise: 8, weight: 2, maxRange: 260, multiHit: 13, telegraph: 'spin', color: '#f97316',
      sfxWindup: 'windup_spin', sfxActive: 'swoosh_heavy', phaseMin: 1,
      hitbox: (_t, c) => [aroundBox(c.boss, 118, 100, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { face(c); halt(c); } else if (ph === 'active') { if (t % 13 === 0) face(c); chase(c, 2.2, 30); } else halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t % 13 === 0) { c.sfx('swoosh_heavy'); c.particles(c.boss.x, 50, 8, '#f97316', 6, 'spark'); } },
    }),
  ],
};

// ===================== THE CRIMSON DUELIST =====================
export const CRIMSON_DUELIST: BossDef = {
  id: 'duelist',
  name: 'Serah of the Red Veil',
  title: 'The Crimson Duelist',
  archetype: 'Duelist',
  icon: '🩸',
  hp: 640,
  poiseMax: 80,
  width: 46,
  height: 108,
  speed: 3.4,
  arenaWidth: 700,
  body: 'knight',
  weapon: 'sword',
  colors: { primary: '#7f1d1d', secondary: '#27272a', accent: '#fca5a5', glow: '#ef4444' },
  arenaTheme: 'cathedral',
  unlocksWeapon: 'katana',
  staggerFrames: 110,
  lore: 'Serah dueled a hundred champions beneath the cathedral and let each of them believe, for one breath, that they had won. The veil hides no face — only the hollow where a face was traded for a hand that never trembles.',
  music: { bpm: 136, root: 47, mode: MODES.harmonicMinor, bassPattern: [0, 0, -1, 0, 4, -1, 3, -1], arpPattern: [0, 2, 4, 6, 7, 6, 4, 2] },
  phases: [
    { hpThreshold: 1, speedMult: 1, aggression: 0.55, name: 'First Blood', attackIds: ['lunge', 'twin', 'feint', 'backstep'] },
    { hpThreshold: 0.5, speedMult: 1.2, aggression: 0.8, name: 'Red Veil', attackIds: ['lunge', 'twin', 'feint', 'backstep', 'crescent', 'flurry'], announce: 'THE VEIL LIFTS', tint: '#ef4444' },
    { hpThreshold: 0.2, speedMult: 1.32, aggression: 0.95, name: 'Bloodlust', attackIds: ['lunge', 'feint', 'crescent', 'flurry', 'blooddash'], announce: 'BLOODLUST', tint: '#dc2626' },
  ],
  attacks: [
    mkAttack({
      id: 'lunge', name: 'Red Lunge', windup: 22, active: 10, recovery: 26, damage: 20, poise: 12, weight: 3, minRange: 100, maxRange: 420, telegraph: 'thrust', color: '#f87171', faceLock: true,
      sfxWindup: 'windup_thrust',
      hitbox: (_t, c) => [frontBox(c.boss, 110, 44, 32)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 8) face(c); halt(c); } else if (ph === 'active') dash(c, t < 6 ? 14 : 4); else halt(c); },
    }),
    mkAttack({
      id: 'twin', name: 'Twin Cut', windup: 18, active: 5, recovery: 6, damage: 13, poise: 8, weight: 3, maxRange: 130, telegraph: 'slash', chain: 'twin2',
      hitbox: (_t, c) => [frontBox(c.boss, 115, 80, 14)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 5) face(c); dash(c, 2.5); } else if (ph === 'active') dash(c, 2); else halt(c); },
    }),
    mkAttack({
      id: 'twin2', name: 'Twin Cut II', windup: 14, active: 5, recovery: 24, damage: 15, poise: 10, weight: 0, telegraph: 'slash',
      hitbox: (_t, c) => [frontBox(c.boss, 120, 80, 14)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 3) face(c); dash(c, 2.5); } else if (ph === 'active') dash(c, 2); else halt(c); },
    }),
    mkAttack({
      id: 'feint', name: 'Veiled Feint', windup: 46, active: 6, recovery: 28, damage: 24, poise: 14, weight: 2, maxRange: 160, telegraph: 'slash', color: '#fb7185',
      hitbox: (_t, c) => [frontBox(c.boss, 130, 90, 10)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 6) face(c); dash(c, t > 34 ? 4 : t > 18 && t < 24 ? 1.5 : 0); } else if (ph === 'active') dash(c, 3); else halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'windup' && t === 20) { c.sfx('swoosh'); c.particles(c.boss.x + c.boss.facing * 40, 60, 6, '#fca5a5', 3, 'spark'); } },
    }),
    mkAttack({
      id: 'backstep', name: 'Backstep', windup: 6, active: 1, recovery: 16, damage: 0, poise: 0, weight: 1.2, maxRange: 120, telegraph: 'slash',
      chain: 'lunge', chainChance: 0.7,
      motion: (ph, _t, c) => { if (ph === 'windup') { face(c); dash(c, -9); } else if (ph === 'active') dash(c, -8); else dash(c, -2); },
    }),
    mkAttack({
      id: 'crescent', name: 'Crescent Moon', windup: 30, active: 10, recovery: 34, damage: 28, poise: 20, weight: 2, minRange: 60, maxRange: 300, telegraph: 'slam', color: '#fb7185', phaseMin: 1, unblockable: true,
      sfxWindup: 'windup_slam', sfxActive: 'slam',
      hitbox: (_t, c) => [aroundBox(c.boss, 95, 60, 0)],
      motion: (ph, t, c) => {
        const b = c.boss;
        if (ph === 'windup') { if (t < 6) face(c); if (t >= 10) { b.vy = t === 10 ? 9 : b.vy; dash(c, 5); } else halt(c); }
        else if (ph === 'active') { halt(c); b.y = 0; b.vy = 0; if (t === 0) { c.shake(10); c.particles(b.x, 4, 16, '#ef4444', 5, 'shard'); } }
        else halt(c);
      },
    }),
    mkAttack({
      id: 'flurry', name: 'Thousand Cuts', windup: 28, active: 30, recovery: 34, damage: 9, poise: 5, weight: 2, maxRange: 140, multiHit: 6, telegraph: 'spin', color: '#f43f5e', phaseMin: 1,
      sfxWindup: 'windup_spin',
      hitbox: (_t, c) => [frontBox(c.boss, 120, 90, 8)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 8) face(c); halt(c); } else if (ph === 'active') { if (t % 6 === 0) face(c); chase(c, 1.8, 40); } else halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t % 6 === 0) { c.sfx('swoosh'); c.particles(c.boss.x + c.boss.facing * 70, 50, 4, '#fda4af', 5, 'spark'); } },
    }),
    mkAttack({
      id: 'blooddash', name: 'Blood Dash', windup: 24, active: 8, recovery: 4, damage: 18, poise: 10, weight: 3, telegraph: 'teleport', color: '#dc2626', phaseMin: 2, chain: 'blooddash2',
      sfxWindup: 'windup_thrust',
      hitbox: (_t, c) => [frontBox(c.boss, 150, 80, 8)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 10) face(c); halt(c); } else if (ph === 'active') dash(c, 22); else halt(c); },
      onFrame: (ph, _t, c) => { if (ph === 'active') c.particles(c.boss.x, 50, 3, '#dc2626', 2, 'blob'); },
    }),
    mkAttack({
      id: 'blooddash2', name: 'Blood Dash II', windup: 16, active: 8, recovery: 30, damage: 22, poise: 12, weight: 0, telegraph: 'teleport', color: '#dc2626',
      hitbox: (_t, c) => [frontBox(c.boss, 150, 80, 8)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 6) face(c); halt(c); } else if (ph === 'active') dash(c, 22); else halt(c); },
      onFrame: (ph, _t, c) => { if (ph === 'active') c.particles(c.boss.x, 50, 3, '#dc2626', 2, 'blob'); },
    }),
  ],
};

// ===================== THE TWIN SENTINELS (Duo) =====================
const SENTINEL_BULWARK: BossDef = {
  id: 'twins_bulwark',
  name: 'Sentinel Bulwark',
  title: 'Shield of the Gate',
  archetype: 'Duo',
  icon: '🛡️',
  hp: 460,
  poiseMax: 130,
  width: 60,
  height: 122,
  speed: 1.7,
  arenaWidth: 1000,
  body: 'knight',
  weapon: 'mace',
  colors: { primary: '#1e3a8a', secondary: '#0f172a', accent: '#93c5fd', glow: '#60a5fa' },
  arenaTheme: 'ruins',
  lore: '',
  music: { bpm: 120, root: 43, mode: MODES.aeolian, bassPattern: [0, -1, 0, 3, -1, 0, 5, -1], arpPattern: [0, 3, 7, 3, 0, 5, 7, 5] },
  phases: [
    { hpThreshold: 1, speedMult: 1, aggression: 0.35, name: 'Bulwark', attackIds: ['maceslam', 'shieldbash'] },
    { hpThreshold: 0.5, speedMult: 1.2, aggression: 0.6, name: 'Bulwark Enraged', attackIds: ['maceslam', 'shieldbash', 'quake'], announce: 'THE BULWARK ROARS', tint: '#60a5fa' },
  ],
  attacks: [
    mkAttack({
      id: 'maceslam', name: 'Mace Slam', windup: 44, active: 8, recovery: 42, damage: 32, poise: 28, weight: 3, maxRange: 170, telegraph: 'slam', color: '#60a5fa', unblockable: true,
      sfxWindup: 'windup_slam', sfxActive: 'slam',
      hitbox: (_t, c) => [frontBox(c.boss, 150, 70, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 10) face(c); dash(c, t > 16 && t < 36 ? 1.6 : 0); } else halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t === 0) { c.shake(10); shockwave(c, 6, 16, '#60a5fa'); } },
    }),
    mkAttack({
      id: 'shieldbash', name: 'Shield Bash', windup: 26, active: 10, recovery: 30, damage: 18, poise: 30, weight: 2.5, minRange: 60, maxRange: 380, telegraph: 'thrust', color: '#93c5fd', faceLock: true,
      hitbox: (_t, c) => [frontBox(c.boss, 90, 90, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 8) face(c); halt(c); } else if (ph === 'active') dash(c, 11); else halt(c); },
    }),
    mkAttack({
      id: 'quake', name: 'Gate Quake', windup: 56, active: 6, recovery: 50, damage: 26, poise: 20, weight: 2, telegraph: 'slam', color: '#3b82f6', phaseMin: 1, unblockable: true,
      sfxWindup: 'windup_slam', sfxActive: 'slam',
      hitbox: (_t, c) => [aroundBox(c.boss, 120, 40, 0)],
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t === 0) { c.shake(16); shockwave(c, 7, 18, '#60a5fa', 1); shockwave(c, 7, 18, '#60a5fa', -1); } },
    }),
  ],
};

export const TWIN_SENTINELS: BossDef = {
  id: 'twins',
  name: 'The Twin Sentinels',
  title: 'Blade and Bulwark of the Gate',
  archetype: 'Duo',
  icon: '👥',
  hp: 400,
  poiseMax: 70,
  width: 48,
  height: 110,
  speed: 3.0,
  arenaWidth: 1000,
  body: 'knight',
  weapon: 'sword',
  colors: { primary: '#0e7490', secondary: '#0f172a', accent: '#67e8f9', glow: '#22d3ee' },
  arenaTheme: 'ruins',
  unlocksRelic: 'wolffang',
  companions: [SENTINEL_BULWARK],
  lore: 'Born on the same night, sworn on the same stone. The Blade strikes where the Bulwark points, and the Bulwark stands where the Blade cannot. Kill one, and the other forgets every rule they ever kept.',
  music: { bpm: 124, root: 43, mode: MODES.aeolian, bassPattern: [0, -1, 0, 3, -1, 0, 5, -1], arpPattern: [0, 3, 7, 3, 0, 5, 7, 5] },
  phases: [
    { hpThreshold: 1, speedMult: 1, aggression: 0.45, name: 'Blade', attackIds: ['cut1', 'dashcut'] },
    { hpThreshold: 0.5, speedMult: 1.25, aggression: 0.75, name: 'Blade Enraged', attackIds: ['cut1', 'dashcut', 'leap'], announce: 'THE BLADE SCREAMS', tint: '#22d3ee' },
  ],
  attacks: [
    mkAttack({
      id: 'cut1', name: 'Sentinel Cut', windup: 22, active: 6, recovery: 8, damage: 14, poise: 8, weight: 3, maxRange: 140, telegraph: 'slash', chain: 'cut2',
      hitbox: (_t, c) => [frontBox(c.boss, 120, 85, 12)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 5) face(c); dash(c, 2.4); } else if (ph === 'active') dash(c, 3); else halt(c); },
    }),
    mkAttack({
      id: 'cut2', name: 'Sentinel Cut II', windup: 16, active: 6, recovery: 28, damage: 16, poise: 10, weight: 0, telegraph: 'slash',
      hitbox: (_t, c) => [frontBox(c.boss, 125, 85, 12)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 3) face(c); dash(c, 2.4); } else if (ph === 'active') dash(c, 3); else halt(c); },
    }),
    mkAttack({
      id: 'dashcut', name: 'Dash Cut', windup: 26, active: 10, recovery: 30, damage: 20, poise: 12, weight: 2.5, minRange: 120, maxRange: 480, telegraph: 'thrust', color: '#67e8f9', faceLock: true,
      sfxWindup: 'windup_thrust',
      hitbox: (_t, c) => [frontBox(c.boss, 110, 70, 10)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 8) face(c); halt(c); } else if (ph === 'active') dash(c, 13); else halt(c); },
    }),
    mkAttack({
      id: 'leap', name: 'Falling Star', windup: 32, active: 8, recovery: 30, damage: 26, poise: 18, weight: 2, minRange: 80, maxRange: 400, telegraph: 'slam', color: '#22d3ee', phaseMin: 1,
      sfxWindup: 'windup_slam', sfxActive: 'slam',
      hitbox: (_t, c) => [aroundBox(c.boss, 90, 60, 0)],
      motion: (ph, t, c) => {
        const b = c.boss;
        if (ph === 'windup') { if (t < 6) face(c); if (t >= 8) { if (t === 8) b.vy = 10; dash(c, Math.min(7, dist(c) / 24)); } else halt(c); }
        else if (ph === 'active') { halt(c); b.y = 0; b.vy = 0; if (t === 0) { c.shake(8); c.particles(b.x, 4, 14, '#22d3ee', 5, 'shard'); } }
        else halt(c);
      },
    }),
  ],
};

// ===================== THE HOLLOW KING (Final Boss) =====================
export const HOLLOW_KING: BossDef = {
  id: 'hollow_king',
  name: 'The Hollow King',
  title: 'Last Ember of the Ashen Throne',
  archetype: 'Final Boss',
  icon: '💀',
  hp: 1500,
  poiseMax: 150,
  width: 64,
  height: 146,
  speed: 2.8,
  arenaWidth: 1100,
  body: 'king',
  weapon: 'greatsword',
  colors: { primary: '#3f3f46', secondary: '#18181b', accent: '#fde68a', glow: '#facc15' },
  arenaTheme: 'throne',
  staggerFrames: 100,
  arenaHazardsOnPhase: 2,
  lore: 'He fed the first fire with his own name and ruled a thousand years of borrowed light. When the flame asked for more, he gave it his knights, his queen, and at last his face. What sits the throne now is a crown holding up an absence — and it will not let the fire die.',
  music: { bpm: 128, root: 41, mode: MODES.phrygian, bassPattern: [0, 0, -1, 0, 1, -1, 0, 4], arpPattern: [0, 1, 4, 7, 4, 1, 0, 5] },
  phases: [
    { hpThreshold: 1, speedMult: 1, aggression: 0.5, name: 'The Crown', attackIds: ['kcombo1', 'kslam', 'kthrust'] },
    { hpThreshold: 0.6, speedMult: 1.15, aggression: 0.7, name: 'The Fire', attackIds: ['kcombo1', 'kslam', 'kthrust', 'kteleport', 'korbs', 'kpillars'], announce: 'THE KING CALLS THE FIRST FLAME', tint: '#f97316' },
    { hpThreshold: 0.25, speedMult: 1.3, aggression: 0.92, name: 'The Hollow', attackIds: ['kcombo1', 'kslam', 'kteleport', 'korbs', 'kpillars', 'kingsfall', 'kstorm', 'krain'], announce: 'LET IT ALL BURN', tint: '#fbbf24' },
  ],
  attacks: [
    mkAttack({
      id: 'kcombo1', name: 'Regicide I', windup: 26, active: 7, recovery: 8, damage: 20, poise: 12, weight: 3, maxRange: 170, telegraph: 'slash', chain: 'kcombo2',
      hitbox: (_t, c) => [frontBox(c.boss, 160, 110, 10)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 6) face(c); dash(c, t > 10 ? 2.6 : 0); } else if (ph === 'active') dash(c, 3.5); else halt(c); },
    }),
    mkAttack({
      id: 'kcombo2', name: 'Regicide II', windup: 18, active: 7, recovery: 8, damage: 20, poise: 12, weight: 0, telegraph: 'slash', chain: 'kcombo3', chainChance: 0.8,
      hitbox: (_t, c) => [frontBox(c.boss, 160, 110, 10)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 4) face(c); dash(c, 2.4); } else if (ph === 'active') dash(c, 3.5); else halt(c); },
    }),
    mkAttack({
      id: 'kcombo3', name: 'Regicide III', windup: 28, active: 8, recovery: 40, damage: 30, poise: 22, weight: 0, telegraph: 'slam', color: '#fbbf24', unblockable: true,
      sfxWindup: 'windup_slam', sfxActive: 'slam',
      hitbox: (_t, c) => [frontBox(c.boss, 175, 120, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 4) face(c); dash(c, t > 8 ? 3 : 0); } else if (ph === 'active') dash(c, 4); else halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t === 0) { c.shake(10); if (c.boss.phase >= 1) shockwave(c, 8, 20, '#fbbf24'); } },
    }),
    mkAttack({
      id: 'kslam', name: 'Crownbreaker', windup: 50, active: 8, recovery: 44, damage: 42, poise: 34, weight: 2, maxRange: 210, unblockable: true, telegraph: 'slam', color: '#ef4444',
      sfxWindup: 'windup_slam', sfxActive: 'slam',
      hitbox: (_t, c) => [frontBox(c.boss, 190, 80, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 10) face(c); dash(c, t > 20 && t < 42 ? 1.8 : 0); } else halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t === 0) {
          c.shake(16);
          c.particles(c.boss.x + c.boss.facing * 130, 4, 26, '#fbbf24', 6, 'shard');
          shockwave(c, 7, 20, '#fbbf24');
          if (c.boss.phase >= 2) shockwave(c, 7, 20, '#fbbf24', -c.boss.facing);
        }
      },
    }),
    mkAttack({
      id: 'kthrust', name: 'Sovereign Thrust', windup: 30, active: 12, recovery: 36, damage: 30, poise: 18, weight: 2.5, minRange: 170, maxRange: 600, telegraph: 'thrust', color: '#38bdf8', faceLock: true,
      sfxWindup: 'windup_thrust',
      hitbox: (_t, c) => [frontBox(c.boss, 150, 56, 32)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 12) face(c); dash(c, t > 20 ? -1.5 : 0); } else if (ph === 'active') dash(c, t < 8 ? 16 : 6); else halt(c); },
    }),
    mkAttack({
      id: 'kteleport', name: 'Ashen Step', windup: 20, active: 1, recovery: 10, damage: 0, poise: 0, weight: 2, telegraph: 'teleport', color: '#facc15', phaseMin: 1, chain: 'kcombo1', chainChance: 0.6,
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t === 0) {
          const behind = c.player.x - dirToPlayer(c) * 130;
          teleportTo(c, behind, '#facc15');
        }
      },
    }),
    mkAttack({
      id: 'korbs', name: 'Flames of the Throne', windup: 34, active: 30, recovery: 30, damage: 16, poise: 6, weight: 2.5, minRange: 150, telegraph: 'magic', color: '#f97316', phaseMin: 1,
      sfxWindup: 'windup_magic',
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t % 10 === 0) {
          c.sfx('magic');
          aimedShot(c, 80, 7.5, 16, '#f97316', 'orb', (t / 10 - 1) * 0.12, 11);
        }
      },
    }),
    mkAttack({
      id: 'kpillars', name: 'Pyre of Kings', windup: 36, active: 4, recovery: 44, damage: 28, poise: 14, weight: 2.5, telegraph: 'magic', color: '#fb923c', phaseMin: 1,
      sfxWindup: 'windup_magic',
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'windup' && t === 8) {
          const px = c.player.x;
          const n = c.boss.phase >= 2 ? 4 : 3;
          for (let i = 0; i < n; i++) hazard(c, { type: 'pillar', x: clampToArena(c, px + (i - (n - 1) / 2) * 110, 20), w: 70, h: 200, warn: 44 + i * 5, life: 18, damage: 28, color: '#fb923c' });
        }
      },
    }),
    mkAttack({
      id: 'kingsfall', name: 'Kingsfall', windup: 78, active: 6, recovery: 70, damage: 60, poise: 40, weight: 1.5, telegraph: 'roar', color: '#fef08a', phaseMin: 2, unblockable: true, hyperArmor: true,
      sfxWindup: 'roar', sfxActive: 'thunder',
      hitbox: (_t, c) => [aroundBox(c.boss, 700, 200, 0)],
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'windup' && t % 8 === 0) c.particles(c.boss.x, 70, 12, '#fef08a', 7, 'spark');
        if (ph === 'windup' && t === 40) c.sfx('phase');
        if (ph === 'active' && t === 0) { c.shake(30); c.particles(c.boss.x, 60, 80, '#fde047', 14, 'ring'); }
      },
    }),
    mkAttack({
      id: 'kstorm', name: 'Storm of Ash', windup: 40, active: 50, recovery: 46, damage: 16, poise: 10, weight: 2, maxRange: 300, multiHit: 12, telegraph: 'spin', color: '#f97316', phaseMin: 2,
      sfxWindup: 'windup_spin',
      hitbox: (_t, c) => [aroundBox(c.boss, 135, 120, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { face(c); halt(c); } else if (ph === 'active') { if (t % 12 === 0) face(c); chase(c, 2.6, 30); } else halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t % 12 === 0) { c.sfx('swoosh_heavy'); c.particles(c.boss.x, 60, 10, '#f97316', 7, 'spark'); } },
    }),
    mkAttack({
      id: 'krain', name: 'Rain of Embers', windup: 30, active: 60, recovery: 30, damage: 14, poise: 6, weight: 2, minRange: 120, telegraph: 'magic', color: '#fbbf24', phaseMin: 2,
      sfxWindup: 'windup_magic',
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t % 8 === 0) {
          const x = c.player.x + (c.rng() - 0.5) * 320;
          projectile(c, { x: clampToArena(c, x, 10), y: 420, vx: 0, vy: -9, r: 9, damage: 14, color: '#fbbf24', kind: 'bolt', life: 80, gravity: -0.15 });
        }
      },
    }),
  ],
};
