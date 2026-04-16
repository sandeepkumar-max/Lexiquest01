import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { AdMob } from '@capacitor-community/admob';
import { App as CapApp } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';
import { Book, BookOpen, Search, Settings, Plus, Trash2, CheckCircle, AlertCircle, FileText, GraduationCap, PenTool, Lock, Unlock, Volume2, X, Sliders, Bell, Flame, Save, Download, Upload, Share2, Clock, ChevronLeft, Star, LogIn, UserPlus, Target, Sparkles, Send, Bot, MessageSquare, RefreshCw, Info, Languages, Mic, Moon, Sun, BarChart3, Trophy } from 'lucide-react';
import { COMMON_WORDS } from './lib/dictionary';
import { LEARN_WORDS } from './lib/learnWords';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import Auth from './components/Auth';
import { motion, AnimatePresence } from 'motion/react';
import { Purchases, LOG_LEVEL, PACKAGE_TYPE } from '@revenuecat/purchases-capacitor';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { SplashScreen } from '@capacitor/splash-screen';

type Tab = 'learn' | 'test' | 'dictionary' | 'ai-coach' | 'profile';

interface DictPhonetic { text?: string; audio?: string; }
interface DictDefinition { definition: string; example?: string; synonyms: string[]; antonyms: string[]; }
interface DictMeaning { partOfSpeech: string; definitions: DictDefinition[]; synonyms: string[]; antonyms: string[]; }
interface DictEntry { word: string; phonetic?: string; phonetics: DictPhonetic[]; meanings: DictMeaning[]; }



const MASTER_ADMIN_EMAIL = 'sandeepkumarspj290@gmail.com';

class ErrorBoundary extends React.Component<any, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center bg-white h-screen flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Oops! Something Crashed</h1>
          <p className="text-slate-500 mb-8 max-w-xs mx-auto text-sm">{this.state.error?.message || 'Unknown Error'}</p>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200"
          >
            Reset & Restart
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const safeParseJSON = (key: string, fallback: any) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    console.warn(`SafeParse failed for ${key}:`, e);
    return fallback;
  }
};

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('learn');
  const [customWords, setCustomWords] = useState<{ word: string, meaning: string, example: string }[]>([]);
  const [sharedWords, setSharedWords] = useState<{ word: string, meaning: string, example: string }[]>([]);


  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);



  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(() => user?.displayName || localStorage.getItem('userName') || 'Adventurer');
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('profileImage') || '');


  // AI Coach State
  const [aiChat, setAiChat] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isOnCall, setIsOnCall] = useState(false);
  const aiChatEndRef = useRef<HTMLDivElement>(null);

  // Saved Words State
  const [savedWords, setSavedWords] = useState<{ word: string, meaning: string, example: string, savedAt: number }[]>([]);

  // AdMob State
  const [adInitialized, setAdInitialized] = useState(false);
  const [isPremium, setIsPremium] = useState(() => {
    // Immediate Admin Check
    const localEmail = localStorage.getItem('userEmail');
    if (localEmail === MASTER_ADMIN_EMAIL) return true;
    return localStorage.getItem('isPremium') === 'true';
  });
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);

  const ADMOB_INTERSTITIAL_ID = import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || 'ca-app-pub-3271133689051975/5794528015';
  const isPluginsInitialized = useRef(false);
  const [adReady, setAdReady] = useState(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [lastAction, setLastAction] = useState<string>('App started');

  const logAction = (msg: string) => {
    console.log(`[TRACE] ${msg}`);
    const time = new Date().toLocaleTimeString();
    setLastAction(`${time}: ${msg}`);
    setErrorLog(prev => [`${time}: ${msg}`, ...prev].slice(0, 50));
  };

  // Test State
  const [testState, setTestState] = useState<'start' | 'testing' | 'results'>('start');
  const [testMode, setTestMode] = useState<'listen-mcq' | 'listen-type' | 'visual-mcq' | 'meaning-mcq'>('listen-mcq');
  const [currentTestWordIndex, setCurrentTestWordIndex] = useState(0);
  const [testWords, setTestWords] = useState<string[]>([]);
  const [testDifficulty, setTestDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [mcqOptions, setMcqOptions] = useState<string[][]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [feedbackState, setFeedbackState] = useState<'none' | 'correct' | 'incorrect' | 'timeout'>('none');
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<any>(null);

  // Sound effects
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');
  const correctSound = useMemo(() => new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'), []);
  const wrongSound = useMemo(() => new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'), []);

  // Streak State
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('streak') || '0'));
  const [lastPracticeDate, setLastPracticeDate] = useState(() => localStorage.getItem('lastPracticeDate') || '');

  // Test Stats
  const [totalTestsTaken, setTotalTestsTaken] = useState(() => parseInt(localStorage.getItem('totalTestsTaken') || '0'));
  const [averageScore, setAverageScore] = useState(() => parseFloat(localStorage.getItem('averageScore') || '0'));

  // Gamification State
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('xp') || '0'));
  const [level, setLevel] = useState(() => parseInt(localStorage.getItem('level') || '1'));
  const [showLevelUp, setShowLevelUp] = useState(false);
  // Achievements (Safe Load)
  const [badges, setBadges] = useState(() => safeParseJSON('badges', [
    { id: 'streak-7', title: '7-Day Streak', icon: '🔥', earned: false },
    { id: 'words-50', title: '50 Words Mastered', icon: '📚', earned: false },
    { id: 'level-5', title: 'Level 5 Reached', icon: '⭐', earned: false }
  ]));

  // Daily Words (Safe Load)
  const [dailyWords, setDailyWords] = useState<{ word: string, meaning: string, example: string }[]>(() => safeParseJSON('dailyWords', []));

  // Daily Missions (Safe Load)
  const [missions, setMissions] = useState(() => safeParseJSON('dailyMissions', [
    { id: 'correct-10', title: 'Word Wizard', desc: 'Get 10 correct answers', goal: 10, current: 0, reward: 50, completed: false },
    { id: 'test-2', title: 'Test Taker', desc: 'Complete 2 full tests', goal: 2, current: 0, reward: 100, completed: false },
    { id: 'dict-3', title: 'Researcher', desc: 'Search 3 words in Dict', goal: 3, current: 0, reward: 30, completed: false }
  ]));

  // Streak Shield
  const [streakShields, setStreakShields] = useState(() => parseInt(localStorage.getItem('streakShields') || '0'));

  // Speech State
  const [speechRate, setSpeechRate] = useState(0.9);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [speechSettingsOpen, setSpeechSettingsOpen] = useState(false);

  // Custom Alert/Confirm Modals
  const [alertMessage, setAlertMessage] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [wordsToConfirm, setWordsToConfirm] = useState<{ word: string, meaning: string, example: string }[]>([]);
  const [clearConfirmModalOpen, setClearConfirmModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [dailyWordsModalOpen, setDailyWordsModalOpen] = useState(false);
  const [adminAddModalOpen, setAdminAddModalOpen] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [newWordData, setNewWordData] = useState({ word: '', meaning: '', example: '', category: 'All' });

  const hasPremium = isPremium || user?.email === MASTER_ADMIN_EMAIL;

  // Learn State
  const [learnPage, setLearnPage] = useState(0);
  const wordsPerPage = 30;
  const [learnSearchQuery, setLearnSearchQuery] = useState('');
  const [aiWords, setAiWords] = useState<{ word: string, meaning: string, example: string, category: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categories = ['All', 'Daily Use', 'Work', 'Idioms', 'Academic', 'Travel', 'Advanced'];

  const allLearnWords = useMemo(() => {
    let combined = [...LEARN_WORDS, ...customWords, ...sharedWords, ...aiWords];

    if (learnSearchQuery.trim()) {
      combined = combined.filter(w =>
        w.word.toLowerCase().includes(learnSearchQuery.toLowerCase()) ||
        (w.meaning && w.meaning.toLowerCase().includes(learnSearchQuery.toLowerCase()))
      );
    }

    if (selectedCategory !== 'All') {
      combined = combined.filter(w => (w as any).category === selectedCategory);
    }

    return combined;
  }, [customWords, sharedWords, aiWords, learnSearchQuery, selectedCategory]);
  const totalLearnPages = Math.ceil(allLearnWords.length / wordsPerPage);
  const currentLearnWords = allLearnWords.slice(learnPage * wordsPerPage, (learnPage + 1) * wordsPerPage);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);

  // Dictionary State
  const [dictQuery, setDictQuery] = useState('');
  const [dictResult, setDictResult] = useState<DictEntry | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState('');
  const [dictAudio, setDictAudio] = useState<HTMLAudioElement | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [hindiTranslation, setHindiTranslation] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [leaderboard, setLeaderboard] = useState<{ name: string, xp: number, level: number }[]>([]);
  const [xpHistory, setXpHistory] = useState<number[]>(() => {
    const saved = localStorage.getItem('xpHistory');
    return saved ? JSON.parse(saved) : [0, 0, 0, 0, 0, 0, 0];
  });
  const [isListening, setIsListening] = useState(false);

  // Reminder State
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem('reminderTime') || '10:00');

  const fetchAiWords = async (force = false) => {
    try {
      // Caching logic: Only fetch if forced or if cache is older than 12 hours
      const cachedData = localStorage.getItem('cached_ai_words');
      const cacheTimestamp = localStorage.getItem('cached_ai_words_ts');
      const now = Date.now();
      const twelveHours = 12 * 60 * 60 * 1000;

      if (!force && cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < twelveHours) {
        setAiWords(JSON.parse(cachedData));
        return;
      }

      const { snapshots } = await FirebaseFirestore.getCollection({ reference: 'ai_words' });
      if (snapshots) {
        const words = snapshots.map(s => s.data as any);
        setAiWords(words);
        localStorage.setItem('cached_ai_words', JSON.stringify(words));
        localStorage.setItem('cached_ai_words_ts', now.toString());
      }
    } catch (err) {
      console.error('Failed to fetch AI words:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAiWords();

      // Singleton Plugin Setup
      const initPlugins = async () => {
        if (isPluginsInitialized.current) return;
        
        if (Capacitor.isNativePlatform()) {
          try {
            console.log("Initializing Plugins...");
            // RevenueCat
            await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
            await Purchases.configure({ apiKey: import.meta.env.VITE_REVENUECAT_API_KEY });
            
            // AdMob
            await AdMob.initialize();
            setAdInitialized(true);
            
            isPluginsInitialized.current = true;
            console.log("Plugins Initialized Successfully");
          } catch (e: any) {
            console.error("Plugin Init Error:", e);
            setErrorLog(prev => [...prev, `Plugin Init Error: ${e.message}`]);
          }
        }
      };
      initPlugins();

      // Check Subscription Status
      const checkStatus = async () => {
        if (Capacitor.isNativePlatform()) {
          try {
            const info = await Purchases.getCustomerInfo();
            const customerInfo = (info as any).customerInfo || info;
            if (user.email === MASTER_ADMIN_EMAIL || customerInfo?.entitlements?.active['premium']) {
              setIsPremium(true);
              localStorage.setItem('isPremium', 'true');
            }
          } catch (e) {
            console.error("Status Check Error:", e);
          }
        }
      };
      checkStatus();

      // Internal Admin Check (Stealth)
      if (user.email === MASTER_ADMIN_EMAIL) {
        setIsPremium(true);
        localStorage.setItem('isPremium', 'true');
        localStorage.setItem('userEmail', user.email);
      }
      
      // Fetch Saved Words
      const fetchSavedWords = async () => {
        try {
          const { snapshots } = await FirebaseFirestore.getCollection({ reference: `users/${user.uid}/saved_words` });
          if (snapshots) {
            setSavedWords(snapshots.map(s => s.data as any));
          }
        } catch (e) {
          console.error("Failed to fetch saved words:", e);
        }
      };
      fetchSavedWords();
    }
  }, [user]);
  const [reminderEnabled, setReminderEnabled] = useState(() => localStorage.getItem('reminderEnabled') === 'true');
  const [reminderEverSet, setReminderEverSet] = useState(() => localStorage.getItem('reminderEverSet') === 'true');
  const [reminderPopoverOpen, setReminderPopoverOpen] = useState(false);
  const [draftReminderTime, setDraftReminderTime] = useState(() => localStorage.getItem('reminderTime') || '10:00');
  const reminderPopoverRef = useRef<HTMLDivElement>(null);
  const reminderBtnRef = useRef<HTMLButtonElement>(null);



  // Scroll to top when test results are shown
  useEffect(() => {
    if (testState === 'results') {
      const scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [testState]);

  // AdMob Periodic Interstitial Loop
  useEffect(() => {
    // BYPASS: No ads for admin or premium users
    const isMasterAdmin = user?.email === MASTER_ADMIN_EMAIL;
    if (!Capacitor.isNativePlatform() || !user || isPremium || isMasterAdmin || !adInitialized) {
      return;
    }

    let adInterval: any;

    const prepareAndShow = async () => {
      try {
        console.log("Preparing Interstitial Ad...");
        await AdMob.prepareInterstitial({ 
          adId: ADMOB_INTERSTITIAL_ID, 
          isTesting: false // Set to false for production
        });
        setAdReady(true);
        
        // Wait 120 seconds before first ad
        adInterval = setInterval(async () => {
          if (!user || isPremium || !isPluginsInitialized.current) return;
          try {
            console.log("Showing Interstitial Ad...");
            await AdMob.showInterstitial();
            setAdReady(false);
            // Prepare next ad
            await AdMob.prepareInterstitial({ adId: ADMOB_INTERSTITIAL_ID, isTesting: false }).catch(() => { });
            setAdReady(true);
          } catch (e: any) {
            console.error('Ad Show Error:', e);
            // Re-prepare on error
            await AdMob.prepareInterstitial({ adId: ADMOB_INTERSTITIAL_ID, isTesting: false }).catch(() => { });
          }
        }, 120000);
      } catch (err: any) {
        console.error('AdMob prepare error:', err);
        setErrorLog(prev => [...prev, `AdMob Error: ${err.message}`]);
      }
    };

    prepareAndShow();

    return () => {
      if (adInterval) clearInterval(adInterval);
    };
  }, [user, isPremium, adInitialized]);

  // AdMob and setup periodic interstitial


  // Global Error Handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global Error Caught:", event.error);
      const msg = event.error?.message || event.message || 'Unknown JS Error';
      setErrorLog(prev => [...prev, `JS Error: ${msg}`]);
      if (Capacitor.isNativePlatform()) {
        Dialog.alert({
          title: 'App Error Detected',
          message: `Technical Details: ${msg}. Please report this to the developer.`
        }).catch(() => {});
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Firebase Authentication State Listener
  useEffect(() => {
    const checkUser = async () => {
      try {
        const result = await FirebaseAuthentication.getCurrentUser();
        if (result.user) {
          setUser(result.user);

          // 1. Fetch user role from Firestore
          const userDoc = await FirebaseFirestore.getDocument({ reference: 'users/' + result.user.uid });

          // 2. Extract premium status
          const userData = userDoc.snapshot?.data as any;
          const isPremiumUser = userData?.premium === true;
          const deletionRequestedAt = userData?.deletionRequestedAt;

          // Check for pending deletion
          if (deletionRequestedAt) {
            const now = Date.now();
            const hoursPassed = (now - deletionRequestedAt) / (1000 * 60 * 60);

            if (hoursPassed >= 24) {
              await FirebaseFirestore.deleteDocument({ reference: 'users/' + result.user.uid }).catch(() => { });
              await FirebaseAuthentication.deleteUser();
              localStorage.clear();
              setUser(null);
              setAlertMessage("Your account has been permanently deleted. ✨");
              return;
            } else {
              await FirebaseAuthentication.signOut();
              setUser(null);
              setAlertMessage(`Your account deletion is in progress.`);
              return;
            }
          }

          // AUTHENTICATION LOGIC: Purely based on Firestore premium field
          // ADMIN OVERRIDE: Prioritize master admin email
          if (result.user.email === MASTER_ADMIN_EMAIL || isPremiumUser) {
            setIsPremium(true);
            localStorage.setItem('isPremium', 'true');
          } else {
            setIsPremium(false);
            localStorage.setItem('isPremium', 'false');
          }

          // Enforce email verification for non-admins using email
          const isMasterAdmin = result.user.email === MASTER_ADMIN_EMAIL;
          if (result.user.email && !result.user.emailVerified && !isMasterAdmin) {
            setUser(null);
          }
        }
        
        // Hide Splash Screen once initial check is done
        if (Capacitor.isNativePlatform()) {
          SplashScreen.hide().catch(() => {});
        }
      } catch (err) {
        console.error('Failed to get current user/role', err);
        if (Capacitor.isNativePlatform()) {
          SplashScreen.hide().catch(() => {});
        }
      } finally {
        setAuthLoading(false);
      }
    };

    checkUser();

    const listener = FirebaseAuthentication.addListener('authStateChange', async (result) => {
      setUser(result.user);
      if (result.user) {
        setAuthLoading(true);
        try {
          const userDoc = await FirebaseFirestore.getDocument({ reference: 'users/' + result.user.uid });
          const userData = userDoc.snapshot?.data as any;
          const isPremiumUser = userData?.premium === true;

          if (isPremiumUser) {
            setIsPremium(true);
            localStorage.setItem('isPremium', 'true');
          } else {
            setIsPremium(false);
            localStorage.setItem('isPremium', 'false');
          }
        } catch (err) {
          console.error('Auth state change error:', err);
        } finally {
          setAuthLoading(false);
        }
      } else {
        setIsPremium(false);
        localStorage.setItem('isPremium', 'false');
        setAuthLoading(false);
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  const handleAdminAddWord = async () => {
    if (isBulkMode) {
      if (!bulkInput.trim()) return;
      setIsAiLoading(true);
      try {
        const lines = bulkInput.split('\n').filter(line => line.trim());
        let successCount = 0;

        for (const line of lines) {
          // Format expected: Word: Meaning: Example
          // Or just Word: Meaning
          const parts = line.split(':').map(p => p.trim());
          if (parts.length < 2) continue;

          const word = parts[0].toLowerCase();
          const meaning = parts[1];
          const example = parts[2] || 'Example context not provided.';

          await FirebaseFirestore.setDocument({
            reference: 'shared_words/' + word,
            data: {
              word,
              meaning,
              example,
              category: newWordData.category,
              createdAt: Date.now()
            }
          });
          successCount++;
        }

        setAlertMessage(`Successfully added ${successCount} words! 🚀`);
        setAdminAddModalOpen(false);
        setBulkInput('');
        setIsBulkMode(false);
        localStorage.removeItem('cached_shared_words_ts');
        fetchAiWords(true);
      } catch (err) {
        setAlertMessage("Bulk upload failed partially.");
      } finally {
        setIsAiLoading(false);
      }
      return;
    }

    if (!newWordData.word || !newWordData.meaning) return;
    setIsAiLoading(true);
    try {
      await FirebaseFirestore.setDocument({
        reference: 'shared_words/' + newWordData.word.toLowerCase(),
        data: {
          word: newWordData.word.toLowerCase(),
          meaning: newWordData.meaning,
          example: newWordData.example || 'Example context not provided.',
          category: newWordData.category,
          createdAt: Date.now()
        }
      });
      setAlertMessage("Word added to Global Dictionary! ✨");
      setAdminAddModalOpen(false);
      setNewWordData({ word: '', meaning: '', example: '', category: 'All' });
      // Clear cache to force re-fetch
      localStorage.removeItem('cached_shared_words_ts');
      localStorage.removeItem('cached_ai_words_ts');
      fetchAiWords(true);
    } catch (err) {
      setAlertMessage("Failed to add word.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { snapshots } = await FirebaseFirestore.getCollection({
        reference: 'users',
        // In a real app we would use compound queries, but for now we'll fetch and sort top users
      });
      if (snapshots) {
        const board = snapshots
          .map(s => s.data as any)
          .sort((a, b) => (b.xp || 0) - (a.xp || 0))
          .slice(0, 10);
        setLeaderboard(board);
      }
    } catch (err) {
      console.error('Leaderboard error:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch Shared Words from Firestore
  useEffect(() => {
    const fetchSharedWords = async () => {
      try {
        const cachedData = localStorage.getItem('cached_shared_words');
        const cacheTimestamp = localStorage.getItem('cached_shared_words_ts');
        const now = Date.now();
        const twelveHours = 12 * 60 * 60 * 1000;

        if (cachedData && cacheTimestamp && (now - parseInt(cacheTimestamp)) < twelveHours) {
          setSharedWords(JSON.parse(cachedData));
          return;
        }

        const { snapshots } = await FirebaseFirestore.getCollection({ reference: 'shared_words' });
        if (snapshots) {
          const words = snapshots.map(s => s.data as { word: string, meaning: string, example: string });
          setSharedWords(words);
          localStorage.setItem('cached_shared_words', JSON.stringify(words));
          localStorage.setItem('cached_shared_words_ts', now.toString());
        }
      } catch (err) {
        console.error('Failed to fetch shared words:', err);
      }
    };
    fetchSharedWords();
  }, [user]); // Re-fetch only on user login/change



  const handleSignOut = async () => {
    const { value } = await Dialog.confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      okButtonTitle: 'Sign Out',
      cancelButtonTitle: 'Cancel',
    });

    if (value) {
      try {
        await FirebaseAuthentication.signOut();
      } catch (err) {
        console.error('Sign out error', err);
      }
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteModalOpen(true);
    setDeleteInput('');
  };

  const confirmDeleteAccount = async () => {
    if (deleteInput !== 'yes delete my account') {
      setAlertMessage('Please type the exact phrase to confirm deletion.');
      return;
    }

    try {
      setDeleteModalOpen(false);
      // Instead of immediate deletion, mark it as pending
      if (user?.uid) {
        await FirebaseFirestore.setDocument({
          reference: 'users/' + user.uid,
          data: {
            deletionRequestedAt: Date.now(),
            status: 'pending_deletion'
          },
          merge: true
        });
      }

      // Sign out and clear local data
      await FirebaseAuthentication.signOut();
      localStorage.clear();
      setUser(null);
      setAlertMessage("Your account deletion request has been submitted. It will be permanently deleted after 24 hours. Sign-in is now disabled for this account. ✨");
    } catch (err: any) {
      console.error('Delete account error', err);
      if (err.message?.includes('recent-login')) {
        setAlertMessage('For security, please sign out and sign in again before deleting your account.');
      } else {
        setAlertMessage('Could not delete account. Please try again or contact support at <sandeepkumarspj290@gmail.com>.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Exit Confirmation & Back Button Logic
  useEffect(() => {
    const setupBackButton = async () => {
      const listener = await CapApp.addListener('backButton', async () => {
        if (subscriptionModalOpen) {
          setSubscriptionModalOpen(false);
        } else if (dailyWordsModalOpen) {
          setDailyWordsModalOpen(false);
        } else if (testState === 'testing') {
          const { value } = await Dialog.confirm({
            title: 'Exit Test',
            message: 'Are you sure you want to stop this test?',
            okButtonTitle: 'Exit',
            cancelButtonTitle: 'Stay'
          });
          if (value) setTestState('start');
        } else if (activeTab !== 'learn') {
          setActiveTab('learn');
        } else {
          const { value } = await Dialog.confirm({
            title: 'Exit LexiQuest',
            message: 'Are you sure you want to exit?',
            okButtonTitle: 'Exit',
            cancelButtonTitle: 'Cancel'
          });
          if (value) {
            CapApp.exitApp();
          }
        }
      });
      return listener;
    };

    const listenerPromise = setupBackButton();

    return () => {
      listenerPromise.then(l => l.remove());
    };
  }, [subscriptionModalOpen, dailyWordsModalOpen, testState, activeTab]);


  useEffect(() => {
    if (lastPracticeDate) {
      const today = new Date().toDateString();
      if (today !== lastPracticeDate) {
        const lastDate = new Date(lastPracticeDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        // If last practice was NOT today and NOT yesterday, streak is broken
        if (lastPracticeDate !== yesterdayStr) {
          setStreak(0);
          localStorage.setItem('streak', '0');
        }
      }
    }
  }, [lastPracticeDate]);

  const addXp = (amount: number) => {
    setXp(prev => {
      const newXp = prev + amount;
      localStorage.setItem('xp', newXp.toString());

      // Track daily progress
      const currentHistory = [...xpHistory];
      currentHistory[6] += amount;
      setXpHistory(currentHistory);
      localStorage.setItem('xpHistory', JSON.stringify(currentHistory));

      // Level logic: level 1 is 0-100, level 2 is 100-300, level 3 is 300-600 (quadratic)
      const nextLevelThreshold = level * 100 * level;
      if (newXp >= nextLevelThreshold) {
        setLevel(l => {
          const newLevel = l + 1;
          localStorage.setItem('level', newLevel.toString());
          setShowLevelUp(true);
          // Refill streak shields on level up (Premium Perk)
          if (isPremium) {
            setStreakShields(prev => Math.min(prev + 1, 3));
          }
          return newLevel;
        });
      }
      return newXp;
    });

    // Sync XP to Firestore for Leaderboard
    if (user?.uid) {
      FirebaseFirestore.setDocument({
        reference: 'users/' + user.uid,
        data: { xp: xp + amount, level: level, name: displayName || user.displayName || 'Explorer' },
        merge: true
      });
    }
  };

  const updateMission = (id: string, amount: number = 1) => {
    setMissions(prev => {
      const newMissions = prev.map(m => {
        if (m.id === id && !m.completed) {
          const newCurrent = m.current + amount;
          const completed = newCurrent >= m.goal;
          if (completed) {
            addXp(m.reward);
            setAlertMessage(`Mission Complete: ${m.title}! +${m.reward} XP`);
          }
          return { ...m, current: newCurrent, completed };
        }
        return m;
      });
      localStorage.setItem('dailyMissions', JSON.stringify(newMissions));
      return newMissions;
    });
  };

  const checkBadges = () => {
    setBadges(prev => {
      let changed = false;
      const newBadges = prev.map(b => {
        if (b.earned) return b;
        let earned = false;
        if (b.id === 'streak-7' && streak >= 7) earned = true;
        if (b.id === 'words-50' && totalTestsTaken >= 5) earned = true; // Simulating word master
        if (b.id === 'level-5' && level >= 5) earned = true;

        if (earned) {
          changed = true;
          setAlertMessage(`Achievement Unlocked: ${b.title}! ${b.icon}`);
        }
        return { ...b, earned };
      });
      if (changed) localStorage.setItem('badges', JSON.stringify(newBadges));
      return changed ? newBadges : prev;
    });
  };

  useEffect(() => {
    checkBadges();
  }, [streak, level, totalTestsTaken]);

  useEffect(() => {
    const today = new Date().toDateString();
    if (lastDailyWordDate !== today) {
      // Pick 5 random unique words
      const shuffled = [...LEARN_WORDS].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 5);
      setDailyWords(selected);
      setLastDailyWordDate(today);
      setDailyWordsLearned(0);
      setCurrentDailyIndex(0);
      localStorage.setItem('dailyWords', JSON.stringify(selected));
      localStorage.setItem('lastDailyWordDate', today);
      localStorage.setItem('dailyWordsLearned', '0');
    } else {
      if (dailyWords.length === 0) {
        const shuffled = [...LEARN_WORDS].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);
        setDailyWords(selected);
        localStorage.setItem('dailyWords', JSON.stringify(selected));
      }
    }
  }, [lastDailyWordDate]);

  const recordPractice = () => {
    const today = new Date().toDateString();
    if (lastPracticeDate !== today) {
      let newStreak = 1; // Default to 1 for the first time or if streak is broken

      if (lastPracticeDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastPracticeDate === yesterdayStr) {
          // If last practice was exactly yesterday, increment the streak
          newStreak = streak + 1;
        }
      }

      setStreak(newStreak);
      setLastPracticeDate(today);
      localStorage.setItem('streak', newStreak.toString());
      localStorage.setItem('lastPracticeDate', today);
    }
  };


  // Load custom words from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('customDictionary');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Handle migration from old Set<string> format
          const migrated = parsed.map(item => {
            if (typeof item === 'string') {
              return { word: item.toLowerCase(), meaning: 'Meaning not provided', example: 'Example not provided' };
            }
            return item;
          });
          setCustomWords(migrated);
        }
      } catch (e) {
        console.error('Failed to parse custom dictionary', e);
      }
    }
  }, []);

  // Save custom words to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('customDictionary', JSON.stringify(customWords));
  }, [customWords]);

  useEffect(() => {
    localStorage.setItem('reminderTime', reminderTime);
    localStorage.setItem('reminderEnabled', String(reminderEnabled));
  }, [reminderTime, reminderEnabled]);

  useEffect(() => {
    const scheduleReminder = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        // Create Notification Channel for Android
        await LocalNotifications.createChannel({
          id: 'lexiquest-reminders',
          name: 'LexiQuest Reminders',
          description: 'Daily practice and streak reminders',
          importance: 5,
          visibility: 1,
          vibrate: true
        });

        // Cancel existing notifications
        await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 100 }, { id: 101 }] });

        const notifications: any[] = [];

        // 1. User Custom Reminder
        if (reminderEnabled) {
          const [hours, minutes] = reminderTime.split(':').map(Number);
          notifications.push({
            title: "LexiQuest Time! 📚",
            body: "Ready for your daily 5 words? Let's grow your vocabulary! ✨",
            id: 1,
            channelId: 'lexiquest-reminders',
            schedule: { on: { hour: hours, minute: minutes }, repeats: true, allowWhileIdle: true }
          });
        }

        // 2. Global Evening Reminder (7:30 PM)
        notifications.push({
          title: "Evening Brain Reset! 🧠",
          body: "It's 7:30 PM! Take a quick 2-minute break to learn something new. ✨",
          id: 100,
          channelId: 'lexiquest-reminders',
          schedule: { on: { hour: 19, minute: 30 }, repeats: true, allowWhileIdle: true }
        });

        // 3. Streak Protection Reminder (6:30 PM)
        notifications.push({
          title: "Streak at Risk! 🔥",
          body: "Don't lose your progress! Practice now to keep your daily streak alive.",
          id: 101,
          channelId: 'lexiquest-reminders',
          schedule: { on: { hour: 18, minute: 30 }, repeats: true, allowWhileIdle: true }
        });

        await LocalNotifications.schedule({ notifications });
      } catch (err) {
        console.error('Failed to schedule reminders:', err);
      }
    };

    scheduleReminder();
  }, [reminderEnabled, reminderTime]);

  const requestAndEnableReminder = async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display === 'granted') {
        setReminderEnabled(true);
        localStorage.setItem('reminderEnabled', 'true');
        return true;
      } else {
        setAlertMessage('Notification permission denied. Cannot enable reminders.');
        return false;
      }
    } else {
      if (!('Notification' in window)) {
        setAlertMessage('This browser does not support desktop notifications.');
        return false;
      }
      if (Notification.permission === 'granted') {
        setReminderEnabled(true);
        localStorage.setItem('reminderEnabled', 'true');
        return true;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setReminderEnabled(true);
          localStorage.setItem('reminderEnabled', 'true');
          return true;
        } else {
          setAlertMessage('Notification permission denied. Cannot enable reminders.');
          return false;
        }
      } else {
        setAlertMessage('Notification permission is blocked. Please enable it in your browser/device settings.');
        return false;
      }
    }
  };

  const toggleReminder = async () => {
    if (!reminderEnabled) {
      await requestAndEnableReminder();
    } else {
      setReminderEnabled(false);
      localStorage.setItem('reminderEnabled', 'false');
    }
  };

  const handleSaveReminder = async () => {
    // Persist the draft time
    setReminderTime(draftReminderTime);
    localStorage.setItem('reminderTime', draftReminderTime);

    // First-time setup: auto-enable daily reminder
    if (!reminderEverSet) {
      const enabled = await requestAndEnableReminder();
      if (enabled) {
        setReminderEverSet(true);
        localStorage.setItem('reminderEverSet', 'true');
      }
    }
    setReminderPopoverOpen(false);
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        reminderPopoverRef.current &&
        !reminderPopoverRef.current.contains(e.target as Node) &&
        reminderBtnRef.current &&
        !reminderBtnRef.current.contains(e.target as Node)
      ) {
        setReminderPopoverOpen(false);
      }
    };
    if (reminderPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [reminderPopoverOpen]);

  useEffect(() => {
    const loadVoices = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const result = await TextToSpeech.getSupportedVoices();
          // Filter for Indian English voices (en-IN)
          const enInVoices = (result.voices || []).filter(v => v.lang.startsWith('en-IN'));
          const otherEnVoices = (result.voices || []).filter(v => v.lang.startsWith('en-') && !v.lang.startsWith('en-IN'));
          
          // Combine prioritizing en-IN
          const allEnVoices = [...enInVoices, ...otherEnVoices];
          setAvailableVoices(allEnVoices);

          setSelectedVoiceURI(prev => {
            if (prev) return prev;
            // Prefer Indian voices first
            const defaultVoice = 
              enInVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('aditi')) ||
              enInVoices.find(v => v.name.toLowerCase().includes('male')) ||
              enInVoices[0] ||
              otherEnVoices.find(v => v.name.toLowerCase().includes('google')) ||
              otherEnVoices[0];
            return defaultVoice ? defaultVoice.voiceURI : '';
          });
        } catch (err) {
          console.error('Failed to get native voices:', err);
        }
      } else {
        // Web browser logic
        if (!window.speechSynthesis) return;
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return;

        const enInVoices = voices.filter(v => v.lang.startsWith('en-IN'));
        const otherEnVoices = voices.filter(v => v.lang.startsWith('en-') && !v.lang.startsWith('en-IN'));
        const allEnVoices = [...enInVoices, ...otherEnVoices];
        setAvailableVoices(allEnVoices);

        setSelectedVoiceURI(prev => {
          if (prev) return prev;
          const defaultVoice = 
            enInVoices.find(v => v.name.includes('Google') || v.name.includes('India')) ||
            enInVoices[0] ||
            otherEnVoices.find(v => v.name.includes('Google')) ||
            otherEnVoices[0];
          return defaultVoice ? defaultVoice.voiceURI : prev;
        });
      }
    };

    loadVoices();
    if (!Capacitor.isNativePlatform() && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);







  const confirmAddWord = () => {
    setCustomWords(prev => [...prev, ...wordsToConfirm]);
    setConfirmModalOpen(false);
    setWordsToConfirm([]);
    setBulkWords(Array.from({ length: 10 }, () => ({ word: '', meaning: '', example: '' })));
    setAlertMessage(`Successfully added words.`);
  };



  const removeCustomWord = (word: string) => {
    setCustomWords(prev => prev.filter(w => w.word !== word));
  };

  const handleShareApp = async () => {
    const shareData = {
      title: 'LexiQuest - Vocabulary Builder',
      text: 'Improve your English vocabulary and spelling with LexiQuest! Try it out.',
      url: 'https://play.google.com/store/apps/details?id=com.lexiquest.app', // Placeholder URL
      dialogTitle: 'Share LexiQuest',
    };

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url,
          dialogTitle: shareData.dialogTitle,
        });
      } catch (error) {
        console.log('Native share failed:', error);
      }
    } else if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Web share failed:', error);
      }
    } else {
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        setAlertMessage('Link copied to clipboard! Share it with your friends.');
      } catch {
        setAlertMessage('Sharing is not supported on this device.');
      }
    }
  };

  const handleExportDictionary = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customWords));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "lexiquest_dictionary.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportDictionary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData)) {
          // Validate structure
          const validWords = importedData.filter(item =>
            item && typeof item.word === 'string' &&
            typeof item.meaning === 'string' &&
            typeof item.example === 'string'
          );

          if (validWords.length > 0) {
            setCustomWords(prev => {
              const newWords = [...prev];
              validWords.forEach(vw => {
                if (!newWords.some(w => w.word === vw.word)) {
                  newWords.push(vw);
                }
              });
              return newWords;
            });
            setAlertMessage(`Successfully imported ${validWords.length} words.`);
          } else {
            setAlertMessage("No valid words found in the file.");
          }
        } else {
          setAlertMessage("Invalid file format. Expected an array of words.");
        }
      } catch (error) {
        setAlertMessage("Error parsing the file. Please ensure it's a valid JSON.");
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  // Test Functions
  const generateFakeWords = (word: string) => {
    const fakes = new Set<string>();
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    let attempts = 0;
    while (fakes.size < 3 && attempts < 50) {
      attempts++;
      let fake = word;
      const type = Math.floor(Math.random() * 4);
      const idx = Math.floor(Math.random() * word.length);
      if (type === 0 && word.length > 2) { // swap
        const idx2 = idx < word.length - 1 ? idx + 1 : idx - 1;
        if (idx >= 0 && idx2 >= 0 && idx < word.length && idx2 < word.length) {
          const arr = fake.split('');
          const temp = arr[idx];
          arr[idx] = arr[idx2];
          arr[idx2] = temp;
          fake = arr.join('');
        }
      } else if (type === 1) { // double
        fake = fake.slice(0, idx) + fake[idx] + fake.slice(idx);
      } else if (type === 2 && word.length > 3) { // remove
        fake = fake.slice(0, idx) + fake.slice(idx + 1);
      } else { // replace vowel
        const vIdx = word.split('').findIndex(c => vowels.includes(c));
        if (vIdx !== -1) {
          const newVowel = vowels[Math.floor(Math.random() * vowels.length)];
          fake = fake.slice(0, vIdx) + newVowel + fake.slice(vIdx + 1);
        } else {
          fake = fake + (Math.random() > 0.5 ? 's' : 'es');
        }
      }
      if (fake !== word && fake.length > 0) fakes.add(fake);
    }

    const fakeArr = Array.from(fakes);
    while (fakeArr.length < 3) {
      fakeArr.push(word + fakeArr.length);
    }
    return fakeArr.slice(0, 3);
  };

  const startTest = (mode: 'listen-mcq' | 'listen-type' | 'visual-mcq' | 'meaning-mcq') => {
    setTestMode(mode);

    // Combine all sources: Default, Custom (Local), and Shared (Global)
    const allSources = [...LEARN_WORDS, ...customWords, ...sharedWords];

    // Ensure uniqueness by word (case-insensitive)
    const uniqueMap = new Map();
    allSources.forEach(item => {
      const key = item.word.toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    const uniqueWordsList = Array.from(uniqueMap.values());
    let filteredWords = uniqueWordsList;

    if (testDifficulty === 'easy') {
      filteredWords = uniqueWordsList.filter(w => w.word.length <= 4);
      if (filteredWords.length < 10) filteredWords = uniqueWordsList.filter(w => w.word.length <= 5);
    } else if (testDifficulty === 'medium') {
      filteredWords = uniqueWordsList.filter(w => w.word.length === 5 || w.word.length === 6);
    } else if (testDifficulty === 'hard') {
      filteredWords = uniqueWordsList.filter(w => w.word.length > 6);
    }

    if (filteredWords.length < 5) filteredWords = uniqueWordsList; // Fallback if too few words

    // Fully randomize the entire list every time
    const shuffled = filteredWords.sort(() => 0.5 - Math.random());

    // Select 10 words for this session
    const selected = shuffled.slice(0, 10).map(item => item.word);
    setTestWords(selected);

    const options = selected.map(word => {
      const fakes = generateFakeWords(word);
      return [...fakes, word].sort(() => 0.5 - Math.random());
    });
    setMcqOptions(options);

    setUserAnswers([]);
    setCurrentTestWordIndex(0);
    setTestState('testing');
    setTypedAnswer('');
    setFeedbackState('none');
    if (mode === 'listen-mcq' || mode === 'listen-type') {
      playWord(selected[0]);
    }
    startTimer();
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(15);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = () => {
    if (feedbackState !== 'none') return;
    if (soundEnabled) wrongSound.play().catch(() => {});
    setFeedbackState('timeout');
    const newAnswers = [...userAnswers, '']; // Blank for timeout
    setUserAnswers(newAnswers);
  };

  const playWord = async (word: string) => {
    if (!word) return;
    try {
      if (Capacitor.isNativePlatform()) {
        // Native Android / iOS — uses device TTS engine
        const voiceIndex = availableVoices.findIndex(v => v.voiceURI === selectedVoiceURI);
        await TextToSpeech.stop();
        await TextToSpeech.speak({
          text: word,
          lang: 'en-US',
          rate: speechRate,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
          voice: voiceIndex !== -1 ? voiceIndex : undefined
        });
      } else {
        // Web browser fallback
        if (!window.speechSynthesis) {
          console.warn('Speech synthesis not supported in this browser');
          return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = speechRate;
        if (selectedVoiceURI) {
          const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
          if (voice) utterance.voice = voice;
        }
        utterance.onerror = (event) => {
          console.error('Web speech synthesis error:', event);
        };
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  const handleAnswerSubmit = (answer: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const newAnswers = [...userAnswers, answer.toLowerCase()];
    setUserAnswers(newAnswers);

    const isCorrect = answer.toLowerCase() === testWords[currentTestWordIndex].toLowerCase();

    if (isCorrect) {
      if (soundEnabled) correctSound.play().catch(() => {});
      setFeedbackState('correct');
      addXp(10); // Reward for correct answer
      updateMission('correct-10', 1);
      setTimeout(() => {
        handleNextQuestion(currentTestWordIndex);
      }, 1000);
    } else {
      if (soundEnabled) wrongSound.play().catch(() => {});
      setFeedbackState('incorrect');
    }
  };

  useEffect(() => {
    if (testState === 'results' && userAnswers.length > 0 && testWords.length > 0) {
      const correctCount = userAnswers.filter((ans, i) => ans === testWords[i]?.toLowerCase()).length;
      const score = (correctCount / testWords.length) * 100;

      setTotalTestsTaken(prev => {
        const newTotal = prev + 1;
        localStorage.setItem('totalTestsTaken', newTotal.toString());

        setAverageScore(prevAvg => {
          const newAvg = ((prevAvg * prev) + score) / newTotal;
          localStorage.setItem('averageScore', newAvg.toString());
          return newAvg;
        });

        return newTotal;
      });

      addXp(50); // Reward for completing a test
      updateMission('test-2', 1);
    }
  }, [testState]);

  const handleNextQuestion = (index: number) => {
    setFeedbackState('none');
    setTypedAnswer('');

    if (index + 1 < testWords.length) {
      setCurrentTestWordIndex(index + 1);
      if (testMode !== 'visual-mcq' && testMode !== 'meaning-mcq') {
        playWord(testWords[index + 1]);
      }
      startTimer();
    } else {
      recordPractice();
      setTestState('results');
    }
  };

  const searchDictionary = async (queryOverride?: string) => {
    const query = (queryOverride ?? dictQuery).trim().toLowerCase();
    if (!query) return;
    setDictLoading(true);
    setDictError('');
    setDictResult(null);
    setHindiTranslation(null);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
      if (!res.ok) {
        setDictError(`"${query}" not found. Please check your spelling and try again.`);
        return;
      }
      const data: DictEntry[] = await res.json();
      const entry = data[0];
      setDictResult(entry);
      updateMission('dict-3', 1);
      // find best audio
      const audioUrl = entry.phonetics.find(p => p.audio)?.audio || '';
      if (audioUrl) {
        const audio = new Audio(audioUrl.startsWith('//') ? 'https:' + audioUrl : audioUrl);
        setDictAudio(audio);
      } else {
        setDictAudio(null);
      }
    } catch {
      setDictError('Network error. Please check your internet connection.');
    } finally {
      setDictLoading(false);
    }
  };

  const handleTranslateDict = async () => {
    logAction("Starting dictionary translation");
    if (!hasPremium) {
      setSubscriptionModalOpen(true);
      return;
    }
    if (!dictResult || isTranslating) return;

    setIsTranslating(true);
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      const prompt = `Translate this English dictionary entry to Hindi in a simple, readable format. 
      Word: ${dictResult.word}
      Phonetic: ${dictResult.phonetic || ''}
      Meanings: ${JSON.stringify(dictResult.meanings.map(m => ({ pos: m.partOfSpeech, def: m.definitions[0].definition, ex: m.definitions[0].example })))}
      
      Respond in PLAIN TEXT only. Structure like this:
      Arth: [Hindi Meaning]
      Vyakarn: [Part of Speech]
      Vibaran: [Quick Hindi Description]
      Udaharan: [Hindi Example Sentence]`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: 'You are a translator.' }, { role: 'user', content: prompt }],
        })
      });

      const data = await response.json();
      setHindiTranslation(data.choices?.[0]?.message?.content);
    } catch (err) {
      setAlertMessage("Translation failed. Try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubscribe = async (packageType: 'monthly' | 'yearly') => {
    try {
      const offerings = await Purchases.getOfferings();
      // Dynamically use 'current' offering, fallback to specific ID, finally fallback to first entry
      const currentOffering = offerings.current || offerings.all['ofrng20a1dd3978'] || Object.values(offerings.all)[0];
      console.log("RevenueCat Selected Offering:", currentOffering);

      if (!currentOffering || !currentOffering.availablePackages || currentOffering.availablePackages.length === 0) {
        setAlertMessage("Configuration Error: No active offerings found in RevenueCat. Please check your dashboard.");
        return;
      }

      const pkg = currentOffering.availablePackages.find(p =>
        (packageType === 'monthly' && p.packageType === PACKAGE_TYPE.MONTHLY) ||
        (packageType === 'yearly' && p.packageType === PACKAGE_TYPE.ANNUAL)
      ) || currentOffering.availablePackages[0];

      if (pkg) {
        const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
        console.log("Purchase Success Customer Info:", customerInfo);
        if (customerInfo.entitlements.active['premium']) {
          setIsPremium(true);
          localStorage.setItem('isPremium', 'true');
          setSubscriptionModalOpen(false);
          setAlertMessage("Welcome to Premium! 🎉");

          // Sync with Firestore
          if (user?.uid) {
            await FirebaseFirestore.setDocument({
              reference: 'users/' + user.uid,
              data: { premium: true },
              merge: true
            });
          }
        }
      } else {
        setAlertMessage("Configuration Error: No active packages found in this offering.");
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("Purchase error details:", error);
        setAlertMessage(`Purchase Error: ${error.message || 'Check Play Console Setup'}. Code: ${error.code}`);
      }
    }
  };

  const toggleSaveWord = async (w: { word: string, meaning: string, example: string }) => {
    logAction(`Toggling save for: ${w.word}`);
    if (!user) {
      setAlertMessage("Please sign in to save words!");
      return;
    }
    if (!hasPremium) {
      setSubscriptionModalOpen(true);
      return;
    }

    const isSaved = savedWords.some(sw => sw.word === w.word);
    try {
      if (isSaved) {
        await FirebaseFirestore.deleteDocument({ reference: `users/${user.uid}/saved_words/${w.word}` });
        setSavedWords(prev => prev.filter(sw => sw.word !== w.word));
      } else {
        const data = { ...w, savedAt: Date.now() };
        await FirebaseFirestore.addDocument({ reference: `users/${user.uid}/saved_words`, data });
        // After add, we need to know the doc ID or just use word as ID
        // Simplified: use word as document ID for easy toggling
        await FirebaseFirestore.setDocument({ reference: `users/${user.uid}/saved_words/${w.word}`, data });
        setSavedWords(prev => [...prev, data]);
      }
    } catch (e) {
      console.error("Flashcard sync failed:", e);
    }
  };

  const startListening = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const available = await SpeechRecognition.available();
        if (!available.available) {
          setAlertMessage("Speech recognition is not available on this device.");
          return;
        }

        const permission = await SpeechRecognition.requestPermissions();
        if (permission.speechRecognition !== 'granted') {
          setAlertMessage("Microphone permission required for voice input.");
          return;
        }

        setIsListening(true);
        SpeechRecognition.start({
          language: "en-US",
          partialResults: true,
          popup: false,
        });

        SpeechRecognition.addListener('partialResults', (data: any) => {
          if (data.matches && data.matches.length > 0) {
            setAiInput(data.matches[0]);
          }
        });

        // Use a timer to stop instead of just onEnd to avoid getting stuck
        setTimeout(async () => {
          await SpeechRecognition.stop();
          setIsListening(false);
          SpeechRecognition.removeAllListeners();
        }, 5000);

      } catch (err) {
        console.error("Speech recognition error:", err);
        setIsListening(false);
      }
    } else {
      // Browser fallback
      const SpeechRecognitionWeb = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionWeb) {
        setAlertMessage("Voice search is not supported on this browser.");
        return;
      }
      const recognition = new SpeechRecognitionWeb();
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        setAiInput(event.results[0][0].transcript);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    }
  };

  const handleStartCall = async () => {
    logAction("Starting AI Call Overlay");
    if (!hasPremium) {
      setSubscriptionModalOpen(true);
      return;
    }
    
    // Safety check for permissions
    if (Capacitor.isNativePlatform()) {
      const permission = await SpeechRecognition.requestPermissions();
      if (permission.speechRecognition !== 'granted') {
        setAlertMessage("Please grant microphone permission to start a call with Lexi.");
        return;
      }
    }

    setIsOnCall(true);
    const greeting = "Hello friend! I'm Lexi. I'm listening, tell me anything or ask a question!";
    setAiChat(prev => [...prev, { role: 'model', content: greeting }]);
    playWord(greeting);
    
    // Begin listening loop after a short delay for the greeting
    setTimeout(() => {
      startListeningForCall();
    }, 4500);
  };

  const startListeningForCall = async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    setIsListening(true);
    try {
      await SpeechRecognition.start({
        language: "en-US",
        partialResults: false,
        popup: false,
      });

      SpeechRecognition.addListener('listeningState', (state: any) => {
        if (state.status === 'stopped') {
           setIsListening(false);
        }
      });

      // The listener for result will trigger the AI response
      const listener = await (SpeechRecognition as any).addListener('partialResults', async (data: any) => {
        if (data.matches && data.matches.length > 0) {
          const text = data.matches[0];
          await SpeechRecognition.stop();
          setIsListening(false);
          SpeechRecognition.removeAllListeners();
          
          // Send to AI
          handleAiSendMessage(text, true); 
        }
      });
    } catch (e) {
      console.error("Call listening error:", e);
      setIsListening(false);
    }
  };

  const handleRestore = async () => {
    if (!Capacitor.isNativePlatform()) {
      setAlertMessage("Restore is only available on the Android app.");
      return;
    }

    try {
      const info = await Purchases.restorePurchases();
      const customerInfo = (info as any).customerInfo || info;

      if (customerInfo?.entitlements?.active['premium']) {
        setIsPremium(true);
        localStorage.setItem('isPremium', 'true');
        setAlertMessage("Purchases restored! You are now a Premium member. ✨");
      } else {
        setAlertMessage("No active premium subscription found to restore.");
      }
    } catch (e) {
      console.error("Restore failed:", e);
      setAlertMessage("Failed to restore purchases. Please try again later.");
    }
  };

  const handleAiSendMessage = async (suggestion?: string, fromCall = false) => {
    const txt = suggestion || aiInput;
    logAction(`Sending AI Message: ${txt.slice(0, 20)}...`);
    if (!hasPremium) {
      setSubscriptionModalOpen(true);
      return;
    }
    const text = suggestion || aiInput;
    if (!text.trim() || isAiLoading) return;
    
    const newMessages = [...aiChat, { role: 'user' as const, content: text }];
    setAiChat(newMessages);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error('API Key missing');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: "You are 'Lexi', a warm friend. Keep reply VERY SHORT (1-2 sentences). Use a little Hinglish. End with a question." },
            ...aiChat.slice(-4).map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
            { role: 'user', content: text }
          ]
        })
      });

      const data = await response.json();
      const botResponse = data.choices?.[0]?.message?.content || "Sorry, I missed that.";
      setAiChat(prev => [...prev, { role: 'model', content: botResponse }]);
      
      if (fromCall && isOnCall) {
        playWord(botResponse);
        // Wait for Lexi to finish talking before listening again
        setTimeout(() => {
          if (isOnCall) startListeningForCall();
        }, 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
      setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth onSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-16">
      {/* Top Header */}
      <header className="fixed top-0 w-full bg-white border-b border-gray-200 z-40 px-4 py-2.5 flex justify-between items-center shadow-sm">
        <h1 className="text-lg font-bold flex items-center gap-2 text-indigo-600">
          <GraduationCap className="w-5 h-5" />
          LexiQuest
        </h1>
        <div className="flex items-center gap-2">
          {!hasPremium && (
            <button
              onClick={() => {
                logAction("Opening Subscription Modal");
                setSubscriptionModalOpen(true);
              }}
              className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-full border border-amber-200 uppercase tracking-tighter"
            >
              <Star className="w-3 h-3 fill-amber-500" /> PRO
            </button>
          )}
          <button
            onClick={() => {
              logAction("Navigating to Profile");
              setActiveTab('profile');
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${activeTab === 'profile' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}
          >
            <UserPlus className="w-4 h-4" />
          </button>
          {user?.email === MASTER_ADMIN_EMAIL && (
            <button
              onClick={() => setAdminAddModalOpen(true)}
              className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200"
              title="Admin: Add Word"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 z-50 flex justify-around items-center pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setActiveTab('learn')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${activeTab === 'learn'
            ? 'text-indigo-600'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <Book className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Learn</span>
        </button>
        <button
          onClick={() => setActiveTab('test')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${activeTab === 'test'
            ? 'text-indigo-600'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <CheckCircle className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Test</span>
        </button>
        <button
          onClick={() => {
            if (!hasPremium) {
              setSubscriptionModalOpen(true);
              return;
            }
            setActiveTab('ai-coach');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 relative transition-colors ${activeTab === 'ai-coach' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          <Bot className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Lexi</span>
          {!hasPremium && (
            <Sparkles className="w-2.5 h-2.5 text-amber-500 absolute top-2 right-1/2 translate-x-4 fill-amber-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('dictionary')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${activeTab === 'dictionary'
            ? 'text-indigo-600'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Dict</span>
          {!hasPremium && (
            <Lock className="w-2.5 h-2.5 absolute top-2 right-1/2 translate-x-4 text-indigo-300" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${activeTab === 'profile'
            ? 'text-indigo-600'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <UserPlus className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
        </button>

      </nav>

      {/* Main Content Area */}
      <main className="flex-1 pt-14 pb-safe overflow-y-auto flex flex-col">

        {activeTab === 'learn' && (
          <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                  <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Book className="w-8 h-8 text-indigo-600" />
                    Learn New Words
                  </h2>
                  <p className="text-gray-600">
                    Expand your vocabulary with these commonly misspelled words and your custom dictionary.
                  </p>
                  {!hasPremium && (
                    <button
                      onClick={() => setSubscriptionModalOpen(true)}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Star className="w-4 h-4 fill-white" />
                      Get Premium - Remove Ads
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-start sm:items-end gap-3 w-full sm:w-auto">
                  <div className="flex items-center justify-between sm:justify-start gap-3 bg-indigo-50 px-4 py-2.5 rounded-xl border border-indigo-100 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-semibold text-indigo-900">Avg Score: {averageScore.toFixed(1)}%</span>
                    </div>
                    <div className="w-px h-4 bg-indigo-200 mx-1"></div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-semibold text-indigo-900">Tests: {totalTestsTaken}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Box */}
              <div className="mb-8 relative group">
                <div className="relative">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${hasPremium ? 'text-gray-400' : 'text-indigo-300'}`} />
                  <input
                    type="text"
                    value={learnSearchQuery}
                    onChange={(e) => setLearnSearchQuery(e.target.value)}
                    placeholder={hasPremium ? "Search words or meanings..." : "Unlock Search with Premium"}
                    readOnly={!hasPremium}
                    className={`w-full pl-12 pr-4 py-4 bg-white border rounded-2xl shadow-sm outline-none transition-all ${hasPremium
                      ? 'border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                      : 'border-indigo-100 bg-indigo-50/30 cursor-pointer placeholder-indigo-300'
                      }`}
                    onClick={() => {
                      if (!hasPremium) {
                        setSubscriptionModalOpen(true);
                      }
                    }}
                  />
                  {!hasPremium && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Lock className="w-5 h-5 text-indigo-400" />
                    </div>
                  )}
                  {learnSearchQuery && (
                    <button
                      onClick={() => setLearnSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Category Filters */}
                <div className="mt-4 flex flex-nowrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        if (hasPremium || cat === 'All') {
                          setSelectedCategory(cat);
                          setLearnPage(0);
                        } else {
                          setSubscriptionModalOpen(true);
                        }
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-white text-gray-500 border border-gray-100 hover:border-indigo-200'
                        }`}
                    >
                      {(!hasPremium && cat !== 'All') && <Lock className="w-3 h-3" />}
                      {cat}
                    </button>
                  ))}
                </div>
                {!hasPremium && (
                  <p className="mt-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest ml-1">
                    ✨ Subscribe once to unlock search forever
                  </p>
                )}
              </div>

              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 cursor-grab active:cursor-grabbing"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  const threshold = 50;
                  if (info.offset.x < -threshold) { // Swipe left -> next page
                    if (learnPage < totalLearnPages - 1) {
                      setLearnPage(p => p + 1);
                    }
                  } else if (info.offset.x > threshold) { // Swipe right -> prev page
                    if (learnPage > 0) {
                      setLearnPage(p => p - 1);
                    }
                  }
                }}
              >
                {currentLearnWords.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col group hover:border-indigo-300 transition-colors cursor-pointer"
                    onClick={() => setExpandedWord(expandedWord === item.word ? null : item.word)}
                  >
                     <div className="flex justify-between items-center w-full">
                       <span className="font-medium text-lg">{item.word}</span>
                       <div className="flex items-center gap-1">
                         <button
                           onClick={(e) => { e.stopPropagation(); toggleSaveWord(item); }}
                           className={`p-2 rounded-lg transition-colors ${savedWords.some(sw => sw.word === item.word) ? 'text-indigo-600 bg-indigo-50' : 'text-gray-300 hover:text-indigo-400 hover:bg-slate-50'}`}
                           title={savedWords.some(sw => sw.word === item.word) ? "Remove from saved" : "Save word"}
                         >
                           <Save className={`w-4 h-4 ${savedWords.some(sw => sw.word === item.word) ? 'fill-indigo-600' : ''}`} />
                         </button>
                         <button
                           onClick={(e) => { e.stopPropagation(); playWord(item.word); }}
                           className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                           title="Listen to pronunciation"
                         >
                           <Volume2 className="w-5 h-5" />
                         </button>
                       </div>
                     </div>
                    {expandedWord === item.word && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
                        <p className="text-gray-700 mb-1"><span className="font-semibold text-indigo-600">Meaning:</span> {item.meaning}</p>
                        <p className="text-gray-600 italic"><span className="font-semibold text-indigo-600 not-italic">Example:</span> "{item.example}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 mt-12 mb-20 transition-all hover:border-indigo-100">
                <button
                  onClick={() => {
                    setLearnPage(p => Math.max(0, p - 1));
                    document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={learnPage === 0}
                  className="w-full sm:w-auto px-8 py-3 bg-indigo-50 text-indigo-600 rounded-2xl disabled:opacity-30 hover:bg-indigo-100 transition-all font-bold text-sm flex items-center justify-center gap-2 active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-gray-900 font-black text-lg">
                    {learnPage + 1} / {totalLearnPages}
                  </span>
                  <span className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                    Page Number
                  </span>
                </div>
                <button
                  onClick={() => {
                    setLearnPage(p => Math.min(totalLearnPages - 1, p + 1));
                    document.querySelector('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={learnPage === totalLearnPages - 1}
                  className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-2xl disabled:opacity-30 hover:bg-indigo-700 transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95"
                >
                  Next
                  <ChevronLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div className="flex-1 p-6 lg:p-10 overflow-y-auto flex flex-col items-center justify-center">
            <div className="max-w-2xl w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center">
              {testState === 'start' && (
                <>
                  <GraduationCap className="w-20 h-20 text-indigo-600 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold mb-4">Spelling Test</h2>
                  <p className="text-gray-600 mb-8 text-lg">
                    Choose a test mode to practice your spelling skills. You will be tested on 10 random words.
                  </p>

                  <div className="mb-8">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Select Difficulty</p>
                    <div className="flex bg-gray-100 p-1 rounded-2xl max-w-xs mx-auto">
                      {(['easy', 'medium', 'hard'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setTestDifficulty(d)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${testDifficulty === d
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 max-w-sm mx-auto">
                    <button
                      onClick={() => startTest('listen-mcq')}
                      className="px-6 py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-3"
                    >
                      <Volume2 className="w-6 h-6" />
                      Listen & Choose
                    </button>
                    <button
                      onClick={() => startTest('listen-type')}
                      className="px-6 py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-3"
                    >
                      <PenTool className="w-6 h-6" />
                      Listen & Type
                    </button>
                    <button
                      onClick={() => startTest('visual-mcq')}
                      className="px-6 py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-3"
                    >
                      <Book className="w-6 h-6" />
                      Visual MCQ
                    </button>

                    {/* Premium Locked Test Mode */}
                    <button
                      onClick={() => {
                        if (hasPremium) {
                          startTest('meaning-mcq');
                        } else {
                          setSubscriptionModalOpen(true);
                        }
                      }}
                      className={`px-6 py-4 border-2 font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 relative ${hasPremium
                        ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-white border-indigo-100 text-indigo-400 hover:border-indigo-200'
                        }`}
                    >
                      <GraduationCap className="w-6 h-6" />
                      Meaning & Context
                      {!hasPremium && (
                        <Lock className="w-4 h-4 absolute top-2 right-2 text-indigo-300" />
                      )}
                    </button>
                  </div>
                </>
              )}

              {testState === 'testing' && (
                <>
                  <div className="flex justify-between items-center mb-8 text-sm font-medium text-gray-500">
                    <button
                      onClick={async () => {
                        const { value } = await Dialog.confirm({
                          title: 'Exit Test?',
                          message: 'Are you sure you want to stop? Your progress will not be saved.',
                          okButtonTitle: 'Yes, Exit',
                          cancelButtonTitle: 'Stay'
                        });
                        
                        if (value) {
                          window.speechSynthesis?.cancel();
                          TextToSpeech.stop().catch(() => { });
                          setTestState('start');
                          setFeedbackState('none');
                          setTypedAnswer('');
                          setUserAnswers([]);
                        }
                      }}
                      className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Exit Test"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      <span className="text-xs font-medium">Exit</span>
                    </button>
                    <span>Word {currentTestWordIndex + 1} of {testWords.length}</span>
                    <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full capitalize">
                      {testMode.replace('-', ' ')}
                    </span>
                  </div>

                  {/* Timer Progress Bar */}
                  <div className="w-full h-2 bg-gray-100 rounded-full mb-8 overflow-hidden">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeLeft / 15) * 100}%` }}
                      transition={{ duration: 1, ease: 'linear' }}
                      className={`h-full ${timeLeft < 5 ? 'bg-red-500' : 'bg-indigo-600'}`}
                    />
                  </div>

                  {testMode !== 'visual-mcq' && (
                    <button
                      onClick={() => playWord(testWords[currentTestWordIndex])}
                      className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-8 hover:bg-indigo-100 transition-colors shadow-sm"
                      title="Play Word Again"
                    >
                      <Volume2 className="w-10 h-10" />
                    </button>
                  )}

                  {testMode === 'visual-mcq' && (
                    <h3 className="text-xl font-medium mb-8 text-gray-800">Select the correctly spelled word:</h3>
                  )}

                  {testMode === 'meaning-mcq' && (
                    <div className="mb-8 max-w-lg mx-auto bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm animate-in fade-in zoom-in duration-300">
                      {(() => {
                        const currentWord = testWords[currentTestWordIndex]?.toLowerCase();
                        const wordObj = allLearnWords.find(w => w.word.toLowerCase() === currentWord);
                        if (!wordObj) return <p className="text-gray-400 italic">Context loading...</p>;

                        // Replace the word in the example sentence with "____"
                        const displayExample = wordObj.example.replace(new RegExp(wordObj.word, 'gi'), '__________');

                        return (
                          <div className="space-y-4">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-1">Hindi Meaning</span>
                              <p className="text-3xl font-bold text-gray-900 mb-2">{wordObj.meaning}</p>
                            </div>
                            <div className="h-px bg-gray-100 w-1/4 mx-auto"></div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-1">Fill in the blank</span>
                              <p className="text-lg text-gray-700 italic text-center">"{displayExample}"</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {testMode === 'listen-type' ? (
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <input
                        type="text"
                        value={typedAnswer}
                        onChange={e => setTypedAnswer(e.target.value)}
                        className={`border-2 rounded-xl p-4 text-xl text-center w-full mb-4 outline-none transition-all ${feedbackState === 'correct' ? 'border-green-500 bg-green-50 text-green-900' :
                          (feedbackState === 'incorrect' || feedbackState === 'timeout') ? 'border-red-500 bg-red-50 text-red-900' :
                            'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-gray-900'
                          }`}
                        placeholder="Type the word here..."
                        autoFocus
                        disabled={feedbackState !== 'none'}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && typedAnswer.trim() && feedbackState === 'none') {
                            handleAnswerSubmit(typedAnswer.trim());
                          }
                        }}
                      />
                      {feedbackState === 'none' && (
                        <button
                          onClick={() => {
                            if (typedAnswer.trim()) {
                              handleAnswerSubmit(typedAnswer.trim());
                            }
                          }}
                          disabled={!typedAnswer.trim()}
                          className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          Submit Answer
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {mcqOptions[currentTestWordIndex]?.map((option, idx) => {
                        let btnClass = "w-full py-4 px-6 bg-white border-2 border-gray-200 text-gray-800 text-lg font-medium rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-center";
                        if (feedbackState !== 'none') {
                          const isCorrectOption = option.toLowerCase() === testWords[currentTestWordIndex].toLowerCase();
                          const isSelectedOption = option.toLowerCase() === userAnswers[currentTestWordIndex]?.toLowerCase();
                          if (isCorrectOption) {
                            btnClass = "w-full py-4 px-6 bg-green-50 border-2 border-green-500 text-green-800 text-lg font-medium rounded-xl transition-all text-center";
                          } else if (isSelectedOption) {
                            btnClass = "w-full py-4 px-6 bg-red-50 border-2 border-red-500 text-red-800 text-lg font-medium rounded-xl transition-all text-center";
                          } else {
                            btnClass = "w-full py-4 px-6 bg-gray-50 border-2 border-gray-200 text-gray-400 text-lg font-medium rounded-xl transition-all text-center opacity-50";
                          }
                        }
                        return (
                          <button
                            key={idx}
                            onClick={() => feedbackState === 'none' && handleAnswerSubmit(option)}
                            disabled={feedbackState !== 'none'}
                            className={`${btnClass} ${feedbackState === 'none' ? 'hover:scale-[1.02] active:scale-95' : ''}`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {(feedbackState === 'incorrect' || feedbackState === 'timeout') && (
                    <div className="mt-8 max-w-md mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 text-left animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center gap-2 text-red-600 mb-4">
                        <AlertCircle className="w-6 h-6" />
                        <h3 className="text-xl font-bold">{feedbackState === 'timeout' ? "Time's Up!" : "Incorrect"}</h3>
                      </div>
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Correct Word</p>
                        <p className="text-2xl font-bold text-gray-900">{testWords[currentTestWordIndex]}</p>
                      </div>
                      {(() => {
                        const currentWordObj = allLearnWords.find(w => w.word.toLowerCase() === testWords[currentTestWordIndex].toLowerCase());
                        if (currentWordObj) {
                          return (
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Meaning</p>
                                <p className="text-gray-800">{currentWordObj.meaning}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Example</p>
                                <p className="text-gray-800 italic">"{currentWordObj.example}"</p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <button
                        onClick={() => handleNextQuestion(currentTestWordIndex)}
                        className="mt-6 w-full py-3 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition-colors"
                      >
                        Next Word
                      </button>
                    </div>
                  )}

                  {feedbackState === 'correct' && (
                    <div className="mt-8 max-w-md mx-auto bg-green-50 border border-green-200 rounded-2xl p-4 text-center animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="w-6 h-6" />
                        <h3 className="text-xl font-bold">Correct!</h3>
                      </div>
                    </div>
                  )}
                </>
              )}

              {testState === 'results' && (
                <>
                  <h2 className="text-3xl font-bold mb-8">Test Results</h2>
                  <div className="space-y-4 mb-8 text-left">
                    {testWords.map((word, idx) => {
                      const isCorrect = word.toLowerCase() === userAnswers[idx];
                      return (
                        <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-center gap-3">
                            {isCorrect ? <CheckCircle className="text-green-600 w-6 h-6" /> : <X className="text-red-600 w-6 h-6" />}
                            <div>
                              <p className="font-medium text-gray-900">Your answer: <span className={isCorrect ? 'text-green-700' : 'text-red-700 line-through'}>{userAnswers[idx] || '(blank)'}</span></p>
                              {!isCorrect && <p className="text-sm text-green-700 font-medium mt-1">Correct: {word}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-2xl font-bold mb-8">
                    Score: {userAnswers.filter((ans, i) => ans === testWords[i].toLowerCase()).length} / {testWords.length}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => setTestState('start')}
                      className="px-8 py-4 bg-gray-900 text-white text-lg font-bold rounded-2xl hover:bg-gray-800 transition-colors shadow-lg"
                    >
                      Take Another Test
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="flex-1 p-6 lg:p-10 overflow-y-auto bg-slate-50">
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-row items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-xl overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user?.displayName?.[0] || displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (Capacitor.isNativePlatform()) {
                        try {
                          const image = await (window as any).Capacitor.Plugins.Camera.getPhoto({
                            quality: 90,
                            allowEditing: true,
                            resultType: 'dataUrl',
                            source: 'photos'
                          });
                          if (image.dataUrl) {
                            setProfileImage(image.dataUrl);
                            localStorage.setItem('profileImage', image.dataUrl);
                          }
                        } catch (e) { console.error(e); }
                      } else {
                        setAlertMessage("Image picking is only available on Android/iOS.");
                      }
                    }}
                    className="absolute -bottom-2 -right-2 p-2 bg-white rounded-full shadow-lg border border-slate-100 text-indigo-600 hover:scale-110 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  {isEditingProfile ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="text-lg sm:text-xl font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl outline-none border border-indigo-200 focus:border-indigo-600 transition-colors w-full"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          localStorage.setItem('userName', displayName);
                          setAlertMessage("Profile updated! ✨");
                        }}
                        className="bg-indigo-600 text-white text-[10px] font-black py-1.5 rounded-lg uppercase w-fit px-4 hover:bg-indigo-700 transition-colors"
                      > Save Changes </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 break-words line-clamp-2 leading-tight flex-1">{displayName}</h2>
                        <button onClick={() => setIsEditingProfile(true)} className="p-1 text-slate-400 hover:text-indigo-600 flex-shrink-0"><Sliders className="w-4 h-4" /></button>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-slate-500 font-bold text-xs flex items-center gap-2">
                          <Star className={`w-3.5 h-3.5 ${hasPremium ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                          {user?.email === MASTER_ADMIN_EMAIL ? 'Master Admin' : (hasPremium ? 'Premium Member' : 'Free Explorer')}
                        </p>
                        <button
                          onClick={async () => {
                            if (!user) return;
                            if (Capacitor.isNativePlatform()) {
                              handleRestore();
                            } else {
                              setAuthLoading(true);
                              try {
                                const userDoc = await FirebaseFirestore.getDocument({ reference: 'users/' + user.uid });
                                const userData = userDoc.snapshot?.data as any;
                                if (userData?.premium) {
                                  setIsPremium(true);
                                  localStorage.setItem('isPremium', 'true');
                                  setAlertMessage("Subscription verified! You are a Premium member. ✨");
                                } else {
                                  setIsPremium(false);
                                  localStorage.setItem('isPremium', 'false');
                                  setAlertMessage("No active subscription found. Please check your account.");
                                }
                              } catch (err) {
                                setAlertMessage("Failed to verify subscription. Please try again later.");
                              } finally {
                                setAuthLoading(false);
                              }
                            }
                          }}
                          className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                        >
                          Restore Purchases
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <GraduationCap className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Experience</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">Level {level}</p>
                  <div className="mt-2 w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(xp / (level * 100 * level)) * 100}%` }}
                      className="h-full bg-indigo-600"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-2">{xp} / {level * 100 * level} XP</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-orange-500 mb-2">
                    <Flame className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Streak</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{streak} Days</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 whitespace-nowrap">Don't break the chain!</p>
                </div>
              </div>

              {/* Progress Analytics Graph */}
              <div className="mb-8">
                <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-indigo-600" /> Weekly Learning
                </h3>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div className="flex items-end justify-between h-32 gap-2">
                    {xpHistory.map((val, i) => {
                      const maxVal = Math.max(...xpHistory, 100);
                      const height = (val / maxVal) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div
                            className="w-full bg-indigo-100 rounded-t-lg relative group transition-all"
                            style={{ height: `${height}%`, minHeight: '4px' }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {val} XP
                            </div>
                            <div className={`absolute inset-0 bg-indigo-600 rounded-t-lg transition-transform origin-bottom ${height > 0 ? 'scale-y-100' : 'scale-y-0'}`} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {user?.email === MASTER_ADMIN_EMAIL && (
                <div className="mb-8 p-6 bg-amber-50 rounded-[2rem] border border-amber-100 shadow-sm">
                  <div className="flex items-center gap-3 text-amber-600 mb-2">
                    <Star className="w-5 h-5 fill-amber-500" />
                    <span className="text-sm font-black uppercase tracking-widest">Admin Ad Bypass</span>
                  </div>
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    Ads are disabled for <b>{user.email}</b> to ensure a smooth administrative experience. 
                  </p>
                  
                  <div className="mt-4 p-3 bg-white/40 rounded-xl border border-amber-200/50">
                     <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">Current State Diagnostic</p>
                     <div className="grid grid-cols-2 gap-2 text-[9px] font-medium text-amber-900">
                        <div>User ID: {user?.uid?.slice(0,8)}...</div>
                        <div>Premium: {isPremium ? 'YES' : 'NO'}</div>
                        <div>Ads Init: {adInitialized ? 'YES' : 'NO'}</div>
                        <div>Ad Ready: {adReady ? 'YES' : 'NO'}</div>
                        <div className="col-span-2 text-indigo-700">Last Action: {lastAction}</div>
                     </div>
                  </div>
                  
                  {errorLog.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-amber-200">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">Interactions / Error Log</p>
                      <div className="bg-white/50 rounded-xl p-3 font-mono text-[10px] text-amber-900 max-h-32 overflow-y-auto">
                        {errorLog.map((log, i) => <div key={i} className="mb-1 border-b border-amber-100 pb-1 last:border-none">{log}</div>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Global Leaderboard Section */}
              <div className="mb-8">
                <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" /> Global Leaderboard
                </h3>
                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                  {leaderboard.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold">Loading Rankings...</div>
                  ) : (
                    leaderboard.map((u, i) => (
                      <div key={i} className={`flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-none ${user?.displayName === u.name ? 'bg-indigo-50/50' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'text-slate-400'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 truncate">{u.name || "Explorer"}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Level {u.level || 1}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-indigo-600">{u.xp?.toLocaleString()}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">XP Points</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Streak Shield Section */}
              <div className="mb-6 sm:mb-8 p-5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl sm:rounded-3xl text-white shadow-lg shadow-orange-100 flex items-center justify-between">
                <div>
                  <h4 className="font-black flex items-center gap-2">
                    <Star className="w-5 h-5 fill-white" /> Streak Shield
                  </h4>
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Protects your streak if you miss a day</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black">{streakShields} Available</p>
                  {!hasPremium ? (
                    <button
                      onClick={() => setSubscriptionModalOpen(true)}
                      className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full uppercase hover:bg-white/30 transition-colors"
                    >
                      Premium Only
                    </button>
                  ) : (
                    <p className="text-[10px] font-bold opacity-80">Refills Weekly</p>
                  )}
                </div>
              </div>

              {/* Daily Missions Section */}
              <div className="mb-6 sm:mb-8">
                <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-indigo-600" /> Daily Missions
                </h3>
                <div className="space-y-3">
                  {missions.map(m => (
                    <div key={m.id} className={`p-4 rounded-2xl border transition-all ${m.completed ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-slate-900">{m.title}</p>
                          <p className="text-xs text-slate-500">{m.desc}</p>
                        </div>
                        {m.completed && <CheckCircle className="w-5 h-5 text-green-500" />}
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${m.completed ? 'bg-green-500' : 'bg-indigo-600'}`}
                          style={{ width: `${Math.min(100, (m.current / m.goal) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[10px] font-bold text-slate-400">{m.current}/{m.goal}</span>
                        <span className="text-[10px] font-bold text-indigo-600">+{m.reward} XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Badges Section */}
              <div className="mb-10">
                <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Star className="w-6 h-6 text-amber-500" /> Achievement Badges
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {badges.map(b => (
                    <div key={b.id} className={`aspect-square rounded-3xl flex flex-col items-center justify-center p-2 text-center transition-all ${b.earned ? 'bg-amber-50 border border-amber-200 shadow-sm' : 'bg-slate-100 opacity-50 grayscale'}`}>
                      <span className="text-3xl mb-2">{b.icon}</span>
                      <span className="text-[10px] font-bold text-slate-700 leading-tight">{b.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Options */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden mb-10">
                <button
                  onClick={handleShareApp}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-800">Share App</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
                </button>
                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-blue-600">
                      {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                    </span>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </button>

                <button
                  onClick={() => setSpeechSettingsOpen(true)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-800">Speech Settings</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
                </button>
                <button
                  onClick={() => { setDraftReminderTime(reminderTime); setReminderPopoverOpen(o => !o); }}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                      <Bell className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-800">Daily Reminder</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">{reminderTime}</span>
                    <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
                  </div>
                </button>

                <div className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-slate-800 block">Sound Effects</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Feedback & Alerts</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newVal = !soundEnabled;
                      setSoundEnabled(newVal);
                      localStorage.setItem('soundEnabled', newVal.toString());
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${soundEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <button
                  onClick={() => window.open('https://github.com/Sandeepspj/LexiQuest', '_blank')}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-700">GitHub Repository</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-slate-300 rotate-180" />
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-red-50 transition-colors border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                      <LogIn className="w-5 h-5 rotate-180" />
                    </div>
                    <span className="font-bold text-red-600">Sign Out</span>
                  </div>
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-rose-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-rose-600">Delete Account</span>
                  </div>
                </button>
              </div>

              </div>

              {/* Saved Words Section */}
              <div className="mt-8 bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm mb-8">
                <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                  <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                    <Bookmark className="w-4 h-4" /> Saved Vocabulary
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full">{savedWords.length} Words</span>
                </div>
                <div className="p-4 grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                  {savedWords.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 italic text-xs">No words saved yet.</div>
                  ) : (
                    savedWords.sort((a,b) => b.savedAt - a.savedAt).map((sw, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900 capitalize">{sw.word}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{sw.meaning}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => playWord(sw.word)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Volume2 className="w-4 h-4"/></button>
                          <button onClick={() => toggleSaveWord(sw)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
          </div>
        )}

        {activeTab === 'dictionary' && (
          <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-1">
                  <BookOpen className="w-7 h-7 text-indigo-600" />
                  Dictionary
                </h2>
                <p className="text-gray-500 text-sm">Search any English word for its meaning, synonyms & antonyms.</p>
              </div>

              {!isPremium && user?.email !== MASTER_ADMIN_EMAIL ? (
                <div className="bg-indigo-50 rounded-[2.5rem] p-10 text-center border border-indigo-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-50" />
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg text-indigo-600">
                    <Lock className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">Premium Feature</h3>
                  <p className="text-slate-600 mb-8 max-w-xs mx-auto">Access the full English dictionary with synonyms, antonyms and pronunciations.</p>
                  <button
                    onClick={() => setSubscriptionModalOpen(true)}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    <Star className="w-5 h-5 fill-white" /> Unlock with Premium
                  </button>
                </div>
              ) : (
                <>
                  {/* Search Box */}
                  <div className="flex gap-2 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={dictQuery}
                        onChange={e => setDictQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') searchDictionary(); }}
                        placeholder="Type a word and press Enter..."
                        className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none bg-white text-gray-800 shadow-sm"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </div>
                    <button
                      onClick={() => searchDictionary()}
                      disabled={dictLoading || !dictQuery.trim()}
                      className="px-5 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      {dictLoading ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4A8 8 0 0012 4z" />
                        </svg>
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      Search
                    </button>
                  </div>
                </>
              )}

              {/* Error State */}
              {dictError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
                  <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                  <p className="text-red-700 font-medium">{dictError}</p>
                </div>
              )}

              {/* Result Card */}
              {dictResult && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Word Header */}
                  <div className="bg-indigo-600 p-5 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold capitalize">{dictResult.word}</h3>
                        {dictResult.phonetic && (
                          <p className="text-indigo-200 text-sm mt-0.5">{dictResult.phonetic}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {dictAudio && (
                          <button
                            onClick={() => dictAudio.play()}
                            className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                            title="Play pronunciation"
                          >
                            <Volume2 className="w-6 h-6" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Translate to Hindi Feature */}
                    <div className="mt-4 px-5">
                      <button
                        onClick={handleTranslateDict}
                        disabled={isTranslating}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold transition-all shadow-md ${isTranslating ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg active:scale-95'}`}
                      >
                        {isTranslating ? (
                          <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Languages className="w-5 h-5" />
                            {hindiTranslation ? 'Refresh Hindi Translation' : 'Translate to Hindi'}
                            {!isPremium && <Lock className="w-4 h-4 ml-1" />}
                          </>
                        )}
                      </button>

                      {hindiTranslation && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 bg-amber-50 border border-amber-200 p-5 rounded-2xl"
                        >
                          <div className="flex items-center gap-2 mb-2 text-amber-700 font-black uppercase text-[10px] tracking-widest">
                            <CheckCircle className="w-4 h-4" /> Hindi Translation
                          </div>
                          <p className="whitespace-pre-wrap font-sans text-base text-slate-800 leading-relaxed font-semibold">
                            {hindiTranslation}
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-6">
                    {dictResult.meanings.map((meaning, mIdx) => {
                      // collect all synonyms & antonyms from this meaning
                      const allSynonyms = Array.from(new Set([
                        ...meaning.synonyms,
                        ...meaning.definitions.flatMap(d => d.synonyms)
                      ])).slice(0, 8);
                      const allAntonyms = Array.from(new Set([
                        ...meaning.antonyms,
                        ...meaning.definitions.flatMap(d => d.antonyms)
                      ])).slice(0, 8);

                      return (
                        <div key={mIdx}>
                          {/* Part of speech badge */}
                          <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider mb-3">
                            {meaning.partOfSpeech}
                          </span>

                          {/* Definitions */}
                          <ol className="space-y-3 mb-4">
                            {meaning.definitions.slice(0, 3).map((def, dIdx) => (
                              <li key={dIdx} className="flex gap-3">
                                <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-600 text-xs font-bold rounded-full flex items-center justify-center mt-0.5">{dIdx + 1}</span>
                                <div>
                                  <p className="text-gray-800 text-sm leading-relaxed">{def.definition}</p>
                                  {def.example && (
                                    <p className="text-gray-500 text-xs italic mt-1 pl-2 border-l-2 border-gray-200">"{def.example}"</p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ol>

                          {/* Synonyms & Antonyms (Premium Feature) */}
                          {!isPremium ? (
                            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col items-center text-center">
                              <Lock className="w-5 h-5 text-indigo-400 mb-2" />
                              <p className="text-xs font-bold text-indigo-900 mb-1">Unlock Synonyms & Antonyms</p>
                              <p className="text-[10px] text-indigo-600 mb-3">Get full dictionary access and remove all ads.</p>
                              <button
                                onClick={() => setSubscriptionModalOpen(true)}
                                className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full hover:bg-indigo-700 transition-colors shadow-sm"
                              >
                                Upgrade to Premium
                              </button>
                            </div>
                          ) : (
                            <>
                              {/* Synonyms */}
                              {allSynonyms.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Star className="w-3 h-3 text-emerald-500" /> Synonyms
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {allSynonyms.map((syn, sIdx) => (
                                      <button
                                        key={sIdx}
                                        onClick={() => { setDictQuery(syn); searchDictionary(syn); }}
                                        className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                      >
                                        {syn}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Antonyms */}
                              {allAntonyms.length > 0 && (
                                <div>
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <X className="w-3 h-3 text-rose-500" /> Antonyms
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {allAntonyms.map((ant, aIdx) => (
                                      <button
                                        key={aIdx}
                                        onClick={() => { setDictQuery(ant); searchDictionary(ant); }}
                                        className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-medium rounded-full border border-rose-200 hover:bg-rose-100 transition-colors"
                                      >
                                        {ant}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {mIdx < dictResult.meanings.length - 1 && (
                            <hr className="mt-4 border-gray-100" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer note */}
                  <div className="px-5 pb-4">
                    <p className="text-[10px] text-gray-400 text-center">Powered by Free Dictionary API &bull; dictionaryapi.dev</p>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!dictResult && !dictError && !dictLoading && (
                <div className="text-center py-16 text-gray-400">
                  <BookOpen className="w-14 h-14 mx-auto text-gray-200 mb-4" />
                  <p className="font-medium text-gray-500">Search for any English word</p>
                  <p className="text-sm mt-1">Definitions, examples, synonyms &amp; antonyms</p>
                </div>
              )}
            </div>
          </div>
        )}

        {(activeTab === 'ai-coach' && (isPremium || user?.email === MASTER_ADMIN_EMAIL)) && (
          <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col h-[calc(100vh-120px)] bg-slate-50">
            {/* AI Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">Lexi - AI Coach</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active Now</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setAiChat([])}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Clear Chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth pb-20">
              {aiChat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-indigo-600">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mb-1">Interactive Learning</h4>
                  <p className="text-slate-500 text-xs max-w-[200px] font-medium leading-relaxed">
                    Chat with me to improve your English. Try these suggestions:
                  </p>
                  <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-[240px]">
                    {["How to improve vocabulary?", "Explain 'perseverance'", "Check my grammar: I goes home"].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleAiSendMessage(suggestion)}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all text-left shadow-sm"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                aiChat.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`relative max-w-[85%] p-5 rounded-2xl text-base leading-relaxed group ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white font-medium rounded-tr-none shadow-md'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-medium shadow-sm'
                      }`}>
                      {msg.content}
                      {msg.role === 'model' && (
                        <button
                          onClick={() => playWord(msg.content)}
                          className="absolute -right-8 bottom-0 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                          title="Speak response"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none flex gap-1 shadow-sm">
                    <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={aiChatEndRef} />
            </div>

            {/* AI Input */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-slate-200 z-10">
              <div className="max-w-2xl mx-auto">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleAiSendMessage(); }}
                  className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all"
                >
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Message your coach..."
                    className="flex-1 bg-transparent border-none outline-none px-3 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleStartCall}
                    className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                    title="Call Lexi"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={startListening}
                    className={`p-3 rounded-xl transition-all ${isListening ? 'bg-rose-100 text-rose-600 animate-pulse' : 'text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <button
                    type="submit"
                    disabled={!aiInput.trim() || isAiLoading}
                    className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-90 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}



        {/* Modals Overlay */}
        {(alertMessage || confirmModalOpen || clearConfirmModalOpen || reminderPopoverOpen || deleteModalOpen) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">

            {/* Reminder Popover */}
            {reminderPopoverOpen && (
              <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative z-[60] border border-orange-100 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black flex items-center gap-2 text-orange-600 uppercase tracking-tight">
                    <Clock className="w-6 h-6" />
                    Set Reminder
                  </h3>
                  <button
                    onClick={() => setReminderPopoverOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Select your study time</p>
                  <input
                    type="time"
                    value={draftReminderTime}
                    onChange={(e) => setDraftReminderTime(e.target.value)}
                    className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-orange-500 focus:ring-0 outline-none text-3xl font-black text-center text-slate-800"
                  />
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleSaveReminder}
                    className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-100 active:scale-95"
                  >
                    Save & Enable
                  </button>
                  <button
                    onClick={() => {
                      setReminderEnabled(false);
                      localStorage.setItem('reminderEnabled', 'false');
                      setReminderPopoverOpen(false);
                    }}
                    className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-colors active:scale-95"
                  >
                    Turn Off
                  </button>
                </div>
              </div>
            )}

            {/* PIN Modal Removed */}

            {/* Alert Modal */}
            {alertMessage && (
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <p className="text-gray-800 mb-6">{alertMessage}</p>
                <button
                  onClick={() => setAlertMessage('')}
                  className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Okay
                </button>
              </div>
            )}

            {/* Confirm Modal */}
            {confirmModalOpen && (
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl text-center">
                <AlertCircle className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Words Already Recognized</h3>
                <p className="text-gray-600 mb-6">
                  {wordsToConfirm.length} word(s) are already common words recognized by the spell checker. Do you still want to add them to your custom dictionary?
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => { setConfirmModalOpen(false); setWordsToConfirm([]); }}
                    className="flex-1 py-3 bg-gray-100 text-gray-800 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAddWord}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Add Anyway
                  </button>
                </div>
              </div>
            )}

            {/* Clear Confirm Modal */}
            {clearConfirmModalOpen && (
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Clear Custom Dictionary</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete all {customWords.length} words from your custom dictionary? This action cannot be undone.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setClearConfirmModalOpen(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-800 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setCustomWords([]);
                      setClearConfirmModalOpen(false);
                    }}
                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Delete Account Modal */}
            {deleteModalOpen && (
              <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative z-[60] border border-rose-100 animate-in fade-in zoom-in duration-300 text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-600 shadow-lg shadow-rose-100">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Account?</h3>
                <p className="text-slate-500 mb-6 font-medium">
                  This action is permanent and will delete all your progress, XP, and custom dictionary.
                </p>

                <div className="bg-rose-50 p-4 rounded-2xl mb-6 border border-rose-100">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">To confirm, type exactly:</p>
                  <p className="text-sm font-black text-slate-700 bg-white py-2 rounded-lg border border-rose-200 mb-3 select-none">yes delete my account</p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="Type here..."
                    className="w-full px-4 py-3 bg-white border-2 border-rose-100 rounded-xl focus:border-rose-500 focus:ring-0 outline-none text-center font-bold text-slate-800"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={confirmDeleteAccount}
                    disabled={deleteInput !== 'yes delete my account'}
                    className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100 disabled:opacity-50 disabled:shadow-none"
                  >
                    Delete Forever
                  </button>
                  <button
                    onClick={() => { setDeleteModalOpen(false); setDeleteInput(''); }}
                    className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Speech Settings Modal */}
        {speechSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                  <Sliders className="w-6 h-6 text-indigo-600" />
                  Speech Settings
                </h3>
                <button
                  onClick={() => setSpeechSettingsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Voice Selection (Indian Accents Available)</label>
                  <select
                    value={selectedVoiceURI}
                    onChange={(e) => setSelectedVoiceURI(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none bg-gray-50 text-gray-800"
                  >
                    {/* Priority Indian Voices */}
                    {availableVoices.filter(v => v.lang.startsWith('en-IN')).map((voice, i) => (
                      <option key={voice.voiceURI} value={voice.voiceURI} className="font-bold text-indigo-600">
                        {voice.name.includes('Female') || voice.name.includes('Aditi') ? `🇮🇳 Lexi (Girl ${i+1})` : `🇮🇳 Voice (Boy ${i+1})`}
                      </option>
                    ))}
                    {/* Other English Voices */}
                    {availableVoices.filter(v => !v.lang.startsWith('en-IN') && v.lang.startsWith('en')).map(voice => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-gray-700">Speech Rate (Speed)</label>
                    <span className="text-sm font-bold text-indigo-600">{speechRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Slower</span>
                    <span>Normal</span>
                    <span>Faster</span>
                  </div>
                </div>

                <button
                  onClick={() => playWord("Pronunciation test")}
                  className="w-full py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Volume2 className="w-5 h-5" />
                  Test Voice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Modal */}
        {subscriptionModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
            <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
              <div className="relative h-40 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 flex flex-col justify-end">
                <button
                  onClick={() => setSubscriptionModalOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-2xl font-black text-white">Upgrade to Premium</h3>
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Unlock your full potential</p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => handleSubscribe('monthly')}
                    className="p-5 rounded-3xl border-2 border-amber-400 bg-amber-50 hover:border-indigo-600 transition-all text-left group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase">Exclusive Offer</div>
                    <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Trial Plan</p>
                    <p className="text-2xl font-black text-slate-900">₹2 <span className="text-xs font-bold text-slate-400">/ 3 Days</span></p>
                    <p className="text-[10px] font-bold text-indigo-600 mt-2">Then ₹199/month (Auto-pay) →</p>
                  </button>
                  <button
                    onClick={() => handleSubscribe('yearly')}
                    className="p-5 rounded-3xl border-2 border-indigo-600 bg-indigo-50/50 text-left relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-bl-lg uppercase">Limited Deal</div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Global Access</p>
                    <p className="text-2xl font-black text-slate-900">₹599</p>
                    <p className="text-[10px] font-bold text-indigo-600 mt-2">Full 6 Months Access →</p>
                  </button>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mb-2 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-500" /> Subscription Details
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Start your 3-day trial for just <span className="font-bold text-indigo-600">₹2</span>. After 72 hours, you will be automatically charged <span className="font-bold text-indigo-600">₹199/month</span> unless cancelled in Google Play. Manage or cancel anytime.
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { icon: <CheckCircle className="w-4 h-4 text-green-500" />, text: "No Advertisements" },
                    { icon: <GraduationCap className="w-4 h-4 text-purple-500" />, text: "Adv. Meaning Tests" },
                    { icon: <BookOpen className="w-4 h-4 text-indigo-500" />, text: "Advanced Dictionary" },
                    { icon: <Plus className="w-4 h-4 text-orange-500" />, text: "Unlimited Custom Words" }
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      {f.icon} {f.text}
                    </div>
                  ))}
                </div>

                <p className="text-center text-[10px] text-gray-400 mt-4 px-4 uppercase tracking-widest font-bold">Secure Payment powered by Google Play</p>
              </div>
            </div>
          </div>
        )}

        {/* Level-Up Celebration Modal */}
        <AnimatePresence>
          {showLevelUp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl border border-purple-100"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-purple-200">
                  <Star className="w-12 h-12 text-white animate-pulse" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">LEVEL UP!</h2>
                <p className="text-slate-500 mb-6 font-medium">You've reached <span className="text-purple-600 font-bold">Level {level}</span>. Your vocabulary is growing fast!</p>
                <button
                  onClick={() => setShowLevelUp(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
                >
                  Keep Learning
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Daily 5 Floating Button */}
        {activeTab === 'learn' && dailyWords.length > 0 && (
          <motion.button
            initial={{ scale: 0, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setDailyWordsModalOpen(true)}
            className="fixed bottom-24 right-6 z-[60] w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Target className="w-7 h-7 relative z-10" />
            {dailyWordsLearned < 5 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-black">
                {5 - dailyWordsLearned}
              </span>
            )}
          </motion.button>
        )}

        {/* Daily 5 Modal */}
        <AnimatePresence>
          {dailyWordsModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDailyWordsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Target className="w-6 h-6 text-indigo-400" /> Daily Challenge
                  </h3>
                  <button
                    onClick={() => setDailyWordsModalOpen(false)}
                    className="p-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentDailyIndex}
                    initial={{ opacity: 0, scale: 0.95, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white border border-indigo-100 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center overflow-hidden relative"
                  >
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center opacity-50">
                      <BookOpen className="w-16 h-16 text-indigo-100" />
                    </div>

                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 mb-6 z-10">
                      <Clock className="w-8 h-8" />
                    </div>

                    <div className="z-10 mb-8 w-full">
                      <h4 className="text-4xl font-black text-slate-900 mb-2 capitalize tracking-tight">
                        {dailyWords[currentDailyIndex].word}
                      </h4>
                      <p className="text-lg text-slate-600 font-medium leading-relaxed italic">
                        "{dailyWords[currentDailyIndex].meaning}"
                      </p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 w-full mb-8 text-left z-10">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Usage Example
                      </p>
                      <p className="text-slate-700 font-medium italic">
                        {dailyWords[currentDailyIndex].example}
                      </p>
                    </div>

                    <div className="flex flex-col w-full gap-4 z-10">
                      <div className="flex gap-4">
                        <button
                          onClick={() => playWord(dailyWords[currentDailyIndex].word)}
                          className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                        >
                          <Volume2 className="w-5 h-5" /> Speak
                        </button>
                        <button
                          onClick={() => {
                            if (dailyWordsLearned < 5) {
                              const newLearned = dailyWordsLearned + 1;
                              setDailyWordsLearned(newLearned);
                              localStorage.setItem('dailyWordsLearned', newLearned.toString());
                              addXp(20);
                              if (newLearned === 5) {
                                addXp(100);
                                setAlertMessage("🏆 Challenge Complete! +100 XP Bonus!");
                              }
                            }
                          }}
                          disabled={dailyWordsLearned >= 5 || (currentDailyIndex < dailyWordsLearned)}
                          className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-300"
                        >
                          <CheckCircle className="w-5 h-5" /> {dailyWordsLearned > currentDailyIndex ? 'Mastered' : 'Master'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <button
                          onClick={() => setCurrentDailyIndex(prev => Math.max(0, prev - 1))}
                          disabled={currentDailyIndex === 0}
                          className="p-4 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                        >
                          <ChevronLeft className="w-8 h-8" />
                        </button>
                        <div className="flex gap-2">
                          {dailyWords.map((_, idx) => (
                            <div
                              key={idx}
                              className={`w-2 h-2 rounded-full transition-all ${idx === currentDailyIndex ? 'w-6 bg-indigo-600' : 'bg-slate-200'}`}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => setCurrentDailyIndex(prev => Math.min(dailyWords.length - 1, prev + 1))}
                          disabled={currentDailyIndex === dailyWords.length - 1}
                          className="p-4 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                        >
                          <ChevronLeft className="w-8 h-8 rotate-180" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {adminAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">{isBulkMode ? 'Bulk Upload Words' : 'Add Global Word'}</h3>
                  <button 
                    onClick={() => setIsBulkMode(!isBulkMode)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 mt-1 uppercase"
                  >
                    Switch to {isBulkMode ? 'Single Mode' : 'Bulk Mode'}
                  </button>
                </div>
                <button onClick={() => setAdminAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                {isBulkMode ? (
                  <>
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 mb-2">
                      <p className="text-[10px] text-amber-700 leading-tight">
                        Format: <b>Word: Meaning: Example</b> (one per line).<br/>
                        Example: <i>Apple: Seb: An apple a day.</i>
                      </p>
                    </div>
                    <textarea
                      placeholder="Paste your words here..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 h-64 font-mono text-xs"
                      value={bulkInput}
                      onChange={e => setBulkInput(e.target.value)}
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Word"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                      value={newWordData.word}
                      onChange={e => setNewWordData({ ...newWordData, word: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Meaning"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                      value={newWordData.meaning}
                      onChange={e => setNewWordData({ ...newWordData, meaning: e.target.value })}
                    />
                    <textarea
                      placeholder="Example Sentence"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 h-24"
                      value={newWordData.example}
                      onChange={e => setNewWordData({ ...newWordData, example: e.target.value })}
                    />
                  </>
                )}
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Category for these words</p>
                  <select
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                    value={newWordData.category}
                    onChange={e => setNewWordData({ ...newWordData, category: e.target.value })}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleAdminAddWord}
                  disabled={isAiLoading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                  {isAiLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>{isBulkMode ? <FileText className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {isBulkMode ? 'Bulk Save' : 'Save Word'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {isOnCall && (
            <CallOverlay 
              isOpen={isOnCall} 
              onClose={() => {
                setIsOnCall(false);
                SpeechRecognition.stop();
                SpeechRecognition.removeAllListeners();
                setIsListening(false);
              }}
              isListening={isListening}
              lastMessage={aiChat.filter(m => m.role === 'model').slice(-1)[0]?.content}
            />
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

const CallOverlay = ({ isOpen, onClose, isListening, lastMessage }: any) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 backdrop-blur-xl bg-opacity-95"
    >
      <div className="absolute top-10 left-0 right-0 text-center">
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Voice Call</p>
        <h2 className="text-2xl font-black text-white">Lexi AI</h2>
      </div>

      <div className="relative mb-12">
        {/* Animated Orbs */}
        <motion.div
          animate={{ scale: isListening ? [1, 1.2, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-48 h-48 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(79,70,229,0.4)]"
        >
          <div className="w-40 h-40 bg-slate-900/40 rounded-full backdrop-blur-md flex items-center justify-center">
            <motion.div
               animate={{ rotate: isListening ? 360 : 0 }}
               transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            >
              <Bot className="w-20 h-20 text-white" />
            </motion.div>
          </div>
        </motion.div>
        
        {isListening && (
           <motion.div 
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
             transition={{ repeat: Infinity, duration: 1.5 }}
             className="absolute inset-0 border-4 border-indigo-400 rounded-full"
           />
        )}
      </div>

      <div className="text-center max-w-xs mb-20 min-h-[80px]">
        {isListening ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  animate={{ height: [8, 20, 8] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                  className="w-1.5 bg-indigo-400 rounded-full"
                />
              ))}
            </div>
            <p className="text-indigo-300 font-bold text-sm tracking-widest uppercase">Listening...</p>
          </div>
        ) : (
          <p className="text-white/80 font-medium text-lg italic leading-relaxed">
            {lastMessage || "Lexi is thinking..."}
          </p>
        )}
      </div>

      <button
        onClick={onClose}
        className="w-20 h-20 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-rose-900/20 active:scale-95 transition-transform"
      >
        <div className="rotate-[135deg]">
          <Phone className="w-8 h-8 fill-white" />
        </div>
      </button>
    </motion.div>
  );
}
export default function SafeApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
