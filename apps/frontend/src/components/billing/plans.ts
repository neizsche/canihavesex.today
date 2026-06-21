export type PaidPlan = 'yearly' | 'lifetime';

/**
 * Display copy for the two paid plans. Prices are presentational only — the
 * source of truth is the Dodo hosted checkout, which is what actually charges
 * the customer. Keep these in sync with the landing site pricing.
 */
export const PLANS: Record<
  PaidPlan,
  { name: string; price: string; cadence: string; note: string }
> = {
  yearly: {
    name: 'Yearly',
    price: '$69',
    cadence: 'per year',
    note: 'Billed annually',
  },
  lifetime: {
    name: 'Lifetime',
    price: '$420',
    cadence: 'one time',
    note: 'Pay once, yours forever',
  },
};
