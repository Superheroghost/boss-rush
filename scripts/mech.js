globalThis.window = { addEventListener() {
}, removeEventListener() {
}, setInterval, AudioContext: void 0 };
import { Engine } from "../src/game/engine";
import { defaultModifiers, PLAYER } from "../src/game/data";
function mk() {
  const e = new Engine({ bossId: "fallen_knight", weapon: "longsword", relic: "none", skin: "silver", difficulty: "normal", modifiers: defaultModifiers(), flaskCharges: 3, showHitboxes: false, onEvent: () => {
  } });
  while (e.fightState === "intro") e.update();
  return e;
}
const inp = (e) => e.input;
const press = (e, a) => inp(e).buffer.set(a, inp(e).frame);
const results = {};
function instrument(e) {
  const log = [];
  const orig = e.playerHit.bind(e);
  e.playerHit = (...args) => {
    const r = orig(...args);
    log.push(r);
    return r;
  };
  return log;
}
function forceAttack(e, id, cb, dist = 90) {
  const b = e.bosses[0];
  b.x = e.player.x + dist;
  b.facing = -1;
  b.state = "idle";
  b.currentAttack = null;
  const a = b.def.attacks.find((x) => x.id === id);
  e.startAttack(b, a);
  const w = e.scaledWindup(b, a);
  for (let i = 0; i < 400; i++) {
    if (b.state === "windup") cb(w - b.attackTimer);
    e.update();
    if (b.state !== "windup") return;
  }
}
{
  const e = mk();
  const log = instrument(e);
  let pressed = false;
  forceAttack(e, "combo1", (left) => {
    if (left === 3 && !pressed) {
      inp(e).held.add("block");
      pressed = true;
    }
  });
  for (let i = 0; i < 30; i++) e.update();
  results["parry"] = `${log.join(",")} bossState=${e.bosses[0].state} hp=${e.player.hp}`;
}
{
  const e = mk();
  const log = instrument(e);
  let pressed = false;
  forceAttack(e, "combo1", (left) => {
    if (left === 15 && !pressed) {
      inp(e).held.add("block");
      pressed = true;
    }
  });
  for (let i = 0; i < 20; i++) e.update();
  results["block"] = `${log.join(",")} stamina=${e.player.stamina.toFixed(1)} hp=${e.player.hp}`;
}
{
  const e = mk();
  const log = instrument(e);
  let pressed = false;
  forceAttack(e, "combo1", (left) => {
    if (left === 4 && !pressed) {
      press(e, "dodge");
      pressed = true;
    }
  });
  for (let i = 0; i < 30; i++) e.update();
  results["dodge"] = `${log.join(",") || "no-contact"} hp=${e.player.hp} state=${e.player.state}`;
}
{
  const e = mk();
  const log = instrument(e);
  forceAttack(e, "combo1", () => {
  });
  for (let i = 0; i < 30; i++) e.update();
  results["tank"] = `${log.join(",")} hp=${e.player.hp}`;
}
{
  const e = mk();
  e.player.hp = 20;
  e.bosses[0].x = 2e3;
  press(e, "heal");
  for (let i = 0; i < PLAYER.healFrames + 2; i++) e.update();
  results["flask"] = `hp=${e.player.hp} flask=${e.player.flask}`;
}
{
  const e = mk();
  const b = e.bosses[0];
  b.x = e.player.x + 60;
  b.state = "stagger";
  b.stateTimer = 400;
  const hp0 = b.hp;
  let hits = 0;
  const orig = e.hitBoss.bind(e);
  e.hitBoss = (...a) => {
    hits++;
    return orig(...a);
  };
  for (let i = 0; i < 90; i++) {
    if (i % 8 === 0) press(e, "light");
    e.update();
  }
  results["combo"] = `hits=${hits} dmg=${hp0 - b.hp} combo=${e.player.combo} stamina=${e.player.stamina.toFixed(0)}`;
}
{
  const e = mk();
  const log = instrument(e);
  const b = e.bosses[0];
  b.x = e.player.x + 100;
  inp(e).held.add("block");
  for (let i = 0; i < 5; i++) e.update();
  e.startAttack(b, b.def.attacks.find((a) => a.id === "slam"));
  for (let i = 0; i < 80; i++) e.update();
  results["guardbreak"] = `${log.join(",")} state=${e.player.state} hp=${e.player.hp}`;
}
{
  const e = mk();
  e.bosses[0].x = 2e3;
  press(e, "light");
  for (let i = 0; i < 12; i++) e.update();
  press(e, "dodge");
  let dodged = false;
  for (let i = 0; i < 30; i++) {
    e.update();
    if (e.player.state === "dodge") dodged = true;
  }
  results["buffer"] = `dodgeExecuted=${dodged}`;
}
for (const [k, v] of Object.entries(results)) console.log(k.padEnd(12), v);
