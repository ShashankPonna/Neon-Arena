/* ═══════════════════════════════════════════════════════════
   Input — Tracks which keys are currently pressed.
   Prevents default scrolling for arrow keys.
   Supports:
     • Pause toggle via Escape / P
     • Power-up activation via E key
     • Drop item via Q key
   ═══════════════════════════════════════════════════════════ */

const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'w', 'a', 's', 'd', 'Shift'
]);

const PAUSE_KEYS    = new Set(['Escape', 'p', 'P']);
const ACTIVATE_KEYS = new Set(['e', 'E']);
const DROP_KEYS     = new Set(['q', 'Q']);
const TREE_KEYS     = new Set(['t', 'T']);

export class Input {
  constructor() {
    /** @type {Record<string, boolean>} */
    this.keys = {};

    /** @type {(() => void) | null} */
    this._onPauseToggle = null;

    /** @type {(() => void) | null} */
    this._onActivate = null;

    /** @type {(() => void) | null} */
    this._onDrop = null;

    /** @type {(() => void) | null} */
    this._onTreeToggle = null;

    window.addEventListener('keydown', (e) => {
      if (GAME_KEYS.has(e.key)) {
        e.preventDefault();
        this.keys[e.key] = true;
      }
      if (PAUSE_KEYS.has(e.key)) {
        e.preventDefault();
        if (this._onPauseToggle) this._onPauseToggle();
      }
      if (ACTIVATE_KEYS.has(e.key)) {
        e.preventDefault();
        if (this._onActivate) this._onActivate();
      }
      if (DROP_KEYS.has(e.key)) {
        e.preventDefault();
        if (this._onDrop) this._onDrop();
      }
      if (TREE_KEYS.has(e.key)) {
        e.preventDefault();
        if (this._onTreeToggle) this._onTreeToggle();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (GAME_KEYS.has(e.key)) {
        e.preventDefault();
        this.keys[e.key] = false;
      }
    });

    // Reset keys when the window loses focus
    window.addEventListener('blur', () => {
      this.keys = {};
    });
  }

  /** Register a callback fired once per Escape/P press. */
  onPauseToggle(fn) {
    this._onPauseToggle = fn;
  }

  /** Register a callback fired once per E press (activate power-up). */
  onActivate(fn) {
    this._onActivate = fn;
  }

  /** Register a callback fired once per Q press (drop item). */
  onDrop(fn) {
    this._onDrop = fn;
  }

  /** Register a callback fired once per T press (toggle skill tree). */
  onTreeToggle(fn) {
    this._onTreeToggle = fn;
  }
}
