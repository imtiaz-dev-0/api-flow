interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
}

/**
 * In-memory LRU cache with TTL expiry.
 * Zero dependencies — uses native Map for O(1) lookups.
 */
export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>()
  private readonly maxSize: number
  private readonly defaultTtl: number

  constructor(maxSize = 100, defaultTtl = 5 * 60 * 1000) {
    this.maxSize = maxSize
    this.defaultTtl = defaultTtl
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    // LRU: move to end (most recently used)
    this.store.delete(key)
    this.store.set(key, entry)

    return entry.value as T
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const effectiveTtl = ttl ?? this.defaultTtl

    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value
      if (firstKey) this.store.delete(firstKey)
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + effectiveTtl,
      createdAt: Date.now(),
    })
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  invalidate(key: string): void {
    this.store.delete(key)
  }

  invalidatePattern(pattern: RegExp): number {
    let count = 0
    for (const key of this.store.keys()) {
      if (pattern.test(key)) {
        this.store.delete(key)
        count++
      }
    }
    return count
  }

  clear(): void {
    this.store.clear()
  }

  getTtl(key: string): number | null {
    const entry = this.store.get(key)
    if (!entry) return null
    return Math.max(0, entry.expiresAt - Date.now())
  }

  size(): number {
    return this.store.size
  }

  /** Removes all expired entries — useful to call periodically */
  prune(): number {
    const now = Date.now()
    let pruned = 0
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
        pruned++
      }
    }
    return pruned
  }

  /** Returns all non-expired keys */
  keys(): string[] {
    const now = Date.now()
    return [...this.store.entries()]
      .filter(([, entry]) => now <= entry.expiresAt)
      .map(([key]) => key)
  }
}
