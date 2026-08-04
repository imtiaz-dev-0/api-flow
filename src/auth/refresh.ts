import type { AuthConfig } from '../core/types.ts'

/**
 * Manages token refresh with a mutex pattern:
 * - Only one refresh call fires at a time
 * - All concurrent failing requests are queued and replayed after refresh
 */
export class TokenRefreshManager {
  private readonly config: AuthConfig | undefined
  private isRefreshing = false
  private refreshPromise: Promise<string | null | undefined> | null = null
  private pendingQueue: Array<{
    resolve: (value: unknown) => void
    reject: (error: unknown) => void
    execute: () => Promise<unknown>
  }> = []

  constructor(config?: AuthConfig) {
    this.config = config
  }

  /** Returns the Authorization header object for the current access token */
  async getAuthHeader(): Promise<Record<string, string>> {
    if (!this.config?.getAccessToken) return {}

    const token = await this.config.getAccessToken()
    if (!token) return {}

    const headerKey = this.config.headerKey ?? 'Authorization'
    const scheme = this.config.scheme ?? 'Bearer'

    return { [headerKey]: `${scheme} ${token}` }
  }

  /**
   * Handles a 401 response by:
   * 1. Queuing the current request if refresh is in progress
   * 2. Triggering a refresh (only once)
   * 3. Replaying all queued requests with the new token
   */
  async handleUnauthorized<T>(
    retryRequest: () => Promise<T>,
    onRefreshComplete?: (queuedCount: number) => void,
  ): Promise<T | null> {
    if (!this.config?.refresh) return null

    if (this.isRefreshing) {
      // Queue this request to be replayed after current refresh completes
      return new Promise<T>((resolve, reject) => {
        this.pendingQueue.push({
          resolve: resolve as (value: unknown) => void,
          reject,
          execute: retryRequest as () => Promise<unknown>,
        })
      })
    }

    this.isRefreshing = true
    const queuedAtStart = this.pendingQueue.length

    try {
      const refreshToken = this.config.getRefreshToken
        ? await this.config.getRefreshToken()
        : undefined

      this.refreshPromise = this.config.refresh(refreshToken)
      await this.refreshPromise

      // Replay all pending requests with new token
      const pendingCount = this.pendingQueue.length
      onRefreshComplete?.(pendingCount + queuedAtStart)

      const results = await Promise.allSettled(
        this.pendingQueue.map((item) => item.execute()),
      )

      results.forEach((result, i) => {
        const item = this.pendingQueue[i]
        if (result.status === 'fulfilled') {
          item.resolve(result.value)
        } else {
          item.reject(result.reason)
        }
      })

      this.pendingQueue = []

      // Retry the original request
      return retryRequest()
    } catch (error) {
      // Reject all queued requests
      this.pendingQueue.forEach((item) => item.reject(error))
      this.pendingQueue = []
      throw error
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  /** Returns true if a refresh is currently in progress */
  isRefreshInProgress(): boolean {
    return this.isRefreshing
  }

  /** Returns the number of requests waiting for a refresh */
  getPendingCount(): number {
    return this.pendingQueue.length
  }
}
