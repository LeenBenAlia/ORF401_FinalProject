import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api/v1/';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("blaise_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** GitHub Pages / nginx often return HTML bodies — match anywhere in the first chunk (not only line-start). */
export function looksLikeHtmlPayload(text) {
  const s = String(text ?? '')
    .replace(/^\uFEFF/, '')
    .trimStart();
  if (!s.length) return false;
  const probe = s.slice(0, 12000);
  return (
    /<!DOCTYPE\s*html/i.test(probe) ||
    /<html[\s>]/i.test(probe) ||
    /<head[\s>]/i.test(probe) ||
    (probe.includes('<meta') && probe.includes('Content-Security-Policy')) ||
    (probe.includes('<meta') &&
      /http-equiv\s*=\s*["']Content-type["']/i.test(probe)) ||
    (probe.includes('<head>') && /<title>/i.test(probe)) ||
    /<\/html>\s*$/i.test(probe.trim())
  );
}

function looksLikeHtmlResponse(error) {
  const ct = error?.response?.headers?.['content-type'] ?? error?.response?.headers?.['Content-Type'];
  return typeof ct === 'string' && /text\/html/i.test(ct);
}

/** Last line of defense so UI never renders document markup as text. */
function finalizeUserFacingMessage(message) {
  const s = String(message ?? '');
  if (looksLikeHtmlPayload(s)) return apiUnavailableMessage();
  return s;
}

function apiUnavailableMessage() {
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const localSteps =
    ' In one terminal: cd backend && uvicorn app.main:app --reload --port 8000. In another: cd frontend && npm start — the app proxies /api to port 8000.';
  const remoteSteps =
    ' Static hosts (e.g. GitHub Pages) have no API unless you deploy FastAPI elsewhere and rebuild the frontend with REACT_APP_API_BASE_URL pointing to that API.';
  return `Cannot reach the BlaiseAI API (response looks like a generic HTML page instead of JSON).${isLocal ? localSteps : remoteSteps}`;
}

/** Normalize axios error bodies so UI never receives raw HTML strings. */
function sanitizeAxiosErrorPayload(error) {
  if (!error?.response) return;
  if (looksLikeHtmlResponse(error)) {
    error.response.data = { detail: apiUnavailableMessage() };
    return;
  }
  if (!error.response.data) return;
  const { data } = error.response;
  if (typeof data === 'string' && looksLikeHtmlPayload(data)) {
    error.response.data = { detail: apiUnavailableMessage() };
    return;
  }
  if (data && typeof data === 'object' && typeof data.detail === 'string' && looksLikeHtmlPayload(data.detail)) {
    error.response.data = { ...data, detail: apiUnavailableMessage() };
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    sanitizeAxiosErrorPayload(error);
    return Promise.reject(error);
  }
);

/**
 * Turns axios errors into a readable string. CRA's dev proxy returns HTTP 500
 * with a plain-text body when the API on port 8000 is unreachable.
 */
export function formatApiError(error) {
  if (!error || typeof error !== 'object') {
    return 'Something went wrong.';
  }
  if (error.message && !error.response && error.code === 'STATIC_PAGES_NO_API') {
    return finalizeUserFacingMessage(error.message);
  }
  if (!error.response) {
    return finalizeUserFacingMessage(
      error.message ||
        'Cannot reach the API. If you are running the React app locally, start the FastAPI backend on port 8000.'
    );
  }
  if (looksLikeHtmlResponse(error)) {
    return apiUnavailableMessage();
  }
  const { status, data } = error.response;
  if (typeof data === 'string' && data.trim()) {
    const text = data.trim();
    if (looksLikeHtmlPayload(text)) {
      return apiUnavailableMessage();
    }
    if (status === 405 && /<title>405/i.test(text)) {
      return finalizeUserFacingMessage(
        'The server rejected this request (405). On GitHub Pages there is no API — use the demo logins on the login page, or deploy the FastAPI backend and set REACT_APP_API_BASE_URL when building the site.'
      );
    }
    if (text.includes('Could not proxy') || text.includes('ECONNREFUSED')) {
      return finalizeUserFacingMessage(
        `${text}\n\nTip: open a second terminal, run: cd backend && uvicorn app.main:app --reload --port 8000`
      );
    }
    if (text.length > 600) {
      return finalizeUserFacingMessage(`${text.slice(0, 520)}… (truncated)`);
    }
    return finalizeUserFacingMessage(text);
  }
  if (data && typeof data.detail === 'string') {
    const d = data.detail;
    if (looksLikeHtmlPayload(d)) return apiUnavailableMessage();
    return finalizeUserFacingMessage(d);
  }
  if (Array.isArray(data?.detail)) {
    const joined = data.detail.map((d) => d.msg || JSON.stringify(d)).join(' ');
    return finalizeUserFacingMessage(joined);
  }
  if (data && typeof data === 'object') {
    try {
      const serial = JSON.stringify(data);
      if (looksLikeHtmlPayload(serial)) return apiUnavailableMessage();
      return finalizeUserFacingMessage(serial);
    } catch {
      /* ignore */
    }
  }
  return `Request failed (${status}).`;
}

export default api;
