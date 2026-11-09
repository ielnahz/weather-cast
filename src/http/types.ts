/**
 * HTTP layer type definitions
 */

export interface HttpRequestConfig {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  /**
   * Caller-supplied abort signal.
   *
   * Combined with the internal timeout signal, this lets callers cancel
   * requests they no longer care about — e.g. a search whose keyword has
   * already been superseded by a newer keystroke.
   */
  signal?: AbortSignal;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

/** Interceptor function type */
export type RequestInterceptor = (
  config: HttpRequestConfig
) => HttpRequestConfig | Promise<HttpRequestConfig>;

export type ResponseInterceptor<T = unknown> = (
  response: HttpResponse<T>
) => HttpResponse<T> | Promise<HttpResponse<T>>;

export type ErrorInterceptor = (
  error: unknown,
  config: HttpRequestConfig
) => unknown | Promise<unknown>;
