# The pipeline worker and the Drive poll.
#
# CORRECTED against the actual ChalybClip application (picassoglitch/nexoclip)
# after reading it. The first draft of this file had both halves inverted:
#
#   * The render worker is NOT a batch job. `nexoclip worker` serves the
#     kickoff/poll HTTP contract that ModalJobDispatcher already speaks —
#     POST / returns a job id, the work runs in an asyncio task, the caller
#     polls GET /jobs/{id}. That is a SERVICE.
#
#   * The Drive poll is NOT an HTTP endpoint. `nexoclip drive poll` is a Typer
#     CLI command with no route in front of it. That is a JOB.
#
# Both run the same image as the API, selected by NEXOCLIP_ROLE / the command.

# ---------------------------------------------------------------------------
# Pipeline worker — Cloud Run service.
# ---------------------------------------------------------------------------

resource "google_service_account" "worker" {
  account_id   = "chalybclip-worker"
  display_name = "ChalybClip pipeline worker"
}

resource "google_storage_bucket_iam_member" "worker_media" {
  bucket = google_storage_bucket.media.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_secret_manager_secret_iam_member" "worker" {
  for_each = toset([
    google_secret_manager_secret.engine["chalybclip-database-url"].secret_id,
    google_secret_manager_secret.shared["zernio-api-key"].secret_id,
  ])

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_cloud_run_v2_service" "worker" {
  name     = "chalybclip-worker"
  location = var.region

  # Not public. Only the API service dispatches to it.
  ingress             = "INGRESS_TRAFFIC_INTERNAL_ONLY"
  deletion_protection = false

  template {
    service_account = google_service_account.worker.email

    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }

    # A render is minutes. This bounds the kickoff request, not the asyncio
    # task, but a generous ceiling keeps long polls from being cut off.
    timeout = "3600s"

    containers {
      image = var.engines["chalybclip"].image

      resources {
        limits = {
          # ffmpeg is CPU-bound and OpenCV plus Playwright's Chromium are
          # memory-hungry. Undersizing this shows up as OOM kills mid-render.
          cpu    = "2"
          memory = "4Gi"
        }

        # LOAD-BEARING, not tuning. The worker answers the kickoff POST
        # immediately and does the real work in an asyncio task. With CPU
        # throttling on (cpu_idle = true), CPU is withdrawn the moment that
        # response is sent and the pipeline freezes mid-job with no error and
        # no traceback — it simply never progresses.
        #
        # Even so, an instance with no in-flight requests can be reclaimed.
        # The API's polling of /jobs/{id} is what keeps it alive. If jobs are
        # observed dying when a poller stops, raise min_instance_count to 1
        # and accept the cost of an always-on instance.
        cpu_idle = false
      }

      env {
        name  = "NEXOCLIP_ROLE"
        value = "worker"
      }

      env {
        name  = "NEXOCLIP_OBJECT_STORAGE_BUCKET"
        value = google_storage_bucket.media.name
      }

      # Cloud Run's filesystem is tmpfs and counts against memory. Scratch
      # only — durable artifacts go to the bucket above.
      env {
        name  = "NEXOCLIP_DEFAULT_OUTPUT_DIR"
        value = "/tmp/out"
      }

      # Read WITHOUT the NEXOCLIP_ prefix: settings.py sets an explicit
      # validation_alias="DATABASE_URL". Unset means a SQLite file on tmpfs
      # that silently resets on every cold start.
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
        name = "NEXOCLIP_ZERNIO_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.shared["zernio-api-key"].secret_id
            version = "latest"
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [google_secret_manager_secret_iam_member.worker]
}

# The API dispatches to the worker; nobody else may.
resource "google_cloud_run_v2_service_iam_member" "worker_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.worker.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${module.engine["chalybclip"].service_account_email}"
}

# ---------------------------------------------------------------------------
# Drive poll — Cloud Run Job, on a schedule.
# ---------------------------------------------------------------------------

resource "google_cloud_run_v2_job" "drive_poll" {
  name     = "drive-poll"
  location = var.region

  deletion_protection = false

  template {
    template {
      service_account = google_service_account.worker.email
      timeout         = "600s"
      max_retries     = 1

      containers {
        image   = var.engines["chalybclip"].image
        command = ["nexoclip"]
        args    = ["drive", "poll"]

        resources {
          limits = {
            cpu    = "1"
            memory = "2Gi"
          }
        }

        env {
          name  = "NEXOCLIP_DEFAULT_OUTPUT_DIR"
          value = "/tmp/out"
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

  depends_on = [google_secret_manager_secret_iam_member.worker]
}

resource "google_service_account" "scheduler" {
  account_id   = "drive-poll-scheduler"
  display_name = "Cloud Scheduler → drive-poll job"
}

# Executing a Cloud Run Job is run.jobs.run, which roles/run.invoker carries.
resource "google_cloud_run_v2_job_iam_member" "scheduler" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_job.drive_poll.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

resource "google_cloud_scheduler_job" "drive_poll" {
  name        = "drive-poll"
  region      = var.region
  description = "Runs `nexoclip drive poll` — one minute is the SLA in the ingest spec."
  schedule    = "* * * * *"
  time_zone   = "Etc/UTC"

  # PAUSED BY DEFAULT, deliberately.
  #
  # `nexoclip drive poll` without --source-dir constructs the real
  # GoogleDriveClient, which is not implemented yet — the command exits 1 with
  # a clear error (see the --source-dir help text in nexoclip/cli.py). Running
  # this on a one-minute schedule today would just fail 1,440 times a day and
  # bury real alerts. Flip enable_drive_poll to true once the client lands.
  paused = !var.enable_drive_poll

  attempt_deadline = "320s"

  retry_config {
    retry_count = 1
  }

  # Triggering a job is a call to the Cloud Run Admin API, so this is an OAuth
  # token against googleapis.com — not the OIDC token used for calling a
  # service directly.
  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.drive_poll.name}:run"

    oauth_token {
      service_account_email = google_service_account.scheduler.email
      scope                 = "https://www.googleapis.com/auth/cloud-platform"
    }
  }

  depends_on = [google_project_service.enabled]
}
