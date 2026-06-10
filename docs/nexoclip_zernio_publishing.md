# NexoClip — Publishing via Zernio (replaces upload-post)

Build spec for swapping the clip-publishing backend from **upload-post** to
**Zernio** (`https://zernio.com/api/v1`). Publishing lives in **NexoClip's** repo
(it renders + posts clips); `nexo-ai` stays vendor-agnostic. This doc is the
contract + reference implementation.

`nexo-ai`'s only involvement (both already in place in `src/lib/billing/tiers.ts`):

- **`clipConnectSocials`** — FREE `false`, PRO / PARTNER / VIP `true`. Connecting
  a social account is the COGS-bearing action (Zernio bills per connected
  account), so it's gated here and read off the SSO `tier` claim.
- **`clipAutoPublish`** — VIP `true` only. The stronger perk: hands-off
  auto-publish + scheduling on top of connect.

Why Zernio over upload-post: native **multi-tenant profiles** + a **white-label
connect URL** per end-user, **scheduling/queue**, signed **webhooks** (incl.
account-revocation), 14+ platforms, and you inherit Zernio's approved
TikTok/IG apps (likely avoids running your own TikTok Content-Posting audit).

---

## 0. Auth & config

- Base URL `https://zernio.com/api/v1`; header `Authorization: Bearer sk_…`.
- Store `ZERNIO_API_KEY` server-side only (never client). One key per
  environment; scope every call by `profileId`. Rotate on leak.
- SDKs (Node/Python), CLI, and an MCP server exist — use the SDK in NexoClip's
  backend rather than hand-rolling HTTP.

---

## 1. Map a NexoClip tenant → a Zernio profile

A Zernio **profile** = a container of social accounts = **one NexoClip user**.

- On first publish-setup for a tenant: `POST /profiles { name, description }` →
  store `profile._id` on the tenant (`tenants.zernio_profile_id`). Idempotent:
  reuse if already set.
- Lifecycle: `GET/PATCH/DELETE /profiles/{id}` as the tenant renames/churns.
  On hard delete / downgrade past `clipConnectSocials`, delete the profile so
  Zernio stops billing for its accounts.

---

## 2. Connect social accounts (white-label, from inside NexoClip)

Gate on `clipConnectSocials` (read from the SSO tier). FREE users never see the
connect button.

1. `GET /connect/{platform}?profileId=<id>` → `{ authUrl }`.
2. Open `authUrl` for the user (popup/redirect). Zernio runs the platform OAuth.
3. On return, the account is attached to that profile. Confirm via the
   `account.connected` webhook (or `GET /accounts?profileId=<id>`).

Notes:
- Platforms: Instagram, TikTok, YouTube, X, Facebook, LinkedIn, Threads,
  Pinterest, Reddit, Snapchat, Telegram, Google Business. **Bluesky** uses an
  app password (collect handle + app password, not OAuth).
- The platform consent screen shows **Zernio's** app — unavoidable with any
  aggregator; the upside is inherited app approval.
- Persist a local mirror of connected accounts per tenant
  (`{ account_id, platform, username, status }`) so the UI doesn't round-trip.

---

## 3. Publish a clip (video)

Three steps (NexoClip already has the rendered clip on disk/CDN):

1. `POST /v1/media/presign` → `{ uploadUrl, publicUrl }`.
2. `PUT` the rendered clip bytes to `uploadUrl`.
3. `POST /posts`:
   ```jsonc
   {
     "content": "caption + #hashtags",
     "platforms": [{ "platform": "tiktok", "accountId": "acc_…" },
                   { "platform": "instagram", "accountId": "acc_…" }],
     "mediaItems": [{ "type": "video", "url": "<publicUrl>" }],
     "publishNow": true                 // OR "scheduledFor" + "timezone"
   }
   ```
   Response: `post._id`, `post.status`, and `post.results[]` with
   `{ platform, status, platformPostId, postUrl, error }` — store the `postUrl`s.

**Media constraints — VERIFY before launch:** the media guide states MP4/MOV/
AVI/WebM up to **5 GB** (no explicit duration cap), but another docs page lists
MP4 ≤50 MB / ≤60 s. Clip output is short-form vertical, so either is workable,
but confirm the real per-platform limits (TikTok/IG Reels/Shorts) against
NexoClip's render presets and transcode to fit if needed. One video per post per
platform (no photo+video mixing on TikTok).

---

## 4. Scheduling (VIP / `clipAutoPublish`)

- One-off: `scheduledFor` (ISO) + `timezone` on `POST /posts` → `status:scheduled`.
- Recurring slots: `POST /queue { profileId, accountIds, time, timezone,
  daysOfWeek[] }`; assign posts to fill the next open slot. Good for "auto-post
  every weekday 9am".
- Gate scheduling/auto-publish behind `clipAutoPublish` (VIP). PRO = connect +
  manual one-click publish; VIP = + hands-off scheduling.

---

## 5. Webhooks

Register `POST /webhooks/settings { url, events[] }`. Verify every delivery:
`X-Zernio-Signature` = HMAC-SHA256(rawBody, secret); dedup on `payload.id`;
respond 2xx within 5s (retries w/ backoff, 7 attempts).

Subscribe to:
- `post.published` / `post.failed` / `post.partial` → update clip status + store
  `postUrl`s; surface failures to the user.
- `account.disconnected` → mark the local account revoked, prompt reconnect,
  pause any scheduled posts that depend on it.
- (Optional) inbox events (`message.received`, …) if you later add engagement.

---

## 6. Token / balance + COGS guardrails

- Publishing itself isn't token-metered the way rendering is, but tie the
  connect/publish UI to tier (`clipConnectSocials`) so Free can't incur Zernio
  cost.
- **Zernio billing is per connected account/month** (first 2 free *org-wide*;
  then $6 → $3 → $1 graduated). Each user connecting TikTok+IG+YT = 3 billable
  accounts. Track connected-account count as a COGS line; consider a per-tenant
  cap (e.g. PRO ≤ N accounts) and reclaim accounts when a tenant downgrades or
  goes inactive (delete the profile → Zernio prorates down daily).

---

## 7. Migration from upload-post

1. Stand up the Zernio profile + connect flow behind a feature flag.
2. Ask existing users to **reconnect** their socials via the new Zernio connect
   URL (OAuth tokens are not portable between providers — a reconnect is
   required, not a migration).
3. Dual-run: keep upload-post for already-connected users until they reconnect,
   route new connects to Zernio.
4. Once reconnect rate is high enough, cut publish calls over to Zernio and
   decommission upload-post (remove its keys/secrets).
5. Map the field rename: upload-post "profiles/users" → Zernio "profiles";
   upload-post per-platform upload → Zernio presign + `POST /posts`.

---

## 8. Acceptance

- A PRO/VIP tenant connects TikTok/IG/YT from inside NexoClip without leaving the
  app; `account.connected` arrives; the account shows in their UI.
- Publishing a clip returns live `postUrl`s; `post.published` webhook fires.
- VIP can schedule a clip for a future time / recurring slot; PRO cannot.
- FREE tenant sees no connect button (gated on `clipConnectSocials`).
- Disconnecting on the platform → `account.disconnected` → reconnect CTA.
- Downgrade below `clipConnectSocials` → profile deleted, Zernio billing stops.
