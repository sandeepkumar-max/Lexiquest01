import React, { useState } from 'react';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { Mail, Lock, LogIn, UserPlus, Chrome, GraduationCap, AlertCircle, Loader2, CheckCircle, Eye, EyeOff, Phone, MessageSquare, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthProps {
  onSuccess: (user: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);

  const ADMIN_EMAIL = 'sandeepkumarspj290@gmail.com';
  const ADMIN_PHONE = '+918406936028';

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const result = await FirebaseAuthentication.signInWithEmailAndPassword({
          email,
          password,
        });
        
        if (result.user && !result.user.emailVerified && result.user.email !== ADMIN_EMAIL) {
          setIsUnverified(true);
          setLoading(false);
          return;
        }

        onSuccess(result.user);
      } else {
        const result = await FirebaseAuthentication.createUserWithEmailAndPassword({
          email,
          password,
        });

        // Send verification email
        await FirebaseAuthentication.sendEmailVerification().catch(err => console.error('Verification error:', err));

        // Save user data to Firestore
        if (result.user) {
          await FirebaseFirestore.setDocument({
            reference: 'users/' + result.user.uid,
            data: {
              uid: result.user.uid,
              email: result.user.email,
              role: result.user.email === ADMIN_EMAIL ? 'admin' : 'user',
              createdAt: new Date().toISOString(),
            },
            merge: true
          });
        }

        setIsUnverified(true);
        setSuccess('Account created! Please check your email to verify your account before logging in.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    
    try {
      if (!showOtpField) {
        if (!phoneNumber || phoneNumber.length < 10) {
          setError('Please enter a valid phone number.');
          return;
        }
        setLoading(true);
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
        
        // Listen for phone code sent
        const listener = await FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
          setVerificationId(event.verificationId);
          setShowOtpField(true);
          setLoading(false);
          setSuccess('OTP sent successfully!');
          listener.remove();
        });

        // Listen for failure
        const errorListener = await FirebaseAuthentication.addListener('phoneVerificationFailed', (event) => {
          console.error('Phone verification failed:', event);
          setError(event.message || 'Phone verification failed. Check project quota or SHA keys.');
          setLoading(false);
          errorListener.remove();
        });

        await FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: formattedPhone });
      } else {
        if (!otp || otp.length < 6) {
          setError('Please enter a 6-digit OTP.');
          return;
        }
        setLoading(true);
        const result = await FirebaseAuthentication.confirmVerificationCode({
          verificationId,
          verificationCode: otp
        });

        if (result.user) {
           await FirebaseFirestore.setDocument({
            reference: 'users/' + result.user.uid,
            data: {
              uid: result.user.uid,
              phone: result.user.phoneNumber,
              role: result.user.phoneNumber === ADMIN_PHONE ? 'admin' : 'user',
              lastLogin: new Date().toISOString()
            },
            merge: true
          }).catch(() => {});
        }
        onSuccess(result.user);
      }
    } catch (err: any) {
      console.error('Phone auth error:', err);
      setError(err.message || 'Verification failed. Try again.');
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setResetLoading(true);
    try {
      await FirebaseAuthentication.sendEmailVerification();
      setSuccess('Verification email resent!');
    } catch (err: any) {
      setError(err.message || 'Failed to resend email.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async (isRetry = false) => {
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
            role: result.user.email === ADMIN_EMAIL ? 'admin' : 'user',
            lastLogin: new Date().toISOString()
          },
          merge: true
        }).catch(err => console.log('Firestore set error:', err));
        onSuccess(result.user);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.message?.includes('12500') || err.message?.includes('limit')) {
         setError('Google Login Limit/Config Error: Ensure SHA keys are in Firebase Console.');
      } else if (!isRetry && (err.message?.includes('No credentials available') || err.message?.includes('17'))) {
        handleGoogleSignIn(true);
        return;
      } else {
        setError(err.message || 'Google Sign-In failed.');
      }
    } finally {
      if (!isRetry) setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address first.');
      return;
    }

    setError('');
    setSuccess('');
    setResetLoading(true);
    try {
      await FirebaseAuthentication.sendPasswordResetEmail({ email: email.trim() });
      setSuccess('Password reset link sent! Please check your inbox (and spam folder). Note: If you do not receive it, ensure this email is registered.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 p-0.5 mb-4 shadow-[0_0_30px_rgba(139,92,246,0.5)]"
          >
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white">
            LEXIQUEST
          </h1>
          <p className="text-slate-400 mt-2 text-sm uppercase tracking-[0.2em]">Master the Art of Words</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative">
          <AnimatePresence mode="wait">
            {isUnverified ? (
              <motion.div 
                key="unverified"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-10 h-10 text-amber-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold mb-2">Verify Your Email</h2>
                    <p className="text-slate-400 text-sm">We've sent a verification link to <span className="text-white font-bold">{email}</span>. Please verify your account to continue.</p>
                </div>
                
                <div className="space-y-4">
                    <button
                        onClick={async () => {
                            try {
                                await FirebaseAuthentication.reload();
                                const result = await FirebaseAuthentication.getCurrentUser();
                                if (result.user?.emailVerified) {
                                    onSuccess(result.user);
                                } else {
                                    setSuccess('Still not verified. Please check your email and click the link.');
                                }
                            } catch (err) {
                                window.location.reload();
                            }
                        }}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-white shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-5 h-5" /> I've Verified My Email
                    </button>
                    
                    <button
                        onClick={resendVerification}
                        disabled={resetLoading}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-white transition-colors disabled:opacity-50"
                    >
                        {resetLoading ? 'Sending...' : 'Resend Verification Email'}
                    </button>

                    <button
                        onClick={() => setIsUnverified(false)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest"
                    >
                        Back to Login
                    </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="auth"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6">
                    <button 
                        onClick={() => setIsLogin(true)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${isLogin ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Login
                    </button>
                    <button 
                        onClick={() => setIsLogin(false)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${!isLogin ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Sign Up
                    </button>
                </div>

                <div className="flex gap-4 mb-8">
                    <button 
                        onClick={() => { setAuthMethod('email'); setShowOtpField(false); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border transition-all ${authMethod === 'email' ? 'bg-purple-600/10 border-purple-500 text-purple-400' : 'bg-slate-800/30 border-white/5 text-slate-500 hover:text-slate-300'}`}
                    >
                        <Mail className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Email</span>
                    </button>
                    <button 
                        onClick={() => { 
                            setAuthMethod('phone'); 
                            if (!isLogin) setIsLogin(true); // Phone is primarily for login/verification here
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border transition-all ${authMethod === 'phone' ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-800/30 border-white/5 text-slate-500 hover:text-slate-300'}`}
                    >
                        <Phone className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">SMS OTP</span>
                    </button>
                </div>

                {authMethod === 'email' ? (
                  <form onSubmit={handleAuth} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-white placeholder-slate-600"
                          placeholder="name@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Password</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-11 pr-12 py-3 bg-slate-800/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all text-white placeholder-slate-600"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-purple-400 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {isLogin && (
                        <div className="flex justify-end mt-2">
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={resetLoading || loading}
                            className="text-xs font-bold text-slate-400 hover:text-purple-400 transition-colors uppercase tracking-wider disabled:opacity-50"
                          >
                            {resetLoading ? 'Sending...' : 'Forgot Password?'}
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full relative group"
                    >
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                      <div className="relative flex items-center justify-center gap-2 w-full py-3 bg-slate-900 rounded-xl font-bold text-white leading-none transition duration-200 hover:bg-slate-800 border border-white/5">
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isLogin ? (
                          <>
                            <LogIn className="w-5 h-5" />
                            Sign In
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-5 h-5" />
                            Create Account
                          </>
                        )}
                      </div>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handlePhoneSignIn} className="space-y-6">
                    <AnimatePresence mode="wait">
                      {!showOtpField ? (
                        <motion.div
                          key="phone-input"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Phone Number</label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Phone className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            </div>
                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="block w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-white placeholder-slate-600"
                              placeholder="98765 43210"
                              required
                            />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="otp-input"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Enter 6-Digit OTP</label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <MessageSquare className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            </div>
                            <input
                              type="number"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              maxLength={6}
                              className="block w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-white placeholder-slate-600 tracking-[0.5em] font-black text-center"
                              placeholder="000000"
                              required
                            />
                          </div>
                          <button 
                            type="button"
                            onClick={() => setShowOtpField(false)}
                            className="mt-2 text-xs font-bold text-slate-500 hover:text-blue-400 uppercase"
                          >
                            Change Phone Number
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full relative group"
                    >
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                      <div className="relative flex items-center justify-center gap-2 w-full py-3 bg-slate-900 rounded-xl font-bold text-white leading-none transition duration-200 hover:bg-slate-800 border border-white/5">
                        {loading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : !showOtpField ? (
                          <>
                            <MessageSquare className="w-5 h-5" />
                            Send OTP
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-5 h-5" />
                            Verify & Continue
                          </>
                        )}
                      </div>
                    </button>
                  </form>
                )}

                <AnimatePresence>
                  {error && (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mt-6"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <p>{error}</p>
                    </motion.div>
                  )}
                  {success && !isUnverified && (
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm mt-6"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <p>{success}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black">
                    <span className="bg-slate-900 px-4 text-slate-500 tracking-[0.2em]">Or Continue with</span>
                  </div>
                </div>

                <button
                  onClick={() => handleGoogleSignIn()}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-lg active:scale-[0.98]"
                >
                  <Chrome className="w-5 h-5 text-[#4285F4]" />
                  Sign in with Google
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center mt-8 text-slate-500 text-xs">
          By continuing, you agree to LexiQuest's <span className="text-purple-400 cursor-pointer">Terms</span> and <span className="text-purple-400 cursor-pointer">Privacy Policy</span>.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
