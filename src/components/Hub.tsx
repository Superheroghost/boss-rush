import { useEffect, useState } from 'react';
import { Button, Frame, Panel } from './ui';
import type { SaveData } from '../game/save';
import { BOSSES } from '../game/bosses';
import { audio } from '../game/audio';
import { MODES } from '../game/bosses/helpers';
import { WEAPONS, RELICS, SKINS, BUFFS } from '../game/data';
import type { RelicId, SkinId, WeaponId, RunModifiers, BossDef } from '../game/types';
import { fmtMs } from '../game/render';

interface Props {
  save: SaveData;
  update: (patch: Partial<SaveData>) => void;
  gauntlet: { nextBoss: BossDef; index: number; flask: number; buffs: string[]; modifiers: RunModifiers } | null;
  onContinue: () => void;
  onBack: () => void;
  onPractice: (bossId: string) => void;
}

type Tab = 'weapons' | 'relics' | 'skins' | 'bestiary';

export default function Hub({ save, update, gauntlet, onContinue, onBack, onPractice }: Props) {
  const [tab, setTab] = useState<Tab>('weapons');
  const [loreBoss, setLoreBoss] = useState<string | null>(null);
  const defeatedCount = Object.keys(save.defeated).length;

  useEffect(() => {
    audio.resume();
    audio.startMusic({ bpm: 70, root: 45, mode: MODES.aeolian, bassPattern: [0, -1, -1, -1, 3, -1, -1, -1], arpPattern: [0, -1, 4, -1, 7, -1, 4, -1] }, 0);
    const t = window.setInterval(() => audio.play('campfire'), 180);
    return () => { audio.stopMusic(); clearInterval(t); };
  }, []);

  return (
    <Frame>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <div className="flex items-end justify-between border-b border-zinc-800 pb-4">
          <div>
            <p className="font-serif text-xs tracking-[0.5em] uppercase text-amber-600/80">Campfire</p>
            <h2 className="font-serif text-3xl tracking-[0.2em] uppercase text-amber-100">
              {gauntlet ? `Rest before the ${ordinal(gauntlet.index + 1)} gate` : 'The Bonfire'}
            </h2>
          </div>
          <Campfire />
        </div>

        {gauntlet && (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Panel title="Next">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{gauntlet.nextBoss.icon}</span>
                <div>
                  <div className="font-serif text-lg text-zinc-100">{gauntlet.nextBoss.name}</div>
                  <div className="text-xs text-zinc-500">{gauntlet.nextBoss.archetype} · {gauntlet.nextBoss.phases.length} phases</div>
                </div>
              </div>
            </Panel>
            <Panel title="Flask">
              <div className="flex gap-1">
                {Array.from({ length: Math.max(gauntlet.flask, 3) }).map((_, i) => (
                  <span key={i} className={`h-6 w-4 rounded-sm border ${i < gauntlet.flask ? 'border-amber-400 bg-amber-500/70' : 'border-zinc-700 bg-zinc-900'}`} />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">{gauntlet.flask} charge{gauntlet.flask === 1 ? '' : 's'} carried. +1 per victory{save.equippedRelic === 'ember' ? ' (+1 Ember Ring)' : ''}.</p>
            </Panel>
            <Panel title="Run Buffs">
              {gauntlet.buffs.length === 0 ? <p className="text-xs text-zinc-500">None yet. Buffs reset on death.</p> : (
                <ul className="space-y-0.5 text-xs">
                  {gauntlet.buffs.map((b, i) => { const d = BUFFS.find((x) => x.id === b)!; return <li key={i} className="text-amber-200/90">◆ {d.name} <span className="text-zinc-500">— {d.desc}</span></li>; })}
                </ul>
              )}
            </Panel>
          </div>
        )}

        <div className="mt-6 flex gap-1 border-b border-zinc-800">
          {(['weapons', 'relics', 'skins', 'bestiary'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 font-serif text-xs tracking-[0.3em] uppercase transition ${tab === t ? 'border-b-2 border-amber-500 text-amber-200' : 'text-zinc-500 hover:text-zinc-200'}`}>{t}</button>
          ))}
        </div>

        <div className="flex-1 py-6">
          {tab === 'weapons' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Object.values(WEAPONS).map((w) => {
                const unlocked = save.unlockedWeapons.includes(w.id);
                const eq = save.equippedWeapon === w.id;
                const unlockBoss = BOSSES.find((b) => b.unlocksWeapon === w.id);
                return (
                  <button key={w.id} disabled={!unlocked} onClick={() => update({ equippedWeapon: w.id as WeaponId })}
                    className={`text-left border p-4 transition ${eq ? 'border-amber-500 bg-amber-950/30' : 'border-zinc-800 bg-black/40 hover:border-zinc-600'} disabled:opacity-40`}>
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-lg" style={{ color: w.color }}>{w.name}</span>
                      {eq && <span className="text-[10px] tracking-widest text-amber-400">EQUIPPED</span>}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{w.desc}</p>
                    {!unlocked && <p className="mt-1 text-[11px] text-red-400">Locked — defeat {unlockBoss?.name ?? '???'}</p>}
                    <div className="mt-3 grid grid-cols-4 gap-2 font-mono text-[10px] text-zinc-500">
                      <Stat label="LIGHT" v={w.lightDmg.join('/')} />
                      <Stat label="HEAVY" v={String(w.heavyDmg)} />
                      <Stat label="REACH" v={String(w.reach)} />
                      <Stat label="SPEED" v={`${w.lightWindup + w.lightActive + w.lightRecovery}f`} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'relics' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {RELICS.map((r) => {
                const unlocked = save.unlockedRelics.includes(r.id);
                const eq = save.equippedRelic === r.id;
                const unlockBoss = BOSSES.find((b) => b.id === r.unlockBoss);
                return (
                  <button key={r.id} disabled={!unlocked} onClick={() => update({ equippedRelic: r.id as RelicId })}
                    className={`text-left border p-4 transition ${eq ? 'border-amber-500 bg-amber-950/30' : 'border-zinc-800 bg-black/40 hover:border-zinc-600'} disabled:opacity-40`}>
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-base text-zinc-100">{r.name}</span>
                      {eq && <span className="text-[10px] tracking-widest text-amber-400">EQUIPPED</span>}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{r.desc}</p>
                    {!unlocked && <p className="mt-1 text-[11px] text-red-400">Locked — defeat {unlockBoss?.name ?? '???'}</p>}
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'skins' && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {SKINS.map((s) => {
                const unlocked = save.unlockedSkins.includes(s.id);
                const eq = save.equippedSkin === s.id;
                return (
                  <button key={s.id} disabled={!unlocked} onClick={() => update({ equippedSkin: s.id as SkinId })}
                    className={`text-left border p-4 transition ${eq ? 'border-amber-500 bg-amber-950/30' : 'border-zinc-800 bg-black/40 hover:border-zinc-600'} disabled:opacity-40`}>
                    <div className="mb-3 flex h-16 items-end justify-center gap-1">
                      <span className="h-14 w-8 rounded-t-md" style={{ background: s.colors.armor, boxShadow: `inset 0 0 0 2px ${s.colors.trim}` }} />
                      <span className="h-12 w-3 rounded-b" style={{ background: s.colors.cape }} />
                    </div>
                    <div className="font-serif text-sm text-zinc-100">{s.name}</div>
                    <div className="text-[11px] text-zinc-500">{unlocked ? (eq ? 'Equipped' : 'Unlocked') : s.desc}</div>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'bestiary' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
              <div className="space-y-1">
                {BOSSES.map((b, i) => {
                  const beaten = !!save.defeated[b.id];
                  return (
                    <button key={b.id} onClick={() => beaten && setLoreBoss(b.id)}
                      className={`flex w-full items-center gap-3 border px-3 py-2 text-left transition ${loreBoss === b.id ? 'border-amber-500 bg-amber-950/30' : 'border-zinc-800 bg-black/40 hover:border-zinc-600'} ${!beaten ? 'opacity-50' : ''}`}>
                      <span className="w-6 text-center font-mono text-xs text-zinc-600">{i + 1}</span>
                      <span className="text-xl">{beaten ? b.icon : '❓'}</span>
                      <div className="flex-1">
                        <div className="font-serif text-sm text-zinc-100">{beaten ? b.name : 'Unknown'}</div>
                        <div className="text-[10px] text-zinc-500">{b.archetype}</div>
                      </div>
                      <div className="text-right font-mono text-[10px] text-zinc-500">
                        <div className="text-red-400">☠ {save.deaths[b.id] || 0}</div>
                        <div>{save.bestTimes[b.id] ? fmtMs(save.bestTimes[b.id]) : '—'}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Panel title="Lore" className="h-fit">
                {loreBoss ? (() => {
                  const b = BOSSES.find((x) => x.id === loreBoss)!;
                  return (
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{b.icon}</span>
                        <div>
                          <div className="font-serif text-xl text-amber-100">{b.name}</div>
                          <div className="text-xs italic text-zinc-400">{b.title}</div>
                        </div>
                      </div>
                      <p className="mt-4 font-serif text-sm leading-relaxed text-zinc-300">{b.lore}</p>
                      <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[10px] text-zinc-500">
                        <Stat label="HP" v={String(b.hp)} />
                        <Stat label="PHASES" v={String(b.phases.length)} />
                        <Stat label="ATTACKS" v={String(b.attacks.length)} />
                      </div>
                      <div className="mt-3 text-[11px] text-zinc-500">Phases: {b.phases.map((p) => p.name).join(' → ')}</div>
                      {b.unlocksWeapon && <div className="mt-1 text-[11px] text-amber-400/80">Drops: {WEAPONS[b.unlocksWeapon].name}</div>}
                      {b.unlocksRelic && <div className="mt-1 text-[11px] text-amber-400/80">Drops: {RELICS.find((r) => r.id === b.unlocksRelic)?.name}</div>}
                      {!gauntlet && <Button className="mt-4" onClick={() => onPractice(b.id)}>Challenge</Button>}
                    </div>
                  );
                })() : <p className="text-xs text-zinc-500">Select a defeated foe to read its entry. {defeatedCount}/{BOSSES.length} recorded.</p>}
              </Panel>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
          <Button variant="ghost" onClick={onBack}>{gauntlet ? 'Abandon Run' : 'Back'}</Button>
          {gauntlet && <Button variant="primary" onClick={onContinue} className="px-10">Walk to the {ordinal(gauntlet.index + 1)} Gate →</Button>}
        </div>
      </div>
    </Frame>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return <div><div className="text-zinc-600">{label}</div><div className="text-zinc-300">{v}</div></div>;
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function Campfire() {
  return (
    <div className="relative h-20 w-24">
      <div className="absolute bottom-1 left-1/2 h-3 w-16 -translate-x-1/2 rounded-full bg-black/60 blur-sm" />
      <div className="absolute bottom-2 left-1/2 h-2 w-14 -translate-x-1/2 rotate-[-12deg] rounded bg-amber-950" />
      <div className="absolute bottom-2 left-1/2 h-2 w-14 -translate-x-1/2 rotate-[14deg] rounded bg-amber-900" />
      <div className="absolute bottom-3 left-1/2 h-12 w-8 -translate-x-1/2 rounded-full bg-orange-500 blur-[2px]" style={{ animation: 'flame 0.6s ease-in-out infinite alternate' }} />
      <div className="absolute bottom-3 left-1/2 h-8 w-5 -translate-x-1/2 rounded-full bg-amber-300 blur-[1px]" style={{ animation: 'flame 0.45s ease-in-out infinite alternate-reverse' }} />
      <div className="absolute bottom-6 left-1/2 h-3 w-2 -translate-x-1/2 rounded-full bg-white/90 blur-[1px]" />
      <div className="absolute -inset-6 rounded-full bg-orange-500/15 blur-xl" style={{ animation: 'flame 1s ease-in-out infinite alternate' }} />
    </div>
  );
}
