/* ═══════════════════════════════════════════════════════════
   itemManager.js — Items, Powerups, and Collections
   Handles dropping, collecting, stacking, and triggering
   of all collectable effects on the map.
   ═══════════════════════════════════════════════════════════ */

import { PowerUp, POWERUP_DEFS } from './powerUp.js';
import { Item, ITEM_DEFS }       from './item.js';
import { Stack }                 from './stack.js';
import { LinkedList }            from './linkedList.js';
import { CONFIG }                from './config.js';

export class ItemManager {
  constructor(state, player, audio, uiManager, renderer, enemyManager) {
    this.state = state;
    this.player = player;
    this.audio = audio;
    this.uiManager = uiManager;
    this.renderer = renderer;
    this.enemyManager = enemyManager;

    this.puStack = new Stack(10);
    this.inventory = new LinkedList();
    
    /** @type {PowerUp[]} */
    this.fieldPowerUps = [];
    
    /** @type {Item[]} */
    this.fieldItems = [];
  }

  reset() {
    this.fieldPowerUps = [];
    this.fieldItems = [];
    this.puStack.clear();
    this.inventory.clear();
    this.uiManager.updateInventoryUI(this.inventory);
  }

  /* ── Spawning ───────────────────────────────────────────── */
  spawnPowerUp() {
    if (this.fieldPowerUps.length >= CONFIG.PU_MAX_FIELD) return;
    const margin = 60;
    const x = margin + Math.random() * (CONFIG.CANVAS_W - margin * 2);
    const y = margin + Math.random() * (CONFIG.CANVAS_H - margin * 2);
    this.fieldPowerUps.push(new PowerUp(x, y, PowerUp.randomType()));
  }

  spawnItem() {
    if (this.fieldItems.length >= CONFIG.ITEM_MAX_FIELD) return;
    const margin = 60;
    const x = margin + Math.random() * (CONFIG.CANVAS_W - margin * 2);
    const y = margin + Math.random() * (CONFIG.CANVAS_H - margin * 2);
    this.fieldItems.push(new Item(x, y, Item.randomType()));
  }

  /* ── Usage Logic ────────────────────────────────────────── */
  activatePowerUp(activateFlashCallback) {
    if (this.puStack.isEmpty) return;
    const type = this.puStack.pop();
    const def  = POWERUP_DEFS[type];
    
    this.state.set('timers', 'activateFlash', 0.3);
    activateFlashCallback(def.color);

    switch (type) {
      case 'shield':
        this.audio.playPowerup();
        this.state.set('flags', 'hasShield', true);
        break;
      case 'speed':
        this.state.set('timers', 'speed', CONFIG.SPEED_DUR);
        this.player.speed = this.state.get('player', 'baseSpeed') * CONFIG.SPEED_BOOST;
        break;
      case 'nuke':
        this.audio.playDamage();
        this.enemyManager.clearEnemies();
        this.renderer.shake(12, 0.35);
        break;
    }
  }

  useItem(item, activateFlashCallback) {
    const def = ITEM_DEFS[item.type];
    this.state.set('timers', 'activateFlash', 0.2);
    activateFlashCallback(def.color);

    switch (item.type) {
      case 'health':
        this.state.set('player', 'hp', Math.min(this.state.get('player', 'maxHp'), this.state.get('player', 'hp') + 1));
        this.audio.playPowerup();
        break;
      case 'coin':
        this.state.add('player', 'rawScore', this.state.get('player', 'coinValue') * this.state.get('skills', 'scoreMultiplier'));
        this.audio.playCoin();
        break;
      case 'star':
        this.state.set('timers', 'star', CONFIG.STAR_DUR);
        this.audio.playPowerup();
        break;
      case 'gem':
        this.state.set('timers', 'gem', CONFIG.GEM_DUR * this.state.get('skills', 'resDurationMod'));
        this.state.set('skills', 'scoreMultiplier', 2);
        this.audio.playPowerup();
        break;
    }
  }

  useHealthFromStock(activateFlashCallback) {
    if (this.state.get('player', 'healthStock') > 0) {
      if (this.state.get('player', 'hp') < this.state.get('player', 'maxHp')) {
        this.state.add('player', 'healthStock', -1);
        this.state.set('player', 'hp', Math.min(this.state.get('player', 'maxHp'), this.state.get('player', 'hp') + 1));
        this.audio.playPowerup();
        this.state.set('timers', 'activateFlash', 0.2);
        if (activateFlashCallback) activateFlashCallback('#ff2244');
      }
    }
  }

  useStarFromStock(activateFlashCallback) {
    if (this.state.get('player', 'starStock') > 0) {
      this.state.add('player', 'starStock', -1);
      this.state.set('timers', 'star', CONFIG.STAR_DUR);
      this.audio.playPowerup();
      this.state.set('timers', 'activateFlash', 0.2);
      if (activateFlashCallback) activateFlashCallback('#fffacd');
    }
  }

  dropLastItem() {
    if (this.inventory.isEmpty) return;
    const item = this.inventory.removeLast();
    if (item) {
      item.x = this.player.x + (Math.random() - 0.5) * 40;
      item.y = this.player.y + (Math.random() - 0.5) * 40;
      item.x = Math.max(20, Math.min(CONFIG.CANVAS_W - 20, item.x));
      item.y = Math.max(20, Math.min(CONFIG.CANVAS_H - 20, item.y));
      item.age = 0; // reset twinkle
      item.dropCooldown = 1.0; // 1 second cooldown before pickup
      this.fieldItems.push(item);
      this.uiManager.updateInventoryUI(this.inventory);
    }
  }

  /* ── Checking Collections ───────────────────────────────── */
  checkPowerUpCollection() {
    const pSize = this.player.size / 2;
    const magnet = this.state.get('player', 'magnetRadius');
    this.fieldPowerUps = this.fieldPowerUps.filter((pu) => {
      const dx   = pu.x - this.player.x;
      const dy   = pu.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      const minD = pSize + pu.size / 2 + magnet;
      if (dist < minD) {
        this.puStack.push(pu.type);
        return false;
      }
      return true;
    });
  }

  checkItemCollection() {
    const pSize = this.player.size / 2;
    const magnet = this.state.get('player', 'magnetRadius');
    this.fieldItems = this.fieldItems.filter((item) => {
      if (item.dropCooldown > 0) return true; // skip collection if recently dropped

      const dx   = item.x - this.player.x;
      const dy   = item.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      const minD = pSize + item.size / 2 + 4 + magnet;

      if (dist < minD) {
        if (item.type === 'health') {
          this.state.add('player', 'healthStock', 1);
          // Audio cue could go here if item class doesn't do it independently
          return false;
        } else if (item.type === 'star') {
          this.state.add('player', 'starStock', 1);
          return false;
        } else {
          if (this.inventory.size < CONFIG.MAX_INVENTORY) {
            this.inventory.append(item);
            this.uiManager.updateInventoryUI(this.inventory);
          }
          return false;
        }
      }
      return true;
    });
  }

  /* ── Core Hooks ─────────────────────────────────────────── */
  update(dt) {
    for (const pu of this.fieldPowerUps) pu.update(dt);
    for (const item of this.fieldItems)  item.update(dt);
    this.checkPowerUpCollection();
    this.checkItemCollection();
  }

  render() {
    this.renderer.drawPowerUps(this.fieldPowerUps);
    this.renderer.drawItems(this.fieldItems);
    this.renderer.drawPowerUpStack([...this.puStack], POWERUP_DEFS);
  }
}
