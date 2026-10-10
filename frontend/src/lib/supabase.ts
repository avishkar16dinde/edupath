/**
 * Supabase Client Initialization
 * Configured via environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Never exposes service-role keys.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Check if variables are populated with actual non-placeholder values
const isPlaceholderUrl =
  !rawUrl ||
  rawUrl.includes('your-project.supabase.co') ||
  rawUrl.includes('your_supabase_project_url') ||
  !rawUrl.startsWith('https://');

const isPlaceholderKey =
  !rawAnonKey ||
  rawAnonKey.includes('your_supabase_publishable') ||
  rawAnonKey.includes('your_supabase_anon_key') ||
  rawAnonKey.length < 20;

export const isSupabaseConfigured: boolean = !isPlaceholderUrl && !isPlaceholderKey;

export const supabaseConfigurationError: string | null = isSupabaseConfigured
  ? null
  : 'Supabase credentials are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to connect real Supabase Auth.';

// If configured, use the provided credentials. Otherwise, initialize a dummy client so the application never crashes on load.
const effectiveUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const effectiveKey = isSupabaseConfigured
  ? rawAnonKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});
