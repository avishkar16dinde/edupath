import React, { useState } from 'react';
import { 
  GraduationCap, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  Loader2,
  CheckCircle2,
  MailCheck,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface RegisterPageProps {
  onNavigate: (route: string) => void;
  onRegisterSuccess: (needsEmailConfirmation: boolean) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigate,
  onRegisterSuccess,
}) => {
  const { signUp, isConfigured, configError } = useAuth();

  const [preferredName, setPreferredName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    preferredName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    agreeTerms?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: {
      preferredName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      agreeTerms?: string;
    } = {};

    const cleanName = preferredName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      errors.preferredName = 'Please enter your preferred name.';
    }

    if (!cleanEmail) {
      errors.email = 'Please enter your email address.';
    } else if (!EMAIL_REGEX.test(cleanEmail)) {
      errors.email = 'Please enter a valid email format (e.g. student@example.com).';
    }

    if (!password) {
      errors.password = 'Please enter a password.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match. Please re-enter.';
    }

    if (!agreeTerms) {
      errors.agreeTerms = 'You must agree to the EduPath Privacy Policy to continue.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent repeated submissions

    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await signUp(preferredName.trim(), email.trim(), password);

      if (res.error) {
        let msg = res.error.message;
        if (msg.includes('already registered') || msg.includes('User already exists')) {
          msg = 'An account with this email address already exists. Please sign in instead.';
        } else if (msg.includes('Password should be at least')) {
          msg = 'Password does not meet the minimum security requirements.';
        }
        setErrorMessage(msg);
        return;
      }

      if (res.needsEmailConfirmation) {
        setEmailConfirmationRequired(true);
        onRegisterSuccess(true);
      } else {
        onRegisterSuccess(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to register account. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5FAF9] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-edupath-pattern">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Back Link */}
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E8085] hover:text-[#376E7D] transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to EduPath Home</span>
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#CDEDE2] text-[#278F89] shadow-2xs mb-1">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="font-serif-heading text-3xl font-bold text-[#376E7D] tracking-tight">
            Create Your EduPath Account
          </h1>
          <p className="text-sm text-[#5E8085] max-w-sm mx-auto">
            Start with what you know about yourself. Your journey begins with your personal account.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xs rounded-3xl border border-[#DCEBEA] space-y-6">
          {/* Supabase configuration notice if credentials are not configured yet */}
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

          {/* Email Confirmation Screen */}
          {emailConfirmationRequired ? (
            <div className="text-center space-y-5 py-4 animate-in fade-in">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#CDEDE2] text-[#278F89] flex items-center justify-center shadow-xs">
                <MailCheck className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h2 className="font-serif-heading text-2xl font-bold text-[#376E7D]">
                  Verify Your Email Address
                </h2>
                <p className="text-xs text-[#5E8085] leading-relaxed">
                  We have sent a verification email to{' '}
                  <strong className="text-[#376E7D] font-mono">{email}</strong>.
                </p>
                <p className="text-xs text-[#5E8085] leading-relaxed">
                  Please click the link in your inbox to confirm your account, then return to sign in and begin your EduPath journey.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-[#367BA8] hover:bg-[#2e688e] transition-colors cursor-pointer shadow-xs"
                >
                  Proceed to Sign In
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold">{errorMessage}</div>
                    <div className="text-[11px] text-rose-700">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => onNavigate('/login')}
                        className="font-bold underline cursor-pointer"
                      >
                        Sign in here
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Preferred Name */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="register-name"
                    className="block text-xs font-bold text-[#376E7D] uppercase tracking-wider"
                  >
                    Preferred Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E8085]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="register-name"
                      type="text"
                      value={preferredName}
                      onChange={(e) => {
                        setPreferredName(e.target.value);
                        if (fieldErrors.preferredName) {
                          setFieldErrors((prev) => ({ ...prev, preferredName: undefined }));
                        }
                      }}
                      placeholder="e.g. Aaryan or Ananya"
                      required
                      disabled={isLoading}
                      className={`w-full pl-10 pr-4 py-2.5 bg-[#F5FAF9] border rounded-xl text-sm text-[#376E7D] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#367BA8] focus:bg-white transition-all disabled:opacity-60 ${
                        fieldErrors.preferredName ? 'border-rose-400 focus:ring-rose-400' : 'border-[#DCEBEA]'
                      }`}
                    />
                  </div>
                  {fieldErrors.preferredName && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      {fieldErrors.preferredName}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="register-email"
                    className="block text-xs font-bold text-[#376E7D] uppercase tracking-wider"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E8085]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }
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

                {/* Password */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="register-password"
                    className="block text-xs font-bold text-[#376E7D] uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E8085]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) {
                          setFieldErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
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
                  {fieldErrors.password ? (
                    <p className="text-[11px] text-rose-600 font-medium">
                      {fieldErrors.password}
                    </p>
                  ) : (
                    <span className="text-[11px] text-[#5E8085] block">
                      Must be at least 8 characters.
                    </span>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="register-confirm-password"
                    className="block text-xs font-bold text-[#376E7D] uppercase tracking-wider"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E8085]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors.confirmPassword) {
                          setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }
                      }}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                      disabled={isLoading}
                      className={`w-full pl-10 pr-11 py-2.5 bg-[#F5FAF9] border rounded-xl text-sm text-[#376E7D] placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#367BA8] focus:bg-white transition-all font-mono disabled:opacity-60 ${
                        fieldErrors.confirmPassword ? 'border-rose-400 focus:ring-rose-400' : 'border-[#DCEBEA]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#5E8085] hover:text-[#376E7D] cursor-pointer"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Terms & Consent */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-start">
                    <input
                      id="agree-terms"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => {
                        setAgreeTerms(e.target.checked);
                        if (fieldErrors.agreeTerms) {
                          setFieldErrors((prev) => ({ ...prev, agreeTerms: undefined }));
                        }
                      }}
                      disabled={isLoading}
                      className="h-4 w-4 text-[#367BA8] focus:ring-[#367BA8] border-[#DCEBEA] rounded-sm mt-0.5 cursor-pointer"
                    />
                    <label htmlFor="agree-terms" className="ml-2 block text-xs text-[#5E8085] leading-snug cursor-pointer select-none">
                      I agree to the EduPath Privacy Policy and accept that my self-reported reflections will be kept confidential.
                    </label>
                  </div>
                  {fieldErrors.agreeTerms && (
                    <p className="text-[11px] text-rose-600 font-medium pl-6">
                      {fieldErrors.agreeTerms}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#367BA8] hover:bg-[#2e688e] active:scale-98 transition-all shadow-xs cursor-pointer disabled:opacity-60 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account with Supabase...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </form>

              {/* Switch to Login */}
              <div className="pt-2 text-center text-xs text-[#5E8085] border-t border-[#DCEBEA]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="font-bold text-[#367BA8] hover:text-[#278F89] transition-colors cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
