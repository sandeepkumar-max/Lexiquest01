import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lexiquest.app',
  appName: 'LexiQuest',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-3271133689051975~6391196608',
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
      serverClientId: '78991956591-f98ijc9qi1741bmlqnf7s6ti2q5p8eeb.apps.googleusercontent.com',
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '78991956591-f98ijc9qi1741bmlqnf7s6ti2q5p8eeb.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#020617",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  }
};

export default config;
