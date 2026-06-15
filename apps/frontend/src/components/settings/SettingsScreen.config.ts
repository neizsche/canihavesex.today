export const SETTINGS_SCREEN_LABELS = {
  header: 'Settings',
  sections: {
    appMode: 'Goal',
    profile: 'Cycle Profile',
    appearance: 'Display',
    account: 'Account',
    shortcuts: 'Shortcuts',
    support: 'Support',
  },
  fields: {
    lastPeriodStart: 'Last Period Start',
    cycleLengthRange: 'Cycle Length Range',
    periodLength: 'Period Length',
    cycleRegularity: 'Cycle Regularity',
    typicalDuration: 'Typical duration',
    minimum: 'Minimum',
    maximum: 'Maximum',
    switch: 'Switch',
  },
  days: 'days',
  options: {
    regularity: ['regular', 'irregular', 'unsure'],
  },
  appearance: {
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    darkModeHint: 'Use a dark theme throughout the app',
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
  footer: {
    madeWithCare: 'V2.0.0 • Designed with care',
  },
  dialogs: {
    reset: {
      title: 'RESET CURRENT CYCLE',
      description: 'Clear current cycle analysis. Logs safely remain.',
      action: 'Reset Cycle',
    },
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
