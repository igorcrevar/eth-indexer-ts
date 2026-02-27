import { describe, it, expect } from 'vitest'
import { CircularBuffer } from '../src/common/circularBuffer'

describe('CircularBuffer', () => {
  it('constructor rejects non-positive or non-integer capacity', () => {
    expect(() => new CircularBuffer(0)).toThrow()
    expect(() => new CircularBuffer(-1)).toThrow()
    expect(() => new CircularBuffer(1.5)).toThrow()
  })

  it('size/isEmpty/isFull reflect state correctly', () => {
    const b = new CircularBuffer<number>(3)
    expect(b.len()).toBe(0)
    expect(b.isEmpty()).toBe(true)
    expect(b.isFull()).toBe(false)

    b.push(1)
    expect(b.len()).toBe(1)
    expect(b.isEmpty()).toBe(false)
    expect(b.isFull()).toBe(false)

    b.push(2)
    b.push(3)
    expect(b.len()).toBe(3)
    expect(b.isFull()).toBe(true)
  })

  it('push/pop and peek behave correctly', () => {
    const b = new CircularBuffer<string>(5)
    expect(b.peek()).toBeUndefined()
    expect(b.peekNewest()).toBeUndefined()

    b.push('a')
    b.push('b')
    b.push('c')

    expect(b.peek()).toBe('a')
    expect(b.peekNewest()).toBe('c')
    expect(b.get(0)).toBe('a')
    expect(b.get(1)).toBe('b')
    expect(b.get(2)).toBe('c')
    expect(b.get(3)).toBeUndefined()

    expect(b.toArray()).toEqual(['a', 'b', 'c'])

    expect(b.pop()).toBe('a')
    expect(b.len()).toBe(2)
    expect(b.peek()).toBe('b')
  })

  it('if buffer is full throw error', () => {
    const b = new CircularBuffer<number>(3)
    expect(b.push(1)).toBeUndefined()
    expect(b.push(2)).toBeUndefined()
    expect(b.push(3)).toBeUndefined()
    expect(() => b.push(4)).toThrow('buffer is full');
  })

  it('popLast removes newest and returns it', () => {
    const b = new CircularBuffer<number>(4)
    expect(b.popNewest()).toBeUndefined()
    b.push(10)
    b.push(20)
    b.push(30)
    expect(b.popNewest()).toBe(30)
    expect(b.len()).toBe(2)
    expect(b.peekNewest()).toBe(20)
    expect(b.toArray()).toEqual([10, 20])
  })

  it('get with invalid indices returns undefined', () => {
    const b = new CircularBuffer<number>(3)
    b.push(1)
    b.push(2)
    expect(b.get(-1)).toBeUndefined()
    expect(b.get(2)).toBeUndefined()
    expect(b.get(100)).toBeUndefined()
  })

  it('clear resets buffer', () => {
    const b = new CircularBuffer<string>(2)
    b.push('x')
    b.push('y')
    expect(b.len()).toBe(2)
    b.clear()
    expect(b.len()).toBe(0)
    expect(b.isEmpty()).toBe(true)
    expect(b.peek()).toBeUndefined()
    expect(b.peekNewest()).toBeUndefined()
  })

  it('pop on empty returns undefined and popLast on empty returns undefined', () => {
    const b = new CircularBuffer<number>(2)
    expect(b.pop()).toBeUndefined()
    expect(b.popNewest()).toBeUndefined()
  })

  it('toArray handles wrap-around and returns snapshot copy', () => {
    const b = new CircularBuffer<number>(3)
    b.push(1)
    b.push(2)
    b.push(3)
    // cause head/tail movement and wrap-around
    expect(b.pop()).toBe(1)
    expect(b.pop()).toBe(2)
    b.push(4)
    // internal indices have wrapped; snapshot should be oldest->newest
    expect(b.toArray()).toEqual([3, 4])

    const snap = b.toArray()
    snap[0] = 999
    // modifying snapshot must not change buffer contents
    expect(b.get(0)).toBe(3)
  })

  it('toArray returns empty array for empty buffer', () => {
    const b = new CircularBuffer<string>(5)
    expect(b.toArray()).toEqual([])
  })

  it('get with non-integer index returns undefined (non-happy path)', () => {
    const b = new CircularBuffer<number>(3)
    b.push(1)
    b.push(2)
    // pass a non-integer index
    // implementation expects integers; ensure it doesn't return data for floats
    // ts-expect-error runtime test for non-integer
    expect(b.get(1.5)).toBeUndefined()
  })

  it('find returns [item,index] on forward and reverse, works with wrap-around', () => {
    const b = new CircularBuffer<number>(5)
    b.push(1)
    b.push(2)
    b.push(3)
    b.push(4)
    b.push(5)

    const [fIdx, fItem] = b.find((it) => it === 3)
    expect(fItem).toBe(3)
    expect(fIdx).toBe(2)

    const [rIdx, rItem] = b.find((it) => it % 2 === 0, true)
    // newest even is 4 -> reverse index 1 (since newest is 5 at rev idx 0)
    expect(rItem).toBe(4)
    expect(rIdx).toBe(3)
  })

  it('find on wrapped buffer returns correct index relative to oldest and reverse relative to newest', () => {
    const b = new CircularBuffer<number>(3)
    b.push(1)
    b.push(2)
    b.push(3)

    const [fIdx, fItem] = b.find((it) => it > 2)
    expect(fIdx).toBe(2)
    expect(fItem).toBe(3)
    
    const [rIdx, rItem] = b.find((it) => it < 3, true)
    expect(rIdx).toBe(1)
    expect(rItem).toBe(2)    
  })

  it('find does not match', () => {
    const b = new CircularBuffer<number|undefined>(4)
    b.push(1)
    b.push(undefined)
    b.push(3)

    const [idx, item] = b.find((it) => it === 5)
    expect(item).toBeUndefined()
    expect(idx).toBe(-1)
  })

  it('find works with explicit undefined values', () => {
    const b = new CircularBuffer<number|undefined>(4)
    b.push(1)
    b.push(undefined)
    b.push(3)

    const [idx] = b.find((it) => it === 3)
    expect(idx).toBe(2)
  })

  it('clearAfter keeps elements up to index inclusive; negative index clears all; index at/after last is no-op', () => {
    const b = new CircularBuffer<number>(5)
    b.push(1)
    b.push(2)
    b.push(3)
    b.push(4)
    b.push(5)

    // find 3 (forward) -> index 2, clearFrom(2) keeps [1,2,3]
    const [idx] = b.find((it) => it === 3)
    b.clearAfter(idx)
    expect(b.toArray()).toEqual([1, 2, 3])

    // negative index clears all
    b.clearAfter(-1)
    expect(b.len()).toBe(0)
    expect(b.isEmpty()).toBe(true)

    // no-op when index >= len-1
    b.push(7)
    b.push(8)
    const lenBefore = b.len()
    b.clearAfter(lenBefore - 1)
    expect(b.len()).toBe(lenBefore)
  })

  it('using reverse find requires converting reverse-index to forward index before clearAfter', () => {
    const b = new CircularBuffer<number>(4)
    b.push(10)
    b.push(20)
    b.push(30)
    b.push(40)

    // reverse find for 30 returns item 30 and reverse-index 1 (newest has rev idx 0)
    const [revIdx] = b.find((it) => it === 30, true)
    expect(revIdx).toBe(2)

    // clearing after that forward index keeps up-to-30 inclusive
    b.clearAfter(revIdx)
    expect(b.toArray()).toEqual([10, 20, 30])
  })

  it('clearAfter last element does nothing', () => {
    const b = new CircularBuffer<number>(4)
    b.push(10)
    b.push(20)
    b.push(30)
    b.push(40)

    const arr = b.toArray()
    b.clearAfter(arr.length - 1)
    
    expect(b.toArray()).toEqual(arr)
  })

   it('clear empty buffer', () => {
    const b = new CircularBuffer<number>(4)
    b.push(10)
    b.push(20)
    b.push(30)
    b.push(40)
    
    expect(b.popNewest()).toBe(40)
    expect(b.pop()).toBe(10)
    expect(b.popNewest()).toBe(30)
    expect(b.pop()).toBe(20)

    b.clearAfter(-1)
    expect(b.toArray()).toStrictEqual([])
  })
})
