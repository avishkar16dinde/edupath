import React, { useState } from 'react';
import { 
  GraduationCap, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  AlertCircle, 
  Loader2,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import { storageService } from '../services/storageService';

interface LoginPageProps {
  onNavigate: (route: string) => void;
  onLoginSuccess: (hasExistingProfile: boolean) => void;
  redirectNotice?: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigate,
  onLoginSuccess,
  redirectNotice,
}) => {
  const { signIn, resetPassword, isConfigured, configError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email format (e.g. student@example.com).';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submissions

    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const { user, error } = await signIn(email.trim(), password);

      if (error) {
        let msg = error.message;
        if (msg.includes('Invalid login credentials')) {
          msg = 'Invalid email or password. Please verify your details or register a new account.';
        } else if (msg.includes('Email not confirmed')) {
          msg = 'Please confirm your email address before signing in. Check your inbox for the verification link.';
        }
        setErrorMessage(msg);
        return;
      }

      if (!user) {
        setErrorMessage('Authentication could not be confirmed. Please try again.');
        return;
      }

      // Check if student profile already exists in backend or local storage
      let hasProfile = false;
      const localProfile = storageService.getConfirmedProfile();
      if (localProfile) {
        hasProfile = true;
      } else {
        try {
          const remoteProfiles = await apiService.listProfiles(0, 5);
          if (remoteProfiles && remoteProfiles.length > 0) {
            hasProfile = true;
            storageService.saveConfirmedProfile(remoteProfiles[0]);
          }
        } catch {
          // If backend profile route is unavailable or cold, check local draft
          hasProfile = false;
        }
      }

      onLoginSuccess(hasProfile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to sign in. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotLoading) return;

    setForgotError(null);
    const trimmed = forgotEmail.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await resetPassword(trimmed);
      if (res.error) {
        setForgotError(res.error.message || 'Unable to send recovery email. Please try again later.');
      } else {
        setForgotSuccess(true);
      }
    } catch (err: any) {
      setForgotError(err.message || 'An error occurred during password recovery.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5FAF9] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-edupath-pattern">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Back to Home Link */}
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E8085] hover:text-[#376E7D] transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to EduPath Home</span>
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#C9E6F8] text-[#367BA8] shadow-2xs mb-1">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="font-serif-heading text-3xl font-bold text-[#376E7D] tracking-tight">
            Sign In to EduPath
          </h1>
          <p className="text-sm text-[#5E8085]">
            Access your Class 10 profile and continue your educational exploration.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xs rounded-3xl border border-[#DCEBEA] space-y-6">
          {/* Informational configuration banner if Supabase env vars are pending */}
          {!isConfigured && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">Supabase Environment Setup Required</div>
                <div className="text-[11px] text-amber-800 leading-relaxed">
                  {configError || 'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live authentication.'}
                </div>
              </div>
            </div>
          )}

          {/* Informational redirect notice if redirected from protected route */}
          {redirectNotice && !errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#EAF4FF] border border-[#A7D9E6] text-[#367BA8] text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 text-[#367BA8] mt-0.5" />
              <div className="leading-relaxed">
                {redirectNotice}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">{errorMessage}</div>
                <div className="text-[11px] text-rose-700">
                  Don&apos;t have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('/register')}
                    className="font-bold underline cursor-pointer"
                  >
                    Register here
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="login-email"
                className="block text-xs font-bold text-[#376E7D] uppercase tracking-wider"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E8085]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="student@example.com"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#F5FAF9] border rounded-xl text-sm text-[#376E7D] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#367BA8] focus:bg-white transition-all disabled:opacity-60 ${
                    fieldErrors.email ? 'border-rose-400 focus:ring-rose-400' : 'border-[#DCEBEA]'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-600 font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="login-password"
                  className="block text-xs font-bold text-[#376E7D] uppercase tracking-wider"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotSuccess(false);
                    setForgotError(null);
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-semibold text-[#367BA8] hover:text-[#278F89] transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E8085]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  className={`w-full pl-10 pr-11 py-2.5 bg-[#F5FAF9] border rounded-xl text-sm text-[#376E7D] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#367BA8] focus:bg-white transition-all font-mono disabled:opacity-60 ${
                    fieldErrors.password ? 'border-rose-400 focus:ring-rose-400' : 'border-[#DCEBEA]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#5E8085] hover:text-[#376E7D] cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] text-rose-600 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-[#367BA8] focus:ring-[#367BA8] border-[#DCEBEA] rounded-sm cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs text-[#5E8085] cursor-pointer select-none">
                Remember me on this device
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#367BA8] hover:bg-[#2e688e] active:scale-98 transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in with Supabase...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div className="pt-2 text-center text-xs text-[#5E8085] border-t border-[#DCEBEA]">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('/register')}
              className="font-bold text-[#367BA8] hover:text-[#278F89] transition-colors cursor-pointer"
            >
              Register here
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal (Supabase Password Recovery) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-[#DCEBEA] animate-in fade-in">
            <div className="flex items-center gap-2.5 text-[#367BA8]">
              <Info className="w-5 h-5" />
              <h3 className="font-bold text-[#376E7D]">Password Recovery</h3>
            </div>

            {forgotSuccess ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600 mt-0.5" />
                  <p className="leading-relaxed">
                    If an EduPath account exists for <strong>{forgotEmail}</strong>, a recovery link has been sent to your inbox.
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#367BA8] hover:bg-[#2e688e] rounded-xl transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <p className="text-xs text-[#5E8085] leading-relaxed">
                  Enter your registered email address and Supabase Auth will send you a secure link to reset your password.
                </p>

                {forgotError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#376E7D] uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="student@example.com"
                    required
                    disabled={forgotLoading}
                    className="w-full px-3.5 py-2.5 bg-[#F5FAF9] border border-[#DCEBEA] rounded-xl text-sm text-[#376E7D] focus:outline-hidden focus:ring-2 focus:ring-[#367BA8] focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                    className="px-4 py-2 text-xs font-medium text-[#5E8085] hover:text-[#376E7D] rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#367BA8] hover:bg-[#2e688e] rounded-xl transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send Recovery Link</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
