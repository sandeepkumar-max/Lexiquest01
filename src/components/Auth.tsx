import React, { useState } from 'react';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Mail, Lock, LogIn, UserPlus, Chrome, GraduationCap, AlertCircle, Loader2, CheckCircle, Eye, EyeOff, ShieldCheck, RefreshCw, ChevronLeft } from 'lucide-react';
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

  // Email verification check removed as requested
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
        setSuccess('Account created! Logging you in...');
        setTimeout(() => {
          onSuccess(result.user);
        }, 1500);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await FirebaseAuthentication.signInWithGoogle();
      if (result.user) {
        await FirebaseFirestore.setDocument({
          reference: 'users/' + result.user.uid,
          data: {
            uid: result.user.uid,
            email: result.user.email,
            role: 'user',
            lastLogin: new Date().toISOString()
          },
          merge: true
        }).catch(() => {});
        onSuccess(result.user);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.message?.includes('12500')) {
        setError('Google Login Error: SHA-1 keys for this environment may be missing in Firebase.');
      } else if (err.message?.includes('No credentials available')) {
        setError('No Google account found on this device. Please sign in to Google in your phone settings.');
      } else {
        setError(err.message || 'Google Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter your email address first.');
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
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 font-sans pt-safe pb-safe">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4 shadow-xl shadow-indigo-900/20">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-1">
            LexiQuest
          </h1>
          <p className="text-slate-500 text-sm font-medium">Master your vocabulary daily</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Social Login (Moved to Top for better UX) */}
              <div className="mt-6">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-slate-950 border border-slate-800 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-indigo-900/5"
                >
                  <Chrome className="w-5 h-5 text-white" />
                  Continue with Google
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-slate-800/50"></div>
                <div className="relative flex justify-center">
                  <span className="bg-slate-900 px-4 text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">Or use email</span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-700 font-medium"
                      placeholder="Email address"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-700 font-medium"
                      placeholder="Password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-indigo-400"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors ml-1"
                    >
                      {resetLoading ? 'Sending...' : 'Forgot Password?'}
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50 mt-4"
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
                    className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-xs font-bold text-red-400 leading-tight">{error}</p>
                  </motion.div>
                )}
                {success && (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <p className="text-xs font-bold text-green-400 leading-tight">{success}</p>
                  </motion.div>
                )}
              </AnimatePresence>



              {/* Toggle Login/Sign-up */}
              <div className="mt-8 text-center text-xs font-bold">
                  <span className="text-slate-500">{isLogin ? "New to LexiQuest?" : "Already have an account?"}</span>{' '}
                  <button 
                      onClick={() => { setIsLogin(!isLogin); setError(''); }}
                      className="text-indigo-400 hover:text-indigo-300 ml-1"
                  >
                      {isLogin ? "Create one now" : "Go to Sign In"}
                  </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center mt-12 text-[10px] font-black uppercase tracking-widest text-slate-700">
          Made for Word Lovers
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
