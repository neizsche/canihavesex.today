// Pure decision logic for the Today drift re-anchor prompt, extracted so it can
// be unit-tested without a DB or HTTP layer (mirrors entitlement.ts). The route
// (calendar.ts) reads the stored state + active cycle and delegates the actual
// show/acked decision here.

export type ReanchorKind = 'late' | 'skipped';

export interface ReanchorFlagsInput {
  /** Engine drift flag: past predicted length with no corroborating signals. */
  lostTrack: boolean;
  /** Sticky break/pregnant flag. */
  paused: boolean;
  /** Stored acknowledgment kind, if any. */
  ackKind: ReanchorKind | null;
  /** Cycle start the acknowledgment was scoped to. */
  ackCycleStart: string | null;
  /** The current active cycle's start. */
  activeCycleStart: string | null;
}

export interface ReanchorFlags {
  paused: boolean;
  /** Offer the overdue prompt actions ("Still no period" / "Pause"). */
  show: boolean;
  /** Show the calm "still waiting" copy with no actions. */
  acked: boolean;
}

/**
 * An ack only counts while it matches the *current* active cycle's start. Once a
 * new period starts the active start moves, the stored ack no longer matches,
 * and the prompt returns — i.e. the ack auto-expires per cycle.
 */
export function computeReanchorFlags(input: ReanchorFlagsInput): ReanchorFlags {
  if (input.paused) {
    return { paused: true, show: false, acked: false };
  }

  const ackMatches =
    (input.ackKind === 'late' || input.ackKind === 'skipped') &&
    input.ackCycleStart != null &&
    input.activeCycleStart != null &&
    input.ackCycleStart === input.activeCycleStart;

  return {
    paused: false,
    show: input.lostTrack && !ackMatches,
    acked: input.lostTrack && ackMatches,
  };
}
