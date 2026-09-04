import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, type AuthResponse, type MeResponse } from '@/lib/authApi';
import {
  setActiveCustomer,
  resolveCustomerByPhone,
  clearActiveCustomer,
  getActiveCustomer,
  markVoiceRegistered,
  markVoiceUnregistered,
  allowVoiceSkip,
  disallowVoiceSkip,
  isVoiceSkipAllowed,
  type DemoCustomer,
} from '@/lib/customerData';
import { registerSessionInvalidatedHandler } from '@/lib/httpClient';
import {
  AUTH_PREFERRED_LANGUAGE_KEY,
  clearLanguageSessionStorage,
  getStoredLanguageForPhone,
  parseLanguageId,
  setStoredLanguageForPhone,
} from '@/i18n/languageStorage';

interface AuthContextType {
  user: DemoCustomer | null;
  mobileNumber: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isVoiceprintRegistered: boolean;
  voiceRegistrationSkipped: boolean;
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
  refreshActiveCustomer: () => void;
  skipVoiceRegistration: () => Promise<void>;
  applyOnboardingFromServer: (me: Pick<
    MeResponse,
    | 'preferred_language'
    | 'is_voiceprint_registered'
    | 'voice_registration_skipped'
    | 'customer_id'
    | 'base_customer_id'
    | 'mobile_number'
  >) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'voicebank.access_token';
const REFRESH_TOKEN_KEY = 'voicebank.refresh_token';
const CHAT_HISTORY_KEY_PREFIX = 'voicebank.chatHistory';
const AUTH_SESSION_ID_KEY = 'voicebank.auth_session_id';
const PREFERRED_LANGUAGE_KEY = AUTH_PREFERRED_LANGUAGE_KEY;
const IS_NEW_USER_KEY = 'voicebank.is_new_user';
const MOBILE_NUMBER_KEY = 'voicebank.mobile_number';
const VOICE_SKIP_KEY = 'voicebank.voice_registration_skipped';

function readCachedVoiceSkip(): boolean {
  return localStorage.getItem(VOICE_SKIP_KEY) === 'true';
}

function writeCachedVoiceSkip(skipped: boolean): void {
  try {
    if (skipped) localStorage.setItem(VOICE_SKIP_KEY, 'true');
    else localStorage.removeItem(VOICE_SKIP_KEY);
  } catch {
    // ignore
  }
}

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
  const [voiceRegistrationSkipped, setVoiceRegistrationSkipped] = useState<boolean>(readCachedVoiceSkip);

  const logout = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setMobileNumber(null);
    setIsNewUser(false);
    setPreferredLanguageState(null);
    setVoiceRegistrationSkipped(false);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_SESSION_ID_KEY);
    localStorage.removeItem(PREFERRED_LANGUAGE_KEY);
    localStorage.removeItem(IS_NEW_USER_KEY);
    localStorage.removeItem(MOBILE_NUMBER_KEY);
    writeCachedVoiceSkip(false);
    clearLanguageSessionStorage();
    Object.keys(localStorage)
      .filter((key) => key.startsWith(CHAT_HISTORY_KEY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
    clearActiveCustomer();
  }, []);

  const setPreferredLanguage = useCallback((lang: string) => {
    const parsed = parseLanguageId(lang);
    if (!parsed) return;
    setPreferredLanguageState(parsed);
    try {
      localStorage.setItem(PREFERRED_LANGUAGE_KEY, parsed);
      const phone = localStorage.getItem(MOBILE_NUMBER_KEY);
      if (phone) {
        setStoredLanguageForPhone(phone, parsed);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const applyOnboardingFromServer = useCallback(
    async (
      me: Pick<
        MeResponse,
        | 'preferred_language'
        | 'is_voiceprint_registered'
        | 'voice_registration_skipped'
        | 'customer_id'
        | 'base_customer_id'
        | 'mobile_number'
      >,
    ) => {
      const phone = me.mobile_number;
      setMobileNumber(phone);
      localStorage.setItem(MOBILE_NUMBER_KEY, phone);

      if (me.preferred_language) {
        setPreferredLanguage(me.preferred_language);
      }

      const skipped = Boolean(me.voice_registration_skipped) && !me.is_voiceprint_registered;
      setVoiceRegistrationSkipped(skipped);
      writeCachedVoiceSkip(skipped);

      let existing = getActiveCustomer();
      const phoneDigits = phone.replace(/\D/g, '').slice(-10);
      if (!existing || existing.mobile_number.replace(/\D/g, '').slice(-10) !== phoneDigits) {
        try {
          existing = await resolveCustomerByPhone(phone);
        } catch (err) {
          console.error('Failed to resolve customer during bootstrap:', err);
        }
      }

      if (existing) {
        const customer = setActiveCustomer(
          existing,
          me.customer_id,
          me.is_voiceprint_registered,
          me.base_customer_id,
        );
        if (me.is_voiceprint_registered) {
          markVoiceRegistered(customer.customer_id);
          disallowVoiceSkip(customer.customer_id);
        } else if (skipped) {
          markVoiceUnregistered(customer.customer_id);
          allowVoiceSkip(customer.customer_id);
        } else {
          markVoiceUnregistered(customer.customer_id);
        }
        setUser(getActiveCustomer());
      } else {
        // Still apply voice flags on a minimal stub so routing has an id.
        setUser({
          customer_id: me.base_customer_id || me.customer_id,
          email: '',
          kyc_status: '',
          created_at: '',
          date_of_birth: '',
          mobile_number: phone,
          name: '',
          status: '',
          voice_customer_id: me.customer_id,
          base_customer_id: me.base_customer_id,
          is_voice_registered: me.is_voiceprint_registered,
        });
        if (skipped) {
          allowVoiceSkip(me.base_customer_id || me.customer_id);
        }
      }
    },
    [setPreferredLanguage],
  );

  // Cold-start bootstrap: validate session via /auth/me before any route redirects.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const storedAccess = localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (!storedAccess && !storedRefresh) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      // Keep React state aligned with storage if another tab cleared tokens.
      if (!storedAccess) {
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        setMobileNumber(null);
        setPreferredLanguageState(null);
        setVoiceRegistrationSkipped(false);
        clearActiveCustomer();
        if (!cancelled) setIsLoading(false);
        return;
      }

      setAccessToken(storedAccess);
      if (storedRefresh) setRefreshToken(storedRefresh);

      try {
        const me = await authApi.getMe();
        if (cancelled) return;
        await applyOnboardingFromServer(me);
      } catch (err) {
        console.error('Session bootstrap failed:', err);
        if (!cancelled) {
          // httpClient may already have redirected on hard 401; still clear local auth.
          logout();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyOnboardingFromServer, logout]);

  const handleSessionInvalidated = useCallback(() => {
    logout();
    setSessionError('You have been logged out because a new login was detected on another device.');
    window.location.href = '/welcome';
  }, [logout]);

  useEffect(() => {
    registerSessionInvalidatedHandler(handleSessionInvalidated);
  }, [handleSessionInvalidated]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if ((event.key === ACCESS_TOKEN_KEY || event.key === REFRESH_TOKEN_KEY) && !event.newValue) {
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        setPreferredLanguageState(null);
        setVoiceRegistrationSkipped(false);
        clearActiveCustomer();
        return;
      }

      if (event.key === ACCESS_TOKEN_KEY && event.newValue && accessToken && event.newValue !== accessToken) {
        handleSessionInvalidated();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [accessToken, handleSessionInvalidated]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (accessToken && !storedToken) {
          logout();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [accessToken, logout]);

  const clearSessionError = () => setSessionError(null);

  const refreshActiveCustomer = useCallback(() => {
    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) return;
    setUser(getActiveCustomer());
  }, []);

  const skipVoiceRegistration = useCallback(async () => {
    const res = await authApi.skipVoiceRegistration();
    const customerId =
      getActiveCustomer()?.customer_id ||
      res.base_customer_id ||
      res.customer_id ||
      user?.customer_id;

    setVoiceRegistrationSkipped(Boolean(res.voice_registration_skipped) && !res.is_voiceprint_registered);
    writeCachedVoiceSkip(Boolean(res.voice_registration_skipped) && !res.is_voiceprint_registered);

    if (customerId) {
      if (res.is_voiceprint_registered) {
        markVoiceRegistered(customerId);
        disallowVoiceSkip(customerId);
      } else if (res.voice_registration_skipped) {
        allowVoiceSkip(customerId);
      }
    }

    if (res.preferred_language) {
      setPreferredLanguage(res.preferred_language);
    }

    setUser(getActiveCustomer());
  }, [setPreferredLanguage, user?.customer_id]);

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
      setMobileNumber(phone);
      localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      localStorage.setItem(MOBILE_NUMBER_KEY, phone);
      localStorage.setItem(AUTH_SESSION_ID_KEY, `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

      setIsNewUser(response.is_new_user);
      localStorage.setItem(IS_NEW_USER_KEY, String(response.is_new_user));

      if (response.preferred_language) {
        setPreferredLanguage(response.preferred_language);
      } else {
        const cached = getStoredLanguageForPhone(phone);
        if (cached) {
          setPreferredLanguage(cached);
        }
      }

      const skipped = Boolean(response.voice_registration_skipped) && !response.is_voiceprint_registered;
      setVoiceRegistrationSkipped(skipped);
      writeCachedVoiceSkip(skipped);

      const phoneDigits = phone.replace(/\D/g, '').slice(-10);
      const existing = getActiveCustomer();
      const bankCustomer =
        existing && existing.mobile_number.replace(/\D/g, '').slice(-10) === phoneDigits
          ? existing
          : await resolveCustomerByPhone(phone);
      const customer = setActiveCustomer(
        bankCustomer,
        response.customer_id,
        response.is_voiceprint_registered,
        response.base_customer_id,
      );
      if (response.is_voiceprint_registered) {
        markVoiceRegistered(customer.customer_id);
        disallowVoiceSkip(customer.customer_id);
      } else if (skipped) {
        allowVoiceSkip(customer.customer_id);
      }
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
    voiceRegistrationSkipped,
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
    clearSessionError,
    refreshActiveCustomer,
    skipVoiceRegistration,
    applyOnboardingFromServer,
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

/** Shared gate: listening/home allowed when voice is registered or skipped. */
export function canEnterListening(opts: {
  isVoiceprintRegistered: boolean;
  voiceRegistrationSkipped: boolean;
  customerId?: string | null;
}): boolean {
  if (opts.isVoiceprintRegistered || opts.voiceRegistrationSkipped) return true;
  if (opts.customerId && isVoiceSkipAllowed(opts.customerId)) return true;
  return false;
};
