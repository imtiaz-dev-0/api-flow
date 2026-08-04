import type { LoggerConfig, ResolvedRequestConfig, AdapterResponse } from '../core/types.ts'
import { ApiError } from '../core/types.ts'

const COLORS = {
  get: '#61AFEF',
  post: '#98C379',
  put: '#E5C07B',
  patch: '#C678DD',
  delete: '#E06C75',
  error: '#E06C75',
  cache: '#56B6C2',
  retry: '#D19A66',
  info: '#ABB2BF',
}

/**
 * Development-mode request/response logger.
 * Outputs a formatted timeline to the console with durations, status codes,
 * headers (optional), and response body (optional).
 *
 * Completely silent in production (NODE_ENV !== 'development').
 */
export class ApiLogger {
  private readonly config: LoggerConfig
  private readonly enabled: boolean

  constructor(config?: LoggerConfig | boolean) {
    if (typeof config === 'boolean') {
      this.config = { enabled: config }
    } else {
      this.config = config ?? {}
    }

    this.enabled =
      this.config.enabled === true ||
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' && this.config.enabled !== false)
  }

  logRequest(config: ResolvedRequestConfig): void {
    if (!this.enabled) return

    const method = config.method.toUpperCase()
    const color = COLORS[config.method.toLowerCase() as keyof typeof COLORS] ?? COLORS.info

    console.group(
      `%c⬆ ${method}%c ${config.url}`,
      `color: ${color}; font-weight: bold`,
      'color: inherit; font-weight: normal',
    )
    console.info('%cRequest ID:', 'color: #ABB2BF', config.id)

    if (this.config.logHeaders) {
      console.info('%cHeaders:', 'color: #ABB2BF', config.headers)
    }

    if (this.config.logBody && config.body !== undefined) {
      console.info('%cBody:', 'color: #ABB2BF', config.body)
    }

    console.groupEnd()
  }

  logResponse<T>(response: AdapterResponse<T>, duration: number): void {
    if (!this.enabled) return

    const isSuccess = response.ok
    const statusColor = isSuccess ? '#98C379' : '#E06C75'
    const emoji = isSuccess ? '⬇' : '⚠'

    console.group(
      `%c${emoji} ${response.status}%c ${response.url} %c${duration.toFixed(0)}ms`,
      `color: ${statusColor}; font-weight: bold`,
      'color: inherit',
      'color: #ABB2BF; font-style: italic',
    )

    if (this.config.logHeaders) {
      console.info('%cHeaders:', 'color: #ABB2BF', response.headers)
    }

    if (this.config.logBody) {
      console.info('%cBody:', 'color: #ABB2BF', response.data)
    }

    console.groupEnd()
  }

  logError(error: ApiError, duration: number): void {
    if (!this.enabled) return

    console.group(
      `%c✗ ERROR%c ${error.url} %c${duration.toFixed(0)}ms`,
      `color: ${COLORS.error}; font-weight: bold`,
      'color: inherit',
      'color: #ABB2BF; font-style: italic',
    )
    console.error('%cMessage:', 'color: #E06C75', error.message)
    console.error('%cStatus:', 'color: #E06C75', error.status)

    if (error.data) {
      console.error('%cData:', 'color: #E06C75', error.data)
    }

    console.groupEnd()
  }

  logCacheHit(url: string): void {
    if (!this.enabled) return
    console.info(`%c⚡ CACHE HIT%c ${url}`, `color: ${COLORS.cache}; font-weight: bold`, 'color: inherit')
  }

  logRetry(url: string, attempt: number, error: ApiError): void {
    if (!this.enabled) return
    console.warn(
      `%c↻ RETRY ${attempt}%c ${url} — ${error.message}`,
      `color: ${COLORS.retry}; font-weight: bold`,
      'color: inherit',
    )
  }
}
