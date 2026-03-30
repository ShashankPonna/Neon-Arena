/* ═══════════════════════════════════════════════════════════
   Tree — Hierarchical Data Structure for Skill Upgrades.
   
   A generic Tree structure where each node represents a skill.
   Children can only be unlocked if their parent is unlocked.
   ═══════════════════════════════════════════════════════════ */

export class SkillNode {
  /**
   * @param {string} id - Unique identifier (e.g. 'speed_1')
   * @param {string} name - Display name
   * @param {string} desc - Description of effect
   * @param {number} cost - Cost to unlock
   * @param {function} onUnlock - Callback when unlocked
   */
  constructor(id, name, desc, cost, onUnlock = null) {
    this.id = id;
    this.name = name;
    this.desc = desc;
    this.cost = cost;
    this.onUnlock = onUnlock;
    
    this.unlocked = false;
    /** @type {SkillNode[]} */
    this.children = [];
    /** @type {SkillNode|null} */
    this.parent = null;
  }

  /** Add a child skill node */
  addChild(childNode) {
    childNode.parent = this;
    this.children.push(childNode);
    return childNode;
  }

  /** Recursively search for a node by ID */
  findNode(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findNode(id);
      if (found) return found;
    }
    return null;
  }
}

export class SkillTree {
  constructor() {
    /** 
     * Roots of the skill trees (e.g., Mobility tree, Combat tree)
     * @type {SkillNode[]} 
     */
    this.roots = [];
  }

  /** Add a new base tree root */
  addRoot(node) {
    this.roots.push(node);
    return node;
  }

  /** Find a node by ID across all roots */
  getNode(id) {
    for (const root of this.roots) {
      const found = root.findNode(id);
      if (found) return found;
    }
    return null;
  }

  /**
   * Check if a skill can be unlocked
   * Requirements:
   * 1. Not already unlocked
   * 2. Parent must be unlocked (or has no parent = root)
   * 3. Player must have enough score (checked externally)
   */
  canUnlock(id) {
    const node = this.getNode(id);
    if (!node) return false;
    if (node.unlocked) return false; // Already unlocked

    if (node.parent) {
      return node.parent.unlocked;
    } else {
      return true; // Root nodes are always available
    }
  }

  /** Unlock a skill if allowed */
  unlock(id) {
    if (!this.canUnlock(id)) return false;
    
    const node = this.getNode(id);
    if (node) {
      node.unlocked = true;
      if (node.onUnlock) {
        node.onUnlock(node);
      }
      return true;
    }
    return false;
  }

  /** Return array of all nodes in a flat list (useful for UI rendering) */
  getAllNodes() {
    const nodes = [];
    const traverse = (node) => {
      nodes.push(node);
      for (const child of node.children) {
        traverse(child);
      }
    };
    for (const root of this.roots) {
      traverse(root);
    }
    return nodes;
  }
}
