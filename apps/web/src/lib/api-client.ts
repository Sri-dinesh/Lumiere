export interface ApiSuccess<T> {
  data: T;
  meta: {
    requestId: string;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly requestId?: string;
  public readonly status: number;

  constructor(status: number, errorData: ApiErrorResponse['error']) {
    super(errorData.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = errorData.code;
    this.details = errorData.details;
    this.requestId = errorData.requestId;
  }
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Always send first-party session cookie
  });

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorData = json.error || {
      code: 'REQUEST_FAILED',
      message: response.statusText || 'Request failed',
      requestId: response.headers.get('x-request-id') || 'unknown',
    };
    throw new ApiError(response.status, errorData);
  }

  return json.data;
}
