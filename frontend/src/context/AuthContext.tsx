/**
 * Shared Supabase Authentication Context
 * Manages user authentication, session subscription, and synchronization with backend API.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, supabaseConfigurationError } from '../lib/supabase';
import { setApiAuthToken } from '../services/apiService';

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  needsEmailConfirmation: boolean;
  error: AuthError | Error | null;
}

export interface SignInResult {
  user: User | null;
  session: Session | null;
  error: AuthError | Error | null;
}

export interface ResetPasswordResult {
  success: boolean;
  error: AuthError | Error | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  configError: string | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (preferredName: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<ResetPasswordResult>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session and attach auth state listener
  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      // If Supabase credentials are not set, finish loading immediately
      setLoading(false);
      return;
    }

    // 1. Initial Session Retrieval
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn('Supabase getSession error:', error.message);
          setSession(null);
          setUser(null);
          setApiAuthToken(null);
        } else {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setApiAuthToken(initialSession?.access_token ?? null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Supabase session initialization failed:', err);
        setSession(null);
        setUser(null);
        setApiAuthToken(null);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    // 2. Subscribe to auth state changes (SIGN_IN, SIGN_OUT, TOKEN_REFRESHED, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setApiAuthToken(currentSession?.access_token ?? null);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setApiAuthToken(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign In with Email & Password
   */
  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    if (!isSupabaseConfigured) {
      return {
        user: null,
        session: null,
        error: new Error(
          supabaseConfigurationError || 'Supabase URL and Anon Key are missing in environment.'
        ),
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { user: null, session: null, error };
      }

      setSession(data.session);
      setUser(data.user);
      setApiAuthToken(data.session?.access_token ?? null);

      return { user: data.user, session: data.session, error: null };
    } catch (err: any) {
      return { user: null, session: null, error: err };
    }
  };

  /**
   * Register a new user with metadata (preferred_name)
   */
  const signUp = async (
    preferredName: string,
    email: string,
    password: string
  ): Promise<SignUpResult> => {
    if (!isSupabaseConfigured) {
      return {
        user: null,
        session: null,
        needsEmailConfirmation: false,
        error: new Error(
          supabaseConfigurationError || 'Supabase URL and Anon Key are missing in environment.'
        ),
      };
    }

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/#login` : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            preferred_name: preferredName.trim(),
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return {
          user: null,
          session: null,
          needsEmailConfirmation: false,
          error,
        };
      }

      const hasSession = Boolean(data.session);
      if (hasSession) {
        setSession(data.session);
        setUser(data.user);
        setApiAuthToken(data.session?.access_token ?? null);
      }

      return {
        user: data.user,
        session: data.session,
        needsEmailConfirmation: !hasSession,
        error: null,
      };
    } catch (err: any) {
      return {
        user: null,
        session: null,
        needsEmailConfirmation: false,
        error: err,
      };
    }
  };

  /**
   * Sign Out
   */
  const signOut = async (): Promise<void> => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut warning:', err);
      }
    }

    setSession(null);
    setUser(null);
    setApiAuthToken(null);
  };

  /**
   * Password Recovery: Send reset email
   */
  const resetPassword = async (email: string): Promise<ResetPasswordResult> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: new Error(
          supabaseConfigurationError || 'Supabase URL and Anon Key are missing in environment.'
        ),
      };
    }

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/#reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err };
    }
  };

  /**
   * Password Recovery: Update password for current session
   */
  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: new Error(supabaseConfigurationError || 'Supabase URL and Anon Key are missing.'),
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: Boolean(user && session),
    isConfigured: isSupabaseConfigured,
    configError: supabaseConfigurationError,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
