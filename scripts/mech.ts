(globalThis as any).window = { addEventListener() {}, removeEventListener() {}, setInterval: setInterval, AudioContext: undefined };
import { Engine } from '../src/game/engine';
import { defaultModifiers, PLAYER } from '../src/game/data';

function mk() {
  const e = new Engine({ bossId: 'fallen_knight', weapon: 'longsword', relic: 'none', skin: 'silver', difficulty: 'normal', modifiers: defaultModifiers(), flaskCharges: 3, showHitboxes: false, onEvent: () => {} });
  // skip intro
  while (e.fightState === 'intro') e.update();
  return e;
}
const inp = (e: Engine) => e.input as any;
const press = (e: Engine, a: string) => inp(e).buffer.set(a, inp(e).frame);
const results: Record<string, string> = {};

// Instrument playerHit
function instrument(e: Engine) {
  const log: string[] = [];
  const orig = (e as any).playerHit.bind(e);
  (e as any).playerHit = (...args: any[]) => { const r = orig(...args); log.push(r); return r; };
  return log;
}

// Force a specific attack and call cb with frames left until active during windup
function forceAttack(e: Engine, id: string, cb: (left: number) => void, dist = 90) {
  const b = e.bosses[0];
  b.x = e.player.x + dist; b.facing = -1; b.state = 'idle'; b.currentAttack = null;
  const a = b.def.attacks.find((x: any) => x.id === id)!;
  (e as any).startAttack(b, a);
  const w = (e as any).scaledWindup(b, a);
  for (let i = 0; i < 400; i++) {
    if (b.state === 'windup') cb(w - b.attackTimer);
    e.update();
    if (b.state !== 'windup') return;
  }
}
// TEST 1: parry — press block 3 frames before active
{
  const e = mk();
  const log = instrument(e);
  let pressed = false;
  forceAttack(e, 'combo1', (left) => { if (left === 3 && !pressed) { inp(e).held.add('block'); pressed = true; } });
  for (let i = 0; i < 30; i++) e.update();
  results['parry'] = `${log.join(',')} bossState=${e.bosses[0].state} hp=${e.player.hp}`;
}
// TEST 2: late block (held long before) — should be blocked, stamina reduced
{
  const e = mk();
  const log = instrument(e);
  let pressed = false;
  forceAttack(e, 'combo1', (left) => { if (left === 15 && !pressed) { inp(e).held.add('block'); pressed = true; } });
  for (let i = 0; i < 20; i++) e.update();
  results['block'] = `${log.join(',')} stamina=${e.player.stamina.toFixed(1)} hp=${e.player.hp}`;
}
// TEST 3: dodge — roll 4 frames before active
{
  const e = mk();
  const log = instrument(e);
  let pressed = false;
  forceAttack(e, 'combo1', (left) => { if (left === 4 && !pressed) { press(e, 'dodge'); pressed = true; } });
  for (let i = 0; i < 30; i++) e.update();
  results['dodge'] = `${log.join(',') || 'no-contact'} hp=${e.player.hp} state=${e.player.state}`;
}
// TEST 4: no reaction — should be hit
{
  const e = mk();
  const log = instrument(e);
  forceAttack(e, 'combo1', () => {});
  for (let i = 0; i < 30; i++) e.update();
  results['tank'] = `${log.join(',')} hp=${e.player.hp}`;
}
// TEST 5: flask heals
{
  const e = mk();
  e.player.hp = 20;
  e.bosses[0].x = 2000; // far away (clamped but away)
  press(e, 'heal');
  for (let i = 0; i < PLAYER.healFrames + 2; i++) e.update();
  results['flask'] = `hp=${e.player.hp} flask=${e.player.flask}`;
}
// TEST 6: light combo chain
{
  const e = mk();
  const b = e.bosses[0];
  b.x = e.player.x + 60; b.state = 'stagger'; b.stateTimer = 400;
  const hp0 = b.hp;
  let hits = 0;
  const orig = e.hitBoss.bind(e);
  e.hitBoss = (...a: any[]) => { hits++; return (orig as any)(...a); };
  for (let i = 0; i < 90; i++) { if (i % 8 === 0) press(e, 'light'); e.update(); }
  results['combo'] = `hits=${hits} dmg=${hp0 - b.hp} combo=${e.player.combo} stamina=${e.player.stamina.toFixed(0)}`;
}
// TEST 7: guard break on unblockable slam
{
  const e = mk();
  const log = instrument(e);
  const b = e.bosses[0];
  b.x = e.player.x + 100;
  inp(e).held.add('block');
  for (let i = 0; i < 5; i++) e.update();
  // force slam
  (e as any).startAttack(b, b.def.attacks.find((a: any) => a.id === 'slam'));
  for (let i = 0; i < 80; i++) e.update();
  results['guardbreak'] = `${log.join(',')} state=${e.player.state} hp=${e.player.hp}`;
}
// TEST 8: input buffer — dodge pressed during attack recovery executes after
{
  const e = mk();
  e.bosses[0].x = 2000;
  press(e, 'light');
  for (let i = 0; i < 12; i++) e.update();
  press(e, 'dodge');
  let dodged = false;
  for (let i = 0; i < 30; i++) { e.update(); if (e.player.state === 'dodge') dodged = true; }
  results['buffer'] = `dodgeExecuted=${dodged}`;
}
for (const [k, v] of Object.entries(results)) console.log(k.padEnd(12), v);
