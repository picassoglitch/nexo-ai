# Secret CONTAINERS only — no values.
#
# Terraform never sees the secret material: putting it in a
# google_secret_manager_secret_version would write it to state in plaintext.
# Terraform creates the empty secret; a human adds the first version:
#
#   printf '%s' "$VALUE" | gcloud secrets versions add chalybclip-sso-secret \
#     --data-file=- --project=<project>
#
# Cloud Run resolves "latest" at instance start, so rotating a secret means
# adding a version and redeploying — no Terraform run needed.

locals {
  # Per-engine secrets. Both sides of the SSO contract with the hub:
  #   <slug>-admin-token → the hub's CHALYB<SLUG>_ADMIN_TOKEN, and the engine's
  #                        own CHALYB_ADMIN_TOKEN. They must be equal.
  #   <slug>-sso-secret  → the hub's CHALYB<SLUG>_SSO_SECRET, and the engine's
  #                        CHALYB_SSO_SECRET. Equal, or every launch 403s.
  engine_secrets = merge([
    for slug, _ in var.engines : {
      "${slug}-admin-token"  = slug
      "${slug}-sso-secret"   = slug
      "${slug}-database-url" = slug
    }
  ]...)

  # Shared across engines.
  shared_secrets = {
    "zernio-api-key"  = "Zernio publishing API key (ChalybClip)."
    "drive-token-key" = "Encryption key for Google Drive refresh tokens at rest."
  }
}

resource "google_secret_manager_secret" "engine" {
  for_each = local.engine_secrets

  secret_id = each.key

  labels = {
    engine = each.value
  }

  replication {
    auto {}
  }

  depends_on = [google_project_service.enabled]
}

resource "google_secret_manager_secret" "shared" {
  for_each = local.shared_secrets

  secret_id = each.key

  labels = {
    scope = "shared"
  }

  replication {
    auto {}
  }

  depends_on = [google_project_service.enabled]
}
