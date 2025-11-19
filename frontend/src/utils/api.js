/**
 * Creates an API client with authentication headers
 */
export function createApiClient() {
  // Use environment variable in production, or relative path in development
  const baseUrl = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

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
      
      if (response.status === 401) {
        // Unauthorized - clear auth and redirect
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_tenant');
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }

      if (response.status === 403) {
        // Forbidden - token might be expired or invalid
        // Try to get more details from error response
        const error = await response.json().catch(() => ({ message: 'Invalid or expired token' }));
        // Don't redirect on 403 for preview endpoints - let the component handle it
        if (endpoint.includes('/preview-position')) {
          throw new Error(error.message || 'Invalid or expired token');
        }
        // For other endpoints, treat 403 like 401
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_tenant');
        window.location.href = '/login';
        throw new Error(error.message || 'Forbidden');
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
