import type {
  AttackCtx, AttackDef, BossDef, BossEntity, Difficulty, Hazard, Particle, PlayerState, Projectile, Rect, RelicId, RunModifiers, SkinId, WeaponDef, WeaponId,
} from './types';
import { PLAYER, WEAPONS, DIFFICULTY_INFO, VIEW_W, BASE_ZOOM } from './data';
import { Input } from './input';
import { audio } from './audio';
import { BOSS_MAP } from './bosses';

export interface EngineConfig {
  bossId: string;
  weapon: WeaponId;
  relic: RelicId;
  skin: SkinId;
  difficulty: Difficulty;
  modifiers: RunModifiers;
  flaskCharges: number;
  showHitboxes: boolean;
  gauntletIndex?: number;
  runFramesStart?: number;
  onEvent: (e: GameEvent) => void;
}

export type GameEvent =
  | { type: 'victory'; timeMs: number; deaths: number; flaskLeft: number }
  | { type: 'death'; deaths: number }
  | { type: 'pause' }
  | { type: 'phase'; phase: number };

export interface Player {
  x: number; y: number; vx: number; vy: number; facing: 1 | -1;
  hp: number; maxHp: number; stamina: number; maxStamina: number; staminaDelay: number;
  state: PlayerState; timer: number;
  combo: number; attackHit: Set<number>; attackIsHeavy: boolean;
  dodgeDir: 1 | -1; iframes: number; parryTimer: number; blockJustPressed: boolean;
  flask: number; flaskMax: number; healedOnce: boolean; healFrames: number; healPoint: number;
  hurtFlash: number; deadTimer: number; sprinting: boolean; hyperArmor: boolean;
  lastDodgePerfect: number; guardFlash: number; healGlow: number; lastBlockEnd: number;
  windup: number; active: number; recovery: number; // current attack timings
}

export type FightState = 'intro' | 'fight' | 'victory' | 'dead' | 'paused';

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const TELEGRAPH_WINDUP_SFX: Record<string, string> = {
  slash: 'windup', slam: 'windup_slam', thrust: 'windup_thrust', magic: 'windup_magic', spin: 'windup_spin', shoot: 'windup_shoot', pounce: 'windup_pounce', roar: 'roar', teleport: 'windup_magic',
};
const TELEGRAPH_ACTIVE_SFX: Record<string, string> = {
  slash: 'swoosh_heavy', slam: 'slam', thrust: 'swoosh', magic: 'magic', spin: 'swoosh_heavy', shoot: 'arrow', pounce: 'thud', roar: 'roar', teleport: 'teleport',
};

export class Engine {
  cfg: EngineConfig;
  input = new Input();
  weapon: WeaponDef;
  bossDef: BossDef;
  bosses: BossEntity[] = [];
  player!: Player;
  projectiles: Projectile[] = [];
  hazards: Hazard[] = [];
  particles: Particle[] = [];
  arena = { left: 0, right: 0, width: 0 };
  frame = 0;
  fightFrames = 0;
  fightState: FightState = 'intro';
  introTimer = 0;
  hitstop = 0;
  shake = 0;
  flash = 0;
  flashColor = '#fff';
  camX = 0;
  camZoom = BASE_ZOOM;
  camTargetZoom = BASE_ZOOM;
  camFocusX = 0;
  deaths = 0;
  banner: { text: string; sub: string; timer: number; color: string } | null = null;
  floatTexts: { x: number; y: number; text: string; color: string; life: number }[] = [];
  rng = mulberry32(Date.now() & 0xffff);
  showHitboxes = false;
  transitionActive = false;
  victoryTimer = 0;
  crumbleTimer = 0;
  paused = false;
  slowmo = 0;
  musicPhase = 1;
  private accumulator = 0;
  private lastTime = 0;
  private raf = 0;
  running = false;
  hubMode = false;
  onRender: (() => void) | null = null;

  constructor(cfg: EngineConfig) {
    this.cfg = cfg;
    this.weapon = WEAPONS[cfg.weapon];
    this.bossDef = BOSS_MAP[cfg.bossId];
    this.showHitboxes = cfg.showHitboxes;
    this.reset(true);
  }

  get diff() {
    return DIFFICULTY_INFO[this.cfg.difficulty];
  }
  get mods() {
    return this.cfg.modifiers;
  }

  // ---------------- Setup ----------------
  reset(first = false) {
    const def = this.bossDef;
    const half = def.arenaWidth / 2;
    this.arena = { left: -half, right: half, width: def.arenaWidth };
    this.bosses = [];
    this.projectiles = [];
    this.hazards = [];
    this.particles = [];
    this.floatTexts = [];
    this.frame = 0;
    this.fightFrames = 0;
    this.hitstop = 0;
    this.shake = 0;
    this.flash = 0;
    this.banner = null;
    this.transitionActive = false;
    this.victoryTimer = 0;
    this.camZoom = BASE_ZOOM;
    this.camTargetZoom = BASE_ZOOM;
    this.musicPhase = 1;
    this.fightState = 'intro';
    this.introTimer = 110;
    this.paused = false;
    this.slowmo = 0;

    const spawnBoss = (d: BossDef, x: number, idx: number, companion: boolean) => {
      const hp = Math.round(d.hp * this.diff.hp);
      this.bosses.push({
        def: d, x, y: d.flying ? d.hoverHeight || 0 : 0, vx: 0, vy: 0, facing: -1, hp, maxHp: hp, poise: d.poiseMax, state: 'idle', stateTimer: 0, phase: 0,
        currentAttack: null, attackTimer: 0, attackHits: 0, lastHitFrame: -999, hitDone: false, idleFrames: 40, approachFrames: 0, bleed: 0, bleedMax: 100,
        parriedTimer: 0, transitionTimer: 0, isCompanion: companion, index: idx, lastAttackId: '', targetRange: [0, 9999], glow: 0, hurtFlash: 0, data: {}, deadTimer: 0, hitsTaken: 0,
      });
    };
    spawnBoss(def, half * 0.45, 0, false);
    (def.companions || []).forEach((c, i) => spawnBoss(c, half * 0.45 + 160 * (i + 1), i + 1, true));

    const relic = this.cfg.relic;
    const m = this.mods;
    let maxHp = PLAYER.maxHp + m.maxHpBonus + (relic === 'ironheart' ? 25 : 0) - (relic === 'wolffang' ? 15 : 0);
    if (this.cfg.difficulty === 'nightmare') maxHp = Math.max(1, Math.round(maxHp));
    const flaskMax = this.cfg.difficulty === 'nightmare' ? 0 : PLAYER.flaskMax + m.flaskBonus;
    const flask = first ? Math.min(flaskMax, this.cfg.flaskCharges) : flaskMax;
    this.player = {
      x: -half * 0.45, y: 0, vx: 0, vy: 0, facing: 1,
      hp: maxHp, maxHp, stamina: PLAYER.maxStamina, maxStamina: PLAYER.maxStamina, staminaDelay: 0,
      state: 'idle', timer: 0, combo: 0, attackHit: new Set(), attackIsHeavy: false, dodgeDir: 1, iframes: 0, parryTimer: 99, blockJustPressed: false,
      flask, flaskMax, healedOnce: false, healFrames: PLAYER.healFrames, healPoint: PLAYER.healPoint,
      hurtFlash: 0, deadTimer: 0, sprinting: false, hyperArmor: false, lastDodgePerfect: 0, guardFlash: 0, healGlow: 0, lastBlockEnd: -999, windup: 0, active: 0, recovery: 0,
    };
    // On respawn: restore the charges this fight started with (min 2) — gauntlet keeps flask pressure.
    if (!first) this.player.flask = Math.min(flaskMax, Math.max(Math.min(2, flaskMax), this.cfg.flaskCharges));
    this.camX = 0;
    this.camFocusX = 0;
    this.input.clearBuffer();
    audio.setIntensity(1);
  }

  restart() {
    this.reset(false);
  }

  // ---------------- Loop ----------------
  start() {
    this.input.attach();
    this.running = true;
    this.lastTime = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      let dt = t - this.lastTime;
      this.lastTime = t;
      if (dt > 100) dt = 100;
      this.accumulator += dt;
      const step = 1000 / 60;
      let n = 0;
      while (this.accumulator >= step && n < 4) {
        this.update();
        this.accumulator -= step;
        n++;
      }
      if (this.onRender) this.onRender();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.detach();
  }

  // ---------------- Helpers ----------------
  spawnParticles(x: number, y: number, n: number, color: string, speed = 4, shape: Particle['shape'] = 'spark') {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const s = speed * (0.3 + this.rng() * 0.9);
      const life = 18 + Math.floor(this.rng() * 26);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + (shape === 'shard' ? 3 : 0), life, maxLife: life, size: shape === 'ring' ? 6 : 2 + this.rng() * 3, color, gravity: shape === 'spark' ? -0.15 : shape === 'shard' ? -0.35 : 0, shape });
    }
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
  }

  addText(x: number, y: number, text: string, color: string) {
    this.floatTexts.push({ x, y, text, color, life: 50 });
  }

  addShake(n: number) {
    this.shake = Math.max(this.shake, n);
  }

  sfx(name: string) {
    audio.play(name);
  }

  playerHurtbox(): Rect {
    const p = this.player;
    return { x: p.x - PLAYER.width / 2, y: p.y, w: PLAYER.width, h: PLAYER.height };
  }

  bossHurtbox(b: BossEntity): Rect {
    return { x: b.x - b.def.width / 2, y: b.y, w: b.def.width, h: b.def.height };
  }

  nearestBoss(): BossEntity | null {
    let best: BossEntity | null = null;
    let bd = Infinity;
    for (const b of this.bosses) {
      if (b.state === 'dead') continue;
      const d = Math.abs(b.x - this.player.x);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  playerAttackBox(): Rect | null {
    const p = this.player;
    if (p.state !== 'light' && p.state !== 'heavy') return null;
    const t = p.timer - p.windup;
    if (t < 0 || t >= p.active) return null;
    const reach = this.weapon.reach + (p.state === 'heavy' ? 12 : 0);
    const h = p.state === 'heavy' ? 90 : 66;
    const x = p.facing === 1 ? p.x + 4 : p.x - 4 - reach;
    return { x, y: p.y, w: reach, h };
  }

  private makeCtx(b: BossEntity): AttackCtx {
    return {
      player: { x: this.player.x, y: this.player.y, facing: this.player.facing, hurtbox: this.playerHurtbox(), hp: this.player.hp },
      boss: b,
      spawnProjectile: (p) => this.projectiles.push(p),
      spawnHazard: (h) => this.hazards.push(h),
      particles: (x, y, n, c, s, sh) => this.spawnParticles(x, y, n, c, s, sh),
      shake: (n) => this.addShake(n),
      sfx: (n) => this.sfx(n),
      arena: this.arena,
      rng: this.rng,
      frame: this.frame,
      difficulty: this.cfg.difficulty,
      allBosses: this.bosses,
    };
  }

  // ---------------- Main update ----------------
  update() {
    // Hit-stop: freeze simulation (and input buffer aging) but keep fx alive
    if (this.hitstop > 0 && !this.paused) {
      this.hitstop--;
      this.frame++;
      this.updateCamera();
      if (this.shake > 0) this.shake *= 0.85;
      this.updateParticles();
      return;
    }
    this.input.tick();
    this.frame++;
    if (this.input.consume('hitbox')) this.showHitboxes = !this.showHitboxes;
    if (this.input.consume('pause') && (this.fightState === 'fight' || this.fightState === 'intro')) {
      this.paused = !this.paused;
      this.cfg.onEvent({ type: 'pause' });
    }
    if (this.paused) return;

    // camera & fx always update
    this.updateCamera();
    if (this.shake > 0) this.shake *= 0.85;
    if (this.shake < 0.3) this.shake = 0;
    if (this.flash > 0) this.flash -= 0.05;
    this.updateParticles();
    for (const t of this.floatTexts) { t.life--; t.y += 0.8; }
    this.floatTexts = this.floatTexts.filter((t) => t.life > 0);
    if (this.banner) { this.banner.timer--; if (this.banner.timer <= 0) this.banner = null; }

    if (this.slowmo > 0) { this.slowmo--; if (this.frame % 3 !== 0) return; }

    if (this.fightState === 'intro') {
      this.introTimer--;
      this.updatePlayer();
      this.resolveBodyCollisions();
      if (this.introTimer <= 0) { this.fightState = 'fight'; }
      return;
    }

    if (this.fightState === 'dead') {
      this.player.deadTimer++;
      for (const b of this.bosses) { b.vx *= 0.9; b.x += b.vx; }
      if (this.player.deadTimer === 50) this.cfg.onEvent({ type: 'death', deaths: this.deaths });
      if (this.player.deadTimer > 50 && (this.input.consume('restart') || this.input.consume('dodge') || this.input.consume('light'))) this.restart();
      return;
    }

    if (this.fightState === 'victory') {
      this.victoryTimer++;
      this.updatePlayer();
      for (const b of this.bosses) this.updateBossDead(b);
      if (this.victoryTimer === 110) {
        this.cfg.onEvent({ type: 'victory', timeMs: Math.round((this.fightFrames / 60) * 1000), deaths: this.deaths, flaskLeft: this.player.flask });
      }
      return;
    }

    // ---- FIGHT ----
    if (this.input.consume('restart')) { this.deaths++; this.restart(); return; }
    if (!this.transitionActive) this.fightFrames++;

    this.updatePlayer();
    for (const b of this.bosses) this.updateBoss(b);
    this.updateProjectiles();
    this.updateHazards();
    this.resolveBodyCollisions();
    this.checkPlayerAttacks();
    this.checkBossAttacks();
    this.checkArenaCrumble();

    // deaths / victory
    if (this.player.hp <= 0 && this.player.state !== 'dead') this.killPlayer();
    if (this.bosses.every((b) => b.state === 'dead') && this.fightState === 'fight') {
      this.fightState = 'victory';
      this.victoryTimer = 0;
      this.projectiles = [];
      this.hazards = [];
      this.player.iframes = 9999;
      this.banner = { text: 'PREY SLAUGHTERED', sub: this.bossDef.name, timer: 200, color: '#fbbf24' };
      this.sfx('victory');
      audio.setIntensity(0);
      if (this.cfg.relic === 'ember') this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.25);
    }
  }

  // ---------------- Player ----------------
  private setState(s: PlayerState) {
    if (this.player.state === 'block' && s !== 'block') this.player.lastBlockEnd = this.frame;
    this.player.state = s;
    this.player.timer = 0;
  }

  private spend(n: number) {
    this.player.stamina = Math.max(0, this.player.stamina - n);
    this.player.staminaDelay = PLAYER.staminaDelay;
  }

  private updatePlayer() {
    const p = this.player;
    const inp = this.input;
    const m = this.mods;
    p.timer++;
    if (p.iframes > 0) p.iframes--;
    if (p.hurtFlash > 0) p.hurtFlash--;
    if (p.guardFlash > 0) p.guardFlash--;
    if (p.healGlow > 0) p.healGlow--;
    if (p.lastDodgePerfect > 0) p.lastDodgePerfect--;
    p.hyperArmor = false;

    // stamina regen
    const regenMult = m.staminaRegenMult * (this.cfg.relic === 'swift' ? 1.2 : 1) * (p.state === 'block' ? 0.4 : 1);
    if (p.staminaDelay > 0) p.staminaDelay--;
    else if (!p.sprinting && p.state !== 'dodge' && p.state !== 'light' && p.state !== 'heavy') p.stamina = Math.min(p.maxStamina, p.stamina + PLAYER.staminaRegen * regenMult);

    const axis = inp.axis();
    const nearest = this.nearestBoss();
    const canAct = this.fightState === 'fight' || this.fightState === 'intro' || this.fightState === 'victory';
    const facingToTarget = (): 1 | -1 => (nearest ? (nearest.x >= p.x ? 1 : -1) : p.facing);

    const tryActions = (): boolean => {
      if (!canAct) return false;
      // Priority: dodge > heal > heavy > light > block
      if (inp.consume('dodge') && p.stamina > 0) {
        this.spend(PLAYER.dodgeCost * m.dodgeCostMult * (this.cfg.relic === 'gravewalker' ? 0.85 : 1));
        this.setState('dodge');
        p.dodgeDir = axis !== 0 ? (axis as 1 | -1) : ((-facingToTarget()) as 1 | -1);
        p.facing = p.dodgeDir;
        p.attackHit.clear();
        this.sfx('dodge');
        this.spawnParticles(p.x, 4, 6, '#9ca3af', 2, 'blob');
        return true;
      }
      if (inp.consume('heal') && p.flask > 0 && p.state !== 'heal') {
        p.flask--;
        const quick = this.cfg.relic === 'quickdraw' && !p.healedOnce;
        p.healedOnce = true;
        p.healFrames = quick ? 22 : PLAYER.healFrames;
        p.healPoint = quick ? 10 : PLAYER.healPoint;
        this.setState('heal');
        p.vx = 0;
        this.sfx('drink');
        return true;
      }
      if (inp.consume('heavy') && p.stamina > 0) {
        this.spend(this.weapon.heavyStamina);
        this.setState('heavy');
        p.facing = axis !== 0 ? (axis as 1 | -1) : facingToTarget();
        p.windup = this.weapon.heavyWindup; p.active = this.weapon.heavyActive; p.recovery = this.weapon.heavyRecovery;
        p.attackHit.clear(); p.attackIsHeavy = true; p.combo = 0;
        this.sfx('windup');
        return true;
      }
      if (inp.consume('light') && p.stamina > 0) {
        this.spend(this.weapon.lightStamina);
        this.setState('light');
        p.facing = axis !== 0 ? (axis as 1 | -1) : facingToTarget();
        p.windup = Math.max(3, Math.round(this.weapon.lightWindup * m.lightSpeedMult));
        p.active = this.weapon.lightActive;
        p.recovery = Math.max(6, Math.round(this.weapon.lightRecovery * m.lightSpeedMult));
        p.attackHit.clear(); p.attackIsHeavy = false;
        this.sfx('swoosh');
        return true;
      }
      if (inp.isHeld('block') && p.stamina > 0 && p.state !== 'block') {
        this.setState('block');
        // parry window only on a fresh guard (prevents block-mashing for infinite parry windows)
        p.parryTimer = this.frame - p.lastBlockEnd < 22 ? 99 : 0;
        p.facing = facingToTarget();
        inp.consume('block');
        return true;
      }
      return false;
    };

    switch (p.state) {
      case 'idle':
      case 'run': {
        p.sprinting = false;
        if (tryActions()) break;
        if (axis !== 0) {
          const sprint = inp.isHeld('sprint') && p.stamina > 0;
          p.sprinting = sprint;
          const spd = sprint ? PLAYER.sprintSpeed : PLAYER.runSpeed;
          if (sprint) { p.stamina = Math.max(0, p.stamina - PLAYER.sprintCost); p.staminaDelay = Math.max(p.staminaDelay, 8); }
          p.vx = axis * spd;
          p.facing = axis as 1 | -1;
          p.state = 'run';
        } else {
          p.vx = 0;
          p.state = 'idle';
          if (nearest) p.facing = facingToTarget();
        }
        break;
      }
      case 'dodge': {
        const t = p.timer;
        const rollEnd = PLAYER.dodgeFrames - PLAYER.dodgeRecovery;
        const iStart = PLAYER.dodgeIframeStart;
        const iCount = PLAYER.dodgeIframes + m.iframesBonus + (this.cfg.relic === 'gravewalker' ? 3 : 0);
        if (t >= iStart && t < iStart + iCount) p.iframes = Math.max(p.iframes, 1);
        if (t < rollEnd) {
          const k = 1 - t / rollEnd;
          p.vx = p.dodgeDir * PLAYER.dodgeSpeed * (0.35 + 0.65 * k);
        } else p.vx = 0;
        if (t >= PLAYER.dodgeFrames) { this.setState('idle'); tryActions(); }
        break;
      }
      case 'light':
      case 'heavy': {
        const t = p.timer;
        const total = p.windup + p.active + p.recovery;
        p.vx *= 0.6;
        const isHeavy = p.state === 'heavy';
        if (isHeavy && this.weapon.hyperArmor && t < p.windup + p.active) p.hyperArmor = true;
        // step forward slightly during active
        if (t === p.windup) { p.vx = p.facing * (isHeavy ? 2.5 : 2); this.sfx(isHeavy ? 'swoosh_heavy' : 'swoosh'); }
        const inRecovery = t >= p.windup + p.active;
        const recT = t - (p.windup + p.active);
        // combo chaining
        if (!isHeavy && inRecovery && recT >= Math.floor(p.recovery * 0.35) && p.combo < this.weapon.lightDmg.length - 1 && inp.buffered('light') && p.stamina > 0) {
          inp.consume('light');
          p.combo++;
          this.spend(this.weapon.lightStamina);
          this.setState('light');
          p.windup = Math.max(3, Math.round(this.weapon.lightWindup * m.lightSpeedMult * 0.8));
          if (axis !== 0) p.facing = axis as 1 | -1;
          p.attackHit.clear();
          break;
        }
        // heavy follow-up after light chain
        if (!isHeavy && inRecovery && recT >= Math.floor(p.recovery * 0.35) && inp.buffered('heavy') && p.stamina > 0) {
          inp.consume('heavy');
          this.spend(this.weapon.heavyStamina);
          this.setState('heavy');
          p.windup = Math.round(this.weapon.heavyWindup * 0.85); p.active = this.weapon.heavyActive; p.recovery = this.weapon.heavyRecovery;
          if (axis !== 0) p.facing = axis as 1 | -1;
          p.attackHit.clear(); p.attackIsHeavy = true; p.combo = 0;
          this.sfx('windup');
          break;
        }
        // dodge cancel late in recovery
        if (inRecovery && recT >= Math.floor(p.recovery * 0.55) && inp.buffered('dodge') && p.stamina > 0) {
          this.setState('idle'); p.combo = 0; tryActions(); break;
        }
        if (t >= total) { this.setState('idle'); p.combo = 0; tryActions(); }
        break;
      }
      case 'block': {
        p.parryTimer++;
        p.vx = axis * PLAYER.runSpeed * 0.45;
        if (nearest) p.facing = facingToTarget();
        if (!inp.isHeld('block') || p.stamina <= 0) { this.setState('idle'); tryActions(); break; }
        if (inp.buffered('dodge') || inp.buffered('light') || inp.buffered('heavy') || inp.buffered('heal')) { this.setState('idle'); tryActions(); }
        break;
      }
      case 'heal': {
        p.vx = 0;
        if (p.timer === p.healPoint) {
          const amt = PLAYER.healAmount * m.flaskMult;
          p.hp = Math.min(p.maxHp, p.hp + amt);
          p.healGlow = 30;
          this.sfx('heal');
          this.spawnParticles(p.x, 30, 18, '#fbbf24', 3, 'spark');
          this.addText(p.x, 70, `+${Math.round(amt)}`, '#fbbf24');
        }
        if (p.timer >= p.healFrames) { this.setState('idle'); tryActions(); }
        break;
      }
      case 'hitstun': {
        p.vx *= 0.85;
        if (p.timer >= PLAYER.hitstun) { this.setState('idle'); p.iframes = Math.max(p.iframes, PLAYER.postHitIframes); tryActions(); }
        break;
      }
      case 'guardbreak': {
        p.vx *= 0.85;
        if (p.timer >= PLAYER.guardBreakStun) { this.setState('idle'); tryActions(); }
        break;
      }
      case 'dead':
        p.vx *= 0.9;
        break;
    }

    // physics
    p.x += p.vx;
    const margin = PLAYER.width / 2;
    if (p.x < this.arena.left + margin) { p.x = this.arena.left + margin; }
    if (p.x > this.arena.right - margin) { p.x = this.arena.right - margin; }
  }

  private killPlayer() {
    const p = this.player;
    p.hp = 0;
    this.setState('dead');
    this.fightState = 'dead';
    p.deadTimer = 0;
    this.deaths++;
    this.sfx('death_player');
    this.addShake(10);
    this.spawnParticles(p.x, 30, 30, '#ef4444', 5, 'blob');
    audio.setIntensity(0);
    this.banner = { text: 'YOU DIED', sub: '', timer: 400, color: '#dc2626' };
  }

  /** Player receives a hit. Returns outcome. */
  private playerHit(damage: number, poise: number, sourceX: number, opts: { unblockable?: boolean; parryable?: boolean; isZone?: boolean; source?: BossEntity | null; projectile?: Projectile }): 'dodged' | 'parried' | 'blocked' | 'hit' | 'guardbreak' {
    const p = this.player;
    if (p.state === 'dead') return 'dodged';
    if (!opts.isZone && p.iframes > 0) {
      if (p.state === 'dodge') {
        // perfect dodge feedback
        if (p.lastDodgePerfect === 0) {
          p.lastDodgePerfect = 20;
          this.sfx('perfect');
          this.addText(p.x, 75, 'PERFECT', '#a5f3fc');
          this.spawnParticles(p.x, 30, 8, '#a5f3fc', 3, 'spark');
          if (this.mods.perfectDodgeStamina > 0) p.stamina = Math.min(p.maxStamina, p.stamina + this.mods.perfectDodgeStamina);
        }
      }
      return 'dodged';
    }
    const fromFront = (sourceX >= p.x ? 1 : -1) === p.facing;
    const dmgMult = this.cfg.difficulty === 'nightmare' ? 1 : this.diff.dmg;
    const dmg = damage * dmgMult;

    if (!opts.isZone && p.state === 'block' && fromFront) {
      const parryWindow = PLAYER.parryWindow + this.mods.parryBonus + (this.cfg.relic === 'mirror' ? 2 : 0);
      const parryable = opts.parryable !== false;
      if (p.parryTimer <= parryWindow && parryable) {
        // PARRY
        this.sfx('parry');
        this.hitstop = 8;
        this.addShake(7);
        this.flash = 0.25; this.flashColor = '#fef3c7';
        this.spawnParticles(p.x + p.facing * 24, 36, 26, '#fef08a', 7, 'spark');
        this.spawnParticles(p.x + p.facing * 24, 36, 6, '#ffffff', 2, 'ring');
        this.addText(p.x, 80, 'PARRY', '#fde047');
        p.guardFlash = 12;
        p.stamina = Math.min(p.maxStamina, p.stamina + 12);
        p.parryTimer = 99; // consume the window
        const b = opts.source;
        if (b && b.state !== 'dead' && b.state !== 'transition') {
          const poiseDmg = b.def.poiseMax * 0.34 * this.mods.poiseMult;
          b.poise -= poiseDmg;
          b.parriedTimer = PLAYER.riposteWindow;
          b.lastHitFrame = this.frame;
          if (b.poise <= 0) this.staggerBoss(b);
          else if (!(b.currentAttack && b.currentAttack.hyperArmor)) {
            b.state = 'parried';
            b.stateTimer = PLAYER.parryStun;
            b.currentAttack = null;
            b.vx = -b.facing * 3;
          }
        }
        if (opts.projectile) {
          const pr = opts.projectile;
          if (this.cfg.relic === 'mirror') {
            pr.owner = 'player';
            const tgt = this.nearestBoss();
            const dx = tgt ? tgt.x - pr.x : -pr.vx;
            const dy = tgt ? tgt.y + tgt.def.height / 2 - pr.y : 0;
            const len = Math.hypot(dx, dy) || 1;
            const sp = Math.hypot(pr.vx, pr.vy) * 1.6;
            pr.vx = (dx / len) * sp; pr.vy = (dy / len) * sp; pr.gravity = 0; pr.homing = 0; pr.life = 120; pr.damage *= 2;
            pr.hit = false;
          } else {
            pr.hit = true;
            const tgt = this.nearestBoss();
            if (tgt) { tgt.poise -= tgt.def.poiseMax * 0.12; if (tgt.poise <= 0) this.staggerBoss(tgt); }
          }
        }
        return 'parried';
      }
      if (opts.unblockable) {
        this.guardBreak(dmg * 0.6, sourceX);
        return 'guardbreak';
      }
      // BLOCK
      const cost = dmg * PLAYER.blockCost;
      if (p.stamina - cost <= 0) {
        p.stamina = 0;
        this.guardBreak(dmg * 0.5, sourceX);
        return 'guardbreak';
      }
      this.spend(cost);
      this.sfx('block');
      this.hitstop = 2;
      this.addShake(2);
      p.guardFlash = 8;
      p.vx = -p.facing * 3;
      this.spawnParticles(p.x + p.facing * 20, 36, 8, '#e2e8f0', 4, 'spark');
      return 'blocked';
    }

    // DAMAGE
    if (this.cfg.difficulty === 'nightmare') p.hp = 0;
    else p.hp -= dmg;
    p.hurtFlash = 10;
    this.sfx('hurt');
    this.spawnParticles(p.x, 34, opts.isZone ? 4 : 14, '#dc2626', 4, 'blob');
    if (!opts.isZone) {
      this.hitstop = dmg > 25 ? 5 : 3;
      this.addShake(dmg > 25 ? 9 : 4);
      this.flash = 0.15; this.flashColor = '#7f1d1d';
      if (!p.hyperArmor) {
        this.setState('hitstun');
        p.vx = (p.x >= sourceX ? 1 : -1) * Math.min(9, 3 + poise * 0.2);
        p.combo = 0;
      }
    }
    if (p.hp <= 0) this.killPlayer();
    return 'hit';
  }

  private guardBreak(dmg: number, sourceX: number) {
    const p = this.player;
    this.sfx('guardbreak');
    this.hitstop = 5;
    this.addShake(8);
    this.setState('guardbreak');
    p.stamina = 0;
    p.staminaDelay = 40;
    p.hp -= dmg * (this.cfg.difficulty === 'nightmare' ? 999 : 1);
    p.hurtFlash = 12;
    p.vx = (p.x >= sourceX ? 1 : -1) * 6;
    this.spawnParticles(p.x, 40, 16, '#fbbf24', 5, 'shard');
    this.addText(p.x, 80, 'GUARD BROKEN', '#f97316');
    if (p.hp <= 0) this.killPlayer();
  }

  // ---------------- Boss ----------------
  private phaseSpeed(b: BossEntity) {
    return b.def.phases[b.phase].speedMult * this.diff.speed;
  }

  private scaledWindup(b: BossEntity, a: AttackDef) {
    return Math.max(12, Math.round(a.windup / this.phaseSpeed(b)));
  }
  private scaledRecovery(b: BossEntity, a: AttackDef) {
    return Math.max(4, Math.round(a.recovery / Math.sqrt(this.phaseSpeed(b))));
  }

  private availableAttacks(b: BossEntity): AttackDef[] {
    const ph = b.def.phases[b.phase];
    const base = ph.attackIds
      .map((id) => b.def.attacks.find((a) => a.id === id)!)
      .filter((a) => a && (a.phaseMin === undefined || b.phase >= a.phaseMin) && (!a.ngplusOnly || this.cfg.difficulty !== 'normal'));
    if (this.cfg.difficulty === 'normal') return base;
    // NG+/Nightmare: bosses also draw on next-phase attacks one phase early ("new attacks")
    const nextPhase = b.def.phases[Math.min(b.phase + 1, b.def.phases.length - 1)];
    const extra = nextPhase.attackIds
      .map((id) => b.def.attacks.find((a) => a.id === id)!)
      .filter((a) => a && a.weight > 0 && !base.includes(a) && (a.phaseMin === undefined || a.phaseMin <= b.phase + 1));
    return [...base, ...extra.map((a) => ({ ...a, weight: a.weight * 0.6 }))];
  }

  private weightedPick(list: AttackDef[], b: BossEntity): AttackDef {
    let total = 0;
    const ws = list.map((a) => { const w = a.weight * (a.id === b.lastAttackId ? 0.35 : 1); total += w; return w; });
    let r = this.rng() * total;
    for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }

  private chooseAttack(b: BossEntity) {
    const d = Math.abs(this.player.x - b.x);
    const pool = this.availableAttacks(b).filter((a) => a.weight > 0);
    if (pool.length === 0) { b.idleFrames = 30; return; }
    const inRange = pool.filter((a) => d >= a.minRange && d <= a.maxRange);
    if (inRange.length > 0 && (this.rng() < 0.85 || inRange.length === pool.length)) {
      this.startAttack(b, this.weightedPick(inRange, b));
      return;
    }
    const a = this.weightedPick(pool, b);
    b.currentAttack = a;
    b.targetRange = [a.minRange, a.maxRange];
    b.state = 'approach';
    b.approachFrames = 0;
  }

  private startAttack(b: BossEntity, a: AttackDef) {
    b.currentAttack = a;
    b.state = 'windup';
    b.attackTimer = 0;
    b.hitDone = false;
    b.attackHits = 0;
    b.lastAttackId = a.id;
    b.glow = 0;
    b.data = {};
    b.facing = this.player.x >= b.x ? 1 : -1;
    this.sfx(a.sfxWindup || TELEGRAPH_WINDUP_SFX[a.telegraph] || 'windup');
  }

  private idleAfterAttack(b: BossEntity) {
    const ph = b.def.phases[b.phase];
    const base = 26 + this.rng() * 44;
    b.idleFrames = Math.round(base * (1 - ph.aggression * 0.75));
    b.state = 'idle';
    b.currentAttack = null;
    b.vx = 0;
  }

  staggerBoss(b: BossEntity) {
    if (b.state === 'dead' || b.state === 'transition') return;
    b.state = 'stagger';
    b.stateTimer = b.def.staggerFrames || 110;
    b.currentAttack = null;
    b.poise = 0;
    b.vx = 0;
    b.parriedTimer = 0;
    this.sfx('stagger');
    this.hitstop = 8;
    this.addShake(8);
    this.flash = 0.3; this.flashColor = '#fef3c7';
    this.addText(b.x, b.def.height + 30, 'STAGGERED', '#fde047');
    this.spawnParticles(b.x, b.def.height / 2, 30, '#fde047', 6, 'spark');
  }

  private updateBossDead(b: BossEntity) {
    b.deadTimer++;
    b.vx *= 0.9;
    b.x += b.vx;
    if (b.deadTimer % 6 === 0 && b.deadTimer < 90) this.spawnParticles(b.x + (this.rng() - 0.5) * b.def.width, this.rng() * b.def.height, 6, b.def.colors.glow, 3, 'blob');
  }

  private updateBoss(b: BossEntity) {
    if (b.state === 'dead') { this.updateBossDead(b); return; }
    if (b.hurtFlash > 0) b.hurtFlash--;
    if (b.parriedTimer > 0) b.parriedTimer--;
    // poise regen
    if (this.frame - b.lastHitFrame > 90 && b.poise < b.def.poiseMax && b.state !== 'stagger') b.poise = Math.min(b.def.poiseMax, b.poise + 0.15);

    // gravity
    if (!b.def.flying) {
      if (b.y > 0 || b.vy !== 0) {
        b.vy -= 0.5;
        b.y += b.vy;
        if (b.y <= 0) { b.y = 0; b.vy = 0; }
      }
    } else {
      const hover = (b.def.hoverHeight || 0) + Math.sin(this.frame / 20) * 6;
      b.y += (hover - b.y) * 0.1;
    }

    if (b.state === 'transition') {
      b.transitionTimer--;
      b.vx = 0;
      if (b.transitionTimer === 60) {
        this.flash = 0.6; this.flashColor = b.def.phases[b.phase].tint || '#fff';
        this.spawnParticles(b.x, b.def.height / 2, 60, b.def.colors.glow, 9, 'spark');
        this.spawnParticles(b.x, b.def.height / 2, 12, '#ffffff', 5, 'ring');
        this.addShake(14);
      }
      if (b.transitionTimer <= 0) {
        this.transitionActive = false;
        this.camTargetZoom = BASE_ZOOM;
        b.state = 'idle';
        b.idleFrames = 20;
        this.player.iframes = Math.max(this.player.iframes, 20);
      }
      return;
    }

    if (this.transitionActive) { b.vx = 0; return; }
    if (this.fightState !== 'fight') { b.vx = 0; b.facing = this.player.x >= b.x ? 1 : -1; return; }

    const ctx = this.makeCtx(b);
    const d = Math.abs(this.player.x - b.x);

    switch (b.state) {
      case 'stagger': {
        b.stateTimer--;
        b.vx *= 0.8;
        if (b.stateTimer <= 0) { b.poise = b.def.poiseMax; b.lastHitFrame = this.frame; this.idleAfterAttack(b); b.idleFrames = 10; }
        break;
      }
      case 'parried': {
        b.stateTimer--;
        b.vx *= 0.85;
        if (b.stateTimer <= 0) { this.idleAfterAttack(b); b.idleFrames = 8; }
        break;
      }
      case 'idle': {
        b.idleFrames--;
        b.facing = this.player.x >= b.x ? 1 : -1;
        b.vx = 0;
        if (b.def.keepDistance && d < b.def.keepDistance) {
          const away = -b.facing;
          const wall = (away === -1 && b.x - this.arena.left < 100) || (away === 1 && this.arena.right - b.x < 100);
          if (!wall) b.vx = away * b.def.speed;
        } else if (d > 220) {
          b.vx = b.facing * b.def.speed * 0.6;
        }
        // companions spread out a bit
        if (this.bosses.length > 1) {
          for (const o of this.bosses) {
            if (o === b || o.state === 'dead') continue;
            const dx = b.x - o.x;
            if (Math.abs(dx) < 90) b.vx += (dx >= 0 ? 1 : -1) * 1.2;
          }
        }
        if (b.idleFrames <= 0) this.chooseAttack(b);
        break;
      }
      case 'approach': {
        b.approachFrames++;
        b.facing = this.player.x >= b.x ? 1 : -1;
        const [mn, mx] = b.targetRange;
        if (d > mx * 0.85) b.vx = b.facing * b.def.speed;
        else if (d < mn) {
          const away = -b.facing;
          const wall = (away === -1 && b.x - this.arena.left < 100) || (away === 1 && this.arena.right - b.x < 100);
          b.vx = wall ? 0 : away * b.def.speed;
          if (wall && b.approachFrames > 20) { this.chooseAttack(b); break; }
        } else b.vx = 0;
        const ready = d >= mn && d <= mx;
        if (ready && b.currentAttack) { this.startAttack(b, b.currentAttack); }
        else if (b.approachFrames > 110) { b.approachFrames = 0; this.chooseAttack(b); }
        break;
      }
      case 'windup': {
        const a = b.currentAttack!;
        const w = this.scaledWindup(b, a);
        b.glow = b.attackTimer / w;
        a.motion?.('windup', b.attackTimer, ctx);
        a.onFrame?.('windup', b.attackTimer, ctx);
        if (!a.faceLock && b.attackTimer < w * 0.5) b.facing = this.player.x >= b.x ? 1 : -1;
        b.attackTimer++;
        if (b.attackTimer >= w) {
          b.state = 'active';
          b.attackTimer = 0;
          b.glow = 1;
          this.sfx(a.sfxActive || TELEGRAPH_ACTIVE_SFX[a.telegraph] || 'swoosh');
        }
        break;
      }
      case 'active': {
        const a = b.currentAttack!;
        a.motion?.('active', b.attackTimer, ctx);
        a.onFrame?.('active', b.attackTimer, ctx);
        b.attackTimer++;
        if (b.attackTimer >= a.active) { b.state = 'recovery'; b.attackTimer = 0; b.glow = 0; }
        break;
      }
      case 'recovery': {
        const a = b.currentAttack!;
        const r = this.scaledRecovery(b, a);
        a.motion?.('recovery', b.attackTimer, ctx);
        a.onFrame?.('recovery', b.attackTimer, ctx);
        b.attackTimer++;
        if (b.attackTimer >= r) {
          const chain = a.chain ? b.def.attacks.find((x) => x.id === a.chain) : undefined;
          if (chain && this.rng() < (a.chainChance ?? 1)) this.startAttack(b, chain);
          else this.idleAfterAttack(b);
        }
        break;
      }
    }

    // movement & clamp
    b.x += b.vx;
    const margin = Math.min(b.def.width / 2, 40);
    if (b.x < this.arena.left + margin) { b.x = this.arena.left + margin; if (b.state !== 'active') b.vx = 0; }
    if (b.x > this.arena.right - margin) { b.x = this.arena.right - margin; if (b.state !== 'active') b.vx = 0; }
  }

  /** Damage dealt to a boss by the player */
  hitBoss(b: BossEntity, dmg: number, poiseDmg: number, heavy: boolean, hitX: number, hitY: number) {
    if (b.state === 'dead' || b.state === 'transition') return;
    const p = this.player;
    let mult = this.mods.damageMult * (this.cfg.relic === 'wolffang' ? 1.15 : 1);
    let label = '';
    let color = '#f8fafc';
    if (b.parriedTimer > 0) { mult *= 2.5 * this.mods.riposteMult; b.parriedTimer = 0; label = 'RIPOSTE'; color = '#fde047'; }
    else if (b.state === 'stagger') { mult *= 1.7 * this.mods.riposteMult; label = 'CRITICAL'; color = '#fbbf24'; }
    const total = Math.round(dmg * mult);
    b.hp -= total;
    b.hitsTaken++;
    b.hurtFlash = 8;
    b.lastHitFrame = this.frame;
    const armored = b.currentAttack?.hyperArmor && (b.state === 'windup' || b.state === 'active');
    if (!armored && b.state !== 'stagger') b.poise -= poiseDmg * this.mods.poiseMult;
    // bleed
    if (this.weapon.bleed > 0) {
      b.bleed += this.weapon.bleed * this.mods.bleedMult;
      if (b.bleed >= b.bleedMax) {
        b.bleed = 0;
        const burst = Math.min(140, Math.round(b.maxHp * 0.1));
        b.hp -= burst;
        this.sfx('bleed');
        this.addText(b.x, b.def.height + 50, `BLEED ${burst}`, '#f43f5e');
        this.spawnParticles(b.x, b.def.height / 2, 40, '#e11d48', 8, 'blob');
        this.addShake(8);
        this.hitstop = 6;
      }
    }
    this.hitstop = Math.max(this.hitstop, label ? 9 : heavy ? 5 : 3);
    if (heavy || label) { this.addShake(label ? 10 : 6); }
    this.sfx(heavy ? 'hit_heavy' : 'hit');
    this.spawnParticles(hitX, hitY, heavy ? 22 : 12, '#f87171', heavy ? 7 : 4, 'blob');
    this.spawnParticles(hitX, hitY, heavy ? 10 : 5, '#fef3c7', 6, 'spark');
    this.addText(hitX, hitY + 30, label ? `${label} ${total}` : `${total}`, color);
    if (heavy && this.mods.heavyHealPct > 0) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * this.mods.heavyHealPct);

    if (b.hp <= 0) { this.killBoss(b); return; }
    if (b.poise <= 0 && b.state !== 'stagger') this.staggerBoss(b);
    this.checkPhase(b);
  }

  private killBoss(b: BossEntity) {
    b.hp = 0;
    b.state = 'dead';
    b.deadTimer = 0;
    b.currentAttack = null;
    b.vx = -b.facing * 2;
    this.sfx('death_boss');
    this.hitstop = 14;
    this.slowmo = 60;
    this.addShake(14);
    this.flash = 0.5; this.flashColor = '#ffffff';
    this.spawnParticles(b.x, b.def.height / 2, 70, b.def.colors.glow, 10, 'spark');
    this.spawnParticles(b.x, b.def.height / 2, 14, '#ffffff', 6, 'ring');
    // duo enrage: remaining bosses go to last phase
    for (const o of this.bosses) {
      if (o !== b && o.state !== 'dead' && o.phase < o.def.phases.length - 1) {
        o.phase = o.def.phases.length - 1;
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.15);
        this.enterTransition(o);
      }
    }
  }

  private checkPhase(b: BossEntity) {
    const frac = b.hp / b.maxHp;
    let target = 0;
    b.def.phases.forEach((ph, i) => { if (frac <= ph.hpThreshold) target = i; });
    if (target > b.phase) {
      b.phase = target;
      this.enterTransition(b);
    }
  }

  private enterTransition(b: BossEntity) {
    const ph = b.def.phases[b.phase];
    b.state = 'transition';
    b.transitionTimer = 130;
    b.currentAttack = null;
    b.vx = 0;
    b.poise = b.def.poiseMax;
    this.transitionActive = true;
    this.camTargetZoom = BASE_ZOOM * 1.25;
    this.camFocusX = b.x;
    this.projectiles = this.projectiles.filter((p) => p.owner === 'player');
    this.hitstop = 10;
    this.sfx('phase');
    this.banner = { text: ph.announce || `PHASE ${b.phase + 1}`, sub: ph.name, timer: 130, color: ph.tint || b.def.colors.glow };
    this.player.iframes = Math.max(this.player.iframes, 140);
    this.musicPhase = Math.min(3, b.phase + 1);
    audio.setIntensity(this.musicPhase);
    this.cfg.onEvent({ type: 'phase', phase: b.phase });
    if (b.def.arenaHazardsOnPhase !== undefined && b.phase >= b.def.arenaHazardsOnPhase) this.crumbleTimer = 1;
  }

  // ---------------- Collisions ----------------
  private checkPlayerAttacks() {
    const p = this.player;
    const box = this.playerAttackBox();
    if (!box) return;
    const heavy = p.state === 'heavy';
    const dmg = heavy ? this.weapon.heavyDmg : this.weapon.lightDmg[Math.min(p.combo, this.weapon.lightDmg.length - 1)];
    const poise = heavy ? this.weapon.heavyPoise : this.weapon.lightPoise;
    for (const b of this.bosses) {
      if (p.attackHit.has(b.index)) continue;
      if (overlaps(box, this.bossHurtbox(b))) {
        p.attackHit.add(b.index);
        const hx = p.x + p.facing * (this.weapon.reach * 0.7);
        this.hitBoss(b, dmg, poise, heavy, hx, 40 + this.rng() * 30);
      }
    }
    // swat projectiles
    for (const pr of this.projectiles) {
      if (pr.owner !== 'boss' || !pr.parryable || pr.hit) continue;
      if (overlaps(box, { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 })) {
        pr.hit = true;
        this.spawnParticles(pr.x, pr.y, 10, pr.color, 4, 'spark');
        this.sfx('block');
      }
    }
  }

  private checkBossAttacks() {
    const hb = this.playerHurtbox();
    for (const b of this.bosses) {
      if (b.state !== 'active' || !b.currentAttack || !b.currentAttack.hitbox) continue;
      const a = b.currentAttack;
      const hitboxFn = a.hitbox as NonNullable<AttackDef['hitbox']>;
      if (a.multiHit) { if (b.attackHits > 0 && this.frame - (b.data.lastMulti ?? -999) < a.multiHit) continue; }
      else if (b.hitDone) continue;
      const boxes = hitboxFn(b.attackTimer - 1 < 0 ? 0 : b.attackTimer - 1, this.makeCtx(b));
      for (const box of boxes) {
        if (overlaps(box, hb)) {
          const res = this.playerHit(a.damage, a.poise, b.x, { unblockable: a.unblockable, source: b });
          if (res !== 'dodged' || !a.multiHit) { b.hitDone = true; }
          if (res !== 'dodged') { b.attackHits++; b.data.lastMulti = this.frame; }
          if (res === 'parried') { b.hitDone = true; }
          break;
        }
      }
    }
  }

  private updateProjectiles() {
    const hb = this.playerHurtbox();
    const p = this.player;
    for (const pr of this.projectiles) {
      if (pr.hit) { pr.life = 0; continue; }
      if (pr.homing && pr.owner === 'boss') {
        const dx = p.x - pr.x, dy = p.y + 28 - pr.y;
        const len = Math.hypot(dx, dy) || 1;
        const sp = Math.hypot(pr.vx, pr.vy);
        pr.vx += (dx / len) * sp * pr.homing; pr.vy += (dy / len) * sp * pr.homing;
        const ns = Math.hypot(pr.vx, pr.vy) || 1;
        pr.vx = (pr.vx / ns) * sp; pr.vy = (pr.vy / ns) * sp;
      }
      pr.vy += pr.gravity;
      pr.x += pr.vx; pr.y += pr.vy;
      pr.life--;
      if (pr.trail && this.frame % 2 === 0) this.particles.push({ x: pr.x, y: pr.y, vx: 0, vy: 0, life: 10, maxLife: 10, size: pr.r * 0.6, color: pr.color, gravity: 0, shape: 'blob' });
      if (pr.kind !== 'shock' && pr.y < 0) {
        if (pr.groundHazard) this.hazards.push({ type: pr.groundHazard, x: pr.x, w: 100, h: 40, warn: 0, life: 300, damage: 5, tick: 22, hit: false, color: pr.color, poise: 0 });
        if (pr.kind === 'spit') this.hazards.push({ type: 'poison', x: pr.x, w: 110, h: 30, warn: 0, life: 360, damage: 5, tick: 24, hit: false, color: '#a3e635', poise: 0 });
        this.spawnParticles(pr.x, 4, 8, pr.color, 3, 'blob');
        pr.life = 0;
        continue;
      }
      if (pr.x < this.arena.left - 100 || pr.x > this.arena.right + 100 || pr.y > 700) { pr.life = 0; continue; }
      const box = { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 };
      if (pr.owner === 'boss') {
        if (overlaps(box, hb)) {
          const src = this.nearestBoss();
          const res = this.playerHit(pr.damage, pr.poise, pr.x, { parryable: pr.parryable, source: null, projectile: pr });
          if (res === 'parried') { if (pr.owner === 'boss') pr.hit = true; else { /* reflected */ } if (src && !pr.hit) { /* noop */ } }
          else if (res !== 'dodged') { pr.hit = true; this.spawnParticles(pr.x, pr.y, 10, pr.color, 4, 'spark'); }
          else if (res === 'dodged' && pr.kind !== 'shock') { /* passes through during iframes */ }
        }
      } else {
        for (const b of this.bosses) {
          if (b.state === 'dead') continue;
          if (overlaps(box, this.bossHurtbox(b))) {
            pr.hit = true;
            this.hitBoss(b, pr.damage, 30, true, pr.x, pr.y);
            this.addText(pr.x, pr.y + 20, 'REFLECT', '#a5f3fc');
            break;
          }
        }
      }
    }
    this.projectiles = this.projectiles.filter((pr) => pr.life > 0);
  }

  private updateHazards() {
    const hb = this.playerHurtbox();
    for (const h of this.hazards) {
      if (h.warn > 0) { h.warn--; if (h.warn === 0) this.onHazardActivate(h); continue; }
      h.life--;
      const box: Rect = { x: h.x - h.w / 2, y: 0, w: h.w, h: h.h };
      if (overlaps(box, hb)) {
        if (h.tick === 0) {
          if (!h.hit) { h.hit = true; this.playerHit(h.damage, h.poise, h.x + (this.player.x >= h.x ? -1 : 1), { source: null, parryable: false, unblockable: h.type === 'pillar' || h.type === 'lightning' }); }
        } else if (this.frame % h.tick === 0) {
          this.playerHit(h.damage, 0, h.x, { isZone: true, source: null });
          this.addText(this.player.x, 70, h.type === 'poison' ? 'POISON' : 'BURN', h.color);
        }
      }
    }
    this.hazards = this.hazards.filter((h) => h.life > 0 || h.warn > 0);
  }

  private onHazardActivate(h: Hazard) {
    if (h.type === 'debris') { this.sfx('debris'); this.addShake(5); this.spawnParticles(h.x, 10, 14, h.color, 5, 'shard'); }
    else if (h.type === 'lightning') { this.sfx('thunder'); this.addShake(7); this.flash = 0.2; this.flashColor = '#e0f2fe'; this.spawnParticles(h.x, 20, 18, h.color, 6, 'spark'); }
    else if (h.type === 'pillar') { this.sfx('crackle'); this.addShake(4); this.spawnParticles(h.x, 30, 16, h.color, 5, 'spark'); }
    else if (h.type === 'fire') { this.sfx('crackle'); }
    else if (h.type === 'poison') { this.sfx('poison'); }
  }

  private checkArenaCrumble() {
    if (this.crumbleTimer <= 0) return;
    this.crumbleTimer++;
    // Final-phase arena: edges catch fire periodically
    if (this.crumbleTimer % 240 === 2) {
      const w = 140;
      this.hazards.push({ type: 'fire', x: this.arena.left + w / 2, w, h: 50, warn: 50, life: 200, damage: 6, tick: 20, hit: false, color: '#f97316', poise: 0 });
      this.hazards.push({ type: 'fire', x: this.arena.right - w / 2, w, h: 50, warn: 50, life: 200, damage: 6, tick: 20, hit: false, color: '#f97316', poise: 0 });
    }
  }

  private resolveBodyCollisions() {
    const p = this.player;
    if (p.state === 'dodge' || p.state === 'dead') return;
    for (const b of this.bosses) {
      if (b.state === 'dead' || b.state === 'active' || b.y > 30) continue;
      const half = b.def.width / 2 + PLAYER.width / 2 - 6;
      const dx = p.x - b.x;
      if (Math.abs(dx) < half) {
        const push = (half - Math.abs(dx)) * 0.5;
        const dir = dx >= 0 ? 1 : -1;
        const nx = p.x + dir * push;
        const margin = PLAYER.width / 2 + 2;
        if (nx > this.arena.left + margin && nx < this.arena.right - margin) p.x = nx;
        else b.x -= dir * push;
      }
    }
  }

  // ---------------- Camera / particles ----------------
  private updateCamera() {
    const p = this.player;
    const nb = this.nearestBoss();
    let target = nb ? (p.x + nb.x) / 2 : p.x;
    if (this.transitionActive) target = this.camFocusX;
    const viewHalf = VIEW_W / 2 / this.camZoom;
    if (this.arena.width <= VIEW_W / this.camZoom) target = 0;
    else target = Math.max(this.arena.left + viewHalf - 20, Math.min(this.arena.right - viewHalf + 20, target));
    this.camX += (target - this.camX) * 0.08;
    this.camZoom += (this.camTargetZoom - this.camZoom) * 0.06;
  }

  private updateParticles() {
    for (const pt of this.particles) {
      pt.life--;
      pt.x += pt.vx; pt.y += pt.vy;
      pt.vy += pt.gravity;
      pt.vx *= 0.96; pt.vy *= 0.96;
      if (pt.shape === 'ring') pt.size += 2.5;
      if (pt.y < 0 && pt.gravity !== 0) { pt.y = 0; pt.vy *= -0.3; }
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
  }
}
