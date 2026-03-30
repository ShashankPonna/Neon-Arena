/* ═══════════════════════════════════════════════════════════
   Player — Square player with smooth acceleration-based
   movement (no enemies yet).
   ═══════════════════════════════════════════════════════════ */

export class Player {
  constructor(x, y) {
    // Position
    this.x = x;
    this.y = y;

    // Dimensions
    this.size = 32;

    // Physics
    this.vx = 0;
    this.vy = 0;
    this.speed       = 420;   // max pixels per second
    this.accel       = 2400;  // acceleration px/s²
    this.friction    = 12;    // deceleration factor (higher = snappier stop)

    // Visual
    this.color      = '#00f0ff';
    this.glowColor  = 'rgba(0, 240, 255, 0.35)';
    this.trailAlpha = 0;
  }

  /* ── Input handling ─────────────────────────── */
  handleInput(keys) {
    this._dirX = 0;
    this._dirY = 0;

    if (keys['ArrowLeft']  || keys['a']) this._dirX -= 1;
    if (keys['ArrowRight'] || keys['d']) this._dirX += 1;
    if (keys['ArrowUp']    || keys['w']) this._dirY -= 1;
    if (keys['ArrowDown']  || keys['s']) this._dirY += 1;

    // Normalize diagonal movement
    if (this._dirX !== 0 && this._dirY !== 0) {
      const inv = 1 / Math.SQRT2;
      this._dirX *= inv;
      this._dirY *= inv;
    }
  }

  /* ── Physics update ─────────────────────────── */
  update(dt) {
    const moving = this._dirX !== 0 || this._dirY !== 0;

    if (moving) {
      // Accelerate toward input direction
      this.vx += this._dirX * this.accel * dt;
      this.vy += this._dirY * this.accel * dt;

      // Clamp to max speed
      const mag = Math.hypot(this.vx, this.vy);
      if (mag > this.speed) {
        this.vx = (this.vx / mag) * this.speed;
        this.vy = (this.vy / mag) * this.speed;
      }

      // Trail effect when moving
      this.trailAlpha = Math.min(this.trailAlpha + dt * 6, 1);
    } else {
      // Apply friction
      this.vx *= Math.max(0, 1 - this.friction * dt);
      this.vy *= Math.max(0, 1 - this.friction * dt);

      // Stop completely when very slow
      if (Math.abs(this.vx) < 0.5) this.vx = 0;
      if (Math.abs(this.vy) < 0.5) this.vy = 0;

      this.trailAlpha = Math.max(this.trailAlpha - dt * 4, 0);
    }

    // Integrate position
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  /* ── Keep player inside bounds ──────────────── */
  clamp(canvasW, canvasH) {
    const half = this.size / 2;
    if (this.x < half)            { this.x = half;            this.vx = 0; }
    if (this.x > canvasW - half)  { this.x = canvasW - half;  this.vx = 0; }
    if (this.y < half)            { this.y = half;            this.vy = 0; }
    if (this.y > canvasH - half)  { this.y = canvasH - half;  this.vy = 0; }
  }
}
