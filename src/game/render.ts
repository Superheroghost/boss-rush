import type { Engine, Player } from './engine';
import type { BossEntity, BossPose, Hazard, Projectile } from './types';
import { VIEW_W, VIEW_H, GROUND_Y, PLAYER, SKINS, WEAPONS } from './data';
import { BOSSES } from './bosses';

type Ctx = CanvasRenderingContext2D;

const THEMES = {
  crypt: { sky: ['#0b0a12', '#1a1526'], far: '#14111f', mid: '#1d1830', ground: '#221c33', groundLine: '#4c4368', fog: 'rgba(60,40,90,0.25)', wall: '#6d5a9a' },
  ruins: { sky: ['#0a0f12', '#1a2226'], far: '#121a1d', mid: '#1b2528', ground: '#1f2a2c', groundLine: '#4a5f5a', fog: 'rgba(40,80,70,0.2)', wall: '#6b8a7f' },
  forest: { sky: ['#070b08', '#0f1a12'], far: '#0b140e', mid: '#122017', ground: '#15231a', groundLine: '#3f6b48', fog: 'rgba(30,80,50,0.25)', wall: '#4d8a5a' },
  cathedral: { sky: ['#120a0a', '#26141a'], far: '#1a0f12', mid: '#2a1820', ground: '#2b1a22', groundLine: '#7a3a4a', fog: 'rgba(120,30,60,0.2)', wall: '#a0405a' },
  swamp: { sky: ['#080c06', '#141c0c'], far: '#0f160a', mid: '#182412', ground: '#1a2614', groundLine: '#4f6b2a', fog: 'rgba(90,120,40,0.25)', wall: '#6b8a2a' },
  peak: { sky: ['#06090f', '#101a2c'], far: '#0c1422', mid: '#152238', ground: '#182640', groundLine: '#3c5a86', fog: 'rgba(60,100,160,0.25)', wall: '#5b86c8' },
  throne: { sky: ['#0d0906', '#221408'], far: '#1a1008', mid: '#2a1a0c', ground: '#2a1c10', groundLine: '#8a5a1e', fog: 'rgba(200,120,30,0.18)', wall: '#c8902a' },
  library: { sky: ['#08071a', '#141130'], far: '#100e26', mid: '#1a1640', ground: '#1c1840', groundLine: '#4a3f8a', fog: 'rgba(90,70,180,0.22)', wall: '#7a68d8' },
};

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export class Renderer {
  canvas: HTMLCanvasElement;
  c: Ctx;
  bgSeed: number[] = [];
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.c = canvas.getContext('2d')!;
    for (let i = 0; i < 80; i++) this.bgSeed.push(Math.random());
  }

  render(e: Engine) {
    const c = this.c;
    const theme = THEMES[e.bossDef.arenaTheme];
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    // sky
    const g = c.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, theme.sky[0]);
    g.addColorStop(1, theme.sky[1]);
    c.fillStyle = g;
    c.fillRect(0, 0, VIEW_W, VIEW_H);

    const shakeX = e.shake ? (Math.random() - 0.5) * e.shake * 2 : 0;
    const shakeY = e.shake ? (Math.random() - 0.5) * e.shake * 2 : 0;

    this.drawBackground(e, theme, shakeX);

    // world transform
    c.translate(VIEW_W / 2 + shakeX, GROUND_Y + shakeY);
    c.scale(e.camZoom, e.camZoom);
    c.translate(-e.camX, 0);

    this.drawGround(e, theme);
    for (const h of e.hazards) if (h.type === 'fire' || h.type === 'poison' || h.warn > 0) this.drawHazard(e, h);
    for (const b of e.bosses) if (b.state === 'dead') this.drawBoss(e, b);
    for (const b of e.bosses) if (b.state !== 'dead') this.drawBoss(e, b);
    this.drawPlayer(e, e.player);
    for (const h of e.hazards) if (!(h.type === 'fire' || h.type === 'poison') && h.warn <= 0) this.drawHazard(e, h);
    for (const p of e.projectiles) this.drawProjectile(e, p);
    this.drawParticles(e);
    if (e.showHitboxes) this.drawHitboxes(e);
    for (const t of e.floatTexts) {
      c.font = `bold ${t.text.length > 4 ? 13 : 16}px "Cinzel", Georgia, serif`;
      c.textAlign = 'center';
      c.globalAlpha = Math.min(1, t.life / 20);
      c.fillStyle = '#000';
      c.fillText(t.text, t.x + 1, -t.y + 1);
      c.fillStyle = t.color;
      c.fillText(t.text, t.x, -t.y);
      c.globalAlpha = 1;
    }
    c.restore();

    // fog overlay & vignette
    c.fillStyle = theme.fog;
    c.fillRect(0, GROUND_Y - 40, VIEW_W, VIEW_H - GROUND_Y + 40);
    const vg = c.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.75)');
    c.fillStyle = vg;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    if (e.flash > 0) {
      c.globalAlpha = Math.min(0.8, e.flash);
      c.fillStyle = e.flashColor;
      c.fillRect(0, 0, VIEW_W, VIEW_H);
      c.globalAlpha = 1;
    }
    // low hp vignette
    if (e.player.hp / e.player.maxHp < 0.3 && e.player.state !== 'dead') {
      c.globalAlpha = 0.25 + Math.sin(e.frame / 8) * 0.1;
      const rv = c.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.8);
      rv.addColorStop(0, 'rgba(120,0,0,0)');
      rv.addColorStop(1, 'rgba(160,0,0,0.9)');
      c.fillStyle = rv;
      c.fillRect(0, 0, VIEW_W, VIEW_H);
      c.globalAlpha = 1;
    }
    this.drawHUD(e);
  }

  // ---------------- Environment ----------------
  private drawBackground(e: Engine, theme: (typeof THEMES)['crypt'], shakeX: number) {
    const c = this.c;
    const par = (k: number) => -e.camX * k + shakeX;
    // far layer
    c.fillStyle = theme.far;
    for (let i = 0; i < 14; i++) {
      const s = this.bgSeed[i];
      const x = ((i * 190 + par(0.15) + 4000) % (VIEW_W + 400)) - 200;
      const h = 120 + s * 200;
      if (e.bossDef.arenaTheme === 'forest' || e.bossDef.arenaTheme === 'swamp') {
        c.beginPath(); c.moveTo(x, GROUND_Y - 20); c.lineTo(x + 40, GROUND_Y - 20 - h); c.lineTo(x + 80, GROUND_Y - 20); c.fill();
      } else if (e.bossDef.arenaTheme === 'peak') {
        c.beginPath(); c.moveTo(x - 100, GROUND_Y); c.lineTo(x + 60, GROUND_Y - h - 60); c.lineTo(x + 220, GROUND_Y); c.fill();
      } else {
        c.fillRect(x, GROUND_Y - 20 - h, 50 + s * 40, h + 20);
      }
    }
    // mid layer: pillars / trees / arches
    c.fillStyle = theme.mid;
    for (let i = 0; i < 10; i++) {
      const s = this.bgSeed[i + 20];
      const x = ((i * 260 + par(0.4) + 6000) % (VIEW_W + 520)) - 260;
      const h = 200 + s * 160;
      if (e.bossDef.arenaTheme === 'forest' || e.bossDef.arenaTheme === 'swamp') {
        c.fillRect(x, GROUND_Y - h, 26, h);
        c.beginPath(); c.ellipse(x + 13, GROUND_Y - h, 70 + s * 40, 50, 0, 0, Math.PI * 2); c.fill();
      } else if (e.bossDef.arenaTheme === 'cathedral' || e.bossDef.arenaTheme === 'library' || e.bossDef.arenaTheme === 'throne') {
        c.fillRect(x, GROUND_Y - h, 40, h);
        c.beginPath(); c.arc(x + 20, GROUND_Y - h, 60, Math.PI, 0); c.fill();
        c.fillRect(x - 40, GROUND_Y - h - 8, 120, 14);
      } else if (e.bossDef.arenaTheme === 'peak') {
        c.beginPath(); c.moveTo(x - 60, GROUND_Y); c.lineTo(x + 20, GROUND_Y - h); c.lineTo(x + 120, GROUND_Y); c.fill();
      } else {
        c.fillRect(x, GROUND_Y - h, 34 + s * 30, h);
        c.fillRect(x - 10, GROUND_Y - h, 60, 12);
      }
    }
    // stained glass / windows glow for cathedral & throne
    if (e.bossDef.arenaTheme === 'cathedral' || e.bossDef.arenaTheme === 'throne') {
      for (let i = 0; i < 5; i++) {
        const x = ((i * 380 + par(0.4) + 6000) % (VIEW_W + 760)) - 380 + 130;
        const grd = c.createLinearGradient(x, 80, x, 300);
        grd.addColorStop(0, hexA(e.bossDef.colors.glow, 0.25));
        grd.addColorStop(1, hexA(e.bossDef.colors.glow, 0));
        c.fillStyle = grd;
        c.beginPath(); c.moveTo(x, 300); c.lineTo(x, 110); c.arc(x + 22, 110, 22, Math.PI, 0); c.lineTo(x + 44, 300); c.fill();
      }
    }
    // embers / motes
    c.globalAlpha = 0.5;
    for (let i = 0; i < 30; i++) {
      const s = this.bgSeed[i + 40];
      const x = ((s * 2000 + e.frame * (0.2 + s * 0.4) + par(0.6)) % (VIEW_W + 100)) - 50;
      const y = (GROUND_Y - ((s * 977 + e.frame * (0.3 + s)) % (GROUND_Y + 40)));
      c.fillStyle = e.bossDef.colors.glow;
      c.fillRect(x, y, 2, 2);
    }
    c.globalAlpha = 1;
  }

  private drawGround(e: Engine, theme: (typeof THEMES)['crypt']) {
    const c = this.c;
    const L = e.arena.left, R = e.arena.right;
    c.fillStyle = theme.ground;
    c.fillRect(L - 600, 0, R - L + 1200, 200);
    c.fillStyle = theme.groundLine;
    c.fillRect(L - 600, -2, R - L + 1200, 4);
    // tiles
    c.strokeStyle = hexA(theme.groundLine, 0.25);
    c.lineWidth = 1;
    for (let x = L - 600; x < R + 600; x += 80) { c.beginPath(); c.moveTo(x, 2); c.lineTo(x - 30, 120); c.stroke(); }
    c.beginPath(); c.moveTo(L - 600, 40); c.lineTo(R + 600, 40); c.stroke();
    // walls
    for (const wx of [L, R]) {
      const dir = wx === L ? -1 : 1;
      const grd = c.createLinearGradient(wx, 0, wx + dir * 90, 0);
      grd.addColorStop(0, hexA(theme.wall, 0.35));
      grd.addColorStop(1, hexA(theme.wall, 0));
      c.fillStyle = grd;
      c.fillRect(Math.min(wx, wx + dir * 90), -420, 90, 620);
      c.fillStyle = theme.mid;
      c.fillRect(wx + (dir === -1 ? -70 : 0), -440, 70, 640);
      c.fillStyle = hexA(theme.wall, 0.6 + Math.sin(e.frame / 15) * 0.15);
      c.fillRect(wx + (dir === -1 ? -6 : 0), -400, 6, 600);
      // torch
      c.fillStyle = e.bossDef.colors.glow;
      c.beginPath(); c.arc(wx + dir * 30, -190 + Math.sin(e.frame / 6 + wx) * 2, 6 + Math.sin(e.frame / 4) * 1.5, 0, Math.PI * 2); c.fill();
      const tg = c.createRadialGradient(wx + dir * 30, -190, 0, wx + dir * 30, -190, 120);
      tg.addColorStop(0, hexA(e.bossDef.colors.glow, 0.25)); tg.addColorStop(1, hexA(e.bossDef.colors.glow, 0));
      c.fillStyle = tg; c.fillRect(wx + dir * 30 - 120, -310, 240, 240);
    }
  }

  // ---------------- Player ----------------
  private drawPlayer(e: Engine, p: Player) {
    const c = this.c;
    const skin = SKINS.find((s) => s.id === e.cfg.skin) || SKINS[0];
    const w = WEAPONS[e.cfg.weapon];
    c.save();
    c.translate(p.x, -p.y);
    // shadow
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.beginPath(); c.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2); c.fill();
    c.scale(p.facing, 1);
    let flash = false;
    if (p.hurtFlash > 0 && p.hurtFlash % 2 === 0) flash = true;
    if (p.iframes > 0 && p.state === 'dodge') c.globalAlpha = 0.55;
    const t = p.timer;
    let bodyRot = 0;
    let lean = 0;
    let crouch = 0;
    if (p.state === 'dodge') { bodyRot = Math.min(1, t / (PLAYER.dodgeFrames - PLAYER.dodgeRecovery)) * Math.PI * 2; crouch = 10; }
    if (p.state === 'hitstun' || p.state === 'guardbreak') lean = -0.4;
    if (p.state === 'dead') { c.rotate(Math.PI / 2 * Math.min(1, p.deadTimer / 20)); c.translate(0, 8); }
    if (p.state === 'heavy' && t < p.windup) lean = -0.15 * (t / p.windup);
    if (p.state === 'run') crouch = Math.abs(Math.sin(e.frame / 4)) * 2;

    c.translate(0, -28 + crouch / 2);
    c.rotate(bodyRot + lean);
    const armor = flash ? '#ffffff' : skin.colors.armor;
    const trim = flash ? '#ffffff' : skin.colors.trim;
    // cape
    c.fillStyle = flash ? '#fff' : skin.colors.cape;
    const capeWave = Math.sin(e.frame / 5) * 3 + (p.vx !== 0 ? -p.vx * p.facing * 1.5 : 0);
    c.beginPath(); c.moveTo(-6, -18); c.lineTo(-16 + capeWave, 22); c.lineTo(-2 + capeWave * 0.5, 26); c.lineTo(4, -18); c.fill();
    // legs
    c.fillStyle = armor;
    const legSwing = p.state === 'run' ? Math.sin(e.frame / 4) * 7 : 0;
    rr(c, -8 + legSwing * 0.5, 10, 7, 18 - crouch, 2);
    rr(c, 2 - legSwing * 0.5, 10, 7, 18 - crouch, 2);
    // torso
    c.fillStyle = armor;
    rr(c, -10, -14, 20, 26, 5);
    c.fillStyle = trim;
    c.fillRect(-3, -12, 6, 22);
    // helmet
    c.fillStyle = armor;
    rr(c, -8, -30, 16, 18, 6);
    c.fillStyle = '#0a0a0a';
    c.fillRect(0, -25, 8, 4);
    c.fillStyle = skin.colors.cape;
    c.fillRect(-2, -34, 4, 8); // plume
    // heal glow
    if (p.healGlow > 0) {
      c.fillStyle = hexA('#fbbf24', p.healGlow / 40);
      c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.fill();
    }
    // arms & weapon
    let wAng = 0.9; // resting
    let wLen = 1;
    let arc = false;
    const act = p.state === 'light' || p.state === 'heavy';
    if (act) {
      const heavy = p.state === 'heavy';
      if (t < p.windup) { const k = t / p.windup; wAng = heavy ? -0.5 - k * 0.4 : -0.9 - k * 0.4; }
      else if (t < p.windup + p.active) { const k = (t - p.windup) / p.active; wAng = heavy ? -0.8 + k * 3.2 : -1.2 + k * 3.2; arc = true; }
      else { const k = (t - p.windup - p.active) / p.recovery; wAng = 1.9 - k * 0.3; }
      if (p.combo === 1 && !heavy && t >= p.windup) wAng = 2.2 - (wAng + 1.2) * 0.7; // alternate (upward cut)
      if (heavy && t < p.windup) {
        c.shadowColor = w.color; c.shadowBlur = 10 + (t / p.windup) * 20;
      }
    } else if (p.state === 'block') wAng = 0.2;
    else if (p.state === 'heal') { wAng = 2.4; }
    // shield
    if (p.state === 'block') {
      c.fillStyle = p.guardFlash > 0 ? '#fef08a' : '#334155';
      rr(c, 8, -16, 8, 26, 3);
      c.fillStyle = p.guardFlash > 0 ? '#fff' : trim;
      c.fillRect(11, -8, 2, 10);
      const pw = PLAYER.parryWindow + e.mods.parryBonus + (e.cfg.relic === 'mirror' ? 2 : 0);
      if (p.parryTimer <= pw) {
        c.strokeStyle = '#fde047'; c.lineWidth = 2; c.beginPath(); c.arc(12, -3, 18, 0, Math.PI * 2); c.stroke();
      }
    }
    // flask
    if (p.state === 'heal') {
      c.fillStyle = '#f59e0b';
      rr(c, 6, -30 + Math.min(10, t / 3), 7, 12, 3);
    }
    // weapon
    c.save();
    c.translate(6, -8);
    c.rotate(wAng);
    const len = (w.id === 'spear' ? 78 : w.id === 'greataxe' ? 48 : w.id === 'katana' ? 56 : 50) * wLen;
    c.fillStyle = '#4b5563';
    c.fillRect(-2, -4, 4, 12); // grip
    c.fillStyle = flash ? '#fff' : w.color;
    if (w.id === 'greataxe') {
      c.fillRect(-1.5, -len, 3, len);
      c.beginPath(); c.moveTo(0, -len + 4); c.lineTo(16, -len + 16); c.lineTo(0, -len + 30); c.fill();
    } else if (w.id === 'spear') {
      c.fillStyle = '#78350f'; c.fillRect(-1.5, -len + 14, 3, len);
      c.fillStyle = w.color; c.beginPath(); c.moveTo(0, -len); c.lineTo(5, -len + 16); c.lineTo(-5, -len + 16); c.fill();
    } else {
      c.fillRect(-2, -len, 4, len);
      c.fillStyle = '#9ca3af'; c.fillRect(-8, -4, 16, 3);
    }
    c.restore();
    if (arc) {
      const heavy = p.state === 'heavy';
      c.strokeStyle = hexA(w.color, 0.7);
      c.lineWidth = heavy ? 6 : 3;
      c.beginPath(); c.arc(6, -8, w.reach - 6, -2.2, 1.2); c.stroke();
    }
    c.shadowBlur = 0;
    c.restore();
    // perfect dodge afterimage
    if (p.state === 'dodge' && p.iframes > 0) {
      c.fillStyle = hexA('#a5f3fc', 0.25);
      c.beginPath(); c.ellipse(p.x - p.dodgeDir * 14, -28, 14, 22, 0, 0, Math.PI * 2); c.fill();
    }
  }

  // ---------------- Bosses ----------------
  private bossPose(b: BossEntity): BossPose {
    if (b.state === 'dead') return 'dead';
    if (b.state === 'stagger') return 'stagger';
    if (b.state === 'parried') return 'parried';
    if (b.state === 'transition') return 'transition';
    if (b.state === 'windup') return 'windup';
    if (b.state === 'active') return 'active';
    if (b.state === 'recovery') return 'recovery';
    if (b.state === 'approach' || Math.abs(b.vx) > 0.2) return 'move';
    return 'idle';
  }

  private drawBoss(e: Engine, b: BossEntity) {
    const c = this.c;
    const d = b.def;
    const pose = this.bossPose(b);
    const flash = b.hurtFlash > 0 && b.hurtFlash % 2 === 0;
    c.save();
    c.translate(b.x, -b.y);
    // shadow
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.beginPath(); c.ellipse(0, b.y, d.width * 0.6, 7, 0, 0, Math.PI * 2); c.fill();

    // telegraph aura
    if (pose === 'windup' && b.currentAttack) {
      const col = b.currentAttack.color || d.colors.glow;
      const k = b.glow;
      const rg = c.createRadialGradient(0, -d.height / 2, 10, 0, -d.height / 2, d.width * 1.4);
      rg.addColorStop(0, hexA(col, 0.35 * k));
      rg.addColorStop(1, hexA(col, 0));
      c.fillStyle = rg;
      c.fillRect(-d.width * 1.5, -d.height - 40, d.width * 3, d.height + 60);
      // pulse ring right before active
      if (k > 0.7) {
        c.strokeStyle = hexA(col, (k - 0.7) * 3);
        c.lineWidth = 3;
        const rr0 = Math.min(d.width * 1.6, 150); c.beginPath(); c.arc(0, -d.height / 2, rr0 * (1 - (k - 0.7) * 1.2), 0, Math.PI * 2); c.stroke();
      }
    }
    if (pose === 'stagger') {
      c.fillStyle = hexA('#fde047', 0.15 + Math.sin(e.frame / 3) * 0.08);
      c.beginPath(); c.ellipse(0, -d.height / 2, d.width, d.height / 2 + 10, 0, 0, Math.PI * 2); c.fill();
    }
    if (b.parriedTimer > 0 && pose !== 'stagger') {
      c.strokeStyle = hexA('#fde047', 0.6);
      c.lineWidth = 2;
      c.beginPath(); c.arc(0, -d.height / 2, d.width * 0.8, 0, Math.PI * 2); c.stroke();
    }
    if (pose === 'dead') c.globalAlpha = Math.max(0.15, 1 - b.deadTimer / 160);

    c.scale(b.facing, 1);
    if (pose === 'dead') { c.rotate(Math.PI / 2 * Math.min(1, b.deadTimer / 25)); }
    if (pose === 'stagger') { c.rotate(-0.25); c.translate(0, 10); }
    if (pose === 'parried') { c.rotate(-0.15); }
    if (pose === 'transition') { c.translate(0, -Math.sin(Math.min(Math.PI, (130 - b.transitionTimer) / 40)) * 10); }

    const pri = flash ? '#ffffff' : d.colors.primary;
    const sec = flash ? '#ffffff' : d.colors.secondary;
    const acc = flash ? '#ffffff' : d.colors.accent;
    const glow = d.colors.glow;
    const phaseTint = b.phase >= 1 ? hexA(glow, 0.05 + b.phase * 0.04) : null;

    switch (d.body) {
      case 'beast': this.drawBeast(e, b, pose, pri, sec, acc, glow); break;
      case 'drake': this.drawDrake(e, b, pose, pri, sec, acc, glow); break;
      default: this.drawHumanoid(e, b, pose, pri, sec, acc, glow); break;
    }
    if (phaseTint && pose !== 'dead') {
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = phaseTint;
      c.beginPath(); c.ellipse(0, -d.height / 2, d.width * 0.55, d.height * 0.5, 0, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = 'source-over';
    }
    c.restore();
  }

  private weaponAngle(b: BossEntity, pose: BossPose, frame: number) {
    const a = b.currentAttack;
    const t = b.attackTimer;
    if (!a) return pose === 'stagger' ? 1.6 : 0.7;
    const tel = a.telegraph;
    const w = Math.max(1, Math.round(a.windup));
    if (pose === 'windup') {
      const k = Math.min(1, b.glow);
      if (tel === 'slam') return -0.5 - k * 0.3;
      if (tel === 'thrust') return 1.2 - k * 0.4;
      if (tel === 'spin') return -0.9 + Math.sin(frame / 3) * 0.1;
      if (tel === 'magic' || tel === 'roar' || tel === 'teleport') return -0.2 - k * 0.3;
      if (tel === 'shoot') return 0;
      return -0.6 - k * 0.3;
    }
    if (pose === 'active') {
      const k = Math.min(1, t / Math.max(1, a.active));
      if (tel === 'slam') return -0.6 + k * 3.2;
      if (tel === 'thrust') return 1.57;
      if (tel === 'spin') return (t * 0.55) % (Math.PI * 2);
      if (tel === 'magic' || tel === 'roar') return -0.4;
      if (tel === 'shoot') return 0;
      return -0.9 + k * 3.2;
    }
    if (pose === 'recovery') return 1.9;
    void w;
    return 0.7;
  }

  private drawWeapon(c: Ctx, b: BossEntity, ang: number, scale: number, pri: string, acc: string, glow: string, pose: BossPose) {
    const d = b.def;
    c.save();
    c.rotate(ang);
    const glowing = pose === 'windup' || pose === 'active';
    if (glowing) { c.shadowColor = b.currentAttack?.color || glow; c.shadowBlur = 18; }
    const L = 60 * scale;
    switch (d.weapon) {
      case 'sword':
        c.fillStyle = '#374151'; c.fillRect(-2, -6, 4, 14);
        c.fillStyle = acc; c.fillRect(-2.5, -L, 5, L);
        c.fillStyle = pri; c.fillRect(-10, -6, 20, 4);
        break;
      case 'greatsword':
        c.fillStyle = '#374151'; c.fillRect(-3, -8, 6, 20);
        c.fillStyle = acc; c.fillRect(-4, -L * 1.5, 8, L * 1.5);
        c.fillStyle = glowing ? glow : pri; c.fillRect(-2, -L * 1.5, 4, L * 1.5);
        c.fillStyle = pri; c.fillRect(-16, -8, 32, 6);
        break;
      case 'hammer':
        c.fillStyle = '#374151'; c.fillRect(-4, -L * 1.4, 8, L * 1.4 + 10);
        c.fillStyle = acc; rr(c, -26, -L * 1.4 - 24, 52, 40, 6);
        c.fillStyle = glowing ? glow : pri; c.fillRect(-26, -L * 1.4 - 6, 52, 4);
        break;
      case 'mace':
        c.fillStyle = '#374151'; c.fillRect(-3, -L, 6, L + 8);
        c.fillStyle = acc; c.beginPath(); c.arc(0, -L, 18, 0, Math.PI * 2); c.fill();
        c.fillStyle = pri; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; c.fillRect(Math.cos(a) * 18 - 3, -L + Math.sin(a) * 18 - 3, 6, 6); }
        break;
      case 'scythe':
        c.fillStyle = '#3f3f46'; c.fillRect(-3, -L * 1.6, 6, L * 1.6 + 20);
        c.strokeStyle = acc; c.lineWidth = 7;
        c.beginPath(); c.arc(30, -L * 1.6 + 20, 34, Math.PI * 1.05, Math.PI * 1.9); c.stroke();
        break;
      case 'staff':
        c.fillStyle = '#3f3f46'; c.fillRect(-3, -L * 1.3, 6, L * 1.3 + 20);
        c.fillStyle = glow; c.beginPath(); c.arc(0, -L * 1.3, 12 + (glowing ? 4 : 0), 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(0, -L * 1.3, 4, 0, Math.PI * 2); c.fill();
        break;
      case 'bow': {
        c.strokeStyle = acc; c.lineWidth = 4;
        c.beginPath(); c.arc(-14, -L * 0.1, L * 0.9, -Math.PI * 0.45, Math.PI * 0.45); c.stroke();
        c.strokeStyle = '#e5e7eb'; c.lineWidth = 1;
        const draw = glowing ? -26 : -14;
        c.beginPath(); c.moveTo(-14 + Math.cos(-Math.PI * 0.45) * L * 0.9, -L * 0.1 + Math.sin(-Math.PI * 0.45) * L * 0.9); c.lineTo(draw, -L * 0.1); c.lineTo(-14 + Math.cos(Math.PI * 0.45) * L * 0.9, -L * 0.1 + Math.sin(Math.PI * 0.45) * L * 0.9); c.stroke();
        if (glowing) { c.fillStyle = b.currentAttack?.color || glow; c.fillRect(draw, -L * 0.1 - 1.5, L * 0.9 + 14, 3); }
        break;
      }
      default: break;
    }
    c.restore();
  }

  private drawHumanoid(e: Engine, b: BossEntity, pose: BossPose, pri: string, sec: string, acc: string, glow: string) {
    const c = this.c;
    const d = b.def;
    const H = d.height, W = d.width;
    const s = H / 96; // scale relative to knight
    const bob = pose === 'move' ? Math.abs(Math.sin(e.frame / 5)) * 4 : Math.sin(e.frame / 20) * 1.5;
    const isBig = d.body === 'colossus';
    const isMage = d.body === 'mage';
    const isWarden = d.body === 'warden';
    const isArcher = d.body === 'archer';
    const isKing = d.body === 'king';
    c.translate(0, -bob);
    // cape / robe
    c.fillStyle = sec;
    const cw = Math.sin(e.frame / 6) * 4 - b.vx * 2;
    if (isMage) {
      c.beginPath(); c.moveTo(-W * 0.35, -H * 0.55); c.lineTo(-W * 0.75 + cw, 6); c.lineTo(W * 0.7 + cw, 6); c.lineTo(W * 0.35, -H * 0.55); c.fill();
    } else {
      c.beginPath(); c.moveTo(-W * 0.3, -H * 0.72); c.lineTo(-W * 0.85 + cw, -6); c.lineTo(-W * 0.1 + cw * 0.5, 0); c.lineTo(W * 0.15, -H * 0.72); c.fill();
    }
    // legs
    if (!isMage) {
      c.fillStyle = pri;
      const swing = pose === 'move' ? Math.sin(e.frame / 5) * 8 * s : 0;
      rr(c, -W * 0.32 + swing * 0.3, -H * 0.38, W * 0.26, H * 0.38, 4);
      rr(c, W * 0.06 - swing * 0.3, -H * 0.38, W * 0.26, H * 0.38, 4);
      c.fillStyle = sec;
      c.fillRect(-W * 0.36, -8, W * 0.36, 8);
      c.fillRect(W * 0.02, -8, W * 0.36, 8);
    }
    // torso
    c.fillStyle = pri;
    const torsoW = isBig ? W * 1.05 : W * 0.8;
    const torsoTop = -H * (isWarden ? 0.7 : 0.78);
    const torsoH = H * (isMage ? 0.6 : 0.42);
    if (isWarden) { c.save(); c.rotate(0.18); }
    rr(c, -torsoW / 2, torsoTop, torsoW, torsoH, 8 * s);
    // chest plate accent
    c.fillStyle = acc;
    c.fillRect(-3 * s, torsoTop + 8 * s, 6 * s, torsoH - 16 * s);
    if (isBig) { c.fillStyle = sec; for (let i = 0; i < 3; i++) c.fillRect(-torsoW / 2 + 6, torsoTop + 14 + i * 16 * s, torsoW - 12, 3); }
    // pauldrons
    c.fillStyle = sec;
    c.beginPath(); c.ellipse(-torsoW / 2, torsoTop + 6, W * 0.28, 12 * s, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(torsoW / 2, torsoTop + 6, W * 0.28, 12 * s, 0, 0, Math.PI * 2); c.fill();
    if (isWarden) c.restore();
    // head
    const headY = torsoTop - 6 * s;
    const headR = (isBig ? 12 : 11) * s;
    c.fillStyle = isMage || isArcher || isWarden ? sec : pri;
    if (isMage || isArcher || isWarden) {
      // hood
      c.beginPath(); c.moveTo(-headR * 1.4, headY + headR); c.lineTo(0, headY - headR * 1.8); c.lineTo(headR * 1.4, headY + headR); c.fill();
      c.fillStyle = '#050505'; c.beginPath(); c.ellipse(headR * 0.2, headY - headR * 0.1, headR * 0.9, headR * 0.7, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = glow; c.fillRect(headR * 0.1, headY - headR * 0.3, 4, 3); c.fillRect(headR * 0.7, headY - headR * 0.3, 4, 3);
    } else {
      rr(c, -headR, headY - headR * 1.6, headR * 2, headR * 2.2, 6 * s);
      c.fillStyle = '#050505'; c.fillRect(headR * 0.1, headY - headR * 0.6, headR * 1.1, 4 * s);
      c.fillStyle = glow; c.fillRect(headR * 0.3, headY - headR * 0.5, 3 * s, 2 * s);
      // horns / crown
      c.fillStyle = acc;
      if (isKing) {
        for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * headR * 0.45 - 3, headY - headR * 1.5); c.lineTo(i * headR * 0.45, headY - headR * 2.6 - (i === 0 ? 8 : 0)); c.lineTo(i * headR * 0.45 + 3, headY - headR * 1.5); c.fill(); }
      } else if (isBig) {
        c.beginPath(); c.moveTo(-headR, headY - headR); c.lineTo(-headR * 2.4, headY - headR * 2.4); c.lineTo(-headR * 0.6, headY - headR * 1.6); c.fill();
        c.beginPath(); c.moveTo(headR, headY - headR); c.lineTo(headR * 2.4, headY - headR * 2.4); c.lineTo(headR * 0.6, headY - headR * 1.6); c.fill();
      } else {
        c.fillRect(-2 * s, headY - headR * 2.4, 4 * s, headR * 0.9);
      }
    }
    // arms + weapon
    const shoulderY = torsoTop + 12 * s;
    const ang = this.weaponAngle(b, pose, e.frame);
    c.save();
    c.translate(torsoW * 0.35, shoulderY);
    // arm
    c.save(); c.rotate(ang + 0.3); c.fillStyle = pri; rr(c, -5 * s, 0, 10 * s, 26 * s, 4); c.restore();
    c.translate(-Math.sin(ang + 0.3) * 26 * s, Math.cos(ang + 0.3) * 26 * s);
    this.drawWeapon(c, b, ang, isBig ? s * 1.1 : s, pri, acc, glow, pose);
    c.restore();
    // off-hand
    c.save(); c.translate(-torsoW * 0.35, shoulderY); c.rotate(pose === 'windup' ? -0.6 : 0.4); c.fillStyle = pri; rr(c, -5 * s, 0, 10 * s, 24 * s, 4); c.restore();
    // king embers / mage float glow
    if (isKing || isMage) {
      c.fillStyle = hexA(glow, 0.5);
      for (let i = 0; i < 5; i++) { const a = e.frame / 30 + i * 1.26; c.beginPath(); c.arc(Math.cos(a) * W * 0.9, -H * 0.5 + Math.sin(a * 1.3) * H * 0.3, 3, 0, Math.PI * 2); c.fill(); }
    }
    if (isWarden) {
      // lantern
      c.fillStyle = glow; c.beginPath(); c.arc(-torsoW * 0.6, -H * 0.3 + Math.sin(e.frame / 10) * 3, 7, 0, Math.PI * 2); c.fill();
    }
  }

  private drawBeast(e: Engine, b: BossEntity, pose: BossPose, pri: string, sec: string, acc: string, glow: string) {
    const c = this.c;
    const d = b.def;
    const W = d.width, H = d.height;
    const bob = pose === 'move' ? Math.abs(Math.sin(e.frame / 3)) * 5 : Math.sin(e.frame / 12) * 2;
    const crouch = pose === 'windup' ? 12 * b.glow : 0;
    c.translate(0, -bob + crouch);
    // tail
    c.strokeStyle = sec; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-W * 0.4, -H * 0.6); c.quadraticCurveTo(-W * 0.7, -H * 0.9 + Math.sin(e.frame / 6) * 10, -W * 0.85, -H * 0.5); c.stroke();
    // legs
    c.fillStyle = sec;
    const sw = pose === 'move' || pose === 'active' ? Math.sin(e.frame / 3) * 10 : 0;
    rr(c, -W * 0.36 + sw, -H * 0.45, 12, H * 0.45, 4);
    rr(c, W * 0.18 - sw, -H * 0.45, 12, H * 0.45, 4);
    // body
    c.fillStyle = pri;
    c.beginPath(); c.ellipse(-W * 0.05, -H * 0.6, W * 0.42, H * 0.3, 0, 0, Math.PI * 2); c.fill();
    // fur spikes
    c.fillStyle = sec;
    for (let i = 0; i < 6; i++) { const x = -W * 0.4 + i * W * 0.13; c.beginPath(); c.moveTo(x, -H * 0.85); c.lineTo(x + 6, -H * 1.05 - (i % 2) * 6); c.lineTo(x + 12, -H * 0.85); c.fill(); }
    // front legs
    c.fillStyle = pri;
    rr(c, -W * 0.28 - sw, -H * 0.5, 12, H * 0.5, 4);
    rr(c, W * 0.26 + sw, -H * 0.5, 12, H * 0.5, 4);
    // head
    const openJaw = pose === 'active' || pose === 'windup' ? 0.5 : 0.1;
    c.save();
    c.translate(W * 0.36, -H * 0.72);
    c.rotate(pose === 'windup' ? -0.3 : 0.05);
    c.fillStyle = pri; c.beginPath(); c.ellipse(0, 0, W * 0.2, H * 0.17, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = pri; c.beginPath(); c.moveTo(W * 0.05, -H * 0.1); c.lineTo(W * 0.32, -H * 0.02); c.lineTo(W * 0.1, H * 0.05); c.fill(); // snout top
    c.save(); c.rotate(openJaw); c.fillStyle = sec; c.beginPath(); c.moveTo(W * 0.02, H * 0.02); c.lineTo(W * 0.3, H * 0.08); c.lineTo(W * 0.05, H * 0.14); c.fill();
    c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) c.fillRect(W * 0.06 + i * 6, H * 0.03 + i * 1.2, 3, 5); c.restore();
    // ears
    c.fillStyle = sec; c.beginPath(); c.moveTo(-W * 0.1, -H * 0.12); c.lineTo(-W * 0.05, -H * 0.32); c.lineTo(0, -H * 0.12); c.fill();
    // eye
    c.fillStyle = glow; c.shadowColor = glow; c.shadowBlur = 8; c.beginPath(); c.arc(W * 0.02, -H * 0.05, 4, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    c.restore();
    // claws glow when attacking
    if (pose === 'active') { c.fillStyle = hexA(b.currentAttack?.color || glow, 0.5); c.beginPath(); c.arc(W * 0.45, -H * 0.4, 26, 0, Math.PI * 2); c.fill(); }
    void acc;
  }

  private drawDrake(e: Engine, b: BossEntity, pose: BossPose, pri: string, sec: string, acc: string, glow: string) {
    const c = this.c;
    const d = b.def;
    const W = d.width, H = d.height;
    const flying = b.y > 20;
    const flap = Math.sin(e.frame / (flying ? 5 : 14));
    const bob = Math.sin(e.frame / 16) * 3;
    c.translate(0, -bob);
    // back wing
    c.fillStyle = sec;
    c.beginPath(); c.moveTo(-W * 0.1, -H * 0.6); c.lineTo(-W * 0.6, -H * 0.9 - flap * H * 0.35); c.lineTo(-W * 0.95, -H * 0.55 - flap * H * 0.2); c.lineTo(-W * 0.55, -H * 0.55); c.fill();
    // tail
    c.strokeStyle = pri; c.lineWidth = 14; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-W * 0.35, -H * 0.4); c.quadraticCurveTo(-W * 0.75, -H * 0.5 + Math.sin(e.frame / 8) * 15, -W * 0.95, -H * 0.15 + (pose === 'active' && b.currentAttack?.id === 'tail' ? -40 : 0)); c.stroke();
    c.fillStyle = acc; c.beginPath(); c.moveTo(-W * 0.98, -H * 0.15); c.lineTo(-W * 1.08, -H * 0.3); c.lineTo(-W * 0.85, -H * 0.22); c.fill();
    // legs
    c.fillStyle = sec;
    rr(c, -W * 0.25, -H * 0.4, 18, H * 0.4, 6);
    rr(c, W * 0.1, -H * 0.4, 18, H * 0.4, 6);
    // body
    c.fillStyle = pri;
    c.beginPath(); c.ellipse(-W * 0.05, -H * 0.55, W * 0.4, H * 0.28, -0.15, 0, Math.PI * 2); c.fill();
    // belly plates
    c.fillStyle = acc;
    for (let i = 0; i < 5; i++) c.fillRect(-W * 0.3 + i * W * 0.12, -H * 0.38 + i * 2, W * 0.1, 5);
    // spines
    c.fillStyle = acc;
    for (let i = 0; i < 6; i++) { const x = -W * 0.4 + i * W * 0.14; c.beginPath(); c.moveTo(x, -H * 0.75); c.lineTo(x + 6, -H * 0.92); c.lineTo(x + 14, -H * 0.75); c.fill(); }
    // neck & head
    const headUp = pose === 'windup' ? -0.5 : pose === 'active' ? 0.3 : 0;
    c.save();
    c.translate(W * 0.3, -H * 0.7);
    c.rotate(headUp);
    c.strokeStyle = pri; c.lineWidth = 22; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(W * 0.12, -H * 0.15, W * 0.22, -H * 0.2); c.stroke();
    c.translate(W * 0.22, -H * 0.2);
    c.fillStyle = pri; c.beginPath(); c.ellipse(0, 0, W * 0.16, H * 0.11, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = pri; c.beginPath(); c.moveTo(W * 0.05, -H * 0.06); c.lineTo(W * 0.3, 0); c.lineTo(W * 0.05, H * 0.06); c.fill();
    const jaw = pose === 'active' || pose === 'windup' ? 0.45 : 0.08;
    c.save(); c.rotate(jaw); c.fillStyle = sec; c.beginPath(); c.moveTo(W * 0.03, H * 0.02); c.lineTo(W * 0.28, H * 0.06); c.lineTo(W * 0.05, H * 0.11); c.fill(); c.restore();
    c.fillStyle = acc; c.beginPath(); c.moveTo(-W * 0.05, -H * 0.08); c.lineTo(-W * 0.12, -H * 0.3); c.lineTo(0, -H * 0.1); c.fill();
    c.fillStyle = acc; c.beginPath(); c.moveTo(-W * 0.12, -H * 0.05); c.lineTo(-W * 0.22, -H * 0.24); c.lineTo(-W * 0.08, -H * 0.07); c.fill();
    c.fillStyle = glow; c.shadowColor = glow; c.shadowBlur = 10; c.beginPath(); c.arc(W * 0.02, -H * 0.03, 5, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    if (pose === 'windup' && b.currentAttack?.telegraph === 'magic') { c.fillStyle = hexA(glow, 0.6 * b.glow); c.beginPath(); c.arc(W * 0.25, 0.04 * H, 14 * b.glow, 0, Math.PI * 2); c.fill(); }
    c.restore();
    // front wing
    c.fillStyle = hexA(sec, 0.9);
    c.beginPath(); c.moveTo(-W * 0.05, -H * 0.7); c.lineTo(-W * 0.45, -H * 1.05 - flap * H * 0.4); c.lineTo(-W * 0.9, -H * 0.7 - flap * H * 0.25); c.lineTo(-W * 0.5, -H * 0.62); c.fill();
    c.strokeStyle = pri; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-W * 0.05, -H * 0.7); c.lineTo(-W * 0.45, -H * 1.05 - flap * H * 0.4); c.stroke();
    // lightning aura when phase >= 1
    if (b.phase >= 1 && pose !== 'dead' && e.frame % 5 === 0) {
      c.strokeStyle = hexA(glow, 0.7); c.lineWidth = 2; c.beginPath();
      let x = -W * 0.3 + Math.random() * W * 0.6, y = -H * 0.9;
      c.moveTo(x, y); for (let i = 0; i < 4; i++) { x += (Math.random() - 0.5) * 30; y += 15; c.lineTo(x, y); } c.stroke();
    }
  }

  // ---------------- Projectiles / hazards / particles ----------------
  private drawProjectile(e: Engine, p: Projectile) {
    const c = this.c;
    c.save();
    c.translate(p.x, -p.y);
    c.shadowColor = p.color; c.shadowBlur = 12;
    c.fillStyle = p.owner === 'player' ? '#a5f3fc' : p.color;
    if (p.kind === 'arrow') {
      c.rotate(Math.atan2(-p.vy, p.vx));
      c.fillRect(-16, -2, 32, 4);
      c.beginPath(); c.moveTo(16, -5); c.lineTo(24, 0); c.lineTo(16, 5); c.fill();
    } else if (p.kind === 'shock') {
      c.beginPath(); c.moveTo(-p.r, 0); c.lineTo(0, -p.r * 2.2); c.lineTo(p.r, 0); c.fill();
      c.fillStyle = hexA(p.color, 0.5); c.beginPath(); c.ellipse(0, 0, p.r * 1.8, p.r * 0.5, 0, 0, Math.PI * 2); c.fill();
    } else if (p.kind === 'bolt') {
      c.beginPath(); c.moveTo(-4, -p.r * 1.6); c.lineTo(4, -p.r * 0.3); c.lineTo(-2, 0); c.lineTo(4, p.r * 1.6); c.lineTo(-4, p.r * 0.3); c.lineTo(2, 0); c.fill();
    } else {
      c.beginPath(); c.arc(0, 0, p.r, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, p.r * 0.4, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    void e;
  }

  private drawHazard(e: Engine, h: Hazard) {
    const c = this.c;
    const L = h.x - h.w / 2;
    if (h.warn > 0) {
      const k = 1 - h.warn / 60;
      const pulse = 0.4 + Math.sin(e.frame / 3) * 0.2;
      c.fillStyle = hexA(h.color, 0.18 + k * 0.15);
      c.fillRect(L, -4, h.w, 8);
      c.strokeStyle = hexA(h.color, pulse + k * 0.4);
      c.lineWidth = 2;
      c.strokeRect(L, -6, h.w, 10);
      if (h.type === 'pillar' || h.type === 'lightning' || h.type === 'debris') {
        c.fillStyle = hexA(h.color, 0.06 + k * 0.1);
        c.fillRect(L, -h.h, h.w, h.h);
        // falling indicator
        if (h.type === 'debris') { c.fillStyle = hexA(h.color, 0.8); c.fillRect(h.x - 8, -h.h - 200 + (1 - h.warn / 60) * 190, 16, 16); }
      }
      return;
    }
    if (h.type === 'fire') {
      for (let i = 0; i < h.w / 12; i++) {
        const fx = L + i * 12 + ((e.frame * 2 + i * 7) % 12);
        const fh = 14 + Math.sin(e.frame / 3 + i) * 8 + Math.random() * 10;
        c.fillStyle = i % 2 ? '#f97316' : '#fbbf24';
        c.beginPath(); c.moveTo(fx - 5, 0); c.lineTo(fx, -fh); c.lineTo(fx + 5, 0); c.fill();
      }
      c.fillStyle = hexA('#f97316', 0.3); c.fillRect(L, -4, h.w, 6);
    } else if (h.type === 'poison') {
      c.fillStyle = hexA(h.color, 0.55); c.beginPath(); c.ellipse(h.x, 0, h.w / 2, 7, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = hexA(h.color, 0.3);
      for (let i = 0; i < 4; i++) { const bx = L + ((i * 37 + e.frame) % h.w); const by = -((e.frame * 0.7 + i * 23) % 40); c.beginPath(); c.arc(bx, by, 4, 0, Math.PI * 2); c.fill(); }
    } else if (h.type === 'pillar') {
      const k = h.life / 18;
      const grd = c.createLinearGradient(0, 0, 0, -h.h);
      grd.addColorStop(0, hexA(h.color, 0.9 * k)); grd.addColorStop(1, hexA(h.color, 0));
      c.fillStyle = grd; c.fillRect(L, -h.h, h.w, h.h);
      c.fillStyle = hexA('#fff', 0.6 * k); c.fillRect(h.x - 6, -h.h * 0.9, 12, h.h * 0.9);
    } else if (h.type === 'lightning') {
      const k = h.life / 10;
      c.strokeStyle = hexA('#fff', k); c.lineWidth = 4; c.beginPath();
      let x = h.x, y = -h.h; c.moveTo(x, y);
      for (let i = 0; i < 8; i++) { x = h.x + (Math.random() - 0.5) * 30; y += h.h / 8; c.lineTo(x, y); }
      c.stroke();
      c.strokeStyle = hexA(h.color, k); c.lineWidth = 10; c.stroke();
      c.fillStyle = hexA(h.color, 0.4 * k); c.fillRect(L, -30, h.w, 30);
    } else if (h.type === 'debris') {
      c.fillStyle = hexA(h.color, Math.min(1, h.life / 6));
      c.beginPath(); c.moveTo(L, 0); c.lineTo(h.x - 10, -h.h * 0.6); c.lineTo(h.x + 12, -h.h * 0.5); c.lineTo(L + h.w, 0); c.fill();
    }
  }

  private drawParticles(e: Engine) {
    const c = this.c;
    for (const p of e.particles) {
      const a = p.life / p.maxLife;
      c.globalAlpha = a;
      c.fillStyle = p.color;
      if (p.shape === 'ring') { c.strokeStyle = p.color; c.lineWidth = 2; c.beginPath(); c.arc(p.x, -p.y, p.size, 0, Math.PI * 2); c.stroke(); }
      else if (p.shape === 'spark') { c.fillRect(p.x - 1, -p.y - 1, p.size + 1, 2); }
      else if (p.shape === 'shard') { c.fillRect(p.x, -p.y, p.size + 1, p.size + 1); }
      else { c.beginPath(); c.arc(p.x, -p.y, p.size, 0, Math.PI * 2); c.fill(); }
    }
    c.globalAlpha = 1;
  }

  private drawHitboxes(e: Engine) {
    const c = this.c;
    c.lineWidth = 1.5;
    const box = (r: { x: number; y: number; w: number; h: number }, col: string) => { c.strokeStyle = col; c.strokeRect(r.x, -r.y - r.h, r.w, r.h); };
    box(e.playerHurtbox(), '#22c55e');
    const pa = e.playerAttackBox(); if (pa) box(pa, '#3b82f6');
    for (const b of e.bosses) {
      box(e.bossHurtbox(b), '#eab308');
      if (b.state === 'active' && b.currentAttack?.hitbox) {
        const boxes = b.currentAttack.hitbox(b.attackTimer, { player: { x: e.player.x, y: e.player.y, facing: e.player.facing, hurtbox: e.playerHurtbox(), hp: e.player.hp }, boss: b, spawnProjectile: () => {}, spawnHazard: () => {}, particles: () => {}, shake: () => {}, sfx: () => {}, arena: e.arena, rng: () => 0.5, frame: e.frame, difficulty: e.cfg.difficulty, allBosses: e.bosses });
        for (const r of boxes) box(r, '#ef4444');
      }
    }
    for (const p of e.projectiles) box({ x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }, '#f97316');
    for (const h of e.hazards) if (h.warn <= 0) box({ x: h.x - h.w / 2, y: 0, w: h.w, h: h.h }, '#a855f7');
  }

  // ---------------- HUD ----------------
  private drawHUD(e: Engine) {
    const c = this.c;
    const p = e.player;
    c.textBaseline = 'alphabetic';
    // Player bars
    const bx = 24, by = 24;
    const hpW = 220 + (p.maxHp - 100) * 1.2;
    c.fillStyle = 'rgba(0,0,0,0.65)'; rr(c, bx - 4, by - 4, hpW + 8, 16, 3);
    c.fillStyle = '#7f1d1d'; c.fillRect(bx, by, hpW, 8);
    c.fillStyle = p.hurtFlash > 0 ? '#fecaca' : '#dc2626'; c.fillRect(bx, by, hpW * Math.max(0, p.hp / p.maxHp), 8);
    const stW = 180;
    c.fillStyle = 'rgba(0,0,0,0.65)'; rr(c, bx - 4, by + 14, stW + 8, 14, 3);
    c.fillStyle = '#14532d'; c.fillRect(bx, by + 18, stW, 6);
    c.fillStyle = p.stamina < 20 ? '#fbbf24' : '#22c55e'; c.fillRect(bx, by + 18, stW * (p.stamina / p.maxStamina), 6);
    // flasks
    for (let i = 0; i < p.flaskMax; i++) {
      c.fillStyle = i < p.flask ? '#f59e0b' : '#3f3f46';
      rr(c, bx + i * 16, by + 34, 10, 14, 3);
      c.fillStyle = i < p.flask ? '#fde68a' : '#52525b';
      c.fillRect(bx + i * 16 + 3, by + 32, 4, 3);
    }
    if (e.cfg.difficulty === 'nightmare') { c.fillStyle = '#f87171'; c.font = '11px monospace'; c.textAlign = 'left'; c.fillText('NIGHTMARE — NO FLASK', bx, by + 46); }
    // weapon + relic label
    c.fillStyle = '#a1a1aa'; c.font = '11px monospace'; c.textAlign = 'left';
    c.fillText(`${WEAPONS[e.cfg.weapon].name.toUpperCase()}`, bx, by + 66);
    // timer & deaths
    c.textAlign = 'right';
    c.fillStyle = '#e4e4e7'; c.font = 'bold 16px monospace';
    c.fillText(fmtTime(e.fightFrames), VIEW_W - 24, 36);
    c.fillStyle = '#a1a1aa'; c.font = '11px monospace';
    c.fillText(`DEATHS ${e.deaths}`, VIEW_W - 24, 52);
    if (e.cfg.gauntletIndex !== undefined) c.fillText(`GAUNTLET ${e.cfg.gauntletIndex + 1}/${BOSSES.length}  RUN ${fmtTime((e.cfg.runFramesStart || 0) + e.fightFrames)}`, VIEW_W - 24, 66);

    // Boss bars
    const alive = e.bosses;
    alive.forEach((b, i) => {
      const w = 520, x = (VIEW_W - w) / 2, y = VIEW_H - 54 - i * 34;
      c.fillStyle = 'rgba(0,0,0,0.7)'; rr(c, x - 6, y - 18, w + 12, 34, 4);
      c.fillStyle = '#e4e4e7'; c.font = 'bold 13px "Cinzel", Georgia, serif'; c.textAlign = 'left';
      c.fillText(b.def.name.toUpperCase(), x, y - 5);
      c.textAlign = 'right'; c.font = '11px monospace'; c.fillStyle = '#a1a1aa';
      c.fillText(`${b.def.phases[b.phase].name}  ·  ${'◆'.repeat(b.phase + 1)}${'◇'.repeat(b.def.phases.length - b.phase - 1)}`, x + w, y - 5);
      c.fillStyle = '#27272a'; c.fillRect(x, y, w, 8);
      c.fillStyle = b.hurtFlash > 0 ? '#fef2f2' : '#b91c1c'; c.fillRect(x, y, w * Math.max(0, b.hp / b.maxHp), 8);
      // phase thresholds
      for (let k = 1; k < b.def.phases.length; k++) { c.fillStyle = '#fbbf24'; c.fillRect(x + w * b.def.phases[k].hpThreshold - 1, y - 2, 2, 12); }
      // poise
      c.fillStyle = '#1c1917'; c.fillRect(x, y + 10, w, 3);
      c.fillStyle = b.state === 'stagger' ? '#fde047' : '#eab308'; c.fillRect(x, y + 10, w * Math.max(0, 1 - b.poise / b.def.poiseMax), 3);
      if (b.bleed > 0) { c.fillStyle = '#e11d48'; c.fillRect(x, y + 14, w * (b.bleed / b.bleedMax), 2); }
    });

    // Banner
    if (e.banner) {
      const bn = e.banner;
      const k = Math.min(1, (400 - bn.timer) / 15);
      const big = bn.text === 'YOU DIED' || bn.text === 'PREY SLAUGHTERED';
      c.globalAlpha = bn.timer < 20 ? bn.timer / 20 : Math.min(1, k + 0.3);
      if (big) { c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(0, VIEW_H / 2 - 60, VIEW_W, 120); }
      else { c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, VIEW_H / 2 - 50, VIEW_W, 90); }
      c.textAlign = 'center';
      c.fillStyle = bn.color;
      c.font = `bold ${big ? 54 : 30}px "Cinzel", Georgia, serif`;
      c.shadowColor = bn.color; c.shadowBlur = 20;
      c.fillText(bn.text, VIEW_W / 2, VIEW_H / 2 + (big ? 16 : 4));
      c.shadowBlur = 0;
      if (bn.sub) { c.fillStyle = '#e4e4e7'; c.font = '16px "Cinzel", Georgia, serif'; c.fillText(bn.sub, VIEW_W / 2, VIEW_H / 2 + (big ? 44 : 30)); }
      c.globalAlpha = 1;
    }
    // Intro
    if (e.fightState === 'intro') {
      c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, 90, VIEW_W, 80);
      c.fillStyle = '#fafafa'; c.font = 'bold 30px "Cinzel", Georgia, serif';
      c.fillText(e.bossDef.name.toUpperCase(), VIEW_W / 2, 130);
      c.fillStyle = e.bossDef.colors.glow; c.font = '15px "Cinzel", Georgia, serif';
      c.fillText(e.bossDef.title, VIEW_W / 2, 155);
    }
    if (e.fightState === 'dead' && p.deadTimer > 50) {
      c.textAlign = 'center'; c.fillStyle = '#e4e4e7'; c.font = '14px monospace';
      c.fillText('[ R ] or [ SPACE ] — RISE AGAIN', VIEW_W / 2, VIEW_H / 2 + 80);
    }
    if (e.paused) {
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, VIEW_W, VIEW_H);
      c.textAlign = 'center'; c.fillStyle = '#fafafa'; c.font = 'bold 36px "Cinzel", Georgia, serif';
      c.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2);
    }
  }
}

export function fmtTime(frames: number) {
  const ms = Math.round((frames / 60) * 1000);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

export function fmtMs(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}
