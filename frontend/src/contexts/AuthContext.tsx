import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../utils/axios';
import { hasPermission, hasAnyPermission, getRolePermissions } from '../utils/permissions';

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  userPermissions: Record<string, boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Add event listener for when the window is closed or refreshed
    const handleUnload = () => {
      localStorage.removeItem('token');
    };

    window.addEventListener('beforeunload', handleUnload);
    
    checkAuthStatus();

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  // Update permissions when user changes
  useEffect(() => {
    if (user && user.role) {
      // Cast the result to Record<string, boolean> to satisfy TypeScript
      const permissions = getRolePermissions(user.role) as Record<string, boolean>;
      setUserPermissions(permissions);
    } else {
      setUserPermissions({});
    }
  }, [user]);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get('/api/v1/auth/verify');
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
    setUserPermissions({});
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post('/api/v1/auth/login', { username, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await axios.post('/api/v1/auth/change-password', {
        currentPassword,
        newPassword
      });
    } catch (error: any) {
      console.error('Change password error:', error);
      throw new Error(error.response?.data?.message || 'Failed to change password');
    }
  };

  // Permission helper functions
  const checkPermission = (permission: string): boolean => {
    if (!user || !user.role) return false;
    return hasPermission(permission, user.role);
  };

  const checkAnyPermission = (permissions: string[]): boolean => {
    if (!user || !user.role) return false;
    return hasAnyPermission(permissions, user.role);
  };

  // Set up axios interceptor for token expiration
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      login, 
      logout: handleLogout, 
      loading,
      changePassword,
      hasPermission: checkPermission,
      hasAnyPermission: checkAnyPermission,
      userPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 