// ============================================================
// api-flow — Core Types
// ============================================================

// ─── Adapter ─────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface AdapterRequest {
  url: string
  method: HttpMethod
  headers: Record<string, string>
  body?: BodyInit | null
  signal?: AbortSignal | null | undefined
  timeout?: number | undefined
}

export interface AdapterResponse<T = unknown> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  ok: boolean
  url: string
  duration: number
}

export interface Adapter {
  request<T>(req: AdapterRequest): Promise<AdapterResponse<T>>
}

// ─── Auth ─────────────────────────────────────────────────────

export interface AuthConfig {
  /** Returns the current access token (sync or async) */
  getAccessToken?: () => string | null | undefined | Promise<string | null | undefined>
  /** Returns the current refresh token (sync or async) */
  getRefreshToken?: () => string | null | undefined | Promise<string | null | undefined>
  /** Called when a 401 is received. Should refresh tokens and return the new access token. */
  refresh?: (refreshToken: string | null | undefined) => Promise<string | null | undefined>
  /** Custom auth header key, defaults to "Authorization" */
  headerKey?: string
  /** Custom token scheme, defaults to "Bearer" */
  scheme?: string
  /** Status codes that trigger refresh, defaults to [401] */
  refreshOn?: number[]
}

// ─── Cache ────────────────────────────────────────────────────

export interface CacheConfig {
  /** Enable caching for GET requests. Default: false */
  enabled?: boolean
  /** Default TTL in milliseconds. Default: 5 * 60 * 1000 (5 min) */
  ttl?: number
  /** Max number of entries to store. Default: 100 */
  maxSize?: number
}

// ─── Retry ────────────────────────────────────────────────────

export interface RetryConfig {
  /** Number of retry attempts. Default: 0 */
  attempts?: number
  /** Base delay in ms for exponential backoff. Default: 300 */
  delay?: number
  /** Max delay cap in ms. Default: 30000 */
  maxDelay?: number
  /** HTTP status codes to retry. Default: [408, 429, 500, 502, 503, 504] */
  statusCodes?: number[]
  /** Whether to add jitter to backoff. Default: true */
  jitter?: boolean
  /** Called before each retry. Return false to cancel. */
  onRetry?: (error: ApiError, attempt: number) => boolean | void | Promise<boolean | void>
}

// ─── Interceptors ─────────────────────────────────────────────

export interface InterceptorConfig {
  /** Transform request config before it is sent */
  beforeRequest?: (config: ResolvedRequestConfig) => ResolvedRequestConfig | Promise<ResolvedRequestConfig>
  /** Transform response before it is returned to caller */
  afterResponse?: <T>(response: AdapterResponse<T>) => AdapterResponse<T> | Promise<AdapterResponse<T>>
  /** Handle errors before they propagate */
  onError?: (error: ApiError) => ApiError | void | Promise<ApiError | void>
}

// ─── Logger ───────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none'

export interface LoggerConfig {
  /** Enable request/response logging. Default: false */
  enabled?: boolean
  /** Log level filter. Default: "info" */
  level?: LogLevel
  /** Whether to log request headers. Default: false */
  logHeaders?: boolean
  /** Whether to log request/response body. Default: false */
  logBody?: boolean
}

// ─── Metrics ──────────────────────────────────────────────────

export interface MetricsEntry {
  url: string
  method: HttpMethod
  status: number
  duration: number
  timestamp: number
  cached: boolean
  retries: number
}

// ─── Offline ──────────────────────────────────────────────────

export interface OfflineConfig {
  /** Enable offline queuing. Default: false */
  enabled?: boolean
  /** Max requests to queue while offline. Default: 50 */
  maxQueueSize?: number
}

// ─── Events ───────────────────────────────────────────────────

export interface EventMap {
  'request:start': RequestStartEvent
  'request:end': RequestEndEvent
  'request:error': RequestErrorEvent
  'auth:refresh': AuthRefreshEvent
  'cache:hit': CacheHitEvent
  'offline:queued': OfflineQueuedEvent
  'offline:replay': OfflineReplayEvent
}

export interface RequestStartEvent {
  id: string
  url: string
  method: HttpMethod
  headers: Record<string, string>
}

export interface RequestEndEvent {
  id: string
  url: string
  method: HttpMethod
  status: number
  duration: number
  cached: boolean
}

export interface RequestErrorEvent {
  id: string
  url: string
  method: HttpMethod
  error: ApiError
}

export interface AuthRefreshEvent {
  success: boolean
  queuedRequests: number
}

export interface CacheHitEvent {
  url: string
  ttl: number
}

export interface OfflineQueuedEvent {
  url: string
  method: HttpMethod
  queueSize: number
}

export interface OfflineReplayEvent {
  replayed: number
}

// ─── Plugin ───────────────────────────────────────────────────

export interface Plugin {
  name: string
  install(client: ApiClientInterface): void
}

// ─── Request Options ──────────────────────────────────────────

export interface RequestOptions {
  /** Override headers for this request */
  headers?: Record<string, string>
  /** Override timeout for this request (ms) */
  timeout?: number
  /** Override retry config for this request */
  retry?: RetryConfig | number
  /** Cache TTL override for this request (ms). 0 disables cache. */
  cache?: number | false
  /** AbortSignal to cancel the request */
  signal?: AbortSignal | null
  /** Unique ID for this request (for cancel support) */
  id?: string
  /** Query params to append to the URL */
  params?: Record<string, string | number | boolean | null | undefined>
  /** Response type: 'json' | 'blob' | 'text' | 'arrayBuffer' */
  responseType?: 'json' | 'blob' | 'text' | 'arrayBuffer'
  /** Skip auth header injection for this request */
  skipAuth?: boolean
  /** Skip cache for this request */
  skipCache?: boolean
  /** Metadata attached to this request (passed through events) */
  meta?: Record<string, unknown>
}

// ─── Resolved Request Config ──────────────────────────────────

export interface ResolvedRequestConfig {
  url: string
  method: HttpMethod
  headers: Record<string, string>
  body?: unknown
  id: string
  timeout?: number
  retry?: RetryConfig | number
  cache?: number | false
  signal?: AbortSignal | null
  responseType?: 'json' | 'blob' | 'text' | 'arrayBuffer'
  skipAuth?: boolean
  skipCache?: boolean
  params?: Record<string, string | number | boolean | null | undefined>
  meta?: Record<string, unknown>
}

// ─── API Config (Main) ────────────────────────────────────────

export interface ApiConfig {
  /** Base URL prepended to all request paths */
  baseURL?: string
  /** Default headers applied to every request */
  headers?: Record<string, string>
  /** Request timeout in ms. Default: 30000 */
  timeout?: number
  /** Authentication configuration */
  auth?: AuthConfig
  /** Cache configuration */
  cache?: CacheConfig
  /** Retry configuration */
  retry?: RetryConfig | number
  /** Request/response interceptors */
  interceptors?: InterceptorConfig
  /** Logger configuration */
  logger?: LoggerConfig | boolean
  /** Adapter to use for making HTTP requests. Default: 'fetch' */
  adapter?: 'fetch' | 'axios' | Adapter
  /** Global error handler */
  onError?: (error: ApiError) => void
  /** Global success handler */
  onSuccess?: <T>(response: AdapterResponse<T>) => void
  /** Offline queue configuration */
  offline?: OfflineConfig
  /** CSRF token configuration */
  csrf?: CsrfConfig
  /** Cookie credentials mode. Default: 'same-origin' */
  credentials?: RequestCredentials
  /** Whether to collect performance metrics. Default: false */
  metrics?: boolean
}

// ─── CSRF ─────────────────────────────────────────────────────

export interface CsrfConfig {
  /** CSRF token header name. Default: "X-CSRF-Token" */
  headerName?: string
  /** Cookie name to read CSRF token from */
  cookieName?: string
  /** Static CSRF token value */
  token?: string
}

// ─── API Error ────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number
  readonly statusText: string
  readonly data: unknown
  readonly url: string
  readonly method: HttpMethod
  readonly headers: Record<string, string>
  readonly isNetworkError: boolean
  readonly isTimeoutError: boolean
  readonly retries: number
  readonly requestId: string

  constructor(params: {
    message: string
    status: number
    statusText: string
    data?: unknown
    url: string
    method: HttpMethod
    headers?: Record<string, string>
    isNetworkError?: boolean
    isTimeoutError?: boolean
    retries?: number
    requestId?: string
    cause?: unknown
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.statusText = params.statusText
    this.data = params.data
    this.url = params.url
    this.method = params.method
    this.headers = params.headers ?? {}
    this.isNetworkError = params.isNetworkError ?? false
    this.isTimeoutError = params.isTimeoutError ?? false
    this.retries = params.retries ?? 0
    this.requestId = params.requestId ?? ''
  }
}

// ─── Upload / Download ────────────────────────────────────────

export interface UploadOptions extends RequestOptions {
  /** Called with progress percentage 0–100 */
  onProgress?: (percent: number, loaded: number, total: number) => void
}

export interface DownloadOptions extends RequestOptions {
  /** Called with progress percentage 0–100 */
  onProgress?: (percent: number, loaded: number, total: number) => void
}

// ─── Pagination ───────────────────────────────────────────────

export interface PagePaginationParams {
  page?: number
  limit?: number
  [key: string]: unknown
}

export interface CursorPaginationParams {
  cursor?: string | null
  limit?: number
  [key: string]: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total?: number
  page?: number
  limit?: number
  nextCursor?: string | null
  hasMore?: boolean
}

// ─── Client Interface ─────────────────────────────────────────

export interface ApiClientInterface {
  get<T = unknown>(url: string, options?: RequestOptions): Promise<AdapterResponse<T>>
  post<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<AdapterResponse<T>>
  put<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<AdapterResponse<T>>
  patch<T = unknown>(url: string, body?: unknown, options?: RequestOptions): Promise<AdapterResponse<T>>
  delete<T = unknown>(url: string, options?: RequestOptions): Promise<AdapterResponse<T>>
  cancel(id: string): void
  use(plugin: Plugin): this
  getMetrics(): MetricsEntry[]
  clearCache(): void
  clearMetrics(): void
  on<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): () => void
  off<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): void
}
