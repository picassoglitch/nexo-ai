variable "slug" {
  description = "Engine slug — must match engines.slug in Supabase (migration 0030)."
  type        = string
}

variable "project_id" { type = string }
variable "region" { type = string }

variable "image" { type = string }
variable "cpu" { type = string }
variable "memory" { type = string }
variable "max_instances" { type = number }
variable "public" { type = bool }

variable "media_bucket" {
  description = "Name of the shared media bucket; the engine SA gets object access."
  type        = string
}

variable "env" {
  description = "Plain (non-secret) environment variables."
  type        = map(string)
  default     = {}
}

variable "secret_env" {
  description = <<-EOT
    Environment variables sourced from Secret Manager, as VAR_NAME => secret_id.
    Values are never in Terraform state — only the reference is.
  EOT
  type        = map(string)
  default     = {}
}
