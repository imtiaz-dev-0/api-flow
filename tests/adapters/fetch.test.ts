import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../setup.ts'
import { createApi } from '../../src/index.ts'

const BASE_URL = 'https://api.test.com'

describe('Fetch Adapter', () => {
  it('should make a successful GET request', async () => {
    server.use(
      http.get(`${BASE_URL}/hello`, () =>
        HttpResponse.json({ greeting: 'Hello!' }, { status: 200 }),
      ),
    )

    const api = createApi({ baseURL: BASE_URL, adapter: 'fetch' })
    const res = await api.get<{ greeting: string }>('/hello')

    expect(res.status).toBe(200)
    expect(res.data.greeting).toBe('Hello!')
    expect(res.ok).toBe(true)
    expect(typeof res.duration).toBe('number')
  })

  it('should include response headers', async () => {
    server.use(
      http.get(`${BASE_URL}/headers`, () =>
        HttpResponse.json({}, {
          headers: { 'x-custom-header': 'test-value' },
        }),
      ),
    )

    const api = createApi({ baseURL: BASE_URL })
    const res = await api.get('/headers')
    expect(res.headers['x-custom-header']).toBe('test-value')
  })

  it('should handle timeout by aborting request', async () => {
    server.use(
      http.get(`${BASE_URL}/slow`, async () => {
        await new Promise((r) => setTimeout(r, 5000))
        return HttpResponse.json({})
      }),
    )

    const api = createApi({ baseURL: BASE_URL, timeout: 100 })
    await expect(api.get('/slow')).rejects.toMatchObject({
      isTimeoutError: true,
    })
  }, 10000)

  it('should handle JSON parse errors gracefully', async () => {
    server.use(
      http.get(`${BASE_URL}/text`, () =>
        new HttpResponse('plain text response', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    )

    const api = createApi({ baseURL: BASE_URL })
    const res = await api.get<string>('/text')
    expect(res.data).toBe('plain text response')
  })

  it('should send Authorization header when token provided', async () => {
    let capturedAuth: string | null = null

    server.use(
      http.get(`${BASE_URL}/me`, ({ request }) => {
        capturedAuth = request.headers.get('authorization')
        return HttpResponse.json({ id: 1 })
      }),
    )

    const api = createApi({
      baseURL: BASE_URL,
      auth: { getAccessToken: () => 'my-secret-token' },
    })

    await api.get('/me')
    expect(capturedAuth).toBe('Bearer my-secret-token')
  })

  it('should send custom default headers', async () => {
    let capturedHeader: string | null = null

    server.use(
      http.get(`${BASE_URL}/custom`, ({ request }) => {
        capturedHeader = request.headers.get('x-api-version')
        return HttpResponse.json({})
      }),
    )

    const api = createApi({
      baseURL: BASE_URL,
      headers: { 'X-API-Version': '2' },
    })

    await api.get('/custom')
    expect(capturedHeader).toBe('2')
  })

  it('should override headers per request', async () => {
    let capturedHeader: string | null = null

    server.use(
      http.get(`${BASE_URL}/override`, ({ request }) => {
        capturedHeader = request.headers.get('x-custom')
        return HttpResponse.json({})
      }),
    )

    const api = createApi({
      baseURL: BASE_URL,
      headers: { 'X-Custom': 'global' },
    })

    await api.get('/override', { headers: { 'X-Custom': 'per-request' } })
    expect(capturedHeader).toBe('per-request')
  })
})

describe('Caching Integration', () => {
  it('should cache GET responses and return cached result', async () => {
    let callCount = 0
    server.use(
      http.get(`${BASE_URL}/cached`, () => {
        callCount++
        return HttpResponse.json({ count: callCount })
      }),
    )

    const api = createApi({
      baseURL: BASE_URL,
      cache: { enabled: true, ttl: 5000 },
    })

    const r1 = await api.get<{ count: number }>('/cached')
    const r2 = await api.get<{ count: number }>('/cached')

    expect(callCount).toBe(1)
    expect(r1.data.count).toBe(r2.data.count)
  })

  it('should not cache when skipCache is true', async () => {
    let callCount = 0
    server.use(
      http.get(`${BASE_URL}/no-cache`, () => {
        callCount++
        return HttpResponse.json({ count: callCount })
      }),
    )

    const api = createApi({
      baseURL: BASE_URL,
      cache: { enabled: true, ttl: 5000 },
    })

    await api.get('/no-cache', { skipCache: true })
    await api.get('/no-cache', { skipCache: true })

    expect(callCount).toBe(2)
  })

  it('should clear cache programmatically', async () => {
    let callCount = 0
    server.use(
      http.get(`${BASE_URL}/clearable`, () => {
        callCount++
        return HttpResponse.json({ count: callCount })
      }),
    )

    const api = createApi({
      baseURL: BASE_URL,
      cache: { enabled: true, ttl: 5000 },
    })

    await api.get('/clearable')
    api.clearCache()
    await api.get('/clearable')

    expect(callCount).toBe(2)
  })
})
