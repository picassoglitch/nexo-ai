module "engine" {
  source   = "./modules/engine"
  for_each = var.engines

  slug       = each.key
  project_id = var.project_id
  region     = var.region

  image         = each.value.image
  cpu           = each.value.cpu
  memory        = each.value.memory
  max_instances = each.value.max_instances
  public        = each.value.public

  media_bucket = google_storage_bucket.media.name

  env = {
    MEDIA_BUCKET = google_storage_bucket.media.name
    ENGINE_SLUG  = each.key
    PUBLIC_URL   = "https://${each.key}.${var.domain}"
  }

  # Names must match what the engine reads. The hub's side of these is in
  # .env.local.example (CHALYB<SLUG>_ADMIN_TOKEN / _SSO_SECRET).
  secret_env = {
    CHALYB_ADMIN_TOKEN = google_secret_manager_secret.engine["${each.key}-admin-token"].secret_id
    CHALYB_SSO_SECRET  = google_secret_manager_secret.engine["${each.key}-sso-secret"].secret_id
    DATABASE_URL       = google_secret_manager_secret.engine["${each.key}-database-url"].secret_id
  }
}

# <slug>.chalyb.com straight onto Cloud Run. Off by default: the domain must be
# verified for the calling account first, and mapping is not available in every
# region. Fronting the run.app URLs with Cloudflare is the simpler path and also
# gets caching and DDoS cover.
resource "google_cloud_run_domain_mapping" "engine" {
  for_each = var.enable_domain_mappings ? var.engines : {}

  name     = "${each.key}.${var.domain}"
  location = var.region

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = module.engine[each.key].service_name
  }
}
