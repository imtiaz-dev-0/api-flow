/**
 * api-flow — The easiest and most powerful API client for JavaScript and TypeScript.
 *
 * @example
 * import { createApi } from 'api-flow'
 *
 * const api = createApi({
 *   baseURL: 'https://api.example.com',
 *   auth: {
 *     getAccessToken: () => localStorage.getItem('token'),
 *     refresh: async () => { ... }
 *   }
 * })
 *
 * const users = await api.get<User[]>('/users')
 * await api.post('/login', { email, password })
 */

// ─── Core ─────────────────────────────────────────────────────
export { ApiClient, createApi } from './core/client.ts'
export { ApiError } from './core/types.ts'

// ─── Types ────────────────────────────────────────────────────
export type {
  ApiConfig,
  ApiClientInterface,
  RequestOptions,
  AdapterResponse,
  AdapterRequest,
  Adapter,
  HttpMethod,
  AuthConfig,
  CacheConfig,
  RetryConfig,
  InterceptorConfig,
  LoggerConfig,
  LogLevel,
  OfflineConfig,
  CsrfConfig,
  EventMap,
  Plugin,
  MetricsEntry,
  UploadOptions,
  DownloadOptions,
  PagePaginationParams,
  CursorPaginationParams,
  PaginatedResponse,
  ResolvedRequestConfig,
  RequestStartEvent,
  RequestEndEvent,
  RequestErrorEvent,
  AuthRefreshEvent,
  CacheHitEvent,
  OfflineQueuedEvent,
  OfflineReplayEvent,
} from './core/types.ts'

// ─── Cache ────────────────────────────────────────────────────
export { MemoryCache } from './cache/memory.ts'

// ─── Auth ─────────────────────────────────────────────────────
export { TokenRefreshManager } from './auth/refresh.ts'

// ─── Retry ────────────────────────────────────────────────────
export { executeWithRetry } from './retry/retry.ts'

// ─── Events ───────────────────────────────────────────────────
export { EventEmitter } from './events/emitter.ts'

// ─── Interceptors ─────────────────────────────────────────────
export { InterceptorChain } from './interceptors/interceptor.ts'

// ─── Logger ───────────────────────────────────────────────────
export { ApiLogger } from './logger/logger.ts'

// ─── Metrics ──────────────────────────────────────────────────
export { MetricsCollector } from './metrics/metrics.ts'

// ─── Plugins ──────────────────────────────────────────────────
export { definePlugin, createNetworkRetryPlugin, createAuthRefreshPlugin } from './plugins/plugin.ts'

// ─── SSR ──────────────────────────────────────────────────────
export { createServerSideApi, extractServerHeaders } from './ssr/ssr.ts'

// ─── Utilities ────────────────────────────────────────────────
export { buildUrl, buildQueryString, mergeHeaders, generateId } from './utils/helpers.ts'
