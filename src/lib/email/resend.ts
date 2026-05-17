// Resend transactional email wrapper.
//
// CONFIGURATION:
//   RESEND_API_KEY      — your Resend API key (re_...).
//                         Get from https://resend.com/api-keys
//   RESEND_FROM_EMAIL   — verified sender, e.g. "Nexo AI <hola@nexo.ai>".
//                         Until you verify a domain, use "onboarding@resend.dev"
//                         (Resend's sandbox sender, limited to your own email).
//   RESEND_CONTACT_TO   — where the public /contacto form lands.
//                         Defaults to RESEND_FROM_EMAIL if unset.
//
// DEMO-MODE FALLBACK: if RESEND_API_KEY is missing, sendEmail() returns
// { ok: false, reason: 'not_configured' } instead of throwing. The contact
// form treats this as a "logged but not delivered" state so dev work isn't
// blocked on having credentials.

import 'server-only';
import { Resend } from 'resend';

let cached: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY missing');
  cached = new Resend(key);
  return cached;
}

export function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
}

export function getContactInbox(): string {
  return process.env.RESEND_CONTACT_TO ?? getFromAddress();
}

interface SendParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  reason?: 'not_configured' | 'send_failed';
  error?: string;
}

export async function sendEmail(params: SendParams): Promise<SendResult> {
  if (!isResendConfigured()) {
    // Surface in dev so it's obvious why nothing arrived. Don't throw —
    // forms should still appear to succeed in dev when MP/Resend aren't set.
    console.warn('[resend] RESEND_API_KEY not set — email skipped:', params.subject);
    return { ok: false, reason: 'not_configured' };
  }
  try {
    const { data, error } = await getResend().emails.send({
      from: getFromAddress(),
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    });
    if (error) {
      console.error('[resend] send failed', error);
      return { ok: false, reason: 'send_failed', error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[resend] threw', err);
    return { ok: false, reason: 'send_failed', error: message };
  }
}
