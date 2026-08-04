import type {
  ApiConfig,
  ApiClientInterface,
  RequestOptions,
  AdapterResponse,
  HttpMethod,
  Plugin,
  EventMap,
  MetricsEntry,
  UploadOptions,
  DownloadOptions,
  PagePaginationParams,
  CursorPaginationParams,
  PaginatedResponse,
  RetryConfig,
} from './types.ts'
import { ApiError } from './types.ts'
import { buildRequest, serializeBody, getRequestKey } from './request.ts'
import { MemoryCache } from '../cache/memory.ts'
import { TokenRefreshManager } from '../auth/refresh.ts'
import { executeWithRetry } from '../retry/retry.ts'
import { InterceptorChain } from '../interceptors/interceptor.ts'
import { EventEmitter } from '../events/emitter.ts'
import { RequestQueue } from '../queue/request-queue.ts'
import { ApiLogger } from '../logger/logger.ts'
import { MetricsCollector } from '../metrics/metrics.ts'
import { getFetchAdapter } from '../adapters/fetch.ts'

export class ApiClient implements ApiClientInterface {
  private readonly config: Required<Pick<ApiConfig, 'timeout' | 'credentials'>> & ApiConfig
  private readonly cache: MemoryCache
  private readonly refreshManager: TokenRefreshManager
  private readonly interceptors: InterceptorChain
  private readonly emitter: EventEmitter
  private readonly queue: RequestQueue
  private readonly logger: ApiLogger
  private readonly metricsCollector: MetricsCollector
  private readonly plugins: Plugin[] = []
  private readonly abortControllers = new Map<string, AbortController>()
  private readonly inFlightRequests = new Map<string, Promise<AdapterResponse<unknown>>>()

  constructor(config: ApiConfig = {}) {
    this.config = {
      timeout: 30_000,
      credentials: 'same-origin',
      ...config,
    }

    // Initialize subsystems
    this.cache = new MemoryCache(
      config.cache?.maxSize ?? 100,
      config.cache?.ttl ?? 5 * 60 * 1000,
    )
    this.refreshManager = new TokenRefreshManager(config.auth)
    this.interceptors = new InterceptorChain(config.interceptors)
    this.emitter = new EventEmitter()
    this.queue = new RequestQueue(config.offline)
    this.logger = new ApiLogger(config.logger)
    this.metricsCollector = new MetricsCollector(config.metrics ?? false)
  }

  // ─── HTTP Methods ──────────────────────────────────────────

  async get<T = unknown>(url: string, options?: RequestOptions): Promise<AdapterResponse<T>> {
    return this.request<T>('GET', url, undefined, options)
  }

  async post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<AdapterResponse<T>> {
    return this.request<T>('POST', url, body, options)
  }

  async put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<AdapterResponse<T>> {
    return this.request<T>('PUT', url, body, options)
  }

  async patch<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<AdapterResponse<T>> {
    return this.request<T>('PATCH', url, body, options)
  }

  async delete<T = unknown>(url: string, options?: RequestOptions): Promise<AdapterResponse<T>> {
    return this.request<T>('DELETE', url, undefined, options)
  }

  // ─── File Upload ────────────────────────────────────────────

  async upload<T = unknown>(
    url: string,
    formData: FormData,
    options?: UploadOptions,
  ): Promise<AdapterResponse<T>> {
    const { uploadWithProgress } = await import('../upload/upload.ts')
    return uploadWithProgress<T>(url, formData, this.config, options)
  }

  // ─── File Download ──────────────────────────────────────────

  async download(url: string, options?: DownloadOptions): Promise<Blob> {
    const { downloadWithProgress } = await import('../download/download.ts')
    return downloadWithProgress(url, this.config, options)
  }

  // ─── Pagination ─────────────────────────────────────────────

  async *paginate<T = unknown>(
    url: string,
    params?: PagePaginationParams,
    options?: RequestOptions,
  ): AsyncGenerator<PaginatedResponse<T>> {
    const { createPagePaginator } = await import('../pagination/pagination.ts')
    yield* createPagePaginator<T>(this, url, params, options)
  }

  async *cursorPaginate<T = unknown>(
    url: string,
    params?: CursorPaginationParams,
    options?: RequestOptions,
  ): AsyncGenerator<PaginatedResponse<T>> {
    const { createCursorPaginator } = await import('../pagination/pagination.ts')
    yield* createCursorPaginator<T>(this, url, params, options)
  }

  // ─── Plugin System ──────────────────────────────────────────

  use(plugin: Plugin): this {
    if (this.plugins.find((p) => p.name === plugin.name)) {
      console.warn(`[api-flow] Plugin "${plugin.name}" is already registered.`)
      return this
    }
    this.plugins.push(plugin)
    plugin.install(this)
    return this
  }

  // ─── Cancel ─────────────────────────────────────────────────

  cancel(id: string): void {
    const controller = this.abortControllers.get(id)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(id)
    }
  }

  cancelAll(): void {
    this.abortControllers.forEach((ctrl) => ctrl.abort())
    this.abortControllers.clear()
  }

  // ─── Events ─────────────────────────────────────────────────

  on<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): () => void {
    return this.emitter.on(event, listener)
  }

  off<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): void {
    this.emitter.off(event, listener)
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.emitter.emit(event, data)
  }

  // ─── Metrics ────────────────────────────────────────────────

  getMetrics(): MetricsEntry[] {
    return this.metricsCollector.getAll()
  }

  clearMetrics(): void {
    this.metricsCollector.clear()
  }

  // ─── Cache Control ──────────────────────────────────────────

  clearCache(url?: string): void {
    if (url) {
      this.cache.invalidate(url)
    } else {
      this.cache.clear()
    }
  }

  // ─── Core Request Executor ──────────────────────────────────

  private async request<T>(
    method: HttpMethod,
    url: string,
    body: unknown,
    options: RequestOptions = {},
  ): Promise<AdapterResponse<T>> {
    // Offline queuing
    if (this.config.offline?.enabled && this.queue.isOffline()) {
      return this.queue.enqueue<T>(method, url, body, options)
    }

    // Build resolved config
    const resolved = await buildRequest(
      url,
      method,
      body,
      options,
      this.config,
      () => this.refreshManager.getAuthHeader(),
    )

    // Run beforeRequest interceptors
    const interceptedConfig = await this.interceptors.runBeforeRequest(resolved)

    // Cache check (GET only, unless skipCache)
    const cacheKey = getRequestKey(method, interceptedConfig.url, options.params)
    if (method === 'GET' && this.config.cache?.enabled && !options.skipCache) {
      const cached = this.cache.get<AdapterResponse<T>>(cacheKey)
      if (cached) {
        this.logger.logCacheHit(interceptedConfig.url)
        this.emitter.emit('cache:hit', {
          url: interceptedConfig.url,
          ttl: this.cache.getTtl(cacheKey) ?? 0,
        })
        this.metricsCollector.record({
          url: interceptedConfig.url,
          method,
          status: cached.status,
          duration: 0,
          timestamp: Date.now(),
          cached: true,
          retries: 0,
        })
        return cached
      }
    }

    // Request deduplication for GET requests
    if (method === 'GET' && this.inFlightRequests.has(cacheKey)) {
      return this.inFlightRequests.get(cacheKey)! as Promise<AdapterResponse<T>>
    }

    // Create per-request AbortController
    const controller = new AbortController()
    const requestId = interceptedConfig.id

    if (!options.signal) {
      this.abortControllers.set(requestId, controller)
    }

    const signal = options.signal ?? controller.signal

    // Emit request:start
    this.emitter.emit('request:start', {
      id: requestId,
      url: interceptedConfig.url,
      method,
      headers: interceptedConfig.headers,
    })

    this.logger.logRequest(interceptedConfig)

    const startTime = performance.now()

    const executeRequest = async (): Promise<AdapterResponse<T>> => {
      const adapter = await this.resolveAdapter()
      return adapter.request<T>({
        url: interceptedConfig.url,
        method,
        headers: interceptedConfig.headers,
        body: serializeBody(interceptedConfig.body) ?? null,
        signal: signal ?? null,
        timeout: interceptedConfig.timeout,
      })
    }

    const retryConfig = this.resolveRetryConfig(options.retry ?? this.config.retry)

    const promise = executeWithRetry<T>(executeRequest, retryConfig, (error, attempt) => {
      this.logger.logRetry(interceptedConfig.url, attempt, error)
    })
      .then(async (response) => {
        // Handle 401 with token refresh
        if (response.status === 401 && this.config.auth?.refresh) {
          const retried = await this.refreshManager.handleUnauthorized(
            () => executeRequest(),
            (queuedCount) => {
              this.emitter.emit('auth:refresh', { success: true, queuedRequests: queuedCount })
            },
          )
          if (retried !== null) return retried as AdapterResponse<T>
        }

        const duration = performance.now() - startTime
        const finalResponse = await this.interceptors.runAfterResponse(response)

        // Store in cache
        if (method === 'GET' && this.config.cache?.enabled && !options.skipCache && finalResponse.ok) {
          const ttl = typeof options.cache === 'number' ? options.cache : this.config.cache.ttl
          this.cache.set(cacheKey, finalResponse, ttl)
        }

        // Record metrics
        this.metricsCollector.record({
          url: interceptedConfig.url,
          method,
          status: finalResponse.status,
          duration,
          timestamp: Date.now(),
          cached: false,
          retries: 0,
        })

        this.logger.logResponse(finalResponse, duration)
        this.emitter.emit('request:end', {
          id: requestId,
          url: interceptedConfig.url,
          method,
          status: finalResponse.status,
          duration,
          cached: false,
        })

        if (this.config.onSuccess) {
          this.config.onSuccess(finalResponse)
        }

        return finalResponse
      })
      .catch(async (error: unknown) => {
        const duration = performance.now() - startTime
        const apiError =
          error instanceof ApiError
            ? error
            : new ApiError({
                message: error instanceof Error ? error.message : 'Unknown error',
                status: 0,
                statusText: 'Network Error',
                url: interceptedConfig.url,
                method,
                isNetworkError: true,
                requestId,
              })

        // Run error interceptors
        const handledError = await this.interceptors.runOnError(apiError)

        this.logger.logError(apiError, duration)
        this.emitter.emit('request:error', {
          id: requestId,
          url: interceptedConfig.url,
          method,
          error: handledError ?? apiError,
        })

        if (this.config.onError) {
          this.config.onError(handledError ?? apiError)
        }

        throw handledError ?? apiError
      })
      .finally(() => {
        this.abortControllers.delete(requestId)
        this.inFlightRequests.delete(cacheKey)
      })

    // Register in-flight for deduplication
    if (method === 'GET') {
      this.inFlightRequests.set(cacheKey, promise as Promise<AdapterResponse<unknown>>)
    }

    return promise
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async resolveAdapter() {
    const adapterOption = this.config.adapter ?? 'fetch'

    if (typeof adapterOption === 'object' && 'request' in adapterOption) {
      return adapterOption
    }

    if (adapterOption === 'axios') {
      const { getAxiosAdapter } = await import('../adapters/axios.ts')
      return getAxiosAdapter(this.config)
    }

    return getFetchAdapter(this.config)
  }

  private resolveRetryConfig(retry?: RetryConfig | number): RetryConfig {
    if (retry === undefined) return { attempts: 0 }
    if (typeof retry === 'number') return { attempts: retry }
    return retry
  }
}

/**
 * Creates a new ApiClient instance.
 *
 * @example
 * const api = createApi({
 *   baseURL: 'https://api.example.com',
 *   auth: {
 *     getAccessToken: () => localStorage.getItem('token'),
 *     refresh: async (token) => { ... }
 *   }
 * })
 */
export function createApi(config?: ApiConfig): ApiClient {
  return new ApiClient(config)
}
