const API_URL = process.env.NEXT_PUBLIC_API_URL;

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh/`, {
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
  const headers = new Headers(options.headers || {});
  const isFormDataBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.body && !isFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
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
    throw new Error("API Error");
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}
