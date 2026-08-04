/**
 * Utility helpers — no external dependencies.
 */

let idCounter = 0

/** Generates a unique request ID */
export function generateId(): string {
  return `req_${Date.now()}_${++idCounter}`
}

/** Returns true if the URL is absolute (http:// or https://) */
export function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('//')
}

/**
 * Joins a base URL and path, then appends query params.
 * Handles trailing/leading slashes correctly.
 */
export function buildUrl(
  baseURL: string,
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  let url: string

  if (!baseURL) {
    url = path
  } else if (isAbsoluteUrl(path)) {
    url = path
  } else {
    const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
    const segment = path.startsWith('/') ? path : `/${path}`
    url = `${base}${segment}`
  }

  if (params) {
    const query = buildQueryString(params)
    if (query) {
      url = `${url}${url.includes('?') ? '&' : '?'}${query}`
    }
  }

  return url
}

/** Converts a params object to a URL query string */
export function buildQueryString(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  return Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

/** Merges header objects, with later entries winning */
export function mergeHeaders(
  ...headerSets: Array<Record<string, string> | undefined>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const headers of headerSets) {
    if (!headers) continue
    for (const [key, value] of Object.entries(headers)) {
      // Normalize to lowercase for consistent comparison
      result[key] = value
    }
  }
  return result
}

/** Deep merges two objects (shallow for non-plain values) */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  for (const key in source) {
    const sourceVal = source[key]
    const targetVal = target[key]
    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      ) as T[typeof key]
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[typeof key]
    }
  }
  return result
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

/** Returns a promise that rejects after the given timeout */
export function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
  )
}
