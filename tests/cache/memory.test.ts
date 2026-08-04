import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MemoryCache } from '../../src/cache/memory.ts'

describe('MemoryCache', () => {
  let cache: MemoryCache

  beforeEach(() => {
    cache = new MemoryCache(5, 1000) // 5 items, 1s TTL
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should store and retrieve a value', () => {
    cache.set('key1', { data: 'hello' })
    expect(cache.get('key1')).toEqual({ data: 'hello' })
  })

  it('should return null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull()
  })

  it('should expire entries after TTL', () => {
    cache.set('expiring', 'value', 500)
    expect(cache.get('expiring')).toBe('value')

    vi.advanceTimersByTime(600)
    expect(cache.get('expiring')).toBeNull()
  })

  it('should use default TTL when not specified', () => {
    cache.set('default-ttl', 'value')
    expect(cache.get('default-ttl')).toBe('value')

    vi.advanceTimersByTime(1100)
    expect(cache.get('default-ttl')).toBeNull()
  })

  it('should evict oldest entry when at maxSize', () => {
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    cache.set('d', 4)
    cache.set('e', 5)
    cache.set('f', 6) // Should evict 'a' (oldest)

    expect(cache.get('a')).toBeNull()
    expect(cache.get('f')).toBe(6)
  })

  it('should update existing key without eviction', () => {
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    cache.set('d', 4)
    cache.set('e', 5)
    cache.set('a', 99) // Update existing — no eviction

    expect(cache.get('a')).toBe(99)
    expect(cache.size()).toBe(5)
  })

  it('should invalidate a specific key', () => {
    cache.set('key', 'value')
    cache.invalidate('key')
    expect(cache.get('key')).toBeNull()
  })

  it('should clear all entries', () => {
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.size()).toBe(0)
  })

  it('should invalidate by regex pattern', () => {
    cache.set('users/1', 'Alice')
    cache.set('users/2', 'Bob')
    cache.set('posts/1', 'Hello')

    const count = cache.invalidatePattern(/^users\//)
    expect(count).toBe(2)
    expect(cache.get('users/1')).toBeNull()
    expect(cache.get('posts/1')).toBe('Hello')
  })

  it('should return remaining TTL', () => {
    cache.set('ttl-key', 'val', 1000)
    vi.advanceTimersByTime(300)
    const ttl = cache.getTtl('ttl-key')
    expect(ttl).toBeGreaterThan(600)
    expect(ttl).toBeLessThanOrEqual(700)
  })

  it('should prune expired entries', () => {
    cache.set('a', 1, 100)
    cache.set('b', 2, 100)
    cache.set('c', 3, 5000)

    vi.advanceTimersByTime(200)
    const pruned = cache.prune()
    expect(pruned).toBe(2)
    expect(cache.size()).toBe(1)
  })

  it('should return only non-expired keys', () => {
    cache.set('alive', 1, 5000)
    cache.set('dead', 2, 100)
    vi.advanceTimersByTime(200)

    const keys = cache.keys()
    expect(keys).toContain('alive')
    expect(keys).not.toContain('dead')
  })

  it('should implement LRU ordering', () => {
    const lruCache = new MemoryCache(3, 10000)
    lruCache.set('a', 1)
    lruCache.set('b', 2)
    lruCache.set('c', 3)

    // Access 'a' to make it recently used
    lruCache.get('a')

    // Add new item — 'b' should be evicted (least recently used)
    lruCache.set('d', 4)

    expect(lruCache.get('a')).toBe(1)
    expect(lruCache.get('b')).toBeNull() // evicted
    expect(lruCache.get('c')).toBe(3)
    expect(lruCache.get('d')).toBe(4)
  })
})
