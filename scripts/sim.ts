// Headless simulation: runs every boss through all phases with a scripted player to catch runtime errors.
(globalThis as any).window = { addEventListener() {}, removeEventListener() {}, setInterval: setInterval, AudioContext: undefined };
(globalThis as any).performance = globalThis.performance || { now: () => Date.now() };

import { Engine } from '../src/game/engine';
import { BOSSES } from '../src/game/bosses';
import { defaultModifiers } from '../src/game/data';

let failures = 0;
for (const def of BOSSES) {
  const events: string[] = [];
  const eng = new Engine({
    bossId: def.id, weapon: 'longsword', relic: 'none', skin: 'silver', difficulty: 'normal', modifiers: defaultModifiers(), flaskCharges: 3, showHitboxes: false,
    onEvent: (e) => events.push(e.type),
  });
  const attacksSeen = new Set<string>();
  let maxPhase = 0;
  let playerHits = 0, bossHitsLanded = 0, parries = 0, blocks = 0;
  const inp = eng.input as any;
  let frames = 0;
  try {
    // Phase A: godmode + auto-attack to push boss through all phases and exercise every attack
    for (frames = 0; frames < 60 * 240; frames++) {
      eng.player.iframes = 2; // godmode-ish (dodge check uses iframes>0)
      eng.player.hp = eng.player.maxHp;
      const nb = eng.nearestBoss();
      if (nb) {
        const d = nb.x - eng.player.x;
        if (Math.abs(d) > 70) { inp.held.add(d > 0 ? 'right' : 'left'); inp.held.delete(d > 0 ? 'left' : 'right'); }
        else { inp.held.delete('left'); inp.held.delete('right'); if (frames % 20 === 0) inp.buffer.set('light', inp.frame); if (frames % 90 === 0) inp.buffer.set('heavy', inp.frame); }
      }
      eng.update();
      for (const b of eng.bosses) { if (b.currentAttack) attacksSeen.add(b.currentAttack.id); maxPhase = Math.max(maxPhase, b.phase); }
      if (eng.fightState === 'victory' && eng.victoryTimer > 120) break;
    }
    const hpLeft = eng.bosses.map((b) => Math.round(b.hp)).join('/');
    // Phase B: realistic run — no godmode, random dodge/block, count outcomes
    eng.restart();
    const origHit = (eng as any).playerHit.bind(eng);
    (eng as any).playerHit = (...args: any[]) => { const r = origHit(...args); if (r === 'hit') bossHitsLanded++; if (r === 'parried') parries++; if (r === 'blocked') blocks++; return r; };
    const origHitBoss = eng.hitBoss.bind(eng);
    eng.hitBoss = (...args: any[]) => { playerHits++; return (origHitBoss as any)(...args); };
    let deaths = 0;
    for (let f = 0; f < 60 * 120; f++) {
      const nb = eng.nearestBoss();
      if (nb && eng.fightState === 'fight') {
        const d = nb.x - eng.player.x;
        if (Math.abs(d) > 80) { inp.held.add(d > 0 ? 'right' : 'left'); inp.held.delete(d > 0 ? 'left' : 'right'); }
        else { inp.held.delete('left'); inp.held.delete('right'); if (f % 25 === 0) inp.buffer.set('light', inp.frame); }
        if (nb.state === 'windup' && nb.glow > 0.7 && Math.random() < 0.3) inp.buffer.set('dodge', inp.frame);
        if (nb.state === 'windup' && nb.glow > 0.85 && Math.random() < 0.2) inp.held.add('block'); else if (Math.random() < 0.1) inp.held.delete('block');
        if (eng.player.hp < 40 && Math.random() < 0.05) inp.buffer.set('heal', inp.frame);
      }
      eng.update();
      if (eng.fightState === 'dead') { deaths++; eng.restart(); }
      if (eng.fightState === 'victory') break;
    }
    const unseen = def.attacks.map((a) => a.id).filter((id) => !attacksSeen.has(id));
    const compUnseen = (def.companions || []).flatMap((c) => c.attacks.map((a) => a.id)).filter((id) => !attacksSeen.has(id));
    console.log(`${def.id.padEnd(14)} phases:${maxPhase + 1}/${def.phases.length} hp:${hpLeft} frames:${frames} events:${events.join(',')} | realistic: pHits=${playerHits} bossHits=${bossHitsLanded} parries=${parries} blocks=${blocks} deaths=${deaths} | unseen:${[...unseen, ...compUnseen].join(',') || 'none'}`);
    if (maxPhase + 1 < def.phases.length) { console.log('   !! did not reach final phase'); }
  } catch (err) {
    failures++;
    console.error(`!! ${def.id} crashed at frame ${frames}:`, err);
  }
}
console.log(failures ? `FAILURES: ${failures}` : 'ALL OK');
