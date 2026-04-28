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

/** GitHub Pages and proxies often return HTML error bodies — never dump into UI. */
function responseLooksLikeHtml(text) {
  const t = String(text || '').trim();
  if (!t) return false;
  return /^<!DOCTYPE/i.test(t) || /^<html/i.test(t) || (t.includes('<head>') && t.includes('<meta'));
}

function apiUnavailableMessage() {
  return (
    'Cannot reach the BlaiseAI API (response looks like a generic HTML page). On GitHub Pages only static files load — run the FastAPI backend locally with the dev proxy, or host the API and set REACT_APP_API_BASE_URL when building the site.'
  );
}

/**
 * Turns axios errors into a readable string. CRA's dev proxy returns HTTP 500
 * with a plain-text body when the API on port 8000 is unreachable.
 */
export function formatApiError(error) {
  if (!error || typeof error !== 'object') {
    return 'Something went wrong.';
  }
  if (error.message && !error.response && error.code === 'STATIC_PAGES_NO_API') {
    return error.message;
  }
  if (!error.response) {
    return (
      error.message ||
      'Cannot reach the API. If you are running the React app locally, start the FastAPI backend on port 8000.'
    );
  }
  const { status, data } = error.response;
  if (typeof data === 'string' && data.trim()) {
    const text = data.trim();
    if (responseLooksLikeHtml(text)) {
      return apiUnavailableMessage();
    }
    if (status === 405 && /<title>405/i.test(text)) {
      return (
        'The server rejected this request (405). On GitHub Pages there is no API — use the demo logins on the login page, or deploy the FastAPI backend and set REACT_APP_API_BASE_URL when building the site.'
      );
    }
    if (text.includes('Could not proxy') || text.includes('ECONNREFUSED')) {
      return `${text}\n\nTip: open a second terminal, run: cd backend && uvicorn app.main:app --reload --port 8000`;
    }
    if (text.length > 600) {
      return `${text.slice(0, 520)}… (truncated)`;
    }
    return text;
  }
  if (data && typeof data.detail === 'string') {
    return data.detail;
  }
  if (Array.isArray(data?.detail)) {
    return data.detail.map((d) => d.msg || JSON.stringify(d)).join(' ');
  }
  if (data && typeof data === 'object') {
    try {
      return JSON.stringify(data);
    } catch {
      /* ignore */
    }
  }
  return `Request failed (${status}).`;
}

export default api;
