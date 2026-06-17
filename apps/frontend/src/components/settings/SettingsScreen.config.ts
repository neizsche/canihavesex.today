export const SETTINGS_SCREEN_LABELS = {
  header: 'Settings',
  appearance: {
    darkMode: 'Dark Mode',
    darkModeHint: 'Use a dark theme throughout the app',
  },
  install: {
    title: 'Install App',
    prompt: 'Add to your home screen',
    iosSteps: [
      'Tap the Share button in Safari.',
      'Choose “Add to Home Screen”.',
      'Tap “Add” to finish.',
    ],
  },
  account: {
    signedInAs: 'Signed in as',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    deleteAllData: 'Erase All Data',
    deleteAccount: 'Delete Account',
    discreetMode: 'Discreet Mode',
    discreetModeHint: 'Hides brand name from header',
  },
  support: {
    helpAndFeedback: 'Help & Feedback',
  },
  dialogs: {
    deleteAll: {
      title: 'ERASE ALL HEALTH DATA',
      description: 'Permanently remove all logs and history. This action cannot be undone.',
      action: 'Erase Data',
    },
    deleteAccount: {
      title: 'DELETE ACCOUNT',
      description: 'Permanently remove account and data. This action cannot be undone.',
      action: 'Delete Account',
    },
  },
} as const;
