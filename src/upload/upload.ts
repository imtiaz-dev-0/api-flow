import type { ApiConfig, UploadOptions, AdapterResponse } from '../core/types.ts'
import { ApiError } from '../core/types.ts'
import { buildUrl } from '../utils/helpers.ts'

/**
 * Multipart file upload with progress tracking.
 *
 * Uses XMLHttpRequest for progress events in browser environments.
 * Falls back to fetch (without progress) in Node.js / React Native.
 */
export async function uploadWithProgress<T>(
  url: string,
  formData: FormData,
  config: ApiConfig,
  options?: UploadOptions,
): Promise<AdapterResponse<T>> {
  const fullUrl = buildUrl(config.baseURL ?? '', url)
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()

  // XHR path: browser with progress support
  if (typeof XMLHttpRequest !== 'undefined' && options?.onProgress) {
    return uploadWithXhr<T>(fullUrl, formData, config, options, startTime)
  }

  // Fetch fallback: Node.js / React Native / no progress needed
  return uploadWithFetch<T>(fullUrl, formData, config, options, startTime)
}

function uploadWithXhr<T>(
  url: string,
  formData: FormData,
  config: ApiConfig,
  options: UploadOptions,
  startTime: number,
): Promise<AdapterResponse<T>> {
  return new Promise<AdapterResponse<T>>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)

    // Set headers (excluding Content-Type — let XHR set multipart boundary)
    const headers = { ...config.headers, ...options.headers }
    for (const [key, value] of Object.entries(headers ?? {})) {
      if (key.toLowerCase() !== 'content-type') {
        xhr.setRequestHeader(key, value)
      }
    }

    xhr.withCredentials = config.credentials === 'include'

    // Progress tracking
    if (options.onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          options.onProgress!(percent, event.loaded, event.total)
        }
      })
    }

    // Abort support
    if (options.signal) {
      options.signal.addEventListener('abort', () => xhr.abort(), { once: true })
    }

    xhr.addEventListener('load', () => {
      const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
      let data: T
      try {
        data = JSON.parse(xhr.responseText) as T
      } catch {
        data = xhr.responseText as T
      }

      const responseHeaders: Record<string, string> = {}
      xhr.getAllResponseHeaders()
        .trim()
        .split('\r\n')
        .forEach((line) => {
          const [key, ...rest] = line.split(': ')
          if (key) responseHeaders[key.toLowerCase()] = rest.join(': ')
        })

      if (xhr.status >= 400) {
        reject(
          new ApiError({
            message: `Upload failed with status ${xhr.status}`,
            status: xhr.status,
            statusText: xhr.statusText,
            data,
            url,
            method: 'POST',
            headers: responseHeaders,
          }),
        )
        return
      }

      resolve({
        data,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders,
        ok: xhr.status >= 200 && xhr.status < 300,
        url,
        duration,
      })
    })

    xhr.addEventListener('error', () => {
      reject(
        new ApiError({
          message: 'Upload network error',
          status: 0,
          statusText: 'Network Error',
          url,
          method: 'POST',
          isNetworkError: true,
        }),
      )
    })

    xhr.addEventListener('timeout', () => {
      reject(
        new ApiError({
          message: `Upload timed out after ${options.timeout ?? config.timeout}ms`,
          status: 0,
          statusText: 'Request Timeout',
          url,
          method: 'POST',
          isTimeoutError: true,
        }),
      )
    })

    xhr.timeout = options.timeout ?? config.timeout ?? 30_000
    xhr.send(formData)
  })
}

async function uploadWithFetch<T>(
  url: string,
  formData: FormData,
  config: ApiConfig,
  options: UploadOptions | undefined,
  startTime: number,
): Promise<AdapterResponse<T>> {
  const headers = { ...config.headers, ...options?.headers }
  // Remove Content-Type — let fetch set multipart boundary
  delete headers['Content-Type']
  delete headers['content-type']

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    signal: options?.signal ?? null,
    credentials: config.credentials ?? 'same-origin',
  })

  const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
  let data: T
  try {
    data = (await response.json()) as T
  } catch {
    data = (await response.text()) as T
  }

  const responseHeaders: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value
  })

  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    ok: response.ok,
    url: response.url,
    duration,
  }
}
