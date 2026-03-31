/* ═══════════════════════════════════════════════════════════
   canvasScaler.js — Responsive Canvas Scaling
   Uses CSS transform: scale() to fit the fixed-resolution
   canvas (800×480) into any viewport without changing
   internal game coordinates.
   ═══════════════════════════════════════════════════════════ */

export class CanvasScaler {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} baseW  — internal canvas width  (800)
   * @param {number} baseH  — internal canvas height (480)
   */
  constructor(canvas, baseW, baseH) {
    this.canvas = canvas;
    this.baseW  = baseW;
    this.baseH  = baseH;
    this.scale  = 1;

    // Elements that need width synced
    this.wrapper      = document.getElementById('game-wrapper');
    this.canvasClip   = document.getElementById('canvas-clip');

    this._resizeTimer = null;

    // Bind events
    const onResize = () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.resize(), 80);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => {
      // Orientation change needs a slight delay for viewport to settle
      setTimeout(() => this.resize(), 150);
    });

    // Initial sizing — resize immediately and then again after
    // a short delay so the flex layout has settled
    this.resize();
    requestAnimationFrame(() => this.resize());
  }

  /** Detect if we are on a small / touch device */
  get isMobile() {
    return window.innerWidth <= 850 || ('ontouchstart' in window && window.innerWidth < 1024);
  }

  /** Recalculate and apply the scale factor */
  resize() {
    const canvasArea = document.getElementById('canvas-area');

    let availW, availH;

    if (canvasArea && this.isMobile) {
      // On mobile the flex layout gives canvas-area exactly
      // the space remaining after HUD, inventory, touch controls.
      // Use that actual space to compute the scale.
      const rect = canvasArea.getBoundingClientRect();
      availW = rect.width - 8;   // small padding
      availH = rect.height - 8;
    } else {
      // Desktop: use viewport minus chrome
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      availW = vw - 24;
      availH = vh - 140;
    }

    // Compute scale to fit canvas inside available space
    const scaleX = availW / this.baseW;
    const scaleY = availH / this.baseH;
    this.scale = Math.min(scaleX, scaleY, 1.0); // Never scale UP beyond 1
    this.scale = Math.max(this.scale, 0.2);      // Floor to avoid invisible canvas

    // Apply CSS transform to canvas
    this.canvas.style.transformOrigin = 'top left';
    this.canvas.style.transform       = `scale(${this.scale})`;

    // The canvas element still reports its base dimensions to layout,
    // so we wrap it in a container that has the VISUAL size
    if (this.canvasClip) {
      this.canvasClip.style.width  = `${this.baseW * this.scale}px`;
      this.canvasClip.style.height = `${this.baseH * this.scale}px`;
    }

    // Dispatch custom event for other systems
    window.dispatchEvent(new CustomEvent('game-resize', {
      detail: { scale: this.scale, isMobile: this.isMobile }
    }));
  }

  /** Get the current scale — used for converting touch coords to game coords */
  getScale() {
    return this.scale;
  }

  /** Convert a page-relative coordinate to canvas game coordinate */
  pageToGame(pageX, pageY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (pageX - rect.left) / this.scale,
      y: (pageY - rect.top)  / this.scale,
    };
  }
}
