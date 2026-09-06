import { Button, Frame, Kbd, Title } from "./ui";
import { BOSSES } from "../game/bosses";
import { DIFFICULTY_INFO } from "../game/data";
import { fmtMs } from "../game/render";
function Menu({ save, onGauntlet, onBossSelect, onHub, onSettings }) {
  const defeated = Object.keys(save.defeated).length;
  const totalDeaths = Object.values(save.deaths).reduce((a, b) => a + b, 0);
  return <Frame>
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-10 px-6 py-12">
        <div className="text-center">
          <p className="mb-3 font-serif text-xs tracking-[0.5em] uppercase text-amber-600/80">A Boss Rush</p>
          <Title sub="Eleven that would not die. One who must.">Ashen Gauntlet</Title>
        </div>

        <div className="grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-2">
          <Button variant="primary" onClick={onGauntlet} className="py-5 text-base">
            Begin the Gauntlet
            <span className="mt-1 block font-sans text-[10px] normal-case tracking-wider text-amber-200/60">
              All bosses in sequence · {DIFFICULTY_INFO[save.difficulty].name}
            </span>
          </Button>
          <Button onClick={onBossSelect} className="py-5 text-base">
            Boss Practice
            <span className="mt-1 block font-sans text-[10px] normal-case tracking-wider text-zinc-500">
              All {BOSSES.length} bosses available · no unlocks required
            </span>
          </Button>
          <Button onClick={onHub} className="py-4">
            Campfire
            <span className="mt-1 block font-sans text-[10px] normal-case tracking-wider text-zinc-500">Weapons · Relics · Skins · Bestiary</span>
          </Button>
          <Button onClick={onSettings} className="py-4">
            Difficulty & Settings
            <span className="mt-1 block font-sans text-[10px] normal-case tracking-wider text-zinc-500">
              {save.beatenNormal ? "New Game+ unlocked" : "Complete the gauntlet for NG+"}
            </span>
          </Button>
        </div>

        <div className="grid w-full max-w-3xl grid-cols-3 gap-4 border-t border-zinc-800 pt-6 text-center font-mono text-xs text-zinc-500">
          <div><div className="text-2xl text-zinc-200">{save.totalKills}</div>BOSSES SLAIN</div>
          <div><div className="text-2xl text-red-400">{totalDeaths}</div>DEATHS</div>
          <div><div className="text-2xl text-amber-300">{save.bestRun ? fmtMs(save.bestRun) : "\u2014"}</div>BEST RUN</div>
        </div>

        <div className="max-w-3xl text-center font-sans text-[11px] leading-relaxed text-zinc-500">
          <p className="mb-2 font-serif tracking-[0.3em] uppercase text-zinc-400">Controls</p>
          <p className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            <span><Kbd>A</Kbd> <Kbd>D</Kbd> move</span>
            <span><Kbd>Shift</Kbd> sprint</span>
            <span><Kbd>Space</Kbd> dodge roll (10 i-frames)</span>
            <span><Kbd>J</Kbd> light attack</span>
            <span><Kbd>K</Kbd> heavy attack</span>
            <span><Kbd>L</Kbd> hold to block · tap timing = parry (5f)</span>
            <span><Kbd>F</Kbd> flask</span>
            <span><Kbd>R</Kbd> instant restart</span>
            <span><Kbd>H</Kbd> hitboxes</span>
          </p>
          <p className="mt-3 text-zinc-600">Every action costs stamina. Parries stagger. Staggered bosses take critical damage. Healing is slow — pick your moment.</p>
        </div>
      </div>
    </Frame>;
}
export {
  Menu as default
};
