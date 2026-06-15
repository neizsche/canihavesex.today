export const LOG_SCREEN_LABELS = {
  sections: {
    dailyObservations: 'Daily Observations',
    bodySignals: 'Body Signals',
    advanced: 'Advanced',
  },
  fields: {
    period: 'Menstruation',
    basalTemp: 'Temperature',
    cervicalMucus: 'Cervical Fluid',
    lhTest: 'LH Test',
    mood: 'Mood',
    energy: 'Energy',
    sleep: 'Sleep',
    libido: 'Libido',
    sexActivity: 'Sexual Activity',
    symptoms: 'Symptoms',
    factors: 'Factors',
    notes: 'Notes',
  },
  options: {
    no: 'No',
    yes: 'Yes',
    flow: {
      light: 'Light',
      medium: 'Medium',
      heavy: 'Heavy',
    },
    spottingOnly: 'Spotting only',
    mucus: ['Dry', 'Sticky', 'Creamy', 'Egg white'],
    lhTest: {
      negative: 'Negative',
      positive: 'Positive',
    },
  },
  bodySignals: {
    symptoms: [
      { id: 'breast_tenderness', label: 'Breast Tender' },
      { id: 'cramps', label: 'Cramps' },
      { id: 'bloating', label: 'Bloating' },
      { id: 'headache', label: 'Headache' },
    ],
    mood: [
      { id: 'calm', label: 'Calm' },
      { id: 'anxious', label: 'Anxious' },
      { id: 'irritable', label: 'Irritable' },
      { id: 'sad', label: 'Sad' },
    ],
    energy: [
      { id: 'low', label: 'Low' },
      { id: 'normal', label: 'Normal' },
      { id: 'high', label: 'High' },
    ],
    sleep: [
      { id: 'poor', label: 'Poor' },
      { id: 'fair', label: 'Fair' },
      { id: 'good', label: 'Good' },
    ],
    libido: [
      { id: 'low', label: 'Low' },
      { id: 'normal', label: 'Normal' },
      { id: 'high', label: 'High' },
    ],
    sexActivity: [
      { id: 'none', label: 'None' },
      { id: 'protected', label: 'Protected' },
      { id: 'unprotected', label: 'Unprotected' },
    ],
  },
  symptoms: {
    disturbances: {
      title: 'Factors',
      options: [
        { id: 'sick', label: 'Illness' },
        { id: 'bad_sleep', label: 'Poor Sleep' },
        { id: 'alcohol', label: 'Alcohol' },
        { id: 'semen_exposure', label: 'Semen Exposure' },
        { id: 'infection', label: 'Infection' },
      ],
    },
  },
  buttons: {
    save: 'Save Entry',
    saving: 'Saving...',
  },
  status: {
    logged: 'Logged',
    today: 'Today',
    editEntry: 'Edit',
  },
  premium: {
    title: 'Unlock History',
    description: 'Editing past logs is a premium feature.',
  },
  units: {
    temperature: '°C',
  },
} as const;
