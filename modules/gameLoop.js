/* ═══════════════════════════════════════════════════════════
   GameLoop — Fixed-timestep game loop with FPS tracking
   ═══════════════════════════════════════════════════════════ */

export class GameLoop {
  /**
   * @param {(dt: number) => void} updateFn  — called with delta time in seconds
   * @param {() => void}           renderFn  — called every animation frame
   * @param {(fps: number) => void} onFrameFn — HUD callback with current FPS
   */
  constructor(updateFn, renderFn, onFrameFn) {
    this.update  = updateFn;
    this.render  = renderFn;
    this.onFrame = onFrameFn;

    this._lastTime   = 0;
    this._frameCount = 0;
    this._fpsTimer   = 0;
    this._fps        = 0;
    this._running    = false;
    this._paused     = false;
    this._rafId      = null;

    // Bind the tick so we can cleanly pass it to rAF
    this._tick = this._tick.bind(this);
  }

  /** Whether the loop is currently paused. */
  get paused() {
    return this._paused;
  }

  /** Start the loop. */
  start() {
    if (this._running) return;
    this._running  = true;
    this._lastTime = performance.now();
    this._rafId    = requestAnimationFrame(this._tick);
  }

  /** Stop the loop entirely. */
  stop() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /** Toggle pause on/off. */
  togglePause() {
    this._paused = !this._paused;
    // Reset lastTime so dt doesn't spike when unpausing
    if (!this._paused) {
      this._lastTime = performance.now();
    }
  }

  /* ── internal tick ────────────────────────────── */
  _tick(now) {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(this._tick);

    const rawDt = (now - this._lastTime) / 1000;   // seconds
    const dt    = Math.min(rawDt, 0.1);             // cap to avoid spiral of death
    this._lastTime = now;

    // FPS counter
    this._frameCount++;
    this._fpsTimer += rawDt;
    if (this._fpsTimer >= 1) {
      this._fps        = this._frameCount;
      this._frameCount = 0;
      this._fpsTimer  -= 1;
    }

    this.update(dt);
    this.render(dt);
    this.onFrame(this._fps, this._paused);
  }
}
