output "url" {
  description = "The service's run.app URL."
  value       = google_cloud_run_v2_service.engine.uri
}

output "service_account_email" {
  value = google_service_account.engine.email
}

output "service_name" {
  value = google_cloud_run_v2_service.engine.name
}
