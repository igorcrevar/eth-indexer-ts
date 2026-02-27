/**
 * Simple generic circular buffer (ring buffer) implementation.
 * Stores up to `size` elements in insertion order
 * Push to full buffer will raise error
 */
export class CircularBuffer<T> {
  private buf: (T | undefined)[];
  private pos = 0; // index to write next
  private count = 0;
  private readonly size: number;

  constructor(size: number) {
    if (!Number.isInteger(size) || size <= 0) {
      throw new Error('size must be a positive integer');
    }
    this.size = size;
    this.buf = new Array<T | undefined>(size);
  }

  /**
   * Get the number of elements in the buffer.
   */
  len(): number {
    return this.count;
  }

  /**
   * Check if the buffer is empty.
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Check if the buffer is full.
   */
  isFull(): boolean {
    return this.count === this.size;
  }

  /**
   * Push an item at the head. If buffer is full, the oldest item is overwritten
   * and returned. Otherwise returns undefined.
   */
  push(item: T) {
    if (this.isFull()) {
      throw Error('buffer is full');
    }

    this.buf[(this.pos + this.count) % this.size] = item;
    this.count++;
  }

  /**
   * Pop oldest element (from tail). Returns undefined if empty.
   */
  pop(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    const value = this.buf[this.pos];
    this.buf[this.pos] = undefined;
    this.pos = (this.pos + 1) % this.size;
    this.count--;
    return value;
  }

  popNewest(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    const idx = (this.pos + this.count - 1) % this.size;
    const value = this.buf[idx];
    this.buf[idx] = undefined;
    this.count--;
    return value;
  }

  /**
   * Peek oldest element without removing it.
   */
  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.buf[this.pos];
  }

  /**
   * Peek newest element without removing it.
   */
  peekNewest(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    const idx = (this.pos + this.count - 1) % this.size;
    return this.buf[idx];
  }

  /**
   * Get element by index relative to oldest (0 = oldest).
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.count) {
      return undefined;
    }
    const idx = (this.pos + index) % this.size;
    return this.buf[idx];
  }

  /**
   * Find element by predicate. Returns [index, item] relative to oldest (0 = oldest). If not found returns [-1, undefined].
   * If reverse=true, search starts from newest and index is relative to oldest (0 = oldest).
   * @param predicate function to test each element
   * @param reverse should search start from newest (true) or oldest (false, default)
   * @returns [index, item] if found, otherwise [-1, undefined]
   */
  find(predicate: (item: T) => boolean, reverse: boolean = false): [number, T | undefined] {
    const inc = reverse ? this.size - 1 : 1;
    let idx = reverse ? (this.pos + this.count - 1) % this.size : this.pos;
    for (let i = 0; i < this.count; i++) {
      const item = this.buf[idx];
      if (item !== undefined && predicate(item)) {
        if (reverse) {
          return [this.count - 1 - i, item];
        }
        return [i, item];
      }
      idx = (idx + inc) % this.size;
    }
    return [-1, undefined];
  }

  /**
   * Returns a snapshot array from oldest -> newest.
   */
  toArray(): T[] {
    const out: T[] = [];
    let indx = this.pos
    for (let i = 0; i < this.count; i++) {
      out.push(this.buf[indx] as T);
      indx = (indx + 1) % this.size;
    }
    return out;
  }

  /** Clear all elements from buffer */
  clear() {
    if (this.isEmpty()) {
      return;
    }
    for (let i = 0; i < this.size; i++) {
      this.buf[i] = undefined;
    }
    this.pos = 0;
    this.count = 0;
  }

  /** Clear elements after index (keep 0..index inclusive). If index < 0, clear entire buffer */
  clearAfter(index: number) {
    // If index < 0: clear entire buffer
    if (index < 0) {
      this.clear();
    } else if (index < this.count - 1) {
      // index is before last element
      // Clear elements after `index` (keep 0..index inclusive)
      for (let i = index + 1; i < this.count; i++) {
        const idx = (this.pos + i) % this.size;
        this.buf[idx] = undefined;        
      }

      this.count = index + 1;
    }
  }
}
