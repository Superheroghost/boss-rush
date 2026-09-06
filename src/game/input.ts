import { INPUT_BUFFER } from './data';

export type Action = 'left' | 'right' | 'sprint' | 'dodge' | 'light' | 'heavy' | 'block' | 'heal' | 'restart' | 'hitbox' | 'pause';

const KEYMAP: Record<string, Action> = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  Space: 'dodge',
  KeyJ: 'light',
  KeyZ: 'light',
  KeyK: 'heavy',
  KeyX: 'heavy',
  KeyL: 'block',
  KeyC: 'block',
  KeyF: 'heal',
  KeyQ: 'heal',
  KeyR: 'restart',
  KeyH: 'hitbox',
  Escape: 'pause',
};

export class Input {
  held: Set<Action> = new Set();
  // buffered presses: action -> frame at which pressed
  private buffer: Map<Action, number> = new Map();
  private pressedThisFrame: Set<Action> = new Set();
  frame = 0;
  private onKeyDown = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ShiftLeft'].includes(e.code)) e.preventDefault();
    if (!this.held.has(a)) {
      this.buffer.set(a, this.frame);
      this.pressedThisFrame.add(a);
    }
    this.held.add(a);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    this.held.delete(a);
  };
  private onBlur = () => {
    this.held.clear();
    this.buffer.clear();
  };

  attach() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }
  detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  /** Called once per simulation frame. */
  tick() {
    this.frame++;
    this.pressedThisFrame.clear();
    // expire old buffered inputs
    for (const [a, f] of this.buffer) {
      if (this.frame - f > INPUT_BUFFER) this.buffer.delete(a);
    }
  }

  /** Returns true if action was pressed within the buffer window; consumes it. */
  consume(a: Action): boolean {
    if (this.buffer.has(a)) {
      this.buffer.delete(a);
      return true;
    }
    return false;
  }

  /** Peek if buffered without consuming */
  buffered(a: Action): boolean {
    return this.buffer.has(a);
  }

  isHeld(a: Action) {
    return this.held.has(a);
  }

  clearBuffer() {
    this.buffer.clear();
  }

  axis(): number {
    let x = 0;
    if (this.held.has('left')) x -= 1;
    if (this.held.has('right')) x += 1;
    return x;
  }
}
