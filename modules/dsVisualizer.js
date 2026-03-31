/* ═══════════════════════════════════════════════════════════
   dsVisualizer.js — Data Structure Visualization Mode
   Draws real-time overlays on the canvas showing which DS
   is active and what it contains at any given moment.
   Toggle with V key.
   ═══════════════════════════════════════════════════════════ */

const DS_COLORS = {
  queue:        '#ff6b35',
  stack:        '#b14eff',
  heap:         '#ff2244',
  graph:        '#39ff14',
  tree:         '#00f0ff',
  linkedList:   '#ff00e5',
  hashMap:      '#ffd700',
  array:        '#00e5ff',
};

/**
 * Each DS card definition:
 *   label   — display name
 *   ds      — short technical name
 *   color   — neon accent colour
 *   getData — fn(ctx) → { summary, detail, items[], active }
 */
function buildCards(ctx) {
  const { state, enemyManager, itemManager, pathfinder, skillTree, grid } = ctx;

  return [
    {
      label: 'QUEUE',
      ds: 'FIFO Linked-List',
      color: DS_COLORS.queue,
      icon: '⟳',
      getData() {
        const count = enemyManager.queueSize;
        const rate  = enemyManager.effectiveInterval.toFixed(1);
        return {
          summary: `${count} enemies queued`,
          detail: `Spawn rate: ${rate}s`,
          active: count > 0,
          items: [`Size: ${count}`, `Interval: ${rate}s`],
        };
      },
    },
    {
      label: 'STACK',
      ds: 'LIFO Linked-List',
      color: DS_COLORS.stack,
      icon: '⇅',
      getData() {
        const st = itemManager.puStack;
        const items = [...st];
        return {
          summary: `${st.size} power-ups stacked`,
          detail: st.peek() ? `Top: ${st.peek()}` : 'Empty',
          active: st.size > 0,
          items: items.length > 0 ? items.map((v, i) => i === 0 ? `→ ${v}` : `  ${v}`) : ['(empty)'],
        };
      },
    },
    {
      label: 'MIN-HEAP',
      ds: 'Binary Heap (PQ)',
      color: DS_COLORS.heap,
      icon: '△',
      getData() {
        const pq = enemyManager.pq;
        const top = enemyManager.topPriorities;
        return {
          summary: `${pq.size} entries`,
          detail: top.length ? `Nearest: ${top[0]}px` : '—',
          active: pq.size > 0,
          items: top.slice(0, 5).map((d, i) => `#${i + 1}: ${d}px`),
        };
      },
    },
    {
      label: 'GRAPH',
      ds: 'BFS Flow-Field',
      color: DS_COLORS.graph,
      icon: '⬡',
      getData() {
        const cells = grid.cols * grid.rows;
        const visited = pathfinder.distField
          ? pathfinder.distField.flat().filter(d => d !== Infinity).length
          : 0;
        return {
          summary: `${grid.cols}×${grid.rows} grid (${cells} nodes)`,
          detail: `${visited} cells visited`,
          active: visited > 0,
          items: [`Nodes: ${cells}`, `Visited: ${visited}`, `Algo: BFS`],
        };
      },
    },
    {
      label: 'TREE',
      ds: 'N-ary Skill Tree',
      color: DS_COLORS.tree,
      icon: '🌿',
      getData() {
        if (!skillTree) return { summary: '—', detail: '', active: false, items: [] };
        const all = skillTree.getAllNodes();
        const unlocked = all.filter(n => n.unlocked).length;
        return {
          summary: `${all.length} nodes`,
          detail: `${unlocked} unlocked`,
          active: unlocked > 0,
          items: all.slice(0, 6).map(n => `${n.unlocked ? '✓' : '○'} ${n.name}`),
        };
      },
    },
    {
      label: 'LINKED LIST',
      ds: 'Doubly-Linked',
      color: DS_COLORS.linkedList,
      icon: '⇔',
      getData() {
        const inv = itemManager.inventory;
        const items = inv.toArray();
        return {
          summary: `${inv.size} inventory items`,
          detail: inv.size > 0 ? 'Head → … → Tail' : 'Empty',
          active: inv.size > 0,
          items: items.length > 0 ? items.map(i => i.type) : ['(empty)'],
        };
      },
    },
    {
      label: 'HASHMAP',
      ds: 'Map (O(1) lookup)',
      color: DS_COLORS.hashMap,
      icon: '{}',
      getData() {
        const cats = state.categories;
        let totalKeys = 0;
        for (const c of cats) {
          const m = state.map(c);
          if (m) totalKeys += m.size;
        }
        return {
          summary: `${cats.length} categories, ${totalKeys} keys`,
          detail: cats.join(', '),
          active: true,
          items: cats.map(c => {
            const m = state.map(c);
            return `${c}: ${m ? m.size : 0} keys`;
          }),
        };
      },
    },
    {
      label: 'ARRAY',
      ds: 'Dynamic Array',
      color: DS_COLORS.array,
      icon: '[]',
      getData() {
        const enemies  = enemyManager.queueSize;
        const powerups = itemManager.fieldPowerUps.length;
        const items    = itemManager.fieldItems.length;
        return {
          summary: `${enemies + powerups + items} field entities`,
          detail: `E:${enemies} P:${powerups} I:${items}`,
          active: (enemies + powerups + items) > 0,
          items: [
            `Enemies[]: ${enemies}`,
            `PowerUps[]: ${powerups}`,
            `Items[]: ${items}`,
          ],
        };
      },
    },
  ];
}

export class DSVisualizer {
  constructor(canvasCtx, canvasW, canvasH) {
    this.ctx = canvasCtx;
    this.w   = canvasW;
    this.h   = canvasH;
    this.enabled = false;

    /** @type {ReturnType<typeof buildCards>} */
    this.cards = [];

    // Flash timers per card — glow brighter on activity change
    this.flashTimers = {};
    this.prevActive  = {};
  }

  /** Call once after all managers are ready */
  init(context) {
    this.context = context;
    this.cards   = buildCards(context);
    for (const c of this.cards) {
      this.flashTimers[c.label] = 0;
      this.prevActive[c.label]  = false;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
  }

  /** Call every frame from the render pipeline */
  render(dt) {
    if (!this.enabled || !this.cards.length) return;

    const ctx = this.ctx;
    const cardW = 175;
    const cardH = 108;
    const gap   = 6;
    const cols  = 4;
    const rows  = 2;
    const totalW = cols * cardW + (cols - 1) * gap;
    const totalH = rows * cardH + (rows - 1) * gap;
    const startX = (this.w - totalW) / 2;
    const startY = (this.h - totalH) / 2;

    // Semi-transparent backdrop
    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 18, 0.75)';
    ctx.fillRect(0, 0, this.w, this.h);

    // Title
    ctx.font         = '900 16px Orbitron, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = '#00f0ff';
    ctx.shadowColor  = '#00f0ff';
    ctx.shadowBlur   = 12;
    ctx.fillText('DATA STRUCTURE VISUALIZATION — [V] to close', this.w / 2, startY - 28);
    ctx.shadowBlur   = 0;

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const data = card.getData();
      const col  = i % cols;
      const row  = Math.floor(i / cols);
      const x    = startX + col * (cardW + gap);
      const y    = startY + row * (cardH + gap);

      // Flash detection
      if (data.active && !this.prevActive[card.label]) {
        this.flashTimers[card.label] = 0.5;
      }
      this.prevActive[card.label] = data.active;
      if (this.flashTimers[card.label] > 0) {
        this.flashTimers[card.label] = Math.max(0, this.flashTimers[card.label] - dt);
      }

      const isFlashing = this.flashTimers[card.label] > 0;
      const glowAlpha  = data.active ? (isFlashing ? 0.35 : 0.15) : 0.05;
      const borderAlpha = data.active ? (isFlashing ? 0.9 : 0.5) : 0.15;

      // Card background
      ctx.fillStyle = `rgba(18, 18, 30, 0.92)`;
      ctx.strokeStyle = this._withAlpha(card.color, borderAlpha);
      ctx.lineWidth = data.active ? 2 : 1;
      ctx.shadowColor = card.color;
      ctx.shadowBlur  = data.active ? 10 : 0;
      this._roundRect(ctx, x, y, cardW, cardH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Active glow strip at top
      if (data.active) {
        ctx.fillStyle = this._withAlpha(card.color, glowAlpha);
        this._roundRect(ctx, x, y, cardW, 3, 6);
        ctx.fill();
      }

      // Icon + Label
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.font      = '700 11px Orbitron, sans-serif';
      ctx.fillStyle = card.color;
      ctx.shadowColor = card.color;
      ctx.shadowBlur  = data.active ? 6 : 0;
      ctx.fillText(`${card.icon} ${card.label}`, x + 8, y + 8);
      ctx.shadowBlur = 0;

      // DS sub-label
      ctx.font      = '600 8px Rajdhani, sans-serif';
      ctx.fillStyle = this._withAlpha(card.color, 0.6);
      ctx.fillText(card.ds, x + 8, y + 22);

      // Summary
      ctx.font      = '600 10px Rajdhani, sans-serif';
      ctx.fillStyle = '#e0e6f0';
      ctx.fillText(data.summary, x + 8, y + 36);

      // Detail
      ctx.font      = '400 9px Rajdhani, sans-serif';
      ctx.fillStyle = '#6b7394';
      ctx.fillText(data.detail, x + 8, y + 50);

      // Items list
      ctx.font      = '400 9px Rajdhani, sans-serif';
      ctx.fillStyle = this._withAlpha(card.color, 0.7);
      const maxItems = 3;
      for (let j = 0; j < Math.min(data.items.length, maxItems); j++) {
        ctx.fillText(data.items[j], x + 8, y + 64 + j * 12);
      }
      if (data.items.length > maxItems) {
        ctx.fillStyle = '#6b7394';
        ctx.fillText(`+${data.items.length - maxItems} more…`, x + 8, y + 64 + maxItems * 12);
      }

      // Active dot
      ctx.beginPath();
      ctx.arc(x + cardW - 12, y + 12, 4, 0, Math.PI * 2);
      ctx.fillStyle = data.active ? card.color : '#2a2a40';
      ctx.shadowColor = data.active ? card.color : 'transparent';
      ctx.shadowBlur  = data.active ? 8 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  /* ── Helpers ─────────────────────────────────── */
  _withAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
