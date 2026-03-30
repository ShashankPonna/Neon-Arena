/* ═══════════════════════════════════════════════════════════
   Stack — LIFO data structure for player move history.
   Implemented as a linked list with a max-size cap.
   ═══════════════════════════════════════════════════════════ */

class StackNode {
  constructor(value, next = null) {
    this.value = value;
    this.next  = next;
  }
}

export class Stack {
  /**
   * @param {number} maxSize — maximum entries to keep (oldest dropped)
   */
  constructor(maxSize = 10) {
    this._top     = null;
    this._size    = 0;
    this._maxSize = maxSize;
  }

  /** Number of items currently in the stack. */
  get size() {
    return this._size;
  }

  /** Whether the stack is empty. */
  get isEmpty() {
    return this._size === 0;
  }

  /** Push a value onto the stack. Drops oldest if over maxSize. */
  push(value) {
    this._top = new StackNode(value, this._top);
    this._size++;

    // If over capacity, trim the bottom (oldest) entry
    if (this._size > this._maxSize) {
      this._trimBottom();
    }
  }

  /** Pop the top value off the stack. Returns undefined if empty. */
  pop() {
    if (!this._top) return undefined;

    const value = this._top.value;
    this._top   = this._top.next;
    this._size--;
    return value;
  }

  /** Peek at the top value without removing it. */
  peek() {
    return this._top ? this._top.value : undefined;
  }

  /** Clear all entries. */
  clear() {
    this._top  = null;
    this._size = 0;
  }

  /** Remove the bottom-most (oldest) node to enforce maxSize. */
  _trimBottom() {
    if (!this._top || !this._top.next) return;

    let current = this._top;
    while (current.next && current.next.next) {
      current = current.next;
    }
    current.next = null;
    this._size--;
  }

  /** Iterator — top to bottom. */
  *[Symbol.iterator]() {
    let node = this._top;
    while (node) {
      yield node.value;
      node = node.next;
    }
  }
}
