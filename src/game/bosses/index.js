import { FALLEN_KNIGHT, CRIMSON_DUELIST, TWIN_SENTINELS, HOLLOW_KING } from "./knights";
import { COLOSSUS, PLAGUE_WARDEN, EXECUTIONER } from "./brutes";
import { HUNTRESS, SORCERER } from "./ranged";
import { WOLF, DRAKE } from "./beasts";
const BOSSES = [
  FALLEN_KNIGHT,
  WOLF,
  HUNTRESS,
  COLOSSUS,
  CRIMSON_DUELIST,
  SORCERER,
  TWIN_SENTINELS,
  EXECUTIONER,
  PLAGUE_WARDEN,
  DRAKE,
  HOLLOW_KING
];
const BOSS_MAP = Object.fromEntries(BOSSES.map((b) => [b.id, b]));
function bossIndex(id) {
  return BOSSES.findIndex((b) => b.id === id);
}
export {
  BOSSES,
  BOSS_MAP,
  bossIndex
};
