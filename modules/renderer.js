/* ═══════════════════════════════════════════════════════════
   Renderer — All drawing logic.
   Draws grid, BFS paths, enemies, player, HUD overlays.
   ═══════════════════════════════════════════════════════════ */

export class Renderer {
  constructor(ctx, width, height, cellSize = 40) {
    this.ctx      = ctx;
    this.w        = width;
    this.h        = height;
    this.cellSize = cellSize;

    // Pre-build vignette
    this._vignette = this._createVignette();

    // Screen-shake state
    this.shakeTimer    = 0;
    this.shakeStrength = 0;
  }

  /* ── Trigger screen shake ───────────────────── */
  shake(strength = 6, duration = 0.2) {
    this.shakeStrength = strength;
    this.shakeTimer    = duration;
  }

  /* ── Apply / decay shake ────────────────────── */
  _applyShake(dt) {
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const s = this.shakeStrength * (this.shakeTimer > 0 ? 1 : 0);
      const ox = (Math.random() - 0.5) * s * 2;
      const oy = (Math.random() - 0.5) * s * 2;
      this.ctx.translate(ox, oy);
      return true;
    }
    return false;
  }

  /* ── Clear ──────────────────────────────────── */
  clear(dt) {
    const { ctx, w, h } = this;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0e0e1a';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Apply shake offset for this frame
    ctx.save();
    this._applyShake(dt || 0);
  }

  /** Call after all drawing to restore shake transform. */
  endFrame() {
    this.ctx.restore();
  }

  /* ── Subtle neon grid ───────────────────────── */
  drawGrid() {
    const { ctx, w, h, cellSize } = this;

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
    ctx.lineWidth   = 1;
    ctx.beginPath();

    for (let x = cellSize; x < w; x += cellSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = cellSize; y < h; y += cellSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }

    ctx.stroke();
  }

  /* ── BFS Path tiles ─────────────────────────── */
  drawPaths(enemyManager) {
    const { ctx, cellSize } = this;
    const half = cellSize;
    const pulse = 0.5 + 0.3 * Math.sin(performance.now() * 0.004);

    for (const enemy of enemyManager) {
      if (!enemy.path || enemy.path.length < 2) continue;

      const pathLen = enemy.path.length;
      for (let i = 0; i < pathLen - 1; i++) {
        const [c, r] = enemy.path[i];
        // Fade: brighter near enemy, dimmer near player
        const t     = i / pathLen;
        const alpha = (0.08 + 0.06 * (1 - t)) * pulse;

        ctx.fillStyle = `rgba(255, 34, 68, ${alpha})`;
        ctx.fillRect(
          c * cellSize + 1,
          r * cellSize + 1,
          cellSize - 2,
          cellSize - 2
        );
      }

      // Draw thin connecting line along path
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 34, 68, ${0.15 * pulse})`;
      ctx.lineWidth   = 1.5;
      for (let i = 0; i < pathLen; i++) {
        const [c, r] = enemy.path[i];
        const px = c * cellSize + cellSize / 2;
        const py = r * cellSize + cellSize / 2;
        if (i === 0) ctx.moveTo(px, py);
        else         ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  /* ── Player (with glow + trail) ─────────────── */
  drawPlayer(player) {
    const { ctx } = this;
    const { x, y, size, color, trailAlpha, vx, vy } = player;
    const half = size / 2;

    ctx.save();

    // Motion trail
    if (trailAlpha > 0.05) {
      const speed    = Math.hypot(vx, vy);
      const trailLen = Math.min(speed * 0.08, 28);
      const angle    = Math.atan2(vy, vx);

      const tailX = x - Math.cos(angle) * trailLen;
      const tailY = y - Math.sin(angle) * trailLen;

      const grad = ctx.createLinearGradient(tailX, tailY, x, y);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, `rgba(0, 240, 255, ${0.25 * trailAlpha})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth   = size * 0.6;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // Outer glow
    ctx.shadowColor   = color;
    ctx.shadowBlur    = 22;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(x - half, y - half, size, size);

    // Inner highlight
    ctx.shadowBlur = 0;
    const innerPad = 4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x - half + innerPad, y - half + innerPad,
                 size - innerPad * 2, size - innerPad * 2);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x - half + 0.5, y - half + 0.5, size - 1, size - 1);

    ctx.restore();
  }

  /* ── Hit flash on player ────────────────────── */
  drawHitFlash(player, hitTimer) {
    if (hitTimer <= 0) return;
    const { ctx } = this;
    const { x, y, size } = player;
    const half  = size / 2;
    const alpha = hitTimer * 3; // fade out

    ctx.save();
    ctx.fillStyle   = `rgba(255, 60, 60, ${Math.min(alpha, 0.6)})`;
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur  = 30;
    ctx.fillRect(x - half - 4, y - half - 4, size + 8, size + 8);
    ctx.restore();
  }

  /* ── Enemies (red glowing squares + priority rank) ── */
  drawEnemies(enemyManager) {
    const { ctx } = this;

    for (const enemy of enemyManager) {
      const { x, y, size, color, rank, priority } = enemy;
      const half = size / 2;

      ctx.save();

      // Closest enemy glows brighter (rank 1 = most urgent)
      const intensity = rank <= 1 ? 1.0 : rank <= 3 ? 0.7 : 0.45;

      // Outer glow
      ctx.shadowColor   = color;
      ctx.shadowBlur    = rank <= 1 ? 26 : 18;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.globalAlpha   = 0.5 + 0.5 * intensity;

      // Body
      ctx.fillStyle = color;
      ctx.fillRect(x - half, y - half, size, size);

      // Inner core
      ctx.shadowBlur = 0;
      const pad = 3;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + 0.15 * intensity})`;
      ctx.fillRect(x - half + pad, y - half + pad,
                   size - pad * 2, size - pad * 2);

      // Border (brighter for #1)
      ctx.strokeStyle = rank <= 1
        ? 'rgba(255, 200, 200, 0.6)'
        : 'rgba(255, 120, 120, 0.35)';
      ctx.lineWidth   = rank <= 1 ? 1.5 : 1;
      ctx.strokeRect(x - half + 0.5, y - half + 0.5, size - 1, size - 1);

      ctx.globalAlpha = 1;

      // ── Priority rank label above the enemy ──
      if (rank > 0) {
        ctx.font         = '700 9px Orbitron, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'bottom';

        // Rank badge
        const labelY = y - half - 4;
        const label  = `#${rank}`;

        // Glow on top-ranked
        if (rank <= 3) {
          ctx.shadowColor = '#ff6b6b';
          ctx.shadowBlur  = 6;
        }

        ctx.fillStyle = rank <= 1 ? '#ffcc00'
                      : rank <= 3 ? '#ff8866'
                      : 'rgba(255, 180, 180, 0.5)';
        ctx.fillText(label, x, labelY);

        // Distance below
        ctx.shadowBlur = 0;
        ctx.font       = '400 7px Rajdhani, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(200, 200, 220, 0.35)';
        ctx.fillText(`${Math.round(priority)}px`, x, y + half + 3);
      }

      ctx.restore();
    }
  }

  /* ── Health bar (drawn on canvas) ───────────── */
  drawHealth(hp, maxHp) {
    const { ctx } = this;
    const startX = 14;
    const startY = 14;
    const heartSize = 14;
    const gap = 6;

    ctx.save();
    ctx.font = `${heartSize}px sans-serif`;
    ctx.textBaseline = 'top';

    for (let i = 0; i < maxHp; i++) {
      const filled = i < hp;
      ctx.fillStyle = filled
        ? '#ff2244'
        : 'rgba(255, 34, 68, 0.2)';
      ctx.shadowColor = filled ? '#ff2244' : 'transparent';
      ctx.shadowBlur  = filled ? 8 : 0;
      ctx.fillText('♥', startX + i * (heartSize + gap), startY);
    }

    ctx.restore();
  }

  /* ── Score (drawn on canvas) ────────────────── */
  drawScore(score) {
    const { ctx, w } = this;
    ctx.save();

    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.font         = '700 16px Orbitron, sans-serif';
    ctx.fillStyle    = 'rgba(57, 255, 20, 0.8)';
    ctx.shadowColor  = '#39ff14';
    ctx.shadowBlur   = 8;
    ctx.fillText(`SCORE: ${score}`, w - 14, 14);

    ctx.restore();
  }

  /* ── Pause overlay ──────────────────────────── */
  drawPauseOverlay() {
    const { ctx, w, h } = this;
    ctx.save();

    ctx.fillStyle = 'rgba(5, 5, 15, 0.7)';
    ctx.fillRect(0, 0, w, h);

    const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.003);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font         = '900 48px Orbitron, sans-serif';
    ctx.fillStyle    = `rgba(0, 240, 255, ${pulse})`;
    ctx.shadowColor  = '#00f0ff';
    ctx.shadowBlur   = 30 * pulse;
    ctx.fillText('PAUSED', w / 2, h / 2 - 16);

    ctx.shadowBlur = 0;
    ctx.font       = '400 14px Orbitron, sans-serif';
    ctx.fillStyle  = `rgba(107, 115, 148, ${0.5 + 0.3 * pulse})`;
    ctx.fillText('Press  ESC  or  P  to resume', w / 2, h / 2 + 30);

    ctx.restore();
  }

  /* ── Game Over overlay ──────────────────────── */
  drawGameOver(score) {
    const { ctx, w, h } = this;
    ctx.save();

    ctx.fillStyle = 'rgba(5, 5, 15, 0.85)';
    ctx.fillRect(0, 0, w, h);

    const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.003);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.font        = '900 44px Orbitron, sans-serif';
    ctx.fillStyle   = `rgba(255, 0, 229, ${pulse})`;
    ctx.shadowColor = '#ff00e5';
    ctx.shadowBlur  = 30 * pulse;
    ctx.fillText('GAME OVER', w / 2, h / 2 - 40);

    // Score
    ctx.shadowBlur = 0;
    ctx.font       = '700 20px Orbitron, sans-serif';
    ctx.fillStyle  = 'rgba(57, 255, 20, 0.9)';
    ctx.fillText(`SCORE: ${score}`, w / 2, h / 2 + 10);

    // Hint
    ctx.font      = '400 13px Orbitron, sans-serif';
    ctx.fillStyle = `rgba(107, 115, 148, ${0.5 + 0.3 * pulse})`;
    ctx.fillText('Press  R  to restart', w / 2, h / 2 + 50);

    ctx.restore();
  }

  /* ── Power-ups on field ─────────────────────── */
  drawPowerUps(powerUps) {
    const { ctx } = this;

    for (const pu of powerUps) {
      if (!pu.alive) continue;
      const { x, y, size, color, glow, symbol, age } = pu;
      const half = size / 2;
      const bob = Math.sin(age * 3) * 3;

      ctx.save();
      const pulse = 0.6 + 0.4 * Math.sin(age * 5);
      ctx.shadowColor = color;
      ctx.shadowBlur  = 14 * pulse;

      // Diamond shape (rotated square)
      ctx.translate(x, y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.fillRect(-half, -half, size, size);

      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 * pulse})`;
      ctx.fillRect(-half + 3, -half + 3, size - 6, size - 6);
      ctx.restore();

      // Symbol above
      ctx.save();
      ctx.font         = '12px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle    = color;
      ctx.shadowColor  = color;
      ctx.shadowBlur   = 6;
      ctx.fillText(symbol, x, y + bob - half - 4);
      ctx.restore();
    }
  }

  /* ── Shield ring around player ─────────────── */
  drawShield(player) {
    const { ctx } = this;
    const { x, y, size } = player;
    const radius = size / 2 + 8;
    const pulse  = 0.5 + 0.5 * Math.sin(performance.now() * 0.006);

    ctx.save();
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.4 + 0.3 * pulse})`;
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 12 * pulse;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.15 + 0.1 * pulse})`;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /* ── Power-up stack inventory (bottom-left) ─── */
  drawPowerUpStack(stackItems, POWERUP_DEFS) {
    const { ctx } = this;
    if (stackItems.length === 0) return;

    const boxSize = 28;
    const gap     = 4;
    const startX  = 14;
    const startY  = this.h - 14 - boxSize;

    ctx.save();

    // Label
    ctx.fillStyle    = 'rgba(200, 200, 220, 0.4)';
    ctx.font         = '9px Orbitron, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('POWER-UPS [E]', startX, startY - 10);

    for (let i = 0; i < stackItems.length; i++) {
      const type = stackItems[i];
      const def  = POWERUP_DEFS[type];
      const bx   = startX + i * (boxSize + gap);
      const by   = startY;
      const isTop = i === 0;

      ctx.save();
      ctx.fillStyle   = `rgba(20, 20, 40, ${isTop ? 0.8 : 0.5})`;
      ctx.strokeStyle = isTop ? def.color : 'rgba(200, 200, 220, 0.15)';
      ctx.lineWidth   = isTop ? 1.5 : 0.5;
      if (isTop) { ctx.shadowColor = def.color; ctx.shadowBlur = 8; }

      // Rounded rect
      const r = 4;
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + boxSize - r, by);
      ctx.quadraticCurveTo(bx + boxSize, by, bx + boxSize, by + r);
      ctx.lineTo(bx + boxSize, by + boxSize - r);
      ctx.quadraticCurveTo(bx + boxSize, by + boxSize, bx + boxSize - r, by + boxSize);
      ctx.lineTo(bx + r, by + boxSize);
      ctx.quadraticCurveTo(bx, by + boxSize, bx, by + boxSize - r);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Symbol
      ctx.shadowBlur   = 0;
      ctx.font         = '14px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = `rgba(255,255,255,${isTop ? 0.9 : 0.35})`;
      ctx.fillText(def.symbol, bx + boxSize / 2, by + boxSize / 2);
      ctx.restore();
    }

    ctx.restore();
  }

  /* ── Activation flash ──────────────────────── */
  drawActivationFlash(timer, color) {
    if (timer <= 0) return;
    const { ctx, w, h } = this;
    const alpha = Math.min(timer * 2, 0.2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = color;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* ── Collectible items on field ──────────────── */
  drawItems(items) {
    const { ctx } = this;

    for (const item of items) {
      if (!item.alive) continue;
      const { x, y, size, color, glow, symbol, age } = item;
      const bob    = Math.sin(age * 2.5) * 2.5;
      const pulse  = 0.5 + 0.5 * Math.sin(age * 4);
      const radius = size / 2 + 2;

      ctx.save();

      // Outer glow ring
      ctx.shadowColor = glow;
      ctx.shadowBlur  = 10 * pulse;
      ctx.strokeStyle = `rgba(${this._hexToRgb(color)}, ${0.3 + 0.2 * pulse})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(x, y + bob, radius + 2, 0, Math.PI * 2);
      ctx.stroke();

      // Filled circle
      ctx.fillStyle = `rgba(${this._hexToRgb(color)}, ${0.15 + 0.08 * pulse})`;
      ctx.beginPath();
      ctx.arc(x, y + bob, radius, 0, Math.PI * 2);
      ctx.fill();

      // Symbol
      ctx.shadowBlur   = 4;
      ctx.font         = '13px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle    = '#fff';
      ctx.fillText(symbol, x, y + bob);

      ctx.restore();
    }
  }

  /** Helper: hex color to "r, g, b" string. */
  _hexToRgb(hex) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  /* ── Vignette overlay ───────────────────────── */
  drawVignette() {
    this.ctx.drawImage(this._vignette, 0, 0);
  }

  /* ── (private) Create radial vignette ───────── */
  _createVignette() {
    const c = document.createElement('canvas');
    c.width  = this.w;
    c.height = this.h;
    const vc = c.getContext('2d');

    const cx = this.w / 2;
    const cy = this.h / 2;
    const r  = Math.hypot(cx, cy);

    const grad = vc.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');

    vc.fillStyle = grad;
    vc.fillRect(0, 0, this.w, this.h);

    return c;
  }
}
