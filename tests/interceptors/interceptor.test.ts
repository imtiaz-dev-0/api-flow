import { describe, it, expect, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../setup.ts'
import { createApi } from '../../src/index.ts'

const BASE_URL = 'https://api.test.com'

describe('Interceptors', () => {
  it('should run beforeRequest and transform config', async () => {
    server.use(
      http.get(`${BASE_URL}/intercepted`, ({ request }) => {
        const header = request.headers.get('x-intercepted')
        return HttpResponse.json({ header })
      }),
    )

    const api = createApi({
      baseURL: BASE_URL,
      interceptors: {
        beforeRequest: (config) => ({
          ...config,
          headers: { ...config.headers, 'X-Intercepted': 'yes' },
        }),
      },
    })

    const res = await api.get<{ header: string }>('/intercepted')
    expect(res.data.header).toBe('yes')
  })

  it('should run afterResponse and transform response', async () => {
    server.use(
      http.get(`${BASE_URL}/transform`, () =>
        HttpResponse.json({ value: 42 }),
      ),
    )

    const api = createApi({
      baseURL: BASE_URL,
      interceptors: {
        afterResponse: (response) => ({
          ...response,
          data: { ...(response.data as object), transformed: true },
        }) as typeof response,
      },
    })

    const res = await api.get<{ value: number; transformed: boolean }>('/transform')
    expect(res.data.value).toBe(42)
    expect(res.data.transformed).toBe(true)
  })

  it('should run onError interceptor', async () => {
    server.use(
      http.get(`${BASE_URL}/error-intercept`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    )

    const onError = vi.fn((err) => err) // passthrough
    const api = createApi({
      baseURL: BASE_URL,
      interceptors: { onError },
    })

    await expect(api.get('/error-intercept')).rejects.toThrow()
    expect(onError).toHaveBeenCalledTimes(1)
  })
})

describe('Request Queue (Offline)', () => {
  it('should queue requests when offline', () => {
    const { RequestQueue } = require('../../src/queue/request-queue.ts')
    const queue = new RequestQueue({ enabled: true, maxQueueSize: 5 })

    // Simulate offline
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    expect(queue.isOffline()).toBe(true)

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    expect(queue.isOffline()).toBe(false)
  })

  it('should reject when queue is full', async () => {
    const { RequestQueue } = require('../../src/queue/request-queue.ts')
    const queue = new RequestQueue({ enabled: true, maxQueueSize: 2 })

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    queue.enqueue('GET', '/a', null, {})
    queue.enqueue('GET', '/b', null, {})
    await expect(queue.enqueue('GET', '/c', null, {})).rejects.toThrow(/full/)

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })
})
