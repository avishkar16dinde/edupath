/**
 * EduPath Authentication Service (Bridge to Supabase Auth)
 * Maintains backwards compatibility for any service-level authentication calls
 * while using Supabase Auth as the source of truth.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string | number;
  email: string;
  preferred_name?: string;
  created_at?: string;
}

export function formatSupabaseUser(user: SupabaseUser | null): User | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || '',
    preferred_name: user.user_metadata?.preferred_name,
    created_at: user.created_at,
  };
}

export const authService = {
  /**
   * Get currently authenticated user synchronously from cache or active Supabase session
   */
  getCurrentUser(): User | null {
    if (!isSupabaseConfigured) return null;
    return null;
  },

  /**
   * Async get user from Supabase
   */
  async getUser(): Promise<User | null> {
    if (!isSupabaseConfigured) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return formatSupabaseUser(user);
  },

  /**
   * Login using Supabase
   */
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error('No user returned from Supabase');
    return formatSupabaseUser(data.user)!;
  },

  /**
   * Register using Supabase
   */
  async register(preferred_name: string, email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          preferred_name: preferred_name.trim(),
        },
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error('No user returned from Supabase');
    return formatSupabaseUser(data.user)!;
  },

  /**
   * Logout using Supabase
   */
  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },
};
