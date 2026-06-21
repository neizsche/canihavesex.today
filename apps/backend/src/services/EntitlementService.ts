import type { UserRepository } from '../repositories/UserRepository.js';
import type { SubscriptionRepository } from '../repositories/SubscriptionRepository.js';
import { DEMO_EMAIL } from '../demo.js';
import { evaluateEntitlement, trialMs, type Entitlement } from '../entitlement.js';

/**
 * Resolves a user's billing entitlement by reading their account + subscription
 * and feeding the pure `evaluateEntitlement` rules. Thin on purpose: the actual
 * trial/subscription logic (and its tests) live in entitlement.ts.
 */
export class EntitlementService {
  constructor(
    private readonly users: UserRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** Returns null if the user no longer exists. */
  async forUser(userId: string): Promise<Entitlement | null> {
    const user = await this.users.findById(userId);
    if (!user) return null;

    const sub = await this.subscriptions.findActiveByUser(userId);
    return evaluateEntitlement({
      userCreatedAt: new Date(user.created_at).getTime(),
      isDemo: user.email === DEMO_EMAIL,
      subscription: sub
        ? {
            plan: sub.plan,
            status: sub.status,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end).getTime()
              : null,
          }
        : null,
      now: this.now(),
      trialMs: trialMs(),
    });
  }
}
