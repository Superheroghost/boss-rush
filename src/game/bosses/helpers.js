function mkAttack(a) {
  return {
    windup: 30,
    active: 8,
    recovery: 30,
    damage: 15,
    poise: 10,
    weight: 1,
    minRange: 0,
    maxRange: 9999,
    telegraph: "slash",
    ...a
  };
}
function frontBox(b, reach, h, yOff = 0, start = 0) {
  const w = reach - start;
  const x = b.facing === 1 ? b.x + start : b.x - reach;
  return { x, y: b.y + yOff, w, h };
}
function aroundBox(b, radius, h, yOff = 0) {
  return { x: b.x - radius, y: b.y + yOff, w: radius * 2, h };
}
function dist(ctx) {
  return Math.abs(ctx.player.x - ctx.boss.x);
}
function dirToPlayer(ctx) {
  return ctx.player.x >= ctx.boss.x ? 1 : -1;
}
function face(ctx) {
  ctx.boss.facing = dirToPlayer(ctx);
}
function dash(ctx, speed, dir) {
  ctx.boss.vx = (dir ?? ctx.boss.facing) * speed;
}
function halt(ctx) {
  ctx.boss.vx = 0;
}
function chase(ctx, speed, stopAt) {
  const d = dist(ctx);
  if (d > stopAt) ctx.boss.vx = dirToPlayer(ctx) * speed;
  else ctx.boss.vx = 0;
}
function projectile(ctx, p) {
  ctx.spawnProjectile({
    r: 10,
    damage: 12,
    poise: 5,
    life: 240,
    color: "#fbbf24",
    gravity: 0,
    owner: "boss",
    parryable: true,
    kind: "orb",
    ...p
  });
}
function hazard(ctx, h) {
  ctx.spawnHazard({
    w: 80,
    h: 60,
    warn: 40,
    life: 20,
    damage: 15,
    tick: 0,
    hit: false,
    color: "#f97316",
    poise: 10,
    ...h
  });
}
function shockwave(ctx, speed, damage, color = "#fbbf24", dir) {
  const d = dir ?? ctx.boss.facing;
  projectile(ctx, {
    x: ctx.boss.x + d * 40,
    y: 14,
    vx: d * speed,
    vy: 0,
    r: 16,
    damage,
    color,
    kind: "shock",
    life: 150,
    parryable: false,
    poise: 12
  });
}
function aimedShot(ctx, fromY, speed, damage, color, kind = "arrow", spread = 0, r = 7) {
  const dx = ctx.player.x - ctx.boss.x;
  const dy = ctx.player.y + 28 - (ctx.boss.y + fromY);
  const len = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx) + spread;
  projectile(ctx, {
    x: ctx.boss.x + dx / len * 20,
    y: ctx.boss.y + fromY,
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    r,
    damage,
    color,
    kind,
    life: 200,
    trail: true
  });
}
function clampToArena(ctx, x, margin = 60) {
  return Math.max(ctx.arena.left + margin, Math.min(ctx.arena.right - margin, x));
}
function teleportTo(ctx, x, color) {
  ctx.particles(ctx.boss.x, ctx.boss.y + ctx.boss.def.height / 2, 24, color, 4, "blob");
  ctx.boss.x = clampToArena(ctx, x);
  ctx.particles(ctx.boss.x, ctx.boss.y + ctx.boss.def.height / 2, 24, color, 4, "blob");
  ctx.sfx("teleport");
  face(ctx);
}
function pick(ctx, arr) {
  return arr[Math.floor(ctx.rng() * arr.length)];
}
const MODES = {
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  locrian: [0, 1, 3, 5, 6, 8, 10]
};
export {
  MODES,
  aimedShot,
  aroundBox,
  chase,
  clampToArena,
  dash,
  dirToPlayer,
  dist,
  face,
  frontBox,
  halt,
  hazard,
  mkAttack,
  pick,
  projectile,
  shockwave,
  teleportTo
};
