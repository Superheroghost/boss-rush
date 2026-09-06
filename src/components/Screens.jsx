import { useState } from "react";
import { Button, Frame, Panel, Title } from "./ui";
import { BOSSES } from "../game/bosses";
import { BUFFS, DIFFICULTY_INFO, RELICS, WEAPONS } from "../game/data";
import { fmtMs } from "../game/render";
import { audio } from "../game/audio";
function BossSelect({ save, onPick, onBack }) {
  return <Frame>
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
        <Title sub="All 11 bosses unlocked · Practice · Speedrun">Boss Practice</Title>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {BOSSES.map((b, i) => {
    // Every boss is available for practice from the start.
    const unlocked = true;
    return <button
      key={b.id}
      onClick={() => onPick(b.id)}
      onMouseEnter={() => audio.play("ui")}
      className="group relative border border-zinc-800 bg-black/50 p-4 text-left transition hover:border-amber-500/70"
      style={{ boxShadow: unlocked ? `inset 0 -40px 60px -50px ${b.colors.glow}` : void 0 }}
    >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{unlocked ? b.icon : "\u2753"}</span>
                  <span className="font-mono text-[10px] text-zinc-600">#{i + 1}</span>
                </div>
                <div className="mt-2 font-serif text-sm text-zinc-100">{unlocked ? b.name : "Unknown"}</div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">{b.archetype}</div>
                <div className="mt-3 flex justify-between font-mono text-[10px] text-zinc-500">
                  <span className="text-red-400">☠ {save.deaths[b.id] || 0}</span>
                  <span className="text-amber-300">{save.bestTimes[b.id] ? fmtMs(save.bestTimes[b.id]) : "\u2014"}</span>
                </div>
              </button>;
  })}
        </div>
        <div className="mt-8"><Button variant="ghost" onClick={onBack}>← Back</Button></div>
      </div>
    </Frame>;
}
function Victory({ info, onContinue, gauntlet }) {
  return <Frame>
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-10 text-center">
        <p className="font-serif text-xs tracking-[0.6em] uppercase text-amber-500">Prey Slaughtered</p>
        <div className="my-4 text-6xl">{info.boss.icon}</div>
        <h2 className="font-serif text-3xl tracking-[0.2em] uppercase text-amber-100">{info.boss.name}</h2>
        <p className="mt-1 text-sm italic text-zinc-500">{info.boss.title}</p>

        <div className="mt-8 grid w-full grid-cols-2 gap-3 md:grid-cols-4">
          <Panel title="Time"><div className="font-mono text-2xl text-zinc-100">{fmtMs(info.timeMs)}</div>{info.isNewBest && <div className="text-[10px] tracking-widest text-amber-400">NEW BEST</div>}</Panel>
          <Panel title="Best"><div className="font-mono text-2xl text-amber-300">{fmtMs(info.best)}</div></Panel>
          <Panel title="Deaths (this attempt)"><div className="font-mono text-2xl text-red-400">{info.deaths}</div></Panel>
          <Panel title="Deaths (lifetime)"><div className="font-mono text-2xl text-red-300">{info.totalDeaths}</div></Panel>
        </div>

        {info.unlocks.length > 0 && <div className="mt-6 w-full border border-amber-900/50 bg-amber-950/20 p-4">
            <div className="font-serif text-xs tracking-[0.4em] uppercase text-amber-400">Unlocked</div>
            <ul className="mt-2 space-y-1 text-sm text-amber-100">{info.unlocks.map((u, i) => <li key={i}>✦ {u}</li>)}</ul>
          </div>}
        {info.firstKill && <p className="mt-4 max-w-xl font-serif text-sm leading-relaxed text-zinc-400">"{info.boss.lore.split(".")[0]}."</p>}

        <Button variant="primary" className="mt-10 px-12" onClick={onContinue}>{gauntlet ? "Claim your reward \u2192" : "Return"}</Button>
      </div>
    </Frame>;
}
function BuffChoice({ options, onPick }) {
  return <Frame>
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-10">
        <Title sub="Choose one · Lost on death">The Fire Offers</Title>
        <div className="mt-10 grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          {options.map((b) => <button
    key={b.id}
    onClick={() => {
      audio.play("ui_confirm");
      onPick(b);
    }}
    onMouseEnter={() => audio.play("ui")}
    className="group border border-zinc-800 bg-black/50 p-6 text-left transition hover:-translate-y-1 hover:border-amber-500 hover:shadow-[0_0_40px_rgba(245,158,11,0.15)]"
  >
              <div className="mb-3 h-1 w-10 bg-amber-600 transition group-hover:w-full" />
              <div className="font-serif text-lg text-amber-100">{b.name}</div>
              <p className="mt-2 text-sm text-zinc-400">{b.desc}</p>
            </button>)}
        </div>
      </div>
    </Frame>;
}
function RunComplete({ save, runMs, runDeaths, difficulty, onDone }) {
  return <Frame>
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-10 text-center">
        <p className="font-serif text-xs tracking-[0.6em] uppercase text-amber-500">The fire is out</p>
        <h2 className="mt-4 font-serif text-5xl tracking-[0.2em] uppercase text-amber-100 drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]">Gauntlet Complete</h2>
        <p className="mt-3 text-sm text-zinc-400">{DIFFICULTY_INFO[difficulty].name}</p>
        <div className="mt-8 grid w-full grid-cols-3 gap-3">
          <Panel title="Run Time"><div className="font-mono text-2xl text-zinc-100">{fmtMs(runMs)}</div></Panel>
          <Panel title="Best Run"><div className="font-mono text-2xl text-amber-300">{save.bestRun ? fmtMs(save.bestRun) : "\u2014"}</div></Panel>
          <Panel title="Deaths"><div className="font-mono text-2xl text-red-400">{runDeaths}</div></Panel>
        </div>
        <div className="mt-6 w-full border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-100">
          {difficulty === "normal" && <p>✦ New Game+ unlocked · ✦ Voidwalker skin unlocked</p>}
          {difficulty === "ngplus" && <p>✦ Nightmare unlocked · ✦ Gilded Sovereign skin unlocked</p>}
          {difficulty === "nightmare" && <p>✦ There is nothing left to prove. You are the fire now.</p>}
        </div>
        <Button variant="primary" className="mt-10 px-12" onClick={onDone}>Return to the Ash</Button>
      </div>
    </Frame>;
}
function Settings({ save, update, onBack, onReset }) {
  const [confirm, setConfirm] = useState(false);
  const tiers = ["normal", "ngplus", "nightmare"];
  const unlocked = (d) => d === "normal" || d === "ngplus" && save.beatenNormal || d === "nightmare" && save.beatenNGPlus;
  return <Frame>
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        <Title sub="How much do you want to suffer?">Settings</Title>
        <Panel title="Difficulty" className="mt-8">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {tiers.map((d) => <button
    key={d}
    disabled={!unlocked(d)}
    onClick={() => update({ difficulty: d })}
    className={`border p-4 text-left transition ${save.difficulty === d ? "border-amber-500 bg-amber-950/30" : "border-zinc-800 hover:border-zinc-600"} disabled:opacity-40`}
  >
                <div className="font-serif text-base text-zinc-100">{DIFFICULTY_INFO[d].name}</div>
                <p className="mt-1 text-xs text-zinc-400">{DIFFICULTY_INFO[d].desc}</p>
                {!unlocked(d) && <p className="mt-1 text-[10px] text-red-400">{d === "ngplus" ? "Complete the gauntlet" : "Complete New Game+"}</p>}
              </button>)}
          </div>
        </Panel>
        <Panel title="Audio" className="mt-4">
          <label className="flex items-center gap-4 text-xs text-zinc-400">
            <span className="w-16">SFX</span>
            <input type="range" min={0} max={1} step={0.05} value={save.sfxVolume} onChange={(e) => {
    update({ sfxVolume: +e.target.value });
    audio.setVolumes(+e.target.value, save.musicVolume);
  }} className="flex-1 accent-amber-500" />
          </label>
          <label className="mt-3 flex items-center gap-4 text-xs text-zinc-400">
            <span className="w-16">Music</span>
            <input type="range" min={0} max={1} step={0.05} value={save.musicVolume} onChange={(e) => {
    update({ musicVolume: +e.target.value });
    audio.setVolumes(save.sfxVolume, +e.target.value);
  }} className="flex-1 accent-amber-500" />
          </label>
        </Panel>
        <Panel title="Debug" className="mt-4">
          <label className="flex items-center gap-3 text-xs text-zinc-400">
            <input type="checkbox" checked={save.showHitboxes} onChange={(e) => update({ showHitboxes: e.target.checked })} className="accent-amber-500" />
            Show hitboxes / hurtboxes by default (toggle in-game with H)
          </label>
        </Panel>
        <Panel title="Loadout" className="mt-4">
          <p className="text-xs text-zinc-400">Weapon: <span className="text-zinc-200">{WEAPONS[save.equippedWeapon].name}</span> · Relic: <span className="text-zinc-200">{RELICS.find((r) => r.id === save.equippedRelic)?.name}</span></p>
        </Panel>
        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>← Back</Button>
          {!confirm ? <Button variant="danger" onClick={() => setConfirm(true)}>Erase Save</Button> : <div className="flex gap-2"><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={onReset}>Confirm Erase</Button></div>}
        </div>
      </div>
    </Frame>;
}
function pickBuffs(exclude, n = 3) {
  const pool = BUFFS.filter((b) => !exclude.includes(b.id) || b.id === "dmg" || b.id === "hp");
  const out = [];
  const copy = [...pool];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}
export {
  BossSelect,
  BuffChoice,
  RunComplete,
  Settings,
  Victory,
  pickBuffs
};
