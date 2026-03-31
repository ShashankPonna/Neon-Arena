/* ═══════════════════════════════════════════════════════════
   skillSystem.js — Skill Tree Definitions
   Separates game design / RPG configurations from core loops.
   ═══════════════════════════════════════════════════════════ */

import { SkillNode } from './tree.js';

export function buildSkillTree(state, skillTree, player) {
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
    state.add('player', 'hp', 2);
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
}
