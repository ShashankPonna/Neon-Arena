/* ═══════════════════════════════════════════════════════════
   LinkedList — Doubly Linked List implementation.
   Used for the player inventory system.

   Each node stores a value and has prev / next pointers.
   Supports:
     • append(value)        — O(1) add to tail
     • prepend(value)       — O(1) add to head
     • removeFirst()        — O(1) remove head
     • removeLast()         — O(1) remove tail
     • removeAt(index)      — O(n) remove by index
     • get(index)           — O(n) get by index
     • contains(value)      — O(n) search
     • toArray()            — O(n) snapshot
     • size, isEmpty
     • [Symbol.iterator]    — forward traversal
   ═══════════════════════════════════════════════════════════ */

class Node {
  /**
   * @param {*} value
   * @param {Node|null} prev
   * @param {Node|null} next
   */
  constructor(value, prev = null, next = null) {
    this.value = value;
    this.prev  = prev;
    this.next  = next;
  }
}

export class LinkedList {
  constructor() {
    /** @type {Node|null} */
    this.head = null;
    /** @type {Node|null} */
    this.tail = null;
    this._size = 0;
  }

  // ── Accessors ──────────────────────────────────

  get size() {
    return this._size;
  }

  get isEmpty() {
    return this._size === 0;
  }

  // ── Insertion ──────────────────────────────────

  /** Add value to the end of the list. O(1). */
  append(value) {
    const node = new Node(value, this.tail, null);
    if (this.tail) {
      this.tail.next = node;
    } else {
      this.head = node;          // list was empty
    }
    this.tail = node;
    this._size++;
    return this;
  }

  /** Add value to the beginning of the list. O(1). */
  prepend(value) {
    const node = new Node(value, null, this.head);
    if (this.head) {
      this.head.prev = node;
    } else {
      this.tail = node;          // list was empty
    }
    this.head = node;
    this._size++;
    return this;
  }

  // ── Removal ────────────────────────────────────

  /** Remove and return the first value. O(1). */
  removeFirst() {
    if (!this.head) return undefined;
    const val = this.head.value;
    this.head = this.head.next;
    if (this.head) {
      this.head.prev = null;
    } else {
      this.tail = null;           // list is now empty
    }
    this._size--;
    return val;
  }

  /** Remove and return the last value. O(1). */
  removeLast() {
    if (!this.tail) return undefined;
    const val = this.tail.value;
    this.tail = this.tail.prev;
    if (this.tail) {
      this.tail.next = null;
    } else {
      this.head = null;           // list is now empty
    }
    this._size--;
    return val;
  }

  /**
   * Remove value at a specific index. O(n).
   * @param {number} index — 0-based
   * @returns {*|undefined}
   */
  removeAt(index) {
    if (index < 0 || index >= this._size) return undefined;
    if (index === 0)               return this.removeFirst();
    if (index === this._size - 1)  return this.removeLast();

    let current = this.head;
    for (let i = 0; i < index; i++) {
      current = current.next;
    }

    // Unlink
    current.prev.next = current.next;
    current.next.prev = current.prev;
    this._size--;
    return current.value;
  }

  /**
   * Remove the first occurrence of a value. O(n).
   * @param {*} value
   * @returns {boolean} — true if removed
   */
  remove(value) {
    let current = this.head;
    while (current) {
      if (current.value === value || 
          (current.value && current.value.id && value && value.id && 
           current.value.id === value.id)) {
        if (current === this.head) { this.removeFirst(); }
        else if (current === this.tail) { this.removeLast(); }
        else {
          current.prev.next = current.next;
          current.next.prev = current.prev;
          this._size--;
        }
        return true;
      }
      current = current.next;
    }
    return false;
  }

  // ── Lookup ─────────────────────────────────────

  /**
   * Get value at index. O(n).
   * @param {number} index
   */
  get(index) {
    if (index < 0 || index >= this._size) return undefined;
    let current = this.head;
    for (let i = 0; i < index; i++) {
      current = current.next;
    }
    return current.value;
  }

  /** Check if the list contains a value. O(n). */
  contains(value) {
    let current = this.head;
    while (current) {
      if (current.value === value) return true;
      current = current.next;
    }
    return false;
  }

  // ── Utility ────────────────────────────────────

  /** Snapshot the list as an array. O(n). */
  toArray() {
    const arr = [];
    let current = this.head;
    while (current) {
      arr.push(current.value);
      current = current.next;
    }
    return arr;
  }

  /** Clear the entire list. O(1). */
  clear() {
    this.head  = null;
    this.tail  = null;
    this._size = 0;
  }

  /** Forward iterator. */
  [Symbol.iterator]() {
    let current = this.head;
    return {
      next() {
        if (current) {
          const val = current.value;
          current = current.next;
          return { value: val, done: false };
        }
        return { done: true };
      }
    };
  }
}
