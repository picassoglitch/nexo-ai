# The ffmpeg render worker, and the Drive change poll.
#
# Renders run as a Cloud Run JOB, not inside the API service: per-second
# billing with no idle instance, and a job can run far longer than a request.
# ChalybClip's API triggers an execution through the Jobs API.

resource "google_service_account" "render_worker" {
  account_id   = "render-worker"
  display_name = "ChalybClip render worker (Cloud Run Job)"
}

resource "google_storage_bucket_iam_member" "render_worker_media" {
  bucket = google_storage_bucket.media.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.render_worker.email}"
}

resource "google_secret_manager_secret_iam_member" "render_worker" {
  for_each = toset([
    google_secret_manager_secret.engine["chalybclip-database-url"].secret_id,
    google_secret_manager_secret.shared["zernio-api-key"].secret_id,
  ])

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.render_worker.email}"
}

resource "google_cloud_run_v2_job" "render" {
  name     = "render-worker"
  location = var.region

  deletion_protection = false

  template {
    template {
      service_account = google_service_account.render_worker.email

      # Renders are minutes, not seconds. Well inside the job ceiling, and far
      # beyond what a request-based service should hold open.
      timeout = "3600s"

      # A failed render is retried twice, then left for inspection rather than
      # looping on a corrupt source file and burning CPU.
      max_retries = 2

      containers {
        image = var.engines["chalybclip"].image

        resources {
          limits = {
            # ffmpeg is CPU-bound; 2 vCPU is the cheapest point that still
            # renders a 90 s 1080x1920 clip in reasonable wall-clock time.
            cpu    = "2"
            memory = "2Gi"
          }
        }

        env {
          name  = "MEDIA_BUCKET"
          value = google_storage_bucket.media.name
        }

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.engine["chalybclip-database-url"].secret_id
              version = "latest"
            }
          }
        }

        env {
          name = "ZERNIO_API_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.shared["zernio-api-key"].secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [google_secret_manager_secret_iam_member.render_worker]
}

# ---------------------------------------------------------------------------
# Drive change poll — Cloud Scheduler hitting ChalybClip on a schedule.
#
# One minute is the finest granularity Cloud Scheduler offers, and it is
# exactly the "detected within ~60 seconds" SLA in
# docs/chalybclip_drive_ingest.md. The endpoint is NOT public: the scheduler
# authenticates with an OIDC token, and only this service account is granted
# invoker on that route.
# ---------------------------------------------------------------------------

resource "google_service_account" "scheduler" {
  account_id   = "drive-poll-scheduler"
  display_name = "Cloud Scheduler → ChalybClip Drive poll"
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker" {
  project  = var.project_id
  location = var.region
  name     = module.engine["chalybclip"].service_name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

resource "google_cloud_scheduler_job" "drive_poll" {
  name        = "drive-poll"
  region      = var.region
  description = "Polls the Google Drive Changes API for every active watch."
  schedule    = "* * * * *"
  time_zone   = "Etc/UTC"

  # Do not let a slow tick pile up on the next one.
  attempt_deadline = "60s"

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "${module.engine["chalybclip"].url}/internal/drive/poll"

    oidc_token {
      service_account_email = google_service_account.scheduler.email
      audience              = module.engine["chalybclip"].url
    }
  }

  depends_on = [google_project_service.enabled]
}
