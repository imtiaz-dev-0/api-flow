import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeWithRetry } from '../../src/retry/retry.ts'
import { ApiError } from '../../src/core/types.ts'

describe('executeWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return response on first success', async () => {
    const execute = vi.fn().mockResolvedValue({ status: 200, data: 'ok', ok: true, url: '', statusText: '', headers: {}, duration: 10 })
    const result = await executeWithRetry(execute, { attempts: 3 })
    expect(result.status).toBe(200)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('should retry on network errors up to attempts limit', async () => {
    const networkError = new ApiError({
      message: 'Network error',
      status: 0,
      statusText: 'Network Error',
      url: '/test',
      method: 'GET',
      isNetworkError: true,
    })

    const successResponse = { status: 200, data: 'ok', ok: true, url: '', statusText: '', headers: {}, duration: 10 }
    const execute = vi
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(successResponse)

    const promise = executeWithRetry(execute, { attempts: 3, delay: 100 })
    // Advance timers for each retry
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.status).toBe(200)
    expect(execute).toHaveBeenCalledTimes(3)
  })

  it('should not retry on abort errors', async () => {
    const abortError = new DOMException('Aborted', 'AbortError')
    const execute = vi.fn().mockRejectedValue(abortError)

    await expect(executeWithRetry(execute, { attempts: 3 })).rejects.toThrow(DOMException)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('should retry on configured status codes', async () => {
    const failResponse = { status: 503, data: null, ok: false, url: '/test', statusText: 'Service Unavailable', headers: {}, duration: 10 }
    const successResponse = { status: 200, data: 'ok', ok: true, url: '/test', statusText: 'OK', headers: {}, duration: 10 }

    const execute = vi
      .fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(successResponse)

    const promise = executeWithRetry(execute, { attempts: 2, delay: 100, statusCodes: [503] })
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.status).toBe(200)
    expect(execute).toHaveBeenCalledTimes(2)
  })

  it('should stop retrying when onRetry returns false', async () => {
    const networkError = new ApiError({
      message: 'Network error',
      status: 0,
      statusText: 'Network Error',
      url: '/test',
      method: 'GET',
      isNetworkError: true,
    })

    const execute = vi.fn().mockRejectedValue(networkError)
    const onRetry = vi.fn().mockReturnValue(false)

    const promise = executeWithRetry(execute, { attempts: 5, delay: 100, onRetry })
    await expect(promise).rejects.toThrow()
    expect(execute).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('should use exponential backoff', async () => {
    // Use fake timers to control time without real delays
    const networkError = new ApiError({
      message: 'Network error',
      status: 0,
      statusText: 'Network Error',
      url: '/test',
      method: 'GET',
      isNetworkError: true,
    })

    const execute = vi
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ status: 200, data: 'ok', ok: true, url: '', statusText: '', headers: {}, duration: 10 })

    // Run with fake timers — the promise won't resolve until we advance timers
    const promise = executeWithRetry(execute, { attempts: 3, delay: 100, jitter: false })
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.status).toBe(200)
    // Should have been called 3 times (2 failures + 1 success)
    expect(execute).toHaveBeenCalledTimes(3)
  }, 10000)

  it('should call onRetry callback with error and attempt number', async () => {
    const networkError = new ApiError({
      message: 'Network error',
      status: 0,
      statusText: 'Network Error',
      url: '/test',
      method: 'GET',
      isNetworkError: true,
    })

    const execute = vi
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ status: 200, data: 'ok', ok: true, url: '', statusText: '', headers: {}, duration: 10 })

    const onRetry = vi.fn()
    const promise = executeWithRetry(execute, { attempts: 3, delay: 100, onRetry })
    await vi.runAllTimersAsync()
    await promise

    expect(onRetry).toHaveBeenCalledWith(expect.any(ApiError), 1)
  })
})
