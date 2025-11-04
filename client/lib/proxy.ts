const PROXY_BASE_URL = "https://fetch.vflix.life/api/proxy";

export function buildProxyUrl(service: string, id: string): string {
  const params = new URLSearchParams({
    service,
    id,
  });
  return `${PROXY_BASE_URL}?${params.toString()}`;
}
