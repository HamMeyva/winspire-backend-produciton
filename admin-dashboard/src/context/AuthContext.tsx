import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in (token exists)
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (storedUser && token) {
        try {
          // Validate token by getting current user
          const response = await authAPI.getCurrentUser();
          setUser(response.data?.user || null);
        } catch (err) {
          console.error('Failed to validate token:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.login({ email, password });
      
      if (response.data?.user) {
        setUser(response.data.user);
      } else {
        throw new Error('Login failed: No user data received');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    try {
      await authAPI.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 