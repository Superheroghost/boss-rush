// Procedural audio: synthesized SFX and a layered per-boss music sequencer.

type MusicTheme = { bpm: number; root: number; mode: number[]; bassPattern: number[]; arpPattern: number[] };

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxGain!: GainNode;
  musicGain!: GainNode;
  noiseBuffer!: AudioBuffer;
  private musicTimer: number | null = null;
  private theme: MusicTheme | null = null;
  private step = 0;
  private nextStepTime = 0;
  intensity = 0; // 0 = calm/hub, 1 = phase1, 2 = phase2, 3 = phase3
  private sfxVol = 0.7;
  private musicVol = 0.5;
  private lastSfx: Record<string, number> = {};

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVol;
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVol;
    this.musicGain.connect(this.master);
    const len = this.ctx.sampleRate * 1.5;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolumes(sfx: number, music: number) {
    this.sfxVol = sfx;
    this.musicVol = music;
    if (this.ctx) {
      this.sfxGain.gain.value = sfx;
      this.musicGain.gain.value = music;
    }
  }

  // ---------- SFX primitives ----------
  private noise(dur: number, opts: { type?: BiquadFilterType; f0: number; f1?: number; q?: number; vol?: number; attack?: number }) {
    if (!this.ctx) return;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filt = c.createBiquadFilter();
    filt.type = opts.type || 'bandpass';
    filt.frequency.setValueAtTime(opts.f0, c.currentTime);
    if (opts.f1 !== undefined) filt.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), c.currentTime + dur);
    filt.Q.value = opts.q ?? 1;
    const g = c.createGain();
    const v = opts.vol ?? 0.5;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.linearRampToValueAtTime(v, c.currentTime + (opts.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(filt).connect(g).connect(this.sfxGain);
    src.start();
    src.stop(c.currentTime + dur + 0.05);
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; f1?: number; vol?: number; attack?: number; dest?: GainNode; detune?: number } = {}) {
    if (!this.ctx) return;
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (opts.detune) o.detune.value = opts.detune;
    if (opts.f1 !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.f1), c.currentTime + dur);
    const g = c.createGain();
    const v = opts.vol ?? 0.3;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.linearRampToValueAtTime(v, c.currentTime + (opts.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(opts.dest || this.sfxGain);
    o.start();
    o.stop(c.currentTime + dur + 0.05);
  }

  play(name: string) {
    if (!this.ctx) return;
    const now = performance.now();
    // throttle identical sfx
    if (this.lastSfx[name] && now - this.lastSfx[name] < 40) return;
    this.lastSfx[name] = now;
    switch (name) {
      case 'swoosh': // light slash
        this.noise(0.14, { f0: 900, f1: 2800, q: 1.2, vol: 0.35 });
        break;
      case 'swoosh_heavy':
        this.noise(0.32, { f0: 300, f1: 1800, q: 1.0, vol: 0.55 });
        break;
      case 'windup': // boss telegraph rising
        this.tone(180, 0.35, { type: 'sawtooth', f1: 420, vol: 0.12 });
        this.noise(0.35, { f0: 400, f1: 1200, q: 2, vol: 0.15 });
        break;
      case 'windup_slam':
        this.tone(90, 0.6, { type: 'sawtooth', f1: 60, vol: 0.18 });
        this.noise(0.5, { f0: 200, f1: 100, q: 2, vol: 0.2, attack: 0.2 });
        break;
      case 'windup_thrust':
        this.tone(500, 0.3, { type: 'square', f1: 1000, vol: 0.08 });
        break;
      case 'windup_magic':
        this.tone(660, 0.5, { type: 'sine', f1: 1320, vol: 0.15 });
        this.tone(990, 0.5, { type: 'triangle', f1: 1980, vol: 0.08 });
        break;
      case 'windup_spin':
        this.noise(0.5, { f0: 500, f1: 2000, q: 3, vol: 0.2, attack: 0.3 });
        break;
      case 'windup_shoot':
        this.noise(0.3, { type: 'highpass', f0: 2000, vol: 0.15 });
        this.tone(1200, 0.3, { type: 'triangle', f1: 1800, vol: 0.06 });
        break;
      case 'windup_pounce':
        this.tone(120, 0.3, { type: 'sawtooth', f1: 260, vol: 0.15 });
        break;
      case 'roar':
        this.noise(0.8, { f0: 150, f1: 500, q: 0.8, vol: 0.5, attack: 0.05 });
        this.tone(70, 0.8, { type: 'sawtooth', f1: 110, vol: 0.25 });
        break;
      case 'slam':
        this.noise(0.4, { type: 'lowpass', f0: 500, f1: 60, vol: 0.9 });
        this.tone(80, 0.5, { type: 'sine', f1: 30, vol: 0.6 });
        break;
      case 'thud': // blunt hit
        this.noise(0.18, { type: 'lowpass', f0: 600, f1: 100, vol: 0.6 });
        this.tone(140, 0.2, { type: 'sine', f1: 50, vol: 0.4 });
        break;
      case 'hit': // player lands a hit
        this.noise(0.12, { f0: 1500, f1: 600, q: 1, vol: 0.5 });
        this.tone(220, 0.1, { type: 'square', f1: 110, vol: 0.12 });
        break;
      case 'hit_heavy':
        this.noise(0.25, { f0: 800, f1: 200, q: 1, vol: 0.8 });
        this.tone(120, 0.25, { type: 'square', f1: 40, vol: 0.25 });
        break;
      case 'hurt': // player takes damage
        this.noise(0.25, { type: 'lowpass', f0: 900, f1: 200, vol: 0.7 });
        this.tone(200, 0.25, { type: 'sawtooth', f1: 80, vol: 0.2 });
        break;
      case 'parry':
        this.tone(2400, 0.35, { type: 'square', f1: 1800, vol: 0.18 });
        this.tone(3600, 0.25, { type: 'sine', f1: 3000, vol: 0.2 });
        this.noise(0.2, { type: 'highpass', f0: 4000, vol: 0.5 });
        break;
      case 'block':
        this.tone(900, 0.12, { type: 'square', f1: 500, vol: 0.12 });
        this.noise(0.1, { f0: 2000, f1: 1000, vol: 0.3 });
        break;
      case 'guardbreak':
        this.tone(600, 0.4, { type: 'sawtooth', f1: 100, vol: 0.25 });
        this.noise(0.3, { f0: 1500, f1: 300, vol: 0.5 });
        break;
      case 'dodge':
        this.noise(0.18, { type: 'highpass', f0: 800, f1: 300, vol: 0.18 });
        break;
      case 'perfect':
        this.tone(1500, 0.15, { type: 'sine', f1: 2500, vol: 0.1 });
        break;
      case 'heal':
        this.tone(440, 0.6, { type: 'sine', f1: 880, vol: 0.15 });
        this.tone(660, 0.6, { type: 'triangle', f1: 1320, vol: 0.08 });
        break;
      case 'drink':
        this.noise(0.5, { type: 'lowpass', f0: 800, f1: 300, vol: 0.15, attack: 0.1 });
        break;
      case 'stagger':
        this.tone(300, 0.6, { type: 'sawtooth', f1: 60, vol: 0.3 });
        this.noise(0.5, { f0: 700, f1: 100, vol: 0.5 });
        break;
      case 'crackle':
        for (let i = 0; i < 4; i++) setTimeout(() => this.noise(0.05, { type: 'highpass', f0: 3000, vol: 0.3 }), i * 40);
        this.noise(0.4, { f0: 400, f1: 900, q: 0.7, vol: 0.25 });
        break;
      case 'magic':
        this.tone(880, 0.3, { type: 'sine', f1: 440, vol: 0.15 });
        this.tone(1320, 0.3, { type: 'triangle', f1: 660, vol: 0.08 });
        break;
      case 'teleport':
        this.tone(200, 0.3, { type: 'sine', f1: 2000, vol: 0.12 });
        this.noise(0.3, { type: 'highpass', f0: 1500, f1: 6000, vol: 0.2 });
        break;
      case 'arrow':
        this.noise(0.15, { type: 'highpass', f0: 3000, f1: 1000, vol: 0.3 });
        this.tone(1800, 0.08, { type: 'triangle', f1: 800, vol: 0.06 });
        break;
      case 'thunder':
        this.noise(0.6, { type: 'lowpass', f0: 2000, f1: 100, vol: 1.0 });
        this.tone(60, 0.6, { type: 'sawtooth', f1: 30, vol: 0.3 });
        break;
      case 'bite':
        this.noise(0.1, { f0: 1200, f1: 400, q: 2, vol: 0.5 });
        this.tone(300, 0.1, { type: 'square', f1: 100, vol: 0.15 });
        break;
      case 'phase':
        this.tone(110, 1.5, { type: 'sawtooth', f1: 55, vol: 0.3 });
        this.tone(220, 1.5, { type: 'sine', f1: 110, vol: 0.2 });
        this.noise(1.2, { type: 'lowpass', f0: 3000, f1: 100, vol: 0.6, attack: 0.05 });
        break;
      case 'death_boss':
        this.tone(220, 2.0, { type: 'sawtooth', f1: 40, vol: 0.3 });
        this.noise(1.5, { type: 'lowpass', f0: 2000, f1: 80, vol: 0.7 });
        break;
      case 'death_player':
        this.tone(330, 1.2, { type: 'sine', f1: 60, vol: 0.3 });
        this.noise(0.8, { type: 'lowpass', f0: 600, f1: 80, vol: 0.5 });
        break;
      case 'victory':
        [0, 4, 7, 12].forEach((s, i) => setTimeout(() => this.tone(440 * Math.pow(2, s / 12), 0.6, { type: 'triangle', vol: 0.18 }), i * 120));
        break;
      case 'ui':
        this.tone(800, 0.08, { type: 'square', vol: 0.06 });
        break;
      case 'ui_confirm':
        this.tone(600, 0.12, { type: 'triangle', f1: 1200, vol: 0.1 });
        break;
      case 'bleed':
        this.noise(0.3, { f0: 500, f1: 150, q: 1, vol: 0.7 });
        this.tone(180, 0.3, { type: 'sawtooth', f1: 60, vol: 0.25 });
        break;
      case 'debris':
        this.noise(0.3, { type: 'lowpass', f0: 800, f1: 100, vol: 0.6 });
        break;
      case 'poison':
        this.noise(0.4, { f0: 300, f1: 200, q: 3, vol: 0.2 });
        break;
      case 'campfire':
        this.noise(0.08, { type: 'highpass', f0: 2500, vol: 0.05 });
        break;
      default:
        break;
    }
  }

  // ---------- Music ----------
  startMusic(theme: MusicTheme, intensity = 1) {
    this.init();
    this.theme = theme;
    this.intensity = intensity;
    this.step = 0;
    if (this.musicTimer !== null) return;
    if (!this.ctx) return;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.schedule(), 40);
  }

  setIntensity(i: number) {
    this.intensity = i;
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.theme = null;
  }

  private midi(n: number) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  private schedule() {
    if (!this.ctx || !this.theme) return;
    const c = this.ctx;
    const stepDur = 60 / this.theme.bpm / 4; // 16th notes
    while (this.nextStepTime < c.currentTime + 0.15) {
      this.playStep(this.step, this.nextStepTime, stepDur);
      this.step = (this.step + 1) % 64;
      this.nextStepTime += stepDur;
    }
  }

  private noteAt(t: number, freq: number, dur: number, type: OscillatorType, vol: number, filterF?: number, detune = 0) {
    if (!this.ctx) return;
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (filterF) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterF;
      o.connect(f).connect(g).connect(this.musicGain);
    } else {
      o.connect(g).connect(this.musicGain);
    }
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private drumAt(t: number, kind: 'kick' | 'snare' | 'hat') {
    if (!this.ctx) return;
    const c = this.ctx;
    if (kind === 'kick') {
      const o = c.createOscillator();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      const g = c.createGain();
      g.gain.setValueAtTime(0.7, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g).connect(this.musicGain);
      o.start(t);
      o.stop(t + 0.3);
    } else {
      const src = c.createBufferSource();
      src.buffer = this.noiseBuffer;
      const f = c.createBiquadFilter();
      f.type = kind === 'snare' ? 'bandpass' : 'highpass';
      f.frequency.value = kind === 'snare' ? 1800 : 7000;
      const g = c.createGain();
      g.gain.setValueAtTime(kind === 'snare' ? 0.35 : 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'snare' ? 0.15 : 0.05));
      src.connect(f).connect(g).connect(this.musicGain);
      src.start(t);
      src.stop(t + 0.2);
    }
  }

  private playStep(step: number, t: number, stepDur: number) {
    const th = this.theme!;
    const s16 = step % 16;
    const bar = Math.floor(step / 16);
    const mode = th.mode;
    const deg = (i: number) => {
      const oct = Math.floor(i / mode.length);
      return th.root + mode[((i % mode.length) + mode.length) % mode.length] + oct * 12;
    };
    const lvl = this.intensity;
    // Layer 0: drone (always)
    if (s16 === 0) {
      this.noteAt(t, this.midi(th.root - 12), stepDur * 16, 'sawtooth', 0.06, 300);
      this.noteAt(t, this.midi(th.root - 12), stepDur * 16, 'sawtooth', 0.05, 300, 8);
    }
    // Layer 1: bass pattern
    if (lvl >= 1) {
      const b = th.bassPattern[s16 % th.bassPattern.length];
      if (b >= 0 && s16 % 2 === 0) this.noteAt(t, this.midi(deg(b) - 12), stepDur * 1.8, 'square', 0.07, 500);
      // arp
      const a = th.arpPattern[(step + bar * 3) % th.arpPattern.length];
      if (a >= 0 && (lvl >= 2 || s16 % 2 === 0)) this.noteAt(t, this.midi(deg(a) + 12), stepDur * 1.2, 'triangle', 0.07);
    }
    // Layer 2: drums
    if (lvl >= 2) {
      if (s16 % 4 === 0 || (s16 === 10 && lvl >= 3)) this.drumAt(t, 'kick');
      if (s16 === 4 || s16 === 12) this.drumAt(t, 'snare');
      if (s16 % 2 === 1) this.drumAt(t, 'hat');
    }
    // Layer 3: choir pads + faster arps
    if (lvl >= 3) {
      if (s16 === 0 || s16 === 8) {
        const chord = bar % 2 === 0 ? [0, 2, 4] : [5, 7, 9];
        chord.forEach((d, i) => {
          this.noteAt(t, this.midi(deg(d)), stepDur * 8, 'sawtooth', 0.035, 900, i * 6 - 6);
          this.noteAt(t, this.midi(deg(d)), stepDur * 8, 'sine', 0.05, undefined, -i * 5);
        });
      }
      if (s16 % 2 === 1) this.noteAt(t, this.midi(deg(th.arpPattern[step % th.arpPattern.length] + 7) + 12), stepDur, 'triangle', 0.04);
    }
    // Hub ambience: sparse
    if (lvl === 0 && s16 === 8 && bar % 2 === 1) {
      this.noteAt(t, this.midi(deg(4)), stepDur * 6, 'sine', 0.06);
    }
  }
}

export const audio = new AudioEngine();
