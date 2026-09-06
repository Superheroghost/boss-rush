import { useEffect, useRef } from "react";
import { Engine } from "../game/engine";
import { Renderer } from "../game/render";
import { VIEW_W, VIEW_H } from "../game/data";
import { audio } from "../game/audio";
import { BOSS_MAP } from "../game/bosses";
function GameView({ config, onEngine, onQuit }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    const renderer = new Renderer(canvas);
    const engine = new Engine(config);
    engineRef.current = engine;
    engine.onRender = () => renderer.render(engine);
    engine.start();
    onEngine?.(engine);
    audio.resume();
    const def = BOSS_MAP[config.bossId];
    audio.startMusic(def.music, 1);
    return () => {
      engine.stop();
      audio.stopMusic();
    };
  }, [config.bossId]);
  return <div className="relative flex h-screen w-screen items-center justify-center bg-black select-none">
      <div className="relative aspect-video max-h-screen w-full max-w-[calc(100vh*16/9)]">
        <canvas ref={canvasRef} className="h-full w-full" style={{ imageRendering: "auto" }} />
        <div className="pointer-events-none absolute bottom-2 left-3 text-[10px] tracking-wider text-zinc-500 font-mono">
          A/D MOVE · SHIFT SPRINT · SPACE ROLL · J LIGHT · K HEAVY · L BLOCK/PARRY · F FLASK · R RESTART · H HITBOXES · ESC PAUSE
        </div>
        <button
    onClick={onQuit}
    className="absolute right-3 bottom-2 rounded border border-zinc-700 bg-black/60 px-2 py-0.5 text-[10px] tracking-wider text-zinc-400 hover:border-zinc-400 hover:text-zinc-100"
  >
          RETREAT TO CAMPFIRE
        </button>
      </div>
    </div>;
}
export {
  GameView as default
};
