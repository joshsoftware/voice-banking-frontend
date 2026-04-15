import { API_BASE } from './constants';

type SessionInvalidatedHandler = () => void;
let onSessionInvalidated: SessionInvalidatedHandler | null = null;

export function registerSessionInvalidatedHandler(handler: SessionInvalidatedHandler) {
  onSessionInvalidated = handler;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('voicebank.access_token');
  
  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const url = new URL(`${API_BASE}${endpoint}`);
  if (options.params) {
    Object.keys(options.params).forEach(key => 
      url.searchParams.append(key, options.params![key])
    );
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.detail === 'Session has been invalidated (logged in from another device)') {
      if (onSessionInvalidated) {
        onSessionInvalidated();
      }
      throw new Error(errorData.detail);
    }
    
    // Standard 401 handling could go here (e.g. token refresh)
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
