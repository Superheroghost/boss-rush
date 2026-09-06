import type { BossDef } from '../types';
import { mkAttack, frontBox, aroundBox, dash, halt, face, shockwave, hazard, projectile, aimedShot, teleportTo, MODES, clampToArena, dirToPlayer, dist } from './helpers';

// ===================== ASHEN HUNTRESS (Ranger) =====================
export const HUNTRESS: BossDef = {
  id: 'huntress',
  name: 'The Ashen Huntress',
  title: 'Last Arrow of the Greywood',
  archetype: 'Ranger',
  icon: '🏹',
  hp: 580,
  poiseMax: 70,
  width: 44,
  height: 106,
  speed: 3.8,
  arenaWidth: 1400,
  body: 'archer',
  weapon: 'bow',
  colors: { primary: '#3f6212', secondary: '#1c1917', accent: '#d9f99d', glow: '#fb923c' },
  arenaTheme: 'forest',
  unlocksRelic: 'quickdraw',
  keepDistance: 280,
  staggerFrames: 100,
  lore: 'She was sent to shoot the thing that was eating the Greywood. She shot it forty times. On the forty-first arrow the forest went quiet, and she realised the thing had been the forest, and she had been feeding it. She has not stopped shooting since.',
  music: { bpm: 132, root: 45, mode: MODES.dorian, bassPattern: [0, -1, 0, 2, -1, 0, 4, -1], arpPattern: [0, 2, 4, 5, 4, 2, 0, 6] },
  phases: [
    { hpThreshold: 1, speedMult: 1, aggression: 0.5, name: 'Tracking', attackIds: ['shot', 'volley', 'retreat', 'kick'] },
    { hpThreshold: 0.5, speedMult: 1.2, aggression: 0.75, name: 'Ashfire', attackIds: ['shot', 'volley', 'retreat', 'kick', 'firearrow', 'rain', 'pierce'], announce: 'THE ARROWS IGNITE', tint: '#fb923c' },
    { hpThreshold: 0.2, speedMult: 1.3, aggression: 0.9, name: 'Wildfire', attackIds: ['volley', 'retreat', 'firearrow', 'rain', 'pierce', 'storm'], announce: 'THE GREYWOOD BURNS', tint: '#f97316' },
  ],
  attacks: [
    mkAttack({
      id: 'shot', name: 'Grey Shot', windup: 24, active: 2, recovery: 22, damage: 14, poise: 6, weight: 3, minRange: 150, telegraph: 'shoot', color: '#d9f99d', faceLock: true,
      sfxWindup: 'windup_shoot',
      motion: (ph, t, c) => { if (ph === 'windup' && t < 10) face(c); halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t === 0) { c.sfx('arrow'); aimedShot(c, 60, 12, 14, '#d9f99d', 'arrow'); } },
    }),
    mkAttack({
      id: 'volley', name: 'Triple Volley', windup: 32, active: 20, recovery: 28, damage: 12, poise: 6, weight: 2.5, minRange: 200, telegraph: 'shoot', color: '#bef264', faceLock: true,
      sfxWindup: 'windup_shoot',
      motion: (ph, t, c) => { if (ph === 'windup' && t < 10) face(c); halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t % 7 === 0) { c.sfx('arrow'); aimedShot(c, 60, 11, 12, '#bef264', 'arrow', (c.rng() - 0.5) * 0.1); } },
    }),
    mkAttack({
      id: 'retreat', name: 'Hunter\'s Leap', windup: 8, active: 14, recovery: 12, damage: 0, poise: 0, weight: 3, maxRange: 220, telegraph: 'shoot', chain: 'shot', chainChance: 0.8,
      motion: (ph, t, c) => {
        const b = c.boss;
        if (ph === 'windup') { face(c); halt(c); }
        else if (ph === 'active') {
          if (t === 0) { b.vy = 6; c.sfx('dodge'); }
          // leap away, but toward center if near a wall
          const away = -dirToPlayer(c);
          const nearWall = (away === -1 && b.x - c.arena.left < 160) || (away === 1 && c.arena.right - b.x < 160);
          dash(c, nearWall ? -away * 12 : away * 9);
        } else halt(c);
      },
    }),
    mkAttack({
      id: 'kick', name: 'Boot Knife', windup: 16, active: 6, recovery: 18, damage: 12, poise: 24, weight: 2, maxRange: 95, telegraph: 'slash', color: '#d9f99d', chain: 'retreat',
      hitbox: (_t, c) => [frontBox(c.boss, 85, 70, 10)],
      motion: (ph, t, c) => { if (ph === 'windup' && t < 4) face(c); halt(c); },
    }),
    mkAttack({
      id: 'firearrow', name: 'Ashfire Arrow', windup: 30, active: 2, recovery: 26, damage: 16, poise: 8, weight: 2.5, minRange: 160, telegraph: 'shoot', color: '#fb923c', phaseMin: 1, faceLock: true,
      sfxWindup: 'windup_shoot',
      motion: (ph, t, c) => { if (ph === 'windup' && t < 10) face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t === 0) {
          c.sfx('crackle');
          const dx = c.player.x - c.boss.x;
          const frames = 40;
          projectile(c, { x: c.boss.x, y: 60, vx: dx / frames, vy: 0.5 * 0.4 * frames - 60 / frames, r: 8, damage: 16, color: '#fb923c', kind: 'arrow', gravity: -0.4, life: 200, groundHazard: 'fire', trail: true });
        }
      },
    }),
    mkAttack({
      id: 'rain', name: 'Rain of Ash', windup: 36, active: 4, recovery: 40, damage: 18, poise: 10, weight: 2.5, telegraph: 'shoot', color: '#fdba74', phaseMin: 1,
      sfxWindup: 'windup_shoot',
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'windup' && t === 6) {
          c.sfx('arrow');
          const n = c.boss.phase >= 2 ? 7 : 5;
          for (let i = 0; i < n; i++) hazard(c, { type: 'debris', x: clampToArena(c, c.player.x + (i - (n - 1) / 2) * 70, 10), w: 46, h: 60, warn: 42 + i * 4, life: 8, damage: 18, color: '#fdba74' });
        }
      },
    }),
    mkAttack({
      id: 'pierce', name: 'Heartseeker', windup: 52, active: 2, recovery: 34, damage: 34, poise: 20, weight: 1.5, minRange: 220, telegraph: 'shoot', color: '#f97316', phaseMin: 1, faceLock: true, unblockable: true,
      sfxWindup: 'windup_magic',
      motion: (ph, t, c) => { if (ph === 'windup' && t < 30) face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'windup' && t % 6 === 0) c.particles(c.boss.x + c.boss.facing * 30, 60, 3, '#f97316', 2, 'spark');
        if (ph === 'active' && t === 0) { c.sfx('thunder'); projectile(c, { x: c.boss.x, y: 30, vx: c.boss.facing * 20, vy: 0, r: 9, damage: 34, color: '#f97316', kind: 'arrow', life: 90, parryable: false, trail: true, poise: 20 }); }
      },
    }),
    mkAttack({
      id: 'storm', name: 'Wildfire Storm', windup: 40, active: 60, recovery: 40, damage: 12, poise: 6, weight: 2, minRange: 200, telegraph: 'shoot', color: '#f97316', phaseMin: 2, faceLock: true,
      sfxWindup: 'roar',
      motion: (ph, t, c) => { if (ph === 'windup' && t < 10) face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t % 6 === 0) { c.sfx('arrow'); aimedShot(c, 60, 11 + c.rng() * 3, 12, t % 12 === 0 ? '#f97316' : '#bef264', 'arrow', (c.rng() - 0.5) * 0.3); }
        if (ph === 'active' && t % 20 === 0) hazard(c, { type: 'fire', x: clampToArena(c, c.player.x + (c.rng() - 0.5) * 240, 10), w: 90, h: 40, warn: 30, life: 240, damage: 5, tick: 20, color: '#f97316' });
      },
    }),
  ],
};

// ===================== THE VEILED SORCERER =====================
export const SORCERER: BossDef = {
  id: 'sorcerer',
  name: 'Maledict the Veiled',
  title: 'Archivist of the Drowned Library',
  archetype: 'Sorcerer',
  icon: '🧙',
  hp: 640,
  poiseMax: 60,
  width: 50,
  height: 122,
  speed: 2.0,
  arenaWidth: 1200,
  body: 'mage',
  weapon: 'staff',
  colors: { primary: '#4c1d95', secondary: '#1e1b4b', accent: '#c4b5fd', glow: '#a78bfa' },
  arenaTheme: 'library',
  unlocksRelic: 'mirror',
  keepDistance: 320,
  flying: true,
  hoverHeight: 26,
  staggerFrames: 120,
  lore: 'Maledict read every book in the Drowned Library, then read the water, then read the dark between the shelves. What he found there wrote itself back into him. He is still turning pages that no longer exist.',
  music: { bpm: 118, root: 47, mode: MODES.harmonicMinor, bassPattern: [0, -1, 0, -1, 5, -1, 4, -1], arpPattern: [0, 3, 7, 11, 7, 3, 0, 8] },
  phases: [
    { hpThreshold: 1, speedMult: 1, aggression: 0.5, name: 'The Reading', attackIds: ['blink', 'orbs', 'ring', 'pillars'] },
    { hpThreshold: 0.5, speedMult: 1.15, aggression: 0.7, name: 'The Dark Between', attackIds: ['blink', 'orbs', 'ring', 'pillars', 'homing', 'tide'], announce: 'THE PAGES TURN THEMSELVES', tint: '#a78bfa' },
    { hpThreshold: 0.2, speedMult: 1.25, aggression: 0.9, name: 'Cataclysm', attackIds: ['blink', 'ring', 'pillars', 'homing', 'tide', 'cataclysm'], announce: 'THE LIBRARY DROWNS', tint: '#c4b5fd' },
  ],
  attacks: [
    mkAttack({
      id: 'blink', name: 'Veil Step', windup: 16, active: 1, recovery: 14, damage: 0, poise: 0, weight: 3, maxRange: 260, telegraph: 'teleport', color: '#a78bfa', chain: 'orbs', chainChance: 0.7,
      sfxWindup: 'windup_magic',
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t === 0) {
          const side = c.rng() < 0.5 ? -1 : 1;
          let tx = c.player.x + side * (380 + c.rng() * 200);
          if (tx < c.arena.left + 80 || tx > c.arena.right - 80) tx = c.player.x - side * (380 + c.rng() * 200);
          teleportTo(c, tx, '#a78bfa');
        }
      },
    }),
    mkAttack({
      id: 'orbs', name: 'Ink Bolts', windup: 30, active: 24, recovery: 26, damage: 14, poise: 5, weight: 3, minRange: 120, telegraph: 'magic', color: '#c4b5fd', faceLock: true,
      sfxWindup: 'windup_magic',
      motion: (ph, t, c) => { if (ph === 'windup' && t < 8) face(c); halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t % 8 === 0) { c.sfx('magic'); aimedShot(c, 70, 8, 14, '#c4b5fd', 'orb', (t / 8 - 1) * 0.1, 10); } },
    }),
    mkAttack({
      id: 'ring', name: 'Sigil Ring', windup: 40, active: 2, recovery: 40, damage: 16, poise: 8, weight: 2, telegraph: 'magic', color: '#8b5cf6',
      sfxWindup: 'windup_magic',
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t === 0) {
          c.sfx('magic');
          const n = c.boss.phase >= 2 ? 12 : 8;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            projectile(c, { x: c.boss.x, y: c.boss.y + 60, vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5, r: 10, damage: 16, color: '#8b5cf6', kind: 'orb', life: 220 });
          }
        }
      },
    }),
    mkAttack({
      id: 'pillars', name: 'Drowned Pillars', windup: 34, active: 4, recovery: 40, damage: 24, poise: 12, weight: 2.5, telegraph: 'magic', color: '#7c3aed',
      sfxWindup: 'windup_magic',
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'windup' && t === 6) {
          const n = c.boss.phase >= 1 ? 4 : 3;
          for (let i = 0; i < n; i++) hazard(c, { type: 'pillar', x: clampToArena(c, c.player.x + (i - (n - 1) / 2) * 120, 20), w: 66, h: 220, warn: 46 + i * 6, life: 16, damage: 24, color: '#7c3aed' });
        }
      },
    }),
    mkAttack({
      id: 'homing', name: 'Seeking Ink', windup: 36, active: 2, recovery: 40, damage: 18, poise: 8, weight: 2.5, telegraph: 'magic', color: '#e879f9', phaseMin: 1,
      sfxWindup: 'windup_magic',
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t === 0) {
          c.sfx('magic');
          for (let i = 0; i < 3; i++) projectile(c, { x: c.boss.x, y: c.boss.y + 80 + i * 20, vx: -c.boss.facing * 3, vy: 3 + i, r: 11, damage: 18, color: '#e879f9', kind: 'orb', life: 260, homing: 0.045 + i * 0.01, trail: true });
        }
      },
    }),
    mkAttack({
      id: 'tide', name: 'Black Tide', windup: 44, active: 2, recovery: 44, damage: 20, poise: 12, weight: 2, telegraph: 'magic', color: '#6d28d9', phaseMin: 1,
      sfxWindup: 'windup_magic',
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t === 0) {
          c.sfx('thunder');
          c.shake(8);
          projectile(c, { x: c.arena.left + 10, y: 14, vx: 6, vy: 0, r: 18, damage: 20, color: '#6d28d9', kind: 'shock', life: 260, parryable: false });
          projectile(c, { x: c.arena.right - 10, y: 14, vx: -6, vy: 0, r: 18, damage: 20, color: '#6d28d9', kind: 'shock', life: 260, parryable: false });
        }
      },
    }),
    mkAttack({
      id: 'cataclysm', name: 'Cataclysm', windup: 60, active: 90, recovery: 50, damage: 14, poise: 6, weight: 2.5, telegraph: 'roar', color: '#c4b5fd', phaseMin: 2, hyperArmor: true,
      sfxWindup: 'phase',
      motion: (ph, t, c) => {
        if (ph === 'windup') { face(c); if (t === 0) { const mid = (c.arena.left + c.arena.right) / 2; teleportTo(c, mid, '#c4b5fd'); } }
        halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === 'active') {
          if (t % 7 === 0) {
            const x = c.arena.left + c.rng() * c.arena.width;
            projectile(c, { x, y: 440, vx: 0, vy: -8, r: 9, damage: 14, color: '#c4b5fd', kind: 'bolt', life: 90, gravity: -0.12 });
          }
          if (t % 30 === 0) hazard(c, { type: 'pillar', x: clampToArena(c, c.player.x, 20), w: 66, h: 220, warn: 40, life: 16, damage: 24, color: '#7c3aed' });
        }
      },
    }),
  ],
};

// keep helpers referenced for tree-shaking consistency
void frontBox; void aroundBox; void shockwave; void dist;
