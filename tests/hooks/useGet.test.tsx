import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../setup.ts'
import { createApi } from '../../src/index.ts'
import { useGet, useMutation } from '../../src/hooks/index.ts'

const BASE_URL = 'https://hooks.test.com'

describe('useGet', () => {
  const api = createApi({ baseURL: BASE_URL })

  it('should fetch data on mount', async () => {
    server.use(
      http.get(`${BASE_URL}/users`, () =>
        HttpResponse.json([{ id: 1, name: 'Alice' }]),
      ),
    )

    const { result } = renderHook(() =>
      useGet<Array<{ id: number; name: string }>>(api, '/users'),
    )

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual([{ id: 1, name: 'Alice' }])
    expect(result.current.error).toBeNull()
  })

  it('should set error state on failure', async () => {
    server.use(
      http.get(`${BASE_URL}/fail`, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    )

    const { result } = renderHook(() => useGet(api, '/fail'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).not.toBeNull()
    expect(result.current.error?.status).toBe(404)
    expect(result.current.data).toBeNull()
  })

  it('should not fetch when url is null', () => {
    const { result } = renderHook(() => useGet(api, null))
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
  })

  it('should not fetch when manual is true', () => {
    server.use(
      http.get(`${BASE_URL}/manual`, () => HttpResponse.json({ ok: true })),
    )

    const { result } = renderHook(() => useGet(api, '/manual', { manual: true }))
    expect(result.current.loading).toBe(false)
  })

  it('should refetch when refetch() is called', async () => {
    let callCount = 0
    server.use(
      http.get(`${BASE_URL}/refetch`, () => {
        callCount++
        return HttpResponse.json({ count: callCount })
      }),
    )

    const { result } = renderHook(() => useGet<{ count: number }>(api, '/refetch'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.count).toBe(1)

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.data?.count).toBe(2)
    expect(callCount).toBe(2)
  })
})

describe('useMutation', () => {
  const api = createApi({ baseURL: BASE_URL })

  it('should not execute on mount', () => {
    const { result } = renderHook(() =>
      useMutation(api, 'POST', '/login'),
    )

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
  })

  it('should execute when mutate() is called', async () => {
    server.use(
      http.post(`${BASE_URL}/login`, async ({ request }) => {
        const body = await request.json() as { email: string }
        return HttpResponse.json({ user: body.email, token: 'abc123' })
      }),
    )

    const { result } = renderHook(() =>
      useMutation<{ user: string; token: string }>(api, 'POST', '/login'),
    )

    await act(async () => {
      await result.current.mutate({ email: 'test@example.com' })
    })

    expect(result.current.data?.token).toBe('abc123')
    expect(result.current.error).toBeNull()
  })

  it('should set error on failure', async () => {
    server.use(
      http.post(`${BASE_URL}/fail-mutation`, () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
    )

    const { result } = renderHook(() => useMutation(api, 'POST', '/fail-mutation'))

    await act(async () => {
      try {
        await result.current.mutate({})
      } catch {
        // expected
      }
    })

    expect(result.current.error?.status).toBe(401)
  })

  it('should reset state when reset() is called', async () => {
    server.use(
      http.post(`${BASE_URL}/reset-test`, () =>
        HttpResponse.json({ value: 42 }),
      ),
    )

    const { result } = renderHook(() => useMutation<{ value: number }>(api, 'POST', '/reset-test'))

    await act(async () => {
      await result.current.mutate({})
    })

    expect(result.current.data?.value).toBe(42)

    act(() => result.current.reset())
    expect(result.current.data).toBeNull()
  })
})
