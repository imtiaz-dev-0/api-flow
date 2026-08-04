import type { RetryConfig, AdapterResponse } from '../core/types.ts'
import { ApiError } from '../core/types.ts'

const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504]

/**
 * Executes a request function with configurable retry logic and exponential backoff.
 * Supports jitter to avoid thundering herd.
 */
export async function executeWithRetry<T>(
  execute: () => Promise<AdapterResponse<T>>,
  config: RetryConfig,
  onRetry?: (error: ApiError, attempt: number) => void,
): Promise<AdapterResponse<T>> {
  const maxAttempts = config.attempts ?? 0
  const baseDelay = config.delay ?? 300
  const maxDelay = config.maxDelay ?? 30_000
  const statusCodes = config.statusCodes ?? DEFAULT_RETRY_STATUS_CODES
  const useJitter = config.jitter ?? true

  let lastError: ApiError | null = null

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    try {
      const response = await execute()

      // Retry on configured status codes
      if (response.status && statusCodes.includes(response.status) && attempt < maxAttempts) {
        const apiError = new ApiError({
          message: `Request failed with status ${response.status}`,
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          url: response.url,
          method: 'GET', // will be overridden in context
          retries: attempt,
        })

        if (config.onRetry) {
          const shouldContinue = await config.onRetry(apiError, attempt + 1)
          if (shouldContinue === false) throw apiError
        }

        onRetry?.(apiError, attempt + 1)
        await sleep(computeDelay(attempt, baseDelay, maxDelay, useJitter))
        lastError = apiError
        continue
      }

      return response
    } catch (error) {
      // Don't retry on abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }

      const isNetworkError = !(error instanceof ApiError) || error.isNetworkError
      const isTimeoutError = error instanceof ApiError && error.isTimeoutError
      const shouldRetry = (isNetworkError || isTimeoutError) && attempt < maxAttempts

      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError({
              message: error instanceof Error ? error.message : 'Network error',
              status: 0,
              statusText: 'Network Error',
              url: '',
              method: 'GET',
              isNetworkError: true,
              retries: attempt,
            })

      if (!shouldRetry) throw apiError

      if (config.onRetry) {
        const shouldContinue = await config.onRetry(apiError, attempt + 1)
        if (shouldContinue === false) throw apiError
      }

      onRetry?.(apiError, attempt + 1)
      await sleep(computeDelay(attempt, baseDelay, maxDelay, useJitter))
      lastError = apiError
    }
  }

  throw lastError ?? new ApiError({
    message: 'Max retries exceeded',
    status: 0,
    statusText: 'Max Retries Exceeded',
    url: '',
    method: 'GET',
  })
}

/**
 * Computes exponential backoff delay with optional jitter.
 * Formula: min(baseDelay * 2^attempt + jitter, maxDelay)
 */
function computeDelay(attempt: number, baseDelay: number, maxDelay: number, jitter: boolean): number {
  const exponential = baseDelay * Math.pow(2, attempt)
  const withJitter = jitter ? exponential + Math.random() * baseDelay : exponential
  return Math.min(withJitter, maxDelay)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
