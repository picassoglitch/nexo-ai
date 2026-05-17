'use server';

// Public contact form server action.
//
// Sends two emails per submission:
//   1. To the inbox (RESEND_CONTACT_TO) — the actual lead notification
//   2. To the sender — confirmation that we got it
//
// ANTI-SPAM:
//   - Honeypot field "company" — bots fill every input; humans never see this one.
//     If non-empty, we silently return ok=true (so the bot thinks it worked)
//     and never send anything.
//   - Soft rate limit: max 5 submissions per IP per 10 minutes, in-memory.
//     Reset on server restart — enough for v1 to deter casual abuse without
//     a Redis dependency.
//
// VALIDATION: simple string length checks. No external schema lib to keep the
// dependency surface tight. If a field is missing, return a field-specific
// error so the form can highlight it.

import { sendEmail, getContactInbox, isResendConfigured } from '@/lib/email/resend';
import { contactInboxTemplate, contactConfirmTemplate } from '@/lib/email/templates';
import { headers } from 'next/headers';

export interface ContactResult {
  ok: boolean;
  /** Field name that failed validation, if any. */
  fieldError?: 'name' | 'email' | 'subject' | 'message';
  /** General error for toast display. */
  error?: string;
}

// In-memory rate-limit bucket. Key = IP, value = array of timestamps within window.
const rateBucket = new Map<string, number[]>();
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 min
const RATE_MAX = 5;

function checkRate(ip: string): boolean {
  const now = Date.now();
  const hist = (rateBucket.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hist.length >= RATE_MAX) return false;
  hist.push(now);
  rateBucket.set(ip, hist);
  return true;
}

// Basic email shape check — not full RFC, but rejects obvious garbage.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContactForm(formData: FormData): Promise<ContactResult> {
  // Honeypot — silently swallow bot submissions.
  if (String(formData.get('company') ?? '').trim() !== '') {
    return { ok: true };
  }

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const subject = String(formData.get('subject') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();

  if (name.length < 2 || name.length > 120) {
    return { ok: false, fieldError: 'name', error: 'Nombre requerido (2–120 caracteres).' };
  }
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return { ok: false, fieldError: 'email', error: 'Correo inválido.' };
  }
  if (subject.length < 3 || subject.length > 200) {
    return { ok: false, fieldError: 'subject', error: 'Asunto requerido (3–200 caracteres).' };
  }
  if (message.length < 10 || message.length > 5000) {
    return { ok: false, fieldError: 'message', error: 'Mensaje requerido (10–5000 caracteres).' };
  }

  // Rate limit by best-guess IP. x-forwarded-for is what Vercel/most proxies set;
  // fall back to a literal so dev (no proxy) doesn't return undefined.
  const h = await headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'local';
  if (!checkRate(ip)) {
    return {
      ok: false,
      error: 'Demasiados mensajes desde tu IP. Espera unos minutos e intenta de nuevo.',
    };
  }

  // Templates live in src/lib/email/templates.ts — branded shell with dark
  // theme, Nexo wordmark, acid-green accents. HTML escaping is handled inside.
  const inbox = contactInboxTemplate({ name, email, subject, message, ip });
  const confirm = contactConfirmTemplate({ name, subject, message });

  const inboxResult = await sendEmail({
    to: getContactInbox(),
    subject: `[Contacto] ${subject}`,
    html: inbox.html,
    text: inbox.text,
    replyTo: email,
  });

  // The confirmation is best-effort — if it fails we still mark the form as
  // successful because the lead made it to the inbox (the important half).
  await sendEmail({
    to: email,
    subject: 'Recibimos tu mensaje · Nexo AI',
    html: confirm.html,
    text: confirm.text,
  });

  if (!inboxResult.ok && inboxResult.reason !== 'not_configured') {
    return { ok: false, error: 'No pudimos entregar tu mensaje. Intenta de nuevo en unos minutos.' };
  }

  // If Resend isn't configured (dev), still return ok — the warning in the
  // server log makes it visible. UX wise the user gets the success state.
  if (!isResendConfigured()) {
    console.warn('[contact] Resend not configured — form submission accepted but no email sent.');
  }

  return { ok: true };
}
