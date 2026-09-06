import { mkAttack, frontBox, aroundBox, dash, halt, face, chase, shockwave, hazard, projectile, MODES, clampToArena, dirToPlayer } from "./helpers";
const COLOSSUS = {
  id: "colossus",
  name: "Gravebound Colossus",
  title: "Warden of the Sunken Barrow",
  archetype: "Juggernaut",
  icon: "\u{1F6E1}\uFE0F",
  hp: 980,
  poiseMax: 190,
  width: 100,
  height: 210,
  speed: 1.5,
  arenaWidth: 1120,
  body: "colossus",
  weapon: "hammer",
  colors: { primary: "#57534e", secondary: "#292524", accent: "#a8a29e", glow: "#84cc16" },
  arenaTheme: "ruins",
  unlocksRelic: "swift",
  staggerFrames: 130,
  lore: "The barrow-builders chained a giant beneath the hill so it would carry the dead down to the deep. It carried them for six hundred years. When the chains rusted through, it kept walking \u2014 and it has not stopped mistaking the living for cargo.",
  music: { bpm: 92, root: 38, mode: MODES.aeolian, bassPattern: [0, -1, -1, 0, -1, 3, -1, 2], arpPattern: [0, -1, 3, -1, 7, -1, 3, -1] },
  phases: [
    { hpThreshold: 1, speedMult: 1, aggression: 0.35, name: "Burden", attackIds: ["hslam", "sweep", "stomp"] },
    { hpThreshold: 0.5, speedMult: 1.15, aggression: 0.6, name: "Unchained", attackIds: ["hslam", "sweep", "stomp", "charge", "debris"], announce: "THE CHAINS SNAP", tint: "#84cc16" },
    { hpThreshold: 0.2, speedMult: 1.25, aggression: 0.85, name: "Collapse", attackIds: ["hslam", "sweep", "charge", "debris", "fury"], announce: "THE BARROW COLLAPSES", tint: "#a3e635" }
  ],
  attacks: [
    mkAttack({
      id: "hslam",
      name: "Barrow Hammer",
      windup: 58,
      active: 8,
      recovery: 58,
      damage: 46,
      poise: 40,
      weight: 3,
      maxRange: 240,
      unblockable: true,
      telegraph: "slam",
      color: "#a3e635",
      sfxWindup: "windup_slam",
      sfxActive: "slam",
      hitbox: (_t, c) => [frontBox(c.boss, 215, 90, 0)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 14) face(c);
          dash(c, t > 20 && t < 48 ? 1.2 : 0);
        } else halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t === 0) {
          c.shake(22);
          c.particles(c.boss.x + c.boss.facing * 150, 4, 30, "#a3e635", 7, "shard");
          shockwave(c, 6.5, 22, "#a3e635");
          if (c.boss.phase >= 1) shockwave(c, 6.5, 22, "#a3e635", -c.boss.facing);
        }
      }
    }),
    mkAttack({
      id: "sweep",
      name: "Gravedigger Sweep",
      windup: 46,
      active: 14,
      recovery: 50,
      damage: 34,
      poise: 30,
      weight: 2.5,
      maxRange: 280,
      telegraph: "slash",
      color: "#bef264",
      sfxWindup: "windup",
      sfxActive: "swoosh_heavy",
      hitbox: (t, c) => [t < 7 ? frontBox(c.boss, 250, 100, 20) : aroundBox(c.boss, 250, 100, 20)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 12) face(c);
          halt(c);
        } else if (ph === "active") dash(c, 1.5);
        else halt(c);
      }
    }),
    mkAttack({
      id: "stomp",
      name: "Sepulchre Stomp",
      windup: 38,
      active: 6,
      recovery: 40,
      damage: 28,
      poise: 24,
      weight: 2,
      maxRange: 170,
      telegraph: "slam",
      color: "#84cc16",
      sfxWindup: "windup_slam",
      sfxActive: "thud",
      hitbox: (_t, c) => [aroundBox(c.boss, 150, 50, 0)],
      motion: (ph, _t, c) => {
        if (ph === "windup") face(c);
        halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t === 0) {
          c.shake(12);
          c.particles(c.boss.x, 4, 20, "#a8a29e", 6, "shard");
        }
      }
    }),
    mkAttack({
      id: "charge",
      name: "Barrow Charge",
      windup: 44,
      active: 34,
      recovery: 44,
      damage: 32,
      poise: 30,
      weight: 2.5,
      minRange: 200,
      telegraph: "pounce",
      color: "#a3e635",
      phaseMin: 1,
      hyperArmor: true,
      sfxWindup: "roar",
      hitbox: (_t, c) => [frontBox(c.boss, 90, 150, 0)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 20) face(c);
          dash(c, t > 30 ? -1 : 0);
        } else if (ph === "active") dash(c, 7.5);
        else halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t % 6 === 0) {
          c.shake(3);
          c.particles(c.boss.x - c.boss.facing * 30, 4, 4, "#78716c", 3, "blob");
        }
      }
    }),
    mkAttack({
      id: "debris",
      name: "Ceiling Collapse",
      windup: 40,
      active: 4,
      recovery: 48,
      damage: 24,
      poise: 16,
      weight: 2,
      telegraph: "roar",
      color: "#a8a29e",
      phaseMin: 1,
      sfxWindup: "roar",
      motion: (ph, _t, c) => {
        if (ph === "windup") face(c);
        halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "windup" && t === 10) {
          c.shake(6);
          const n = c.boss.phase >= 2 ? 6 : 4;
          for (let i = 0; i < n; i++) {
            const x = i === 0 ? c.player.x : c.arena.left + 60 + c.rng() * (c.arena.width - 120);
            hazard(c, { type: "debris", x, w: 90, h: 80, warn: 40 + Math.floor(c.rng() * 30), life: 10, damage: 24, color: "#a8a29e" });
          }
        }
      }
    }),
    mkAttack({
      id: "fury",
      name: "Barrow Fury",
      windup: 50,
      active: 8,
      recovery: 14,
      damage: 40,
      poise: 36,
      weight: 3,
      maxRange: 260,
      unblockable: true,
      telegraph: "slam",
      color: "#ef4444",
      phaseMin: 2,
      chain: "fury2",
      hyperArmor: true,
      sfxWindup: "windup_slam",
      sfxActive: "slam",
      hitbox: (_t, c) => [frontBox(c.boss, 215, 90, 0)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 12) face(c);
          dash(c, t > 16 ? 1.6 : 0);
        } else halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t === 0) {
          c.shake(18);
          shockwave(c, 7, 22, "#ef4444");
        }
      }
    }),
    mkAttack({
      id: "fury2",
      name: "Barrow Fury II",
      windup: 34,
      active: 8,
      recovery: 14,
      damage: 40,
      poise: 36,
      weight: 0,
      unblockable: true,
      telegraph: "slam",
      color: "#ef4444",
      chain: "fury3",
      hyperArmor: true,
      sfxWindup: "windup_slam",
      sfxActive: "slam",
      hitbox: (_t, c) => [frontBox(c.boss, 215, 90, 0)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 8) face(c);
          dash(c, 1.6);
        } else halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t === 0) {
          c.shake(18);
          shockwave(c, 7, 22, "#ef4444", -c.boss.facing);
        }
      }
    }),
    mkAttack({
      id: "fury3",
      name: "Barrow Fury III",
      windup: 44,
      active: 8,
      recovery: 70,
      damage: 50,
      poise: 40,
      weight: 0,
      unblockable: true,
      telegraph: "slam",
      color: "#ef4444",
      hyperArmor: true,
      sfxWindup: "windup_slam",
      sfxActive: "slam",
      hitbox: (_t, c) => [aroundBox(c.boss, 230, 100, 0)],
      motion: (ph, _t, c) => {
        if (ph === "windup") face(c);
        halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t === 0) {
          c.shake(26);
          shockwave(c, 7, 22, "#ef4444", 1);
          shockwave(c, 7, 22, "#ef4444", -1);
          c.particles(c.boss.x, 10, 40, "#ef4444", 9, "shard");
        }
      }
    })
  ]
};
const PLAGUE_WARDEN = {
  id: "warden",
  name: "The Plague Warden",
  title: "Keeper of the Weeping Marsh",
  archetype: "Juggernaut",
  icon: "\u2620\uFE0F",
  hp: 820,
  poiseMax: 130,
  width: 70,
  height: 150,
  speed: 1.9,
  arenaWidth: 1e3,
  body: "warden",
  weapon: "scythe",
  colors: { primary: "#365314", secondary: "#1a2e05", accent: "#bef264", glow: "#a3e635" },
  arenaTheme: "swamp",
  unlocksRelic: "gravewalker",
  staggerFrames: 110,
  lore: 'When the marsh-town sickened, the Warden was told to burn the dead. He buried them instead, and sat with them, and the rot learned his name. Now he tends a garden of the drowned and calls each new visitor "neighbour".',
  music: { bpm: 100, root: 40, mode: MODES.locrian, bassPattern: [0, -1, 1, -1, 0, -1, 3, 1], arpPattern: [0, 3, 1, 5, 3, 6, 5, 1] },
  phases: [
    { hpThreshold: 1, speedMult: 1, aggression: 0.4, name: "Neighbour", attackIds: ["reap", "spit", "miasma"] },
    { hpThreshold: 0.5, speedMult: 1.15, aggression: 0.65, name: "Rot Bloom", attackIds: ["reap", "spit", "miasma", "bloom", "hook"], announce: "THE ROT BLOOMS", tint: "#a3e635" },
    { hpThreshold: 0.2, speedMult: 1.25, aggression: 0.85, name: "Plague Storm", attackIds: ["reap", "bloom", "hook", "storm"], announce: "THE MARSH WEEPS", tint: "#bef264" }
  ],
  attacks: [
    mkAttack({
      id: "reap",
      name: "Reaping Arc",
      windup: 38,
      active: 10,
      recovery: 20,
      damage: 28,
      poise: 22,
      weight: 3,
      maxRange: 220,
      telegraph: "slash",
      color: "#a3e635",
      chain: "reap2",
      chainChance: 0.7,
      sfxWindup: "windup",
      sfxActive: "swoosh_heavy",
      hitbox: (_t, c) => [frontBox(c.boss, 200, 80, 26)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 10) face(c);
          dash(c, t > 16 ? 1.8 : 0);
        } else if (ph === "active") dash(c, 2);
        else halt(c);
      }
    }),
    mkAttack({
      id: "reap2",
      name: "Reaping Arc II",
      windup: 26,
      active: 10,
      recovery: 42,
      damage: 30,
      poise: 24,
      weight: 0,
      telegraph: "slash",
      color: "#a3e635",
      sfxWindup: "windup",
      sfxActive: "swoosh_heavy",
      hitbox: (_t, c) => [frontBox(c.boss, 200, 60, 0)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 6) face(c);
          dash(c, 1.8);
        } else if (ph === "active") dash(c, 2);
        else halt(c);
      }
    }),
    mkAttack({
      id: "spit",
      name: "Bile Lob",
      windup: 32,
      active: 6,
      recovery: 36,
      damage: 14,
      poise: 6,
      weight: 2,
      minRange: 160,
      telegraph: "magic",
      color: "#84cc16",
      sfxWindup: "windup_magic",
      motion: (ph, _t, c) => {
        if (ph === "windup") face(c);
        halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t === 0) {
          c.sfx("poison");
          const dx = c.player.x - c.boss.x;
          const frames = 50;
          const n = c.boss.phase >= 1 ? 2 : 1;
          for (let i = 0; i < n; i++) {
            const tx = dx + (i === 0 ? 0 : (c.rng() - 0.5) * 200);
            projectile(c, { x: c.boss.x, y: 90, vx: tx / frames, vy: 0.5 * 0.35 * frames - 90 / frames, r: 12, damage: 14, color: "#84cc16", kind: "spit", gravity: -0.35, life: 200, parryable: false });
          }
        }
      }
    }),
    mkAttack({
      id: "miasma",
      name: "Miasma",
      windup: 50,
      active: 36,
      recovery: 40,
      damage: 8,
      poise: 4,
      weight: 2,
      maxRange: 200,
      multiHit: 12,
      telegraph: "roar",
      color: "#65a30d",
      sfxWindup: "roar",
      hitbox: (_t, c) => [aroundBox(c.boss, 170, 130, 0)],
      motion: (ph, _t, c) => {
        if (ph === "windup") face(c);
        halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t % 4 === 0) c.particles(c.boss.x + (c.rng() - 0.5) * 300, 10 + c.rng() * 100, 3, "#65a30d", 1.5, "blob");
      }
    }),
    mkAttack({
      id: "bloom",
      name: "Rot Bloom",
      windup: 30,
      active: 4,
      recovery: 40,
      damage: 6,
      poise: 4,
      weight: 2.5,
      telegraph: "magic",
      color: "#bef264",
      phaseMin: 1,
      sfxWindup: "windup_magic",
      motion: (ph, _t, c) => {
        if (ph === "windup") face(c);
        halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "windup" && t === 6) {
          const n = c.boss.phase >= 2 ? 3 : 2;
          for (let i = 0; i < n; i++) hazard(c, { type: "poison", x: clampToArena(c, c.player.x + (i === 0 ? 0 : (c.rng() - 0.5) * 360), 20), w: 130, h: 30, warn: 36, life: 480, damage: 6, tick: 24, color: "#a3e635" });
        }
      }
    }),
    mkAttack({
      id: "hook",
      name: "Drowning Hook",
      windup: 34,
      active: 12,
      recovery: 40,
      damage: 22,
      poise: 18,
      weight: 2,
      minRange: 140,
      maxRange: 420,
      telegraph: "thrust",
      color: "#d9f99d",
      phaseMin: 1,
      faceLock: true,
      sfxWindup: "windup_thrust",
      hitbox: (_t, c) => [frontBox(c.boss, 190, 60, 20)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 10) face(c);
          halt(c);
        } else if (ph === "active") dash(c, 10);
        else halt(c);
      }
    }),
    mkAttack({
      id: "storm",
      name: "Plague Storm",
      windup: 40,
      active: 70,
      recovery: 40,
      damage: 12,
      poise: 6,
      weight: 2,
      minRange: 120,
      telegraph: "roar",
      color: "#a3e635",
      phaseMin: 2,
      sfxWindup: "roar",
      motion: (ph, _t, c) => {
        if (ph === "windup") face(c);
        chase(c, 1.2, 200);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t % 9 === 0) {
          const tx = c.player.x + (c.rng() - 0.5) * 300;
          const dx = tx - c.boss.x;
          const frames = 45;
          projectile(c, { x: c.boss.x, y: 100, vx: dx / frames, vy: 0.5 * 0.35 * frames - 100 / frames, r: 10, damage: 12, color: "#84cc16", kind: "spit", gravity: -0.35, life: 200, parryable: false });
        }
      }
    })
  ]
};
const EXECUTIONER = {
  id: "executioner",
  name: "The Iron Executioner",
  title: "Headsman of the Silent Court",
  archetype: "Juggernaut",
  icon: "\u{1FA93}",
  hp: 860,
  poiseMax: 150,
  width: 76,
  height: 158,
  speed: 2.2,
  arenaWidth: 900,
  body: "colossus",
  weapon: "greatsword",
  colors: { primary: "#334155", secondary: "#0f172a", accent: "#cbd5e1", glow: "#e11d48" },
  arenaTheme: "crypt",
  unlocksWeapon: "greataxe",
  staggerFrames: 120,
  lore: "The Silent Court passed no sentence it could not carry out that same hour. The Executioner never spoke, never slept, and never missed. When the Court fell silent for good, he simply kept the appointment book.",
  music: { bpm: 104, root: 43, mode: MODES.phrygian, bassPattern: [0, -1, 0, -1, 1, -1, 0, 0], arpPattern: [0, 1, 0, 4, 0, 1, 0, 7] },
  phases: [
    { hpThreshold: 1, speedMult: 1, aggression: 0.45, name: "Sentence", attackIds: ["chop", "guillotine", "shoulder"] },
    { hpThreshold: 0.5, speedMult: 1.18, aggression: 0.7, name: "Verdict", attackIds: ["chop", "guillotine", "shoulder", "cleave", "drag"], announce: "THE VERDICT IS DEATH", tint: "#e11d48" }
  ],
  attacks: [
    mkAttack({
      id: "chop",
      name: "Headsman Chop",
      windup: 34,
      active: 8,
      recovery: 30,
      damage: 30,
      poise: 26,
      weight: 3,
      maxRange: 180,
      telegraph: "slam",
      color: "#fb7185",
      chain: "chop2",
      chainChance: 0.6,
      sfxWindup: "windup_slam",
      sfxActive: "slam",
      hitbox: (_t, c) => [frontBox(c.boss, 165, 100, 0)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 8) face(c);
          dash(c, t > 12 ? 2 : 0);
        } else halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t === 0) {
          c.shake(8);
          c.particles(c.boss.x + c.boss.facing * 120, 4, 12, "#fb7185", 5, "shard");
        }
      }
    }),
    mkAttack({
      id: "chop2",
      name: "Headsman Chop II",
      windup: 26,
      active: 8,
      recovery: 40,
      damage: 32,
      poise: 26,
      weight: 0,
      telegraph: "slam",
      color: "#fb7185",
      unblockable: true,
      sfxWindup: "windup_slam",
      sfxActive: "slam",
      hitbox: (_t, c) => [frontBox(c.boss, 165, 100, 0)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 6) face(c);
          dash(c, 2);
        } else halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t === 0) {
          c.shake(10);
          shockwave(c, 6, 18, "#fb7185");
        }
      }
    }),
    mkAttack({
      id: "guillotine",
      name: "Guillotine",
      windup: 60,
      active: 6,
      recovery: 60,
      damage: 60,
      poise: 50,
      weight: 1.5,
      maxRange: 200,
      unblockable: true,
      telegraph: "slam",
      color: "#e11d48",
      sfxWindup: "windup_slam",
      sfxActive: "slam",
      hyperArmor: true,
      hitbox: (_t, c) => [frontBox(c.boss, 180, 120, 0)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 12) face(c);
          dash(c, t > 24 && t < 50 ? 1.4 : 0);
        } else halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t === 0) {
          c.shake(20);
          c.particles(c.boss.x + c.boss.facing * 120, 4, 30, "#e11d48", 8, "shard");
        }
      }
    }),
    mkAttack({
      id: "shoulder",
      name: "Iron Shoulder",
      windup: 28,
      active: 12,
      recovery: 32,
      damage: 22,
      poise: 30,
      weight: 2.5,
      minRange: 120,
      maxRange: 420,
      telegraph: "pounce",
      color: "#cbd5e1",
      faceLock: true,
      sfxWindup: "windup_pounce",
      hitbox: (_t, c) => [frontBox(c.boss, 90, 120, 0)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 8) face(c);
          halt(c);
        } else if (ph === "active") dash(c, 11);
        else halt(c);
      }
    }),
    mkAttack({
      id: "cleave",
      name: "Court Cleave",
      windup: 40,
      active: 12,
      recovery: 44,
      damage: 34,
      poise: 30,
      weight: 2.5,
      maxRange: 260,
      telegraph: "slash",
      color: "#f43f5e",
      phaseMin: 1,
      sfxWindup: "windup",
      sfxActive: "swoosh_heavy",
      hitbox: (t, c) => [t < 6 ? frontBox(c.boss, 230, 90, 30) : aroundBox(c.boss, 230, 90, 30)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 10) face(c);
          halt(c);
        } else if (ph === "active") dash(c, 1.5);
        else halt(c);
      }
    }),
    mkAttack({
      id: "drag",
      name: "Dragging Blade",
      windup: 36,
      active: 40,
      recovery: 40,
      damage: 20,
      poise: 18,
      weight: 2,
      minRange: 150,
      telegraph: "thrust",
      color: "#fb7185",
      phaseMin: 1,
      multiHit: 14,
      hyperArmor: true,
      sfxWindup: "windup_thrust",
      hitbox: (_t, c) => [frontBox(c.boss, 120, 60, 0)],
      motion: (ph, t, c) => {
        if (ph === "windup") {
          if (t < 10) face(c);
          halt(c);
        } else if (ph === "active") {
          if (t % 14 === 0 && dirToPlayer(c) !== c.boss.facing) halt(c);
          else dash(c, 5);
        } else halt(c);
      },
      onFrame: (ph, t, c) => {
        if (ph === "active" && t % 3 === 0) c.particles(c.boss.x + c.boss.facing * 90, 4, 3, "#fbbf24", 3, "spark");
      }
    })
  ]
};
export {
  COLOSSUS,
  EXECUTIONER,
  PLAGUE_WARDEN
};
