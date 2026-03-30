/* ═══════════════════════════════════════════════════════════
   Queue — FIFO data structure using a linked list.
   Used to manage enemy spawn order.
   ═══════════════════════════════════════════════════════════ */

class QueueNode {
  constructor(value) {
    this.value = value;
    this.next  = null;
  }
}

export class Queue {
  constructor() {
    this._head = null;
    this._tail = null;
    this._size = 0;
  }

  /** Number of items in the queue. */
  get size() {
    return this._size;
  }

  /** Returns true if the queue is empty. */
  get isEmpty() {
    return this._size === 0;
  }

  /** Add an item to the back of the queue. O(1) */
  enqueue(value) {
    const node = new QueueNode(value);
    if (this._tail) {
      this._tail.next = node;
    } else {
      this._head = node;
    }
    this._tail = node;
    this._size++;
  }

  /** Remove and return the item at the front. O(1) */
  dequeue() {
    if (!this._head) return undefined;
    const value = this._head.value;
    this._head = this._head.next;
    if (!this._head) this._tail = null;
    this._size--;
    return value;
  }

  /** Peek at the front item without removing it. */
  peek() {
    return this._head ? this._head.value : undefined;
  }

  /** Iterate over all items (for rendering / updates). */
  [Symbol.iterator]() {
    let current = this._head;
    return {
      next() {
        if (current) {
          const value = current.value;
          current = current.next;
          return { value, done: false };
        }
        return { done: true };
      }
    };
  }

  /** Convert to array (useful for filter operations). */
  toArray() {
    const arr = [];
    for (const item of this) arr.push(item);
    return arr;
  }

  /** Rebuild the queue from an array (after filtering dead enemies). */
  static fromArray(arr) {
    const q = new Queue();
    for (const item of arr) q.enqueue(item);
    return q;
  }
}
