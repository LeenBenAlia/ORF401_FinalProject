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

/**
 * Turns axios errors into a readable string. CRA's dev proxy returns HTTP 500
 * with a plain-text body when the API on port 8000 is unreachable.
 */
export function formatApiError(error) {
  if (!error || typeof error !== 'object') {
    return 'Something went wrong.';
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
    if (text.includes('Could not proxy') || text.includes('ECONNREFUSED')) {
      return `${text}\n\nTip: open a second terminal, run: cd backend && uvicorn app.main:app --reload --port 8000`;
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
