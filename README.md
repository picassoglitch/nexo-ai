# Nexo AI

A technology team and AI automation platform. HQ in Mexico City.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind v4
- Supabase (Auth + Postgres)
- Mercado Pago (payments)
- Resend (transactional email)
- next-intl (EN/ES)
- Vercel (hosting)

## Local dev

1. Copy `.env.local.example` to `.env.local` and fill values from your draft env.
2. `pnpm install`
3. `pnpm dev`
4. Visit `http://localhost:3000` (EN) and `http://localhost:3000/es` (ES).

## Build steps

Followed in order from `nexo-build-package/`:

- 00-PROVISION (done before any code)
- 01-SCAFFOLD ← you are here once this completes
- 02-AUTH
- 03-LANDING
- 04-DATABASE
- 05-PAYMENTS (Mercado Pago)
- 06-DASHBOARD
- 07-CONTACT
- 08-LAUNCH
