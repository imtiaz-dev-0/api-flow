import { useState, useEffect, useRef, useCallback } from 'react'
import type { ApiClient } from '../core/client.ts'
import type { RequestOptions, AdapterResponse, ApiError as ApiErrorType } from '../core/types.ts'

export interface UseGetState<T> {
  data: T | null
  loading: boolean
  error: ApiErrorType | null
  response: AdapterResponse<T> | null
}

export interface UseGetResult<T> extends UseGetState<T> {
  refetch: () => Promise<void>
  cancel: () => void
}

/**
 * React hook for GET requests.
 * Automatically fetches on mount, handles loading/error state,
 * cancels on unmount, and provides a refetch function.
 *
 * @example
 * const { data, loading, error, refetch } = useGet<User[]>(api, '/users')
 */
export function useGet<T = unknown>(
  client: ApiClient,
  url: string | null | undefined,
  options?: RequestOptions & {
    /** Don't fetch on mount, only on manual refetch() */
    manual?: boolean
    /** Re-fetch when these values change */
    deps?: unknown[]
  },
): UseGetResult<T> {
  const [state, setState] = useState<UseGetState<T>>({
    data: null,
    loading: !options?.manual && !!url,
    error: null,
    response: null,
  })

  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const execute = useCallback(async () => {
    if (!url) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    if (mountedRef.current) {
      setState((prev) => ({ ...prev, loading: true, error: null }))
    }

    try {
      const response = await client.get<T>(url, {
        ...optionsRef.current,
        signal: abortRef.current.signal,
      })

      if (mountedRef.current) {
        setState({ data: response.data, loading: false, error: null, response })
      }
    } catch (error) {
      // Don't update state for aborted requests
      if (error instanceof DOMException && error.name === 'AbortError') return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error as ApiErrorType,
        }))
      }
    }
  }, [client, url]) // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  useEffect(() => {
    mountedRef.current = true

    if (!options?.manual && url) {
      void execute()
    }

    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [url, execute, ...(options?.deps ?? [])]) // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, refetch: execute, cancel }
}
