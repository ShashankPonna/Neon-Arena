/* ═══════════════════════════════════════════════════════════
   game.js — Main entry point
   Wires together all modules and kicks off the game loop.
   Uses centralized GameState HashMap for all mutable state.
   ═══════════════════════════════════════════════════════════ */

import { GameLoop }      from './modules/gameLoop.js';
import { Player }        from './modules/player.js';
import { Renderer }      from './modules/renderer.js';
import { Input }         from './modules/input.js';
import { EnemyManager }  from './modules/enemyManager.js';
import { Grid }          from './modules/grid.js';
import { Pathfinder }    from './modules/pathfinding.js';
import { Stack }         from './modules/stack.js';
import { LinkedList }    from './modules/linkedList.js';
import { PowerUp, POWERUP_DEFS } from './modules/powerUp.js';
import { Item, ITEM_DEFS }       from './modules/item.js';
import { SkillTree, SkillNode }  from './modules/tree.js';
import { GameState }             from './modules/gameState.js';
import { audio }                 from './modules/audio.js';

// ── Constants ─────────────────────────────────────────────
const CANVAS_W  = 800;
const CANVAS_H  = 480;
const CELL_SIZE = 40;

// Power-up spawn config
const PU_SPAWN_MIN  = 6;
const PU_SPAWN_MAX  = 12;
const PU_MAX_FIELD  = 3;
const SPEED_BOOST   = 1.8;
const SPEED_DUR     = 3;

// Item spawn config
const ITEM_SPAWN_MIN = 4;
const ITEM_SPAWN_MAX = 8;
const ITEM_MAX_FIELD = 4;
const MAX_INVENTORY  = 8;
const STAR_DUR       = 3;
const GEM_DUR        = 5;

// ── Canvas Setup ──────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;

// ── HUD DOM elements ─────────────────────────────────────
const fpsEl      = document.getElementById('fps-counter');
const posEl      = document.getElementById('pos-display');
const queueEl    = document.getElementById('queue-size');
const enemyCtEl  = document.getElementById('enemy-count');
const scoreEl    = document.getElementById('score-display');
const spawnEl    = document.getElementById('spawn-rate');
const pathBtn    = document.getElementById('btn-show-path');
const healthEl   = document.getElementById('health-display');
const stackEl    = document.getElementById('stack-size');
const priorityEl = document.getElementById('top-priorities');
const invCountEl = document.getElementById('inv-count');
const invSlotsEl = document.getElementById('inv-slots');

// Overlay elements
const startModal    = document.getElementById('start-screen-modal');
const gameOverModal = document.getElementById('game-over-modal');
const btnStart      = document.getElementById('btn-start-game');
const btnRestart    = document.getElementById('btn-restart-game');
const goScoreEl     = document.getElementById('go-score');
const goTimeEl      = document.getElementById('go-time');
let survivalTime    = 0;

// ── Centralized Game State (HashMap) ──────────────────────
const state = new GameState();

// Flash color is a simple string, keep it outside the numeric map
let activateFlashColor = '#fff';

// Skill tree instance (not numeric state)
let skillTree = null;

// ── Create game objects ───────────────────────────────────
const input        = new Input();
const player       = new Player(CANVAS_W / 2, CANVAS_H / 2);
const renderer     = new Renderer(ctx, CANVAS_W, CANVAS_H, CELL_SIZE);
const enemyManager = new EnemyManager(CANVAS_W, CANVAS_H, 2);
const grid         = new Grid(CANVAS_W, CANVAS_H, CELL_SIZE);
const pathfinder   = new Pathfinder(grid);
const puStack      = new Stack(10);
const inventory    = new LinkedList();

let loop;

/** @type {PowerUp[]} */
let fieldPowerUps = [];

/** @type {Item[]} */
let fieldItems = [];

// ── Toggle "Show Path" button ─────────────────────────────
if (pathBtn) {
  pathBtn.addEventListener('click', () => {
    state.set('flags', 'showPaths', !state.get('flags', 'showPaths'));
    const show = state.get('flags', 'showPaths');
    pathBtn.textContent = show ? '🔴 Hide Path' : '◻ Show Path';
    pathBtn.classList.toggle('active', show);
  });
}

// ── Toggle Skill Tree Modal ──────────────────────────────
function toggleSkillTree() {
  if (state.get('flags', 'gameOver')) return;
  const stModal = document.getElementById('skill-tree-modal');
  if (!stModal) return;

  const wasShown = state.get('flags', 'showSkillTree');
  state.set('flags', 'showSkillTree', !wasShown);

  if (!wasShown) {
    if (!loop.paused) loop.togglePause();
    renderSkillTree();
    stModal.classList.remove('hidden');
  } else {
    if (loop.paused) loop.togglePause();
    stModal.classList.add('hidden');
  }
}

const btnClose = document.getElementById('btn-close-skills');
if (btnClose) {
  btnClose.addEventListener('click', () => {
    if (state.get('flags', 'showSkillTree')) toggleSkillTree();
  });
}

// ── Restart helper ────────────────────────────────────────
function restart() {
  // Reset all state to defaults via HashMap
  state.reset();
  activateFlashColor = '#fff';

  fieldPowerUps   = [];
  fieldItems      = [];
  player.x        = CANVAS_W / 2;
  player.y        = CANVAS_H / 2;
  player.vx       = 0;
  player.vy       = 0;
  player.speed    = state.get('player', 'baseSpeed');

  // Re-init skills
  initSkillTree();
  const stModal = document.getElementById('skill-tree-modal');
  if (stModal) stModal.classList.add('hidden');

  enemyManager.reset();
  puStack.clear();
  inventory.clear();
  updateInventoryUI();

  if (gameOverModal) gameOverModal.classList.add('hidden');
  state.set('flags', 'gameStarted', true);
  survivalTime = 0;
}

// ── Start Game logic ──────────────────────────────────────
function startGame() {
  audio.init();
  audio.playStart();
  state.set('flags', 'gameStarted', true);
  if (startModal) startModal.classList.add('hidden');
}

if (btnStart) btnStart.addEventListener('click', startGame);
if (btnRestart) btnRestart.addEventListener('click', () => {
  if (state.get('flags', 'gameOver')) restart();
});

// ── Initialize Skill Tree ─────────────────────────────────
function initSkillTree() {
  skillTree = new SkillTree();

  // Reset skill-related state in the HashMap
  state.set('flags', 'unlockDash', false);
  state.set('timers', 'dashCooldown', 0);
  state.set('timers', 'dashActive', 0);
  state.set('skills', 'hpRegenRate', 0);
  state.set('timers', 'regenAccum', 0);
  state.set('player', 'magnetRadius', 0);
  state.set('player', 'coinValue', 5);
  state.set('skills', 'itemSpawnRate', 1.0);
  state.set('skills', 'puSpawnRate', 1.0);
  state.set('player', 'accelMultiplier', 1.0);
  state.set('skills', 'invulnDuration', 0.35);
  state.set('skills', 'resDurationMod', 1.0);

  // Tree 1: Mobility
  const mobBase = skillTree.addRoot(new SkillNode('mob_1', 'Agility', '+1.0 Base Speed', 50, () => {
    state.add('player', 'baseSpeed', 1.0);
    player.speed = state.get('player', 'baseSpeed');
  }));
    const mobSprint = mobBase.addChild(new SkillNode('mob_sprint', 'Sprint', '+1.0 Base Speed', 150, () => {
      state.add('player', 'baseSpeed', 1.0);
      player.speed = state.get('player', 'baseSpeed');
    }));
      mobSprint.addChild(new SkillNode('mob_dash', 'Dash', 'Shift to Dash (3s CD)', 400, () => {
        state.set('flags', 'unlockDash', true);
      }));
    const mobReflex = mobBase.addChild(new SkillNode('mob_reflex', 'Reflexes', '+30% Acceleration', 150, () => {
      state.set('player', 'accelMultiplier', 1.3);
    }));
      mobReflex.addChild(new SkillNode('mob_ghost', 'Ghost', '+1s Hit Invuln', 400, () => {
        state.set('skills', 'invulnDuration', 1.35);
      }));

  // Tree 2: Survival
  const survBase = skillTree.addRoot(new SkillNode('surv_1', 'Vitality', '+2 Max HP', 100, () => {
    state.add('player', 'maxHp', 2);
    state.set('player', 'hp', state.get('player', 'maxHp'));
  }));
    const survRegen1 = survBase.addChild(new SkillNode('surv_reg1', 'Regen I', 'Heal 1 HP / 15s', 200, () => {
      state.set('skills', 'hpRegenRate', 1/15);
    }));
      survRegen1.addChild(new SkillNode('surv_reg2', 'Regen II', 'Heal 1 HP / 8s', 500, () => {
        state.set('skills', 'hpRegenRate', 1/8);
      }));
    const survHard = survBase.addChild(new SkillNode('surv_hard', 'Hardened', 'Gain free Shield on Start', 200, () => {
      state.set('flags', 'hasShield', true);
    }));
      survHard.addChild(new SkillNode('surv_jug', 'Juggernaut', '+3 Max HP', 500, () => {
        state.add('player', 'maxHp', 3);
        state.add('player', 'hp', 3);
      }));

  // Tree 3: Utility
  const utilBase = skillTree.addRoot(new SkillNode('util_1', 'Magnet', 'Increase pickup radius', 100, () => {
    state.set('player', 'magnetRadius', 40);
  }));
    const utilFort = utilBase.addChild(new SkillNode('util_fort', 'Fortune', 'Coins give +10 score', 250, () => {
      state.set('player', 'coinValue', 10);
    }));
      utilFort.addChild(new SkillNode('util_res', 'Resonance', 'Gem lasts 8s', 450, () => {
        state.set('skills', 'resDurationMod', 8 / 5);
      }));
    const utilScav = utilBase.addChild(new SkillNode('util_scav', 'Scavenger', 'Collectibles spawn faster', 250, () => {
      state.set('skills', 'itemSpawnRate', 0.8);
    }));
      utilScav.addChild(new SkillNode('util_prov', 'Provisioner', 'Power-ups spawn faster', 450, () => {
        state.set('skills', 'puSpawnRate', 0.8);
      }));

  renderSkillTree();
}

// ── Render Skill Tree UI (Recursive List) ─────────────────
function renderSkillTree() {
  const container = document.getElementById('tree-container');
  const scoreBadge = document.getElementById('st-current-score');
  if (!container) return;
  const score = state.get('player', 'score');
  if (scoreBadge) scoreBadge.textContent = score;

  container.innerHTML = '';

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
      const curScore = state.get('player', 'score');
      if (!node.unlocked && skillTree.canUnlock(node.id) && curScore >= node.cost) {
        state.add('player', 'rawScore', -node.cost);
        state.set('player', 'score', Math.floor(state.get('player', 'rawScore')));
        skillTree.unlock(node.id);
        audio.playSkillUnlock();
        renderSkillTree();
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

    container.appendChild(col);
  });
}

// Initial build
initSkillTree();

// ── Spawn helpers ─────────────────────────────────────────
function spawnPowerUp() {
  if (fieldPowerUps.length >= PU_MAX_FIELD) return;
  const margin = 60;
  const x = margin + Math.random() * (CANVAS_W - margin * 2);
  const y = margin + Math.random() * (CANVAS_H - margin * 2);
  fieldPowerUps.push(new PowerUp(x, y, PowerUp.randomType()));
}

function spawnItem() {
  if (fieldItems.length >= ITEM_MAX_FIELD) return;
  const margin = 60;
  const x = margin + Math.random() * (CANVAS_W - margin * 2);
  const y = margin + Math.random() * (CANVAS_H - margin * 2);
  fieldItems.push(new Item(x, y, Item.randomType()));
}

// ── Activate top power-up from stack ──────────────────────
function activatePowerUp() {
  if (puStack.isEmpty) return;
  const type = puStack.pop();
  const def  = POWERUP_DEFS[type];
  state.set('timers', 'activateFlash', 0.3);
  activateFlashColor = def.color;

  switch (type) {
    case 'shield':
      audio.playPowerup();
      state.set('flags', 'hasShield', true);
      break;
    case 'speed':
      state.set('timers', 'speed', SPEED_DUR);
      player.speed = state.get('player', 'baseSpeed') * SPEED_BOOST;
      break;
    case 'nuke':
      audio.playDamage();
      enemyManager.clearEnemies();
      renderer.shake(12, 0.35);
      break;
  }
}

// ── Use an inventory item ─────────────────────────────────
function useItem(item) {
  const def = ITEM_DEFS[item.type];
  state.set('timers', 'activateFlash', 0.2);
  activateFlashColor = def.color;

  switch (item.type) {
    case 'health':
      state.set('player', 'hp', Math.min(state.get('player', 'maxHp'), state.get('player', 'hp') + 1));
      audio.playPowerup();
      break;
    case 'coin':
      state.add('player', 'rawScore', state.get('player', 'coinValue') * state.get('skills', 'scoreMultiplier'));
      audio.playCoin();
      break;
    case 'star':
      state.set('timers', 'star', STAR_DUR);
      audio.playPowerup();
      break;
    case 'gem':
      state.set('timers', 'gem', GEM_DUR * state.get('skills', 'resDurationMod'));
      state.set('skills', 'scoreMultiplier', 2);
      audio.playPowerup();
      break;
  }
}

// ── Drop last inventory item (Q key) ──────────────────────
function dropLastItem() {
  if (inventory.isEmpty) return;
  const item = inventory.removeLast();
  if (item) {
    item.x = player.x + (Math.random() - 0.5) * 40;
    item.y = player.y + (Math.random() - 0.5) * 40;
    item.x = Math.max(20, Math.min(CANVAS_W - 20, item.x));
    item.y = Math.max(20, Math.min(CANVAS_H - 20, item.y));
    item.age = 0;
    fieldItems.push(item);
    updateInventoryUI();
  }
}

// ── Check player ↔ power-up pickup ────────────────────────
function checkPowerUpCollection() {
  const pSize = player.size / 2;
  const magnet = state.get('player', 'magnetRadius');
  fieldPowerUps = fieldPowerUps.filter((pu) => {
    const dx   = pu.x - player.x;
    const dy   = pu.y - player.y;
    const dist = Math.hypot(dx, dy);
    const minD = pSize + pu.size / 2 + magnet;
    if (dist < minD) {
      puStack.push(pu.type);
      return false;
    }
    return true;
  });
}

// ── Check player ↔ item pickup ────────────────────────────
function checkItemCollection() {
  const pSize = player.size / 2;
  const magnet = state.get('player', 'magnetRadius');
  fieldItems = fieldItems.filter((item) => {
    const dx   = item.x - player.x;
    const dy   = item.y - player.y;
    const dist = Math.hypot(dx, dy);
    const minD = pSize + item.size / 2 + 4 + magnet;

    if (dist < minD) {
      if (inventory.size < MAX_INVENTORY) {
        inventory.append(item);
        updateInventoryUI();
      }
      return false;
    }
    return true;
  });
}

// ── Update the DOM inventory UI ───────────────────────────
function updateInventoryUI() {
  if (!invSlotsEl || !invCountEl) return;

  const items = inventory.toArray();
  invCountEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;

  if (items.length === 0) {
    invSlotsEl.innerHTML = '<span class="inv-empty">Empty — collect items on the field</span>';
    return;
  }

  let html = '';
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const def  = ITEM_DEFS[item.type];

    html += '<div class="inv-slot">';
    html += `<div class="inv-item" data-idx="${i}" title="${def.name}: ${def.desc}">`;
    html += `${def.symbol}`;
    html += `<span class="inv-tooltip">${def.name}: ${def.desc}</span>`;
    html += '</div>';

    if (i < items.length - 1) {
      html += '<span class="inv-arrow">→</span>';
    }
    html += '</div>';
  }

  invSlotsEl.innerHTML = html;

  invSlotsEl.querySelectorAll('.inv-item').forEach((el) => {
    el.addEventListener('click', () => {
      if (state.get('flags', 'gameOver') || (loop && loop.paused)) return;
      const idx  = parseInt(el.dataset.idx, 10);
      const item = inventory.removeAt(idx);
      if (item) {
        useItem(item);
        updateInventoryUI();
      }
    });
  });
}

// ── Update function ───────────────────────────────────────
function update(dt) {
  if (loop.paused || state.get('flags', 'gameOver')) return;
  if (!state.get('flags', 'gameStarted')) return;
  
  survivalTime += dt;

  // Player input
  player.handleInput(input.keys);

  // Dash cooldown & activation
  if (state.get('timers', 'dashCooldown') > 0) state.tickDown('timers', 'dashCooldown', dt);
  if (state.get('flags', 'unlockDash') && state.get('timers', 'dashCooldown') <= 0 && input.keys.Shift) {
    state.set('timers', 'dashCooldown', 3.0);
    state.set('timers', 'dashActive', 0.15);
    state.set('timers', 'activateFlash', 0.2);
    activateFlashColor = '#00e5ff';
    audio.playDash();
  }

  // Speed management via state
  const baseSpd = state.get('player', 'baseSpeed');
  if (state.get('timers', 'dashActive') > 0) {
    state.tickDown('timers', 'dashActive', dt);
    player.speed = baseSpd * 4.0;
  } else if (state.get('timers', 'speed') > 0) {
    player.speed = baseSpd * SPEED_BOOST;
  } else {
    player.speed = baseSpd;
  }

  player.accel = 2400 * state.get('player', 'accelMultiplier');
  player.update(dt);
  player.clamp(CANVAS_W, CANVAS_H);

  // Speed boost timer
  if (state.get('timers', 'speed') > 0) {
    if (state.tickDown('timers', 'speed', dt) <= 0) {
      // timer expired
    }
  }

  // Star (invincibility) timer
  if (state.get('timers', 'star') > 0) {
    state.tickDown('timers', 'star', dt);
  }

  // Gem (double score) timer
  if (state.get('timers', 'gem') > 0) {
    if (state.tickDown('timers', 'gem', dt) <= 0) {
      state.set('skills', 'scoreMultiplier', 1);
    }
  }

  // Power-up spawning
  const puTimer = state.tickDown('timers', 'puSpawn', dt);
  if (puTimer <= 0) {
    spawnPowerUp();
    state.set('timers', 'puSpawn',
      (PU_SPAWN_MIN + Math.random() * (PU_SPAWN_MAX - PU_SPAWN_MIN)) * state.get('skills', 'puSpawnRate'));
  }

  // Item spawning
  const itemTimer = state.tickDown('timers', 'itemSpawn', dt);
  if (itemTimer <= 0) {
    spawnItem();
    state.set('timers', 'itemSpawn',
      (ITEM_SPAWN_MIN + Math.random() * (ITEM_SPAWN_MAX - ITEM_SPAWN_MIN)) * state.get('skills', 'itemSpawnRate'));
  }

  // Update field objects
  for (const pu of fieldPowerUps) pu.update(dt);
  for (const item of fieldItems)  item.update(dt);

  // Collection checks
  checkPowerUpCollection();
  checkItemCollection();

  // Recompute BFS flow field
  pathfinder.compute(player.x, player.y);

  // Enemies
  enemyManager.update(dt, player, pathfinder, grid);
  state.set('enemy', 'count', enemyManager.queueSize);

  // Collision detection
  const hits = enemyManager.checkCollisions(player);
  if (hits > 0) {
    if (state.get('timers', 'star') > 0) {
      renderer.shake(2, 0.1);
    } else if (state.get('flags', 'hasShield')) {
      state.set('flags', 'hasShield', false);
      state.set('timers', 'activateFlash', 0.2);
      activateFlashColor = '#ffd700';
      renderer.shake(4, 0.15);
    } else {
      state.set('player', 'hp', Math.max(0, state.get('player', 'hp') - hits));
      state.set('timers', 'hit', state.get('skills', 'invulnDuration'));
      renderer.shake(8, 0.25);
      
      if (state.get('player', 'hp') <= 0) {
        state.set('flags', 'gameOver', true);
        audio.playGameOver();
        if (gameOverModal) {
          goScoreEl.textContent = state.get('player', 'score');
          goTimeEl.textContent  = Math.floor(survivalTime);
          gameOverModal.classList.remove('hidden');
        }
      } else {
        audio.playDamage();
      }
    }
  }

  // Game state effects
  if (state.get('timers', 'activateFlash') > 0) state.tickDown('timers', 'activateFlash', dt);
  if (state.get('timers', 'hit') > 0) state.tickDown('timers', 'hit', dt);

  // HP Regen
  const regenRate = state.get('skills', 'hpRegenRate');
  if (regenRate > 0 && state.get('player', 'hp') < state.get('player', 'maxHp')) {
    state.add('timers', 'regenAccum', dt);
    const tickTime = 1 / regenRate;
    if (state.get('timers', 'regenAccum') >= tickTime) {
      state.set('player', 'hp', Math.min(state.get('player', 'maxHp'), state.get('player', 'hp') + 1));
      state.add('timers', 'regenAccum', -tickTime);
    }
  }

  // Score
  state.add('player', 'rawScore', dt * state.get('skills', 'scoreMultiplier'));
  state.set('player', 'score', Math.floor(state.get('player', 'rawScore')));
}

// ── Render function ───────────────────────────────────────
function render(dt) {
  renderer.clear(dt);
  renderer.drawGrid();

  // BFS path visualization
  if (state.get('flags', 'showPaths')) {
    renderer.drawPaths(enemyManager);
  }

  renderer.drawPowerUps(fieldPowerUps);
  renderer.drawItems(fieldItems);
  renderer.drawEnemies(enemyManager);

  // Shield ring
  if (state.get('flags', 'hasShield')) {
    renderer.drawShield(player);
  }

  // Star invincibility aura
  const starT = state.get('timers', 'star');
  if (starT > 0) {
    const { ctx } = renderer;
    const pulse = 0.4 + 0.4 * Math.sin(performance.now() * 0.008);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 250, 205, ${0.3 + 0.3 * pulse})`;
    ctx.lineWidth   = 2.5;
    ctx.shadowColor = '#fffacd';
    ctx.shadowBlur  = 16 * pulse;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size / 2 + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const hp    = state.get('player', 'hp');
  const maxHp = state.get('player', 'maxHp');
  const score = state.get('player', 'score');

  renderer.drawPlayer(player);
  renderer.drawHitFlash(player, state.get('timers', 'hit'));
  renderer.drawHealth(hp, maxHp);
  renderer.drawScore(score);

  // Power-up inventory stack (bottom-left)
  renderer.drawPowerUpStack([...puStack], POWERUP_DEFS);

  // Speed boost indicator
  const speedT = state.get('timers', 'speed');
  if (speedT > 0) {
    const { ctx } = renderer;
    ctx.save();
    ctx.font         = '700 11px Orbitron, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = '#39ff14';
    ctx.shadowColor  = '#39ff14';
    ctx.shadowBlur   = 8;
    ctx.fillText(`⚡ SPEED ${speedT.toFixed(1)}s`, 14, 38);
    ctx.restore();
  }

  // Star timer
  if (starT > 0) {
    const { ctx } = renderer;
    ctx.save();
    ctx.font         = '700 11px Orbitron, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = '#fffacd';
    ctx.shadowColor  = '#fff68f';
    ctx.shadowBlur   = 8;
    ctx.fillText(`⭐ INVINCIBLE ${starT.toFixed(1)}s`, 14, speedT > 0 ? 54 : 38);
    ctx.restore();
  }

  // Gem multiplier
  const gemT = state.get('timers', 'gem');
  if (gemT > 0) {
    const { ctx } = renderer;
    ctx.save();
    ctx.font         = '700 11px Orbitron, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = '#00e5ff';
    ctx.shadowColor  = '#00b8d4';
    ctx.shadowBlur   = 8;
    const yOff = 38 + (speedT > 0 ? 16 : 0) + (starT > 0 ? 16 : 0);
    ctx.fillText(`💎 2× SCORE ${gemT.toFixed(1)}s`, 14, yOff);
    ctx.restore();
  }

  // Activation flash
  renderer.drawActivationFlash(state.get('timers', 'activateFlash'), activateFlashColor);

  if (loop.paused && !state.get('flags', 'gameOver') && state.get('flags', 'gameStarted')) {
    renderer.drawPauseOverlay();
  }

  // Draw generic vignette overlay
  renderer.drawVignette();
  renderer.endFrame();
}

// ── HUD callback ──────────────────────────────────────────
function onFrame(fps, paused) {
  const isOver = state.get('flags', 'gameOver');
  const score  = state.get('player', 'score');
  const hp     = state.get('player', 'hp');
  const maxHp  = state.get('player', 'maxHp');

  fpsEl.textContent   = isOver ? 'GAME OVER' : paused ? 'PAUSED' : `FPS: ${fps}`;
  posEl.textContent   = `X: ${Math.round(player.x)}  Y: ${Math.round(player.y)}`;
  queueEl.textContent   = state.get('enemy', 'count');
  enemyCtEl.textContent = state.get('enemy', 'count');
  scoreEl.textContent   = score;

  if (spawnEl) spawnEl.textContent = enemyManager.effectiveInterval.toFixed(1) + 's';

  if (healthEl) {
    healthEl.textContent = '♥'.repeat(hp) + '♡'.repeat(maxHp - hp);
  }

  if (stackEl) stackEl.textContent = puStack.size;

  if (priorityEl) {
    const top = enemyManager.topPriorities;
    priorityEl.textContent = top.length > 0 ? top.join(', ') + 'px' : '—';
  }
}

// ── Pause toggle ──────────────────────────────────────────
input.onPauseToggle(() => {
  if (state.get('flags', 'gameOver')) return;
  loop.togglePause();
});

// ── Activate power-up (E key) ─────────────────────────────
input.onActivate(() => {
  if (state.get('flags', 'gameOver') || loop.paused) return;
  activatePowerUp();
});

// ── Drop item (Q key) ────────────────────────────────────
input.onDrop(() => {
  if (state.get('flags', 'gameOver') || loop.paused) return;
  dropLastItem();
});

// ── Toggle Skill Tree (T key) ─────────────────────────────
input.onTreeToggle(() => {
  toggleSkillTree();
});

// ── Start key (R / Enter) ─────────────────────────────────
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    if (state.get('flags', 'gameOver')) {
      restart();
    }
  }
  if (e.key === 'Enter') {
    if (!state.get('flags', 'gameStarted')) {
      startGame();
    }
  }
});

// ── Loop Init ─────────────────────────────────────────────
loop = new GameLoop(update, render, onFrame);
// Starts rendering in background, but update() respects !gameStarted flag until 'Enter'
loop.start();
