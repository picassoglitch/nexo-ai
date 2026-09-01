output "engine_urls" {
  description = "run.app URL per engine. Point DNS at these, or map the domain."
  value       = { for k, m in module.engine : k => m.url }
}

output "media_bucket" {
  value = google_storage_bucket.media.name
}

output "artifact_registry" {
  description = "Push images here as <this>/<slug>:<tag>."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.engines.repository_id}"
}

output "secrets_needing_values" {
  description = "Secrets Terraform created empty. Each needs a version before the engines start."
  value = sort(concat(
    [for s in google_secret_manager_secret.engine : s.secret_id],
    [for s in google_secret_manager_secret.shared : s.secret_id],
  ))
}
