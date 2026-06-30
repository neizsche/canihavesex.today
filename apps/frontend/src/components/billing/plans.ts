export type PaidPlan = 'yearly' | 'lifetime';

/**
 * Static configuration for paid billing plans. Prices defined here are for UI presentation only.
 * Dodo Payments hosted checkout serves as the source of truth for actual charges.
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
