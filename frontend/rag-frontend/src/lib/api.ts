import { getApiBaseUrl } from "./runtime-config";

let refreshPromise: Promise<boolean> | null = null;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function refreshAccessToken() {
  const apiUrl = getApiBaseUrl();

  if (!refreshPromise) {
    refreshPromise = fetch(`${apiUrl}/api/auth/refresh/`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  retryOnAuthError = true
) {
  const apiUrl = getApiBaseUrl();
  const headers = new Headers(options.headers || {});
  const isFormDataBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.body && !isFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    if (
      res.status === 401 &&
      retryOnAuthError &&
      endpoint !== "/api/auth/refresh/"
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiFetch(endpoint, options, false);
      }
    }

    let message = "API Error";

    try {
      const data = await res.json();
      if (typeof data?.detail === "string" && data.detail.trim()) {
        message = data.detail;
      } else if (typeof data?.error === "string" && data.error.trim()) {
        message = data.error;
      }
    } catch {}

    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}
