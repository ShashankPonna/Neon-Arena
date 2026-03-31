/* ═══════════════════════════════════════════════════════════
   touchControls.js — On-Screen Mobile Controls
   Creates a floating joystick and action buttons for mobile play.
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
      { action: 'activate', icon: '⚡', label: 'Activate', cls: 'act-e',  color: '#39ff14' },
      { action: 'drop',     icon: '↩️', label: 'Discard',  cls: 'act-q',  color: '#ff6b35' },
      { action: 'tree',     icon: '⬆️', label: 'Upgrade',  cls: 'act-t',  color: '#00f0ff' },
      { action: 'dsVis',    icon: '📊', label: 'Analyze',  cls: 'act-v',  color: '#b14eff' },
    ];

    for (const a of actionDefs) {
      const btn = document.createElement('button');
      btn.className = `action-btn ${a.cls}`;
      btn.innerHTML = `<span class="act-icon">${a.icon}</span><span class="act-label">${a.label}</span>`;
      btn.style.setProperty('--btn-color', a.color);
      btn.setAttribute('aria-label', a.label);
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
      this.movementEl = this._buildFloatingJoystick();
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

  /** Build the floating joystick — a transparent touch zone with on-demand joystick */
  _buildFloatingJoystick() {
    // The touch zone fills the movement area
    const zone = document.createElement('div');
    zone.className = 'joystick-zone';

    // Joystick base (hidden by default, appears on touch)
    const base = document.createElement('div');
    base.className = 'joystick-base floating';
    
    // Knob
    const knob = document.createElement('div');
    knob.className = 'joystick-knob';
    base.appendChild(knob);

    zone.appendChild(base);

    // Bind floating joystick logic
    this._bindFloatingJoystick(zone, base, knob);

    return zone;
  }

  /** Bind touch events for the floating joystick */
  _bindFloatingJoystick(zone, base, knob) {
    let active = false;
    let touchId = null;
    let originX = 0;
    let originY = 0;
    const maxRadius = 60; // How far the knob can travel from origin
    const baseSize = 140; // Visual size of the joystick base

    const reset = () => {
      active = false;
      touchId = null;
      base.classList.remove('active');
      knob.style.transform = `translate(-50%, -50%)`;
      this.input.setKey('ArrowUp', false);
      this.input.setKey('ArrowDown', false);
      this.input.setKey('ArrowLeft', false);
      this.input.setKey('ArrowRight', false);
    };

    const placeJoystick = (clientX, clientY) => {
      // Convert touch point to position relative to the zone
      const zoneRect = zone.getBoundingClientRect();
      const localX = clientX - zoneRect.left;
      const localY = clientY - zoneRect.top;

      // Position the base centered on the touch point
      base.style.left = `${localX}px`;
      base.style.top = `${localY}px`;

      // Store origin in screen coordinates for knob tracking
      originX = clientX;
      originY = clientY;

      // Show the joystick with animation
      base.classList.add('active');
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
      const deadzone = 15;
      this.input.setKey('ArrowUp',    distance > deadzone && dy < -deadzone);
      this.input.setKey('ArrowDown',  distance > deadzone && dy > deadzone);
      this.input.setKey('ArrowLeft',  distance > deadzone && dx < -deadzone);
      this.input.setKey('ArrowRight', distance > deadzone && dx > deadzone);
    };

    // Touch events on the zone
    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!active) {
        const t = e.changedTouches[0];
        touchId = t.identifier;
        active = true;
        placeJoystick(t.clientX, t.clientY);
        updateKnob(t.clientX, t.clientY);
      }
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
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

    zone.addEventListener('touchend', handleEnd, { passive: false });
    zone.addEventListener('touchcancel', handleEnd, { passive: false });

    // Mouse fallback for desktop testing
    let mouseActive = false;
    zone.addEventListener('mousedown', (e) => {
      e.preventDefault();
      mouseActive = true;
      active = true;
      placeJoystick(e.clientX, e.clientY);
      updateKnob(e.clientX, e.clientY);
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
