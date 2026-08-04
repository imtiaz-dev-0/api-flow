import type { MetricsEntry, HttpMethod } from '../core/types.ts'

/**
 * Collects performance metrics for each API request.
 * Uses performance.now() for high-resolution timing with Date.now() fallback.
 */
export class MetricsCollector {
  private readonly entries: MetricsEntry[] = []
  private readonly enabled: boolean
  private readonly maxEntries = 1000

  constructor(enabled: boolean) {
    this.enabled = enabled
  }

  record(entry: MetricsEntry): void {
    if (!this.enabled) return

    this.entries.push(entry)

    // Rolling window — drop oldest
    if (this.entries.length > this.maxEntries) {
      this.entries.shift()
    }
  }

  getAll(): MetricsEntry[] {
    return [...this.entries]
  }

  getByUrl(url: string): MetricsEntry[] {
    return this.entries.filter((e) => e.url === url)
  }

  getByMethod(method: HttpMethod): MetricsEntry[] {
    return this.entries.filter((e) => e.method === method)
  }

  /** Returns average duration in ms for a given URL */
  averageDuration(url?: string): number {
    const relevant = url ? this.getByUrl(url) : this.entries
    if (relevant.length === 0) return 0
    return relevant.reduce((sum, e) => sum + e.duration, 0) / relevant.length
  }

  /** Returns the slowest requests */
  slowest(n = 10): MetricsEntry[] {
    return [...this.entries].sort((a, b) => b.duration - a.duration).slice(0, n)
  }

  /** Returns overall stats */
  summary(): {
    total: number
    avgDuration: number
    cacheHitRate: number
    errorRate: number
    byStatus: Record<string, number>
  } {
    const total = this.entries.length
    if (total === 0) {
      return { total: 0, avgDuration: 0, cacheHitRate: 0, errorRate: 0, byStatus: {} }
    }

    const avgDuration = this.averageDuration()
    const cacheHits = this.entries.filter((e) => e.cached).length
    const errors = this.entries.filter((e) => e.status >= 400 || e.status === 0).length
    const byStatus: Record<string, number> = {}

    for (const entry of this.entries) {
      const key = String(entry.status)
      byStatus[key] = (byStatus[key] ?? 0) + 1
    }

    return {
      total,
      avgDuration,
      cacheHitRate: cacheHits / total,
      errorRate: errors / total,
      byStatus,
    }
  }

  clear(): void {
    this.entries.length = 0
  }
}
