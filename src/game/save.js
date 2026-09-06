const KEY = "ashen_gauntlet_save_v1";
function defaultSave() {
  return {
    defeated: {},
    deaths: {},
    bestTimes: {},
    bestRun: null,
    unlockedWeapons: ["longsword", "katana", "greataxe", "spear"],
    unlockedRelics: ["none"],
    unlockedSkins: ["silver"],
    beatenNormal: false,
    beatenNGPlus: false,
    equippedWeapon: "longsword",
    equippedRelic: "none",
    equippedSkin: "silver",
    difficulty: "normal",
    totalKills: 0,
    showHitboxes: false,
    musicVolume: 0.5,
    sfxVolume: 0.7
  };
}
// All weapons are available from the very start.
const ALL_WEAPONS = ["longsword", "katana", "greataxe", "spear"];

function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const save = { ...defaultSave(), ...JSON.parse(raw) };
    // Force every weapon unlocked, even for pre-existing saves.
    save.unlockedWeapons = ALL_WEAPONS;
    return save;
  } catch {
    return defaultSave();
  }
}
function writeSave(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
  }
}
function resetSave() {
  localStorage.removeItem(KEY);
}
export {
  defaultSave,
  loadSave,
  resetSave,
  writeSave
};
