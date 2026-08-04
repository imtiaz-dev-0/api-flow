import type { ApiConfig, DownloadOptions } from '../core/types.ts'
import { ApiError } from '../core/types.ts'
import { buildUrl } from '../utils/helpers.ts'

/**
 * Downloads a file as a Blob with optional progress tracking.
 * Uses ReadableStream for progress in supported environments.
 */
export async function downloadWithProgress(
  url: string,
  config: ApiConfig,
  options?: DownloadOptions,
): Promise<Blob> {
  const fullUrl = buildUrl(config.baseURL ?? '', url)
  const headers = { ...config.headers, ...options?.headers }

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers,
    signal: options?.signal ?? null,
    credentials: config.credentials ?? 'same-origin',
  })

  if (!response.ok) {
    throw new ApiError({
      message: `Download failed with status ${response.status}`,
      status: response.status,
      statusText: response.statusText,
      url: fullUrl,
      method: 'GET',
    })
  }

  // Progress tracking via ReadableStream (browser only)
  if (options?.onProgress && response.body) {
    return streamWithProgress(response, options.onProgress)
  }

  return response.blob()
}

async function streamWithProgress(
  response: Response,
  onProgress: (percent: number, loaded: number, total: number) => void,
): Promise<Blob> {
  const contentLength = response.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength, 10) : 0
  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    chunks.push(value)
    loaded += value.length

    if (total > 0) {
      const percent = Math.round((loaded / total) * 100)
      onProgress(percent, loaded, total)
    }
  }

  return new Blob(chunks as unknown as BlobPart[])
}
