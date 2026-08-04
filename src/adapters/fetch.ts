import type { Adapter, ApiConfig, AdapterRequest, AdapterResponse } from '../core/types.ts'
import { ApiError } from '../core/types.ts'
import { headersToRecord, parseResponseBody } from '../core/response.ts'

/**
 * Native Fetch adapter — the default adapter.
 * Zero dependencies. Works in browser, Node.js 18+, React Native, Deno, Bun.
 */
class FetchAdapter implements Adapter {
  private readonly config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  async request<T>(req: AdapterRequest): Promise<AdapterResponse<T>> {
    const startTime = getTime()

    // Set up timeout via AbortController if timeout is configured
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let timeoutController: AbortController | null = null

    if (req.timeout && req.timeout > 0) {
      timeoutController = new AbortController()
      timeoutId = setTimeout(() => timeoutController!.abort(), req.timeout)
    }

    // Merge signals: user's signal + timeout signal
    const signal = mergeSignals([req.signal, timeoutController?.signal])

    try {
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: req.headers,
        body: req.body ?? null,
        signal: signal ?? null,
        credentials: this.config.credentials ?? 'same-origin',
      }

      const rawResponse = await fetch(req.url, fetchOptions)
      const duration = getTime() - startTime
      const responseHeaders = headersToRecord(rawResponse.headers)
      const responseType = 'json' // default, will be overridden per request type if needed
      const data = await parseResponseBody<T>(rawResponse, responseType)

      if (!rawResponse.ok) {
        throw new ApiError({
          message: `Request failed with status ${rawResponse.status}: ${rawResponse.statusText}`,
          status: rawResponse.status,
          statusText: rawResponse.statusText,
          data,
          url: rawResponse.url,
          method: req.method,
          headers: responseHeaders,
        })
      }

      return {
        data,
        status: rawResponse.status,
        statusText: rawResponse.statusText,
        headers: responseHeaders,
        ok: rawResponse.ok,
        url: rawResponse.url,
        duration,
      }
    } catch (error) {
      if (error instanceof ApiError) throw error

      const isAbortError = error instanceof DOMException && error.name === 'AbortError'
      const isTimeoutError = isAbortError && timeoutController?.signal.aborted === true

      throw new ApiError({
        message: isTimeoutError
          ? `Request timed out after ${req.timeout}ms`
          : error instanceof Error
            ? error.message
            : 'Network error',
        status: 0,
        statusText: isTimeoutError ? 'Request Timeout' : 'Network Error',
        url: req.url,
        method: req.method,
        isNetworkError: !isTimeoutError,
        isTimeoutError,
        cause: error,
      })
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId)
    }
  }
}

/**
 * Merges multiple AbortSignals into one — aborts when any source aborts.
 * Uses AbortSignal.any() if available (Node 20+, Chrome 116+), with a manual fallback.
 */
function mergeSignals(signals: Array<AbortSignal | null | undefined>): AbortSignal | undefined {
  const validSignals = signals.filter((s): s is AbortSignal => s != null)
  if (validSignals.length === 0) return undefined
  if (validSignals.length === 1) return validSignals[0]

  // Modern: AbortSignal.any()
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
    return (AbortSignal as { any(signals: AbortSignal[]): AbortSignal }).any(validSignals)
  }

  // Fallback: manual merge
  const controller = new AbortController()
  for (const signal of validSignals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}

function getTime(): number {
  if (typeof performance !== 'undefined') return performance.now()
  return Date.now()
}

/** Singleton instance cache per config */
const adapterCache = new WeakMap<ApiConfig, FetchAdapter>()

export function getFetchAdapter(config: ApiConfig): FetchAdapter {
  if (!adapterCache.has(config)) {
    adapterCache.set(config, new FetchAdapter(config))
  }
  return adapterCache.get(config)!
}
