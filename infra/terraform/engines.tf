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

  env = merge(
    {
      NEXOCLIP_OBJECT_STORAGE_BUCKET = google_storage_bucket.media.name
      NEXOCLIP_DEFAULT_OUTPUT_DIR    = "/tmp/out"
      ENGINE_SLUG                    = each.key
      PUBLIC_URL                     = "https://${each.key}.${var.domain}"
    },
    # ChalybClip dispatches pipeline runs to its worker over the kickoff/poll
    # contract ModalJobDispatcher already speaks — the worker is just another
    # host answering it, so no dispatcher code changes.
    each.key != "chalybclip" ? {} : {
      NEXOCLIP_MODAL_PIPELINE_ENDPOINT_URL = google_cloud_run_v2_service.worker.uri
    },
  )

  # Names are what the ENGINE reads, which is not what the hub calls them.
  # Verified against picassoglitch/nexoclip nexoclip/settings.py: all three
  # carry an explicit validation_alias, so they are read WITHOUT the
  # NEXOCLIP_ prefix that the rest of that Settings class uses.
  #
  # Only the VALUES have to match the hub's CHALYB<SLUG>_ADMIN_TOKEN /
  # CHALYB<SLUG>_SSO_SECRET — the names differ by side, which is fine.
  #
  # These still say NEXO_AI because the engine repo has not been rebranded;
  # only the hub has. Renaming the aliases is a follow-up, and both sides
  # must move in the same deploy.
  secret_env = {
    NEXO_AI_ADMIN_TOKEN = google_secret_manager_secret.engine["${each.key}-admin-token"].secret_id
    NEXO_AI_SSO_SECRET  = google_secret_manager_secret.engine["${each.key}-sso-secret"].secret_id
    DATABASE_URL        = google_secret_manager_secret.engine["${each.key}-database-url"].secret_id
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
