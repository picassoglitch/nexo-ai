variable "project_id" {
  description = "GCP project id, e.g. chalyb-prod."
  type        = string
}

variable "region" {
  description = <<-EOT
    Region for Cloud Run, the job and the media bucket. us-central1 is the
    default because it is among the cheapest and carries every service used
    here. If a Mexico region is available to the account it may be worth it
    for latency to the userbase — check service availability for Cloud Run,
    Cloud Run Jobs and Cloud Scheduler there before switching, as not every
    region carries all three.
  EOT
  type        = string
  default     = "us-central1"
}

variable "domain" {
  description = "Apex domain. Engines are served at <slug>.<domain>."
  type        = string
  default     = "chalyb.com"
}

variable "billing_account" {
  description = <<-EOT
    Billing account id for the budget alert. Leave empty to skip creating the
    budget — useful if the caller lacks billing permissions, which are separate
    from project permissions. Strongly recommended to set: an unnoticed egress
    bill is the main cost risk in this architecture.
  EOT
  type        = string
  default     = ""
}

variable "budget_amount_usd" {
  description = "Monthly budget in USD. Alerts fire at 50/90/100% of this."
  type        = number
  default     = 50
}

variable "budget_alert_emails" {
  description = <<-EOT
    Addresses that receive budget alerts, as monitoring notification channels.
    Empty means alerts go only to the billing account's default recipients
    (Billing Administrators and Billing Account Users).
  EOT
  type        = list(string)
  default     = []
}

variable "media_retention_days" {
  description = <<-EOT
    Days before rendered clips and cached VODs are deleted. They are
    re-derivable from the source, and storage that is never pruned is the cost
    that creeps. Raise deliberately.
  EOT
  type        = number
  default     = 30
}

variable "engines" {
  description = <<-EOT
    The engines to deploy, keyed by slug. The slug must match engines.slug in
    Supabase (see migration 0030) — it is the SSO wire value and the subdomain.

    image: leave at the placeholder until the real image is pushed to Artifact
    Registry. Terraform ignores changes to it afterwards so that deploys (via
    gcloud/CI) are not reverted by the next `terraform apply`.
  EOT
  type = map(object({
    image         = optional(string, "us-docker.pkg.dev/cloudrun/container/hello")
    cpu           = optional(string, "1")
    memory        = optional(string, "512Mi")
    max_instances = optional(number, 4)
    # Public because these serve a web UI that signed-in users are redirected
    # into from the hub's /auth/launch/<slug>.
    public = optional(bool, true)
  }))
  default = {
    chalybclip   = {}
    chalybobs    = {}
    chalybcrypto = {}
  }

  # worker.tf wires the render job and the Drive poll to chalybclip
  # specifically — it is the only engine with a media pipeline. Catch its
  # removal here instead of as an unresolved key deep in the graph.
  validation {
    condition     = contains(keys(var.engines), "chalybclip")
    error_message = "engines must include \"chalybclip\": worker.tf attaches the render job and Drive poll to it."
  }
}

variable "enable_domain_mappings" {
  description = <<-EOT
    Create Cloud Run domain mappings for <slug>.<domain>. Requires the domain
    to be verified in Google Search Console for the calling account first, and
    domain mapping is not available in every region. Leave false when putting
    Cloudflare in front of the run.app URLs instead, which is the simpler path.
  EOT
  type        = bool
  default     = false
}
