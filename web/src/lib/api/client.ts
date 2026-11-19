import { ApiError, ErrorCode, ValidationErrorDetail } from './errors';
import { getAccessToken, setAccessToken, clearAccessToken } from '../auth/token-store';
import { addDevLog, getDevSettings } from '../devlog';

export type ApiRequestOptions = {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  idempotencyKey?: string;
  signal?: AbortSignal;
  skipAuthRefresh?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

function redactAuthHeader(headerValue?: string): string | undefined {
  if (!headerValue) return undefined;
  if (!headerValue.startsWith('Bearer ')) return headerValue;
  const token = headerValue.slice('Bearer '.length);
  if (token.length <= 10) return 'Bearer eyJ…';
  const last6 = token.slice(-6);
  return `Bearer eyJ…${last6}`;
}

function buildCurl(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: unknown
): string {
  const parts = [`curl -X ${method.toUpperCase()} '${url}'`];
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'authorization') {
      parts.push(`-H '${k}: Bearer $TOKEN'`);
    } else {
      parts.push(`-H '${k}: ${v}'`);
    }
  }
  if (body !== undefined) {
    parts.push(`-d '${JSON.stringify(body)}'`);
  }
  return parts.join(' \\\n  ');
}

async function singleFlightRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await apiRequest<{ accessToken: string }>('POST', '/auth/refresh', {
        skipAuthRefresh: true,
      });
      setAccessToken(res.accessToken);
      return res.accessToken;
    } catch {
      clearAccessToken();
      const currentPath = window.location.pathname + window.location.search;
      const next = encodeURIComponent(currentPath);
      window.location.assign(`/login?next=${next}`);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function executeSingleFetch<T>(
  method: string,
  path: string,
  options: ApiRequestOptions,
  requestId: string
): Promise<T> {
  const { body, query, idempotencyKey, signal } = options;

  // Build query string
  let fullPath = `/api/v1${path.startsWith('/') ? path : `/${path}`}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(query)) {
      if (val !== undefined && val !== null) {
        params.set(key, String(val));
      }
    }
    const qs = params.toString();
    if (qs) {
      fullPath += `?${qs}`;
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-Id': requestId,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const startTime = performance.now();
  let fetchResponse: Response | null = null;
  let responseData: unknown = null;
  const responseHeadersObj: Record<string, string> = {};
  let networkError: Error | null = null;

  try {
    fetchResponse = await fetch(fullPath, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      signal,
    });

    fetchResponse.headers.forEach((val, key) => {
      responseHeadersObj[key.toLowerCase()] = val;
    });

    if (fetchResponse.status === 204) {
      responseData = undefined;
    } else {
      const text = await fetchResponse.text();
      try {
        responseData = text ? JSON.parse(text) : undefined;
      } catch {
        throw new ApiError({
          status: fetchResponse.status,
          code: 'INTERNAL_ERROR',
          message: 'Invalid response from server',
          requestId,
        });
      }
    }
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    networkError = err as Error;
  }

  const durationMs = Math.round(performance.now() - startTime);

  // Redacted headers for logging
  const loggedReqHeaders: Record<string, string> = { ...headers };
  if (loggedReqHeaders['Authorization']) {
    loggedReqHeaders['Authorization'] = redactAuthHeader(loggedReqHeaders['Authorization'])!;
  }

  const isMock = Boolean(
    responseHeadersObj['x-msw-bypass'] === undefined &&
    (responseHeadersObj['x-mock-api'] === 'true' ||
      window.__MSW_ACTIVE_DOMAINS__ !== undefined)
  );
  const isReplayed = responseHeadersObj['idempotent-replayed'] === 'true';

  addDevLog({
    id: requestId,
    timestamp: new Date().toISOString(),
    method: method.toUpperCase(),
    path: fullPath,
    query,
    requestHeaders: loggedReqHeaders,
    requestBody: body,
    status: fetchResponse ? fetchResponse.status : 0,
    responseHeaders: responseHeadersObj,
    responseBody: responseData ?? (networkError ? { error: networkError.message } : null),
    durationMs,
    isMock,
    isReplayed,
    hasIdempotencyKey: Boolean(idempotencyKey),
    idempotencyKey,
    curlCommand: buildCurl(method, fullPath, headers, body),
  });

  if (networkError) {
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: networkError.message || 'Network request failed',
      requestId,
    });
  }

  if (!fetchResponse) {
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No response received',
      requestId,
    });
  }

  if (!fetchResponse.ok) {
    const rawError = (responseData as { error?: { code?: string; message?: string; details?: ValidationErrorDetail[]; requestId?: string } })?.error;
    const retryAfterHeader = fetchResponse.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;

    const error = new ApiError({
      status: fetchResponse.status,
      code: (rawError?.code as ErrorCode) || 'INTERNAL_ERROR',
      message: rawError?.message || 'Request failed',
      details: rawError?.details || null,
      requestId: rawError?.requestId || responseHeadersObj['x-request-id'] || requestId,
      retryAfterSeconds: Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds,
    });

    // Check for silent refresh
    if (
      fetchResponse.status === 401 &&
      error.code === 'UNAUTHENTICATED' &&
      !options.skipAuthRefresh &&
      !path.startsWith('/auth/')
    ) {
      const newToken = await singleFlightRefresh();
      if (newToken) {
        // Retry once with new token
        return apiRequest<T>(method, path, {
          ...options,
          skipAuthRefresh: true,
        });
      }
    }

    throw error;
  }

  return responseData as T;
}

declare global {
  interface Window {
    __MSW_ACTIVE_DOMAINS__?: string[];
  }
}

export async function apiRequest<T>(
  method: string,
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const settings = getDevSettings();

  if (settings.slowNetwork) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Double send for idempotent requests if enabled
  if (settings.doubleSend && options.idempotencyKey) {
    const requestId1 = crypto.randomUUID();
    const requestId2 = crypto.randomUUID();

    const p1 = executeSingleFetch<T>(method, path, options, requestId1);
    const p2 = executeSingleFetch<T>(method, path, options, requestId2);

    return new Promise<T>((resolve, reject) => {
      let settled = false;
      let firstError: unknown = null;
      let rejectionCount = 0;

      const handleSuccess = (val: T) => {
        if (!settled) {
          settled = true;
          resolve(val);
        }
      };

      const handleError = (err: unknown) => {
        rejectionCount++;
        if (!firstError) {
          firstError = err;
        }
        if (rejectionCount === 2 && !settled) {
          reject(firstError);
        }
      };

      p1.then(handleSuccess, handleError);
      p2.then(handleSuccess, handleError);
    });
  }

  const requestId = crypto.randomUUID();
  return executeSingleFetch<T>(method, path, options, requestId);
}
