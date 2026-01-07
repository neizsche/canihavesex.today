export type MucusType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
export type Sensation = 'dry' | 'damp' | 'slippery';
export type Bleeding = 'none' | 'spotting' | 'light' | 'heavy';
export type LhTest = 'positive' | 'negative' | 'notTaken';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type CycleState =
  | 'INFERTILE_PRE'
  | 'FERTILE_OPEN'
  | 'PEAK_FERTILE'
  | 'FERTILE_CLOSING'
  | 'INFERTILE_POST';

export type DailyLog = {
  id: string;
  userId: string;
  cycleId: string;
  date: string;
  mucusType: MucusType;
  sensation: Sensation;
  bleeding: Bleeding;
  temperature: number | null;
  lhTest: LhTest;
  sick: boolean;
  badSleep: boolean;
  alcohol: boolean;
  createdAt: string;
};

export type Cycle = {
  id: string;
  userId: string;
  startDate: string;
  state: CycleState;
  peakDate: string | null;
  tempShiftConfirmedDate: string | null;
  createdAt: string;
};
