import { Resend } from 'resend';
import { CODE_TTL_MS } from './emailVerification.js';

// --- Resend email sender (CLOUD ONLY) ----------------------------------------
// The Resend client is constructed lazily on first send, so a self-hosted
// deployment (which never calls these functions) needs no RESEND_API_KEY and
// never touches the SDK. The key is read from the environment — never hardcoded.

let client: Resend | null = null;

function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set; verification emails cannot be sent.');
  }
  if (!client) client = new Resend(apiKey);
  return client;
}

const TTL_MINUTES = Math.round(CODE_TTL_MS / 60_000);

/**
 * Send a verification code to `to`. Throws if Resend is unconfigured or the
 * send fails. Never logs the raw code.
 */
export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  // Default to Resend's shared onboarding sender so a fresh cloud setup works
  // before a custom domain is verified; override with EMAIL_FROM in production.
  const from = process.env.EMAIL_FROM || 'canihavesex.today <onboarding@resend.dev>';

  const { error } = await getClient().emails.send({
    from,
    to,
    subject: `Your verification code: ${code}`,
    text:
      `Your verification code is ${code}.\n\n` +
      `It expires in ${TTL_MINUTES} minutes. If you didn't create an account, ignore this email.`,
    html:
      `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:420px;margin:0 auto">` +
      `<p style="font-size:16px;color:#111">Use this code to verify your email:</p>` +
      `<p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#0a84ff;margin:16px 0">${code}</p>` +
      `<p style="font-size:14px;color:#666">It expires in ${TTL_MINUTES} minutes. ` +
      `If you didn't create an account, you can ignore this email.</p>` +
      `</div>`,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? 'unknown error'}`);
  }
}

/**
 * Send a purchase/renewal confirmation. CLOUD ONLY — the billing webhook is the
 * sole caller and never fires on self-host (billing is hard-disabled there).
 * Throws if Resend is unconfigured or the send fails.
 */
export async function sendPurchaseConfirmationEmail(
  to: string,
  plan: 'yearly' | 'lifetime',
): Promise<void> {
  const from = process.env.EMAIL_FROM || 'canihavesex.today <onboarding@resend.dev>';
  const planLabel = plan === 'lifetime' ? 'Lifetime' : 'Yearly';
  const blurb =
    plan === 'lifetime'
      ? 'You have lifetime access — no renewals, ever.'
      : 'Your yearly access is active and will renew automatically.';

  const { error } = await getClient().emails.send({
    from,
    to,
    subject: `You're all set — ${planLabel} access is active`,
    text:
      `Thanks for subscribing to canihavesex.today.\n\n` +
      `Your ${planLabel} plan is now active. ${blurb}\n\n` +
      `Manage your subscription anytime from Settings.`,
    html:
      `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:420px;margin:0 auto">` +
      `<p style="font-size:16px;color:#111">Thanks for subscribing to canihavesex.today.</p>` +
      `<p style="font-size:16px;color:#111">Your <strong>${planLabel}</strong> plan is now active. ${blurb}</p>` +
      `<p style="font-size:14px;color:#666">You can manage your subscription anytime from Settings.</p>` +
      `</div>`,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? 'unknown error'}`);
  }
}
