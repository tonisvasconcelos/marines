/**
 * Creates an API client with authentication headers
 */
export function createApiClient() {
  // Use environment variable in production, or relative path in development
  const baseUrl = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

  let isRefreshing = false;
  let refreshPromise = null;
  let redirectingToLogin = false; // Prevent multiple redirects

  async function refreshToken() {
    if (isRefreshing && refreshPromise) {
      return refreshPromise;
    }
    isRefreshing = true;
    const storedRefresh = localStorage.getItem('auth_refresh');
    if (!storedRefresh) {
      isRefreshing = false;
      return null;
    }
    refreshPromise = fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Unable to refresh session');
        }
        return res.json();
      })
      .then((data) => {
        if (data.accessToken && data.refreshToken) {
          localStorage.setItem('auth_token', data.accessToken);
          localStorage.setItem('auth_refresh', data.refreshToken);
          return data.accessToken;
        }
        throw new Error('Invalid refresh response');
      })
      .catch((err) => {
        console.error('Refresh token failed', err);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_tenant');
        return null;
      })
      .finally(() => {
        isRefreshing = false;
      });
    return refreshPromise;
  }

  async function request(endpoint, options = {}) {
    // Read token fresh on each request (in case it was updated after login)
    const token = localStorage.getItem('auth_token');
    
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
      console.log(`API Request: ${options.method || 'GET'} ${url} (with token)`);
    } else {
      console.warn(`API Request: ${options.method || 'GET'} ${url} (NO TOKEN)`);
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      console.log(`API Response: ${response.status} ${response.statusText} for ${url}`);
      
      // Handle 401 Unauthorized - token may be expired, try refreshing
      if (response.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          // retry once with refreshed token
          return request(endpoint, { ...options, headers: { ...headers, Authorization: `Bearer ${newToken}` } });
        }
        // Refresh failed - clear auth and redirect (only once)
        if (!redirectingToLogin && window.location.pathname !== '/login') {
          redirectingToLogin = true;
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_refresh');
          localStorage.removeItem('auth_user');
          localStorage.removeItem('auth_tenant');
          // Use a small delay to prevent rapid redirects
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
        throw new Error('Unauthorized');
      }

      // Handle 403 Forbidden - user is authenticated but lacks permissions
      // Don't attempt token refresh as it won't resolve permission issues
      if (response.status === 403) {
        const error = await response.json().catch(() => ({ message: 'Forbidden: Insufficient permissions' }));
        throw new Error(error.message || 'Forbidden: Insufficient permissions');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  return {
    get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, data, options) =>
      request(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
    put: (endpoint, data, options) =>
      request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
    delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
  };
}

// Export a default instance
export const api = createApiClient();
