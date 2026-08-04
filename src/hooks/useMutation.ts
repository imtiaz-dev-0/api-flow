import { useState, useCallback } from 'react'
import type { ApiClient } from '../core/client.ts'
import type { RequestOptions, AdapterResponse } from '../core/types.ts'
import { ApiError } from '../core/types.ts'

export interface UseMutationState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  response: AdapterResponse<T> | null
}

export interface UseMutationResult<T, B = unknown> extends UseMutationState<T> {
  mutate: (body?: B, overrides?: RequestOptions) => Promise<AdapterResponse<T>>
  reset: () => void
}

type MutationMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Generic mutation hook for POST, PUT, PATCH, DELETE.
 * Does NOT auto-execute — call `mutate()` to trigger.
 *
 * @example
 * const { mutate, loading, error } = useMutation<User>(api, 'POST', '/users')
 * await mutate({ name: 'Alice' })
 */
export function useMutation<T = unknown, B = unknown>(
  client: ApiClient,
  method: MutationMethod,
  url: string,
  options?: RequestOptions,
): UseMutationResult<T, B> {
  const [state, setState] = useState<UseMutationState<T>>({
    data: null,
    loading: false,
    error: null,
    response: null,
  })

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, response: null })
  }, [])

  const mutate = useCallback(
    async (body?: B, overrides?: RequestOptions): Promise<AdapterResponse<T>> => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        let response: AdapterResponse<T>

        const mergedOptions = { ...options, ...overrides }

        switch (method) {
          case 'POST':
            response = await client.post<T>(url, body, mergedOptions)
            break
          case 'PUT':
            response = await client.put<T>(url, body, mergedOptions)
            break
          case 'PATCH':
            response = await client.patch<T>(url, body, mergedOptions)
            break
          case 'DELETE':
            response = await client.delete<T>(url, mergedOptions)
            break
        }

        setState({ data: response.data, loading: false, error: null, response })
        return response
      } catch (error) {
        const apiError =
          error instanceof ApiError
            ? error
            : new ApiError({
                message: error instanceof Error ? error.message : 'Unknown error',
                status: 0,
                statusText: 'Unknown Error',
                url,
                method,
              })

        setState((prev) => ({ ...prev, loading: false, error: apiError }))
        throw apiError
      }
    },
    [client, method, url, options],
  )

  return { ...state, mutate, reset }
}

/**
 * Convenience hook for POST requests.
 *
 * @example
 * const { mutate, loading } = usePost<LoginResponse>(api, '/auth/login')
 * await mutate({ email, password })
 */
export function usePost<T = unknown, B = unknown>(
  client: ApiClient,
  url: string,
  options?: RequestOptions,
): UseMutationResult<T, B> {
  return useMutation<T, B>(client, 'POST', url, options)
}
