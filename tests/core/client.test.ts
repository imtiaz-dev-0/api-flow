import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../setup.ts'
import { createApi, ApiError } from '../../src/index.ts'

const BASE_URL = 'https://api.test.com'

describe('ApiClient — Core HTTP Methods', () => {
  let api: ReturnType<typeof createApi>

  beforeEach(() => {
    api = createApi({ baseURL: BASE_URL })
  })

  it('should perform a GET request', async () => {
    server.use(
      http.get(`${BASE_URL}/users`, () =>
        HttpResponse.json([{ id: 1, name: 'Alice' }]),
      ),
    )

    const response = await api.get<Array<{ id: number; name: string }>>('/users')
    expect(response.status).toBe(200)
    expect(response.data).toEqual([{ id: 1, name: 'Alice' }])
    expect(response.ok).toBe(true)
  })

  it('should perform a POST request with body', async () => {
    server.use(
      http.post(`${BASE_URL}/users`, async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json({ id: 2, ...body as object }, { status: 201 })
      }),
    )

    const response = await api.post<{ id: number; name: string }>('/users', { name: 'Bob' })
    expect(response.status).toBe(201)
    expect(response.data.name).toBe('Bob')
  })

  it('should perform a PUT request', async () => {
    server.use(
      http.put(`${BASE_URL}/users/1`, async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json({ id: 1, ...body as object })
      }),
    )

    const response = await api.put('/users/1', { name: 'Alice Updated' })
    expect(response.status).toBe(200)
    expect(response.ok).toBe(true)
  })

  it('should perform a PATCH request', async () => {
    server.use(
      http.patch(`${BASE_URL}/users/1`, async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json({ id: 1, ...body as object })
      }),
    )

    const response = await api.patch('/users/1', { name: 'Patched' })
    expect(response.status).toBe(200)
  })

  it('should perform a DELETE request', async () => {
    server.use(
      http.delete(`${BASE_URL}/users/1`, () =>
        HttpResponse.json({ success: true }),
      ),
    )

    const response = await api.delete('/users/1')
    expect(response.status).toBe(200)
    expect(response.ok).toBe(true)
  })

  it('should append query params to URL', async () => {
    server.use(
      http.get(`${BASE_URL}/users`, ({ request }) => {
        const url = new URL(request.url)
        const page = url.searchParams.get('page')
        const limit = url.searchParams.get('limit')
        return HttpResponse.json({ page, limit })
      }),
    )

    const response = await api.get<{ page: string; limit: string }>('/users', {
      params: { page: 2, limit: 10 },
    })

    expect(response.data.page).toBe('2')
    expect(response.data.limit).toBe('10')
  })

  it('should throw ApiError on 4xx responses', async () => {
    server.use(
      http.get(`${BASE_URL}/protected`, () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
    )

    const apiWithoutAuth = createApi({ baseURL: BASE_URL })

    await expect(apiWithoutAuth.get('/protected')).rejects.toThrow(ApiError)
    await expect(apiWithoutAuth.get('/protected')).rejects.toMatchObject({
      status: 401,
    })
  })

  it('should throw ApiError on 5xx responses', async () => {
    server.use(
      http.get(`${BASE_URL}/error`, () =>
        HttpResponse.json({ message: 'Server Error' }, { status: 500 }),
      ),
    )

    await expect(api.get('/error')).rejects.toMatchObject({
      status: 500,
      isNetworkError: false,
    })
  })

  it('should set Content-Type to application/json for POST', async () => {
    let capturedContentType: string | null = null

    server.use(
      http.post(`${BASE_URL}/data`, ({ request }) => {
        capturedContentType = request.headers.get('content-type')
        return HttpResponse.json({ ok: true })
      }),
    )

    await api.post('/data', { foo: 'bar' })
    expect(capturedContentType).toContain('application/json')
  })

  it('should call global onError handler', async () => {
    const onError = vi.fn()
    const errorApi = createApi({ baseURL: BASE_URL, onError })

    server.use(
      http.get(`${BASE_URL}/fail`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    )

    await expect(errorApi.get('/fail')).rejects.toThrow()
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('should call global onSuccess handler', async () => {
    const onSuccess = vi.fn()
    const successApi = createApi({ baseURL: BASE_URL, onSuccess })

    server.use(
      http.get(`${BASE_URL}/ok`, () => HttpResponse.json({ ok: true })),
    )

    await successApi.get('/ok')
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('should support absolute URLs bypassing baseURL', async () => {
    server.use(
      http.get('https://other.api.com/data', () =>
        HttpResponse.json({ source: 'other' }),
      ),
    )

    const response = await api.get<{ source: string }>('https://other.api.com/data')
    expect(response.data.source).toBe('other')
  })

  it('should cancel a request via cancel(id)', async () => {
    server.use(
      http.get(`${BASE_URL}/slow`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 500))
        return HttpResponse.json({ ok: true })
      }),
    )

    const promise = api.get('/slow', { id: 'slow-req' })
    api.cancel('slow-req')

    await expect(promise).rejects.toThrow()
  })
})

describe('ApiClient — Request Deduplication', () => {
  it('should deduplicate concurrent GET requests', async () => {
    let callCount = 0
    const api = createApi({ baseURL: BASE_URL })

    server.use(
      http.get(`${BASE_URL}/users`, async () => {
        callCount++
        await new Promise((r) => setTimeout(r, 50))
        return HttpResponse.json([{ id: 1 }])
      }),
    )

    // Fire 3 concurrent identical requests
    const [r1, r2, r3] = await Promise.all([
      api.get('/users'),
      api.get('/users'),
      api.get('/users'),
    ])

    // Should only make 1 actual HTTP call
    expect(callCount).toBe(1)
    expect(r1.data).toEqual(r2.data)
    expect(r2.data).toEqual(r3.data)
  })
})

describe('ApiClient — Plugin System', () => {
  it('should install and call plugin', () => {
    const api = createApi({ baseURL: BASE_URL })
    const installed = vi.fn()

    api.use({
      name: 'test-plugin',
      install: installed,
    })

    expect(installed).toHaveBeenCalledWith(api)
  })

  it('should not install same plugin twice', () => {
    const api = createApi({ baseURL: BASE_URL })
    const installed = vi.fn()
    const plugin = { name: 'dedup-plugin', install: installed }

    api.use(plugin)
    api.use(plugin)

    expect(installed).toHaveBeenCalledTimes(1)
  })
})

describe('ApiClient — Events', () => {
  it('should emit request:start and request:end', async () => {
    const api = createApi({ baseURL: BASE_URL })
    const onStart = vi.fn()
    const onEnd = vi.fn()

    api.on('request:start', onStart)
    api.on('request:end', onEnd)

    server.use(
      http.get(`${BASE_URL}/events`, () => HttpResponse.json({ ok: true })),
    )

    await api.get('/events')

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(onStart.mock.calls[0][0]).toMatchObject({ url: `${BASE_URL}/events`, method: 'GET' })
  })

  it('should emit request:error on failure', async () => {
    const api = createApi({ baseURL: BASE_URL })
    const onError = vi.fn()
    api.on('request:error', onError)

    server.use(
      http.get(`${BASE_URL}/err`, () => HttpResponse.json({}, { status: 500 })),
    )

    await expect(api.get('/err')).rejects.toThrow()
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('should return unsubscribe function from on()', async () => {
    const api = createApi({ baseURL: BASE_URL })
    const onEnd = vi.fn()
    const unsub = api.on('request:end', onEnd)

    server.use(
      http.get(`${BASE_URL}/unsub`, () => HttpResponse.json({ ok: true })),
    )

    await api.get('/unsub')
    expect(onEnd).toHaveBeenCalledTimes(1)

    unsub()
    await api.get('/unsub')
    expect(onEnd).toHaveBeenCalledTimes(1) // not called again
  })
})
