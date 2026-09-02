import React, { useState, useEffect } from 'react';
import { GSTStorage } from '../utils/storage';
import { CloudService } from '../utils/cloudService';
import { User } from '../types';
import { PasswordResetModal } from './PasswordResetModal';
import {
  Receipt,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Mail,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [urlResetToken, setUrlResetToken] = useState<string | undefined>(undefined);
  const [urlResetEmail, setUrlResetEmail] = useState<string | undefined>(undefined);

  // Check URL parameters for direct reset link on load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('reset_token');
      const email = params.get('email');
      if (token) {
        setUrlResetToken(token);
        if (email) setUrlResetEmail(decodeURIComponent(email));
        setShowResetModal(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessBanner('');

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both username/email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Try production cloud authentication first
      const cloudRes = await CloudService.login(identifier, password);
      if (cloudRes.success && cloudRes.user) {
        GSTStorage.setCurrentUser(cloudRes.user);
        GSTStorage.startSession(cloudRes.user);
        setIsLoading(false);
        onLoginSuccess(cloudRes.user);
        return;
      }

      // 2. Fallback to local storage verification if offline or provision transition
      const localRes = GSTStorage.login(identifier, password);
      setIsLoading(false);

      if (!localRes.success) {
        setErrorMessage(cloudRes.error || localRes.error || 'Invalid Email/User ID or Password');
      } else if (localRes.user) {
        onLoginSuccess(localRes.user);
      }
    } catch (err: any) {
      // Fallback
      const res = GSTStorage.login(identifier, password);
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid Email/User ID or Password');
      } else if (res.user) {
        onLoginSuccess(res.user);
      }
    }
  };

  const handlePasswordResetSuccess = (userEmail: string, newPass: string) => {
    setShowResetModal(false);
    setUrlResetToken(undefined);
    setUrlResetEmail(undefined);
    setIdentifier(userEmail);
    setPassword(newPass);
    setSuccessBanner('Password updated successfully! You can now click Login.');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600 rounded-full blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 text-white mb-3 ring-4 ring-slate-800">
            <Receipt className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">GST Management Portal</h1>
          <p className="text-xs text-slate-400 mt-1">
            Secure Authentication & Work Compliance System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Success Banner Alert */}
          {successBanner && (
            <div
              id="login-success-alert"
              className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{successBanner}</div>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div
              id="login-error-alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2.5 animate-shake"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            {/* Email / User ID */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Email / User ID <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your User ID or Email"
                  required
                  autoFocus
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  id="forgot-password-btn"
                  onClick={() => {
                    setUrlResetToken(undefined);
                    setUrlResetEmail(undefined);
                    setShowResetModal(true);
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
                <button
                  type="button"
                  id="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="login-remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <span className="text-xs text-slate-300 font-medium">Remember me</span>
              </label>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                256-bit PBKDF2
              </span>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                isLoading
                  ? 'bg-blue-700 opacity-80 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 active:scale-[0.99] cursor-pointer'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating & Verifying Role...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-400 space-y-1">
          <p>Powered by Supabase Realtime Database & Multi-Device Live Sync</p>
          <p className="text-slate-400 text-[11px]">Authorized personnel login only. Sessions are securely encrypted.</p>
        </div>
      </div>

      {/* Modern Multi-step Password Reset Modal */}
      <PasswordResetModal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setUrlResetToken(undefined);
          setUrlResetEmail(undefined);
        }}
        onSuccess={handlePasswordResetSuccess}
        initialToken={urlResetToken}
        initialEmail={urlResetEmail}
      />
    </div>
  );
};
