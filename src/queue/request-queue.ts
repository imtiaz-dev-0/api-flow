import type { OfflineConfig, HttpMethod, RequestOptions, AdapterResponse } from '../core/types.ts'

interface QueuedRequest {
  method: HttpMethod
  url: string
  body: unknown
  options: RequestOptions
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

/**
 * Manages offline request queuing and replay.
 * Queues requests when offline (navigator.onLine === false) and
 * replays them when the connection is restored.
 *
 * Node.js compatible — falls back to always-online behavior when
 * navigator is not available.
 */
export class RequestQueue {
  private readonly config: OfflineConfig
  private readonly queue: QueuedRequest[] = []
  private replayCallback: ((requests: QueuedRequest[]) => Promise<void>) | null = null

  constructor(config?: OfflineConfig) {
    this.config = config ?? {}
    this.setupOnlineListener()
  }

  private setupOnlineListener(): void {
    if (!this.config.enabled) return
    // Browser / React Native environment
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('online', () => void this.replay())
    }
  }

  isOffline(): boolean {
    if (!this.config.enabled) return false
    // Node.js: always online
    if (typeof navigator === 'undefined') return false
    return !navigator.onLine
  }

  enqueue<T>(
    method: HttpMethod,
    url: string,
    body: unknown,
    options: RequestOptions,
  ): Promise<AdapterResponse<T>> {
    const maxSize = this.config.maxQueueSize ?? 50

    if (this.queue.length >= maxSize) {
      return Promise.reject(new Error(`[api-flow] Offline queue is full (max: ${maxSize})`))
    }

    return new Promise<AdapterResponse<T>>((resolve, reject) => {
      this.queue.push({
        method,
        url,
        body,
        options,
        resolve: resolve as (value: unknown) => void,
        reject,
      })
    })
  }

  /** Register the callback that will execute queued requests on reconnect */
  onReplay(callback: (requests: QueuedRequest[]) => Promise<void>): void {
    this.replayCallback = callback
  }

  private async replay(): Promise<void> {
    if (this.queue.length === 0 || !this.replayCallback) return

    const pending = this.queue.splice(0, this.queue.length)
    await this.replayCallback(pending)
  }

  size(): number {
    return this.queue.length
  }

  clear(): void {
    this.queue.forEach((r) => r.reject(new Error('Queue cleared')))
    this.queue.length = 0
  }
}
