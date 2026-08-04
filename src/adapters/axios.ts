/**
 * Axios adapter — optional adapter for projects that already use axios.
 *
 * Install peer dependency:
 *   npm install axios
 *
 * Usage:
 *   import { createApi } from 'api-flow-client'
 *   const api = createApi({ adapter: 'axios' })
 *
 * Or import explicitly:
 *   import { getAxiosAdapter } from 'api-flow-client/adapters/axios'
 */

import type { Adapter, AdapterRequest, AdapterResponse, ApiConfig } from '../core/types.ts'
import { ApiError } from '../core/types.ts'

// Lazy import — axios is only loaded if this adapter is actually used
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importAxios(): Promise<any> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const mod = await import('axios' as string)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return mod.default ?? mod
  } catch {
    throw new Error(
      '[api-flow] Axios adapter requires axios to be installed.\n' +
        'Run: npm install axios',
    )
  }
}

class AxiosAdapter implements Adapter {
  private readonly config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  async request<T>(req: AdapterRequest): Promise<AdapterResponse<T>> {
    const axios = await importAxios()
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const response = await axios.request({
        url: req.url,
        method: req.method.toLowerCase(),
        headers: req.headers,
        data: req.body,
        signal: req.signal,
        timeout: req.timeout,
        withCredentials: this.config.credentials === 'include',
        validateStatus: () => true, // handle errors ourselves
      })

      const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
      const responseHeaders: Record<string, string> = {}
      for (const [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') responseHeaders[key] = value
      }

      const ok = response.status >= 200 && response.status < 300

      if (!ok) {
        throw new ApiError({
          message: `Request failed with status ${response.status}: ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          url: req.url,
          method: req.method,
          headers: responseHeaders,
        })
      }

      return {
        data: response.data as T,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        ok,
        url: req.url,
        duration,
      }
    } catch (error) {
      if (error instanceof ApiError) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axiosError = error as any
      throw new ApiError({
        message: axiosError?.message ?? 'Network error',
        status: axiosError?.response?.status ?? 0,
        statusText: axiosError?.response?.statusText ?? 'Network Error',
        data: axiosError?.response?.data,
        url: req.url,
        method: req.method,
        isNetworkError: !axiosError?.response,
        isTimeoutError: axiosError?.code === 'ECONNABORTED' || axiosError?.code === 'ERR_CANCELED',
        cause: error,
      })
    }
  }
}

const adapterCache = new WeakMap<ApiConfig, AxiosAdapter>()

export function getAxiosAdapter(config: ApiConfig): AxiosAdapter {
  if (!adapterCache.has(config)) {
    adapterCache.set(config, new AxiosAdapter(config))
  }
  return adapterCache.get(config)!
}
