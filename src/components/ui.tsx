import type { ReactNode } from 'react';
import { audio } from '../game/audio';

export function Frame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative min-h-screen w-full overflow-hidden bg-[#07060a] text-zinc-200 ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,60,20,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.9),transparent_70%)]" />
      <Embers />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function Embers() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="absolute block h-[3px] w-[3px] rounded-full bg-amber-400/70"
          style={{
            left: `${(i * 37) % 100}%`,
            bottom: '-10px',
            animation: `ember ${6 + (i % 5) * 1.7}s linear ${(i * 0.9) % 6}s infinite`,
            opacity: 0.5 + (i % 3) * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export function Button({
  children, onClick, variant = 'default', disabled = false, className = '',
}: { children: ReactNode; onClick?: () => void; variant?: 'default' | 'primary' | 'ghost' | 'danger'; disabled?: boolean; className?: string }) {
  const base = 'font-serif tracking-[0.2em] uppercase text-sm px-6 py-3 border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed';
  const v = {
    default: 'border-zinc-700 bg-zinc-900/60 hover:border-amber-500/70 hover:bg-zinc-800/80 hover:text-amber-100',
    primary: 'border-amber-500/80 bg-amber-900/30 text-amber-100 hover:bg-amber-700/40 hover:border-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.15)]',
    ghost: 'border-transparent text-zinc-400 hover:text-zinc-100',
    danger: 'border-red-900 text-red-300 hover:bg-red-950/50 hover:border-red-500',
  }[variant];
  return (
    <button
      disabled={disabled}
      onMouseEnter={() => audio.play('ui')}
      onClick={() => { audio.resume(); audio.play('ui_confirm'); onClick?.(); }}
      className={`${base} ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="text-center">
      <h1 className="font-serif text-4xl md:text-5xl tracking-[0.25em] uppercase text-amber-100 drop-shadow-[0_0_20px_rgba(245,158,11,0.35)]">{children}</h1>
      {sub && <p className="mt-2 font-serif text-sm tracking-[0.3em] uppercase text-zinc-500">{sub}</p>}
    </div>
  );
}

export function Panel({ children, className = '', title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <div className={`border border-zinc-800 bg-black/50 backdrop-blur-sm ${className}`}>
      {title && <div className="border-b border-zinc-800 px-4 py-2 font-serif text-xs tracking-[0.3em] uppercase text-zinc-500">{title}</div>}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">{children}</kbd>;
}
