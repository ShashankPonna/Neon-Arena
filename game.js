/* ═══════════════════════════════════════════════════════════
   game.js — Main Entry Point (Refactored)
   Orchestrates the core GameLoop, binding all autonomous 
   Managers (Audio, UI, Items, Enemies, Physics) together.
   ═══════════════════════════════════════════════════════════ */

import { GameLoop }      from './modules/gameLoop.js';
import { Player }        from './modules/player.js';
import { Renderer }      from './modules/renderer.js';
import { Input }         from './modules/input.js';
import { EnemyManager }  from './modules/enemyManager.js';
import { Grid }          from './modules/grid.js';
import { Pathfinder }    from './modules/pathfinding.js';
import { SkillTree }     from './modules/tree.js';
import { GameState }     from './modules/gameState.js';
import { audio }         from './modules/audio.js';
import { CONFIG }        from './modules/config.js';

// Managers 
import { UIManager }     from './modules/uiManager.js';
import { ItemManager }   from './modules/itemManager.js';
import { buildSkillTree} from './modules/skillSystem.js';
import { DSVisualizer }  from './modules/dsVisualizer.js';
import { CanvasScaler }  from './modules/canvasScaler.js';
import { TouchControls } from './modules/touchControls.js';

// ── Globals & Managers Setup ─────────────────────────────
const state        = new GameState();
const input        = new Input();
const grid         = new Grid(CONFIG.CANVAS_W, CONFIG.CANVAS_H, CONFIG.CELL_SIZE);
const pathfinder   = new Pathfinder(grid);

const canvas       = document.getElementById('game-canvas');
const ctx          = canvas.getContext('2d');
canvas.width       = CONFIG.CANVAS_W;
canvas.height      = CONFIG.CANVAS_H;

const player       = new Player(CONFIG.CANVAS_W / 2, CONFIG.CANVAS_H / 2);
const renderer     = new Renderer(ctx, CONFIG.CANVAS_W, CONFIG.CANVAS_H, CONFIG.CELL_SIZE);
const enemyManager = new EnemyManager(CONFIG.CANVAS_W, CONFIG.CANVAS_H, 2);

let loop;
let ui;
let itemManager;
let skillTree;
let dsVis;
let scaler;
let touchCtrl;

let activateFlashColor = '#fff';
let survivalTime = 0;

// Flash color callback for ItemManager
const flashCb = (color) => { activateFlashColor = color; };

// ── Initialization Routine ───────────────────────────────
function init() {
  // Initialize Managers
  ui = new UIManager(
    state,
    input, 
    restart,           // Restart CB
    startGame,         // Start Game CB
    (item) => itemManager.useItem(item, flashCb), // Use Item CB
    () => {}           // Skill Unlock CB (audio handles self)
  );
  
  itemManager = new ItemManager(state, player, audio, ui, renderer, enemyManager);

  // Setup Skill Tree
  initSkillTree();
  
  // Game Loop
  loop = new GameLoop(update, render, onFrame);
  ui.setLoopRef(loop);

  // DS Visualizer
  dsVis = new DSVisualizer(ctx, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  dsVis.init({ state, enemyManager, itemManager, pathfinder, skillTree, grid });

  // Input bindings that need external scope
  input.onPauseToggle(() => {
    if (state.get('flags', 'gameOver')) return;
    loop.togglePause();
  });

  input.onActivate(() => {
    if (state.get('flags', 'gameOver') || loop.paused) return;
    itemManager.activatePowerUp(flashCb);
  });

  input.onDrop(() => {
    if (state.get('flags', 'gameOver') || loop.paused) return;
    itemManager.dropLastItem();
  });

  input.onDSVis(() => {
    dsVis.toggle();
  });

  input.onUseHealth(() => {
    if (state.get('flags', 'gameOver') || loop.paused) return;
    itemManager.useHealthFromStock(flashCb);
  });

  input.onUseStar(() => {
    if (state.get('flags', 'gameOver') || loop.paused) return;
    itemManager.useStarFromStock(flashCb);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
      if (state.get('flags', 'gameOver')) restart();
    }
    if (e.key === 'Enter') {
      if (!state.get('flags', 'gameStarted')) startGame();
    }
  });

  // Responsive canvas scaler
  scaler = new CanvasScaler(canvas, CONFIG.CANVAS_W, CONFIG.CANVAS_H);

  // Touch controls (auto-detects touch devices)
  touchCtrl = new TouchControls(input);

  // ── Settings & Controls Toggle Binding ──
  const btnSettings = document.getElementById('btn-settings');
  const modalSettings = document.getElementById('settings-modal');
  const btnResume = document.getElementById('btn-resume-game');
  const btnToggleCtrl = document.getElementById('btn-toggle-controls');

  if (btnSettings && modalSettings) {
    const fireSettings = (e) => {
      e.preventDefault();
      if (state.get('flags', 'gameOver') || !state.get('flags', 'gameStarted')) return;
      if (!modalSettings.classList.contains('hidden')) return; // already open
      if (!loop.paused) loop.togglePause();
      modalSettings.classList.remove('hidden');
    };
    btnSettings.addEventListener('touchstart', fireSettings, {passive: false});
    btnSettings.addEventListener('mousedown', fireSettings);

    const fireResume = (e) => {
      e.preventDefault();
      modalSettings.classList.add('hidden');
      if (loop.paused && !state.get('flags', 'gameOver')) loop.togglePause();
    };
    btnResume.addEventListener('touchstart', fireResume, {passive: false});
    btnResume.addEventListener('mousedown', fireResume);

    const fireToggle = (e) => {
      e.preventDefault();
      const isJoystick = touchCtrl.controlMode === 'joystick';
      const newMode = isJoystick ? 'dpad' : 'joystick';
      touchCtrl.setControlMode(newMode);
      btnToggleCtrl.textContent = `Movement: ${newMode === 'joystick' ? 'Joystick' : 'D-Pad'}`;
    };
    btnToggleCtrl.addEventListener('touchstart', fireToggle, {passive: false});
    btnToggleCtrl.addEventListener('mousedown', fireToggle);
  }

  // Start logic loop (paused by default via gameStarted flag)
  loop.start();
}

function initSkillTree() {
  skillTree = new SkillTree();
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

  buildSkillTree(state, skillTree, player);
  ui.setSkillTreeRef(skillTree);
  ui.renderSkillTree(skillTree);

  // Keep DS Visualizer context in sync
  if (dsVis) dsVis.init({ state, enemyManager, itemManager, pathfinder, skillTree, grid });
}

// ── Game Flow Regulators ──────────────────────────────────
function startGame() {
  audio.init();
  audio.playStart();
  state.set('flags', 'gameStarted', true);
  ui.hideModals();
}

function restart() {
  state.reset();
  activateFlashColor = '#fff';

  player.x     = CONFIG.CANVAS_W / 2;
  player.y     = CONFIG.CANVAS_H / 2;
  player.vx    = 0;
  player.vy    = 0;
  player.speed = state.get('player', 'baseSpeed');

  initSkillTree();
  ui.hideModals();
  enemyManager.reset();
  itemManager.reset();

  state.set('flags', 'gameStarted', true);
  survivalTime = 0;
}

// ── Update Pipeline ───────────────────────────────────────
function update(dt) {
  if (loop.paused || state.get('flags', 'gameOver') || !state.get('flags', 'gameStarted')) return;
  survivalTime += dt;

  player.handleInput(input.keys);

  // Dash Mechanics
  if (state.get('timers', 'dashCooldown') > 0) state.tickDown('timers', 'dashCooldown', dt);
  if (state.get('flags', 'unlockDash') && state.get('timers', 'dashCooldown') <= 0 && input.keys.Shift) {
    state.set('timers', 'dashCooldown', 3.0);
    state.set('timers', 'dashActive', 0.15);
    state.set('timers', 'activateFlash', 0.2);
    activateFlashColor = '#00e5ff';
    audio.playDash();
  }

  // Speed processing
  const baseSpd = state.get('player', 'baseSpeed');
  if (state.get('timers', 'dashActive') > 0) {
    state.tickDown('timers', 'dashActive', dt);
    player.speed = baseSpd * 4.0;
  } else if (state.get('timers', 'speed') > 0) {
    player.speed = baseSpd * CONFIG.SPEED_BOOST;
  } else {
    player.speed = baseSpd;
  }
  
  if (state.get('timers', 'speed') > 0) state.tickDown('timers', 'speed', dt);
  if (state.get('timers', 'star') > 0) state.tickDown('timers', 'star', dt);
  if (state.get('timers', 'gem') > 0 && state.tickDown('timers', 'gem', dt) <= 0) {
    state.set('skills', 'scoreMultiplier', 1);
  }

  player.accel = 2400 * state.get('player', 'accelMultiplier');
  player.update(dt);
  player.clamp(CONFIG.CANVAS_W, CONFIG.CANVAS_H);

  // Spawners
  if (state.tickDown('timers', 'puSpawn', dt) <= 0) {
    itemManager.spawnPowerUp();
    const variance = CONFIG.PU_SPAWN_MIN + Math.random() * (CONFIG.PU_SPAWN_MAX - CONFIG.PU_SPAWN_MIN);
    state.set('timers', 'puSpawn', variance * state.get('skills', 'puSpawnRate'));
  }

  if (state.tickDown('timers', 'itemSpawn', dt) <= 0) {
    itemManager.spawnItem();
    const variance = CONFIG.ITEM_SPAWN_MIN + Math.random() * (CONFIG.ITEM_SPAWN_MAX - CONFIG.ITEM_SPAWN_MIN);
    state.set('timers', 'itemSpawn', variance * state.get('skills', 'itemSpawnRate'));
  }

  // Delegated Updates
  itemManager.update(dt);
  pathfinder.compute(player.x, player.y);
  enemyManager.update(dt, player, pathfinder, grid);
  state.set('enemy', 'count', enemyManager.queueSize);

  // Collisions
  const hits = enemyManager.checkCollisions(player);
  if (hits > 0) processHits(hits);

  // Passive Effects
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

  // Scoring & XP
  const addedScore = dt * state.get('skills', 'scoreMultiplier');
  state.add('player', 'rawScore', addedScore);
  state.set('player', 'score', Math.floor(state.get('player', 'rawScore')));
  
  // XP Gain
  state.add('player', 'xp', addedScore);
  
  // Level Up Check
  if (state.get('player', 'xp') >= state.get('player', 'xpToNext')) {
    state.add('player', 'level', 1);
    // Carry over remaining XP
    state.set('player', 'xp', state.get('player', 'xp') - state.get('player', 'xpToNext'));
    // Scale next level requirement
    state.set('player', 'xpToNext', state.get('player', 'xpToNext') * 1.5);
    // Optional: play a level up sound or effect, since audio manager is here
    if (audio.playSkillUnlock) audio.playSkillUnlock(); // reuse sound for level up
  }
}

function processHits(hits) {
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
      ui.showGameOver(state.get('player', 'score'), survivalTime);
    } else {
      audio.playDamage();
    }
  }
}

// ── Render Pipeline ───────────────────────────────────────
function render(dt) {
  renderer.clear(dt);
  renderer.drawGrid();

  if (state.get('flags', 'showPaths')) {
    renderer.drawPaths(enemyManager);
  }

  itemManager.render();
  renderer.drawEnemies(enemyManager);

  if (state.get('flags', 'hasShield')) {
    renderer.drawShield(player);
  }

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

  renderer.drawPlayer(player);
  renderer.drawHitFlash(player, state.get('timers', 'hit'));
  renderer.drawHealth(state.get('player', 'hp'), state.get('player', 'maxHp'));
  renderer.drawScore(state.get('player', 'score'));

  // Status Strings
  const speedT = state.get('timers', 'speed');
  if (speedT > 0) {
    ctx.save();
    ctx.font = '700 11px Orbitron, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#39ff14'; ctx.shadowColor = '#39ff14'; ctx.shadowBlur = 8;
    ctx.fillText(`⚡ SPEED ${speedT.toFixed(1)}s`, 14, 38);
    ctx.restore();
  }

  if (starT > 0) {
    ctx.save();
    ctx.font = '700 11px Orbitron, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#fffacd'; ctx.shadowColor = '#fff68f'; ctx.shadowBlur = 8;
    ctx.fillText(`⭐ INVINCIBLE ${starT.toFixed(1)}s`, 14, speedT > 0 ? 54 : 38);
    ctx.restore();
  }

  const gemT = state.get('timers', 'gem');
  if (gemT > 0) {
    ctx.save();
    ctx.font = '700 11px Orbitron, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00b8d4'; ctx.shadowBlur = 8;
    const yOff = 38 + (speedT > 0 ? 16 : 0) + (starT > 0 ? 16 : 0);
    ctx.fillText(`💎 2× SCORE ${gemT.toFixed(1)}s`, 14, yOff);
    ctx.restore();
  }

  renderer.drawActivationFlash(state.get('timers', 'activateFlash'), activateFlashColor);

  if (loop.paused && !state.get('flags', 'gameOver') && state.get('flags', 'gameStarted')) {
    renderer.drawPauseOverlay();
  }

  renderer.drawVignette();

  // DS Visualization overlay (drawn last, on top of everything)
  dsVis.render(dt);

  renderer.endFrame();
}

function onFrame(fps, paused) {
  ui.updateHUD(fps, paused, player, enemyManager, itemManager.puStack);
  if (touchCtrl && touchCtrl.visible) {
    touchCtrl.updateStockBadges(
      state.get('player', 'healthStock'),
      state.get('player', 'starStock')
    );
  }
}

// Kickoff
init();
