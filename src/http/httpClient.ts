/**
 * HTTP Client — Bottom layer of the three-tier API architecture
 *
 * Wraps native fetch with:
 * - Timeout handling (AbortController)
 * - Retry on failure (configurable, default 1)
 * - Request/response interceptors
 * - Standardized error objects
 *
 * Design decision: Using fetch instead of axios to minimize dependencies.
 * fetch + this wrapper covers all requirements (timeout, retry, interceptors).
 */

import type {
  HttpRequestConfig,
  HttpResponse,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from "./types";

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RETRIES = 1;

class HttpClient {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  /** Register interceptors */
  use(
    reqInterceptor?: RequestInterceptor,
    resInterceptor?: ResponseInterceptor,
    errInterceptor?: ErrorInterceptor
  ): void {
    if (reqInterceptor) this.requestInterceptors.push(reqInterceptor);
    if (resInterceptor) this.responseInterceptors.push(resInterceptor);
    if (errInterceptor) this.errorInterceptors.push(errInterceptor);
  }

  /** Build URL with query params */
  private buildUrl(url: string, params?: Record<string, string | number | boolean | undefined>): string {
    if (!params) return url;
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const query = searchParams.toString();
    return query ? `${url}?${query}` : url;
  }

  /**
   * Apply timeout via AbortController.
   *
   * If the caller supplies its own signal, the two are combined so that
   * EITHER the timeout expiring OR the caller cancelling aborts the request.
   */
  private createTimeoutSignal(
    timeout: number,
    externalSignal?: AbortSignal,
  ): {
    signal: AbortSignal;
    cleanup: () => void;
  } {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    // Forward external cancellation into our controller
    let onExternalAbort: (() => void) | undefined;
    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        onExternalAbort = () => controller.abort();
        externalSignal.addEventListener("abort", onExternalAbort, { once: true });
      }
    }

    return {
      signal: controller.signal,
      cleanup: () => {
        clearTimeout(timer);
        if (externalSignal && onExternalAbort) {
          externalSignal.removeEventListener("abort", onExternalAbort);
        }
      },
    };
  }

  /** Execute a single request attempt */
  private async doRequest<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const {
      url,
      method = "GET",
      headers = {},
      body,
      timeout = DEFAULT_TIMEOUT,
      signal: externalSignal,
    } = config;

    const fullUrl = this.buildUrl(url, config.params);
    const { signal, cleanup } = this.createTimeoutSignal(timeout, externalSignal);

    try {
      const fetchOptions: RequestInit = {
        method,
        // Only set Content-Type when there is a body. Sending it on a GET
        // makes the request "non-simple", which forces the browser into a
        // CORS preflight — and some third-party APIs (e.g. Open-Meteo's
        // geocoding endpoint) do not implement OPTIONS, so the preflight
        // fails and the whole request is blocked.
        ...(body && method !== "GET" ? { headers: { "Content-Type": "application/json", ...headers } } : { headers }),
        signal,
      };

      if (body && method !== "GET") {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(fullUrl, fetchOptions);
      const data: T = await response.json();

      const httpResponse: HttpResponse<T> = {
        data,
        status: response.status,
        headers: response.headers,
      };

      // Run response interceptors
      let result = httpResponse;
      for (const interceptor of this.responseInterceptors) {
        result = await interceptor(result) as HttpResponse<T>;
      }

      if (!response.ok) {
        throw httpResponse;
      }

      return result;
    } catch (error) {
      cleanup();

      // Transform AbortError (timeout) into a standardized error
      if (error instanceof DOMException && error.name === "AbortError") {
        throw {
          type: "TIMEOUT",
          message: "Request timed out",
          status: 0,
          retryable: true,
        };
      }

      throw error;
    } finally {
      cleanup();
    }
  }

  /** Main request method with retry support */
  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    // Run request interceptors
    let processedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }

    const maxRetries = processedConfig.retries ?? DEFAULT_RETRIES;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.doRequest<T>(processedConfig);
      } catch (error) {
        lastError = error;

        // A caller-cancelled request is intentional — don't retry it.
        if (processedConfig.signal?.aborted) break;

        // Run error interceptors
        for (const interceptor of this.errorInterceptors) {
          try {
            const result = await interceptor(error, processedConfig);
            if (result) return result as HttpResponse<T>;
          } catch {
            // interceptor threw, continue with original error
          }
        }

        // Don't retry on client errors (4xx) unless it's 429 (rate limit)
        if (typeof error === "object" && error !== null && "status" in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500 && status !== 429) {
            break;
          }
        }

        // Last attempt, throw
        if (attempt === maxRetries) {
          break;
        }
      }
    }

    throw lastError;
  }

  /** Convenience methods */
  async get<T>(url: string, params?: Record<string, string | number | boolean | undefined>, options?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ url, method: "GET", params, ...options });
  }

  async post<T>(url: string, body?: unknown, options?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ url, method: "POST", body, ...options });
  }
}

/** Singleton instance */
export const httpClient = new HttpClient();
