import type { AttackCtx, AttackDef, Rect, Projectile, Hazard, BossEntity } from '../types';

export function mkAttack(a: Partial<AttackDef> & { id: string; name: string }): AttackDef {
  return {
    windup: 30,
    active: 8,
    recovery: 30,
    damage: 15,
    poise: 10,
    weight: 1,
    minRange: 0,
    maxRange: 9999,
    telegraph: 'slash',
    ...a,
  };
}

/** Box in front of the boss. reach = distance from center to far edge. */
export function frontBox(b: BossEntity, reach: number, h: number, yOff = 0, start = 0): Rect {
  const w = reach - start;
  const x = b.facing === 1 ? b.x + start : b.x - reach;
  return { x, y: b.y + yOff, w, h };
}

export function aroundBox(b: BossEntity, radius: number, h: number, yOff = 0): Rect {
  return { x: b.x - radius, y: b.y + yOff, w: radius * 2, h };
}

export function dist(ctx: AttackCtx) {
  return Math.abs(ctx.player.x - ctx.boss.x);
}

export function dirToPlayer(ctx: AttackCtx): 1 | -1 {
  return ctx.player.x >= ctx.boss.x ? 1 : -1;
}

export function face(ctx: AttackCtx) {
  ctx.boss.facing = dirToPlayer(ctx);
}

export function dash(ctx: AttackCtx, speed: number, dir?: number) {
  ctx.boss.vx = (dir ?? ctx.boss.facing) * speed;
}

export function halt(ctx: AttackCtx) {
  ctx.boss.vx = 0;
}

/** Move toward player but stop when within `stopAt` */
export function chase(ctx: AttackCtx, speed: number, stopAt: number) {
  const d = dist(ctx);
  if (d > stopAt) ctx.boss.vx = dirToPlayer(ctx) * speed;
  else ctx.boss.vx = 0;
}

export function projectile(ctx: AttackCtx, p: Partial<Projectile> & { x: number; y: number; vx: number; vy: number }): void {
  ctx.spawnProjectile({
    r: 10,
    damage: 12,
    poise: 5,
    life: 240,
    color: '#fbbf24',
    gravity: 0,
    owner: 'boss',
    parryable: true,
    kind: 'orb',
    ...p,
  });
}

export function hazard(ctx: AttackCtx, h: Partial<Hazard> & { x: number; type: Hazard['type'] }): void {
  ctx.spawnHazard({
    w: 80,
    h: 60,
    warn: 40,
    life: 20,
    damage: 15,
    tick: 0,
    hit: false,
    color: '#f97316',
    poise: 10,
    ...h,
  });
}

/** Ground shockwave traveling in boss facing direction */
export function shockwave(ctx: AttackCtx, speed: number, damage: number, color = '#fbbf24', dir?: number) {
  const d = dir ?? ctx.boss.facing;
  projectile(ctx, {
    x: ctx.boss.x + d * 40,
    y: 14,
    vx: d * speed,
    vy: 0,
    r: 16,
    damage,
    color,
    kind: 'shock',
    life: 150,
    parryable: false,
    poise: 12,
  });
}

/** Fire an aimed projectile at player from a point on the boss */
export function aimedShot(ctx: AttackCtx, fromY: number, speed: number, damage: number, color: string, kind: Projectile['kind'] = 'arrow', spread = 0, r = 7) {
  const dx = ctx.player.x - ctx.boss.x;
  const dy = ctx.player.y + 28 - (ctx.boss.y + fromY);
  const len = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx) + spread;
  projectile(ctx, {
    x: ctx.boss.x + (dx / len) * 20,
    y: ctx.boss.y + fromY,
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    r,
    damage,
    color,
    kind,
    life: 200,
    trail: true,
  });
}

export function clampToArena(ctx: AttackCtx, x: number, margin = 60) {
  return Math.max(ctx.arena.left + margin, Math.min(ctx.arena.right - margin, x));
}

export function teleportTo(ctx: AttackCtx, x: number, color: string) {
  ctx.particles(ctx.boss.x, ctx.boss.y + ctx.boss.def.height / 2, 24, color, 4, 'blob');
  ctx.boss.x = clampToArena(ctx, x);
  ctx.particles(ctx.boss.x, ctx.boss.y + ctx.boss.def.height / 2, 24, color, 4, 'blob');
  ctx.sfx('teleport');
  face(ctx);
}

export function pick<T>(ctx: AttackCtx, arr: T[]): T {
  return arr[Math.floor(ctx.rng() * arr.length)];
}

/** Standard music scales */
export const MODES = {
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};
