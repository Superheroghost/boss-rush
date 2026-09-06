import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Menu from "./components/Menu";
import Hub from "./components/Hub";
import GameView from "./components/GameView";
import { BossSelect, BuffChoice, RunComplete, Settings, Victory, pickBuffs } from "./components/Screens";
import { loadSave, writeSave, resetSave } from "./game/save";
import { BOSSES, BOSS_MAP } from "./game/bosses";
import { PLAYER, RELICS, SKINS, WEAPONS, defaultModifiers } from "./game/data";
import { audio } from "./game/audio";
function App() {
  const [save, setSave] = useState(() => loadSave());
  const [screen, setScreen] = useState("menu");
  const [mode, setMode] = useState("single");
  const [run, setRun] = useState(null);
  const [fightBoss, setFightBoss] = useState(BOSSES[0].id);
  const [victory, setVictory] = useState(null);
  const [buffOptions, setBuffOptions] = useState([]);
  const [fightKey, setFightKey] = useState(0);
  const engineRef = useRef(null);
  const runRef = useRef(null);
  runRef.current = run;
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    writeSave(save);
  }, [save]);
  useEffect(() => {
    audio.setVolumes(save.sfxVolume, save.musicVolume);
  }, [save.sfxVolume, save.musicVolume]);
  const update = useCallback((patch) => setSave((s) => ({ ...s, ...patch })), []);
  const startGauntlet = () => {
    const r = { index: 0, flask: PLAYER.flaskMax, buffs: [], modifiers: defaultModifiers(), runMs: 0, runDeaths: 0 };
    setRun(r);
    setMode("gauntlet");
    setFightBoss(BOSSES[0].id);
    setFightKey((k) => k + 1);
    setScreen("fight");
  };
  const startSingle = (id) => {
    setMode("single");
    setRun(null);
    setFightBoss(id);
    setFightKey((k) => k + 1);
    setScreen("fight");
  };
  const handleEvent = useCallback((e) => {
    const s = saveRef.current;
    const r = runRef.current;
    if (e.type === "death") {
      if (r) {
        const nr = { ...r, buffs: [], modifiers: defaultModifiers(), runDeaths: r.runDeaths + 1 };
        setRun(nr);
        const eng = engineRef.current;
        if (eng) eng.cfg.modifiers = nr.modifiers;
      }
      setSave((prev) => ({ ...prev, deaths: { ...prev.deaths, [fightBoss]: (prev.deaths[fightBoss] || 0) + 1 } }));
      return;
    }
    if (e.type === "victory") {
      const def = BOSS_MAP[fightBoss];
      const firstKill = !s.defeated[def.id];
      const prevBest = s.bestTimes[def.id];
      const isNewBest = !prevBest || e.timeMs < prevBest;
      const unlocks = [];
      const next = { ...s, defeated: { ...s.defeated, [def.id]: true }, bestTimes: { ...s.bestTimes, [def.id]: isNewBest ? e.timeMs : prevBest }, totalKills: s.totalKills + 1 };
      if (def.unlocksWeapon && !next.unlockedWeapons.includes(def.unlocksWeapon)) {
        next.unlockedWeapons = [...next.unlockedWeapons, def.unlocksWeapon];
        unlocks.push(`Weapon: ${WEAPONS[def.unlocksWeapon].name}`);
      }
      if (def.unlocksRelic && !next.unlockedRelics.includes(def.unlocksRelic)) {
        next.unlockedRelics = [...next.unlockedRelics, def.unlocksRelic];
        unlocks.push(`Relic: ${RELICS.find((x) => x.id === def.unlocksRelic)?.name}`);
      }
      if (Object.keys(next.defeated).length >= 5 && !next.unlockedSkins.includes("crimson")) {
        next.unlockedSkins = [...next.unlockedSkins, "crimson"];
        unlocks.push(`Skin: ${SKINS[1].name}`);
      }
      if (firstKill) unlocks.push(`Bestiary: ${def.name}`);
      if (firstKill && Object.keys(next.defeated).length === 1) unlocks.push("Boss Practice mode");
      setSave(next);
      setVictory({ boss: def, timeMs: e.timeMs, deaths: e.deaths, totalDeaths: next.deaths[def.id] || 0, best: next.bestTimes[def.id], isNewBest, unlocks, firstKill });
      if (r) {
        const bonus = 1 + (s.equippedRelic === "ember" ? 1 : 0);
        const flaskMax = PLAYER.flaskMax + r.modifiers.flaskBonus;
        setRun({ ...r, flask: Math.min(flaskMax, e.flaskLeft + bonus), runMs: r.runMs + e.timeMs });
      }
      setScreen("victory");
    }
  }, [fightBoss]);
  const afterVictory = () => {
    if (mode !== "gauntlet" || !run) {
      setScreen("hub");
      return;
    }
    const isLast = run.index >= BOSSES.length - 1;
    if (isLast) {
      const diff = save.difficulty;
      const next = { ...save };
      if (diff === "normal") {
        next.beatenNormal = true;
        if (!next.unlockedSkins.includes("void")) next.unlockedSkins = [...next.unlockedSkins, "void"];
      }
      if (diff === "ngplus") {
        next.beatenNGPlus = true;
        if (!next.unlockedSkins.includes("gilded")) next.unlockedSkins = [...next.unlockedSkins, "gilded"];
      }
      if (!next.bestRun || run.runMs < next.bestRun) next.bestRun = run.runMs;
      setSave(next);
      setScreen("runComplete");
      return;
    }
    setBuffOptions(pickBuffs(run.buffs));
    setScreen("buff");
  };
  const pickBuff = (b) => {
    if (!run) return;
    const mods = { ...run.modifiers };
    b.apply(mods);
    setRun({ ...run, buffs: [...run.buffs, b.id], modifiers: mods, index: run.index + 1 });
    setScreen("hub");
  };
  const continueGauntlet = () => {
    if (!run) return;
    setFightBoss(BOSSES[run.index].id);
    setFightKey((k) => k + 1);
    setScreen("fight");
  };
  const config = useMemo(() => ({
    bossId: fightBoss,
    weapon: save.equippedWeapon,
    relic: save.equippedRelic,
    skin: save.equippedSkin,
    difficulty: save.difficulty,
    modifiers: run ? run.modifiers : defaultModifiers(),
    flaskCharges: run ? run.flask : PLAYER.flaskMax + 9,
    showHitboxes: save.showHitboxes,
    gauntletIndex: run ? run.index : void 0,
    runFramesStart: run ? Math.round(run.runMs / 1e3 * 60) : 0,
    onEvent: handleEvent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [fightKey, fightBoss]);
  if (screen === "fight") {
    return <GameView key={fightKey} config={config} onEngine={(e) => engineRef.current = e} onQuit={() => {
      setScreen(mode === "gauntlet" ? "hub" : "hub");
      if (mode === "gauntlet" && run) setRun({ ...run });
    }} />;
  }
  if (screen === "victory" && victory) return <Victory info={victory} gauntlet={mode === "gauntlet"} onContinue={afterVictory} />;
  if (screen === "buff") return <BuffChoice options={buffOptions} onPick={pickBuff} />;
  if (screen === "runComplete" && run) return <RunComplete save={save} runMs={run.runMs} runDeaths={run.runDeaths} difficulty={save.difficulty} onDone={() => {
    setRun(null);
    setMode("single");
    setScreen("menu");
  }} />;
  if (screen === "select") return <BossSelect save={save} onPick={startSingle} onBack={() => setScreen("menu")} />;
  if (screen === "settings") return <Settings save={save} update={update} onBack={() => setScreen("menu")} onReset={() => {
    resetSave();
    setSave(loadSave());
    setScreen("menu");
  }} />;
  if (screen === "hub") {
    const g = mode === "gauntlet" && run ? { nextBoss: BOSSES[Math.min(run.index, BOSSES.length - 1)], index: run.index, flask: run.flask, buffs: run.buffs, modifiers: run.modifiers } : null;
    return <Hub
      save={save}
      update={update}
      gauntlet={g}
      onContinue={continueGauntlet}
      onBack={() => {
        setRun(null);
        setMode("single");
        setScreen("menu");
      }}
      onPractice={startSingle}
    />;
  }
  return <Menu save={save} onGauntlet={startGauntlet} onBossSelect={() => setScreen("select")} onHub={() => {
    setMode("single");
    setRun(null);
    setScreen("hub");
  }} onSettings={() => setScreen("settings")} />;
}
export {
  App as default
};
