export type Risk = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export function riskBadgeVariant(risk: Risk): 'riskHigh' | 'riskMedium' | 'riskLow' | 'default' {
  if (risk === 'HIGH') return 'riskHigh';
  if (risk === 'MEDIUM') return 'riskMedium';
  if (risk === 'LOW') return 'riskLow';
  if (risk === 'INSUFFICIENT_DATA') return 'default';
  return 'default';
}

export function fertilityPct(fertilityIndex: number): number {
  const pct = Math.round(Math.min(100, Math.max(0, fertilityIndex * 12.5)));
  return pct;
}
