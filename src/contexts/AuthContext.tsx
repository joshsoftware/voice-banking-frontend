import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, type AuthResponse } from '@/lib/authApi';
import { setActiveCustomerByPhone, clearActiveCustomer, getActiveCustomer, type DemoCustomer } from '@/lib/demoCustomer';
import { registerSessionInvalidatedHandler } from '@/lib/httpClient';

interface AuthContextType {
  user: DemoCustomer | null;
  mobileNumber: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isVoiceprintRegistered: boolean;
  isNewUser: boolean;
  preferredLanguage: string | null;
  isLoading: boolean;
  lastOtp: string | null;
  sessionError: string | null;
  requestOtp: (phone: string) => Promise<void>;
  login: (phone: string, otp: string) => Promise<AuthResponse>;
  logout: () => void;
  setPreferredLanguage: (lang: string) => void;
  handleSessionInvalidated: () => void;
  clearSessionError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'voicebank.access_token';
const REFRESH_TOKEN_KEY = 'voicebank.refresh_token';
const CHAT_HISTORY_KEY_PREFIX = 'voicebank.chatHistory';
const AUTH_SESSION_ID_KEY = 'voicebank.auth_session_id';
const PREFERRED_LANGUAGE_KEY = 'voicebank.preferred_language';
const IS_NEW_USER_KEY = 'voicebank.is_new_user';
const MOBILE_NUMBER_KEY = 'voicebank.mobile_number';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DemoCustomer | null>(null);
  const [mobileNumber, setMobileNumber] = useState<string | null>(localStorage.getItem(MOBILE_NUMBER_KEY));
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  const [refreshToken, setRefreshToken] = useState<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastOtp, setLastOtp] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState<boolean>(() => localStorage.getItem(IS_NEW_USER_KEY) === 'true');
  const [preferredLanguage, setPreferredLanguageState] = useState<string | null>(
    () => localStorage.getItem(PREFERRED_LANGUAGE_KEY)
  );

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
    setMobileNumber(null);
    setIsNewUser(false);
    setPreferredLanguageState(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_SESSION_ID_KEY);
    localStorage.removeItem(PREFERRED_LANGUAGE_KEY);
    localStorage.removeItem(IS_NEW_USER_KEY);
    localStorage.removeItem(MOBILE_NUMBER_KEY);
    Object.keys(localStorage)
      .filter((key) => key.startsWith(CHAT_HISTORY_KEY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
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

  const setPreferredLanguage = useCallback((lang: string) => {
    setPreferredLanguageState(lang);
    try {
      localStorage.setItem(PREFERRED_LANGUAGE_KEY, lang);
    } catch {
      // ignore storage errors
    }
  }, []);

  const login = async (phone: string, otp: string) => {
    try {
      const response: AuthResponse = await authApi.verifyOtp(phone, otp);

      setAccessToken(response.access_token);
      setRefreshToken(response.refresh_token);
      setMobileNumber(phone);
      localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      localStorage.setItem(MOBILE_NUMBER_KEY, phone);
      localStorage.setItem(AUTH_SESSION_ID_KEY, `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
      
      // Store new-user flag and preferred language from backend
      setIsNewUser(response.is_new_user);
      localStorage.setItem(IS_NEW_USER_KEY, String(response.is_new_user));

      if (response.preferred_language) {
        setPreferredLanguage(response.preferred_language);
      }

      // Update legacy mock customer state for compatibility with existing components
      const customer = setActiveCustomerByPhone(
        phone, 
        response.customer_id, 
        response.is_voiceprint_registered,
        response.base_customer_id
      );
      setUser(customer);
      setLastOtp(null);
      setSessionError(null);
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const value = {
    user,
    mobileNumber,
    accessToken,
    refreshToken,
    isAuthenticated: !!accessToken,
    isVoiceprintRegistered: user?.is_voice_registered ?? false,
    isNewUser,
    preferredLanguage,
    isLoading,
    lastOtp,
    sessionError,
    requestOtp,
    login,
    logout,
    setPreferredLanguage,
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
