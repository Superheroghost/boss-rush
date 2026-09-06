var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { INPUT_BUFFER } from "./data";
const KEYMAP = {
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
  Space: "dodge",
  KeyJ: "light",
  KeyZ: "light",
  KeyK: "heavy",
  KeyX: "heavy",
  KeyL: "block",
  KeyC: "block",
  KeyF: "heal",
  KeyQ: "heal",
  KeyR: "restart",
  KeyH: "hitbox",
  Escape: "pause"
};
class Input {
  constructor() {
    __publicField(this, "held", /* @__PURE__ */ new Set());
    // buffered presses: action -> frame at which pressed
    __publicField(this, "buffer", /* @__PURE__ */ new Map());
    __publicField(this, "pressedThisFrame", /* @__PURE__ */ new Set());
    __publicField(this, "frame", 0);
    __publicField(this, "onKeyDown", (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      if (["Space", "ArrowLeft", "ArrowRight", "ShiftLeft"].includes(e.code)) e.preventDefault();
      if (!this.held.has(a)) {
        this.buffer.set(a, this.frame);
        this.pressedThisFrame.add(a);
      }
      this.held.add(a);
    });
    __publicField(this, "onKeyUp", (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      this.held.delete(a);
    });
    __publicField(this, "onBlur", () => {
      this.held.clear();
      this.buffer.clear();
    });
  }
  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }
  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }
  /** Called once per simulation frame. */
  tick() {
    this.frame++;
    this.pressedThisFrame.clear();
    for (const [a, f] of this.buffer) {
      if (this.frame - f > INPUT_BUFFER) this.buffer.delete(a);
    }
  }
  /** Returns true if action was pressed within the buffer window; consumes it. */
  consume(a) {
    if (this.buffer.has(a)) {
      this.buffer.delete(a);
      return true;
    }
    return false;
  }
  /** Peek if buffered without consuming */
  buffered(a) {
    return this.buffer.has(a);
  }
  isHeld(a) {
    return this.held.has(a);
  }
  clearBuffer() {
    this.buffer.clear();
  }
  axis() {
    let x = 0;
    if (this.held.has("left")) x -= 1;
    if (this.held.has("right")) x += 1;
    return x;
  }
}
export {
  Input
};
