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
    this.controlMode = 'joystick'; // Default

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

    // ── Action Buttons ──
    const actions = document.createElement('div');
    actions.className = 'action-group';

    const actionDefs = [
      { action: 'activate', label: 'Use',     cls: 'act-e',     color: '#39ff14' },
      { action: 'drop',     label: 'Drop',    cls: 'act-q',     color: '#ff6b35' },
      { action: 'tree',     label: 'Skills',  cls: 'act-t',     color: '#00f0ff' },
      { action: 'dsVis',    label: 'Data',    cls: 'act-v',     color: '#b14eff' },
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

    this.container.appendChild(actions);

    // ── Movement Area Wrapper (holds controller + quick buttons) ──
    this.movementContainer = document.createElement('div');
    this.movementContainer.className = 'movement-wrapper';

    // Heart Button (Top Right of Controller)
    this.btnHealth = document.createElement('button');
    this.btnHealth.className = 'quick-btn act-health';
    this.btnHealth.innerHTML = `♥ <span class="quick-badge" id="badge-health">0</span>`;
    this._bindAction(this.btnHealth, 'useHealth');
    this.movementContainer.appendChild(this.btnHealth);

    // Star Button (Top Left of Controller)
    this.btnStar = document.createElement('button');
    this.btnStar.className = 'quick-btn act-star';
    this.btnStar.innerHTML = `⭐ <span class="quick-badge" id="badge-star">0</span>`;
    this._bindAction(this.btnStar, 'useStar');
    this.movementContainer.appendChild(this.btnStar);

    // Render the active movement control
    this.setControlMode(this.controlMode);

    this.container.appendChild(this.movementContainer);

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

  setControlMode(mode) {
    this.controlMode = mode;
    if (this.movementEl) {
      if (this.movementEl.parentNode) this.movementEl.parentNode.removeChild(this.movementEl);
      this.movementEl = null;
    }
    
    // reset keys just in case
    this.input.setKey('ArrowUp', false);
    this.input.setKey('ArrowDown', false);
    this.input.setKey('ArrowLeft', false);
    this.input.setKey('ArrowRight', false);

    if (mode === 'dpad') {
      this.movementEl = this._buildDPad();
    } else {
      this.movementEl = this._buildJoystickDOM();
    }
    
    // Append the movement element behind the quick buttons in the wrapper
    this.movementContainer.appendChild(this.movementEl);
  }

  _buildDPad() {
    const dpad = document.createElement('div');
    dpad.className = 'dpad';

    const dirs = [
      { key: 'ArrowUp',    label: '▲', cls: 'dpad-up' },
      { key: 'ArrowLeft',  label: '◀', cls: 'dpad-left' },
      { key: 'ArrowDown',  label: '▼', cls: 'dpad-down' },
      { key: 'ArrowRight', label: '▶', cls: 'dpad-right' },
    ];

    const center = document.createElement('div');
    center.className = 'dpad-center';
    dpad.appendChild(center);

    for (const d of dirs) {
      const btn = document.createElement('button');
      btn.className = `dpad-btn ${d.cls}`;
      btn.textContent = d.label;
      btn.setAttribute('data-key', d.key);
      
      const press = (e) => { e.preventDefault(); btn.classList.add('pressed'); this.input.setKey(d.key, true); };
      const release = (e) => { e.preventDefault(); btn.classList.remove('pressed'); this.input.setKey(d.key, false); };
      
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup', release);
      btn.addEventListener('mouseleave', release);
      
      dpad.appendChild(btn);
    }
    return dpad;
  }

  _buildJoystickDOM() {
    const base = document.createElement('div');
    base.className = 'joystick-base';
    const knob = document.createElement('div');
    knob.className = 'joystick-knob';
    base.appendChild(knob);
    this._bindJoystick(base, knob);
    return base;
  }

  /** Bind touch events for analog joystick */
  _bindJoystick(base, knob) {
    let active = false;
    let touchId = null;
    let originX = 0;
    let originY = 0;
    let maxRadius = 50; // Decided dynamically

    const reset = () => {
      active = false;
      touchId = null;
      knob.style.transform = `translate(-50%, -50%)`;
      this.input.setKey('ArrowUp', false);
      this.input.setKey('ArrowDown', false);
      this.input.setKey('ArrowLeft', false);
      this.input.setKey('ArrowRight', false);
    };

    const handleStart = (clientX, clientY) => {
      if (active) return;
      active = true;
      const rect = base.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
      maxRadius = (rect.width / 2) - 10; // keep knob somewhat inside

      updateKnob(clientX, clientY);
    };

    const updateKnob = (clientX, clientY) => {
      if (!active) return;
      const dx = clientX - originX;
      const dy = clientY - originY;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      const knobDist = Math.min(distance, maxRadius);
      const knobX = Math.cos(angle) * knobDist;
      const knobY = Math.sin(angle) * knobDist;

      knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

      // Map to discrete 8-way inputs
      const deadzone = 15; // Requires dragging slightly out of center
      this.input.setKey('ArrowUp',    distance > deadzone && dy < -deadzone);
      this.input.setKey('ArrowDown',  distance > deadzone && dy > deadzone);
      this.input.setKey('ArrowLeft',  distance > deadzone && dx < -deadzone);
      this.input.setKey('ArrowRight', distance > deadzone && dx > deadzone);
    };

    // Touch events
    base.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!active) {
        const t = e.changedTouches[0];
        touchId = t.identifier;
        handleStart(t.clientX, t.clientY);
      }
    }, { passive: false });

    base.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (active) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId) {
            updateKnob(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
            break;
          }
        }
      }
    }, { passive: false });

    const handleEnd = (e) => {
      e.preventDefault();
      if (active) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId) {
            reset();
            break;
          }
        }
      }
    };

    base.addEventListener('touchend', handleEnd, { passive: false });
    base.addEventListener('touchcancel', handleEnd, { passive: false });

    // Mouse fallback for desktop testing
    let mouseActive = false;
    base.addEventListener('mousedown', (e) => {
      e.preventDefault();
      mouseActive = true;
      handleStart(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
      if (mouseActive) updateKnob(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => {
      if (mouseActive) {
        mouseActive = false;
        reset();
      }
    });
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

  updateStockBadges(healthCount, starCount) {
    if (this.btnHealth) {
      const b = this.btnHealth.querySelector('.quick-badge');
      if (b) b.textContent = healthCount;
      if (healthCount > 0) this.btnHealth.classList.add('has-stock');
      else this.btnHealth.classList.remove('has-stock');
    }
    if (this.btnStar) {
      const b = this.btnStar.querySelector('.quick-badge');
      if (b) b.textContent = starCount;
      if (starCount > 0) this.btnStar.classList.add('has-stock');
      else this.btnStar.classList.remove('has-stock');
    }
  }
}

