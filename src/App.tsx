// --- GLOBAL ERROR DIAGNOSTICS (Production-Safe) ---
if (typeof window !== 'undefined') {
  console.log("LexiQuest JS Bundle Executing...");
  window.onerror = (msg, url, line, col, error) => {
    console.error(`CRITICAL JS ERROR: ${msg} \nAt: ${url}:${line}:${col} \nObject: ${JSON.stringify(error)}`);
  };
}
// -------------------------------------

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { AdMob } from '@capacitor-community/admob';
import { App as CapApp } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';
import { Book, BookOpen, Search, Settings, Plus, Trash2, CheckCircle, AlertCircle, FileText, GraduationCap, PenTool, Lock, Unlock, Volume2, X, Sliders, Bell, Flame, Save, Download, Upload, Share2, Clock, ChevronLeft, Star, LogIn, UserPlus, Target, Sparkles, Send, Bot, MessageSquare, RefreshCw, Info, Languages, Mic, Moon, Sun, BarChart3, Trophy, Phone, Bookmark, PhoneOff, User, Sword, Zap } from 'lucide-react';
import { COMMON_WORDS } from './lib/dictionary';
import { LEARN_WORDS } from './lib/learnWords';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import Auth from './components/Auth';
import { motion, AnimatePresence } from 'motion/react';
import { Purchases, LOG_LEVEL, PACKAGE_TYPE } from '@revenuecat/purchases-capacitor';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network } from '@capacitor/network';
import { GRAMMAR_RULES } from './lib/grammarRules';

type Tab = 'learn' | 'test' | 'grammar' | 'dictionary' | 'ai-coach' | 'profile';

interface DictPhonetic { text?: string; audio?: string; }
interface DictDefinition { definition: string; example?: string; synonyms: string[]; antonyms: string[]; }
interface DictMeaning { partOfSpeech: string; definitions: DictDefinition[]; synonyms: string[]; antonyms: string[]; }
interface DictEntry { word: string; phonetic?: string; phonetics: DictPhonetic[]; meanings: DictMeaning[]; }



const MASTER_ADMIN_EMAIL = 'sandeepkumarspj290@gmail.com';

class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="p-10 text-center bg-white h-screen flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Oops! Something Crashed</h1>
          <p className="text-slate-500 mb-8 max-w-xs mx-auto text-sm">{(this.state as any).error?.message || 'Unknown Error'}</p>
          <button 
            onClick={() => {
              window.location.reload();
            }}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200"
          >
            Reset & Restart
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const Onboarding = ({ onComplete }: { onComplete: (data: { name: string, level: string }) => void }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');

  const levels = [
    { id: 'Beginner', label: 'Beginner', desc: 'I am just starting to learn English', icon: '🌱' },
    { id: 'Intermediate', label: 'Intermediate', desc: 'I can hold basic conversations', icon: '🌿' },
    { id: 'Advanced', label: 'Advanced', desc: 'I am fluent and want to master vocabulary', icon: '🌳' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center"
          >
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/20">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tight">Welcome!</h1>
            <p className="text-slate-400 mb-10 font-medium">Let's start by getting to know you. What should we call you?</p>
            
            <div className="relative mb-8">
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-6 py-5 bg-slate-900 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 transition-all text-xl font-bold placeholder:text-slate-700"
                autoFocus
              />
            </div>
            
            <button 
              disabled={!name.trim()}
              onClick={() => setStep(2)}
              className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-30"
            >
              Continue
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <h2 className="text-3xl font-black mb-2 text-center">Hello, {name}!</h2>
            <p className="text-slate-400 mb-10 text-center font-medium">What is your current English level?</p>
            
            <div className="space-y-4 mb-10">
              {levels.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className={`w-full p-5 rounded-2xl border transition-all text-left flex items-center gap-5 ${level === l.id ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-900/20' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                >
                  <span className="text-3xl">{l.icon}</span>
                  <div>
                    <h3 className="font-bold text-lg">{l.label}</h3>
                    <p className="text-xs opacity-60 font-medium">{l.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            
            <button 
              disabled={!level}
              onClick={() => onComplete({ name, level })}
              className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-30"
            >
              Start Learning
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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
  const [sharedWords, setSharedWords] = useState<{ word: string, meaning: string, example: string }[]>(() => safeParseJSON('cached_shared_words', []));


  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);



  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('userName') || 'Adventurer');
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('profileImage') || '');
  const [englishLevel, setEnglishLevel] = useState(() => localStorage.getItem('englishLevel') || '');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleOnboardingComplete = async (data: { name: string, level: string }) => {
    if (!user) return;
    
    setIsAiLoading(true);
    try {
      await FirebaseFirestore.setDocument({
        reference: 'users/' + user.uid,
        data: {
          displayName: data.name,
          englishLevel: data.level,
          onboardedAt: new Date().toISOString()
        },
        merge: true
      });
      
      setDisplayName(data.name);
      setEnglishLevel(data.level);
      localStorage.setItem('userName', data.name);
      localStorage.setItem('englishLevel', data.level);
      setShowOnboarding(false);
      setAlertMessage(`Welcome aboard, ${data.name}! ✨`);
    } catch (e) {
      console.error("Onboarding Save Error:", e);
      setAlertMessage("Failed to save profile. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleProfileImagePick = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await (window as any).Capacitor.Plugins.Camera.getPhoto({
          quality: 50,
          allowEditing: true,
          resultType: 'dataUrl',
          source: 'photos',
          width: 250,
          height: 250
        });
        if (image.dataUrl) {
          setProfileImage(image.dataUrl);
          localStorage.setItem('profileImage', image.dataUrl);
          if (user) {
            FirebaseFirestore.setDocument({
              reference: 'users/' + user.uid,
              data: { photoURL: image.dataUrl },
              merge: true
            }).catch(e => console.error("Failed to sync profile image:", e));
          }
        }
      } catch (e) { console.error(e); }
    } else {
      setAlertMessage("Image picking is only available on Android/iOS.");
    }
  };



  // Tour State
  const [tourStep, setTourStep] = useState(() => localStorage.getItem('hasSeenTour') ? 0 : 1);
  const nextTourStep = () => {
    if (tourStep === 3) {
      setTourStep(0);
      localStorage.setItem('hasSeenTour', 'true');
    } else {
      setTourStep(prev => prev + 1);
    }
  };

  // Arena State
  const [arenaState, setArenaState] = useState<'idle' | 'battling' | 'result'>('idle');
  const [showClassicTest, setShowClassicTest] = useState(false);
  const [arenaHp, setArenaHp] = useState(100);
  const [arenaWordObj, setArenaWordObj] = useState<{word: string, meaning: string} | null>(null);
  const [arenaInput, setArenaInput] = useState('');
  const [arenaLoading, setArenaLoading] = useState(false);
  const [arenaFeedback, setArenaFeedback] = useState<{damage: number, msg: string, crit: boolean} | null>(null);

  const startArenaBattle = () => {
     setArenaHp(100);
     setArenaFeedback(null);
     setArenaInput('');
     const w = LEARN_WORDS[Math.floor(Math.random() * LEARN_WORDS.length)];
     setArenaWordObj(w);
     setArenaState('battling');
  };

  // AI Coach State
  const [aiChat, setAiChat] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isOnCall, setIsOnCall] = useState(false);
  const aiChatEndRef = useRef<HTMLDivElement>(null);

  // Saved Words State
  const [savedWords, setSavedWords] = useState<{ word: string, meaning: string, example: string, savedAt: number }[]>([]);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');

  // AdMob State
  const [adInitialized, setAdInitialized] = useState(false);
  // App is fully free — all features unlocked for everyone
  const [isPremium, setIsPremium] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const localEmail = localStorage.getItem('userEmail');
      if (localEmail === MASTER_ADMIN_EMAIL) return true;
      return localStorage.getItem('isAdmin') === 'true';
    } catch (e) { return false; }
  });
  // Subscription modal disabled — app is free
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
  const timeLeftRef = useRef(15);
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
  const [currentDailyIndex, setCurrentDailyIndex] = useState(0);
  const [dailyWordsLearned, setDailyWordsLearned] = useState(() => parseInt(localStorage.getItem('dailyWordsLearned') || '0'));
  const [lastDailyWordDate, setLastDailyWordDate] = useState(() => localStorage.getItem('lastDailyWordDate') || '');
  const [dailyLearnWords, setDailyLearnWords] = useState<{ word: string, meaning: string, example: string }[]>(() => safeParseJSON('dailyLearnWords', []));
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

  // App is fully free — all premium features unlocked for everyone
  const hasPremium = true;
  
  // SRS (Spaced Repetition System) State
  const [srsData, setSrsData] = useState<Record<string, { level: number, nextReview: number }>>(() => safeParseJSON('srsData', {}));
  const [reviewMode, setReviewMode] = useState(false);

  // Learn State
  const [learnPage, setLearnPage] = useState(0);
  const wordsPerPage = 30;
  const [learnSearchQuery, setLearnSearchQuery] = useState('');
  const [aiWords, setAiWords] = useState<{ word: string, meaning: string, example: string, category: string }[]>(() => safeParseJSON('cached_ai_words', []));
  const [isOffline, setIsOffline] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Today's 100");
  const [aiAutoAddDate, setAiAutoAddDate] = useState(() => localStorage.getItem('aiAutoAddDate') || '');
  const [learnedRules, setLearnedRules] = useState<string[]>(() => safeParseJSON('learnedGrammarRules', []));
  const categories = ['All', "Today's 100", 'Review Needed', 'Daily Use', 'Academic', 'Work', 'Advanced', 'Idioms', 'Travel', 'Finance', 'Technology', 'Health', 'Science', 'Psychology', 'Business', 'Education', 'Personality', 'Social', 'Literature', 'History', 'Sports', 'Philosophy', 'Legal', 'Politics', 'Nature', 'Food', 'Arts', 'Medicine', 'Economics', 'Music', 'Fashion'];

  const allLearnWords = useMemo(() => {
    let combined = [...LEARN_WORDS, ...customWords, ...sharedWords, ...aiWords];

    // Deduplicate by word (case-insensitive)
    const seen = new Set<string>();
    combined = combined.filter(w => {
      if (!w || !w.word) return false;
      const lower = w.word.toLowerCase().trim();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

    if (selectedCategory === "Today's 100") {
      const dailyIdx = (new Date().getDate() * 100) % (LEARN_WORDS.length - 100);
      combined = dailyLearnWords.length > 0 ? dailyLearnWords : LEARN_WORDS.slice(dailyIdx, dailyIdx + 100);
    } else if (selectedCategory === 'Review Needed') {
      const now = Date.now();
      combined = combined.filter(w => {
        const data = srsData[(w.word || '').toLowerCase()];
        return data && data.nextReview <= now;
      });
    } else if (selectedCategory !== 'All') {
      combined = combined.filter(w => (w as any).category === selectedCategory);
    }

    if (learnSearchQuery.trim()) {
      combined = combined.filter(w =>
        (w.word || '').toLowerCase().includes((learnSearchQuery || '').toLowerCase()) ||
        (w.meaning && w.meaning.toLowerCase().includes((learnSearchQuery || '').toLowerCase()))
      );
    }

    return combined;
  }, [customWords, sharedWords, aiWords, learnSearchQuery, selectedCategory, dailyLearnWords, srsData]);

  const completeWordPool = useMemo(() => {
    let combined = [...LEARN_WORDS, ...customWords, ...sharedWords, ...aiWords];
    const seen = new Set<string>();
    return combined.filter(w => {
      if (!w || !w.word) return false;
      const lower = w.word.toLowerCase().trim();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }, [customWords, sharedWords, aiWords]);
  const totalLearnPages = Math.ceil(allLearnWords.length / wordsPerPage);
  const currentLearnWords = allLearnWords.slice(learnPage * wordsPerPage, (learnPage + 1) * wordsPerPage);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);

  // Grammar State
  const [selectedGrammarCategory, setSelectedGrammarCategory] = useState<string | null>(null);
  const [grammarSubTab, setGrammarSubTab] = useState<'categories' | 'mode' | 'learn' | 'test'>('categories');
  const [grammarTestState, setGrammarTestState] = useState<{
    questions: any[],
    currentIndex: number,
    score: number,
    showResults: boolean,
    userAnswers: string[]
  }>({ questions: [], currentIndex: 0, score: 0, showResults: false, userAnswers: [] });

  const startGrammarTest = (category: string) => {
    const categoryRules = GRAMMAR_RULES.filter(r => r.category === category);
    if (categoryRules.length === 0) return;

    // Generate questions from rules
    const questions = categoryRules.map(rule => {
      // Very basic question generation logic
      return {
        id: rule.id,
        ruleTitle: rule.title,
        question: `Based on the rule for "${rule.title}", which of these is correct?`,
        options: [rule.example, "Incorrect example 1", "Incorrect example 2"], // In a real app, these would be smarter
        correctAnswer: rule.example
      };
    });

    setGrammarTestState({
      questions: questions.sort(() => Math.random() - 0.5).slice(0, 5),
      currentIndex: 0,
      score: 0,
      showResults: false,
      userAnswers: []
    });
    setGrammarSubTab('test');
  };

  // Dictionary State
  const [dictQuery, setDictQuery] = useState('');
  const [dictResult, setDictResult] = useState<DictEntry | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictError, setDictError] = useState('');
  const [dictAudio, setDictAudio] = useState<HTMLAudioElement | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRefiningThesaurus, setIsRefiningThesaurus] = useState(false);
  const [hindiTranslation, setHindiTranslation] = useState<any>(null);
  const [smartThesaurus, setSmartThesaurus] = useState<{ synonyms: string[], antonyms: string[] } | null>(null);
  const [isPronouncing, setIsPronouncing] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [leaderboard, setLeaderboard] = useState<{ name: string, xp: number, level: number, photoURL?: string }[]>([]);
  const [showAllRankings, setShowAllRankings] = useState(false);
  const [xpHistory, setXpHistory] = useState<number[]>(() => {
    const saved = localStorage.getItem('xpHistory');
    let history = saved ? JSON.parse(saved) : [0, 0, 0, 0, 0, 0, 0];
    
    const lastUpdateStr = localStorage.getItem('lastXpUpdateDate');
    const today = new Date().toDateString();
    
    if (lastUpdateStr && lastUpdateStr !== today) {
      const lastUpdate = new Date(lastUpdateStr);
      const now = new Date(today);
      const diffTime = Math.abs(now.getTime() - lastUpdate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 7) {
        history = [0, 0, 0, 0, 0, 0, 0];
      } else if (diffDays > 0) {
        for (let i = 0; i < diffDays; i++) {
          history.shift();
          history.push(0);
        }
      }
    }
    
    localStorage.setItem('lastXpUpdateDate', today);
    localStorage.setItem('xpHistory', JSON.stringify(history));
    return history;
  });
  const [isListening, setIsListening] = useState(false);
  const [isLexiSpeaking, setIsLexiSpeaking] = useState(false);

  // Reminder State
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem('reminderTime') || '10:00');

  // Rule Lab State
  const [ruleLabInput, setRuleLabInput] = useState<Record<string, string>>({});
  const [ruleLabFeedback, setRuleLabFeedback] = useState<Record<string, { text: string, type: 'loading' | 'success' | 'error' | 'none' }>>({});
  const [ruleRoleplayState, setRuleRoleplayState] = useState<Record<string, { active: boolean, scenario: string, history: any[] }>>({});

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

      const { snapshots } = await FirebaseFirestore.getCollection({ 
        reference: 'ai_words',
        queryConstraints: [
          { type: 'limit', limit: 200 }
        ]
      });
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
        if (Capacitor.isNativePlatform()) {
          if (!isPluginsInitialized.current) {
            try {
              console.log("Initializing Plugins...");
              // RevenueCat
              await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
              await Purchases.configure({ 
                apiKey: import.meta.env.VITE_REVENUECAT_API_KEY,
                appUserID: user.uid // Link to Firebase UID
              });
              console.log("RevenueCat Configured with UID:", user.uid);
              
              // AdMob
              await AdMob.initialize();
              setAdInitialized(true);
              
              isPluginsInitialized.current = true;
              console.log("Plugins Initialized Successfully");
            } catch (e: any) {
              console.error("Plugin Init Error:", e);
              setErrorLog(prev => [...prev, `Plugin Init Error: ${e.message}`]);
            }
          } else {
            // If already initialized but user changed, log in to RevenueCat
            try {
              await Purchases.logIn({ appUserID: user.uid });
              console.log("RevenueCat Logged In User:", user.uid);
            } catch (e) {
              console.error("RevenueCat Login Error:", e);
            }
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

  const testStateRef = useRef(testState);
  useEffect(() => { testStateRef.current = testState; }, [testState]);

  const feedbackStateRef = useRef(feedbackState);
  useEffect(() => { feedbackStateRef.current = feedbackState; }, [feedbackState]);

  // AdMob Periodic Interstitial Loop
  useEffect(() => {
    // BYPASS: No ads for admin or premium users
    const isMasterAdmin = user?.email === MASTER_ADMIN_EMAIL || isAdmin;
    if (!Capacitor.isNativePlatform() || !user || isPremium || isMasterAdmin || !adInitialized) {
      return;
    }

    let adInterval: any;
    let isAdShowing = false;

    const prepareAndShow = async () => {
      try {
        console.log("Preparing Interstitial Ad...");
        await AdMob.prepareInterstitial({ 
          adId: ADMOB_INTERSTITIAL_ID, 
          isTesting: false // Set to false for production
        });
        setAdReady(true);
        
        // Wait 300 seconds (5 mins) before first ad and between ads to reduce annoyance
        adInterval = setInterval(async () => {
          if (!user || isPremium || !isPluginsInitialized.current) return;
          if (testStateRef.current === 'testing' || isAdShowing) {
            console.log("Skipping ad: Test running or ad already showing");
            return;
          }
          try {
            isAdShowing = true;
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
          } finally {
            isAdShowing = false;
          }
        }, 300000); // 5 minutes
      } catch (err: any) {
        console.error('AdMob prepare error:', err);
        setErrorLog(prev => [...prev, `AdMob Error: ${err.message}`]);
      }
    };

    prepareAndShow();
    
    // Listeners to pause/resume timer during ads
    const listeners: PluginListenerHandle[] = [];

    AdMob.addListener('interstitialAdShowed' as any, () => {
      logAction("Ad Opened - Pausing Test Timer");
      isAdShowing = true;
      pauseTimer();
    }).then(h => listeners.push(h));

    AdMob.addListener('interstitialAdDismissed' as any, () => {
      logAction("Ad Dismissed - Resuming Test Timer");
      isAdShowing = false;
      if (testStateRef.current === 'testing' && feedbackStateRef.current === 'none') {
        startTimer(timeLeftRef.current);
      }
    }).then(h => listeners.push(h));

    return () => {
      if (adInterval) clearInterval(adInterval);
      listeners.forEach(h => h.remove());
    };
  }, [user, isPremium, adInitialized]);

  // AdMob and setup periodic interstitial


  // Global Error Handler (Silent in Production — logs only, no user-facing popups)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global Error Caught:", event.error);
      const msg = event.error?.message || event.message || 'Unknown JS Error';
      setErrorLog(prev => [...prev, `JS Error: ${msg}`]);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Firebase Authentication State Listener
  useEffect(() => {
    // 4-Second Emergency Timeout to prevent Black Screen of Death
    const emergencyTimer = setTimeout(() => {
      if (authLoading) {
        setAuthLoading(false);
        logAction("Emergency Boot: Forcing authLoading to false");
      }
    }, 4000);

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
          const isRoleAdmin = userData?.role === 'admin';
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
              // BYPASS: Do not sign out automatically, as it ruins UX and might be triggered by error
              // await FirebaseAuthentication.signOut();
              // setUser(null);
              // setAlertMessage(`Your account deletion is in progress.`);
              console.log("Account deletion in progress but allowing session to continue as per user request.");
            }
          }

          // AUTHENTICATION LOGIC: Purely based on Firestore premium field
          // ADMIN OVERRIDE: Prioritize master admin email
          const userIsAdmin = result.user.email === MASTER_ADMIN_EMAIL || isRoleAdmin;
          if (userIsAdmin) {
            setIsAdmin(true);
            localStorage.setItem('isAdmin', 'true');
          } else {
            setIsAdmin(false);
            localStorage.setItem('isAdmin', 'false');
          }

          if (result.user.email === MASTER_ADMIN_EMAIL || isPremiumUser) {
            setIsPremium(true);
            localStorage.setItem('isPremium', 'true');
          } else {
            setIsPremium(false);
            localStorage.setItem('isPremium', 'false');
          }

          // 3. Check for onboarding
          if (!userData?.englishLevel || !userData?.displayName) {
            setShowOnboarding(true);
          } else {
            setEnglishLevel(userData.englishLevel);
            setDisplayName(userData.displayName);
            localStorage.setItem('englishLevel', userData.englishLevel);
            localStorage.setItem('userName', userData.displayName);
          }

        }
      } catch (err: any) {
        console.error('Failed to get current user/role', err);
        setErrorLog(prev => [...prev, `Boot Error: ${err.message}`]);
      } finally {
        if (typeof emergencyTimer !== 'undefined') clearTimeout(emergencyTimer);
        setAuthLoading(false);
      }
    };

    checkUser();

    // Load available voices for higher quality TTS
    const loadVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          setAvailableVoices(voices);
          // Automatically pick a "Premium" sounding voice if not already selected
          const preferred = voices.find(v => (v.name || '').includes('Google') && (v.lang || '').startsWith('en')) 
                         || voices.find(v => (v.lang || '').startsWith('en-GB'))
                         || voices.find(v => (v.lang || '').startsWith('en-US'))
                         || voices[0];
          if (preferred && !localStorage.getItem('selectedVoiceURI')) {
            setSelectedVoiceURI(preferred.voiceURI);
            localStorage.setItem('selectedVoiceURI', preferred.voiceURI);
          }
        }
      } catch (e) {
        console.warn("Speech synthesis error:", e);
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const scheduleDailyWords = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const permission = await LocalNotifications.requestPermissions();
          if (permission.display === 'granted') {
            await LocalNotifications.cancel({ notifications: [{ id: 999 }] }); // Clear old
            
            // Schedule a few notifications for the next 24 hours
            const notifications = [];
            for (let i = 1; i <= 5; i++) {
              const randomWord = LEARN_WORDS[Math.floor(Math.random() * LEARN_WORDS.length)];
              notifications.push({
                title: `Word of the Hour: ${randomWord.word}`,
                body: randomWord.meaning,
                id: 1000 + i,
                schedule: { at: new Date(Date.now() + i * 3 * 60 * 60 * 1000) }, // Every 3 hours
                smallIcon: 'ic_stat_name',
                actionTypeId: 'OPEN_APP'
              });
            }
            await LocalNotifications.schedule({ notifications });
            logAction("Scheduled 5 passive learning notifications");
          }
        } catch (e) {
          console.error("Notification scheduling failed:", e);
        }
      }
    };
    scheduleDailyWords();
    
    return () => {
      if (typeof emergencyTimer !== 'undefined') clearTimeout(emergencyTimer);
    };
  }, []);

  // Safe Splash Hiding
  useEffect(() => {
    console.log("App Component Mounted - Triggering Splash Hide");
    if (Capacitor.isNativePlatform()) {
      // Force hide splash as soon as App mounts to prevent Black Screen
      SplashScreen.hide().catch(() => {});
      
      // Secondary backup hide for insurance
      const timer = setTimeout(() => {
        SplashScreen.hide().catch(() => {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
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

            // Check for onboarding
            if (!userData?.englishLevel || !userData?.displayName) {
              setShowOnboarding(true);
            } else {
              setEnglishLevel(userData.englishLevel);
              setDisplayName(userData.displayName);
              localStorage.setItem('englishLevel', userData.englishLevel);
              localStorage.setItem('userName', userData.displayName);
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

  const CURRENT_VERSION = '1.4.5';
  const [needsUpdate, setNeedsUpdate] = useState(false);

  // Mandatory Update Check
  useEffect(() => {
    const checkUpdate = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const { snapshot } = await FirebaseFirestore.getDocument({ reference: 'app_config/version' });
        if (snapshot && snapshot.data) {
          const latest = snapshot.data.latest;
          if (latest && latest !== CURRENT_VERSION) {
            setNeedsUpdate(true);
          }
        }
      } catch (e) {
        console.error("Update check failed:", e);
      }
    };
    checkUpdate();
  }, []);

  // Network Status Listener
  useEffect(() => {
    const initNetwork = async () => {
      const status = await Network.getStatus();
      setIsOffline(!status.connected);

      Network.addListener('networkStatusChange', status => {
        setIsOffline(!status.connected);
        if (status.connected) {
          logAction("Back Online - Syncing...");
          // Refresh data if needed
          fetchAiWords(true);
        } else {
          logAction("Operating Offline");
        }
      });
    };
    initNetwork();
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
      const lastFetch = localStorage.getItem('last_leaderboard_fetch');
      const now = Date.now();
      if (lastFetch && now - parseInt(lastFetch) < 300000) { // 5 min cache
        const cached = localStorage.getItem('cached_leaderboard');
        if (cached && cached !== '[]') {
          setLeaderboard(JSON.parse(cached));
          return;
        }
      }

      let board: any[] = [];
      try {
        const { snapshots } = await FirebaseFirestore.getCollection({
          reference: 'users',
          queryConstraints: [
            { type: 'orderBy', fieldPath: 'xp', directionStr: 'desc' },
            { type: 'limit', limit: 10 }
          ]
        });
        if (snapshots) {
          board = snapshots.map(s => s.data as any);
        }
      } catch (queryErr) {
        console.error('Leaderboard query failed, trying fallback:', queryErr);
        // Fallback: Fetch all users and sort locally in case of index/plugin issues
        const { snapshots } = await FirebaseFirestore.getCollection({ reference: 'users' });
        if (snapshots) {
          board = snapshots
            .map(s => s.data as any)
            .sort((a: any, b: any) => (b.xp || 0) - (a.xp || 0))
            .slice(0, 10);
        }
      }

      if (board.length > 0) {
        setLeaderboard(board);
        localStorage.setItem('cached_leaderboard', JSON.stringify(board));
        localStorage.setItem('last_leaderboard_fetch', now.toString());
      } else {
        // If still empty (e.g., offline or empty db), show cached if available
        const cached = localStorage.getItem('cached_leaderboard');
        if (cached && cached !== '[]') {
          setLeaderboard(JSON.parse(cached));
        }
      }
    } catch (err: any) {
      console.error('Leaderboard fetch completely failed:', err);
      const cached = localStorage.getItem('cached_leaderboard');
      if (cached && cached !== '[]') {
        setLeaderboard(JSON.parse(cached));
      }
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

        const { snapshots } = await FirebaseFirestore.getCollection({ 
          reference: 'shared_words',
          queryConstraints: [
            { type: 'orderBy', fieldPath: 'createdAt', directionStr: 'desc' },
            { type: 'limit', limit: 200 }
          ]
        });
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
        if (Capacitor.isNativePlatform()) {
          await Purchases.logOut().catch(e => console.error("RC Logout fail:", e));
        }
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
      if (Capacitor.isNativePlatform()) {
        await Purchases.logOut().catch(() => {});
      }
      await FirebaseAuthentication.signOut();
      localStorage.clear();
      setUser(null);
      setAlertMessage("Your account deletion request has been submitted. It will be permanently deleted after 24 hours. Sign-in is now disabled for this account. 🔒");
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

        const now = new Date(today);
        const diffDays = Math.floor(Math.abs(now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= 7) {
          // Automatic XP decay after 7 days of inactivity
          setXp(prev => {
            if (prev <= 0) return 0;
            const penalty = diffDays * 50; 
            const newXp = Math.max(0, prev - penalty);
            localStorage.setItem('xp', newXp.toString());
            return newXp;
          });
          setLastPracticeDate(today);
          localStorage.setItem('lastPracticeDate', today);
        }

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
      setXpHistory(prevHistory => {
        let currentHistory = [...prevHistory];
        const today = new Date().toDateString();
        const lastUpdateStr = localStorage.getItem('lastXpUpdateDate') || today;
        
        if (lastUpdateStr !== today) {
          const lastUpdate = new Date(lastUpdateStr);
          const now = new Date(today);
          const diffDays = Math.floor(Math.abs(now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 7) {
            currentHistory = [0, 0, 0, 0, 0, 0, 0];
          } else if (diffDays > 0) {
            for (let i = 0; i < diffDays; i++) {
              currentHistory.shift();
              currentHistory.push(0);
            }
          }
          localStorage.setItem('lastXpUpdateDate', today);
        }
        
        currentHistory[6] += amount;
        localStorage.setItem('xpHistory', JSON.stringify(currentHistory));
        return currentHistory;
      });

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

    // Sync XP to Firestore for Leaderboard (use callback values to avoid stale closure)
    const currentXp = parseInt(localStorage.getItem('xp') || '0') + amount;
    const currentLevel = parseInt(localStorage.getItem('level') || '1');
    if (user?.uid) {
      FirebaseFirestore.setDocument({
        reference: 'users/' + user.uid,
        data: { xp: currentXp, level: currentLevel, name: displayName || user.displayName || 'Explorer' },
        merge: true
      }).catch(() => {});
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
      // Pick 5 random unique words for Challenge (Changed back from 100)
      const shuffled = [...LEARN_WORDS].sort(() => 0.5 - Math.random());
      const selectedChallenge = shuffled.slice(0, 5);
      const selectedLearn = shuffled.slice(5, 105); // Pick another 100 for Learn

      setDailyWords(selectedChallenge);
      setDailyLearnWords(selectedLearn);
      setLastDailyWordDate(today);
      setDailyWordsLearned(0);
      setCurrentDailyIndex(0);

      localStorage.setItem('dailyWords', JSON.stringify(selectedChallenge));
      localStorage.setItem('dailyLearnWords', JSON.stringify(selectedLearn));
      localStorage.setItem('lastDailyWordDate', today);
      localStorage.setItem('dailyWordsLearned', '0');
    } else {
      if (dailyWords.length === 0) {
        const shuffled = [...LEARN_WORDS].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);
        setDailyWords(selected);
        localStorage.setItem('dailyWords', JSON.stringify(selected));
      }
      if (dailyLearnWords.length === 0) {
        const shuffled = [...LEARN_WORDS].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 100);
        setDailyLearnWords(selected);
        localStorage.setItem('dailyLearnWords', JSON.stringify(selected));
      }
    }
  }, [lastDailyWordDate]);

  // 🤖 AI Auto-Add: Fetch 100 new words every 24 hours automatically
  useEffect(() => {
    const today = new Date().toDateString();
    if (aiAutoAddDate === today || isOffline) return;

    const fetchAiWords = async () => {
      try {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) return;

        // Pick a random category to fetch from
        const randomCategories = ['Technology', 'Business', 'Psychology', 'Science', 'Advanced', 'Academic', 'Philosophy', 'Legal', 'Health', 'Finance', 'Literature', 'History'];
        const cat = randomCategories[Math.floor(Math.random() * randomCategories.length)];

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a vocabulary expert. Always respond with valid JSON only.' },
              { role: 'user', content: `Generate exactly 100 useful English vocabulary words for the "${cat}" category that Indians learning English would benefit from.\n\nReturn ONLY this JSON object (no markdown, no extra text):\n{"words":[{"word":"example","meaning":"उदाहरण","example":"This is an example.","category":"${cat}"}]}\n\nRules:\n- All words must have accurate Hindi meanings in Devanagari\n- Include natural English example sentences\n- No very basic words (no: the, is, a, etc.)\n- Return exactly 100 items` }
            ],
            max_tokens: 8000,
            response_format: { type: 'json_object' }
          })
        });

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        let parsed: any = null;
        try { parsed = JSON.parse(content); } catch {}

        if (parsed?.words && Array.isArray(parsed.words)) {
          const validWords = parsed.words.filter((w: any) => w.word && w.meaning && w.example);
          if (validWords.length > 0) {
            setAiWords(prev => {
              const existingWordSet = new Set(prev.map((w: any) => (w.word || '').toLowerCase()));
              const newUnique = validWords.filter((w: any) => !existingWordSet.has((w.word || '').toLowerCase()));
              const updated = [...prev, ...newUnique];
              localStorage.setItem('cached_ai_words', JSON.stringify(updated));
              
              // Also update today's 100 if it's currently showing Today's 100
              setDailyLearnWords(validWords);
              localStorage.setItem('dailyLearnWords', JSON.stringify(validWords));
              
              logAction(`AI Auto-Add: +${newUnique.length} new ${cat} words (Total AI words: ${updated.length})`);
              return updated;
            });
            setAiAutoAddDate(today);
            localStorage.setItem('aiAutoAddDate', today);
          }
        }
      } catch (e) {
        console.log('AI auto-add skipped (offline/error)');
      }
    };

    // Run after a short delay to not block app startup
    const timer = setTimeout(fetchAiWords, 5000);
    return () => clearTimeout(timer);
  }, [aiAutoAddDate, isOffline]);

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
          visibility: 1
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
        await scheduleDailyNotification();
        return true;
      } else {
        setAlertMessage('Notification permission denied. Cannot enable reminders.');
        return false;
      }
    } else {
      // Web notification logic (simplified for browser)
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

    // Schedule the notification
    if (reminderEnabled || !reminderEverSet) {
      const enabled = await requestAndEnableReminder();
      if (enabled) {
        setReminderEverSet(true);
        localStorage.setItem('reminderEverSet', 'true');
      }
    }
    setReminderPopoverOpen(false);
  };

  const scheduleDailyNotification = async () => {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      // Clear existing notifications first
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

      const [hours, minutes] = draftReminderTime.split(':').map(Number);
      const randomWord = LEARN_WORDS[Math.floor(Math.random() * LEARN_WORDS.length)];

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 1,
            title: `Word of the Day: ${randomWord.word} 📚`,
            body: `Do you know what "${randomWord.word}" means? Tap to learn and practice!`,
            schedule: {
              on: {
                hour: hours,
                minute: minutes
              },
              repeats: true,
              allowWhileIdle: true
            },
            sound: 'default',
            actionTypeId: 'OPEN_APP'
          }
        ]
      });
      console.log("Daily notification scheduled for", draftReminderTime);
    } catch (e) {
      console.error("Failed to schedule notification:", e);
    }
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
          const enInVoices = (result.voices || []).filter(v => v.lang?.startsWith('en-IN'));
          const otherEnVoices = (result.voices || []).filter(v => v.lang?.startsWith('en-') && !v.lang?.startsWith('en-IN'));
          
          // Combine prioritizing en-IN
          const allEnVoices = [...enInVoices, ...otherEnVoices];
          setAvailableVoices(allEnVoices);

          setSelectedVoiceURI(prev => {
            if (prev) return prev;
            // Enhanced priority: Google/Enhanced > Indian Female > Others
            const bestVoice = 
              enInVoices.find(v => (v.name || '').toLowerCase().includes('google') || (v.name || '').toLowerCase().includes('enhanced')) ||
              enInVoices.find(v => (v.name || '').toLowerCase().includes('female') || (v.name || '').toLowerCase().includes('aditi')) ||
              otherEnVoices.find(v => (v.name || '').toLowerCase().includes('google') || (v.name || '').toLowerCase().includes('enhanced')) ||
              enInVoices[0] ||
              otherEnVoices[0];
            return bestVoice ? bestVoice.voiceURI : '';
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
    const allSources = [...LEARN_WORDS, ...customWords, ...sharedWords, ...aiWords];

    // Ensure uniqueness by word (case-insensitive)
    const uniqueMap = new Map();
    allSources.forEach(item => {
      if (!item || !item.word) return;
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

  const startTimer = (initialTime?: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const startTime = initialTime !== undefined ? initialTime : 15;
    setTimeLeft(startTime);
    timeLeftRef.current = startTime;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        timeLeftRef.current = next;
        if (next <= 0) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTimeout = () => {
    if (feedbackStateRef.current !== 'none') return;
    if (!testWords || !testWords[currentTestWordIndex]) return; // Safeguard against crash

    if (soundEnabled) wrongSound.play().catch(() => {});
    setFeedbackState('timeout');
    const newAnswers = [...userAnswers, '']; // Blank for timeout
    setUserAnswers(newAnswers);

    // Update SRS Data (Incorrect/Timeout)
    const wordKey = (testWords[currentTestWordIndex] || '').toLowerCase();
    setSrsData(prev => {
      const current = prev[wordKey] || { level: 0, nextReview: 0 };
      let newLevel = Math.max(0, current.level - 1);
      const intervals = [0, 1, 3, 7, 14, 30];
      const nextReview = Date.now() + (intervals[newLevel] * 24 * 60 * 60 * 1000);
      const newData = { ...prev, [wordKey]: { level: newLevel, nextReview } };
      localStorage.setItem('srsData', JSON.stringify(newData));
      return newData;
    });
  };

  const playNative = async (word: string) => {
    if (!word) { setIsLexiSpeaking(false); return; }
    try {
      if (Capacitor.isNativePlatform()) {
        const vIdx = availableVoices.findIndex(v => v.voiceURI === selectedVoiceURI);
        try { await TextToSpeech.stop(); } catch(_) {}
        await TextToSpeech.speak({
          text: word,
          lang: 'en-US',
          rate: speechRate || 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
          voice: vIdx !== -1 ? vIdx : undefined
        });
        
        // Safety timeout to reset speaking state if native fails
        const wordCount = (word || '').split(' ').length;
        const estTime = Math.max(1500, (wordCount / (150 * (speechRate || 1))) * 60 * 1000 + 1000);
        setTimeout(() => setIsLexiSpeaking(false), estTime);
      } else {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
          setIsLexiSpeaking(false);
          return;
        }
        try { window.speechSynthesis.cancel(); } catch(_) {}
        const utterance = new SpeechSynthesisUtterance(word);
        const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
        if (voice) utterance.voice = voice;
        utterance.rate = speechRate || 1.0;
        utterance.onend = () => setIsLexiSpeaking(false);
        utterance.onerror = () => setIsLexiSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error('Native TTS error:', e);
      setIsLexiSpeaking(false);
    }
  };

  const playWord = async (word: string) => {
    if (!word || typeof word !== 'string') { setIsLexiSpeaking(false); return; }
    setIsLexiSpeaking(true);

    // Global safety timeout — auto-reset speaking state after 15s to prevent UI freeze
    const safetyTimer = setTimeout(() => setIsLexiSpeaking(false), 15000);

    // Try Natural Neural Voice (ElevenLabs) first if online (limit to 300 chars for API safety)
    const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (!isOffline && word.length < 300 && elevenLabsKey) {
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: word,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        });

        if (!response.ok) throw new Error('ElevenLabs API failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        audio.onended = () => {
          clearTimeout(safetyTimer);
          setIsLexiSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          clearTimeout(safetyTimer);
          console.warn("ElevenLabs voice failed, using native fallback");
          URL.revokeObjectURL(url);
          playNative(word);
        };

        // 5-second timeout for online play (API can be slightly slower)
        const playPromise = audio.play();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));

        await Promise.race([playPromise, timeoutPromise]);
      } catch (e) {
        console.warn("ElevenLabs Error:", e);
        playNative(word);
      }
    } else {
      playNative(word);
    }
  };

  const checkPronunciation = async (word: string) => {
    if (isPronouncing) return;
    setIsPronouncing(word);
    
    try {
      if (Capacitor.isNativePlatform()) {
        const available = await SpeechRecognition.available();
        if (!available.available) {
           setAlertMessage("Speech recognition not available on this device.");
           setIsPronouncing(null);
           return;
        }
        await SpeechRecognition.requestPermissions();
        
        await SpeechRecognition.start({
          language: 'en-US',
          partialResults: false,
          prompt: `Say: "${word}"`,
          popup: true
        });

        SpeechRecognition.addListener('partialResults' as any, (data: any) => {
          if (!data?.matches || data.matches.length === 0) { setIsPronouncing(null); SpeechRecognition.removeAllListeners(); return; }
          const match = data.matches.some((m: string) => (m || '').toLowerCase().includes((word || '').toLowerCase()));
          if (match) {
            setAlertMessage(`Perfect! You said it correctly: "${word}" 🌟`);
            addXp(10);
            if (soundEnabled) correctSound.play().catch(() => {});
          } else {
            setAlertMessage(`Almost! Try again. You said: "${data.matches[0] || ''}"`);
            if (soundEnabled) wrongSound.play().catch(() => {});
          }
          setIsPronouncing(null);
          SpeechRecognition.removeAllListeners();
        });
      } else {
        const SpeechRecognitionWeb = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionWeb) {
          setAlertMessage("Browser doesn't support Speech Recognition.");
          setIsPronouncing(null);
          return;
        }
        const recognition = new SpeechRecognitionWeb();
        recognition.lang = 'en-US';
        recognition.start();
        recognition.onresult = (event: any) => {
          const transcript = (event?.results?.[0]?.[0]?.transcript || '').toLowerCase();
          if (transcript.includes((word || '').toLowerCase())) {
            setAlertMessage(`Excellent! Correct pronunciation: "${word}" ✨`);
            addXp(10);
            if (soundEnabled) correctSound.play().catch(() => {});
          } else {
            setAlertMessage(`Keep trying! Heard: "${transcript}"`);
            if (soundEnabled) wrongSound.play().catch(() => {});
          }
          setIsPronouncing(null);
        };
        recognition.onerror = () => setIsPronouncing(null);
      }
    } catch (e) {
      console.error(e);
      setIsPronouncing(null);
    }
  };

  const handleAnswerSubmit = (answer: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!testWords || !testWords[currentTestWordIndex]) return; // Safeguard against crash

    const newAnswers = [...userAnswers, (answer || '').toLowerCase()];
    setUserAnswers(newAnswers);

    const isCorrect = (answer || '').toLowerCase() === (testWords[currentTestWordIndex] || '').toLowerCase();

    // Update SRS Data
    const wordKey = (testWords[currentTestWordIndex] || '').toLowerCase();
    setSrsData(prev => {
      const current = prev[wordKey] || { level: 0, nextReview: 0 };
      let newLevel = isCorrect ? current.level + 1 : Math.max(0, current.level - 1);
      if (newLevel > 5) newLevel = 5;
      
      const intervals = [0, 1, 3, 7, 14, 30]; // Days
      const nextReview = Date.now() + (intervals[newLevel] * 24 * 60 * 60 * 1000);
      
      const newData = { ...prev, [wordKey]: { level: newLevel, nextReview } };
      localStorage.setItem('srsData', JSON.stringify(newData));
      
      // Also sync to Firestore if online
      if (user) {
        FirebaseFirestore.setDocument({
          reference: `users/${user.uid}/srs_data/${wordKey}`,
          data: { level: newLevel, nextReview }
        }).catch(() => {});
      }
      
      return newData;
    });

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
      // Auto-advance after showing incorrect feedback for 2 seconds
      setTimeout(() => {
        handleNextQuestion(currentTestWordIndex);
      }, 2000);
    }
  };

  useEffect(() => {
    if (testState === 'results' && userAnswers.length > 0 && testWords.length > 0) {
      const correctCount = userAnswers.filter((ans, i) => ans === (testWords[i] || '').toLowerCase()).length;
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


  const startRuleRoleplay = async (ruleId: string, ruleTitle: string) => {
    setRuleRoleplayState(prev => ({ 
      ...prev, 
      [ruleId]: { active: true, scenario: 'Generating scenario...', history: [] } 
    }));
    
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { 
              role: 'system', 
              content: `You are Lexi, a smart grammar tutor. The user (${displayName}) is at '${englishLevel}' level. They want to practice: "${ruleTitle}". 
              Create a short (1 sentence) interesting scenario or question that FORCES the user to use this grammar rule in their answer.
              Adjust the difficulty to their '${englishLevel}' level.
              Keep it very short.` 
            }
          ]
        })
      });

      const data = await response.json();
      const scenario = data.choices?.[0]?.message?.content || "Tell me a story using this rule.";
      setRuleRoleplayState(prev => ({ 
        ...prev, 
        [ruleId]: { active: true, scenario, history: [{ role: 'model', content: scenario }] } 
      }));
      playWord(scenario);
    } catch (err) {
      setRuleRoleplayState(prev => ({ ...prev, [ruleId]: { active: false, scenario: '', history: [] } }));
    }
  };

  const checkRuleSentence = async (ruleId: string, ruleTitle: string, userSentence: string, isRoleplay = false) => {
    if (!userSentence.trim()) return;
    setRuleLabFeedback(prev => ({ ...prev, [ruleId]: { text: 'Analyzing...', type: 'loading' } }));
    
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      const messages = [
        { 
          role: 'system', 
          content: `You are a smart English grammar checker. The user (${displayName}, level: ${englishLevel}) is practicing: "${ruleTitle}". 
          ${isRoleplay ? `This is a conversation. Scenario was: "${ruleRoleplayState[ruleId]?.scenario}".` : ''}
          1. Check if their sentence follows "${ruleTitle}" correctly. 
          2. Check for general grammar/spelling.
          3. If correct, praise them and ${isRoleplay ? 'keep the conversation going with 1 short follow-up question' : 'you are done'}.
          4. If incorrect, provide correction and why (use simple words for Beginner level).
          Keep it very short (max 2 sentences).` 
        },
        { role: 'user', content: userSentence }
      ];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages
        })
      });

      const data = await response.json();
      const feedback = data.choices?.[0]?.message?.content || "Could not analyze.";
      const isCorrect = !(feedback || '').toLowerCase().includes('incorrect') && !(feedback || '').toLowerCase().includes('wrong') && !(feedback || '').toLowerCase().includes('mistake');
      
      setRuleLabFeedback(prev => ({ 
        ...prev, 
        [ruleId]: { text: feedback, type: isCorrect ? 'success' : 'error' } 
      }));
      
      if (isRoleplay && isCorrect) {
        setRuleRoleplayState(prev => ({
          ...prev,
          [ruleId]: { 
            ...prev[ruleId], 
            history: [...prev[ruleId].history, { role: 'user', content: userSentence }, { role: 'model', content: feedback }]
          }
        }));
        playWord(feedback);
      }

      if (isCorrect) addXp(10);
    } catch (err) {
      setRuleLabFeedback(prev => ({ ...prev, [ruleId]: { text: 'Network error.', type: 'error' } }));
    }
  };

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
    setSmartThesaurus(null);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('not_found');
      
      const data: DictEntry[] = await res.json();
      const entry = data[0];
      setDictResult(entry);
      updateMission('dict-3', 1);

      // AI Refinement for Synonyms/Antonyms
      refineThesaurusWithAi(query);
      
      const audioUrl = entry.phonetics.find(p => p.audio)?.audio || '';
      if (audioUrl) {
        const audio = new Audio(audioUrl.startsWith('//') ? 'https:' + audioUrl : audioUrl);
        setDictAudio(audio);
      } else {
        setDictAudio(null);
      }
    } catch (err: any) {
      // Local Fallback Logic
      const localMatch = LEARN_WORDS.find(w => (w.word || '').toLowerCase() === query) ||
                         sharedWords.find(w => (w.word || '').toLowerCase() === query) ||
                         aiWords.find(w => (w.word || '').toLowerCase() === query);
                         
      if (localMatch) {
         setDictResult({
           word: localMatch.word,
           phonetic: '[Offline Mode]',
           phonetics: [],
           meanings: [{
             partOfSpeech: (localMatch as any).category || 'Cached',
             definitions: [{
               definition: localMatch.meaning,
               example: localMatch.example,
               synonyms: [],
               antonyms: []
             }],
             synonyms: [],
             antonyms: []
           }]
         });
         // TTS Fallback
         if (Capacitor.isNativePlatform()) { TextToSpeech.speak({ text: localMatch.word, lang: 'en-US', rate: 0.9 }).catch(() => {}); } else { playWord(localMatch.word); }
      } else if (err.message === 'not_found') {
        setDictError(`"${query}" not found in Global or Local dictionary.`);
      } else if (isOffline) {
        setDictError('Offline: This word is not in the local practice list. Reconnect to search the full global dictionary.');
      } else {
        setDictError('Network error. Please check your connection.');
      }
    } finally {
      setDictLoading(false);
    }
  };

  const refineThesaurusWithAi = async (word: string) => {
    if (isOffline) return;
    setIsRefiningThesaurus(true);
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { 
              role: 'system', 
              content: 'You are a linguistic expert. Provide a clean, accurate list of 5-8 common synonyms and 5-8 common antonyms for the given word. Filter out any obscure, offensive, or technically unrelated words. Format as JSON: {"synonyms": [], "antonyms": []}' 
            },
            { role: 'user', content: `Word: ${word}` }
          ],
          response_format: { type: "json_object" }
        })
      });

      const data = await response.json();
      const content = JSON.parse(data.choices?.[0]?.message?.content || '{}');
      if (content.synonyms || content.antonyms) {
        setSmartThesaurus({
          synonyms: content.synonyms || [],
          antonyms: content.antonyms || []
        });
      }
    } catch (err) {
      console.error("Thesaurus refinement failed:", err);
    } finally {
      setIsRefiningThesaurus(false);
    }
  };

  const handleTranslateDict = async () => {
    logAction("Starting dictionary translation");
    if (!hasPremium) {
      setSubscriptionModalOpen(true);
      return;
    }
    if (isOffline) {
      setAlertMessage("Translation requires an internet connection. 🌐");
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
    const isSaved = savedWords.some(sw => sw.word === w.word);
    try {
      if (isSaved) {
        await FirebaseFirestore.deleteDocument({ reference: `users/${user.uid}/saved_words/${w.word}` });
        setSavedWords(prev => prev.filter(sw => sw.word !== w.word));
      } else {
        const data = { ...w, savedAt: Date.now() };
        await FirebaseFirestore.setDocument({ reference: `users/${user.uid}/saved_words/${w.word}`, data });
        setSavedWords(prev => [...prev, data]);
      }
    } catch (e: any) {
      console.error("Toggle Save Error:", e);
      setErrorLog(prev => [...prev, `Save Error: ${e.message}`]);
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

  const evaluateArenaSentence = async () => {
    if (!arenaInput.trim() || arenaLoading || !arenaWordObj) return;
    setArenaLoading(true);
    setArenaFeedback(null);

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) {
         setArenaFeedback({ damage: 0, msg: "API Key missing. Ask the developer.", crit: false });
         setArenaLoading(false);
         return;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { 
              role: 'system', 
              content: `You are an AI judge for a vocabulary RPG game. 
Rule: The user must write a sentence using the word "${arenaWordObj.word}".
Evaluate the sentence based on grammar and complexity.
Output JSON format ONLY: {"damage": number, "msg": "short feedback message"}. 
If they didn't use the word or grammar is completely wrong -> damage: 0. 
If sentence is simple and correct -> damage: 15. 
If sentence is complex, creative, and correct -> damage: 50. Do not output anything other than JSON.`
            },
            { role: 'user', content: arenaInput }
          ]
        })
      });

      const data = await response.json();
      const content = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(content);
      
      const dmg = result.damage || 0;
      setArenaFeedback({ damage: dmg, msg: result.msg, crit: dmg >= 50 });
      setArenaHp(prev => Math.max(0, prev - dmg));
      setArenaInput('');
      
      if (arenaHp - dmg <= 0) {
        addXp(500); // Award 500 XP for arena victory
        setTimeout(() => setArenaState('result'), 2000);
      } else if (dmg > 0) {
        // Change word after a successful hit
        setTimeout(() => {
          const w = LEARN_WORDS[Math.floor(Math.random() * LEARN_WORDS.length)];
          setArenaWordObj(w);
          setArenaFeedback(null);
        }, 3000);
      }
    } catch (e) {
      console.error(e);
      setArenaFeedback({ damage: 0, msg: "The monster blocked your attack! (Error)", crit: false });
    } finally {
      setArenaLoading(false);
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
    
    if (isOffline) {
       setAiChat(prev => [...prev, { role: 'user' as const, content: text }, { role: 'model' as const, content: "I'm currently sleeping (offline). Let's talk once you're back on the internet! 💤" }]);
       setAiInput('');
       return;
    }
    
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
            { 
              role: 'system', 
              content: `You are 'Lexi', the official AI Coach of the 'LexiQuest' app. The user's name is ${displayName} and their English level is ${englishLevel}. ` +
                       `LexiQuest is an all-in-one English learning app. If a user asks for other apps, politely tell them LexiQuest is superior. ` +
                       `PERSONALIZATION: Since the user is at '${englishLevel}' level, adjust your vocabulary and complexity accordingly. ` +
                       `If level is Beginner, use extremely simple words and short sentences. ` +
                       `RULE: If the user speaks in English, reply ONLY in English. If they speak in Hindi, you can use Hinglish. ` +
                       `Keep responses VERY SMART, LOYAL, and SHORT (max 2 sentences). Always end with a question.` 
            },
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
        // Calculate delay based on word count to wait for Lexi to finish talking
        const wordCount = botResponse.split(' ').length;
        const speakingDelay = Math.max(3000, (wordCount / (150 * speechRate)) * 60 * 1000 + 1500);
        
        setTimeout(() => {
          if (isOnCall) startListeningForCall();
        }, speakingDelay);
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-[6px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-black text-slate-900 mb-2">LexiQuest</h2>
        <p className="text-slate-500 font-bold text-sm animate-pulse">Initializing smart dictionary...</p>
      </div>
    );
  }

  if (needsUpdate) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
         <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl" />
         <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl" />
         
        <div className="relative w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/40 animate-bounce">
          <RefreshCw className="w-12 h-12 text-white" />
        </div>
        
        <h2 className="text-4xl font-black text-white mb-4 tracking-tight leading-tight">
          Level Up Your Experience! 🚀
        </h2>
        
        <p className="text-slate-400 text-lg mb-10 max-w-xs leading-relaxed font-medium">
          A fresh update for LexiQuest is ready. Get new words, smarter AI, and better performance now!
        </p>
        
        <button
          onClick={() => {
            if (Capacitor.isNativePlatform()) {
              window.open('https://play.google.com/store/apps/details?id=com.lexiquest.app', '_system');
            } else {
              window.open('https://play.google.com/store/apps/details?id=com.lexiquest.app', '_blank');
            }
          }}
          className="w-full max-w-sm py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xl shadow-xl shadow-indigo-600/40 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <Download className="w-6 h-6" />
          Update Now
        </button>
        
        <div className="mt-12 flex flex-col items-center gap-2">
           <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Mandatory Update Required</span>
           </div>
           <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">
             Version {CURRENT_VERSION} → Latest
           </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onSuccess={(u) => setUser(u)} />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={(data) => handleOnboardingComplete(data)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-[calc(4rem+var(--safe-area-bottom))]">
      {/* Top Header - Glassmorphism style */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-40 px-5 py-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 transform group-active:scale-90 transition-transform">
            <GraduationCap className="w-5.5 h-5.5" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Lexi<span className="text-indigo-600">Quest</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('dictionary')}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 border border-slate-100 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
            title="Dictionary Search"
          >
            <Search className="w-5 h-5" />
          </button>
          {isAdmin && (
            <button
              onClick={() => setAdminAddModalOpen(true)}
              className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 hover:bg-amber-100 transition-colors shadow-sm"
              title="Admin: Add Word"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => {
              logAction("Navigating to Profile");
              setActiveTab('profile');
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 ${activeTab === 'profile' 
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
              : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'}`}
          >
            <User className="w-5 h-5" />
          </button>
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
          <span className="text-[10px] font-bold uppercase tracking-wider">Journey</span>
        </button>
        <button
          onClick={() => setActiveTab('test')}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${activeTab === 'test'
            ? 'text-indigo-600'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
        >
          <Sword className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Arena</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('ai-coach');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 relative transition-colors ${activeTab === 'ai-coach' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          <Bot className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Lexi</span>
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
      <main className="flex-1 pt-[calc(3.5rem+var(--safe-area-top))] pb-32 overflow-y-auto flex flex-col">
        {isOffline && (
          <div className="bg-amber-500 text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 animate-pulse sticky top-0 z-20 shadow-sm">
            <PhoneOff className="w-3 h-3" />
            Working Offline
          </div>
        )}

        {activeTab === 'learn' && (
          <div className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50">
            <div className="max-w-4xl mx-auto">
              {/* Premium Hero Section */}
              <div className="mb-6 relative">
                <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-8 -translate-x-8 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 shrink-0">
                      <BookOpen className="w-9 h-9" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                        Learn New Words
                      </h2>
                      <p className="text-slate-500 font-medium text-xs md:text-sm leading-relaxed max-w-sm">
                        Master thousands of English words with smart practice and daily vocabulary goals.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-start md:items-end gap-2 shrink-0 w-full md:w-auto">
                    <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm px-5 py-3 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Average Score</span>
                        <span className="text-lg font-black text-indigo-600">{averageScore.toFixed(1)}%</span>
                      </div>
                      <div className="w-px h-8 bg-slate-100"></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Tests</span>
                        <span className="text-lg font-black text-slate-900">{totalTestsTaken}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enter Grammar Hub Button */}
              <button
                onClick={() => setActiveTab('grammar')}
                className="w-full mb-6 py-4 bg-white border border-indigo-100 rounded-3xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all active:scale-[0.98] flex items-center justify-between px-5 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <Languages className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-black text-slate-900">Grammar Hub</h3>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Master Sentence Rules</p>
                  </div>
                </div>
                <ChevronLeft className="w-6 h-6 text-indigo-300 rotate-180 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Search Box */}
              <div className="mb-6 relative group">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={learnSearchQuery}
                    onChange={(e) => setLearnSearchQuery(e.target.value)}
                    placeholder="Search words or meanings..."
                    className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
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
                        setSelectedCategory(cat);
                        setLearnPage(0);
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-white text-gray-500 border border-gray-100 hover:border-indigo-200'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
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
                       <div className="flex flex-col">
                         <span className="font-medium text-lg">{item.word}</span>
                         {srsData[(item.word || '').toLowerCase()] && (
                           <div className="flex gap-1 mt-1" title={`Mastery Level: ${srsData[(item.word || '').toLowerCase()]?.level || 0}/5`}>
                             {[...Array(5)].map((_, i) => (
                               <div 
                                 key={i} 
                                 className={`w-2.5 h-1 rounded-full ${i < (srsData[(item.word || '').toLowerCase()]?.level || 0) ? 'bg-indigo-500' : 'bg-gray-200'}`} 
                               />
                             ))}
                           </div>
                         )}
                       </div>
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

        {activeTab === 'grammar' && (
          <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6">
                <div>
                  <h2 className="text-4xl font-black mb-3 flex items-center justify-center sm:justify-start gap-4 text-slate-900">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                      <Languages className="w-6 h-6" />
                    </div>
                    Smart Grammar
                  </h2>
                  <p className="text-slate-500 font-medium max-w-lg">
                    Master essential English rules with simple explanations and daily practice.
                  </p>
                </div>
                {grammarSubTab !== 'categories' && (
                   <button 
                    onClick={() => {
                      if (grammarSubTab === 'mode') setGrammarSubTab('categories');
                      else setGrammarSubTab('mode');
                    }}
                    className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 active:scale-95"
                   >
                     <ChevronLeft className="w-4 h-4" /> Back
                   </button>
                )}
              </div>

              {grammarSubTab === 'categories' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from(new Set(GRAMMAR_RULES.map(r => r.category))).map(cat => (
                    <motion.div
                      key={cat}
                      whileHover={{ y: -5 }}
                      onClick={() => {
                        setSelectedGrammarCategory(cat);
                        setGrammarSubTab('mode');
                      }}
                      className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 hover:border-indigo-300 transition-all cursor-pointer group"
                    >
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Book className="w-7 h-7" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">{cat}</h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                        {GRAMMAR_RULES.filter(r => r.category === cat).length} Rules to Learn
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}

              {grammarSubTab === 'mode' && (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="text-center mb-12">
                    <h3 className="text-3xl font-black text-slate-900 mb-2">{selectedGrammarCategory}</h3>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Choose your path</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
                    <motion.button
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setGrammarSubTab('learn')}
                      className="p-10 bg-white border-2 border-slate-100 rounded-[3rem] shadow-xl flex flex-col items-center gap-4 hover:border-indigo-600 transition-all"
                    >
                      <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600">
                        <BookOpen className="w-10 h-10" />
                      </div>
                      <span className="text-xl font-black text-slate-900">Learn Rules</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startGrammarTest(selectedGrammarCategory!)}
                      className="p-10 bg-white border-2 border-slate-100 rounded-[3rem] shadow-xl flex flex-col items-center gap-4 hover:border-amber-500 transition-all"
                    >
                      <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500">
                        <Trophy className="w-10 h-10" />
                      </div>
                      <span className="text-xl font-black text-slate-900">Take Test</span>
                    </motion.button>
                  </div>
                </div>
              )}

              {grammarSubTab === 'test' && (
                <div className="max-w-2xl mx-auto">
                  {!grammarTestState.showResults ? (
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl">
                      <div className="flex justify-between items-center mb-8">
                         <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Question {grammarTestState.currentIndex + 1} / {grammarTestState.questions.length}</span>
                         <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 transition-all" style={{ width: `${((grammarTestState.currentIndex + 1) / grammarTestState.questions.length) * 100}%` }} />
                         </div>
                      </div>

                      <h3 className="text-xl font-black text-slate-900 mb-6">
                        {grammarTestState.questions[grammarTestState.currentIndex].question}
                      </h3>

                      <div className="space-y-3">
                        {grammarTestState.questions[grammarTestState.currentIndex].options.map((opt: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => {
                              const isCorrect = opt === grammarTestState.questions[grammarTestState.currentIndex].correctAnswer;
                              const newAnswers = [...grammarTestState.userAnswers, opt];
                              
                              if (grammarTestState.currentIndex < grammarTestState.questions.length - 1) {
                                setGrammarTestState(prev => ({
                                  ...prev,
                                  currentIndex: prev.currentIndex + 1,
                                  score: isCorrect ? prev.score + 1 : prev.score,
                                  userAnswers: newAnswers
                                }));
                              } else {
                                setGrammarTestState(prev => ({
                                  ...prev,
                                  score: isCorrect ? prev.score + 1 : prev.score,
                                  showResults: true,
                                  userAnswers: newAnswers
                                }));
                                addXp(50); // Bonus XP for completing test
                              }
                            }}
                            className="w-full p-5 text-left bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all active:scale-[0.98]"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-2xl text-center">
                      <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-indigo-200">
                        <Trophy className="w-10 h-10" />
                      </div>
                      <h3 className="text-3xl font-black text-slate-900 mb-2">Test Completed!</h3>
                      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-8">You scored {grammarTestState.score} / {grammarTestState.questions.length}</p>
                      
                      <div className="space-y-3 mb-8 text-left">
                        {grammarTestState.questions.map((q, idx) => (
                          <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between ${q.correctAnswer === grammarTestState.userAnswers[idx] ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-center gap-3">
                              {q.correctAnswer === grammarTestState.userAnswers[idx] ? <CheckCircle className="text-green-600 w-5 h-5" /> : <X className="text-red-600 w-5 h-5" />}
                              <p className="text-xs font-bold text-slate-700">{q.ruleTitle}</p>
                            </div>
                            <span className="text-[10px] font-black uppercase text-slate-400">{q.correctAnswer === grammarTestState.userAnswers[idx] ? 'Correct' : 'Wrong'}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => setGrammarSubTab('mode')}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                      >
                        Finish Review
                      </button>
                    </div>
                  )}
                </div>
              )}

              {grammarSubTab === 'learn' && (
                <div className="space-y-6">
                  {GRAMMAR_RULES.filter(r => r.category === selectedGrammarCategory).map(rule => (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-xl shadow-slate-100/50"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-black text-slate-900 leading-tight">{rule.title}</h3>
                          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">{selectedGrammarCategory}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setActiveTab('ai-coach');
                              handleAiSendMessage(`I'm learning about the grammar rule: "${rule.title}" (${rule.rule}). Can you explain it more simply and give me 3 unique examples?`);
                            }}
                            className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm group"
                            title="Discuss with AI Coach"
                          >
                            <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                          </button>
                          {learnedRules.includes(rule.id) && (
                            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl border border-green-100">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">English Rule</p>
                          <p className="text-slate-700 font-bold leading-relaxed">{rule.rule}</p>
                        </div>
                        <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-50">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Hindi Me</p>
                          <p className="text-indigo-900 font-medium italic">{rule.hindi}</p>
                        </div>
                      </div>
                      <div className="mt-4 p-5 bg-amber-50/30 rounded-2xl border border-amber-50">
                         <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Standard Example</p>
                         <p className="text-slate-700 font-black italic">"{rule.example}"</p>
                      </div>

                      {/* --- AI SMART LAB --- */}
                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">AI Genius Practice</h4>
                          </div>
                          {!ruleRoleplayState[rule.id]?.active && (
                            <button
                              onClick={() => startRuleRoleplay(rule.id, rule.title)}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-black rounded-lg shadow-md active:scale-95 flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3 h-3" /> Start Roleplay
                            </button>
                          )}
                        </div>
                        
                        {ruleRoleplayState[rule.id]?.active && (
                          <div className="mb-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                             <div className="flex items-center gap-2 mb-2">
                               <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                                 <Bot className="w-3.5 h-3.5" />
                               </div>
                               <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Lexi Challenge</span>
                             </div>
                             <p className="text-sm font-bold text-indigo-900 leading-relaxed italic">
                               "{ruleRoleplayState[rule.id].scenario}"
                             </p>
                          </div>
                        )}

                        <div className="relative">
                          <textarea
                            value={ruleLabInput[rule.id] || ''}
                            onChange={(e) => setRuleLabInput(prev => ({ ...prev, [rule.id]: e.target.value }))}
                            placeholder={ruleRoleplayState[rule.id]?.active ? "Reply to Lexi using the rule..." : `Write a sentence using "${rule.title}"...`}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-indigo-500 min-h-[100px] resize-none"
                          />
                          <div className="absolute bottom-3 right-3 flex items-center gap-2">
                            <button
                               onClick={async () => {
                                 // Simple Voice trigger for Lab
                                 if (Capacitor.isNativePlatform()) {
                                   await SpeechRecognition.start({ language: 'en-US', partialResults: false, popup: true });
                                   SpeechRecognition.addListener('partialResults' as any, (data: any) => {
                                      if (data.matches && data.matches.length > 0) {
                                        setRuleLabInput(prev => ({ ...prev, [rule.id]: data.matches[0] }));
                                        checkRuleSentence(rule.id, rule.title, data.matches[0], !!ruleRoleplayState[rule.id]?.active);
                                      }
                                      SpeechRecognition.removeAllListeners();
                                   });
                                 } else {
                                   const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                                   if (SR) {
                                     const rec = new SR();
                                     rec.onresult = (e: any) => {
                                       const t = e.results[0][0].transcript;
                                       setRuleLabInput(prev => ({ ...prev, [rule.id]: t }));
                                       checkRuleSentence(rule.id, rule.title, t, !!ruleRoleplayState[rule.id]?.active);
                                     };
                                     rec.start();
                                   }
                                 }
                               }}
                               className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
                            >
                              <Mic className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => checkRuleSentence(rule.id, rule.title, ruleLabInput[rule.id] || '', !!ruleRoleplayState[rule.id]?.active)}
                              disabled={!ruleLabInput[rule.id]?.trim() || ruleLabFeedback[rule.id]?.type === 'loading'}
                              className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-30 active:scale-95 shadow-lg"
                            >
                              {ruleLabFeedback[rule.id]?.type === 'loading' ? 'Analyzing...' : 'Send to AI'}
                            </button>
                          </div>
                        </div>

                        {ruleLabFeedback[rule.id] && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mt-3 p-4 rounded-2xl border flex items-start gap-3 shadow-sm ${
                              ruleLabFeedback[rule.id].type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 
                              ruleLabFeedback[rule.id].type === 'loading' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                              'bg-rose-50 border-rose-100 text-rose-700'
                            }`}
                          >
                            <div className="shrink-0 mt-0.5">
                              {ruleLabFeedback[rule.id].type === 'success' ? <CheckCircle className="w-4 h-4" /> : 
                               ruleLabFeedback[rule.id].type === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
                               <AlertCircle className="w-4 h-4" />}
                            </div>
                            <div>
                               <p className="text-xs font-black uppercase tracking-widest mb-1">
                                 {ruleLabFeedback[rule.id].type === 'success' ? 'Brilliant!' : 
                                  ruleLabFeedback[rule.id].type === 'loading' ? 'Thinking...' : 'Needs Correction'}
                               </p>
                               <p className="text-xs font-bold leading-relaxed">
                                 {ruleLabFeedback[rule.id].text}
                               </p>
                            </div>
                          </motion.div>
                        )}
                        
                        {ruleRoleplayState[rule.id]?.active && (
                          <button
                            onClick={() => setRuleRoleplayState(prev => ({ ...prev, [rule.id]: { active: false, scenario: '', history: [] } }))}
                            className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
                          >
                            Exit Roleplay Mode
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          if (learnedRules.includes(rule.id)) return;
                          const newLearned = [...learnedRules, rule.id];
                          setLearnedRules(newLearned);
                          localStorage.setItem('learnedGrammarRules', JSON.stringify(newLearned));
                          addXp(15);
                          setAlertMessage("Mastery Gained! +15 XP ✨");
                        }}
                        disabled={learnedRules.includes(rule.id)}
                        className={`mt-6 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${learnedRules.includes(rule.id) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {learnedRules.includes(rule.id) ? 'Already Learned' : 'Mark as Learned'}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'test' && (
          <div className={`flex-1 p-6 lg:p-10 overflow-y-auto relative transition-colors duration-500 ${showClassicTest && testState !== 'start' ? 'bg-slate-50' : 'bg-slate-900 text-white'}`}>
            <div className="max-w-2xl mx-auto text-center mt-10">
              
              {/* --- TEST HUB --- */}
              {arenaState === 'idle' && !showClassicTest && (
                <div className="animate-in fade-in zoom-in duration-500">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-2xl animate-pulse" />
                    <Trophy className="w-24 h-24 text-amber-400 relative z-10 drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]" />
                  </div>
                  <h2 className="text-4xl font-black mb-4 tracking-tight">Training Center</h2>
                  <p className="text-slate-400 mb-10 max-w-sm mx-auto text-lg font-medium">
                    Choose your challenge. Master vocabulary through combat or precision testing.
                  </p>
                  
                  <div className="flex flex-col gap-5 max-w-sm mx-auto w-full">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={startArenaBattle}
                      className="w-full py-6 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-[2.5rem] shadow-xl shadow-orange-900/20 flex flex-col items-center justify-center gap-1 border-b-4 border-orange-800 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-white/20 w-full h-full -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      <span className="flex items-center gap-2 text-xl font-black"><Flame className="w-6 h-6" /> Boss Battle</span>
                      <span className="text-[10px] font-bold text-orange-100 uppercase tracking-[0.2em]">Sentence Striker Mode</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowClassicTest(true)}
                      className="w-full py-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-[2.5rem] shadow-xl shadow-indigo-900/20 flex flex-col items-center justify-center gap-1 border-b-4 border-indigo-900 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-white/20 w-full h-full -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      <span className="flex items-center gap-2 text-xl font-black"><GraduationCap className="w-6 h-6" /> Spelling Test</span>
                      <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-[0.2em]">Classic Mastery Mode</span>
                    </motion.button>
                    
                    <button
                      disabled
                      className="w-full py-5 bg-slate-800/50 text-slate-500 rounded-[2.5rem] border-2 border-slate-700/50 flex flex-col items-center justify-center gap-1 opacity-50 cursor-not-allowed"
                    >
                      <span className="flex items-center gap-2 text-lg font-black"><Zap className="w-5 h-5" /> Speed Sprint</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest">Coming Soon</span>
                    </button>
                  </div>
                </div>
              )}

              {/* --- CLASSIC SPELLING TEST --- */}
              {showClassicTest && (
                <div className={`animate-in fade-in slide-in-from-bottom-8 duration-500 w-full`}>
                  {testState === 'start' && (
                    <div className="bg-white text-slate-900 rounded-[3rem] p-10 shadow-2xl border border-slate-100">
                      <button 
                        onClick={() => setShowClassicTest(false)}
                        className="absolute top-6 left-6 p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 mx-auto mb-6">
                        <GraduationCap className="w-10 h-10" />
                      </div>
                      <h2 className="text-3xl font-black mb-3 text-slate-900">Vocabulary Mastery</h2>
                      <p className="text-slate-500 mb-10 text-sm font-medium px-4">
                        Test your knowledge of the words you've learned. Choose your difficulty level and mode.
                      </p>

                      <div className="mb-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Set Difficulty</p>
                        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] max-w-xs mx-auto border border-slate-200">
                          {(['easy', 'medium', 'hard'] as const).map((d) => (
                            <button
                              key={d}
                              onClick={() => setTestDifficulty(d)}
                              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${testDifficulty === d ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                          onClick={() => startTest('listen-mcq')}
                          className="p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center gap-3 group"
                        >
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                            <Volume2 className="w-6 h-6" />
                          </div>
                          <span className="font-black text-slate-900">Listen & Choose</span>
                        </button>
                        
                        <button
                          onClick={() => startTest('listen-type')}
                          className="p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center gap-3 group"
                        >
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                            <PenTool className="w-6 h-6" />
                          </div>
                          <span className="font-black text-slate-900">Listen & Type</span>
                        </button>
                        
                        <button
                          onClick={() => startTest('visual-mcq')}
                          className="p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center gap-3 group"
                        >
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                            <Book className="w-6 h-6" />
                          </div>
                          <span className="font-black text-slate-900">Visual MCQ</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            if (hasPremium) startTest('meaning-mcq');
                            else setSubscriptionModalOpen(true);
                          }}
                          className={`p-6 border-2 rounded-3xl transition-all flex flex-col items-center gap-3 group relative ${hasPremium ? 'bg-slate-50 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50' : 'bg-slate-50/50 border-slate-50 opacity-80'}`}
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${hasPremium ? 'bg-white text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <span className="font-black text-slate-900">Context King</span>
                          {!hasPremium && <Lock className="w-3 h-3 absolute top-3 right-3 text-slate-300" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {testState === 'testing' && (
                    <div className="bg-white text-slate-900 rounded-[3rem] p-8 shadow-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-8">
                        <button
                          onClick={async () => {
                            const { value } = await Dialog.confirm({
                              title: 'Exit Test?',
                              message: 'Progress will be lost. Exit anyway?',
                              okButtonTitle: 'Yes, Exit',
                              cancelButtonTitle: 'Stay'
                            });
                            if (value) {
                              setTestState('start');
                              setShowClassicTest(false);
                            }
                          }}
                          className="flex items-center gap-1.5 text-slate-400 hover:text-rose-500 transition-colors font-black text-[10px] uppercase tracking-widest"
                        >
                          <ChevronLeft className="w-4 h-4" /> Exit
                        </button>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] bg-indigo-50 px-3 py-1.5 rounded-lg">
                          Word {currentTestWordIndex + 1} / {testWords.length}
                        </span>
                      </div>

                      {/* Timer Bar */}
                      <div className="w-full h-2 bg-slate-100 rounded-full mb-10 overflow-hidden">
                        <motion.div
                          animate={{ width: `${(timeLeft / 15) * 100}%` }}
                          transition={{ duration: 1, ease: 'linear' }}
                          className={`h-full ${timeLeft < 5 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                        />
                      </div>

                      {testMode !== 'visual-mcq' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => playWord(testWords[currentTestWordIndex])}
                          className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-xl shadow-indigo-200"
                        >
                          <Volume2 className="w-10 h-10" />
                        </motion.button>
                      )}

                      {(testMode === 'meaning-mcq' || testMode === 'visual-mcq') && (
                        <div className="mb-10 p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center animate-in zoom-in">
                          {(() => {
                            const wordObj = completeWordPool.find(w => (w.word || '').toLowerCase() === (testWords[currentTestWordIndex] || '').toLowerCase());
                            if (!wordObj) return null;
                            return (
                              <div className="space-y-4">
                                {testMode === 'visual-mcq' && (
                                  <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">Identify the correct spelling</p>
                                )}
                                <p className="text-3xl font-black text-slate-900">{wordObj.meaning}</p>
                                <div className="h-px bg-slate-200 w-12 mx-auto" />
                                <p className="text-lg font-medium text-slate-600 italic">"{wordObj.example.replace(new RegExp(wordObj.word, 'gi'), '_____')}"</p>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {testMode === 'listen-type' ? (
                        <div className="max-w-sm mx-auto space-y-6">
                          <input
                            type="text"
                            value={typedAnswer}
                            onChange={e => setTypedAnswer(e.target.value)}
                            className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-2xl font-black text-center outline-none focus:border-indigo-500 transition-all"
                            placeholder="Type what you hear..."
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleAnswerSubmit(typedAnswer)}
                          />
                          <button
                            onClick={() => handleAnswerSubmit(typedAnswer)}
                            className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-all"
                          >
                            Check Answer
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                          {mcqOptions[currentTestWordIndex]?.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() => handleAnswerSubmit(opt)}
                              className="p-5 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 hover:border-indigo-500 hover:bg-indigo-50 transition-all active:scale-95 text-lg"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {feedbackState !== 'none' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`mt-8 p-6 rounded-3xl flex items-center justify-center gap-3 ${feedbackState === 'correct' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}
                        >
                          {feedbackState === 'correct' ? <CheckCircle className="w-6 h-6" /> : <X className="w-6 h-6" />}
                          <span className="text-xl font-black">{feedbackState === 'correct' ? 'Excellent!' : feedbackState === 'timeout' ? 'Time Out!' : 'Incorrect'}</span>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {testState === 'results' && (
                    <div className="bg-white text-slate-900 rounded-[3rem] p-10 shadow-2xl border border-slate-100 text-center">
                      <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center text-amber-500 mx-auto mb-6 shadow-inner">
                        <Trophy className="w-12 h-12" />
                      </div>
                      <h2 className="text-4xl font-black mb-2">Test Complete!</h2>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-10">You've leveled up your skills</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-10">
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <p className="text-3xl font-black text-indigo-600">{userAnswers.filter((ans, i) => (ans || '').toLowerCase() === (testWords[i] || '').toLowerCase()).length}</p>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correct</p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                           <p className="text-3xl font-black text-slate-900">+{userAnswers.filter((ans, i) => (ans || '').toLowerCase() === (testWords[i] || '').toLowerCase()).length * 10} XP</p>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gained</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setTestState('start');
                          setShowClassicTest(false);
                        }}
                        className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-xl hover:bg-indigo-600 transition-all active:scale-95"
                      >
                        Finish Review
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* --- BOSS BATTLE (ARENA) --- */}
              {arenaState !== 'idle' && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                  {/* Exit/Flee Header */}
                  <div className="flex justify-between items-center mb-6">
                    <button 
                      onClick={() => setArenaState('idle')}
                      className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors px-3 py-1.5 bg-slate-800 rounded-lg shadow-sm active:scale-95 border border-slate-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Flee</span>
                    </button>
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20 flex items-center gap-1"><Flame className="w-3 h-3"/> Boss Battle</span>
                  </div>
                  
                  {arenaState === 'battling' && arenaWordObj && (
                    <>
                      {/* Monster UI */}
                      <div className="relative w-48 h-48 mx-auto mb-8">
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
                        <img 
                          src="https://api.dicebear.com/7.x/bottts/svg?seed=Monster&backgroundColor=transparent" 
                          alt="Monster" 
                          className={`w-full h-full object-contain relative z-10 transition-transform duration-300 ${arenaFeedback ? 'scale-90 opacity-80' : 'animate-bounce'}`} 
                        />
                        
                        {/* HP Bar */}
                        <div className="absolute -bottom-6 w-full bg-slate-800 rounded-full h-4 border border-slate-700 overflow-hidden">
                          <div 
                            className="h-full bg-red-500 transition-all duration-500" 
                            style={{ width: `${arenaHp}%` }}
                          />
                        </div>
                        <div className="absolute -bottom-6 w-full text-center text-[10px] font-black">{arenaHp}/100 HP</div>
                      </div>

                      {/* Feedback Overlay */}
                      {arenaFeedback && (
                         <div className="mb-6 p-4 rounded-xl border animate-in slide-in-from-top-4 bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                            <h4 className={`text-2xl font-black mb-1 ${arenaFeedback.crit ? 'text-orange-500' : 'text-slate-300'}`}>
                              -{arenaFeedback.damage} DAMAGE {arenaFeedback.crit && "CRITICAL HIT!"}
                            </h4>
                            <p className="text-slate-400 text-sm">{arenaFeedback.msg}</p>
                         </div>
                      )}

                      {/* Weapon (Word) */}
                      <div className="mb-8">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Your Weapon</p>
                        <div className="inline-block px-6 py-3 bg-slate-800 border-2 border-slate-600 rounded-2xl">
                          <span className="text-2xl font-black text-indigo-400">{arenaWordObj.word}</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-2 italic">{arenaWordObj.meaning}</p>
                      </div>

                      {/* Input */}
                      <div className="flex flex-col gap-4">
                        <div className="relative">
                          <input
                            type="text"
                            disabled={arenaLoading}
                            value={arenaInput}
                            onChange={(e) => setArenaInput(e.target.value)}
                            placeholder="Type a sentence using the word..."
                            className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl pl-6 pr-14 py-4 text-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                            onKeyDown={(e) => e.key === 'Enter' && evaluateArenaSentence()}
                          />
                          <button
                            onClick={() => {
                              if (arenaWordObj && (arenaWordObj as any).example) {
                                const word = (arenaWordObj as any).word;
                                const example = (arenaWordObj as any).example;
                                const hint = example.replace(new RegExp(word, 'gi'), '_____');
                                Dialog.alert({
                                  title: 'Lexi Hint 🤖',
                                  message: `Think of a context like this:\n"${hint}"`,
                                });
                              }
                            }}
                            title="Lexi Hint"
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40 hover:text-white rounded-lg flex items-center justify-center transition-all"
                          >
                            <Bot className="w-5 h-5" />
                          </button>
                        </div>
                        <button
                          onClick={evaluateArenaSentence}
                          disabled={arenaLoading || !arenaInput.trim()}
                          className="w-full py-4 bg-indigo-600 rounded-2xl font-black text-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {arenaLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Sword className="w-6 h-6" />}
                          {arenaLoading ? "Attacking..." : "Attack"}
                        </button>
                      </div>
                    </>
                  )}

                  {arenaState === 'result' && (
                    <div className="animate-in zoom-in duration-500 py-10">
                      <Trophy className="w-32 h-32 text-yellow-500 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" />
                      <h2 className="text-5xl font-black mb-4">VICTORY!</h2>
                      <p className="text-slate-400 mb-8 text-lg">You destroyed the Grammar Monster and earned 500 XP!</p>
                      <button
                        onClick={() => setArenaState('idle')}
                        className="px-8 py-4 bg-indigo-600 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                      >
                        Play Again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50/50">
            <div className="max-w-3xl mx-auto space-y-8 pb-10">
              
              {/* Premium Glassmorphic Header */}
              <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-600 p-8 shadow-2xl shadow-indigo-100">
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
                
                <div className="relative flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white/20 backdrop-blur-md rounded-[2rem] border-4 border-white/30 flex items-center justify-center text-white text-4xl font-black shadow-inner overflow-hidden">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        user?.displayName?.[0] || displayName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <button
                      onClick={handleProfileImagePick}
                      className="absolute -bottom-2 -right-2 p-2.5 bg-white rounded-2xl shadow-lg border border-indigo-100 text-indigo-600 hover:scale-110 active:scale-90 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    {isEditingProfile ? (
                      <div className="flex flex-col gap-3">
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="text-xl font-bold bg-white/10 border border-white/20 text-white rounded-xl px-4 py-2 outline-none focus:bg-white/20 transition-all w-full placeholder-white/50"
                          placeholder="Your Name"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            setIsEditingProfile(false);
                            localStorage.setItem('userName', displayName);
                            if (user) {
                              await FirebaseFirestore.setDocument({
                                reference: 'users/' + user.uid,
                                data: { displayName },
                                merge: true
                              });
                            }
                            setAlertMessage("Profile updated! ✨");
                          }}
                          className="bg-white text-indigo-600 text-xs font-black py-2.5 rounded-xl uppercase px-6 hover:bg-slate-50 transition-colors shadow-lg shadow-indigo-900/20 w-fit mx-auto sm:mx-0"
                        > Save Changes </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-center sm:justify-start gap-3">
                          <h2 className="text-3xl font-black text-white tracking-tight break-words line-clamp-2 leading-tight">{displayName}</h2>
                          <button onClick={() => setIsEditingProfile(true)} className="p-1.5 text-white/60 hover:text-white transition-colors bg-white/10 rounded-lg"><Sliders className="w-3.5 h-3.5" /></button>
                        </div>
                        <p className="text-white/70 font-bold text-xs uppercase tracking-[0.15em] flex items-center justify-center sm:justify-start gap-2">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          {user?.email === MASTER_ADMIN_EMAIL ? 'Master Admin' : 'Premium Member'}
                        </p>

                      </div>
                    )}
                  </div>
                </div>
                
                {/* Level Progress Bar in Header */}
                <div className="mt-8 relative pt-4">
                   <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Growth Level</span>
                      <span className="text-white font-black text-sm">LVL {level}</span>
                   </div>
                   <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(xp / (level * 100 * level)) * 100}%` }}
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
                      />
                   </div>
                   <div className="mt-1 flex justify-between">
                     <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{xp} XP Today</span>
                     <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{Math.max(0, level * 100 * level - xp)} XP to next level</span>
                   </div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-2">
                       <Flame className="w-6 h-6" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">{streak}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Day Streak</p>
                 </div>
                 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-2">
                       <Trophy className="w-6 h-6" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">#{leaderboard.findIndex(u => u.name === (user?.displayName || displayName)) + 1 || '-'}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Rank</p>
                 </div>
              </div>

              {/* Progress & Challenges Content */}
              <div className="space-y-6">
                
                {/* Weekly Analytics Section */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600" /> Weekly Effort
                    </h3>
                  </div>
                  <div className="flex items-end justify-between h-24 gap-2">
                    {xpHistory.map((val, i) => {
                      const maxVal = Math.max(...xpHistory, 100);
                      const height = (val / maxVal) * 100;
                      const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                      const todayIndex = new Date().getDay();
                      const label = days[(todayIndex - 6 + i + 7) % 7];
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full bg-slate-50 border border-slate-100 rounded-lg relative overflow-hidden h-full">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${height}%` }}
                              className="absolute bottom-0 left-0 right-0 bg-indigo-600 rounded-t-sm"
                            />
                          </div>
                          <span className="text-[8px] font-bold text-slate-400">{label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Daily Challenges */}
                <div>
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Daily Missions</h3>
                   <div className="grid grid-cols-1 gap-3">
                      {missions.map(m => (
                        <div key={m.id} className={`p-5 rounded-[1.5rem] border transition-all ${m.completed ? 'bg-green-50/50 border-green-100 shadow-sm' : 'bg-white border-slate-100'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-start gap-3">
                               <div className={`p-2 rounded-xl ${m.completed ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                                  {m.id.startsWith('correct') ? <Search className="w-4 h-4" /> : m.id.startsWith('test') ? <GraduationCap className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                               </div>
                               <div>
                                  <p className="text-sm font-black text-slate-900">{m.title}</p>
                                  <p className="text-[10px] font-bold text-slate-500">{m.desc}</p>
                               </div>
                            </div>
                            {m.completed && <CheckCircle className="w-4 h-4 text-green-500" />}
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-700 ${m.completed ? 'bg-green-500' : 'bg-indigo-600'}`}
                              style={{ width: `${Math.min(100, (m.current / m.goal) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-2">
                             <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-slate-900">{m.current}</span>
                                <span className="text-gray-300 text-[8px] font-bold">/</span>
                                <span className="text-[9px] font-bold text-slate-400">{m.goal}</span>
                             </div>
                             <span className="text-[9px] font-black text-indigo-600">+{m.reward} XP</span>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Achievement Badges Section */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Achievements</h3>
                   <div className="flex items-center justify-around gap-2">
                      {badges.map(b => (
                        <div key={b.id} className={`flex flex-col items-center gap-2 group ${b.earned ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                           <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-lg transition-transform group-hover:scale-110 ${b.earned ? 'bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200 shadow-amber-100' : 'bg-slate-100'}`}>
                              {b.icon}
                           </div>
                           <span className="text-[8px] font-black text-slate-700 uppercase">{b.title.split(' ')[0]}</span>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Saved Vocabulary Section */}
                <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
                    <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
                      <Bookmark className="w-4 h-4" /> Saved Vocabulary
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full">{savedWords.length}</span>
                      {savedWords.length > 0 && (
                        <button 
                          onClick={() => {
                            if(window.confirm("Clear all saved words?")) {
                              setSavedWords([]);
                              FirebaseFirestore.deleteDocument({ reference: `users/${user?.uid}/saved_words` }).catch(() => {});
                            }
                          }}
                          className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {savedWords.length > 0 && (
                    <div className="px-4 py-3 border-b border-slate-50 bg-white">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                          type="text"
                          value={savedSearchQuery}
                          onChange={(e) => setSavedSearchQuery(e.target.value)}
                          placeholder="Search saved words..."
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-100 rounded-xl text-xs font-medium outline-none focus:border-indigo-300 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-4 grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                    {savedWords.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 italic text-xs">No words saved yet.</div>
                    ) : savedWords.filter(w => (w.word || '').toLowerCase().includes((savedSearchQuery || '').toLowerCase())).length === 0 ? (
                      <div className="py-8 text-center text-slate-400 italic text-xs">No matching words found.</div>
                    ) : (
                      savedWords
                        .filter(w => (w.word || '').toLowerCase().includes((savedSearchQuery || '').toLowerCase()))
                        .sort((a,b) => b.savedAt - a.savedAt)
                        .map((sw, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900 capitalize">{sw.word}</p>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{sw.meaning}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => playWord(sw.word)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Volume2 className="w-4 h-4"/></button>
                            <button onClick={() => toggleSaveWord(sw)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Leaderboard Redesign */}
              <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <Trophy className="w-32 h-32 rotate-12" />
                </div>
                <div className="flex items-center justify-between mb-8 relative z-10">
                   <h3 className="text-xl font-black flex items-center gap-3">
                      <Trophy className="w-6 h-6 text-amber-400" /> World Rankings
                   </h3>
                   <button 
                     onClick={() => setShowAllRankings(!showAllRankings)}
                     className="text-[10px] font-black bg-white/10 px-4 py-2 rounded-full uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10"
                   >
                     {showAllRankings ? 'Condensed' : 'Top 10'}
                   </button>
                </div>
                
                <div className="space-y-2 relative z-10">
                   {leaderboard.length === 0 ? (
                      <p className="text-center py-10 opacity-40 font-bold uppercase tracking-widest animate-pulse">Synchronizing Rankings...</p>
                   ) : (
                      (showAllRankings ? leaderboard : leaderboard.slice(0, 5)).map((u, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all ${user?.displayName === u.name ? 'bg-indigo-600/30 border-indigo-400/50' : 'bg-white/5 border-white/5'}`}
                        >
                          {/* Rank number removed as requested */}
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 border border-white/10 shrink-0 flex items-center justify-center">
                             {u.photoURL ? (
                               <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" />
                             ) : (
                               <User className="w-5 h-5 text-white/20" />
                             )}
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="font-bold text-white truncate">{u.name || "Explorer"}</p>
                             <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${i < 3 ? 'bg-white/20 text-white' : 'text-white/40'}`}>Level {u.level || 1}</span>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="font-black text-amber-400">{u.xp?.toLocaleString()}</p>
                             <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em]">Total XP</p>
                          </div>
                        </motion.div>
                      ))
                   )}
                </div>
              </div>

               {/* Streak Shield Section */}
               <div className="p-6 bg-gradient-to-br from-orange-500 to-amber-600 rounded-[2rem] text-white shadow-xl shadow-orange-100/50 flex items-center justify-between overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Star className="w-20 h-20 rotate-45 fill-white" />
                  </div>
                  <div className="relative z-10">
                    <h4 className="font-black flex items-center gap-2 mb-1">
                      <Star className="w-5 h-5 fill-white" /> Streak Shield
                    </h4>
                    <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Auto-protects your daily streak</p>
                  </div>
                  <div className="text-right relative z-10">
                    <p className="text-3xl font-black">{streakShields}</p>
                    <p className="text-[9px] font-black uppercase opacity-60">Ready</p>
                  </div>
               </div>

              {/* Settings Grid */}
              <div className="space-y-4 pb-4">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                   <Settings className="w-3 h-3" /> Preferences
                 </h3>
                 <div className="grid grid-cols-1 gap-2">
                    
                    {[
                      { icon: <Moon className="w-5 h-5" />, label: "Display Theme", action: () => setTheme(theme === 'light' ? 'dark' : 'light'), sub: theme === 'light' ? 'Light Mode' : 'Dark Mode', color: "text-indigo-600 bg-indigo-50" },
                      { icon: <Volume2 className="w-5 h-5" />, label: "Sound Effects", action: () => { const nv = !soundEnabled; setSoundEnabled(nv); localStorage.setItem('soundEnabled', nv.toString()); }, sub: soundEnabled ? 'On' : 'Off', color: "text-amber-600 bg-amber-50" },
                      { icon: <Bell className="w-5 h-5" />, label: "Daily Notifications", action: () => { setDraftReminderTime(reminderTime); setReminderPopoverOpen(true); }, sub: reminderTime, color: "text-orange-600 bg-orange-50" },
                      { icon: <Sliders className="w-5 h-5" />, label: "Speech & Voice", action: () => setSpeechSettingsOpen(true), sub: "Custom Voices", color: "text-purple-600 bg-purple-50" },
                      { icon: <Share2 className="w-5 h-5" />, label: "Recommend App", action: handleShareApp, sub: "Share with friends", color: "text-blue-600 bg-blue-50" },
                    ].map((item, idx) => (
                      <button key={idx} onClick={item.action} className="w-full bg-white p-4 flex items-center justify-between rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-md active:scale-[0.98] transition-all">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center`}>
                              {item.icon}
                           </div>
                           <div className="text-left">
                              <p className="font-black text-slate-900 text-sm">{item.label}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.sub}</p>
                           </div>
                        </div>
                        <ChevronLeft className="w-5 h-5 text-slate-200 rotate-180" />
                      </button>
                    ))}
                    
                    <div className="pt-6 space-y-3">
                       <button onClick={handleSignOut} className="w-full bg-red-50 p-5 flex items-center justify-between rounded-2xl border border-red-100 group transition-all hover:bg-red-100/50">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-600 shadow-sm transition-transform group-active:scale-90">
                                <LogIn className="w-5 h-5 rotate-180" />
                             </div>
                             <p className="font-black text-red-600 text-sm">Sign Out Account</p>
                          </div>
                          <ChevronLeft className="w-5 h-5 text-red-100 rotate-180" />
                       </button>
                       <button onClick={handleDeleteAccount} className="w-full p-4 flex items-center justify-center text-rose-300 hover:text-rose-500 transition-colors text-[10px] font-black uppercase tracking-[0.2em]">
                          Permanently Delete Account
                       </button>
                    </div>

                 </div>
              </div>

              {/* Stealthy Admin Dashboard */}
              {user?.email === MASTER_ADMIN_EMAIL && (
                <div className="mt-10 mb-20">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer list-none bg-slate-100 p-6 rounded-[2.5rem] border border-slate-200 shadow-inner">
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                        <Lock className="w-4 h-4" /> Admin Console
                      </h3>
                      <ChevronLeft className="w-5 h-5 text-slate-300 rotate-[-90deg] group-open:rotate-[90deg] transition-all" />
                    </summary>
                    <div className="p-6 space-y-4">
                       <div className="grid grid-cols-2 gap-3">
                          {[
                            { l: "Device", v: Capacitor.getPlatform() },
                            { l: "Auth Status", v: user ? 'Authenticated' : 'Anon' },
                            { l: "Ads Status", v: adReady ? 'Ready' : 'Pending' },
                            { l: "User UID", v: user?.uid?.slice(0,10) }
                          ].map((stat, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.l}</p>
                               <p className="text-xs font-black text-slate-900 truncate">{stat.v}</p>
                            </div>
                          ))}
                       </div>
                       <div className="p-5 bg-white rounded-2xl border border-slate-200 font-mono text-[9px] text-slate-400 max-h-40 overflow-y-auto shadow-inner">
                          <p className="mb-2 border-b border-slate-100 pb-1 text-slate-600 uppercase">Live Trace Log</p>
                          {errorLog.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
                       </div>
                    </div>
                  </details>
                </div>
              )}

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

              {/* Dictionary content is now always unlocked */}
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

              {/* Error State */}
              {dictError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
                  <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                  <p className="text-red-700 font-medium">{dictError}</p>
                </div>
              )}

              {/* Empty State / Search Hints */}
              {!dictResult && !dictLoading && !dictError && (
                <div className="mt-12 text-center py-10 px-4">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-sm">
                    <Search className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Search any word!</h3>
                  <p className="text-slate-500 text-sm max-w-[250px] mx-auto font-medium mb-8 leading-relaxed">
                    Get instant meanings, synonyms, antonyms, and Hindi translations.
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                    {['Adventure', 'Serendipity', 'Eloquent', 'Persistence', 'Euphoria', 'Ambition'].map(hint => (
                      <button 
                        key={hint}
                        onClick={() => {
                          setDictQuery(hint);
                          searchDictionary(hint);
                        }}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Result Card */}
              {dictResult && (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-indigo-900/5 overflow-hidden">
                  {/* Top Section */}
                  <div className="p-6 relative">
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <h3 className="text-3xl font-black text-slate-900 capitalize tracking-tight mb-1">{dictResult.word}</h3>
                        {dictResult.phonetic && (
                          <p className="text-indigo-500 font-bold text-sm tracking-widest uppercase">{dictResult.phonetic}</p>
                        )}
                      </div>
                      {dictAudio && (
                        <button
                          onClick={() => dictAudio.play()}
                          className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-full transition-all active:scale-95 shadow-sm"
                          title="Play pronunciation"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="mt-6 flex gap-3 relative z-10">
                      <button
                        onClick={handleTranslateDict}
                        disabled={isTranslating}
                        className={`flex-1 py-3.5 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                          isTranslating ? 'bg-slate-100 text-slate-400' 
                          : hindiTranslation ? 'bg-amber-50 border border-amber-100 text-amber-700 hover:bg-amber-100' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:shadow-lg active:scale-95'
                        }`}
                      >
                        {isTranslating ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Languages className="w-4 h-4" />
                            {hindiTranslation ? 'Refresh Translation' : 'Hindi Meaning'}
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          if (!dictResult) return;
                          const wordToAdd = {
                            word: dictResult.word,
                            meaning: hindiTranslation || (dictResult.meanings[0]?.definitions[0]?.definition || 'No definition'),
                            example: dictResult.meanings[0]?.definitions[0]?.example || 'No example available',
                            category: 'Custom'
                          };
                          setCustomWords(prev => [wordToAdd, ...prev]);
                          const updatedCustom = [wordToAdd, ...customWords];
                          localStorage.setItem('customWords', JSON.stringify(updatedCustom));
                          setAlertMessage(`"${dictResult.word}" added to your dictionary! ✨`);
                        }}
                        className="px-6 py-3.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Save
                      </button>
                    </div>

                    {/* Translation Result */}
                    <AnimatePresence>
                      {hindiTranslation && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          className="mt-4 overflow-hidden"
                        >
                          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/50 p-5 rounded-2xl">
                            <div className="flex items-center gap-1.5 mb-2 text-amber-700 font-black uppercase text-[10px] tracking-widest">
                              <CheckCircle className="w-3 h-3" /> Hindi Translation
                            </div>
                            <p className="font-sans text-lg text-slate-800 font-bold">
                              {hindiTranslation}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Smart Thesaurus */}
                    {(smartThesaurus || isRefiningThesaurus) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1.5 text-indigo-700 font-black uppercase text-[10px] tracking-widest">
                            <Sparkles className="w-3 h-3" /> Smart Thesaurus
                          </div>
                          {isRefiningThesaurus && (
                            <div className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                          )}
                        </div>

                        {smartThesaurus && (
                          <div className="space-y-4">
                            <div>
                              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <CheckCircle className="w-3 h-3" /> Verified Synonyms
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {smartThesaurus.synonyms.map((syn, sIdx) => (
                                  <button
                                    key={sIdx}
                                    onClick={() => { setDictQuery(syn); searchDictionary(syn); }}
                                    className="px-3 py-1 bg-white text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100 hover:bg-emerald-50 transition-colors shadow-sm"
                                  >
                                    {syn}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <X className="w-3 h-3" /> Verified Antonyms
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {smartThesaurus.antonyms.map((ant, aIdx) => (
                                  <button
                                    key={aIdx}
                                    onClick={() => { setDictQuery(ant); searchDictionary(ant); }}
                                    className="px-3 py-1 bg-white text-rose-700 text-xs font-bold rounded-lg border border-rose-100 hover:bg-rose-50 transition-colors shadow-sm"
                                  >
                                    {ant}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  <div className="h-px bg-slate-100 mx-6"></div>

                  <div className="p-6 space-y-6">
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

                          {/* Synonyms & Antonyms (Premium Feature) - Hidden if Smart Thesaurus is active */}
                          {!smartThesaurus && !isRefiningThesaurus && (
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

        {activeTab === 'ai-coach' && (
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

            <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-slate-200 z-10">
              <div className="max-w-2xl mx-auto">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleAiSendMessage(); }}
                  className="flex items-center gap-1.5 sm:gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all"
                >
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Message your coach..."
                    className="flex-1 bg-transparent border-none outline-none pl-3 pr-1 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 min-w-0"
                  />
                  <div className="flex items-center gap-1 shrink-0 px-1">
                    {/* AI Call hidden for production release */}
                    {/* <button
                      type="button"
                      onClick={handleStartCall}
                      className="p-2.5 text-indigo-600 hover:bg-white rounded-xl transition-all active:scale-90"
                      title="Call Lexi"
                    >
                      <Phone className="w-5 h-5" />
                    </button> */}
                    <button
                      type="button"
                      onClick={startListening}
                      className={`p-2.5 rounded-xl transition-all active:scale-90 ${isListening ? 'bg-rose-100 text-rose-600 animate-pulse' : 'text-slate-400 hover:bg-white hover:text-indigo-600'}`}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <button
                      type="submit"
                      disabled={!aiInput.trim() || isAiLoading}
                      className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-lg shadow-indigo-200 active:scale-90 ml-1"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
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
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-indigo-100">
              <div className="bg-indigo-600 p-8 text-white relative">
                <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="flex justify-between items-center relative z-10">
                  <div>
                    <h3 className="text-2xl font-black">AI Voice Config</h3>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">Select your learning partner</p>
                  </div>
                  <button
                    onClick={() => setSpeechSettingsOpen(false)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Personality</label>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md uppercase">High Quality</span>
                  </div>
                  
                  <div className="max-h-[320px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    <div className="grid grid-cols-1 gap-3">
                      {availableVoices.filter(v => v.lang.startsWith('en-')).map((voice, i) => (
                        <button
                          key={voice.voiceURI}
                          onClick={() => {
                            setSelectedVoiceURI(voice.voiceURI);
                            localStorage.setItem('selectedVoiceURI', voice.voiceURI);
                            playWord("Hello, I am Lexi.");
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all text-left relative group flex items-center gap-4 ${selectedVoiceURI === voice.voiceURI 
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100' 
                            : 'border-slate-100 hover:border-indigo-200 bg-white'}`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedVoiceURI === voice.voiceURI ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {(voice.name || '').toLowerCase().includes('google') ? <Bot className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-black uppercase tracking-tight truncate ${selectedVoiceURI === voice.voiceURI ? 'text-indigo-900' : 'text-slate-800'}`}>
                              {voice.name.replace('English (United States)', 'US').replace('English (India)', 'IN').replace('English (United Kingdom)', 'UK')}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                              {voice.lang} • {(voice.name || '').toLowerCase().includes('female') || (voice.name || '').toLowerCase().includes('aditi') ? 'Female' : 'Male'}
                            </p>
                          </div>
                          
                          {selectedVoiceURI === voice.voiceURI && (
                            <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Speech Speed</label>
                    <span className="text-xs font-black text-indigo-600">{speechRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[8px] font-black text-slate-400 mt-3 uppercase tracking-widest px-1">
                    <span>Turtle</span>
                    <span>Rabbit</span>
                  </div>
                </div>

                <button
                  onClick={() => setSpeechSettingsOpen(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 active:scale-95 transition-all"
                >
                  Apply & Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Modal — DISABLED: App is fully free */}
        {false && subscriptionModalOpen && null}

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
            {dailyWordsLearned < dailyWords.length && (
              <span className="absolute -top-1 -right-1 px-1.5 min-w-[20px] h-5 bg-pink-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black">
                {dailyWords.length - dailyWordsLearned}
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
                            if (dailyWordsLearned < dailyWords.length) {
                              const newLearned = dailyWordsLearned + 1;
                              setDailyWordsLearned(newLearned);
                              localStorage.setItem('dailyWordsLearned', newLearned.toString());
                              addXp(20);
                              if (newLearned === dailyWords.length) {
                                addXp(100); // Adjusted bonus for 5 words
                                setAlertMessage("🏆 Challenge Complete! +100 XP Bonus!");
                              }
                            }
                          }}
                          disabled={dailyWordsLearned >= dailyWords.length || (currentDailyIndex < dailyWordsLearned)}
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
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-slate-900 font-black text-sm">
                            {currentDailyIndex + 1} / {dailyWords.length}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
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
                try { SpeechRecognition.stop(); } catch(e) { console.warn('SR stop error:', e); }
                try { SpeechRecognition.removeAllListeners(); } catch(e) {}
                setIsListening(false);
              }}
              isListening={isListening}
              isSpeaking={isLexiSpeaking}
              lastMessage={aiChat.filter(m => m.role === 'model').slice(-1)[0]?.content}
            />
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

const CallOverlay = ({ isOpen, onClose, isListening, isSpeaking, lastMessage }: any) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 backdrop-blur-xl bg-opacity-95"
    >
      <div className="absolute top-[calc(2.5rem+var(--safe-area-top))] left-0 right-0 text-center">
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em] mb-2">Voice Call</p>
        <h2 className="text-2xl font-black text-white">Lexi AI</h2>
      </div>

      <div className="relative mb-12">
        {/* Animated Orbs */}
        <motion.div
          animate={{ scale: (isListening || isSpeaking) ? [1, 1.15, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-700 ${isListening ? 'bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-[0_0_80px_rgba(79,70,229,0.5)]' : isSpeaking ? 'bg-gradient-to-br from-purple-500 to-rose-400 shadow-[0_0_80px_rgba(168,85,247,0.5)]' : 'bg-slate-800 shadow-none'}`}
        >
          <div className="w-40 h-40 bg-slate-900/40 rounded-full backdrop-blur-md flex items-center justify-center">
            <motion.div
               animate={{ rotate: isListening ? 360 : 0, scale: isSpeaking ? [1, 1.1, 1] : 1 }}
               transition={{ rotate: { repeat: Infinity, duration: 8, ease: "linear" }, scale: { repeat: Infinity, duration: 2 } }}
            >
              <Bot className={`w-20 h-20 transition-colors duration-500 ${isListening ? 'text-cyan-300' : isSpeaking ? 'text-rose-300' : 'text-slate-500'}`} />
            </motion.div>
          </div>
        </motion.div>
        
        {(isListening || isSpeaking) && (
           <motion.div 
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
             transition={{ repeat: Infinity, duration: 2 }}
             className={`absolute inset-0 border-4 rounded-full ${isListening ? 'border-cyan-400' : 'border-rose-400'}`}
           />
        )}
      </div>

      <div className="text-center max-w-xs mb-20 min-h-[80px] flex flex-col items-center justify-center">
        {isListening ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(i => (
                <motion.div
                  key={i}
                  animate={{ height: [10, 24, 10] }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                  className="w-1.5 bg-cyan-400 rounded-full"
                />
              ))}
            </div>
            <p className="text-cyan-300 font-black text-xs tracking-widest uppercase">Lexi is Listening...</p>
          </div>
        ) : isSpeaking ? (
          <div className="flex flex-col items-center gap-3">
             <p className="text-rose-300 font-black text-xs tracking-widest uppercase animate-pulse">Lexi is Speaking...</p>
             <p className="text-white/90 font-medium text-lg italic leading-relaxed px-4">
              {lastMessage}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-2" />
            <p className="text-slate-500 font-black text-xs tracking-widest uppercase">Lexi is Thinking...</p>
          </div>
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
