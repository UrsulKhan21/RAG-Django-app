const DEFAULT_BACKEND_PORT = "8000";

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window === "undefined") {
    return configuredUrl?.replace(/\/$/, "") ?? `http://localhost:${DEFAULT_BACKEND_PORT}`;
  }

  const pageProtocol = window.location.protocol;
  const pageHostname = window.location.hostname;

  if (!configuredUrl) {
    return `${pageProtocol}//${pageHostname}:${DEFAULT_BACKEND_PORT}`;
  }

  try {
    const url = new URL(configuredUrl);

    // When the app is opened from another device, swap localhost for the laptop LAN IP.
    if (isLoopbackHost(url.hostname) && !isLoopbackHost(pageHostname)) {
      url.hostname = pageHostname;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return configuredUrl.replace(/\/$/, "");
  }
}
