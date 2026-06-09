const AUTH_API_BASE_URL_KEY = 'kg_plm_auth_api_base_url';
const DEFAULT_API_BASE_URL = 'http://203.16.201.251:5000';
const AUTH_ACCESS_TOKEN_KEY = 'kg_plm_access_token';

export function normalizeApiBaseUrl(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

export function getStoredApiBaseUrl() {
  // Ignore local storage for now to enforce the updated URL
  return normalizeApiBaseUrl(DEFAULT_API_BASE_URL) || window.location.origin;
}

export function setStoredApiBaseUrl(url) {
  const normalized = normalizeApiBaseUrl(url);
  if (!normalized) return;
  localStorage.setItem(AUTH_API_BASE_URL_KEY, normalized);
}

export function getAccessToken() {
  return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY) || '';
}

export async function apiRequest(pathOrUrl, options = {}) {
  const apiBaseUrl = getStoredApiBaseUrl();
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${apiBaseUrl}${path}`;
  const requestOptions = { ...(options || {}) };
  requestOptions.headers = {
    ...(options?.headers || {})
  };

  // Strict backends reject GET requests with Content-Type
  if ((requestOptions.method || 'GET').toUpperCase() === 'GET') {
    if (requestOptions.headers['Content-Type']) {
      delete requestOptions.headers['Content-Type'];
    }
  }

  // Mock Backend RBAC Validation
  try {
    const user = JSON.parse(localStorage.getItem('kg_plm_session_user'));
    if (user && (user.role === 'Designer' || user.role === '6')) {
      const restrictedEndpoints = ['/api/members', '/api/teams', '/api/auth/roles', '/api/admin'];
      const method = (requestOptions.method || 'GET').toUpperCase();
      if (['POST', 'PUT', 'DELETE'].includes(method)) {
        const isRestricted = restrictedEndpoints.some(ep => path.toLowerCase().startsWith(ep));
        if (isRestricted) {
          console.warn(`[RBAC] Blocked restricted mutation: ${method} ${path} for Designer`);
          return new Response(JSON.stringify({ message: 'Access Denied' }), {
            status: 403,
            statusText: 'Forbidden',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }
  } catch (e) {
    // Ignore RBAC mock errors
  }

  return fetch(url, requestOptions);
}

export async function authFetch(pathOrUrl, options = {}) {
  const accessToken = getAccessToken();
  const requestOptions = { ...(options || {}) };
  requestOptions.headers = { ...(options?.headers || {}) };
  if (accessToken) {
    requestOptions.headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await apiRequest(pathOrUrl, requestOptions);

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  return response;
}
