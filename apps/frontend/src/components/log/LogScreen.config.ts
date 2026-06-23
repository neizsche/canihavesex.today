export const LOG_SCREEN_LABELS = {
  sections: {
    signals: "Today's Signals",
    signalsIntro:
      'Logging your period is enough for a daily answer. Add fluid, temperature, or an LH test anytime to sharpen it.',
    showMore: 'More to track',
    showMoreHint: 'Mood, symptoms, sleep & more',
    showMoreFields: [
      { key: 'mood', label: 'Mood' },
      { key: 'symptoms', label: 'Symptoms' },
      { key: 'energy', label: 'Energy' },
      { key: 'sleep', label: 'Sleep' },
      { key: 'libido', label: 'Libido' },
      { key: 'sex', label: 'Sex' },
      { key: 'factors', label: 'Factors' },
      { key: 'notes', label: 'Notes' },
    ],
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
        { id: 'alcohol', label: 'Alcohol' },
        { id: 'semen_exposure', label: 'Semen Exposure' },
        { id: 'infection', label: 'Infection' },
      ],
    },
  },
  buttons: {
    save: 'Save Entry',
    saving: 'Saving...',
    add: 'Add',
  },
  // Point-of-need explainer for the most error-prone signal. The two look-alikes
  // (semen, arousal fluid) are the doc-flagged accuracy risk — a misread inflates
  // the fertile estimate. Copy mirrors HEALTH_SCIENCE.md §5 (mucus observation).
  mucusGuide: {
    cta: 'What do these mean?',
    intro:
      'Fluid shifts across your cycle from dry to slippery. The wetter and stretchier it gets, the more fertile you are.',
    scale: [
      { label: 'Dry', body: 'Nothing there, or a dry feeling. Low fertility.' },
      {
        label: 'Sticky',
        body: 'Pasty, crumbly, or tacky — breaks apart right away. Still low.',
      },
      {
        label: 'Creamy',
        body: 'Lotion-like, white or cream, smooth. Fertility rising.',
      },
      {
        label: 'Egg-white',
        body: 'Clear and glossy like raw egg white. It stretches several centimetres between your fingers without breaking, and feels slippery or lubricative at the opening. The slippery feeling alone counts as fertile — even when you can barely see any. This is your peak fertile sign, and it marks your most fertile days.',
      },
    ],
    lookalikesIntro: 'Two look-alikes can fool the egg-white reading:',
    lookalikes: [
      {
        label: 'Semen',
        body: 'Looks similar but is whiter and frothier and breaks down within hours. Skip checking the morning after unprotected sex — residue distorts the reading.',
      },
      {
        label: 'Arousal fluid',
        body: 'Also clear and slippery, but watery and gone within an hour — not the lasting stretch of egg-white.',
      },
    ],
  },
  hints: {
    temperature:
      'Take right after waking — before getting up, talking, or drinking. Same time daily.',
    cervicalMucus: 'Check before the toilet. Egg white (clear, stretchy) = most fertile.',
    cervicalMucusDisabled: 'Not tracked during your period — bleeding masks it.',
    lhTest:
      'Test early afternoon, not first-morning urine. A positive means ovulation is likely in the next day or two.',
    factors:
      'These can distort today’s temperature or mucus — flag them so a reading isn’t misread.',
  },
  coach: {
    cta: 'How to log',
    title: 'How to log correctly',
    intro: 'A few habits keep your readings accurate.',
    steps: [
      {
        title: 'Three signs, every day',
        body: 'Cervical fluid predicts ovulation; temperature confirms it. Logging both gives the clearest picture of your cycle.',
      },
      {
        title: 'Temperature',
        body: 'Take it the moment you wake — before getting up, talking, or drinking. Same time each morning, after at least 3 hours of sleep, using a basal (0.01°) thermometer.',
      },
      {
        title: 'Cervical fluid',
        body: 'It shifts across your cycle: Dry → Sticky → Creamy → Egg white. Egg white (clear and stretchy) means you are most fertile.',
      },
      {
        title: 'LH test',
        body: 'Test in the early afternoon — not with first-morning urine — and ease off fluids beforehand. A positive surge means ovulation is likely within a day or two.',
      },
      {
        title: 'Flag disturbances',
        body: 'Alcohol, illness, fever, or poor sleep can throw off your temperature. Mark them under Factors so off days are not misread.',
      },
    ],
    dismiss: 'Got it',
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
