/* ═══════════════════════════════════════════════════════════
   PriorityQueue — Min-Heap implementation.
   Used to process enemies in order of distance to the player
   (closest first).

   Each item is stored with a numeric priority. Lower
   priority values are dequeued first (min-heap).

   Implements:
     • insert(item, priority)  — O(log n)
     • extractMin()            — O(log n)
     • peek()                  — O(1)
     • size, isEmpty
     • rebuild(items)          — O(n) Floyd's build-heap
     • [Symbol.iterator]       — yields items (does NOT drain)
   ═══════════════════════════════════════════════════════════ */

export class PriorityQueue {
  constructor() {
    /** @type {Array<{ item: *, priority: number }>} */
    this._heap = [];
  }

  // ── Public API ─────────────────────────────────

  get size() {
    return this._heap.length;
  }

  get isEmpty() {
    return this._heap.length === 0;
  }

  /** Peek at the minimum-priority item without removing it. */
  peek() {
    return this._heap.length > 0 ? this._heap[0].item : undefined;
  }

  /** Peek at the minimum priority value. */
  peekPriority() {
    return this._heap.length > 0 ? this._heap[0].priority : Infinity;
  }

  /**
   * Insert an item with the given priority.
   * @param {*} item
   * @param {number} priority — lower = higher urgency
   */
  insert(item, priority) {
    this._heap.push({ item, priority });
    this._bubbleUp(this._heap.length - 1);
  }

  /**
   * Remove and return the item with the lowest priority.
   * @returns {* | undefined}
   */
  extractMin() {
    if (this._heap.length === 0) return undefined;
    const min  = this._heap[0];
    const last = this._heap.pop();
    if (this._heap.length > 0 && last) {
      this._heap[0] = last;
      this._sinkDown(0);
    }
    return min.item;
  }

  /**
   * Rebuild the heap from an array of { item, priority } entries.
   * Uses Floyd's algorithm — O(n).
   * @param {Array<{ item: *, priority: number }>} entries
   */
  rebuild(entries) {
    this._heap = entries.slice();               // shallow copy
    // Floyd's build-heap: sift down from the last parent upward
    for (let i = (this._heap.length >> 1) - 1; i >= 0; i--) {
      this._sinkDown(i);
    }
  }

  /** Clear the heap. */
  clear() {
    this._heap.length = 0;
  }

  /**
   * Iterate over all entries (in heap-internal order, NOT sorted).
   * Useful for rendering — does not drain the heap.
   */
  [Symbol.iterator]() {
    let i = 0;
    const heap = this._heap;
    return {
      next() {
        if (i < heap.length) {
          return { value: heap[i++], done: false };
        }
        return { done: true };
      }
    };
  }

  /**
   * Return all items in priority-sorted order (ascending).
   * Creates a copy so the original heap is unmodified.
   * @returns {Array<{ item: *, priority: number }>}
   */
  toSortedArray() {
    return this._heap.slice().sort((a, b) => a.priority - b.priority);
  }

  // ── Internal heap operations ───────────────────

  /** @param {number} i */
  _bubbleUp(i) {
    const heap = this._heap;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[i].priority < heap[parent].priority) {
        [heap[i], heap[parent]] = [heap[parent], heap[i]];
        i = parent;
      } else {
        break;
      }
    }
  }

  /** @param {number} i */
  _sinkDown(i) {
    const heap = this._heap;
    const n    = heap.length;
    while (true) {
      let smallest = i;
      const left   = 2 * i + 1;
      const right  = 2 * i + 2;
      if (left  < n && heap[left].priority  < heap[smallest].priority) smallest = left;
      if (right < n && heap[right].priority < heap[smallest].priority) smallest = right;
      if (smallest !== i) {
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      } else {
        break;
      }
    }
  }
}
