import React, { createContext, useContext, useState, useEffect } from 'react';
import { setLocale } from '../../utils/i18n';
import { api } from '../../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    const storedTenant = localStorage.getItem('auth_tenant');

    if (storedToken && storedUser && storedTenant) {
      const tenantData = JSON.parse(storedTenant);
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setTenant(tenantData);
      
      // Set locale from tenant settings
      if (tenantData.defaultLocale) {
        setLocale(tenantData.defaultLocale);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email });
      
      // Use the API client which respects VITE_API_URL
      const data = await api.post('/auth/login', { email, password });
      console.log('Login successful, received data:', { 
        hasToken: !!data.token, 
        hasUser: !!data.user, 
        hasTenant: !!data.tenant 
      });

      const { token: newToken, user: newUser, tenant: newTenant } = data;

      if (!newToken || !newUser || !newTenant) {
        console.error('Missing data in response:', { newToken: !!newToken, newUser: !!newUser, newTenant: !!newTenant });
        throw new Error('Invalid response from server');
      }

      // Update localStorage first
      localStorage.setItem('auth_token', newToken);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      localStorage.setItem('auth_tenant', JSON.stringify(newTenant));

      // Set locale from tenant settings
      if (newTenant.defaultLocale) {
        setLocale(newTenant.defaultLocale);
      }

      // Then update state (this triggers re-render)
      setToken(newToken);
      setUser(newUser);
      setTenant(newTenant);

      console.log('Login complete, user authenticated');
      
      // Return success after a brief moment to ensure state is set
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return { success: true };
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Check if it's a network error
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed') ||
          error.name === 'TypeError') {
        return { 
          success: false, 
          error: 'Cannot connect to server. Make sure the backend is running on port 3001 and check the browser console for details.' 
        };
      }
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setTenant(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_tenant');
  };

  const value = {
    user,
    tenant,
    token,
    loading,
    login,
    logout,
    setTenant,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

