import type { AdapterResponse } from './types.ts'

/**
 * Parses raw adapter output into a normalized AdapterResponse.
 * Handles JSON, Blob, text, and ArrayBuffer response types.
 */
export function normalizeResponse<T>(raw: AdapterResponse<T>): AdapterResponse<T> {
  return {
    data: raw.data,
    status: raw.status,
    statusText: raw.statusText,
    headers: raw.headers,
    ok: raw.ok,
    url: raw.url,
    duration: raw.duration,
  }
}

/**
 * Extracts all headers from a Headers object into a plain Record.
 */
export function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key] = value
  })
  return record
}

/**
 * Attempts to parse a response body as JSON, falling back to text.
 */
export async function parseResponseBody<T>(
  response: Response,
  responseType: 'json' | 'blob' | 'text' | 'arrayBuffer',
): Promise<T> {
  if (responseType === 'blob') return (await response.blob()) as T
  if (responseType === 'text') return (await response.text()) as T
  if (responseType === 'arrayBuffer') return (await response.arrayBuffer()) as T

  // Default: JSON with text fallback
  const text = await response.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}
