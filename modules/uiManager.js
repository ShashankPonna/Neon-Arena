/* ═══════════════════════════════════════════════════════════
   uiManager.js — User Interface and DOM Controller
   Isolates all document.getElementById calls, modal toggles,
   and frame-by-frame HUD updates.
   ═══════════════════════════════════════════════════════════ */

import { ITEM_DEFS } from './item.js';
import { audio } from './audio.js';
import { CONFIG } from './config.js';

export class UIManager {
  constructor(state, input, restartCb, startGameCb, useItemCb, skillUnlockCb) {
    this.state = state;
    
    // Callbacks to main game loop
    this.restartCb     = restartCb;
    this.startGameCb   = startGameCb;
    this.useItemCb     = useItemCb;
    this.skillUnlockCb = skillUnlockCb;

    // Grab HUD DOM elements
    this.fpsEl      = document.getElementById('fps-counter');
    this.posEl      = document.getElementById('pos-display');
    this.queueEl    = document.getElementById('queue-size');
    this.enemyCtEl  = document.getElementById('enemy-count');
    this.scoreEl    = document.getElementById('score-display');
    this.spawnEl    = document.getElementById('spawn-rate');
    this.pathBtn    = document.getElementById('btn-show-path');
    this.healthEl   = document.getElementById('health-display');
    this.stackEl    = document.getElementById('stack-size');
    this.priorityEl = document.getElementById('top-priorities');
    this.invCountEl = document.getElementById('inv-count');
    this.invSlotsEl = document.getElementById('inv-slots');

    // Modals
    this.startModal    = document.getElementById('start-screen-modal');
    this.gameOverModal = document.getElementById('game-over-modal');
    this.stModal       = document.getElementById('skill-tree-modal');
    
    this.btnStart      = document.getElementById('btn-start-game');
    this.btnRestart    = document.getElementById('btn-restart-game');
    this.btnCloseTree  = document.getElementById('btn-close-skills');
    
    this.goScoreEl     = document.getElementById('go-score');
    this.goTimeEl      = document.getElementById('go-time');
    this.treeContainer = document.getElementById('tree-container');
    this.stCurrentScore = document.getElementById('st-current-score');

    this.bindEvents(input);
  }

  /* ── Input Binding ──────────────────────────────────────── */
  bindEvents(input) {
    // Show path toggle
    if (this.pathBtn) {
      this.pathBtn.addEventListener('click', () => {
        this.state.set('flags', 'showPaths', !this.state.get('flags', 'showPaths'));
        const show = this.state.get('flags', 'showPaths');
        this.pathBtn.textContent = show ? '🔴 Hide Path' : '◻ Show Path';
        this.pathBtn.classList.toggle('active', show);
      });
    }

    // Modal buttons
    if (this.btnStart) this.btnStart.addEventListener('click', this.startGameCb);
    if (this.btnRestart) {
      this.btnRestart.addEventListener('click', () => {
        if (this.state.get('flags', 'gameOver')) this.restartCb();
      });
    }
    if (this.btnCloseTree) {
      this.btnCloseTree.addEventListener('click', () => {
        if (this.state.get('flags', 'showSkillTree')) this.toggleSkillTree();
      });
    }

    // Hotkey hooks
    input.onTreeToggle(() => this.toggleSkillTree());
  }

  /* ── Screen States ──────────────────────────────────────── */
  showStartScreen() {
    if (this.startModal) this.startModal.classList.remove('hidden');
    if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
  }

  hideModals() {
    if (this.startModal) this.startModal.classList.add('hidden');
    if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
    if (this.stModal) this.stModal.classList.add('hidden');
  }

  showGameOver(score, survivalTime) {
    if (this.gameOverModal) {
      if (this.goScoreEl) this.goScoreEl.textContent = score;
      if (this.goTimeEl)  this.goTimeEl.textContent  = Math.floor(survivalTime);
      this.gameOverModal.classList.remove('hidden');
    }
  }

  /* ── Skill Tree Modal ───────────────────────────────────── */
  setLoopRef(loop) {
    this.loop = loop;
  }
  
  setSkillTreeRef(skillTree) {
    this.skillTreeRef = skillTree;
  }

  toggleSkillTree(skillTreeInstance) {
    if (this.state.get('flags', 'gameOver')) return;
    if (!this.stModal) return;

    const st = skillTreeInstance || this.skillTreeRef;
    const wasShown = this.state.get('flags', 'showSkillTree');
    this.state.set('flags', 'showSkillTree', !wasShown);

    if (!wasShown) {
      if (this.loop && !this.loop.paused) this.loop.togglePause();
      if (st) this.renderSkillTree(st);
      this.stModal.classList.remove('hidden');
    } else {
      if (this.loop && this.loop.paused) this.loop.togglePause();
      this.stModal.classList.add('hidden');
    }
  }

  /* ── Render Recursive Skill Tree ────────────────────────── */
  renderSkillTree(skillTree) {
    if (!this.treeContainer) return;
    const score = this.state.get('player', 'score');
    if (this.stCurrentScore) this.stCurrentScore.textContent = score;

    this.treeContainer.innerHTML = '';

    const buildNodeHTML = (node) => {
      let stateClass = 'locked';
      if (node.unlocked) stateClass = 'unlocked';
      else if (skillTree.canUnlock(node.id) && score >= node.cost) stateClass = 'available';

      const div = document.createElement('div');
      div.className = `skill-node ${stateClass}`;
      div.innerHTML = `
        <div class="sn-name">${node.name}</div>
        <div class="sn-desc">${node.desc}</div>
        <div class="sn-cost">${node.cost} pts</div>
      `;
      div.onclick = () => {
        const curScore = this.state.get('player', 'score');
        if (!node.unlocked && skillTree.canUnlock(node.id) && curScore >= node.cost) {
          this.state.add('player', 'rawScore', -node.cost);
          this.state.set('player', 'score', Math.floor(this.state.get('player', 'rawScore')));
          
          skillTree.unlock(node.id);
          audio.playSkillUnlock();
          
          // Re-render UI after unlock
          if (this.skillUnlockCb) this.skillUnlockCb(node.id);
          this.renderSkillTree(skillTree);
        }
      };

      const li = document.createElement('li');
      li.appendChild(div);

      if (node.children.length > 0) {
        const ul = document.createElement('ul');
        for (const child of node.children) {
          ul.appendChild(buildNodeHTML(child));
        }
        li.appendChild(ul);
      }
      return li;
    };

    skillTree.roots.forEach(root => {
      const col = document.createElement('div');
      col.className = 'tree-branch';

      let titleText = 'SKILLS';
      if (root.id.startsWith('mob_')) titleText = 'MOBILITY';
      else if (root.id.startsWith('surv_')) titleText = 'SURVIVAL';
      else if (root.id.startsWith('util_')) titleText = 'UTILITY';

      col.innerHTML = `<div class="tree-branch-title">${titleText}</div>`;

      const treeUIContainer = document.createElement('div');
      treeUIContainer.className = 'css-tree';

      const rootUl = document.createElement('ul');
      rootUl.appendChild(buildNodeHTML(root));

      treeUIContainer.appendChild(rootUl);
      col.appendChild(treeUIContainer);
      this.treeContainer.appendChild(col);
    });
  }

  /* ── Inventory UI ───────────────────────────────────────── */
  updateInventoryUI(inventory) {
    if (!this.invSlotsEl || !this.invCountEl) return;

    const items = inventory.toArray();
    this.invCountEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;

    const maxSlots = CONFIG.MAX_INVENTORY || 8;
    let html = '';
    
    for (let i = 0; i < maxSlots; i++) {
      html += '<div class="inv-slot">';
      
      if (i < items.length) {
        const item = items[i];
        const def  = ITEM_DEFS[item.type];
        html += `<div class="inv-item" data-idx="${i}" title="${def.name}: ${def.desc}">`;
        html += `${def.symbol}`;
        html += `<span class="inv-tooltip">${def.name}: ${def.desc}</span>`;
        html += '</div>';
      } else {
        html += '<div class="inv-empty-box"></div>';
      }

      if (i < maxSlots - 1) {
        html += '<span class="inv-arrow">→</span>';
      }
      html += '</div>';
    }

    this.invSlotsEl.innerHTML = html;

    this.invSlotsEl.querySelectorAll('.inv-item').forEach((el) => {
      el.addEventListener('click', () => {
        if (this.state.get('flags', 'gameOver') || (this.loop && this.loop.paused)) return;
        const idx  = parseInt(el.dataset.idx, 10);
        const item = inventory.removeAt(idx);
        if (item) {
          this.useItemCb(item);
          this.updateInventoryUI(inventory);
        }
      });
    });
  }

  /* ── HUD Frame Update ───────────────────────────────────── */
  updateHUD(fps, paused, player, enemyManager, puStack) {
    const isOver = this.state.get('flags', 'gameOver');
    const score  = this.state.get('player', 'score');
    const hp     = this.state.get('player', 'hp');
    const maxHp  = this.state.get('player', 'maxHp');

    this.fpsEl.textContent   = isOver ? 'GAME OVER' : paused ? 'PAUSED' : `FPS: ${fps}`;
    this.posEl.textContent   = `X: ${Math.round(player.x)}  Y: ${Math.round(player.y)}`;
    
    // Fallback queueSize or generic enemy count
    const qSize = enemyManager ? enemyManager.queueSize : 0;
    this.queueEl.textContent   = this.state.get('enemy', 'count') || qSize;
    this.enemyCtEl.textContent = this.state.get('enemy', 'count') || qSize;
    this.scoreEl.textContent   = score;

    if (this.spawnEl && enemyManager) {
      this.spawnEl.textContent = enemyManager.effectiveInterval.toFixed(1) + 's';
    }

    if (this.healthEl) {
      this.healthEl.textContent = '♥'.repeat(hp) + '♡'.repeat(Math.max(0, maxHp - hp));
    }

    if (this.stackEl) this.stackEl.textContent = puStack.size;

    if (this.priorityEl && enemyManager) {
      const top = enemyManager.topPriorities;
      this.priorityEl.textContent = top.length > 0 ? top.join(', ') + 'px' : '—';
    }
  }
}
