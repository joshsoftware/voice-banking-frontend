import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, type AuthResponse } from '@/lib/authApi';
import { setActiveCustomerByPhone, clearActiveCustomer, getActiveCustomer, type DemoCustomer } from '@/lib/demoCustomer';
import { registerSessionInvalidatedHandler } from '@/lib/httpClient';

interface AuthContextType {
  user: DemoCustomer | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastOtp: string | null;
  sessionError: string | null;
  requestOtp: (phone: string) => Promise<void>;
  login: (phone: string, otp: string) => Promise<void>;
  logout: () => void;
  handleSessionInvalidated: () => void;
  clearSessionError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'voicebank.access_token';
const REFRESH_TOKEN_KEY = 'voicebank.refresh_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DemoCustomer | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastOtp, setLastOtp] = useState<string | null>(null);
  const [deviceId] = useState<string>(''); // Computed from mobile on login via SHA-256

  useEffect(() => {
    // Initial sync
    if (accessToken) {
      const customer = getActiveCustomer();
      setUser(customer);
    }
    setIsLoading(false);
  }, [accessToken]);

  const logout = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    clearActiveCustomer();
  }, []);

  const handleSessionInvalidated = useCallback(() => {
    logout();
    setSessionError('You have been logged out because a new login was detected on another device.');
    // Explicitly redirect to welcome page to ensure all tabs are kicked out immediately
    window.location.href = '/welcome';
  }, [logout]);

  useEffect(() => {
    registerSessionInvalidatedHandler(handleSessionInvalidated);
  }, [handleSessionInvalidated]);

  // Cross-tab session sync and invalidation:
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // 1. Sync Logout: If tokens are cleared in another tab, clear them here too
      if ((event.key === ACCESS_TOKEN_KEY || event.key === REFRESH_TOKEN_KEY) && !event.newValue) {
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        clearActiveCustomer();
        return;
      }

      // 2. Detect New Login: If a different access token is written, another session took over
      if (event.key === ACCESS_TOKEN_KEY && event.newValue && accessToken && event.newValue !== accessToken) {
        // NOTE: We trust the backend to have invalidated the old token. 
        // We log out this tab to enforce the single-session rule.
        handleSessionInvalidated();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [accessToken, handleSessionInvalidated]);

  const clearSessionError = () => setSessionError(null);

  const requestOtp = async (phone: string) => {
    try {
      const response = await authApi.sendOtp(phone);
      if (response.otp) {
        setLastOtp(response.otp);
      }
    } catch (error) {
      console.error('Failed to request OTP:', error);
      throw error;
    }
  };

  const login = async (phone: string, otp: string) => {
    try {
      const response: AuthResponse = await authApi.verifyOtp(phone, otp);

      setAccessToken(response.access_token);
      setRefreshToken(response.refresh_token);
      localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      
      // Update legacy mock customer state for compatibility with existing components
      const customer = setActiveCustomerByPhone(phone);
      setUser(customer);
      setLastOtp(null);
      setSessionError(null);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: !!accessToken,
    isLoading,
    lastOtp,
    sessionError,
    requestOtp,
    login,
    logout,
    handleSessionInvalidated,
    clearSessionError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
