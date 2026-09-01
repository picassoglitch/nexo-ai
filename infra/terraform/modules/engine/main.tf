# One engine: its own service account, its own Cloud Run service.
#
# Per-engine service accounts rather than one shared identity, so a compromised
# engine cannot read another's secrets. Each is granted accessor on only the
# secrets passed to it.

resource "google_service_account" "engine" {
  account_id   = var.slug
  display_name = "${var.slug} Cloud Run service"
}

# Read/write on the shared media bucket. Scoped to the bucket, not the project.
resource "google_storage_bucket_iam_member" "media" {
  bucket = var.media_bucket
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.engine.email}"
}

resource "google_secret_manager_secret_iam_member" "accessor" {
  for_each = var.secret_env

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.engine.email}"
}

resource "google_cloud_run_v2_service" "engine" {
  name     = var.slug
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  # These are rebuildable from the image in Artifact Registry and this config;
  # no state lives in Cloud Run. Deletion protection would only get in the way
  # of tearing an engine down.
  deletion_protection = false

  template {
    service_account = google_service_account.engine.email

    scaling {
      # The whole reason this is on Cloud Run: idle cost is zero.
      min_instance_count = 0
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        # CPU is only billed while a request is in flight.
        cpu_idle = true
      }

      dynamic "env" {
        for_each = var.env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    # Deploys push new images through CI or `gcloud run deploy`. Without this,
    # the next `terraform apply` would roll the service back to whatever image
    # is pinned in the config.
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [google_secret_manager_secret_iam_member.accessor]
}

# Public: users are redirected here from the hub's /auth/launch/<slug>.
# An org policy with domain-restricted sharing will reject allUsers — if apply
# fails here, that policy is why.
resource "google_cloud_run_v2_service_iam_member" "public" {
  count = var.public ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.engine.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
