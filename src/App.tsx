// --- GLOBAL ERROR DIAGNOSTICS (Production-Safe) ---
if (typeof window !== 'undefined') {
  console.log("LexiQuest JS Bundle Executing...");
  window.onerror = (msg, url, line, col, error) => {
    console.error(`CRITICAL JS ERROR: ${msg} \nAt: ${url}:${line}:${col} \nObject: ${JSON.stringify(error)}`);
  };
}
// -------------------------------------

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { AdMob, BannerAdPosition } from '@capacitor-community/admob';
import { App as CapApp } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';
import { Book, BookOpen, Search, Settings, Plus, Trash2, CheckCircle, AlertCircle, FileText, GraduationCap, PenTool, Pencil, Lock, Unlock, Volume2, X, Sliders, Bell, Flame, Save, Download, Upload, Share2, Clock, ChevronLeft, Star, LogIn, UserPlus, Target, Sparkles, Send, Bot, MessageSquare, RefreshCw, Info, Languages, Mic, Moon, Sun, BarChart3, Trophy, Phone, Bookmark, PhoneOff, User, Sword, Zap } from 'lucide-react';
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

// Deterministic 1-to-1 chat document id so both users land on the same thread
const chatIdFor = (uidA: string, uidB: string) => [uidA, uidB].sort().join('_');
const CHAT_MAX_LENGTH = 500;

// --- AI PROVIDER (Gemini via OpenAI-compatible API, Groq as fallback) ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const AI_ENDPOINT = GEMINI_API_KEY
  ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
  : 'https://api.groq.com/openai/v1/chat/completions';
const AI_SMART_MODELS = GEMINI_API_KEY
  ? ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite']
  : ['llama-3.3-70b-versatile'];
const AI_FAST_MODELS = GEMINI_API_KEY
  ? ['gemini-3.1-flash-lite', 'gemini-3.6-flash']
  : ['llama-3.1-8b-instant'];

interface AiMessage { role: 'system' | 'user' | 'assistant' | 'model'; content: string; }

async function aiComplete(options: {
  messages: AiMessage[];
  maxTokens?: number;
  json?: boolean;
  tier?: 'fast' | 'smart';
}): Promise<string> {
  const apiKey = GEMINI_API_KEY || GROQ_API_KEY;
  if (!apiKey) throw new Error('API Key missing');

  const models = options.tier === 'smart' ? AI_SMART_MODELS : AI_FAST_MODELS;
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: options.messages.map(m => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content
          })),
          ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
          ...(options.json ? { response_format: { type: 'json_object' } } : {})
        })
      });
      if (!response.ok) {
        lastError = new Error(`AI request failed (${response.status})`);
        continue;
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) return content;
      lastError = new Error('Empty AI response');
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('AI unavailable');
}

// Streaming variant — words dikhte hain jaise jaise AI likhta hai (perceived speed 3-5x)
async function aiCompleteStream(options: {
  messages: AiMessage[];
  maxTokens?: number;
  json?: boolean;
  tier?: 'fast' | 'smart';
  onDelta: (text: string) => void;
}): Promise<string> {
  const apiKey = GEMINI_API_KEY || GROQ_API_KEY;
  if (!apiKey) throw new Error('API Key missing');

  const models = options.tier === 'smart' ? AI_SMART_MODELS : AI_FAST_MODELS;
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: options.messages.map(m => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content
          })),
          stream: true,
          ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
          ...(options.json ? { response_format: { type: 'json_object' } } : {})
        })
      });
      if (!response.ok || !response.body) {
        lastError = new Error(`AI request failed (${response.status})`);
        continue;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') {
            if (full.trim()) return full;
            lastError = new Error('Empty AI response');
            break;
          }
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) { full += delta; options.onDelta(delta); }
          } catch { /* partial JSON line — ignore */ }
        }
      }
      if (full.trim()) return full;
      lastError = new Error('Empty AI response');
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('AI unavailable');
}

const stripJsonFences = (raw: string) => raw.replace(/```json/gi, '').replace(/```/g, '').trim();
// -----------------------------------------------------------------------

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 font-sans pt-safe pb-safe">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center"
          >
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black mb-3 tracking-tight">Welcome!</h1>
            <p className="text-slate-500 mb-10 font-medium text-sm">Let's start by getting to know you. What should we call you?</p>
            
            <div className="relative mb-6">
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-lg font-bold placeholder:text-slate-400 placeholder:font-medium text-slate-900"
                autoFocus
              />
            </div>
            
            <button 
              disabled={!name.trim()}
              onClick={() => setStep(2)}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 shadow-lg shadow-indigo-200 disabled:shadow-none"
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
            <p className="text-slate-500 mb-8 text-center font-medium text-sm">What is your current English level?</p>
            
            <div className="space-y-3 mb-8">
              {levels.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 bg-white ${level === l.id ? 'border-indigo-600 shadow-lg shadow-indigo-100' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <span className="text-2xl">{l.icon}</span>
                  <div>
                    <h3 className={`font-bold text-base ${level === l.id ? 'text-indigo-700' : 'text-slate-900'}`}>{l.label}</h3>
                    <p className="text-xs text-slate-500 font-medium">{l.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            
            <button 
              disabled={!level}
              onClick={() => onComplete({ name, level })}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 shadow-lg shadow-indigo-200 disabled:shadow-none"
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

// --- Neural TTS: Google Cloud TTS (fast) -> Gemini TTS (fallback), cached in IndexedDB ---
const TTS_CACHE_VERSION = 'v1';
const CLOUD_TTS_VOICE = 'en-US-Neural2-F';
const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const GEMINI_TTS_VOICE = 'Kore';
const TTS_DB_NAME = 'lexiquest-tts';
const TTS_STORE = 'clips';

const base64ToBytes = (b64: string) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const pcm16ToWav = (pcm: Uint8Array, sampleRate: number) => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, pcm.length, true);
  return new Blob([header, pcm.buffer as ArrayBuffer], { type: 'audio/wav' });
};

let ttsDbPromise: Promise<IDBDatabase | null> | null = null;

const getTtsDb = () => {
  if (typeof indexedDB === 'undefined') return Promise.resolve<IDBDatabase | null>(null);
  if (!ttsDbPromise) {
    ttsDbPromise = new Promise(resolve => {
      const req = indexedDB.open(TTS_DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(TTS_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
  return ttsDbPromise;
};

const ttsCacheGet = async (text: string): Promise<Blob | null> => {
  const db = await getTtsDb();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const req = db.transaction(TTS_STORE, 'readonly').objectStore(TTS_STORE).get(`${TTS_CACHE_VERSION}|${text}`);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const ttsCachePut = async (text: string, blob: Blob) => {
  const db = await getTtsDb();
  if (!db) return;
  try {
    db.transaction(TTS_STORE, 'readwrite').objectStore(TTS_STORE).put(blob, `${TTS_CACHE_VERSION}|${text}`);
  } catch {
    // cache is best-effort
  }
};

const fetchCloudTts = async (text: string, apiKey: string): Promise<Blob> => {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'en-US', name: CLOUD_TTS_VOICE },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 }
    })
  });
  if (!res.ok) throw new Error(`Cloud TTS ${res.status}`);
  const data = await res.json();
  if (!data?.audioContent) throw new Error('Cloud TTS returned no audio');
  return new Blob([base64ToBytes(data.audioContent).buffer as ArrayBuffer], { type: 'audio/mpeg' });
};

// Gemini TTS free tier returns 429 after a handful of clips. Remember it so we don't
// hammer the API (and flood the console) for every word of a 10-word test.
let geminiTtsQuotaHitAt = 0;
const GEMINI_TTS_COOLDOWN_MS = 10 * 60 * 1000;

const fetchGeminiTts = async (text: string, apiKey: string): Promise<Blob> => {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Read this in a warm, natural, clear voice: ${text}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } } }
      }
    })
  });
  if (res.status === 429) geminiTtsQuotaHitAt = Date.now();
  if (!res.ok) throw new Error(`Gemini TTS ${res.status}`);
  const data = await res.json();
  const b64 = data?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData?.data)?.inlineData?.data;
  if (!b64) throw new Error('Gemini TTS returned no audio');
  return pcm16ToWav(base64ToBytes(b64), 24000);
};

// Keyless natural voice fallback. Gemini TTS free tier hits 429 quickly, so short words
// and phrases are spoken through Google's translate voice instead of the robotic device voice.
const GOOGLE_TTS_URL_MAX = 170;
const googleTranslateTtsUrl = (text: string): string | null => {
  const q = (text || '').trim();
  if (!q || q.length > GOOGLE_TTS_URL_MAX) return null;
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&ttsspeed=1&q=${encodeURIComponent(q)}`;
};

const playUrlAudio = (url: string) => new Promise<void>((resolve, reject) => {
  const audio = new Audio(url);
  audio.onended = () => resolve();
  audio.onerror = () => reject(new Error('TTS audio error'));
  audio.play().catch(reject);
});

const NATIVE_QUALITY_RE = /(network|neural|natural|enhanced|studio|wavenet)/i;

const pickBestNativeVoice = (voices: any[]): any | undefined => {
  if (!voices.length) return undefined;
  const english = voices.filter(v => (v.lang || '').toLowerCase().startsWith('en'));
  const pool = english.length ? english : voices;
  const score = (v: any) => {
    const name = `${v.name || ''} ${v.voiceURI || ''}`;
    let s = 0;
    if (NATIVE_QUALITY_RE.test(name)) s += 10;
    if (/en-in/i.test(v.lang || '')) s += 5;
    else if (/en-us/i.test(v.lang || '')) s += 4;
    if (/google/i.test(name)) s += 3;
    return s;
  };
  return [...pool].sort((a, b) => score(b) - score(a))[0];
};

const fetchNeuralTts = async (text: string): Promise<Blob | null> => {
  const cached = await ttsCacheGet(text);
  if (cached) return cached;

  const cloudKey = import.meta.env.VITE_GOOGLE_TTS_KEY as string | undefined;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

  let blob: Blob | null = null;
  if (cloudKey) {
    try {
      blob = await fetchCloudTts(text, cloudKey);
    } catch (e) {
      console.warn('Cloud TTS failed, trying Gemini:', e);
    }
  }
  const geminiCoolingDown = Date.now() - geminiTtsQuotaHitAt < GEMINI_TTS_COOLDOWN_MS;
  if (!blob && geminiKey && !geminiCoolingDown) {
    try {
      blob = await fetchGeminiTts(text, geminiKey);
    } catch (e) {
      console.warn('Gemini TTS failed:', e);
    }
  }
  if (blob) await ttsCachePut(text, blob);
  return blob;
};

const VOICE_QUALITY_RE = /(natural|neural|enhanced|studio|premium|wavenet|google)/i;

const isQualityVoice = (voice?: SpeechSynthesisVoice | null) =>
  !!voice && VOICE_QUALITY_RE.test(voice.name || '');

const pickBestEnglishVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined => {
  const english = voices.filter(v => (v.lang || '').toLowerCase().startsWith('en'));
  const pool = english.length ? english : voices;
  const quality = /(natural|neural|enhanced|studio|premium|wavenet)/i;
  return pool.find(v => quality.test(v.name || '') && (v.lang || '').startsWith('en-US'))
      || pool.find(v => quality.test(v.name || ''))
      || pool.find(v => /google/i.test(v.name || '') && (v.lang || '').startsWith('en-US'))
      || pool.find(v => /google/i.test(v.name || ''))
      || pool.find(v => (v.lang || '').startsWith('en-US'))
      || pool[0];
};

// ---------------- Weekly League (7-day streak ladder) ----------------
const LEAGUE_TIERS = [
  { name: 'Bronze',   from: '#e0a066', to: '#8a4b1e', ring: '#f8d7b0', glow: 'rgba(205,127,50,0.35)' },
  { name: 'Silver',   from: '#eef3f8', to: '#7b8a9c', ring: '#dbe4ee', glow: 'rgba(148,163,184,0.35)' },
  { name: 'Gold',     from: '#ffe68a', to: '#b8860b', ring: '#fdf0b8', glow: 'rgba(234,179,8,0.40)' },
  { name: 'Platinum', from: '#d6fbff', to: '#2f7d86', ring: '#c8f4f8', glow: 'rgba(45,212,191,0.40)' },
  { name: 'Diamond',  from: '#cfe0ff', to: '#3355c6', ring: '#dbe7ff', glow: 'rgba(99,102,241,0.45)' },
  { name: 'Master',   from: '#ffc6f2', to: '#7a1fa2', ring: '#f6d6ff', glow: 'rgba(168,85,247,0.50)' },
] as const;
const LEAGUE_DAYS_PER_TIER = 7;

const clampTier = (tier: number) => Math.max(0, Math.min(LEAGUE_TIERS.length - 1, Math.floor(Number.isFinite(tier) ? tier : 0)));
const clampLeaguePoints = (points: number) => Math.max(0, Math.min(LEAGUE_DAYS_PER_TIER, Math.floor(Number.isFinite(points) ? points : 0)));

const TierBadge = ({ tier = 0, size = 24, className = '', title }: { tier?: number; size?: number; className?: string; title?: string }) => {
  const t = LEAGUE_TIERS[clampTier(tier)];
  const gradId = `tier-grad-${clampTier(tier)}-${size}`;
  const glyphs: Record<number, React.ReactNode> = {
    0: <path d="M24 14l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z" fill="#5c2f0d" opacity="0.8" />,
    1: <path d="M16 19l8 5 8-5M16 24l8 5 8-5" fill="none" stroke="#55657a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />,
    2: <path d="M14 31l2-11 6 5 2-8 2 8 6-5 2 11z" fill="#7a5606" opacity="0.85" />,
    3: <path d="M24 13l8 11-8 11-8-11z" fill="none" stroke="#1f6b74" strokeWidth="2.4" strokeLinejoin="round" />,
    4: <g><path d="M16 18h16l4 6-12 11-12-11z" fill="#24418f" opacity="0.85" /><path d="M16 18l8 17 8-17M12 24h24" fill="none" stroke="#dbe7ff" strokeWidth="1.4" opacity="0.9" /></g>,
    5: <g><path d="M24 11c3 4 8 6 8 12a8 8 0 01-16 0c0-3 2-5 4-6 0 2 1 3 2 4 1-3 2-6 2-10z" fill="#5b1178" opacity="0.85" /><path d="M24 18l1.7 3.4 3.8.6-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.6z" fill="#ffd9fb" opacity="0.95" /></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`shrink-0 ${className}`} role="img" aria-label={`${t.name} league badge`}>
      <title>{title || `${t.name} League`}</title>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={t.from} />
          <stop offset="100%" stopColor={t.to} />
        </linearGradient>
      </defs>
      <path d="M24 3.5 41.5 9.2v13.6c0 9.8-7.3 17.9-17.5 21.5C13.8 40.7 6.5 32.6 6.5 22.8V9.2z" fill={`url(#${gradId})`} stroke={t.ring} strokeWidth="1.6" />
      <path d="M24 5.8 39.3 10.8v12c0 8.6-6.4 15.8-15.3 19.1C15.1 38.6 8.7 31.4 8.7 22.8v-12z" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1" opacity="0.7" />
      {glyphs[clampTier(tier)]}
    </svg>
  );
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
      setAlertMessage(`Welcome aboard, ${data.name}! ✨`, 'success');
    } catch (e) {
      console.error("Onboarding Save Error:", e);
      setAlertMessage("Failed to save profile. Please try again.", 'error');
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
  const aiChatScrollRef = useRef<HTMLDivElement>(null);

  // Saved Words State
  const [savedWords, setSavedWords] = useState<{ word: string, meaning: string, example: string, savedAt: number }[]>([]);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');

  // AdMob State
  const [adInitialized, setAdInitialized] = useState(false);
  // Premium = ad-free only. Every learning feature stays free.
  const [isPremium, setIsPremium] = useState(() => localStorage.getItem('isPremium') === 'true');
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const localEmail = localStorage.getItem('userEmail');
      if (localEmail === MASTER_ADMIN_EMAIL) return true;
      return localStorage.getItem('isAdmin') === 'true';
    } catch (e) { return false; }
  });
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [premiumPrices, setPremiumPrices] = useState<{ monthly?: string; yearly?: string }>({});
  const [purchaseLoading, setPurchaseLoading] = useState<'monthly' | 'yearly' | 'restore' | null>(null);

  // Direct messages (World Rankings chat)
  const [chatTarget, setChatTarget] = useState<{ uid: string; name: string; photoURL?: string; xp?: number; level?: number } | null>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; senderId: string; senderName: string; text: string; createdAt: number }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxChats, setInboxChats] = useState<any[]>([]);
  const chatListenerId = useRef<string | null>(null);
  const inboxListenerId = useRef<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const ADMOB_INTERSTITIAL_ID = import.meta.env.VITE_ADMOB_INTERSTITIAL_ID || 'ca-app-pub-3271133689051975/1984304467';
  const ADMOB_BANNER_ID = import.meta.env.VITE_ADMOB_BANNER_ID || '';
  const isPluginsInitialized = useRef(false);
  const [adReady, setAdReady] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
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

  // Weekly League — 7 consecutive active days promote one tier, a gap resets the cycle,
  // 7+ days of inactivity demotes one tier.
  const [leagueTier, setLeagueTier] = useState(() => clampTier(parseInt(localStorage.getItem('leagueTier') || '0')));
  const [leaguePoints, setLeaguePoints] = useState(() => clampLeaguePoints(parseInt(localStorage.getItem('leaguePoints') || '0')));
  const [leagueEvent, setLeagueEvent] = useState<{ type: 'promote' | 'demote'; tier: number } | null>(null);

  // Speech State
  const [speechRate, setSpeechRate] = useState(0.9);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [speechSettingsOpen, setSpeechSettingsOpen] = useState(false);

  // Custom Alert/Confirm Modals
  type AlertType = 'success' | 'error' | 'info';
  const [alert, setAlert] = useState<{ message: string; type: AlertType }>({ message: '', type: 'info' });
  const alertMessage = alert.message;
  const setAlertMessage = (message: string, type: AlertType = 'info') => setAlert({ message, type });
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

  // App is free — only ads are removed with Premium
  
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
  const [dailyWordsStatus, setDailyWordsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    () => (localStorage.getItem('aiAutoAddDate') === new Date().toDateString() ? 'ready' : 'idle')
  );
  const [learnedRules, setLearnedRules] = useState<string[]>(() => safeParseJSON('learnedGrammarRules', []));
  const categories = ['All', "Today's 100", 'Review Needed', 'Daily Use', 'Academic', 'Work', 'Business', 'Advanced', 'Idioms', 'Phrasal Verbs', 'Travel', 'Finance', 'Economics', 'Technology', 'Science', 'Health', 'Medicine', 'Psychology', 'Education', 'Personality', 'Emotion', 'Social', 'Communication', 'Modern Slang', 'Literature', 'History', 'Sports', 'Philosophy', 'Legal', 'Politics', 'Nature', 'Environment', 'Food', 'Arts', 'Music', 'Fashion', 'General'];

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

  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo({ top: 0 });
  }, [activeTab, grammarSubTab]);

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
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRefiningThesaurus, setIsRefiningThesaurus] = useState(false);
  const [hindiTranslation, setHindiTranslation] = useState<any>(null);
  const [smartThesaurus, setSmartThesaurus] = useState<{ synonyms: string[], antonyms: string[] } | null>(null);
  const [isPronouncing, setIsPronouncing] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ uid?: string, name: string, xp: number, level: number, photoURL?: string }[]>([]);
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
  // Native TTS plugin expects an index into the FULL voice list, not the filtered English list.
  const nativeVoicesRef = useRef<{ voiceURI: string; name: string; lang: string }[]>([]);

  // Reminder State
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem('reminderTime') || '10:00');

  // Rule Lab State
  const [openRuleLab, setOpenRuleLab] = useState<Record<string, boolean>>({});
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
            const premiumActive = user.email === MASTER_ADMIN_EMAIL || !!customerInfo?.entitlements?.active['LexiQuest Premium'];
            setIsPremium(premiumActive);
            localStorage.setItem('isPremium', premiumActive ? 'true' : 'false');
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

  // AdMob Interstitial Manager — ad hamesha ready rakhte hain, test complete hone pe show hota hai
  const interstitialReadyRef = useRef(false);
  const lastInterstitialAtRef = useRef(0);

  useEffect(() => {
    // BYPASS: No ads for admin or premium users
    const isMasterAdmin = user?.email === MASTER_ADMIN_EMAIL || isAdmin;
    if (!Capacitor.isNativePlatform() || !user || isMasterAdmin || isPremium || !adInitialized) {
      return;
    }

    const prepare = () => {
      AdMob.prepareInterstitial({ adId: ADMOB_INTERSTITIAL_ID, isTesting: false })
        .then(() => { interstitialReadyRef.current = true; setAdReady(true); })
        .catch(() => { interstitialReadyRef.current = false; setAdReady(false); });
    };
    prepare();

    // Listeners to pause/resume test timer during ads
    const listeners: PluginListenerHandle[] = [];

    AdMob.addListener('interstitialAdShowed' as any, () => {
      logAction("Ad Opened - Pausing Test Timer");
      pauseTimer();
    }).then(h => listeners.push(h));
    AdMob.addListener('interstitialAdDismissed' as any, () => {
      logAction("Ad Dismissed - Resuming Test Timer");
      if (testStateRef.current === 'testing' && feedbackStateRef.current === 'none') {
        startTimer(timeLeftRef.current);
      }
    }).then(h => listeners.push(h));

    return () => {
      listeners.forEach(h => h.remove());
      interstitialReadyRef.current = false;
    };
  }, [user, adInitialized, isAdmin, isPremium]);

  // Har test complete hone pe interstitial (max 1 per 90 seconds)
  useEffect(() => {
    if (testState !== 'results') return;
    const isMasterAdmin = user?.email === MASTER_ADMIN_EMAIL || isAdmin;
    if (!Capacitor.isNativePlatform() || !user || isMasterAdmin || isPremium) return;
    if (!interstitialReadyRef.current) return;
    const now = Date.now();
    if (now - lastInterstitialAtRef.current < 90000) return;
    lastInterstitialAtRef.current = now;
    interstitialReadyRef.current = false;
    setAdReady(false);
    AdMob.showInterstitial().catch(() => { });
    AdMob.prepareInterstitial({ adId: ADMOB_INTERSTITIAL_ID, isTesting: false })
      .then(() => { interstitialReadyRef.current = true; setAdReady(true); })
      .catch(() => { interstitialReadyRef.current = false; });
  }, [testState, user, isAdmin, isPremium]);

  // Banner ad on Journey home (test ke dauran hidden; admin & premium bypass)
  useEffect(() => {
    const isMasterAdmin = user?.email === MASTER_ADMIN_EMAIL || isAdmin;
    const eligible = Capacitor.isNativePlatform() && !!user && !isMasterAdmin && !isPremium && adInitialized && !!ADMOB_BANNER_ID;
    const shouldShow = eligible && activeTab === 'learn' && testState !== 'testing' && !subscriptionModalOpen;

    if (!eligible) {
      AdMob.removeBanner().catch(() => { });
      if (bannerVisible) setBannerVisible(false);
      return;
    }
    if (shouldShow) {
      AdMob.showBanner({ adId: ADMOB_BANNER_ID, position: BannerAdPosition.BOTTOM_CENTER })
        .then(() => setBannerVisible(true))
        .catch(() => setBannerVisible(false));
    } else {
      AdMob.hideBanner().catch(() => { });
      if (bannerVisible) setBannerVisible(false);
    }
  }, [user, isAdmin, isPremium, adInitialized, activeTab, testState, subscriptionModalOpen]);

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
              setAlertMessage("Your account has been permanently deleted. ✨", 'success');
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
          const preferred = pickBestEnglishVoice(voices);
          
          const currentVoice = voices.find(v => v.voiceURI === localStorage.getItem('selectedVoiceURI'));
          const isRobotic = !!currentVoice && !isQualityVoice(currentVoice);
          
          if (preferred && (!localStorage.getItem('selectedVoiceURI') || isRobotic)) {
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

  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('1.5.0');
  const [requiredVersion, setRequiredVersion] = useState<string | null>(null);

  const compareVersion = (a: string, b: string): number => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na < nb) return -1;
      if (na > nb) return 1;
    }
    return 0;
  };

  // Mandatory Update Check
  useEffect(() => {
    const checkUpdate = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const info = await CapApp.getInfo();
        const current = info.version || '1.5.0';
        setCurrentVersion(current);
        const { snapshot } = await FirebaseFirestore.getDocument({ reference: 'app_config/version' });
        if (snapshot && snapshot.data) {
          const data = snapshot.data as any;
          const latest = data.latest;
          const minimumVersion = data.minimumVersion;
          let required: string | null = null;
          if (minimumVersion && compareVersion(current, minimumVersion) < 0) {
            required = minimumVersion;
          } else if (latest && latest !== current) {
            required = latest;
          }
          if (required) {
            setRequiredVersion(required);
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

        setAlertMessage(`Successfully added ${successCount} words! 🚀`, 'success');
        setAdminAddModalOpen(false);
        setBulkInput('');
        setIsBulkMode(false);
        localStorage.removeItem('cached_shared_words_ts');
        fetchAiWords(true);
      } catch (err) {
        setAlertMessage("Bulk upload failed partially.", 'error');
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
      setAlertMessage("Word added to Global Dictionary! ✨", 'success');
      setAdminAddModalOpen(false);
      setNewWordData({ word: '', meaning: '', example: '', category: 'All' });
      // Clear cache to force re-fetch
      localStorage.removeItem('cached_shared_words_ts');
      localStorage.removeItem('cached_ai_words_ts');
      fetchAiWords(true);
    } catch (err) {
      setAlertMessage("Failed to add word.", 'error');
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
          const parsedCache = JSON.parse(cached);
          // Older cache entries had no uid, so chat was unavailable — refetch those
          if (Array.isArray(parsedCache) && parsedCache.every((u: any) => u.uid)) {
            setLeaderboard(parsedCache);
            return;
          }
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
          board = snapshots.map(s => ({ ...(s.data as any), uid: s.id }));
        }
      } catch (queryErr) {
        console.error('Leaderboard query failed, trying fallback:', queryErr);
        // Fallback: Fetch all users and sort locally in case of index/plugin issues
        const { snapshots } = await FirebaseFirestore.getCollection({ reference: 'users' });
        if (snapshots) {
          board = snapshots
            .map(s => ({ ...(s.data as any), uid: s.id }))
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
        setIsPremium(false);
        localStorage.setItem('isPremium', 'false');
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
      setAlertMessage('Please type the exact phrase to confirm deletion.', 'error');
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
        setAlertMessage('For security, please sign out and sign in again before deleting your account.', 'error');
      } else {
        setAlertMessage('Could not delete account. Please try again or contact support at <sandeepkumarspj290@gmail.com>.', 'error');
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
    // Koi bhi XP-earning activity us din ko "active day" banati hai (weekly league)
    registerLeagueActivity();

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
          // Free perk: refill one streak shield on level up
          setStreakShields(prev => Math.min(prev + 1, 3));
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
        data: {
          xp: currentXp,
          level: currentLevel,
          name: displayName || user.displayName || 'Explorer',
          leagueTier: clampTier(parseInt(localStorage.getItem('leagueTier') || '0')),
          leaguePoints: clampLeaguePoints(parseInt(localStorage.getItem('leaguePoints') || '0')),
          streakDays: parseInt(localStorage.getItem('streak') || '0'),
          ...(profileImage ? { photoURL: profileImage } : {})
        },
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
            setAlertMessage(`Mission Complete: ${m.title}! +${m.reward} XP`, 'success');
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
          setAlertMessage(`Achievement Unlocked: ${b.title}! ${b.icon}`, 'success');
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

  // 🤖 AI Auto-Add: 100 fresh words every 24 hours, no manual action needed
  const ensureDailyAiWords = useCallback(async () => {
    const today = new Date().toDateString();
    if (localStorage.getItem('aiAutoAddDate') === today) {
      setDailyWordsStatus('ready');
      return;
    }
    if (!GEMINI_API_KEY && !GROQ_API_KEY) {
      setDailyWordsStatus('error');
      return;
    }

    setDailyWordsStatus('loading');
    const randomCategories = ['Technology', 'Business', 'Psychology', 'Science', 'Advanced', 'Academic', 'Philosophy', 'Legal', 'Health', 'Finance', 'Literature', 'History'];
    const cat = randomCategories[Math.floor(Math.random() * randomCategories.length)];

    const collected: any[] = [];
    const seenWords = new Set<string>();

    for (let attempt = 0; attempt < 3 && collected.length < 100; attempt++) {
      try {
        const remaining = 100 - collected.length;
        const content = await aiComplete({
          tier: 'smart',
          maxTokens: 8000,
          json: true,
          messages: [
            { role: 'system', content: 'You are a vocabulary expert. Always respond with valid JSON only.' },
            { role: 'user', content: `Generate exactly ${remaining} useful English vocabulary words for the "${cat}" category that Indians learning English would benefit from.\n\nReturn ONLY this JSON object (no markdown, no extra text):\n{"words":[{"word":"example","meaning":"उदाहरण","example":"This is an example.","category":"${cat}"}]}\n\nRules:\n- All words must have accurate Hindi meanings in Devanagari\n- Include natural English example sentences\n- No very basic words (no: the, is, a, etc.)\n- Return exactly ${remaining} items` }
          ]
        });

        let parsed: any = null;
        try { parsed = JSON.parse(stripJsonFences(content)); } catch {}

        (parsed?.words || []).forEach((w: any) => {
          if (!w?.word || !w?.meaning || !w?.example) return;
          const key = String(w.word).toLowerCase().trim();
          if (!key || seenWords.has(key)) return;
          seenWords.add(key);
          collected.push(w);
        });
      } catch (e) {
        console.log(`AI auto-add attempt ${attempt + 1} failed`);
      }
      if (collected.length < 100 && attempt < 2) await new Promise(r => setTimeout(r, 3000));
    }

    if (collected.length > 0) {
      const validWords = collected.slice(0, 100);
      setAiWords(prev => {
        const existingWordSet = new Set(prev.map((w: any) => (w.word || '').toLowerCase()));
        const newUnique = validWords.filter((w: any) => !existingWordSet.has((w.word || '').toLowerCase()));
        const updated = [...prev, ...newUnique];
        localStorage.setItem('cached_ai_words', JSON.stringify(updated));
        logAction(`AI Auto-Add: +${newUnique.length} new ${cat} words (Total AI words: ${updated.length})`);
        return updated;
      });
      setDailyLearnWords(validWords);
      localStorage.setItem('dailyLearnWords', JSON.stringify(validWords));
      localStorage.setItem('aiAutoAddDate', today);
      setDailyWordsStatus('ready');
      return;
    }
    setDailyWordsStatus('error');
  }, []);

  useEffect(() => {
    // Small delay so the first screen paints before the network call
    const timer = setTimeout(() => { ensureDailyAiWords(); }, 4000);
    return () => clearTimeout(timer);
  }, [ensureDailyAiWords]);

  useEffect(() => {
    if (activeTab === 'learn' && dailyWordsStatus === 'idle') {
      ensureDailyAiWords();
    }
  }, [activeTab, dailyWordsStatus, ensureDailyAiWords]);

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

  // ---- Weekly League: 7 active days = promotion, missed day = cycle restart, 7+ days away = demotion ----
  const dayGap = (from: string, to: string) => {
    const a = new Date(from).getTime();
    const b = new Date(to).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    return Math.round((b - a) / 86400000);
  };

  const registerLeagueActivity = () => {
    const today = new Date().toDateString();
    const last = localStorage.getItem('lastLeagueDate') || '';
    if (last === today) return;

    let tier = clampTier(parseInt(localStorage.getItem('leagueTier') || '0'));
    let points = clampLeaguePoints(parseInt(localStorage.getItem('leaguePoints') || '0'));
    const gap = last ? dayGap(last, today) : 0;

    if (last) {
      if (gap >= 7) {
        if (tier > 0) {
          tier -= 1;
          setLeagueEvent({ type: 'demote', tier });
        }
        points = 0;
      } else if (gap > 1) {
        // Ek din bhi miss — 7-day cycle restart
        points = 0;
      }
    }

    points += 1;
    if (points >= LEAGUE_DAYS_PER_TIER) {
      if (tier < LEAGUE_TIERS.length - 1) {
        tier += 1;
        points = 0;
        setLeagueEvent({ type: 'promote', tier });
        setXp(prev => {
          const next = prev + 200;
          localStorage.setItem('xp', next.toString());
          return next;
        });
      } else {
        points = LEAGUE_DAYS_PER_TIER; // Master league — full bar
      }
    }

    localStorage.setItem('lastLeagueDate', today);
    localStorage.setItem('leagueTier', tier.toString());
    localStorage.setItem('leaguePoints', points.toString());
    setLeagueTier(tier);
    setLeaguePoints(points);
  };

  const checkLeagueDecay = () => {
    const last = localStorage.getItem('lastLeagueDate');
    if (!last) return;
    const gap = dayGap(last, new Date().toDateString());
    if (gap < 7) return;
    const tier = clampTier(parseInt(localStorage.getItem('leagueTier') || '0'));
    if (tier === 0) {
      localStorage.setItem('lastLeagueDate', '');
      return;
    }
    const newTier = tier - 1;
    localStorage.setItem('leagueTier', newTier.toString());
    localStorage.setItem('leaguePoints', '0');
    localStorage.setItem('lastLeagueDate', '');
    setLeagueTier(newTier);
    setLeaguePoints(0);
    setLeagueEvent({ type: 'demote', tier: newTier });
  };

  useEffect(() => {
    checkLeagueDecay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // League tier/points world rankings me dikhane ke liye Firestore me sync karo
  useEffect(() => {
    if (!user?.uid) return;
    FirebaseFirestore.setDocument({
      reference: 'users/' + user.uid,
      data: { leagueTier, leaguePoints, streakDays: streak, xp, level },
      merge: true
    }).catch(() => {});
  }, [user?.uid, leagueTier, leaguePoints, streak, xp, level]);


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
        setAlertMessage('Notification permission denied. Cannot enable reminders.', 'error');
        return false;
      }
    } else {
      // Web notification logic (simplified for browser)
      if (!('Notification' in window)) {
        setAlertMessage('This browser does not support desktop notifications.', 'error');
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
          setAlertMessage('Notification permission denied. Cannot enable reminders.', 'error');
          return false;
        }
      } else {
        setAlertMessage('Notification permission is blocked. Please enable it in your browser/device settings.', 'error');
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
          const allVoices = result.voices || [];
          nativeVoicesRef.current = allVoices;
          const enInVoices = allVoices.filter(v => (v.lang || '').toLowerCase().startsWith('en-in'));
          const otherEnVoices = allVoices.filter(v => (v.lang || '').toLowerCase().startsWith('en-') && !(v.lang || '').toLowerCase().startsWith('en-in'));
          
          // Combine prioritizing en-IN
          const allEnVoices = [...enInVoices, ...otherEnVoices];
          setAvailableVoices(allEnVoices);

          setSelectedVoiceURI(prev => {
            const current = allVoices.find(v => v.voiceURI === prev);
            if (current && isQualityVoice(current as any)) return prev;
            const bestVoice = pickBestNativeVoice(allVoices);
            return bestVoice ? bestVoice.voiceURI : (prev || '');
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
          const naturalVoice = pickBestEnglishVoice(allEnVoices);
                               
          const defaultVoice = naturalVoice || enInVoices.find(v => v.name.includes('Google') || v.name.includes('India')) || enInVoices[0] || otherEnVoices[0];
          
          const currentVoice = allEnVoices.find(v => v.voiceURI === prev);
          const isRobotic = !!currentVoice && !isQualityVoice(currentVoice);
          
          if (!prev || (isRobotic && naturalVoice)) {
            if (naturalVoice) localStorage.setItem('selectedVoiceURI', naturalVoice.voiceURI);
            return defaultVoice ? defaultVoice.voiceURI : prev;
          }
          return prev;
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
    setAlertMessage(`Successfully added words.`, 'success');
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
        setAlertMessage('Link copied to clipboard! Share it with your friends.', 'success');
      } catch {
        setAlertMessage('Sharing is not supported on this device.', 'error');
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
            setAlertMessage(`Successfully imported ${validWords.length} words.`, 'success');
          } else {
            setAlertMessage("No valid words found in the file.", 'error');
          }
        } else {
          setAlertMessage("Invalid file format. Expected an array of words.", 'error');
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
    prefetchSpeech(selected);

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
        const allVoices = nativeVoicesRef.current;
        let vIdx = allVoices.findIndex(v => v.voiceURI === selectedVoiceURI);
        if (vIdx === -1) {
          const best = pickBestNativeVoice(allVoices);
          vIdx = best ? allVoices.indexOf(best) : -1;
        }
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
        const voice = availableVoices.find(v => v.voiceURI === selectedVoiceURI) || pickBestEnglishVoice(availableVoices);
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

  const prefetchSpeech = (texts: string[]) => {
    if (isOffline) return;
    // With only the Gemini key (no Cloud TTS key) a prefetch of 10 words burns the tiny
    // free-tier quota and returns 429. Skip it while Gemini is cooling down.
    if (!import.meta.env.VITE_GOOGLE_TTS_KEY && Date.now() - geminiTtsQuotaHitAt < GEMINI_TTS_COOLDOWN_MS) return;
    const unique = Array.from(new Set((texts || []).filter(t => typeof t === 'string' && t.trim() && t.length < 300)));
    if (unique.length === 0) return;
    (async () => {
      for (const text of unique) {
        try {
          await fetchNeuralTts(text);
        } catch {
          // prefetch is best-effort
        }
      }
    })();
  };

  const playWord = async (word: string) => {
    if (!word || typeof word !== 'string') { setIsLexiSpeaking(false); return; }
    setIsLexiSpeaking(true);

    // Global safety timeout — auto-reset speaking state after 20s to prevent UI freeze
    const safetyTimer = setTimeout(() => setIsLexiSpeaking(false), 20000);

    const playBlob = (blob: Blob) => new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Audio playback error')); };
      audio.play().catch(reject);
    });

    if (isOffline || word.length >= 300) {
      clearTimeout(safetyTimer);
      playNative(word);
      return;
    }

    // 1. Neural clip already cached? Play instantly.
    const cached = await ttsCacheGet(word);
    if (cached) {
      try {
        await playBlob(cached);
        clearTimeout(safetyTimer);
        setIsLexiSpeaking(false);
        return;
      } catch {
        // fall through to the keyless natural voice
      }
    }

    // 2. Keyless natural voice (works even when the Gemini quota is exhausted).
    const naturalUrl = googleTranslateTtsUrl(word);
    if (naturalUrl) {
      try {
        await playUrlAudio(naturalUrl);
        clearTimeout(safetyTimer);
        setIsLexiSpeaking(false);
        prefetchSpeech([word]);
        return;
      } catch {
        // fall through to neural / device voice
      }
    }

    // 3. Neural TTS for longer text (or when the fallback voice is unavailable).
    const quick = await Promise.race([
      fetchNeuralTts(word),
      new Promise<'slow'>(resolve => setTimeout(() => resolve('slow'), 1200))
    ]);

    if (quick && quick !== 'slow') {
      try {
        await playBlob(quick);
        clearTimeout(safetyTimer);
        setIsLexiSpeaking(false);
        return;
      } catch (e) {
        console.warn('Neural TTS playback failed, using native voice:', e);
      }
    }

    clearTimeout(safetyTimer);
    playNative(word);
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
      const scenario = await aiComplete({
        messages: [
          {
            role: 'system',
            content: `You are Lexi, a smart grammar tutor. The user (${displayName}) is at '${englishLevel}' level. They want to practice: "${ruleTitle}". 
            Create a short (1 sentence) interesting scenario or question that FORCES the user to use this grammar rule in their answer.
            Adjust the difficulty to their '${englishLevel}' level.
            Keep it very short.`
          }
        ]
      });
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
      const messages: AiMessage[] = [
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

      const feedback = await aiComplete({ messages });
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
      const raw = await aiComplete({
        json: true,
        messages: [
          {
            role: 'system',
            content: 'You are a linguistic expert. Provide a clean, accurate list of 5-8 common synonyms and 5-8 common antonyms for the given word. Filter out any obscure, offensive, or technically unrelated words. Format as JSON: {"synonyms": [], "antonyms": []}'
          },
          { role: 'user', content: `Word: ${word}` }
        ]
      });

      const content = JSON.parse(stripJsonFences(raw) || '{}');
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
    if (isOffline) {
      setAlertMessage("Translation requires an internet connection. 🌐");
      return;
    }
    if (!dictResult || isTranslating) return;

    setIsTranslating(true);
    try {
      const prompt = `Translate this English dictionary entry to Hindi in a simple, readable format. 
      Word: ${dictResult.word}
      Phonetic: ${dictResult.phonetic || ''}
      Meanings: ${JSON.stringify(dictResult.meanings.map(m => ({ pos: m.partOfSpeech, def: m.definitions[0].definition, ex: m.definitions[0].example })))}
      
      Respond in PLAIN TEXT only. Structure like this:
      Arth: [Hindi Meaning]
      Vyakarn: [Part of Speech]
      Vibaran: [Quick Hindi Description]
      Udaharan: [Hindi Example Sentence]`;

      const translated = await aiComplete({
        tier: 'smart',
        messages: [{ role: 'system', content: 'You are a translator.' }, { role: 'user', content: prompt }]
      });
      setHindiTranslation(translated);
    } catch (err) {
      setAlertMessage("Translation failed. Try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const loadPremiumPrices = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current || offerings.all['ofrng20a1dd3978'] || Object.values(offerings.all)[0];
      if (!currentOffering?.availablePackages) return;
      const monthly = currentOffering.availablePackages.find(p => p.packageType === PACKAGE_TYPE.MONTHLY);
      const yearly = currentOffering.availablePackages.find(p => p.packageType === PACKAGE_TYPE.ANNUAL);
      setPremiumPrices({
        monthly: monthly?.product.priceString,
        yearly: yearly?.product.priceString,
      });
    } catch (e) {
      console.error('Failed to load premium prices:', e);
    }
  };

  const handleSubscribe = async (packageType: 'monthly' | 'yearly') => {
    if (purchaseLoading) return;
    setPurchaseLoading(packageType);
    try {
      const offerings = await Purchases.getOfferings();
      // Dynamically use 'current' offering, fallback to specific ID, finally fallback to first entry
      const currentOffering = offerings.current || offerings.all['ofrng20a1dd3978'] || Object.values(offerings.all)[0];
      console.log("RevenueCat Selected Offering:", currentOffering);

      if (!currentOffering || !currentOffering.availablePackages || currentOffering.availablePackages.length === 0) {
        setAlertMessage("Plans abhi available nahi hain. Play Store products live hone ke baad yahan dikhenge.", 'error');
        return;
      }

      const pkg = currentOffering.availablePackages.find(p =>
        (packageType === 'monthly' && p.packageType === PACKAGE_TYPE.MONTHLY) ||
        (packageType === 'yearly' && p.packageType === PACKAGE_TYPE.ANNUAL)
      );

      if (!pkg) {
        setAlertMessage("Ye plan abhi configured nahi hai. Doosra plan try karein.", 'error');
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      console.log("Purchase Success Customer Info:", customerInfo);
      if (customerInfo.entitlements.active['LexiQuest Premium']) {
        setIsPremium(true);
        localStorage.setItem('isPremium', 'true');
        setSubscriptionModalOpen(false);
        setAlertMessage("Premium active! Ab koi ads nahi. 🎉", 'success');

        // Sync with Firestore
        if (user?.uid) {
          await FirebaseFirestore.setDocument({
            reference: 'users/' + user.uid,
            data: { premium: true },
            merge: true
          });
        }
      } else {
        setAlertMessage("Payment complete hua par entitlement active nahi mila. Restore try karein.", 'error');
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("Purchase error details:", error);
        setAlertMessage(`Purchase fail: ${error.message || 'Play Console setup check karein'}.`, 'error');
      }
    } finally {
      setPurchaseLoading(null);
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
      setAlertMessage("Restore sirf Android app me available hai.", 'info');
      return;
    }
    if (purchaseLoading) return;
    setPurchaseLoading('restore');

    try {
      const info = await Purchases.restorePurchases();
      const customerInfo = (info as any).customerInfo || info;

      if (customerInfo?.entitlements?.active['LexiQuest Premium']) {
        setIsPremium(true);
        localStorage.setItem('isPremium', 'true');
        if (user?.uid) {
          FirebaseFirestore.setDocument({
            reference: 'users/' + user.uid,
            data: { premium: true },
            merge: true
          }).catch(() => {});
        }
        setSubscriptionModalOpen(false);
        setAlertMessage("Purchase restore ho gaya! Ab ads nahi aayenge. ✨", 'success');
      } else {
        setAlertMessage("Koi active Premium subscription nahi mili.", 'info');
      }
    } catch (e) {
      console.error("Restore failed:", e);
      setAlertMessage("Restore fail hua. Thodi der baad try karein.", 'error');
    } finally {
      setPurchaseLoading(null);
    }
  };

  // ---------- Direct messages (World Rankings chat) ----------
  const openChatWith = (target: { uid: string; name: string; photoURL?: string; xp?: number; level?: number }) => {
    if (!user) {
      setAlertMessage("Chat ke liye signed in hona zaroori hai.", 'info');
      return;
    }
    if (target.uid === user.uid) return;
    setInboxOpen(false);
    setChatMessages([]);
    setChatInput('');
    setChatTarget(target);
  };

  const closeChat = () => {
    setChatTarget(null);
    setChatMessages([]);
    setChatInput('');
  };

  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || !user || !chatTarget || chatSending) return;
    if (text.length > CHAT_MAX_LENGTH) {
      setAlertMessage(`Message ${CHAT_MAX_LENGTH} characters se chhota rakhein.`, 'info');
      return;
    }
    setChatSending(true);
    const chatId = chatIdFor(user.uid, chatTarget.uid);
    const now = Date.now();
    try {
      // Chat doc pehle create hota hai taaki security rules first message allow karein
      await FirebaseFirestore.setDocument({
        reference: `chats/${chatId}`,
        data: {
          participants: [user.uid, chatTarget.uid].sort(),
          participantsInfo: {
            [user.uid]: { name: displayName || 'Explorer', photoURL: profileImage || '', level },
            [chatTarget.uid]: { name: chatTarget.name, photoURL: chatTarget.photoURL || '', xp: chatTarget.xp || 0, level: chatTarget.level || 1 }
          },
          readAt: { [user.uid]: now }
        },
        merge: true
      });
      await FirebaseFirestore.addDocument({
        reference: `chats/${chatId}/messages`,
        data: {
          senderId: user.uid,
          senderName: displayName || 'Explorer',
          text,
          createdAt: now
        }
      });
      await FirebaseFirestore.setDocument({
        reference: `chats/${chatId}`,
        data: { lastMessage: text, lastMessageAt: now, lastSenderId: user.uid, readAt: { [user.uid]: now } },
        merge: true
      });
      setChatInput('');
    } catch (e: any) {
      console.error('Send message failed:', e);
      setAlertMessage("Message send nahi hua. Internet check karke try karein.", 'error');
    } finally {
      setChatSending(false);
    }
  };

  // Live messages for the open chat
  useEffect(() => {
    if (!chatTarget || !user) return;
    let cancelled = false;
    const chatId = chatIdFor(user.uid, chatTarget.uid);

    FirebaseFirestore.addCollectionSnapshotListener(
      {
        reference: `chats/${chatId}/messages`,
        queryConstraints: [
          { type: 'orderBy', fieldPath: 'createdAt', directionStr: 'asc' },
          { type: 'limit', limit: 200 }
        ]
      },
      (event) => {
        const msgs = ((event as any)?.snapshots || []).map((s: any) => ({ id: s.id, ...(s.data || {}) }));
        setChatMessages(msgs);
      }
    ).then(id => {
      if (cancelled) {
        FirebaseFirestore.removeSnapshotListener({ callbackId: id }).catch(() => {});
      } else {
        chatListenerId.current = id;
      }
    }).catch(e => console.error('Chat listener failed:', e));

    return () => {
      cancelled = true;
      const id = chatListenerId.current;
      if (id) {
        FirebaseFirestore.removeSnapshotListener({ callbackId: id }).catch(() => {});
        chatListenerId.current = null;
      }
    };
  }, [chatTarget, user]);

  // Read receipt jab bhi doosre ka naya message aaye (chat khula ho)
  useEffect(() => {
    const last = chatMessages[chatMessages.length - 1];
    if (!chatTarget || !user || !last || last.senderId === user.uid) return;
    const chatId = chatIdFor(user.uid, chatTarget.uid);
    (async () => {
      try {
        const { snapshot } = await FirebaseFirestore.getDocument({ reference: `chats/${chatId}` });
        const data: any = snapshot?.data;
        if (!data?.participants) return;
        if ((data.readAt?.[user.uid] || 0) >= (last.createdAt || 0)) return;
        await FirebaseFirestore.setDocument({
          reference: `chats/${chatId}`,
          data: { readAt: { ...(data.readAt || {}), [user.uid]: Date.now() } },
          merge: true
        });
      } catch {}
    })();
  }, [chatTarget, user, chatMessages]);

  useEffect(() => {
    const el = document.querySelector('[data-chat-scroll]');
    if (el) setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), 80);
  }, [chatMessages]);

  // Inbox listener runs while Profile is open so the unread badge stays live
  useEffect(() => {
    if (!user || activeTab !== 'profile') return;
    let cancelled = false;

    FirebaseFirestore.addCollectionSnapshotListener(
      {
        reference: 'chats',
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            { type: 'where', fieldPath: 'participants', opStr: 'array-contains', value: user.uid }
          ]
        },
        queryConstraints: [{ type: 'limit', limit: 50 }]
      },
      (event) => {
        const list = ((event as any)?.snapshots || [])
          .map((s: any) => ({ id: s.id, ...(s.data || {}) }))
          .sort((a: any, b: any) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
        setInboxChats(list);
      }
    ).then(id => {
      if (cancelled) {
        FirebaseFirestore.removeSnapshotListener({ callbackId: id }).catch(() => {});
      } else {
        inboxListenerId.current = id;
      }
    }).catch(e => console.error('Inbox listener failed:', e));

    return () => {
      cancelled = true;
      const id = inboxListenerId.current;
      if (id) {
        FirebaseFirestore.removeSnapshotListener({ callbackId: id }).catch(() => {});
        inboxListenerId.current = null;
      }
    };
  }, [user, activeTab]);

  useEffect(() => {
    if (subscriptionModalOpen) loadPremiumPrices();
  }, [subscriptionModalOpen]);

  const unreadChats = inboxChats.filter(c =>
    c.lastSenderId !== user?.uid && (c.lastMessageAt || 0) > (c.readAt?.[user?.uid] || 0)
  ).length;

  // Level curve: level 1 = 0–100 XP, level 2 = 100–400, level 3 = 400–900 …
  const levelFloorXp = Math.pow(level - 1, 2) * 100;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const levelProgressPct = Math.min(100, Math.max(0, ((xp - levelFloorXp) / Math.max(1, nextLevelXp - levelFloorXp)) * 100));

  const evaluateArenaSentence = async () => {
    if (!arenaInput.trim() || arenaLoading || !arenaWordObj) return;
    setArenaLoading(true);
    setArenaFeedback(null);

    try {
      if (!GEMINI_API_KEY && !GROQ_API_KEY) {
         setArenaFeedback({ damage: 0, msg: "AI judge is offline right now. Try again in a moment.", crit: false });
         setArenaLoading(false);
         return;
      }

      const content = await aiComplete({
        tier: 'smart',
        json: true,
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
      });
      const result = JSON.parse(stripJsonFences(content));
      
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
      if (!GEMINI_API_KEY && !GROQ_API_KEY) throw new Error('API Key missing');

      // Placeholder bubble jo real-time stream hota rahega — user ko turant jawab dikhta hai
      setAiChat(prev => [...prev, { role: 'model' as const, content: '' }]);

      const botResponse = await aiCompleteStream({
        tier: 'smart',
        onDelta: (delta) => setAiChat(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'model') next[next.length - 1] = { ...last, content: last.content + delta };
          return next;
        }),
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
          ...newMessages.slice(-4).map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
          { role: 'user', content: text }
        ] as AiMessage[]
      });
      // Stream complete — final content verify/set karo
      setAiChat(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === 'model' && last.content !== botResponse) {
          next[next.length - 1] = { role: 'model' as const, content: botResponse };
        }
        return next;
      });
      
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
      const reason = String((err as any)?.message || '');
      const errorContent = reason.includes('API Key missing')
        ? "I'm not fully set up yet, so I can't reply right now. Please try again later."
        : "I couldn't reach my brain just now. Check your internet connection and send that again.";
      setAiChat(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        // Empty streaming placeholder ko error message se replace karo
        if (last && last.role === 'model' && !last.content) {
          next[next.length - 1] = { role: 'model' as const, content: errorContent };
        } else {
          next.push({ role: 'model' as const, content: errorContent });
        }
        return next;
      });
    } finally {
      setIsAiLoading(false);
      setTimeout(() => {
        const el = aiChatScrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 mb-6"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <BookOpen className="w-10 h-10" />
            </motion.div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-white mb-2"
          >
            LexiQuest
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-300 font-bold text-sm"
          >
            <span className="inline-flex items-center gap-1.5">
              Loading your daily words
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-1 h-1 bg-indigo-400 rounded-full" />
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} className="w-1 h-1 bg-indigo-400 rounded-full" />
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} className="w-1 h-1 bg-indigo-400 rounded-full" />
            </span>
          </motion.div>
        </div>
      </div>
    );
  }

  if (needsUpdate) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
         <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-indigo-200/50 rounded-full blur-3xl" />
         <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-64 h-64 bg-purple-200/50 rounded-full blur-3xl" />
         
        <div className="relative w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-200 animate-bounce">
          <RefreshCw className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight leading-tight">
          Update Required 🚀
        </h2>

        <p className="text-slate-500 text-base mb-6 max-w-xs leading-relaxed font-medium">
          A fresh update for LexiQuest is ready. Get new words, smarter AI, and better performance now!
        </p>

        <div className="flex items-center gap-3 mb-8 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current</span>
            <span className="text-sm font-black text-slate-900">v{currentVersion}</span>
          </div>
          <div className="flex-1 h-px bg-slate-200 relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-500 rounded-full" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Required</span>
            <span className="text-sm font-black text-indigo-600">v{requiredVersion || 'Latest'}</span>
          </div>
        </div>
        
        <button
          onClick={() => {
            if (Capacitor.isNativePlatform()) {
              window.open('https://play.google.com/store/apps/details?id=com.lexiquest.app', '_system');
            } else {
              window.open('https://play.google.com/store/apps/details?id=com.lexiquest.app', '_blank');
            }
          }}
          className="w-full max-w-sm py-4 bg-indigo-600 text-white rounded-2xl font-black text-base shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <Download className="w-5 h-5" />
          Update Now
        </button>
        
        <div className="mt-10 flex flex-col items-center gap-2">
           <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border border-slate-200">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Mandatory Update Required</span>
           </div>
           <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
             Update to continue using LexiQuest
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
    <div className="h-[100dvh] w-full flex overflow-hidden bg-gray-50 font-sans text-gray-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col bg-white border-r border-gray-200">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-gray-100 shrink-0">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-black tracking-tight text-slate-900">
            Lexi<span className="text-indigo-600">Quest</span>
          </h1>
        </div>
        <button
          onClick={() => setActiveTab('profile')}
          className="mx-3 mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3 text-left hover:bg-white hover:border-indigo-100 transition-colors"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-600 text-white flex items-center justify-center text-sm font-black shrink-0">
            {profileImage ? (
              <img src={profileImage} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              (displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900 truncate">{displayName || 'Explorer'}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LVL {level} · {streak} day streak</p>
          </div>
          <TierBadge tier={leagueTier} size={22} />
        </button>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {([
            { id: 'learn' as Tab, label: 'Journey', icon: Book },
            { id: 'test' as Tab, label: 'Arena', icon: Sword },
            { id: 'ai-coach' as Tab, label: 'Lexi Coach', icon: Bot },
            { id: 'profile' as Tab, label: 'Profile', icon: User },
          ]).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
          <div className="pt-3 mt-3 border-t border-gray-100 space-y-1">
            <button
              onClick={() => setActiveTab('dictionary')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'dictionary' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <Search className="w-5 h-5" />
              Dictionary
            </button>
            <button
              onClick={() => setActiveTab('grammar')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'grammar' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <BookOpen className="w-5 h-5" />
              Grammar
            </button>
          </div>
        </nav>
        {!isPremium && (
          <button
            onClick={() => setSubscriptionModalOpen(true)}
            className="m-3 p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-left shadow-lg shadow-indigo-100 hover:opacity-95 transition-opacity"
          >
            <p className="text-xs font-black">Remove Ads · Premium</p>
            <p className="text-[10px] text-white/80 mt-0.5">
              {premiumPrices.monthly ? `${premiumPrices.monthly}/month` : 'Monthly'} · {premiumPrices.yearly ? `${premiumPrices.yearly}/year` : 'Yearly'}
            </p>
          </button>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Top Header - Glassmorphism style */}
      <header className="shrink-0 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 z-40 px-4 py-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] flex justify-between items-center gap-2 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="lg:hidden flex items-center gap-2 min-w-0">
            {activeTab === 'learn' ? (
              <>
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 truncate">
                  Lexi<span className="text-indigo-600">Quest</span>
                </h1>
              </>
            ) : (
              <h1 className="text-lg font-black tracking-tight text-slate-900 truncate">
                {{ test: 'Arena', 'ai-coach': 'Lexi Coach', profile: 'Profile', dictionary: 'Dictionary', grammar: 'Grammar' }[activeTab]}
              </h1>
            )}
          </div>
          <div className="hidden lg:block text-sm font-black text-slate-500 uppercase tracking-[0.15em]">
            {{ learn: 'Journey', test: 'Arena', 'ai-coach': 'Lexi Coach', profile: 'Profile', dictionary: 'Dictionary', grammar: 'Grammar' }[activeTab]}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            title="Daily streak"
            className="flex items-center gap-1 h-9 pl-2 pr-2.5 rounded-full bg-orange-50 border border-orange-100 text-orange-600 active:scale-95 transition-transform"
          >
            <Flame className="w-4 h-4" />
            <span className="text-xs font-black leading-none">{streak}</span>
          </button>
          <button
            onClick={() => { setDailyWordsModalOpen(true); prefetchSpeech(dailyWords.map(w => w.word)); }}
            className="relative w-9 h-9 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
            title="Daily Challenge"
          >
            <Target className="w-5 h-5" />
            {dailyWordsLearned < dailyWords.length && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[16px] h-4 bg-pink-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white">
                {dailyWords.length - dailyWordsLearned}
              </span>
            )}
          </button>
          {isAdmin && (
            <button
              onClick={() => setAdminAddModalOpen(true)}
              className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 hover:bg-amber-100 transition-colors"
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
            className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-indigo-600 text-white transition-all ${activeTab === 'profile' ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white' : 'border border-white shadow-sm'}`}
            title="Profile"
          >
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-black">{(displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}</span>
            )}
          </button>
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav
        style={bannerVisible ? { bottom: 60 } : undefined}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 pb-safe shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)]"
      >
        <div className="grid grid-cols-5 items-end px-1">
          <button
            onClick={() => setActiveTab('learn')}
            className="flex flex-col items-center justify-center gap-0.5 pt-2 pb-2.5"
          >
            <span className={`px-3 py-1 rounded-full transition-all ${activeTab === 'learn' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
              <Book className="w-5 h-5" />
            </span>
            <span className={`text-[10px] tracking-tight ${activeTab === 'learn' ? 'font-black text-indigo-600' : 'font-bold text-slate-500'}`}>Journey</span>
          </button>
          <button
            onClick={() => setActiveTab('dictionary')}
            className="flex flex-col items-center justify-center gap-0.5 pt-2 pb-2.5"
          >
            <span className={`px-3 py-1 rounded-full transition-all ${activeTab === 'dictionary' || activeTab === 'grammar' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
              <Search className="w-5 h-5" />
            </span>
            <span className={`text-[10px] tracking-tight ${activeTab === 'dictionary' || activeTab === 'grammar' ? 'font-black text-indigo-600' : 'font-bold text-slate-500'}`}>Dictionary</span>
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className="flex flex-col items-center justify-center gap-0.5 -mt-5"
          >
            <span className={`w-14 h-14 rounded-full flex items-center justify-center text-white ring-4 ring-white transition-all ${activeTab === 'test' ? 'bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-300 scale-105' : 'bg-indigo-600 shadow-md shadow-indigo-200'}`}>
              <Sword className="w-6 h-6" />
            </span>
            <span className={`text-[10px] tracking-tight ${activeTab === 'test' ? 'font-black text-indigo-600' : 'font-bold text-slate-500'}`}>Arena</span>
          </button>
          <button
            onClick={() => setActiveTab('ai-coach')}
            className="flex flex-col items-center justify-center gap-0.5 pt-2 pb-2.5"
          >
            <span className={`px-3 py-1 rounded-full transition-all ${activeTab === 'ai-coach' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
              <Bot className="w-5 h-5" />
            </span>
            <span className={`text-[10px] tracking-tight ${activeTab === 'ai-coach' ? 'font-black text-indigo-600' : 'font-bold text-slate-500'}`}>Lexi</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className="flex flex-col items-center justify-center gap-0.5 pt-2 pb-2.5 relative"
          >
            <span className={`px-3 py-1 rounded-full transition-all ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
              <User className="w-5 h-5" />
            </span>
            <span className={`text-[10px] tracking-tight ${activeTab === 'profile' ? 'font-black text-indigo-600' : 'font-bold text-slate-500'}`}>Profile</span>
            {unreadChats > 0 && (
              <span className="absolute top-1 right-3 min-w-4 h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">{unreadChats}</span>
            )}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={`flex-1 min-h-0 flex flex-col pb-[calc(4.75rem+var(--safe-area-bottom))] lg:pb-0 ${activeTab === 'ai-coach' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {isOffline && (
          <div className="bg-amber-500 text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 animate-pulse sticky top-0 z-20 shadow-sm">
            <PhoneOff className="w-3 h-3" />
            Working Offline
          </div>
        )}

        {activeTab === 'learn' && (
          <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50">
            <div className="max-w-4xl mx-auto">
              {/* Premium Hero Section */}
              <div className="mb-6 relative">
                <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-8 -translate-x-8 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col gap-3 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 shrink-0">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-0.5">
                        Learn Vocabulary ⚡
                      </h2>
                      <p className="text-slate-500 font-medium text-xs leading-snug">
                        Master thousands of English words with daily vocabulary goals.
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
                    <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Target className="w-5 h-5" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Score</p>
                        <p className="text-lg font-black text-slate-900">{averageScore.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tests</p>
                        <p className="text-lg font-black text-slate-900">{totalTestsTaken}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Box */}
              <div className="mb-4 relative group">
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

                {/* Daily 100 auto-add status */}
                {dailyWordsStatus === 'loading' && (
                  <div className="mt-4 flex items-center gap-2 px-3.5 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
                    <p className="text-[11px] font-bold text-indigo-700">Aaj ke 100 naye words bante ja rahe hain…</p>
                  </div>
                )}
                {dailyWordsStatus === 'error' && (
                  <button
                    onClick={ensureDailyAiWords}
                    className="mt-4 w-full flex items-center gap-2 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-left"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <p className="text-[11px] font-bold text-amber-800 flex-1">Naye words add nahi hue. Tap to retry.</p>
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  </button>
                )}

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
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col group hover:border-indigo-300 transition-colors cursor-pointer"
                    onClick={() => setExpandedWord(expandedWord === item.word ? null : item.word)}
                  >
                     <div className="flex justify-between items-center w-full gap-2">
                       <div className="flex flex-col min-w-0">
                         <span className="font-bold text-base text-slate-900 truncate">{item.word}</span>
                         <p className={`text-xs text-slate-500 line-clamp-1 ${expandedWord === item.word ? 'hidden' : ''}`}>{item.meaning}</p>
                         {srsData[(item.word || '').toLowerCase()] && (
                           <div className="flex gap-1 mt-1.5" title={`Mastery Level: ${srsData[(item.word || '').toLowerCase()]?.level || 0}/5`}>
                             {[...Array(5)].map((_, i) => (
                               <div 
                                 key={i} 
                                 className={`w-3 h-1 rounded-full ${i < (srsData[(item.word || '').toLowerCase()]?.level || 0) ? 'bg-indigo-500' : 'bg-slate-200'}`} 
                               />
                             ))}
                           </div>
                         )}
                       </div>
                       <div className="flex items-center gap-0.5 shrink-0">
                         <button
                           onClick={(e) => { e.stopPropagation(); toggleSaveWord(item); }}
                           className={`p-2 rounded-lg transition-colors ${savedWords.some(sw => sw.word === item.word) ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:text-indigo-500 hover:bg-slate-50'}`}
                           title={savedWords.some(sw => sw.word === item.word) ? "Remove from saved" : "Save word"}
                         >
                           <Save className={`w-4 h-4 ${savedWords.some(sw => sw.word === item.word) ? 'fill-indigo-600' : ''}`} />
                         </button>
                         <button
                           onClick={(e) => { e.stopPropagation(); playWord(item.word); }}
                           className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                           title="Listen to pronunciation"
                         >
                           <Volume2 className="w-4 h-4" />
                         </button>
                       </div>
                     </div>
                    {expandedWord === item.word && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-sm">
                        <p className="text-slate-700 mb-1.5"><span className="font-bold text-indigo-600">Meaning: </span>{item.meaning}</p>
                        {item.example && item.example.trim() && (
                          <p className="text-slate-600 italic"><span className="font-bold text-indigo-600 not-italic">Example: </span>"{item.example}"</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>

              <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mt-6 mb-6">
                <button
                  onClick={() => {
                    setLearnPage(p => Math.max(0, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={learnPage === 0}
                  className="px-4 py-2.5 bg-slate-50 text-slate-700 rounded-xl disabled:opacity-40 hover:bg-slate-100 transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1 active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <span className="text-sm font-bold text-slate-600">
                  Page {learnPage + 1} of {totalLearnPages}
                </span>
                <button
                  onClick={() => {
                    setLearnPage(p => Math.min(totalLearnPages - 1, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={learnPage === totalLearnPages - 1}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl disabled:bg-slate-200 disabled:text-slate-400 hover:bg-indigo-700 transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95"
                >
                  Next
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'grammar' && (
          <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50">
            <div className="max-w-4xl mx-auto">
              {/* Learn Tools switch */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl mb-5 max-w-xs">
                <button
                  onClick={() => setActiveTab('dictionary')}
                  className="py-2 rounded-xl text-slate-500 text-xs font-black hover:text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" /> Words
                </button>
                <button
                  onClick={() => setActiveTab('grammar')}
                  className="py-2 rounded-xl bg-white text-indigo-600 text-xs font-black shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Languages className="w-3.5 h-3.5" /> Grammar
                </button>
              </div>

              <div className="mb-6 flex items-start gap-3">
                {grammarSubTab !== 'categories' && (
                   <button 
                    onClick={() => {
                      if (grammarSubTab === 'mode') setGrammarSubTab('categories');
                      else setGrammarSubTab('mode');
                    }}
                    className="w-10 h-10 shrink-0 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center active:scale-95 mt-0.5"
                    aria-label="Back"
                   >
                     <ChevronLeft className="w-5 h-5" />
                   </button>
                )}
                <div className="min-w-0">
                  <h2 className="text-xl font-black flex items-center gap-3 text-slate-900">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
                      <Languages className="w-5 h-5" />
                    </div>
                    <span>Grammar Hub</span>
                  </h2>
                  <p className="text-slate-500 font-medium text-xs mt-1 max-w-sm sm:max-w-lg">
                    Master essential English rules with simple explanations and daily practice.
                  </p>
                </div>
              </div>

              {grammarSubTab === 'categories' && (() => {
                const categories = Array.from(new Set(GRAMMAR_RULES.map(r => r.category))).sort();
                const totalRules = GRAMMAR_RULES.length;
                const totalLearned = GRAMMAR_RULES.filter(r => learnedRules.includes(r.id)).length;
                const pct = totalRules ? Math.round((totalLearned / totalRules) * 100) : 0;
                const nextCategory = categories.find(cat => GRAMMAR_RULES.some(r => r.category === cat && !learnedRules.includes(r.id))) || categories[0];

                return (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-100">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-100">Your progress</p>
                          <p className="text-lg font-black mt-0.5">{totalLearned} <span className="text-indigo-200 text-sm font-bold">of {totalRules} rules mastered</span></p>
                        </div>
                        <div className="w-11 h-11 shrink-0 rounded-xl bg-white/15 flex items-center justify-center text-white">
                          <Trophy className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.max(4, pct)}%` }} />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (!nextCategory) return;
                        setSelectedGrammarCategory(nextCategory);
                        setGrammarSubTab('learn');
                      }}
                      className="w-full p-3 bg-white border border-indigo-100 rounded-2xl shadow-sm flex items-center gap-3 text-left hover:border-indigo-300 active:scale-[0.99] transition-all"
                    >
                      <div className="w-9 h-9 shrink-0 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Continue learning</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{nextCategory || 'All rules mastered!'}</p>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-indigo-300 rotate-180 shrink-0" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {categories.map(cat => {
                        const rules = GRAMMAR_RULES.filter(r => r.category === cat);
                        const learned = rules.filter(r => learnedRules.includes(r.id)).length;
                        const catPct = Math.round((learned / rules.length) * 100);
                        return (
                          <motion.div
                            key={cat}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedGrammarCategory(cat);
                              setGrammarSubTab('mode');
                            }}
                            className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 shrink-0 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <Book className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-slate-900 truncate">{cat}</h3>
                                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                                  {learned}/{rules.length} learned
                                </p>
                              </div>
                              <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180 shrink-0" />
                            </div>
                            <div className="mt-2.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${learned === rules.length ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.max(learned ? 6 : 0, catPct)}%` }} />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {grammarSubTab === 'mode' && (
                <div className="flex flex-col py-4">
                  <div className="text-center mb-5">
                    <h3 className="text-2xl font-black text-slate-900 mb-1">{selectedGrammarCategory}</h3>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Choose your path</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mx-auto">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setGrammarSubTab('learn')}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3 text-left hover:border-indigo-300 hover:shadow-md transition-all group"
                    >
                      <div className="w-11 h-11 shrink-0 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">Learn Rules</p>
                        <p className="text-[11px] text-slate-500">Read simple explanations first</p>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180 shrink-0" />
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startGrammarTest(selectedGrammarCategory!)}
                      className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center gap-3 text-left hover:border-amber-300 hover:shadow-md transition-all group"
                    >
                      <div className="w-11 h-11 shrink-0 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">Take Test</p>
                        <p className="text-[11px] text-slate-500">Check what you've learned</p>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180 shrink-0" />
                    </motion.button>
                  </div>
                </div>
              )}

              {grammarSubTab === 'test' && (
                <div className="max-w-2xl mx-auto">
                  {!grammarTestState.showResults ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-5">
                         <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Question {grammarTestState.currentIndex + 1} / {grammarTestState.questions.length}</span>
                         <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 transition-all" style={{ width: `${((grammarTestState.currentIndex + 1) / grammarTestState.questions.length) * 100}%` }} />
                         </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 mb-5 leading-snug">
                        {grammarTestState.questions[grammarTestState.currentIndex].question}
                      </h3>

                      <div className="space-y-2.5">
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
                            className="w-full p-4 text-left bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 text-sm hover:border-indigo-300 hover:bg-indigo-50 transition-all active:scale-[0.98]"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-100 p-6 sm:p-10 shadow-2xl text-center">
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
                <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
                  {GRAMMAR_RULES.filter(r => r.category === selectedGrammarCategory).map(rule => (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 p-5 sm:p-8 shadow-xl shadow-slate-100/50"
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

                      {/* --- AI SMART LAB (collapsed by default so the rule stays easy to read) --- */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <button
                          onClick={() => setOpenRuleLab(prev => ({ ...prev, [rule.id]: !prev[rule.id] }))}
                          className="w-full flex items-center justify-between gap-3 text-left"
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Practice with AI</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Optional</span>
                          </span>
                          <ChevronLeft className={`w-4 h-4 text-slate-400 transition-transform ${openRuleLab[rule.id] ? '-rotate-90' : 'rotate-180'}`} />
                        </button>

                        {openRuleLab[rule.id] && (<>
                        <div className="flex items-center justify-end mb-3 mt-3">
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
                            id={`rule-lab-${rule.id}`}
                            name={`rule-lab-${rule.id}`}
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
                        </>)}
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
                        className={`mt-4 w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg ${learnedRules.includes(rule.id) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
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
          <div className={`flex-1 p-5 lg:p-8 relative transition-colors duration-500 bg-slate-50`}>
            <div className="max-w-2xl mx-auto text-center">
              
              {/* --- TEST HUB --- */}
              {arenaState === 'idle' && !showClassicTest && (
                <div className="animate-in fade-in zoom-in duration-500 pt-1">
                  <div className="relative inline-block mb-2">
                    <div className="absolute inset-0 bg-amber-200/50 rounded-full blur-2xl" />
                    <Trophy className="w-12 h-12 text-amber-500 relative z-10" />
                  </div>
                  <h2 className="text-2xl font-black mb-1 tracking-tight text-slate-900">Training Center</h2>
                  <p className="text-slate-500 mb-5 max-w-[280px] mx-auto text-xs font-medium">
                    Choose your challenge. Master vocabulary through combat or precision testing.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-3xl mx-auto w-full">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={startArenaBattle}
                      className="w-full py-3.5 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl shadow-lg shadow-orange-200 flex flex-col items-center justify-center gap-0.5 relative overflow-hidden group"
                    >
                      <span className="flex items-center gap-2 text-base font-black"><Flame className="w-4 h-4" /> Boss Battle</span>
                      <span className="text-[9px] font-bold text-orange-100 uppercase tracking-[0.2em]">Sentence Striker Mode</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowClassicTest(true)}
                      className="w-full py-3.5 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl shadow-lg shadow-indigo-200 flex flex-col items-center justify-center gap-0.5 relative overflow-hidden group"
                    >
                      <span className="flex items-center gap-2 text-base font-black"><GraduationCap className="w-4 h-4" /> Spelling Test</span>
                      <span className="text-[9px] font-bold text-indigo-100 uppercase tracking-[0.2em]">Classic Mastery Mode</span>
                    </motion.button>
                    
                    <button
                      disabled
                      className="w-full py-3.5 bg-white text-slate-400 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-0.5 cursor-not-allowed"
                    >
                      <span className="flex items-center gap-2 text-sm font-black"><Zap className="w-4 h-4" /> Speed Sprint</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest">Coming Soon</span>
                    </button>
                  </div>
                </div>
              )}

              {/* --- CLASSIC SPELLING TEST --- */}
              {showClassicTest && (
                <div className={`animate-in fade-in slide-in-from-bottom-8 duration-500 w-full`}>
                  {testState === 'start' && (
                    <div className="bg-white text-slate-900 rounded-3xl p-4 shadow-sm border border-slate-200">
                      <div className="flex items-center gap-2.5 mb-3.5">
                        <button 
                          onClick={() => setShowClassicTest(false)}
                          className="w-9 h-9 shrink-0 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center"
                          aria-label="Back"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="min-w-0 text-left">
                          <h2 className="text-base font-black text-slate-900 leading-tight">Vocabulary Mastery</h2>
                          <p className="text-slate-500 text-[11px] font-medium">Pick a difficulty and a mode</p>
                        </div>
                      </div>

                      <div className="mb-3.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 text-left">Set Difficulty</p>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                          {(['easy', 'medium', 'hard'] as const).map((d) => (
                            <button
                              key={d}
                              onClick={() => setTestDifficulty(d)}
                              className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${testDifficulty === d ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { id: 'listen-mcq', label: 'Listen & Choose', hint: 'Hear the word, pick its meaning', icon: <Volume2 className="w-4 h-4" /> },
                          { id: 'listen-type', label: 'Listen & Type', hint: 'Hear it, spell it back', icon: <PenTool className="w-4 h-4" /> },
                          { id: 'visual-mcq', label: 'Visual MCQ', hint: 'Read the sentence, choose the word', icon: <Book className="w-4 h-4" /> },
                        ].map(mode => (
                          <button
                            key={mode.id}
                            onClick={() => startTest(mode.id as 'listen-mcq' | 'listen-type' | 'visual-mcq')}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-2.5 text-left group active:scale-[0.99]"
                          >
                            <div className="w-9 h-9 shrink-0 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              {mode.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 text-[13px]">{mode.label}</p>
                              <p className="text-[10px] text-slate-500 truncate">{mode.hint}</p>
                            </div>
                            <ChevronLeft className="w-3.5 h-3.5 text-slate-300 rotate-180 shrink-0" />
                          </button>
                        ))}

                        <button
                          onClick={() => startTest('meaning-mcq')}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-2.5 text-left group relative active:scale-[0.99]"
                        >
                          <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center transition-all bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-[13px]">Context King</p>
                            <p className="text-[10px] text-slate-500 truncate">Learn from real sentences</p>
                          </div>
                          <ChevronLeft className="w-3.5 h-3.5 text-slate-300 rotate-180 shrink-0" />
                        </button>
                      </div>
                    </div>
                  )}

                  {testState === 'testing' && (
                    <div className="bg-white text-slate-900 rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-100">
                      <div className="flex justify-between items-center mb-3.5">
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
                      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
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
                          className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200"
                        >
                          <Volume2 className="w-7 h-7" />
                        </motion.button>
                      )}

                      {(testMode === 'meaning-mcq' || testMode === 'visual-mcq') && (
                        <div className="mb-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center animate-in zoom-in">
                          {(() => {
                            const wordObj = completeWordPool.find(w => (w.word || '').toLowerCase() === (testWords[currentTestWordIndex] || '').toLowerCase());
                            if (!wordObj) return null;
                            return (
                              <div className="space-y-2">
                                {testMode === 'visual-mcq' && (
                                  <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Identify the correct spelling</p>
                                )}
                                <p className="text-xl font-black text-slate-900">{wordObj.meaning}</p>
                                <div className="h-px bg-slate-200 w-10 mx-auto" />
                                <p className="text-sm font-medium text-slate-600 italic">"{wordObj.example.replace(new RegExp(wordObj.word, 'gi'), '_____')}"</p>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {testMode === 'listen-type' ? (
                        <div className="max-w-sm mx-auto space-y-3">
                          <input
                            type="text"
                            value={typedAnswer}
                            onChange={e => setTypedAnswer(e.target.value)}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black text-center outline-none focus:border-indigo-500 transition-all"
                            placeholder="Type what you hear..."
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleAnswerSubmit(typedAnswer)}
                          />
                          <button
                            onClick={() => handleAnswerSubmit(typedAnswer)}
                            className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-black text-base shadow-lg active:scale-95 transition-all"
                          >
                            Check Answer
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                          {mcqOptions[currentTestWordIndex]?.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() => handleAnswerSubmit(opt)}
                              className="px-2 py-3.5 bg-white border-2 border-slate-100 rounded-xl font-bold text-slate-700 hover:border-indigo-500 hover:bg-indigo-50 transition-all active:scale-95 text-sm sm:text-base break-words"
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
                          className={`mt-4 p-3 rounded-2xl flex items-center justify-center gap-2 ${feedbackState === 'correct' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}
                        >
                          {feedbackState === 'correct' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
                          <span className="text-base font-black">{feedbackState === 'correct' ? 'Excellent!' : feedbackState === 'timeout' ? 'Time Out!' : 'Incorrect'}</span>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {testState === 'results' && (
                    <div className="bg-white text-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-100 text-center">
                      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-4 shadow-inner">
                        <Trophy className="w-8 h-8" />
                      </div>
                      <h2 className="text-2xl font-black mb-1">Test Complete!</h2>
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-5">You've leveled up your skills</p>
                      
                      <div className="grid grid-cols-2 gap-2.5 mb-5">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <p className="text-2xl font-black text-indigo-600">{userAnswers.filter((ans, i) => (ans || '').toLowerCase() === (testWords[i] || '').toLowerCase()).length}</p>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Correct</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <p className="text-2xl font-black text-slate-900">+{userAnswers.filter((ans, i) => (ans || '').toLowerCase() === (testWords[i] || '').toLowerCase()).length * 10} XP</p>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gained</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setTestState('start');
                          setShowClassicTest(false);
                        }}
                        className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-black text-base shadow-lg hover:bg-indigo-600 transition-all active:scale-95"
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
                  <div className="flex justify-between items-center mb-3">
                    <button 
                      onClick={() => setArenaState('idle')}
                      className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 bg-white rounded-lg shadow-sm active:scale-95 border border-slate-200"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Flee</span>
                    </button>
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 flex items-center gap-1"><Flame className="w-3 h-3"/> Boss Battle</span>
                  </div>
                  
                  {arenaState === 'battling' && arenaWordObj && (
                    <>
                      {/* Monster UI */}
                      <div className="relative w-24 h-24 mx-auto mb-1">
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl animate-pulse" />
                        <img 
                          src="https://api.dicebear.com/7.x/bottts/svg?seed=Monster&backgroundColor=transparent" 
                          alt="Monster" 
                          className={`w-full h-full object-contain relative z-10 transition-transform duration-300 ${arenaFeedback ? 'scale-90 opacity-80' : 'animate-bounce'}`} 
                        />
                      </div>

                      {/* HP Bar */}
                      <div className="max-w-xs mx-auto mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monster HP</span>
                          <span className="text-[11px] font-black text-slate-700">{arenaHp}/100</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500" 
                            style={{ width: `${arenaHp}%` }}
                          />
                        </div>
                      </div>

                      {/* Feedback Overlay */}
                      {arenaFeedback && (
                         <div className="mb-3 p-3 rounded-xl border animate-in slide-in-from-top-4 bg-white border-slate-200 shadow-sm text-left">
                            <h4 className={`text-sm font-black mb-0.5 ${arenaFeedback.crit ? 'text-orange-600' : arenaFeedback.damage > 0 ? 'text-slate-900' : 'text-slate-500'}`}>
                              {arenaFeedback.damage > 0 ? `-${arenaFeedback.damage} DAMAGE` : 'NO DAMAGE'} {arenaFeedback.crit && "CRITICAL HIT!"}
                            </h4>
                            <p className="text-slate-600 text-xs leading-snug">{arenaFeedback.msg}</p>
                         </div>
                      )}

                      {/* Weapon (Word) */}
                      <div className="mb-2.5">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1.5">Your Weapon</p>
                        <div className="inline-block px-4 py-2 bg-white border-2 border-indigo-100 rounded-xl shadow-sm">
                          <span className="text-xl font-black text-indigo-600">{arenaWordObj.word}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 font-medium">{arenaWordObj.meaning}</p>
                      </div>

                      {/* Input */}
                      <div className="flex flex-col gap-2.5">
                        <div className="relative">
                          <input
                            type="text"
                            disabled={arenaLoading}
                            value={arenaInput}
                            onChange={(e) => setArenaInput(e.target.value)}
                            placeholder="Type a sentence using the word..."
                            className="w-full bg-white border-2 border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-colors"
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg flex items-center justify-center transition-all"
                          >
                            <Bot className="w-5 h-5" />
                          </button>
                        </div>
                        <button
                          onClick={evaluateArenaSentence}
                          disabled={arenaLoading || !arenaInput.trim()}
                          className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:shadow-none"
                        >
                          {arenaLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sword className="w-5 h-5" />}
                          {arenaLoading ? "Attacking..." : "Attack"}
                        </button>
                      </div>
                    </>
                  )}

                  {arenaState === 'result' && (
                    <div className="animate-in zoom-in duration-500 py-6">
                      <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                      <h2 className="text-3xl font-black mb-2 text-slate-900">VICTORY!</h2>
                      <p className="text-slate-500 mb-5 text-sm font-medium max-w-xs mx-auto">You destroyed the Grammar Monster and earned 500 XP!</p>
                      <button
                        onClick={() => setArenaState('idle')}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
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
          <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50/50">
            <div className="max-w-5xl mx-auto space-y-5 pb-10 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
              
              {/* Profile Hero */}
              <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 shadow-sm lg:col-span-2">
                {/* Cover */}
                <div className="relative h-24 sm:h-32 bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-[0.18]"
                    style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '18px 18px' }}
                  />
                  <div className="absolute -top-14 -right-8 w-44 h-44 bg-white/15 rounded-full blur-2xl" />
                  <div className="absolute -bottom-20 left-6 w-52 h-52 bg-purple-400/30 rounded-full blur-3xl" />
                  <span className="absolute top-3 right-4 text-[9px] font-black text-white/70 uppercase tracking-[0.25em]">LexiQuest Profile</span>
                </div>

                <div className="px-5 sm:px-6 pb-5">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                    <div className="relative -mt-10 sm:-mt-12 self-center sm:self-auto shrink-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-indigo-600 ring-4 ring-white shadow-lg flex items-center justify-center text-white text-3xl font-black">
                        {profileImage ? (
                          <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          (user?.displayName?.[0] || displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()
                        )}
                      </div>
                      <button
                        onClick={handleProfileImagePick}
                        className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-100 text-indigo-600 hover:scale-110 active:scale-90 transition-all"
                        title="Photo badlein"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 text-center sm:text-left pt-1 sm:pb-1">
                      {isEditingProfile ? (
                        <div className="flex flex-col gap-2.5">
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="text-lg font-bold bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all w-full placeholder-slate-400"
                            placeholder="Your Name"
                            autoFocus
                          />
                          <button
                            onClick={async () => {
                              const cleanName = displayName.trim() || 'Explorer';
                              setDisplayName(cleanName);
                              setIsEditingProfile(false);
                              localStorage.setItem('userName', cleanName);
                              setLeaderboard(prev => prev.map(u => u.uid === user?.uid ? { ...u, name: cleanName } : u));
                              if (user) {
                                try {
                                  await FirebaseFirestore.setDocument({
                                    reference: 'users/' + user.uid,
                                    data: { displayName: cleanName, name: cleanName },
                                    merge: true
                                  });
                                  setAlertMessage("Profile updated! ✨", 'success');
                                } catch (e) {
                                  setAlertMessage("Name save nahi hua. Internet check karein.", 'error');
                                }
                              }
                            }}
                            className="bg-indigo-600 text-white text-[11px] font-black py-2.5 rounded-xl uppercase tracking-widest px-5 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 w-fit mx-auto sm:mx-0"
                          > Save Changes </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-center sm:justify-start gap-1.5">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">{displayName}</h2>
                            <button
                              onClick={() => setIsEditingProfile(true)}
                              className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shrink-0"
                              title="Naam badlein"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                              <Zap className="w-3 h-3" /> LVL {level}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 border border-slate-200 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                              <GraduationCap className="w-3 h-3" />
                              {user?.email === MASTER_ADMIN_EMAIL ? 'Master Admin' : `${englishLevel} Learner`}
                            </span>
                            {isPremium && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Premium
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Compact XP row */}
                  <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Growth Level {level}</span>
                      <span className="text-[9px] font-bold text-slate-500 text-right">
                        {xp.toLocaleString()} XP total · {Math.max(0, nextLevelXp - xp).toLocaleString()} to LVL {level + 1}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200/80 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${levelProgressPct}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      />
                    </div>
                    <p className="mt-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                      {xpHistory[6] || 0} XP earned today
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 lg:col-start-1 lg:row-start-2">
              {/* Segmented Stats Strip */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-col items-center justify-center gap-1.5 text-center">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                  <span className="text-lg font-black text-slate-900 leading-none">{streak}</span>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Day Streak</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-col items-center justify-center gap-1.5 text-center">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <span className="text-lg font-black text-slate-900 leading-none">#{leaderboard.findIndex(u => u.uid === user?.uid) + 1 || '-'}</span>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Global Rank</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-col items-center justify-center gap-1.5 text-center">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <TierBadge tier={leagueTier} size={18} />
                  </div>
                  <span className="text-sm font-black text-slate-900 leading-none">{LEAGUE_TIERS[leagueTier].name}</span>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">League · {leaguePoints}/7</p>
                </div>
              </div>

              {/* Weekly League Challenge */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.85), transparent 60%), ${LEAGUE_TIERS[leagueTier].glow}` }}
                  >
                    <TierBadge tier={leagueTier} size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Weekly League</p>
                    <p className="text-sm font-black text-slate-900">{LEAGUE_TIERS[leagueTier].name} League</p>
                  </div>
                  {isPremium && (
                    <span className="text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full uppercase tracking-widest">Premium</span>
                  )}
                </div>

                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: LEAGUE_DAYS_PER_TIER }).map((_, dayIdx) => {
                    const done = dayIdx < leaguePoints;
                    return (
                      <div
                        key={dayIdx}
                        className={`flex-1 h-2 rounded-full transition-all ${done ? 'bg-indigo-600' : 'bg-slate-100 border border-slate-200'}`}
                        title={`Day ${dayIdx + 1}`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold text-slate-500">
                    {leaguePoints}/{LEAGUE_DAYS_PER_TIER} days
                  </span>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                    {leagueTier < LEAGUE_TIERS.length - 1
                      ? `${LEAGUE_DAYS_PER_TIER - leaguePoints} din aur → ${LEAGUE_TIERS[leagueTier + 1].name}`
                      : 'Max league 🏆'}
                  </span>
                </div>
                <p className="mt-2.5 text-[10px] font-medium text-slate-400 leading-relaxed">
                  Har din koi bhi task karo. 7 din = next league, miss = restart.
                </p>
              </div>

              {/* Messages + Premium */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setInboxOpen(true)}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 text-left hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.99]"
                >
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 relative">
                    <MessageSquare className="w-5 h-5" />
                    {unreadChats > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {unreadChats}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900">Messages</p>
                    <p className="text-[10px] font-bold text-slate-500 truncate">
                      {inboxChats.length > 0
                        ? `${inboxChats.length} chat${inboxChats.length > 1 ? 's' : ''}${unreadChats > 0 ? ` · ${unreadChats} new` : ''}`
                        : 'Ranked users se baat karein'}
                    </p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180 shrink-0" />
                </button>

                {isPremium ? (
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-emerald-900">Premium active</p>
                      <p className="text-[10px] font-bold text-emerald-700">No ads · thanks for supporting LexiQuest</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSubscriptionModalOpen(true)}
                    className="bg-gradient-to-br from-indigo-600 to-purple-600 p-4 rounded-2xl border border-indigo-500 shadow-sm flex items-center gap-3 text-left hover:shadow-lg transition-all active:scale-[0.99]"
                  >
                    <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-white shrink-0">
                      <Star className="w-5 h-5 fill-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white">Remove Ads · Premium</p>
                      <p className="text-[10px] font-bold text-white/80">₹299/month ya ₹1,788/year</p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-white/70 rotate-180 shrink-0" />
                  </button>
                )}
              </div>

              {/* Leaderboard Redesign */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] hidden sm:block">
                   <Trophy className="w-32 h-32 rotate-12 text-slate-900" />
                </div>
                <div className="flex items-center justify-between mb-5 relative z-10 gap-2">
                   <h3 className="text-base sm:text-lg font-black flex items-center gap-2 text-slate-900 whitespace-nowrap">
                      <Trophy className="w-5 h-5 text-amber-500 shrink-0" /> World Rankings
                   </h3>
                   <div className="flex items-center gap-2 shrink-0">
                     <button
                       onClick={() => setInboxOpen(true)}
                       className="relative text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 sm:px-3 py-1.5 rounded-full uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-1 whitespace-nowrap"
                     >
                       <MessageSquare className="w-3.5 h-3.5 sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Messages</span>
                       {unreadChats > 0 && (
                         <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center">{unreadChats}</span>
                       )}
                     </button>
                     <button 
                       onClick={() => setShowAllRankings(!showAllRankings)}
                       className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full uppercase tracking-widest hover:bg-slate-200 transition-all whitespace-nowrap"
                     >
                       {showAllRankings ? 'Top 5' : 'Show All'}
                     </button>
                   </div>
                </div>
                
                <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:items-center relative z-10 mb-1.5">
                  {LEAGUE_TIERS.map((t, ti) => (
                    <div
                      key={t.name}
                      className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl shrink-0 ${ti === leagueTier ? 'bg-indigo-50 border border-indigo-100' : 'border border-transparent'}`}
                    >
                      <TierBadge tier={ti} size={22} />
                      <span className={`text-[7px] font-black uppercase tracking-widest ${ti === leagueTier ? 'text-indigo-600' : 'text-slate-400'}`}>{t.name}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-4 relative z-10">
                  7 din lagatar practice = promotion
                </p>

                <div className="space-y-2 relative z-10">
                   {leaderboard.length === 0 ? (
                      <p className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest animate-pulse">Synchronizing Rankings...</p>
                   ) : (
                      (showAllRankings ? leaderboard : leaderboard.slice(0, 5)).map((u, i) => {
                        const isSelf = !!u.uid && u.uid === user?.uid;
                        const rowTier = clampTier(isSelf ? leagueTier : (typeof (u as any).leagueTier === 'number' ? (u as any).leagueTier : 0));
                        const rowPoints = clampLeaguePoints(isSelf ? leaguePoints : (typeof (u as any).leaguePoints === 'number' ? (u as any).leaguePoints : 0));
                        return (
                        <motion.button
                          key={u.uid || `${u.name}-${i}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => { if (!isSelf && u.uid) openChatWith({ uid: u.uid, name: u.name || 'Explorer', photoURL: u.photoURL, xp: u.xp, level: u.level }); }}
                          disabled={isSelf || !u.uid}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${isSelf ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-white'} ${!isSelf && u.uid ? 'active:scale-[0.99]' : ''}`}
                        >
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 flex items-center justify-center">
                             {u.photoURL ? (
                               <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" />
                             ) : (
                               <User className="w-4 h-4 text-slate-300" />
                             )}
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="font-bold text-slate-900 text-sm truncate">
                               {u.name || "Explorer"}{isSelf && <span className="ml-1 text-[9px] font-black text-indigo-500 uppercase">You</span>}
                             </p>
                             <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                               <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>Level {u.level || 1}</span>
                               <span className="flex items-center gap-1 bg-white border border-slate-200 rounded-full pl-0.5 pr-1.5 py-0.5" title={`${LEAGUE_TIERS[rowTier].name} League · ${rowPoints}/${LEAGUE_DAYS_PER_TIER} days`}>
                                 <TierBadge tier={rowTier} size={14} />
                                 <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{LEAGUE_TIERS[rowTier].name}</span>
                                 <span className="text-[8px] font-bold text-slate-400">{rowPoints}/{LEAGUE_DAYS_PER_TIER}</span>
                               </span>
                             </div>
                          </div>
                          <div className="text-right shrink-0">
                             <p className="font-black text-amber-600 text-sm">{u.xp?.toLocaleString()}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total XP</p>
                          </div>
                          {!isSelf && u.uid && (
                            <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                          )}
                        </motion.button>
                        );
                      })
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

              </div>

              <div className="space-y-5 lg:col-start-2 lg:row-start-2">
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
                    {xpHistory.every(v => !v) ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                        <p className="text-xs font-bold text-slate-500">No activity yet this week</p>
                        <p className="text-[10px] font-medium text-slate-400">Finish a test to see your progress here</p>
                      </div>
                    ) : xpHistory.map((val, i) => {
                      const maxVal = Math.max(...xpHistory, 100);
                      const height = (val / maxVal) * 100;
                      const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                      const todayIndex = new Date().getDay();
                      const label = days[(todayIndex - 6 + i + 7) % 7];
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full bg-slate-100 border border-slate-200/70 rounded-lg relative overflow-hidden h-full">
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
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Daily Missions</h3>
                   <div className="space-y-2">
                      {missions.map(m => (
                        <div key={m.id} className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${m.completed ? 'bg-green-50/60 border-green-100' : 'bg-white border-slate-100'}`}>
                          <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${m.completed ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                            {m.id.startsWith('correct') ? <Search className="w-4 h-4" /> : m.id.startsWith('test') ? <GraduationCap className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-sm font-black text-slate-900">{m.title}</p>
                              <span className="text-[9px] font-black text-indigo-600">+{m.reward} XP</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10px] font-bold text-slate-500 truncate">{m.desc}</p>
                              <span className="text-[9px] font-black text-slate-400 whitespace-nowrap">{m.current}/{m.goal}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                              <div
                                className={`h-full transition-all duration-700 ${m.completed ? 'bg-green-500' : 'bg-indigo-600'}`}
                                style={{ width: `${Math.min(100, (m.current / m.goal) * 100)}%` }}
                              />
                            </div>
                          </div>
                          {m.completed && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                        </div>
                      ))}
                   </div>
                </div>

                {/* Achievement Badges Section */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Achievements</h3>
                   <div className="flex items-center justify-around gap-2">
                      {badges.map(b => (
                        <div key={b.id} className={`flex flex-col items-center gap-2 group ${b.earned ? 'opacity-100' : 'opacity-50'}`}>
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110 ${b.earned ? 'bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200' : 'bg-slate-50 border border-slate-200 grayscale'}`}>
                              {b.icon}
                           </div>
                           <span className="text-[8px] font-black text-slate-600 uppercase">{b.title.split(' ')[0]}</span>
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

              </div>

              {/* Settings Grid */}
              <div className="space-y-4 pb-4 lg:col-span-2">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                   <Settings className="w-3 h-3" /> Preferences
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    
                    {[
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
                    
                    <div className="pt-6 space-y-3 sm:col-span-2">
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
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-3xl mx-auto">
              {/* Header */}
              <div className="mb-5 flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-slate-900 leading-tight">Dictionary</h2>
                  <p className="text-gray-500 text-xs">Meanings, synonyms & antonyms.</p>
                </div>
              </div>

              {/* Learn Tools switch */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl mb-5 max-w-xs">
                <button
                  onClick={() => setActiveTab('dictionary')}
                  className="py-2 rounded-xl bg-white text-indigo-600 text-xs font-black shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" /> Words
                </button>
                <button
                  onClick={() => setActiveTab('grammar')}
                  className="py-2 rounded-xl text-slate-500 text-xs font-black hover:text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Languages className="w-3.5 h-3.5" /> Grammar
                </button>
              </div>
              <div className="flex gap-2 mb-6">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={dictQuery}
                    onChange={e => setDictQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') searchDictionary(); }}
                    placeholder="Search a word…"
                    className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none bg-white text-gray-800 shadow-sm text-sm"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                <button
                  onClick={() => searchDictionary()}
                  disabled={dictLoading || !dictQuery.trim()}
                  className="px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm shrink-0"
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
                <div className="mt-4 text-center py-6 px-4">
                  <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm">
                    <Search className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-1">Search any word!</h3>
                  <p className="text-slate-500 text-sm max-w-[260px] mx-auto font-medium mb-5 leading-relaxed">
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
                  <div className="p-4 sm:p-5 relative">
                    <div className="flex items-start justify-between gap-3 relative z-10">
                      <div className="min-w-0">
                        <h3 className="text-2xl font-black text-slate-900 capitalize tracking-tight mb-0.5 truncate">{dictResult.word}</h3>
                        {dictResult.phonetic && (
                          <p className="text-indigo-500 font-bold text-xs tracking-widest uppercase truncate">{dictResult.phonetic}</p>
                        )}
                      </div>
                      <button
                        onClick={() => playWord(dictResult.word)}
                        className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95 shadow-sm ${
                          isLexiSpeaking ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                        }`}
                        title="Play pronunciation"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3 flex gap-2 relative z-10">
                      <button
                        onClick={handleTranslateDict}
                        disabled={isTranslating}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          isTranslating ? 'bg-slate-100 text-slate-400' 
                          : hindiTranslation ? 'bg-amber-50 border border-amber-100 text-amber-700 hover:bg-amber-100' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                        }`}
                      >
                        {isTranslating ? (
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Languages className="w-3.5 h-3.5" />
                            {hindiTranslation ? 'Refresh Hindi' : 'Hindi Meaning'}
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
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>

                    {/* Translation Result */}
                    <AnimatePresence>
                      {hindiTranslation && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          className="mt-3 overflow-hidden"
                        >
                          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/50 p-3.5 rounded-xl">
                            <div className="flex items-center gap-1.5 mb-1.5 text-amber-700 font-black uppercase text-[9px] tracking-widest">
                              <CheckCircle className="w-3 h-3" /> Hindi Translation
                            </div>
                            <p className="font-sans text-sm text-slate-800 font-semibold leading-relaxed whitespace-pre-line">
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

            </div>
          </div>
        )}

        {activeTab === 'ai-coach' && (
          <div className="flex-1 min-h-0 max-w-3xl mx-auto w-full flex flex-col bg-slate-50">
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
            <div ref={aiChatScrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 scroll-smooth pb-4">
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
                    <div className={`relative max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed group ${msg.role === 'user'
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

            <div className="shrink-0 p-3 sm:p-4 bg-white border-t border-slate-200 z-10 pb-[calc(0.75rem+var(--safe-area-bottom))] lg:pb-4">
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">

            {/* Reminder Popover */}
            {reminderPopoverOpen && (
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-sm shadow-2xl relative z-[60] border border-orange-100 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in duration-300">
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
                {alert.type === 'success' && <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />}
                {alert.type === 'error' && <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />}
                {alert.type === 'info' && <Info className="w-12 h-12 text-indigo-500 mx-auto mb-4" />}
                <p className="text-gray-800 mb-6">{alertMessage}</p>
                <button
                  onClick={() => setAlert({ message: '', type: 'info' })}
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
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative z-[60] border border-rose-100 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in duration-300 text-center">
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

        {/* League Promotion / Demotion Celebration */}
        {leagueEvent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-sm text-center shadow-2xl border-4"
              style={{ borderColor: LEAGUE_TIERS[leagueEvent.tier].ring }}
            >
              <div
                className="mx-auto w-24 h-24 rounded-[1.75rem] flex items-center justify-center mb-4"
                style={{ background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.9), transparent 60%), ${LEAGUE_TIERS[leagueEvent.tier].glow}` }}
              >
                <TierBadge tier={leagueEvent.tier} size={72} />
              </div>
              <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${leagueEvent.type === 'promote' ? 'text-emerald-600' : 'text-rose-500'}`}>
                {leagueEvent.type === 'promote' ? 'League Promoted' : 'League Dropped'}
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{LEAGUE_TIERS[leagueEvent.tier].name} League</h3>
              <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed">
                {leagueEvent.type === 'promote'
                  ? '7 din lagatar practice complete! +200 XP bonus mil gaya.'
                  : '7 din se practice nahi hui, isliye ek league neeche aa gaye. Aaj se phir 7 din lagatar khelo aur wapas chadho.'}
              </p>
              <button
                onClick={() => { setLeagueEvent(null); setAlert({ message: '', type: 'info' }); }}
                className="mt-6 w-full py-3.5 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest active:scale-95 transition-all hover:bg-indigo-600"
              >
                {leagueEvent.type === 'promote' ? 'Claim Reward' : 'Samajh Gaya'}
              </button>
            </motion.div>
          </div>
        )}

        {/* Speech Settings Modal */}
        {speechSettingsOpen && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-indigo-100 max-h-[90dvh] flex flex-col">
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

              <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto min-h-0">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Personality</label>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-md uppercase">High Quality</span>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => playWord("Hello, I am Lexi. Your high quality system voice is ready.")}
                      className="w-full p-4 rounded-2xl border-2 border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100 transition-all text-left relative group flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-600 text-white">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-indigo-900 uppercase tracking-tight truncate">
                          System Voice (Auto)
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                          High Quality Natural Voice
                        </p>
                      </div>
                      
                      <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    </button>
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

        {/* Inbox (World Rankings chat threads) */}
        <AnimatePresence>
          {inboxOpen && (
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className="fixed inset-0 z-[95] bg-slate-50 flex flex-col sm:bg-slate-900/60 sm:backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
            >
              <div className="flex flex-col flex-1 min-h-0 w-full bg-slate-50 sm:flex-none sm:h-[85vh] sm:max-w-2xl sm:rounded-3xl sm:overflow-hidden sm:shadow-2xl">
              <div className="bg-white border-b border-slate-200 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setInboxOpen(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <p className="text-base font-black text-slate-900">Messages</p>
                  <p className="text-[10px] font-bold text-slate-500">Chat with learners from World Rankings</p>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                {inboxChats.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-black text-slate-900">Abhi koi chat nahi hai</p>
                    <p className="text-xs font-medium text-slate-500">
                      Profile → World Rankings me kisi learner pe tap karke baat shuru karein.
                    </p>
                  </div>
                ) : (
                  inboxChats.map(chat => {
                    const otherUid = (chat.participants || []).find((p: string) => p !== user?.uid);
                    if (!otherUid) return null;
                    const info = chat.participantsInfo?.[otherUid] || {};
                    const isUnread = chat.lastSenderId !== user?.uid && (chat.lastMessageAt || 0) > (chat.readAt?.[user?.uid] || 0);
                    return (
                      <button
                        key={chat.id}
                        onClick={() => openChatWith({ uid: otherUid, name: info.name || 'Explorer', photoURL: info.photoURL, level: info.level, xp: info.xp })}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                          isUnread ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                          {info.photoURL ? (
                            <img src={info.photoURL} alt={info.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-black text-slate-900 truncate">{info.name || 'Explorer'}</p>
                            <span className="text-[9px] font-bold text-slate-400 shrink-0">
                              {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className={`text-[11px] truncate ${isUnread ? 'font-bold text-slate-700' : 'font-medium text-slate-500'}`}>
                            {chat.lastSenderId === user?.uid ? 'You: ' : ''}{chat.lastMessage || 'Say hi 👋'}
                          </p>
                        </div>
                        {isUnread && <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1-to-1 chat */}
        <AnimatePresence>
          {chatTarget && (
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className="fixed inset-0 z-[96] bg-slate-50 flex flex-col sm:bg-slate-900/60 sm:backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
            >
              <div className="flex flex-col flex-1 min-h-0 w-full bg-slate-50 sm:flex-none sm:h-[85vh] sm:max-w-2xl sm:rounded-3xl sm:overflow-hidden sm:shadow-2xl">
              <div className="bg-white border-b border-slate-200 px-3 pt-[calc(env(safe-area-inset-top,0px)+0.6rem)] pb-2.5 flex items-center gap-3 shrink-0">
                <button
                  onClick={closeChat}
                  className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                  {chatTarget.photoURL ? (
                    <img src={chatTarget.photoURL} alt={chatTarget.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{chatTarget.name}</p>
                  <p className="text-[10px] font-bold text-slate-500">
                    Level {chatTarget.level || 1}{chatTarget.xp ? ` · ${chatTarget.xp.toLocaleString()} XP` : ''}
                  </p>
                </div>
              </div>

              <div data-chat-scroll className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-8">
                    <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-indigo-500">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-black text-slate-900">Say hi to {chatTarget.name} 👋</p>
                    <p className="text-xs font-medium text-slate-500">Practice together — ek doosre ki English improve karo.</p>
                  </div>
                ) : (
                  chatMessages.map(msg => {
                    const mine = msg.senderId === user?.uid;
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl ${
                          mine ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white border border-slate-200 text-slate-900 rounded-bl-md'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                          <p className={`text-[9px] mt-1 ${mine ? 'text-white/60' : 'text-slate-400'}`}>
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              <div className="bg-white border-t border-slate-200 p-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] flex items-center gap-2 shrink-0">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                  maxLength={CHAT_MAX_LENGTH}
                  placeholder={`Message ${chatTarget.name}…`}
                  className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatSending}
                  className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center disabled:bg-slate-200 disabled:text-slate-400 active:scale-95 transition-all"
                >
                  {chatSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium (ad-free) paywall */}
        <AnimatePresence>
          {subscriptionModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!purchaseLoading) setSubscriptionModalOpen(false); }}
              className="fixed inset-0 z-[97] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center"
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-8 max-h-[92vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Star className="w-7 h-7 fill-white" />
                  </div>
                  <button
                    onClick={() => setSubscriptionModalOpen(false)}
                    disabled={!!purchaseLoading}
                    className="p-2 -m-2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-2xl font-black text-slate-900">LexiQuest Premium</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Ads hatao. Learning sabke liye free hai.</p>

                <div className="mt-4 space-y-2">
                  {[
                    'Zero ads — bilkul distraction free',
                    'Saare learning features free rehte hain',
                    'Daily 100 naye words + AI coach included'
                  ].map(line => (
                    <div key={line} className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-xs font-bold text-slate-700">{line}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => handleSubscribe('monthly')}
                    disabled={!!purchaseLoading}
                    className="w-full p-4 rounded-2xl border-2 border-slate-200 flex items-center justify-between hover:border-indigo-400 transition-all disabled:opacity-60"
                  >
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-900">Monthly</p>
                      <p className="text-[10px] font-bold text-slate-500">Cancel anytime</p>
                    </div>
                    <p className="text-sm font-black text-slate-900">
                      {purchaseLoading === 'monthly' ? '…' : (premiumPrices.monthly || '₹299/mo')}
                    </p>
                  </button>

                  <button
                    onClick={() => handleSubscribe('yearly')}
                    disabled={!!purchaseLoading}
                    className="w-full p-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50/60 flex items-center justify-between hover:bg-indigo-50 transition-all disabled:opacity-60 relative"
                  >
                    <span className="absolute -top-2.5 left-4 bg-amber-400 text-slate-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Best value · save 50%</span>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-900">Yearly</p>
                      <p className="text-[10px] font-bold text-slate-500">₹149/month billed annually</p>
                    </div>
                    <p className="text-sm font-black text-indigo-700">
                      {purchaseLoading === 'yearly' ? '…' : (premiumPrices.yearly || '₹1,788/yr')}
                    </p>
                  </button>
                </div>

                <button
                  onClick={handleRestore}
                  disabled={!!purchaseLoading}
                  className="w-full mt-4 py-3 text-xs font-black text-slate-500 uppercase tracking-widest disabled:opacity-60"
                >
                  {purchaseLoading === 'restore' ? 'Restoring…' : 'Restore purchases'}
                </button>

                <p className="text-[9px] text-center text-slate-400 font-medium mt-2 leading-relaxed">
                  Subscription Play Store se auto-renew hoti hai. Kabhi bhi Play Store → Subscriptions se cancel karein.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
        {/* Removed FAB here - moved to header */}

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
                className="w-full max-w-sm max-h-[88dvh] overflow-y-auto rounded-[2rem] sm:rounded-[2.5rem]"
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

                <div className="mb-4 flex items-center justify-center gap-1.5">
                  {dailyWords.map((_, i) => {
                    const status = i < dailyWordsLearned ? 'done' : i === currentDailyIndex ? 'current' : 'pending';
                    return (
                      <button key={i} onClick={() => setCurrentDailyIndex(i)} className="group relative p-1">
                        <div className={`w-2.5 h-2.5 rounded-full transition-all ${status === 'done' ? 'bg-emerald-500' : status === 'current' ? 'bg-indigo-600 scale-125' : 'bg-slate-300'}`} />
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentDailyIndex}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -60 && currentDailyIndex < dailyWords.length - 1) setCurrentDailyIndex(p => p + 1);
                      else if (info.offset.x > 60 && currentDailyIndex > 0) setCurrentDailyIndex(p => p - 1);
                    }}
                    initial={{ opacity: 0, scale: 0.95, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white border border-indigo-100 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-6 shadow-2xl flex flex-col overflow-hidden relative"
                  >
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center opacity-50 pointer-events-none">
                      <BookOpen className="w-16 h-16 text-indigo-100" />
                    </div>

                    <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-100 rounded-full z-10">
                      <Flame className="w-3 h-3 text-orange-500" />
                      <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">{streak} day streak</span>
                    </div>

                    <div className="mb-4 z-10">
                      <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Daily Word {currentDailyIndex + 1}</p>
                      <div className="flex items-center gap-3">
                        <h4 className="text-3xl font-black text-slate-900 capitalize tracking-tight">
                          {dailyWords[currentDailyIndex].word}
                        </h4>
                        <button
                          onClick={() => playWord(dailyWords[currentDailyIndex].word)}
                          className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                          aria-label="Speak"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed mt-1">
                        {dailyWords[currentDailyIndex].meaning}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-5 z-10">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Example
                      </p>
                      <p className="text-slate-700 font-medium italic text-sm">
                        "{dailyWords[currentDailyIndex].example}"
                      </p>
                    </div>

                    <div className="mt-auto space-y-3 z-10">
                      {dailyWordsLearned >= dailyWords.length && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-widest">Daily Challenge Complete!</span>
                        </motion.div>
                      )}

                      <button
                        onClick={() => {
                          if (dailyWordsLearned < dailyWords.length) {
                            const newLearned = dailyWordsLearned + 1;
                            setDailyWordsLearned(newLearned);
                            localStorage.setItem('dailyWordsLearned', newLearned.toString());
                            addXp(20);
                            if (newLearned === dailyWords.length) {
                              addXp(100);
                              setAlertMessage("🏆 Daily Challenge Complete! +100 XP Bonus!");
                            } else {
                              setTimeout(() => setCurrentDailyIndex(prev => Math.min(dailyWords.length - 1, prev + 1)), 250);
                            }
                          }
                        }}
                        disabled={dailyWordsLearned >= dailyWords.length || currentDailyIndex < dailyWordsLearned}
                        className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-300"
                      >
                        <CheckCircle className="w-5 h-5" /> {currentDailyIndex < dailyWordsLearned ? 'Already Mastered' : 'Master This Word'}
                      </button>

                      <div className="flex items-center justify-between px-2">
                        <button
                          onClick={() => setCurrentDailyIndex(prev => Math.max(0, prev - 1))}
                          disabled={currentDailyIndex === 0}
                          className="p-2 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{currentDailyIndex + 1} / {dailyWords.length}</span>
                        <button
                          onClick={() => setCurrentDailyIndex(prev => Math.min(dailyWords.length - 1, prev + 1))}
                          disabled={currentDailyIndex === dailyWords.length - 1}
                          className="p-2 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                        >
                          <ChevronLeft className="w-6 h-6 rotate-180" />
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
            <div className="bg-white rounded-[2rem] w-full max-w-md p-5 sm:p-8 max-h-[90dvh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-300">
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
