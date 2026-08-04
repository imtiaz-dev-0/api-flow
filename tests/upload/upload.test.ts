import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../setup.ts'
import { createApi } from '../../src/index.ts'

const BASE_URL = 'https://upload.test.com'

describe('Upload', () => {
  it('should upload FormData via fetch when no onProgress', async () => {
    server.use(
      http.post(`${BASE_URL}/upload`, async ({ request }) => {
        const contentType = request.headers.get('content-type') ?? ''
        // multipart/form-data should be set by fetch automatically
        const isMultipart = contentType.includes('multipart') || !contentType
        return HttpResponse.json({ ok: isMultipart, contentType })
      }),
    )

    const api = createApi({ baseURL: BASE_URL })
    const formData = new FormData()
    formData.append('file', new Blob(['hello']), 'test.txt')

    const result = await api.upload<{ ok: boolean }>('/upload', formData)
    expect(result.status).toBe(200)
  })
})

describe('Pagination', () => {
  it('should paginate through pages', async () => {
    let pageNum = 0
    server.use(
      http.get(`${BASE_URL}/items`, ({ request }) => {
        const url = new URL(request.url)
        const page = parseInt(url.searchParams.get('page') ?? '1')
        pageNum = page

        if (page >= 3) {
          return HttpResponse.json({ data: [], hasMore: false })
        }

        return HttpResponse.json({
          data: [{ id: page * 10 }],
          hasMore: true,
          page,
        })
      }),
    )

    const api = createApi({ baseURL: BASE_URL })
    const pages = []

    for await (const page of api.paginate('/items', { page: 1, limit: 1 })) {
      pages.push(page)
      if (!page.hasMore) break
    }

    expect(pages.length).toBe(3)
    expect(pageNum).toBe(3)
  })

  it('should cursor paginate', async () => {
    const cursors = ['cursor1', 'cursor2', null]
    let callIndex = 0

    server.use(
      http.get(`${BASE_URL}/feed`, () => {
        const cursor = cursors[callIndex]
        const isLast = cursor === null
        callIndex++
        return HttpResponse.json({
          data: [{ post: callIndex }],
          nextCursor: cursor,
          hasMore: !isLast,
        })
      }),
    )

    const api = createApi({ baseURL: BASE_URL })
    const pages = []

    for await (const page of api.cursorPaginate('/feed')) {
      pages.push(page)
      if (!page.hasMore) break
    }

    expect(pages.length).toBe(3)
  })
})

describe('Metrics', () => {
  it('should record request metrics when enabled', async () => {
    server.use(
      http.get(`${BASE_URL}/metrics-test`, () =>
        HttpResponse.json({ ok: true }),
      ),
    )

    const api = createApi({ baseURL: BASE_URL, metrics: true })
    await api.get('/metrics-test')

    const metrics = api.getMetrics()
    expect(metrics.length).toBe(1)
    expect(metrics[0].url).toBe(`${BASE_URL}/metrics-test`)
    expect(metrics[0].method).toBe('GET')
    expect(metrics[0].status).toBe(200)
    expect(typeof metrics[0].duration).toBe('number')
  })

  it('should not record metrics when disabled', async () => {
    server.use(
      http.get(`${BASE_URL}/no-metrics`, () => HttpResponse.json({})),
    )

    const api = createApi({ baseURL: BASE_URL, metrics: false })
    await api.get('/no-metrics')
    expect(api.getMetrics().length).toBe(0)
  })

  it('should clear metrics', async () => {
    server.use(
      http.get(`${BASE_URL}/clear`, () => HttpResponse.json({})),
    )

    const api = createApi({ baseURL: BASE_URL, metrics: true })
    await api.get('/clear')
    expect(api.getMetrics().length).toBe(1)

    api.clearMetrics()
    expect(api.getMetrics().length).toBe(0)
  })
})
