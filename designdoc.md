{
  "date": "2026-01-29",
  "fertilityLevel": "high",
  "explanation": "Fertile cervical mucus detected.",
  
  "fertilityWindow": {
    "start": "2026-01-27",
    "end": "2026-02-01",
    "source": "detected",
    "confidence": 0.75
  },
  
  "cycleStats": {
    "currentPhase": "follicular",
    "cycleDay": 13,
    "ovulationConfirmed": false,
    "ovulationDate": null,
    "nextPeriodEstimate": "2026-02-11",
    "daysUntilNextPeriod": 13,
    "averageLength": 29,
    "averageOvulationDay": 15,
    "isRegular": true
  },
  
  "dataQuality": {
    "hasCriticalGaps": false,
    "lastLoggedDate": "2026-01-29"
  },
  
  "notifications": [
    {
      "type": "info",
      "priority": "low",
      "title": "High Fertility Detected",
      "message": "Your mucus indicates you are fertile today."
    }
  ]
}


Always Return a Response - Never return empty. Use null fields + helpful notifications.
Default to Safe - If uncertain, risk: "HIGH" or "MEDIUM".
Be Transparent - Use confidence, source, and dataQuality to show limitations.
Guide the User - Use notifications to teach them how to improve.