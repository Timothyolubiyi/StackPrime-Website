variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Root domain this subdomain is added under. Defaults to the new canonical domain (stackprimeconsulting.com.ng) — change to stackprimeconsulting.com if you'd rather match SP VAS's current (not-yet-migrated) domain instead."
  type        = string
  default     = "stackprimeconsulting.com.ng"
}

variable "subdomain" {
  description = "Subdomain SP Fast Speed Test responds on"
  type        = string
  default     = "speedtest"
}

variable "droplet_ipv4" {
  description = "IPv4 of the shared Phase 1 droplet SP Fast Speed Test deploys onto. Copy from the marketing-site-infra Terraform output (droplet_ip) — not looked up automatically, since these are deliberately separate Terraform states."
  type        = string
}

variable "manage_domain_resource" {
  description = "Whether this run owns the digitalocean_domain zone resource itself. Set true only if stackprimeconsulting.com.ng has not already been added to your DigitalOcean account by another Terraform state (e.g. the marketing site's, once it migrates). Leave false if the zone already exists — this module will just add a record to it."
  type        = bool
  default     = false
}
