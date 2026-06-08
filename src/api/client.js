const AUTH_API_BASE_URL_KEY = 'kg_plm_auth_api_base_url';
const DEFAULT_API_BASE_URL = 'http://203.16.202.17:5000';
const AUTH_ACCESS_TOKEN_KEY = 'kg_plm_access_token';

export function normalizeApiBaseUrl(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

export function getStoredApiBaseUrl() {
  // Ignore local storage for now to enforce the updated URL
  return normalizeApiBaseUrl(DEFAULT_API_BASE_URL);
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
    ...(options?.headers || {}),
    'ngrok-skip-browser-warning': 'true' // Added to bypass ngrok warning
  };
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
