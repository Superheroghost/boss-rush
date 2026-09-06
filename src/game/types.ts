// Core shared types for the boss-rush engine.
// World coordinates: x = horizontal, y = height above ground (0 = ground, up is positive).

export interface Rect {
  x: number; // left
  y: number; // bottom
  w: number;
  h: number;
}

export type Difficulty = 'normal' | 'ngplus' | 'nightmare';

export type WeaponId = 'longsword' | 'katana' | 'greataxe' | 'spear';
export type RelicId = 'none' | 'ember' | 'swift' | 'quickdraw' | 'ironheart' | 'mirror' | 'wolffang' | 'gravewalker';
export type SkinId = 'silver' | 'crimson' | 'void' | 'gilded';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  desc: string;
  lightDmg: number[]; // per combo hit
  lightWindup: number;
  lightActive: number;
  lightRecovery: number;
  lightStamina: number;
  lightPoise: number;
  heavyDmg: number;
  heavyWindup: number;
  heavyActive: number;
  heavyRecovery: number;
  heavyStamina: number;
  heavyPoise: number;
  reach: number; // horizontal reach of hitbox
  hyperArmor: boolean; // heavy attack cannot be interrupted
  bleed: number; // bleed buildup per hit
  color: string;
}

export interface RelicDef {
  id: RelicId;
  name: string;
  desc: string;
  unlockBoss: string | null; // boss id that unlocks it
}

export interface BuffDef {
  id: string;
  name: string;
  desc: string;
  apply: (m: RunModifiers) => void;
}

export interface RunModifiers {
  iframesBonus: number;
  parryBonus: number;
  heavyHealPct: number;
  flaskMult: number;
  staminaRegenMult: number;
  damageMult: number;
  maxHpBonus: number;
  dodgeCostMult: number;
  perfectDodgeStamina: number;
  poiseMult: number;
  riposteMult: number;
  flaskBonus: number;
  lightSpeedMult: number;
  bleedMult: number;
}

export type PlayerState =
  | 'idle'
  | 'run'
  | 'light'
  | 'heavy'
  | 'dodge'
  | 'block'
  | 'heal'
  | 'hitstun'
  | 'guardbreak'
  | 'dead';

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  damage: number;
  poise: number;
  life: number;
  color: string;
  gravity: number;
  owner: 'boss' | 'player';
  parryable: boolean;
  kind: 'arrow' | 'orb' | 'shock' | 'bolt' | 'spit';
  homing?: number;
  hit?: boolean;
  trail?: boolean;
  groundHazard?: HazardType; // spawns a hazard when it touches the ground
}

export type HazardType = 'fire' | 'poison' | 'debris' | 'pillar' | 'lightning' | 'crumble';

export interface Hazard {
  type: HazardType;
  x: number; // center
  w: number;
  h: number;
  warn: number; // frames of warning remaining before active
  life: number; // active frames
  damage: number;
  tick: number; // damage tick interval (for zones), 0 = single hit
  hit: boolean;
  color: string;
  poise: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  shape: 'spark' | 'blob' | 'ring' | 'shard' | 'text';
  text?: string;
  fade?: boolean;
}

export type BossPose = 'idle' | 'move' | 'windup' | 'active' | 'recovery' | 'stagger' | 'dead' | 'transition' | 'parried';

export type BodyType = 'knight' | 'colossus' | 'archer' | 'beast' | 'mage' | 'drake' | 'warden' | 'king';
export type WeaponVisual = 'sword' | 'greatsword' | 'hammer' | 'bow' | 'staff' | 'scythe' | 'claws' | 'mace' | 'none';
export type Telegraph = 'slash' | 'slam' | 'thrust' | 'magic' | 'spin' | 'shoot' | 'pounce' | 'roar' | 'teleport';

export interface AttackCtx {
  player: PlayerLike;
  boss: BossEntity;
  spawnProjectile: (p: Projectile) => void;
  spawnHazard: (h: Hazard) => void;
  particles: (x: number, y: number, n: number, color: string, speed?: number, shape?: Particle['shape']) => void;
  shake: (n: number) => void;
  sfx: (name: string) => void;
  arena: { left: number; right: number; width: number };
  rng: () => number;
  frame: number;
  difficulty: Difficulty;
  allBosses: BossEntity[];
}

export interface PlayerLike {
  x: number;
  y: number;
  facing: 1 | -1;
  hurtbox: Rect;
  hp: number;
}

export type AttackPhase = 'windup' | 'active' | 'recovery';

export interface AttackDef {
  id: string;
  name: string;
  windup: number;
  active: number;
  recovery: number;
  damage: number;
  poise: number; // poise damage to player (unused mostly) / stagger power
  weight: number;
  minRange: number;
  maxRange: number;
  unblockable?: boolean;
  telegraph: Telegraph;
  color?: string; // telegraph glow color
  multiHit?: number; // rehit interval frames during active
  hitbox?: (t: number, ctx: AttackCtx) => Rect[];
  motion?: (phase: AttackPhase, t: number, ctx: AttackCtx) => void;
  onFrame?: (phase: AttackPhase, t: number, ctx: AttackCtx) => void;
  chain?: string; // attack id to chain into after recovery
  chainChance?: number; // 0-1 (default 1)
  phaseMin?: number; // min phase index (0-based) to use
  ngplusOnly?: boolean;
  faceLock?: boolean; // do not turn during windup
  hyperArmor?: boolean; // cannot be poise-broken during
  sfxWindup?: string;
  sfxActive?: string;
  cancelOnParry?: boolean;
}

export interface PhaseDef {
  hpThreshold: number; // enters this phase when hp fraction <= threshold (phase 0 => 1)
  speedMult: number; // multiplies windup duration inverse (>1 faster)
  aggression: number; // 0-1 shorter idle
  name: string;
  attackIds: string[];
  announce?: string;
  tint?: string;
}

export interface BossDef {
  id: string;
  name: string;
  title: string;
  archetype: string;
  icon: string;
  hp: number;
  poiseMax: number;
  width: number;
  height: number;
  speed: number;
  arenaWidth: number;
  body: BodyType;
  weapon: WeaponVisual;
  colors: { primary: string; secondary: string; accent: string; glow: string };
  phases: PhaseDef[];
  attacks: AttackDef[];
  lore: string;
  music: { bpm: number; root: number; mode: number[]; bassPattern: number[]; arpPattern: number[] };
  keepDistance?: number; // ranger-style: retreat if player closer
  flying?: boolean;
  hoverHeight?: number;
  companions?: BossDef[]; // for duo fights
  unlocksWeapon?: WeaponId;
  unlocksRelic?: RelicId;
  arenaTheme: 'crypt' | 'ruins' | 'forest' | 'cathedral' | 'swamp' | 'peak' | 'throne' | 'library';
  staggerFrames?: number;
  onDeathSummon?: boolean;
  arenaHazardsOnPhase?: number; // phase index where crumbling edges appear
}

export type BossState =
  | 'idle'
  | 'approach'
  | 'windup'
  | 'active'
  | 'recovery'
  | 'stagger'
  | 'parried'
  | 'transition'
  | 'dead';

export interface BossEntity {
  def: BossDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  poise: number;
  state: BossState;
  stateTimer: number;
  phase: number;
  currentAttack: AttackDef | null;
  attackTimer: number; // frames into current attack phase
  attackHits: number; // number of hits landed with this attack instance
  lastHitFrame: number;
  hitDone: boolean;
  idleFrames: number;
  approachFrames: number;
  bleed: number;
  bleedMax: number;
  parriedTimer: number; // riposte window
  transitionTimer: number;
  isCompanion: boolean;
  index: number;
  lastAttackId: string;
  targetRange: [number, number];
  glow: number;
  hurtFlash: number;
  data: Record<string, number>; // scratch data per attack
  deadTimer: number;
  hitsTaken: number;
}

export interface FightResult {
  bossId: string;
  won: boolean;
  timeMs: number;
  deaths: number;
}
