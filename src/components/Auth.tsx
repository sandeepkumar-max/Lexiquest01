import React, { useState } from 'react';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Mail, Lock, GraduationCap, AlertCircle, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthProps {
  onSuccess: (user: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check if a user is already signed in
  React.useEffect(() => {
    const checkInitialAuth = async () => {
      try {
        const result = await FirebaseAuthentication.getCurrentUser();
        if (result.user) {
          onSuccess(result.user);
        }
      } catch (err) {
        console.error('Check initial auth failed:', err);
      }
    };
    checkInitialAuth();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const result = await FirebaseAuthentication.signInWithEmailAndPassword({ email, password });
        onSuccess(result.user);
      } else {
        const result = await FirebaseAuthentication.createUserWithEmailAndPassword({ email, password });
        setSuccess('Account created! Logging you in…');
        setTimeout(() => onSuccess(result.user), 1500);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email first.');
      return;
    }
    setResetLoading(true);
    try {
      await FirebaseAuthentication.sendPasswordResetEmail({ email: email.trim() });
      setSuccess('Reset link sent to your email! ✨');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 font-sans pt-safe pb-safe">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-200">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-1">LexiQuest</h1>
          <p className="text-slate-500 text-sm font-medium">Master your vocabulary daily</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Email Form */}
              <form onSubmit={handleAuth} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="lexi-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900 text-base"
                    placeholder="Email address"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="lexi-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-900 text-base"
                    placeholder="Password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {isLogin && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors ml-1"
                    >
                      {resetLoading ? 'Sending…' : 'Forgot Password?'}
                    </button>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 shadow-lg shadow-indigo-200 disabled:shadow-none mt-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : isLogin ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              {/* Status Messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100 flex gap-3 overflow-hidden"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-red-600 leading-relaxed">{error}</p>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex gap-3 overflow-hidden"
                  >
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-emerald-700 leading-relaxed">{success}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toggle Login/Sign‑up */}
              <div className="mt-6 text-center text-sm font-bold">
                <span className="text-slate-500">
                  {isLogin ? 'New to LexiQuest?' : 'Already have an account?'}
                </span>{' '}
                <button
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  className="text-indigo-600 hover:text-indigo-700 ml-1"
                >
                  {isLogin ? 'Create one now' : 'Go to Sign In'}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center mt-10 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Made for Word Lovers
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
