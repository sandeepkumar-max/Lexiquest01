import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// import { registerSW } from 'virtual:pwa-register';

import { Capacitor } from '@capacitor/core';
import { initializeApp, getApps } from 'firebase/app';

// Initialize Firebase for web (Required by Capacitor Firebase plugins on web)
if (Capacitor.getPlatform() === 'web' && getApps().length === 0) {
  initializeApp({
    apiKey: "AIzaSyCNxgJ8y3Vi3jh42eCiWnm4-4AyjjTDMhQ",
    authDomain: "gen-lang-client-0898565902.firebaseapp.com",
    projectId: "gen-lang-client-0898565902",
    storageBucket: "gen-lang-client-0898565902.firebasestorage.app",
    messagingSenderId: "78991956591",
    appId: "1:78991956591:web:placeholder", // Optional for most web Firebase auth/firestore if not using analytics
  });
}

// Register service worker for offline support (Disabled for Capacitor)
/*
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});
*/

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
