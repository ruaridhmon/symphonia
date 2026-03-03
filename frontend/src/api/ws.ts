import { API_BASE_URL } from '../config';

function withTrailingPath(basePath: string, path: string): string {
  const normalizedBase = basePath.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function getWebSocketUrl(path = '/ws'): string {
  const base = (API_BASE_URL || '').trim();

  try {
    if (base.startsWith('http://') || base.startsWith('https://')) {
      const apiUrl = new URL(base);
      const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${apiUrl.host}${withTrailingPath(apiUrl.pathname || '', path)}`;
    }
  } catch {
    // Fall through to same-origin handling.
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const basePath = base || '';
  return `${wsProtocol}//${window.location.host}${withTrailingPath(basePath, path)}`;
}
