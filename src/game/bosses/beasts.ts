import type { BossDef } from '../types';
import { mkAttack, frontBox, aroundBox, dash, halt, face, chase, hazard, projectile, aimedShot, MODES, clampToArena, dirToPlayer, dist } from './helpers';

// ===================== FENRIK THE STARVED (Beast) =====================
export const WOLF: BossDef = {
  id: 'wolf',
  name: 'Fenrik the Starved',
  title: 'Hound of the Hollow Moon',
  archetype: 'Beast',
  icon: '🐺',
  hp: 660,
  poiseMax: 95,
  width: 118,
  height: 92,
  speed: 4.6,
  arenaWidth: 1000,
  body: 'beast',
  weapon: 'claws',
  colors: { primary: '#374151', secondary: '#111827', accent: '#e5e7eb', glow: '#f43f5e' },
  arenaTheme: 'forest',
  unlocksRelic: 'ironheart',
  staggerFrames: 90,
  lore: 'A wolf was left chained at the crossroads as an offering to the Hollow Moon. The moon accepted. What came back down the chain was still hungry, and it has never once been full.',
  music: { bpm: 148, root: 43, mode: MODES.aeolian, bassPattern: [0, 0, -1, 0, 0, 3, -1, 2], arpPattern: [0, 7, 3, 7, 0, 5, 3, 7] },
  phases: [
    { hpThreshold: 1, speedMult: 1, aggression: 0.6, name: 'Hunger', attackIds: ['bite1', 'pounce', 'rake', 'circle'] },
    { hpThreshold: 0.5, speedMult: 1.18, aggression: 0.85, name: 'Moonfrenzy', attackIds: ['bite1', 'pounce', 'rake', 'circle', 'frenzy', 'dpounce'], announce: 'THE HOLLOW MOON RISES', tint: '#f43f5e' },
    { hpThreshold: 0.2, speedMult: 1.3, aggression: 1, name: 'Feral', attackIds: ['bite1', 'rake', 'frenzy', 'dpounce', 'howl'], announce: 'FERAL', tint: '#fb7185' },
  ],
  attacks: [
    mkAttack({
      id: 'bite1', name: 'Snap', windup: 18, active: 5, recovery: 5, damage: 12, poise: 8, weight: 3, maxRange: 140, telegraph: 'slash', chain: 'bite2',
      sfxActive: 'bite',
      hitbox: (_t, c) => [frontBox(c.boss, 120, 60, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 4) face(c); dash(c, 3.5); } else if (ph === 'active') dash(c, 4); else halt(c); },
    }),
    mkAttack({
      id: 'bite2', name: 'Snap II', windup: 13, active: 5, recovery: 5, damage: 12, poise: 8, weight: 0, telegraph: 'slash', chain: 'bite3', chainChance: 0.8,
      sfxActive: 'bite',
      hitbox: (_t, c) => [frontBox(c.boss, 120, 60, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 3) face(c); dash(c, 3.5); } else if (ph === 'active') dash(c, 4); else halt(c); },
    }),
    mkAttack({
      id: 'bite3', name: 'Rend', windup: 20, active: 6, recovery: 30, damage: 18, poise: 14, weight: 0, telegraph: 'slam', color: '#f43f5e',
      sfxActive: 'bite',
      hitbox: (_t, c) => [frontBox(c.boss, 135, 70, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 4) face(c); dash(c, t > 8 ? 5 : 0); } else if (ph === 'active') dash(c, 5); else halt(c); },
    }),
    mkAttack({
      id: 'pounce', name: 'Moon Pounce', windup: 28, active: 20, recovery: 28, damage: 26, poise: 18, weight: 3, minRange: 150, maxRange: 620, telegraph: 'pounce', color: '#fb7185', faceLock: true,
      sfxWindup: 'windup_pounce',
      hitbox: (_t, c) => [aroundBox(c.boss, 60, 70, 0)],
      motion: (ph, t, c) => {
        const b = c.boss;
        if (ph === 'windup') { if (t < 10) face(c); dash(c, t > 16 ? -1.5 : 0); }
        else if (ph === 'active') {
          if (t === 0) { b.vy = 7.5; b.data.px = Math.min(18, dist(c) / 16); }
          dash(c, b.data.px || 12);
          if (t > 4 && b.y <= 0) { b.vx = 0; }
        } else halt(c);
      },
      onFrame: (ph, t, c) => { if (ph === 'active' && t === 16) { c.shake(6); c.particles(c.boss.x, 4, 10, '#6b7280', 4, 'blob'); } },
    }),
    mkAttack({
      id: 'rake', name: 'Raking Dash', windup: 22, active: 14, recovery: 22, damage: 20, poise: 12, weight: 2.5, minRange: 60, maxRange: 400, telegraph: 'thrust', color: '#f43f5e', faceLock: true,
      sfxWindup: 'windup_pounce',
      hitbox: (_t, c) => [aroundBox(c.boss, 75, 60, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 8) face(c); dash(c, -1); } else if (ph === 'active') dash(c, 17); else { if (t === 4) face(c); halt(c); } },
      onFrame: (ph, _t, c) => { if (ph === 'active') c.particles(c.boss.x, 20, 2, '#9ca3af', 2, 'blob'); },
    }),
    mkAttack({
      id: 'circle', name: 'Circling', windup: 10, active: 30, recovery: 6, damage: 0, poise: 0, weight: 1.5, maxRange: 300, telegraph: 'slash', chain: 'pounce', chainChance: 0.6,
      motion: (ph, t, c) => {
        const b = c.boss;
        if (ph === 'windup') { face(c); halt(c); }
        else if (ph === 'active') {
          const d = dist(c);
          const away = -dirToPlayer(c);
          const wall = (away === -1 && b.x - c.arena.left < 120) || (away === 1 && c.arena.right - b.x < 120);
          if (d < 260 && !wall) dash(c, away * 6); else if (t % 10 < 5) dash(c, -away * 3); else halt(c);
          b.facing = dirToPlayer(c);
        } else halt(c);
      },
    }),
    mkAttack({
      id: 'frenzy', name: 'Frenzy', windup: 24, active: 36, recovery: 34, damage: 8, poise: 5, weight: 2.5, maxRange: 180, multiHit: 7, telegraph: 'spin', color: '#fb7185', phaseMin: 1,
      sfxWindup: 'roar',
      hitbox: (_t, c) => [frontBox(c.boss, 125, 65, 0)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 6) face(c); halt(c); } else if (ph === 'active') { if (t % 7 === 0) face(c); chase(c, 3.5, 50); } else halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t % 7 === 0) { c.sfx('bite'); c.particles(c.boss.x + c.boss.facing * 80, 30, 4, '#fda4af', 4, 'spark'); } },
    }),
    mkAttack({
      id: 'dpounce', name: 'Double Pounce', windup: 24, active: 20, recovery: 6, damage: 24, poise: 16, weight: 2.5, minRange: 120, maxRange: 620, telegraph: 'pounce', color: '#f43f5e', faceLock: true, phaseMin: 1, chain: 'pounce',
      sfxWindup: 'windup_pounce',
      hitbox: (_t, c) => [aroundBox(c.boss, 60, 70, 0)],
      motion: (ph, t, c) => {
        const b = c.boss;
        if (ph === 'windup') { if (t < 8) face(c); halt(c); }
        else if (ph === 'active') {
          if (t === 0) { b.vy = 7; b.data.px = Math.min(18, dist(c) / 15); }
          dash(c, b.data.px || 12);
          if (t > 4 && b.y <= 0) b.vx = 0;
        } else { face(c); halt(c); }
      },
    }),
    mkAttack({
      id: 'howl', name: 'Hollow Howl', windup: 46, active: 6, recovery: 30, damage: 20, poise: 30, weight: 1.5, telegraph: 'roar', color: '#fb7185', phaseMin: 2, chain: 'frenzy',
      sfxWindup: 'roar',
      hitbox: (_t, c) => [aroundBox(c.boss, 220, 120, 0)],
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t === 0) { c.shake(10); c.particles(c.boss.x, 40, 30, '#fb7185', 10, 'ring'); } },
    }),
  ],
};

// ===================== THE STORM DRAKE =====================
export const DRAKE: BossDef = {
  id: 'drake',
  name: 'Vaelith, the Storm Drake',
  title: 'Tyrant of the Thunder Peak',
  archetype: 'Beast',
  icon: '🐉',
  hp: 1050,
  poiseMax: 140,
  width: 160,
  height: 146,
  speed: 2.8,
  arenaWidth: 1300,
  body: 'drake',
  weapon: 'none',
  colors: { primary: '#1e3a5f', secondary: '#0c1a2e', accent: '#7dd3fc', glow: '#38bdf8' },
  arenaTheme: 'peak',
  unlocksWeapon: 'spear',
  staggerFrames: 120,
  lore: 'The peak was a mountain until Vaelith nested on it. Now it is a lightning rod with a grudge. Pilgrims once climbed to ask the drake for rain. It gave them the storm, and kept their bones for the nest.',
  music: { bpm: 120, root: 40, mode: MODES.dorian, bassPattern: [0, -1, 0, 0, -1, 4, -1, 3], arpPattern: [0, 4, 7, 9, 7, 4, 0, 2] },
  phases: [
    { hpThreshold: 1, speedMult: 1, aggression: 0.45, name: 'Grounded', attackIds: ['dbite', 'tail', 'dlightning', 'wingbuffet'] },
    { hpThreshold: 0.5, speedMult: 1.15, aggression: 0.7, name: 'Takes Flight', attackIds: ['dbite', 'tail', 'dlightning', 'wingbuffet', 'swoop', 'breath', 'divebomb'], announce: 'THE STORM TAKES FLIGHT', tint: '#38bdf8' },
    { hpThreshold: 0.2, speedMult: 1.25, aggression: 0.9, name: 'Tempest', attackIds: ['dbite', 'tail', 'swoop', 'breath', 'divebomb', 'tempest'], announce: 'TEMPEST', tint: '#7dd3fc' },
  ],
  attacks: [
    mkAttack({
      id: 'dbite', name: 'Drake Bite', windup: 30, active: 6, recovery: 30, damage: 26, poise: 18, weight: 3, maxRange: 200, telegraph: 'slash', color: '#7dd3fc',
      sfxActive: 'bite',
      hitbox: (_t, c) => [frontBox(c.boss, 190, 80, 10, 40)],
      motion: (ph, t, c) => { if (ph === 'windup') { if (t < 8) face(c); dash(c, t > 12 ? 2 : 0); } else if (ph === 'active') dash(c, 3); else halt(c); },
    }),
    mkAttack({
      id: 'tail', name: 'Tail Sweep', windup: 36, active: 12, recovery: 40, damage: 30, poise: 26, weight: 2.5, maxRange: 240, telegraph: 'spin', color: '#38bdf8',
      sfxWindup: 'windup_spin', sfxActive: 'swoosh_heavy',
      hitbox: (_t, c) => [aroundBox(c.boss, 210, 70, 0)],
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t === 0) { c.shake(8); } },
    }),
    mkAttack({
      id: 'dlightning', name: 'Call Lightning', windup: 34, active: 4, recovery: 40, damage: 26, poise: 14, weight: 2.5, minRange: 120, telegraph: 'magic', color: '#a5f3fc',
      sfxWindup: 'windup_magic',
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => {
        if (ph === 'windup' && t === 6) {
          const n = c.boss.phase >= 1 ? 3 : 2;
          for (let i = 0; i < n; i++) hazard(c, { type: 'lightning', x: clampToArena(c, c.player.x + (i === 0 ? 0 : (c.rng() - 0.5) * 300), 10), w: 60, h: 400, warn: 44 + i * 8, life: 10, damage: 26, color: '#a5f3fc' });
        }
      },
    }),
    mkAttack({
      id: 'wingbuffet', name: 'Wing Buffet', windup: 30, active: 10, recovery: 34, damage: 18, poise: 30, weight: 2, maxRange: 260, telegraph: 'roar', color: '#7dd3fc',
      sfxWindup: 'windup', sfxActive: 'swoosh_heavy',
      hitbox: (_t, c) => [frontBox(c.boss, 250, 140, 0)],
      motion: (ph, _t, c) => { if (ph === 'windup') face(c); halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t % 3 === 0) c.particles(c.boss.x + c.boss.facing * 150, 40 + c.rng() * 80, 3, '#bae6fd', 6, 'blob'); },
    }),
    mkAttack({
      id: 'swoop', name: 'Storm Swoop', windup: 40, active: 30, recovery: 30, damage: 28, poise: 20, weight: 3, minRange: 200, telegraph: 'pounce', color: '#38bdf8', phaseMin: 1, faceLock: true, hyperArmor: true,
      sfxWindup: 'roar',
      hitbox: (_t, c) => [aroundBox(c.boss, 90, 100, 0)],
      motion: (ph, t, c) => {
        const b = c.boss;
        if (ph === 'windup') { if (t < 10) face(c); if (t > 10) { b.y = Math.min(150, b.y + 6); } halt(c); }
        else if (ph === 'active') { dash(c, 14); b.y = Math.max(0, 150 - t * 8); if (t === 16) c.shake(6); }
        else { halt(c); b.y = Math.max(0, b.y - 6); }
      },
      onFrame: (ph, t, c) => { if (ph === 'active' && t % 4 === 0) c.particles(c.boss.x, c.boss.y + 40, 3, '#7dd3fc', 3, 'spark'); if (ph === 'recovery' && t === 0) face(c); },
    }),
    mkAttack({
      id: 'breath', name: 'Storm Breath', windup: 36, active: 40, recovery: 40, damage: 12, poise: 6, weight: 2.5, minRange: 150, telegraph: 'magic', color: '#a5f3fc', phaseMin: 1, faceLock: true,
      sfxWindup: 'windup_magic',
      motion: (ph, t, c) => { if (ph === 'windup' && t < 10) face(c); halt(c); },
      onFrame: (ph, t, c) => { if (ph === 'active' && t % 5 === 0) { c.sfx('magic'); aimedShot(c, 90, 9, 12, '#a5f3fc', 'bolt', (c.rng() - 0.5) * 0.25, 8); } },
    }),
    mkAttack({
      id: 'divebomb', name: 'Thunderfall', windup: 56, active: 8, recovery: 50, damage: 44, poise: 40, weight: 2, telegraph: 'slam', color: '#38bdf8', phaseMin: 1, unblockable: true, hyperArmor: true,
      sfxWindup: 'windup_slam', sfxActive: 'thunder',
      hitbox: (_t, c) => [aroundBox(c.boss, 200, 90, 0)],
      motion: (ph, t, c) => {
        const b = c.boss;
        if (ph === 'windup') { if (t < 30) { b.y = Math.min(220, b.y + 8); chase(c, 5, 20); } else { halt(c); b.x += (c.player.x - b.x) * 0.06; } if (t === 50) b.data.drop = 1; if (b.data.drop) b.y = Math.max(0, b.y - 40); }
        else if (ph === 'active') { b.y = 0; b.data.drop = 0; halt(c); }
        else halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t === 0) { c.shake(22); c.particles(c.boss.x, 6, 40, '#38bdf8', 9, 'shard'); }
        if (ph === 'windup' && t % 6 === 0 && t > 30) c.particles(c.player.x, 2, 4, '#38bdf8', 2, 'spark');
      },
    }),
    mkAttack({
      id: 'tempest', name: 'Tempest', windup: 50, active: 80, recovery: 50, damage: 22, poise: 12, weight: 2.5, telegraph: 'roar', color: '#7dd3fc', phaseMin: 2, hyperArmor: true,
      sfxWindup: 'roar',
      motion: (ph, t, c) => { const b = c.boss; if (ph === 'windup') { face(c); b.y = Math.min(120, b.y + 4); } else if (ph === 'recovery') b.y = Math.max(0, b.y - 4); halt(c); void t; },
      onFrame: (ph, t, c) => {
        if (ph === 'active' && t % 10 === 0) {
          const x = t % 20 === 0 ? c.player.x : c.arena.left + c.rng() * c.arena.width;
          hazard(c, { type: 'lightning', x: clampToArena(c, x, 10), w: 60, h: 400, warn: 40, life: 10, damage: 22, color: '#a5f3fc' });
          if (t % 20 === 0) c.sfx('thunder');
        }
        if (ph === 'active' && t % 16 === 0) projectile(c, { x: c.boss.x, y: c.boss.y + 90, vx: (c.rng() - 0.5) * 6, vy: -2, r: 8, damage: 14, color: '#a5f3fc', kind: 'bolt', life: 120, gravity: -0.2 });
      },
    }),
  ],
};
