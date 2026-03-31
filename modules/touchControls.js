/* ═══════════════════════════════════════════════════════════
   touchControls.js — On-Screen Mobile Controls
   Creates a D-pad and action buttons for mobile play.
   Hooks directly into the Input system's key state.
   Visible on touch devices OR small viewports (≤ 850px).
   ═══════════════════════════════════════════════════════════ */

export class TouchControls {
  /**
   * @param {import('./input.js').Input} input — the game's Input instance
   */
  constructor(input) {
    this.input   = input;
    this.visible = false;

    // Detect native touch capability
    this.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // Always build the DOM (it starts hidden via CSS)
    this._build();

    // Show immediately if touch device or small screen
    this._evaluate();

    // Re-evaluate on resize so controls appear/disappear dynamically
    window.addEventListener('resize', () => this._evaluate());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this._evaluate(), 200);
    });
  }

  /** Decide whether to show controls based on screen size + touch */
  _evaluate() {
    const smallScreen = window.innerWidth <= 850;
    if (this.isTouch || smallScreen) {
      this.show();
    } else {
      this.hide();
    }
  }

  /** Build the DOM structure for controls */
  _build() {
    // Container
    this.container = document.createElement('div');
    this.container.id = 'touch-controls';
    this.container.className = 'touch-controls';

    // ── D-Pad (left side) ──
    const dpad = document.createElement('div');
    dpad.className = 'dpad';

    const dirs = [
      { key: 'ArrowUp',    label: '▲', cls: 'dpad-up' },
      { key: 'ArrowLeft',  label: '◀', cls: 'dpad-left' },
      { key: 'ArrowDown',  label: '▼', cls: 'dpad-down' },
      { key: 'ArrowRight', label: '▶', cls: 'dpad-right' },
    ];

    // Center dot
    const center = document.createElement('div');
    center.className = 'dpad-center';
    dpad.appendChild(center);

    for (const d of dirs) {
      const btn = document.createElement('button');
      btn.className = `dpad-btn ${d.cls}`;
      btn.textContent = d.label;
      btn.setAttribute('data-key', d.key);
      btn.setAttribute('aria-label', d.key);
      this._bindDirection(btn, d.key);
      dpad.appendChild(btn);
    }

    // ── Action Buttons (right side) ──
    const actions = document.createElement('div');
    actions.className = 'action-group';

    const actionDefs = [
      { action: 'activate', label: 'Use',     cls: 'act-e',     color: '#39ff14' },
      { action: 'drop',     label: 'Drop',    cls: 'act-q',     color: '#ff6b35' },
      { action: 'tree',     label: 'Skills',  cls: 'act-t',     color: '#00f0ff' },
      { action: 'dsVis',    label: 'Data',    cls: 'act-v',     color: '#b14eff' },
      { action: 'pause',    label: 'Pause',   cls: 'act-pause', color: '#ff2244' },
    ];

    for (const a of actionDefs) {
      const btn = document.createElement('button');
      btn.className = `action-btn ${a.cls}`;
      btn.textContent = a.label;
      btn.style.setProperty('--btn-color', a.color);
      btn.setAttribute('aria-label', a.action);
      this._bindAction(btn, a.action);
      actions.appendChild(btn);
    }

    this.container.appendChild(dpad);
    this.container.appendChild(actions);

    // Insert into game-wrapper so controls flow in the layout
    const wrapper = document.getElementById('game-wrapper');
    if (wrapper) {
      wrapper.appendChild(this.container);
    } else {
      document.body.appendChild(this.container);
    }

    // Prevent scrolling/zooming when touching controls
    this.container.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  }

  /** Bind touch events for a directional button (hold to move) */
  _bindDirection(btn, key) {
    const press = (e) => {
      e.preventDefault();
      btn.classList.add('pressed');
      this.input.setKey(key, true);
    };
    const release = (e) => {
      e.preventDefault();
      btn.classList.remove('pressed');
      this.input.setKey(key, false);
    };

    btn.addEventListener('touchstart',  press,   { passive: false });
    btn.addEventListener('touchend',    release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });

    // Also support mouse for testing on desktop
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup',   release);
    btn.addEventListener('mouseleave', release);
  }

  /** Bind touch events for an action button (fire once on tap) */
  _bindAction(btn, action) {
    const fire = (e) => {
      e.preventDefault();
      btn.classList.add('pressed');
      this.input.fireAction(action);
      setTimeout(() => btn.classList.remove('pressed'), 120);
    };

    btn.addEventListener('touchstart', fire, { passive: false });
    btn.addEventListener('mousedown',  fire);
  }

  show() {
    if (this.container && !this.visible) {
      this.container.classList.add('visible');
      this.visible = true;
      document.body.classList.add('has-touch-controls');
    }
  }

  hide() {
    if (this.container && this.visible) {
      this.container.classList.remove('visible');
      this.visible = false;
      document.body.classList.remove('has-touch-controls');
    }
  }
}

