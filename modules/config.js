/* ═══════════════════════════════════════════════════════════
   config.js — Game Configuration Constants
   Centralized file for all balancing params and core sizes.
   ═══════════════════════════════════════════════════════════ */

export const CONFIG = {
  // Canvas / Grid
  CANVAS_W: 800,
  CANVAS_H: 480,
  CELL_SIZE: 40,

  // Power-up spawn config
  PU_SPAWN_MIN: 6,
  PU_SPAWN_MAX: 12,
  PU_MAX_FIELD: 3,

  // Power-up duration / effect scaling
  SPEED_BOOST: 1.8,
  SPEED_DUR: 3,

  // Item spawn config
  ITEM_SPAWN_MIN: 4,
  ITEM_SPAWN_MAX: 8,
  ITEM_MAX_FIELD: 4,
  MAX_INVENTORY: 8,

  // Item duration scaling
  STAR_DUR: 3,     // Invincibility seconds
  GEM_DUR:  5      // Double score seconds
};
