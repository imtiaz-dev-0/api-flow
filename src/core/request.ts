import type { ResolvedRequestConfig, HttpMethod, RequestOptions, ApiConfig } from './types.ts'
import { generateId, buildUrl, isAbsoluteUrl, mergeHeaders } from '../utils/helpers.ts'
import { getCsrfToken } from '../utils/csrf.ts'

/**
 * Builds a fully resolved request config by merging global API config,
 * per-request options, auth headers, and computed defaults.
 */
export async function buildRequest(
  url: string,
  method: HttpMethod,
  body: unknown,
  options: RequestOptions,
  config: ApiConfig,
  getAuthHeader: () => Promise<Record<string, string>>,
): Promise<ResolvedRequestConfig> {
  const id = options.id ?? generateId()

  // Build full URL
  const fullUrl = isAbsoluteUrl(url)
    ? url
    : buildUrl(config.baseURL ?? '', url, options.params)

  // Merge headers: global → per-request → auth
  const globalHeaders = config.headers ?? {}
  const requestHeaders = options.headers ?? {}
  let headers = mergeHeaders(globalHeaders, requestHeaders)

  // Inject auth header unless skipped
  if (!options.skipAuth) {
    const authHeaders = await getAuthHeader()
    headers = mergeHeaders(headers, authHeaders)
  }

  // Inject CSRF token
  if (config.csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken(config.csrf)
    if (csrfToken) {
      const csrfHeader = config.csrf.headerName ?? 'X-CSRF-Token'
      headers[csrfHeader] = csrfToken
    }
  }

  // Set Content-Type for body requests
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
  }

  // Set Accept header
  headers['Accept'] = headers['Accept'] ?? 'application/json'

  const resolved: ResolvedRequestConfig = {
    url: fullUrl,
    method,
    headers,
    body,
    id,
    timeout: options.timeout ?? config.timeout ?? 30_000,
    responseType: options.responseType ?? 'json',
    skipAuth: options.skipAuth ?? false,
    skipCache: options.skipCache ?? false,
  }

  const retry = options.retry ?? config.retry
  if (retry !== undefined) {
    resolved.retry = retry
  }
  if (options.cache !== undefined) resolved.cache = options.cache
  if (options.signal) resolved.signal = options.signal
  if (options.params) resolved.params = options.params
  if (options.meta) resolved.meta = options.meta

  return resolved
}

/**
 * Serializes the request body to a string or FormData.
 * Returns null for GET/HEAD/DELETE with no body.
 */
export function serializeBody(body: unknown): BodyInit | null {
  if (body === undefined || body === null) return null
  if (body instanceof FormData) return body
  if (body instanceof Blob) return body
  if (body instanceof ArrayBuffer) return body
  if (typeof body === 'string') return body
  return JSON.stringify(body)
}

/**
 * Creates a deduplication key for a request (used for cache + dedup).
 */
export function getRequestKey(method: string, url: string, params?: Record<string, unknown>): string {
  const paramStr = params ? JSON.stringify(params) : ''
  return `${method}:${url}:${paramStr}`
}
