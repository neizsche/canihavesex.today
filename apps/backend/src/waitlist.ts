/**
 * Pure decision logic for a pre-launch waitlist submission, kept separate from
 * the Fastify route so it's unit-testable without an HTTP/DB harness. Email
 * *format* is validated at the route boundary (Zod); this layer handles the
 * honeypot, consent gate, and normalization.
 */

export type WaitlistSubmission = {
  email: string;
  consent: boolean;
  /** Hidden honeypot field — real users leave it empty. */
  website?: string;
};

export type WaitlistOutcome =
  | { action: 'drop' } // honeypot tripped: silently accept, store nothing
  | { action: 'reject'; error: 'consent_required' } // no opt-in
  | { action: 'store'; email: string }; // normalized, ready to persist

export function evaluateWaitlistSubmission(input: WaitlistSubmission): WaitlistOutcome {
  if (input.website && input.website.trim().length > 0) {
    return { action: 'drop' };
  }
  if (input.consent !== true) {
    return { action: 'reject', error: 'consent_required' };
  }
  return { action: 'store', email: input.email.trim().toLowerCase() };
}
