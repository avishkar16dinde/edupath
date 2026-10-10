/**
 * ProtectedRoute Component
 * Guards routes requiring student authentication.
 * Distinguishes between initial session check loading, authenticated, and unauthenticated states.
 */

import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onRedirectToLogin: (notice?: string) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  onRedirectToLogin,
}) => {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Only redirect once the initial Supabase session check is complete
    if (!loading && !isAuthenticated) {
      onRedirectToLogin('Sign in or create an account to begin your journey.');
    }
  }, [loading, isAuthenticated, onRedirectToLogin]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#C9E6F8] text-[#367BA8] flex items-center justify-center shadow-2xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#367BA8]" />
        </div>
        <p className="text-sm font-semibold text-[#376E7D]">
          Checking student session...
        </p>
        <p className="text-xs text-[#5E8085]">
          Preparing your EduPath journey.
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will trigger redirect in useEffect
  }

  return <>{children}</>;
};
