export const LOG_SCREEN_LABELS = {
    sections: {
        cycleTracking: 'Cycle Details',
        notes: 'Daily Notes',
        symptoms: 'Body Signals',
    },
    fields: {
        period: 'Menstruation',
        basalTemp: 'Temperature',
        cervicalMucus: 'Cervical Fluid',
        lhTest: 'LH Test (Ovulation)',
        trackSymptoms: 'Log Body Signals',
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
    symptoms: {
        physical: {
            title: 'Physical',
            options: ['Cramps', 'Headache', 'Bloating', 'Acne'],
        },
        mood: {
            title: 'Mood',
            options: ['Happy', 'Anxious', 'Stressed', 'Weepy'],
        },
        sexualActivity: {
            title: 'Intimacy',
            options: ['Protected', 'Unprotected', 'Pill Taken'],
        },
        disturbances: {
            title: 'Safety Factors',
            options: [
                { id: 'sick', label: 'Sick (Fever)' },
                { id: 'bad_sleep', label: 'Bad Sleep' },
                { id: 'alcohol', label: 'Alcohol' },
                { id: 'semen_exposure', label: 'Unprotected Sex / Semen' },
                { id: 'infection', label: 'Infection / Yeast' }
            ]
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
        title: 'Unlock Body Signals',
        description: 'Log physical symptoms, moods, and intimacy to gain deeper insights.',
    },
    units: {
        temperature: '°C',
    },
} as const;
