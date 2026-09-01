# Chalyb infrastructure

Terraform for the GCP side of the engine rebuild. The architecture and the
reasoning behind it are in [`../../docs/infra/gcp-migration.md`](../../docs/infra/gcp-migration.md);
this is the executable half.

**What this does not cover, deliberately:**

- **The hub** (`chalyb.com` itself) stays on Vercel, and Supabase stays as the
  database for both the hub and the engines. Three Cloud SQL instances would
  cost more than everything in this config combined.
- **The RTMP relay** for ChalybOBS. Cloud Run cannot accept RTMP on :1935, and
  GCP egress makes multistreaming from a GCE VM cost more than the rest of the
  stack — roughly $1.30 per streaming hour. It belongs on a flat-rate host. See
  the RTMP section of the migration doc.

## What it creates

|                              |                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Cloud Run service per engine | `chalybclip`, `chalybobs`, `chalybcrypto` — scale to zero, so idle cost is $0 |
| Cloud Run Job                | the ffmpeg render worker, 2 vCPU, 1 h timeout                                 |
| Cloud Scheduler              | the Drive change poll, every minute, OIDC-authenticated                       |
| Cloud Storage                | one media bucket, private, with lifecycle pruning                             |
| Artifact Registry            | one Docker repo with a cleanup policy                                         |
| Secret Manager               | empty secret containers — **values are never in Terraform**                   |
| Service accounts             | one per engine plus one each for the worker and scheduler                     |
| Budget alert                 | at 50 / 90 / 100% of the monthly budget                                       |

Each engine gets its own service account, granted accessor on only its own
secrets, so a compromise of one engine does not expose another's.

## Bootstrap

State must not live on a laptop — that is the failure mode that caused this
migration. Create the state bucket first, then uncomment the `backend "gcs"`
block in `versions.tf`:

```sh
gcloud storage buckets create gs://chalyb-tfstate \
  --project=chalyb-prod --location=us-central1 \
  --uniform-bucket-level-access
gcloud storage buckets update gs://chalyb-tfstate --versioning
```

Then:

```sh
cp terraform.tfvars.example terraform.tfvars   # fill it in
terraform init
terraform plan
terraform apply
```

The first apply enables the APIs and creates everything else in one pass.
Expect it to take several minutes — API enablement is the slow part.

## After the first apply

1. **Add the secret values.** Terraform creates the containers empty; the
   engines will not start without versions. `terraform output
secrets_needing_values` lists them.

   ```sh
   printf '%s' "$VALUE" | gcloud secrets versions add chalybclip-sso-secret \
     --data-file=- --project=chalyb-prod
   ```

   `chalybclip-sso-secret` must equal `CHALYBCLIP_SSO_SECRET` in Vercel — the
   two sides of the same HMAC. Same for the admin tokens. If they differ,
   every SSO launch fails signature verification.

2. **Push real images** to the Artifact Registry path in
   `terraform output artifact_registry`, then deploy. Terraform ignores changes
   to the image field afterwards, so ordinary deploys are not reverted by the
   next `apply`.

3. **Point DNS** at the URLs in `terraform output engine_urls`, or set
   `enable_domain_mappings = true` once the domain is verified.

4. **Only then** flip each engine to `active` in Supabase and run
   `reconcileEngineLinks(slug)` from `/dashboard/team`. The launch guard in
   `src/app/auth/launch/[slug]/route.ts` keeps users out until you do, so
   there is no rush — but an engine set live against a hostname that does not
   resolve puts users straight back into a dead host.

## Validation status

`terraform fmt` and the module tree resolve cleanly. `terraform init`,
`validate` and `plan` have **not** been run against this config, because
`registry.terraform.io` is blocked by the egress policy of the environment it
was written in — so the provider schemas could not be downloaded.

That means HCL syntax and module wiring are verified, but individual resource
attribute names have not been checked against the provider. Run `terraform
plan` before trusting it. Things most likely to need a nudge, all pinned to
`hashicorp/google ~> 6.0`:

- `cleanup_policies` on `google_artifact_registry_repository`
- `deletion_protection` on the Cloud Run v2 resources
- the `all_updates_rule` block on `google_billing_budget`

## Cost

Roughly **$10–25/month** at low volume: Cloud Run idles at zero, and storage,
registry, secrets and scheduler are all within or near their free tiers. The
two things that actually move the bill are **video egress** and **buckets that
are never pruned** — which is why `media_retention_days` and the budget alert
both exist.
