# Rebuilding the engine backends on GCP

Every engine backend ran on one self-hosted machine. That machine died and its
disk is unrecoverable, so this is a **rebuild from empty**, not a data
migration. This doc is the target architecture, the rebuild order, and the
cost model.

## What survived vs. what's gone

| Survived (hosted, untouched) | Gone with the disk |
| --- | --- |
| `nexo-ai` on Vercel — site, dashboard, admin, `/api/engines/*` | NexoClip's Postgres: `tenants`, `drive_watches`, `drive_oauth_credentials`, `drive_ingested_files`, job history |
| Supabase — auth, `profiles`, `engines`, `engine_subscriptions`, payments, usage, audit | NexoOBS's DB + the RTMP relay config |
| Mercado Pago, Resend, Zernio (external SaaS) | NexoCrypto's DB |
| The engine source repos on GitHub (`NexoClip`, `NexoOBS`, `nexocrypto`) | Every rendered clip and cached VOD on local disk |

Two consequences worth being explicit about:

1. **Users must reconnect Google Drive and their social accounts.** OAuth
   refresh tokens were encrypted at rest on that disk. They are not
   recoverable, and they can't be re-minted without the user re-consenting.
   Plan a "reconnect your accounts" email for affected users at relaunch.
2. **Zernio profiles are orphaned, not lost.** `tenants.zernio_profile_id`
   lived on the dead disk, but the profiles still exist on Zernio's side and
   are still billing. `GET /profiles` to list them, then either re-map them to
   rebuilt tenants by name or delete the dead ones before relaunch.

## Interim state (shipped alongside this doc)

- `supabase/migrations/0028_engines_offline_pending_gcp.sql` flips `nexoclip`,
  `nexoobs` and `nexocrypto` to `coming_soon`. The whole UI already honours
  that state — "Próximamente" badge, launch button disabled.
- `src/app/auth/launch/[slug]/route.ts` now refuses to launch a non-`active`
  engine. That route is the landing funnel target
  (`/sign-in?next=/auth/launch/nexoclip`) and was the one path that bypassed
  the disabled buttons.

Nothing else in `nexo-ai` needs to change to survive the outage.

## Target architecture

Split by workload shape, because the pricing models differ enormously.

| Workload | GCP service | Notes |
| --- | --- | --- |
| NexoClip FastAPI, NexoOBS web, NexoCrypto | **Cloud Run**, `--min-instances=0` | Scales to zero; idle cost is $0. Concurrency 80 default is fine for these. |
| ffmpeg render worker | **Cloud Run Jobs**, triggered via Cloud Tasks or Pub/Sub | Per-second billing, no idle VM, and jobs can run far longer than a request. Do not run renders inside the API service. |
| Drive change poll (~60 s) | **Cloud Scheduler** → authenticated Cloud Run endpoint | 1-minute granularity is exactly the SLA in `docs/nexoclip_drive_ingest.md`. First 3 jobs/month are free. |
| VODs, rendered clips | **Cloud Storage** + lifecycle rule | Replaces local disk. Delete rendered clips after N days — they're re-derivable, and storage you never prune is the cost that creeps. |
| Secrets (`NEXOCLIP_ADMIN_TOKEN`, `*_SSO_SECRET`, Zernio key, Drive token encryption key) | **Secret Manager**, mounted into Cloud Run | Satisfies the encrypted-at-rest requirement for Drive refresh tokens. |
| Container images | **Artifact Registry** | First 0.5 GB free. Prune old images. |
| Engine databases | **Stay on Supabase** — a schema or project per engine | Deliberate: the smallest Cloud SQL instance is ~$10-25/mo _each_, and three of them would cost more than the rest of this architecture combined. Revisit only if an engine needs something Supabase can't do. |

### DNS

The hostnames don't change — `nexoclip.nexo-ai.world`, `nexoobs.nexo-ai.world`,
`nexocrypto.nexo-ai.world` stay exactly as seeded in migrations `0018`, `0019`
and `0022`. Only the target moves. Use Cloud Run domain mappings, or put
Cloudflare in front (also gets you caching and DDoS cover for free).

Because `external_url` and `admin_api_base` are unchanged, **no `engines` row
edits are needed at relaunch** beyond flipping `status` back to `active`.

### The RTMP problem — read before putting NexoOBS on GCP

Cloud Run speaks HTTP, gRPC and WebSocket only. It **cannot accept RTMP on
:1935**, so NexoOBS's ingest relay needs a real VM with a static IP — and that
is where GCP gets expensive:

> One 6 Mbps input fanned out to 4 platforms is ~24 Mbps outbound ≈ **11 GB per
> hour**. At GCP's internet egress rates (roughly $0.08–0.12/GB depending on
> destination and volume) that's **~$1.30 per streaming hour**. 100 hours/month
> is well north of $100 — more than everything else here combined.

Options, best first:

1. **Put the relay on a fixed-price host.** Hetzner CX22 (~€4/mo, 20 TB
   traffic) or similar. Bandwidth is the product; buy it from someone who
   sells it flat-rate. Keep the API and workers on GCP.
2. **Use a managed multistream service** and drop the self-hosted relay.
3. **Defer NexoOBS** until it has paying users. It's the most expensive engine
   to run and the least finished.

Do not run the relay on Cloud Run — it won't work — and don't put it on a GCE
VM without modelling your egress bill first.

### Transcription / GPU

If the clip pipeline used the dead machine's GPU for Whisper, don't rent a GPU
to replace it at this volume. A transcription API (Deepgram, Groq, OpenAI) is
dramatically cheaper until you're running many hours a day. Cloud Run does
support L4 GPUs with scale-to-zero if that changes.

## Rebuild order

1. **Project + guardrails.** One project (`nexo-prod`), billing account
   attached, **budget alert at $50/mo** on day one. This is the single most
   valuable ten minutes in the whole migration.
2. **Artifact Registry + Secret Manager.** Push images, load secrets. The SSO
   secrets must match what's set in Vercel — `NEXOCLIP_SSO_SECRET` here has to
   equal NexoClip's `NEXO_AI_SSO_SECRET`, or every SSO launch fails.
3. **Supabase schemas for the engines.** Re-run each engine's migrations
   against an empty database. Schemas are in the engine repos; the Drive
   tables are also reproduced in `docs/nexoclip_drive_ingest.md` §3.
4. **NexoClip API on Cloud Run.** Verify `POST /api/admin/tenants` and
   `GET /auth/sso` respond before touching anything else — those two endpoints
   are the entire contract with `nexo-ai`
   (`src/lib/engines/integrations/nexoclip.ts`).
5. **GCS bucket + render worker as a Cloud Run Job.** Then Cloud Scheduler for
   the Drive poll.
6. **Relaunch NexoClip:** flip `status` back to `active`, then run
   **`reconcileEngineLinks('nexoclip')`** from `/dashboard/team` — dry-run
   first. This force-reprovisions every user against the rebuilt engine and
   backfills `external_user_id`. It exists precisely for "the engine side lost
   its state" (see `src/lib/engines/reconcile-actions.ts`) so no new recovery
   tooling is needed.
7. **Email users to reconnect Drive and socials.**
8. **NexoCrypto**, same pattern.
9. **NexoOBS last**, after deciding where the relay lives.

Relaunch one engine at a time. Each flip to `active` is independently
reversible with a one-line update.

## Cost model

Steady-state, low volume, on top of the existing Vercel + Supabase bills:

| Item | Approx/month |
| --- | --- |
| Cloud Run — 3 services, scale-to-zero, low traffic | $0–10 |
| Cloud Run Jobs — render worker, per-second | $0–5 at low volume |
| Cloud Storage — ~100 GB with lifecycle pruning | ~$2–3 |
| Artifact Registry | ~$1 |
| Secret Manager + Scheduler + Tasks | ~$1 |
| Non-video egress | a few $ |
| **Total, no live streaming** | **~$10–25** |
| RTMP relay, if self-hosted off GCP | +~€4 flat |
| RTMP relay, if on GCE | +$15 VM +$3 IP + **egress, uncapped** |

Figures are ballpark — confirm against the GCP pricing calculator for your
region before committing. The shape of the bill matters more than the exact
numbers: everything above except egress and storage is effectively free at low
volume, so **the two things to watch are video egress and unpruned buckets.**
