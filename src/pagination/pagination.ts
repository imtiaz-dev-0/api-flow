import type {
  ApiClientInterface,
  RequestOptions,
  PagePaginationParams,
  CursorPaginationParams,
  PaginatedResponse,
} from '../core/types.ts'

/**
 * Page-based pagination generator.
 * Automatically increments page number and yields each page until no more data.
 *
 * @example
 * for await (const page of api.paginate('/users', { page: 1, limit: 20 })) {
 *   console.log(page.data)
 *   if (!page.hasMore) break
 * }
 */
export async function* createPagePaginator<T>(
  client: ApiClientInterface,
  url: string,
  params: PagePaginationParams = {},
  options?: RequestOptions,
): AsyncGenerator<PaginatedResponse<T>> {
  let currentPage = params.page ?? 1
  const limit = params.limit ?? 20
  const extraParams = { ...params, limit }

  while (true) {
    const response = await client.get<PaginatedResponse<T>>(url, {
      ...options,
      params: {
        ...extraParams,
        page: currentPage,
      },
    })

    const pageData = response.data

    // Normalize: support both array responses and paginated envelope
    const normalized: PaginatedResponse<T> = Array.isArray(pageData)
      ? {
          data: pageData as T[],
          page: currentPage,
          limit,
          hasMore: (pageData as T[]).length >= limit,
        }
      : {
          ...pageData,
          page: pageData.page ?? currentPage,
        }

    yield normalized

    const hasMore = normalized.hasMore ?? (normalized.data.length >= limit)
    if (!hasMore) break

    currentPage++
  }
}

/**
 * Cursor-based pagination generator.
 * Uses next cursor from each response to fetch the next page.
 *
 * @example
 * for await (const page of api.cursorPaginate('/feed', { limit: 20 })) {
 *   console.log(page.data)
 *   if (!page.nextCursor) break
 * }
 */
export async function* createCursorPaginator<T>(
  client: ApiClientInterface,
  url: string,
  params: CursorPaginationParams = {},
  options?: RequestOptions,
): AsyncGenerator<PaginatedResponse<T>> {
  let cursor: string | null | undefined = params.cursor
  const limit = params.limit ?? 20
  const extraParams = { ...params, limit }

  while (true) {
    const queryParams: Record<string, string | number | boolean | null | undefined> = { ...extraParams }
    if (cursor) queryParams.cursor = cursor

    const response = await client.get<PaginatedResponse<T>>(url, {
      ...options,
      params: queryParams,
    })

    const pageData = response.data

    const normalized: PaginatedResponse<T> = Array.isArray(pageData)
      ? { data: pageData as T[], hasMore: (pageData as T[]).length >= limit }
      : pageData

    yield normalized

    cursor = normalized.nextCursor
    if (!cursor || !normalized.hasMore) break
  }
}
