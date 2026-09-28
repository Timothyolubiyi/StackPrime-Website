# NOTE: the `digitalocean_domain` resource represents the DNS zone itself.
# It must only be declared ONCE across the whole set of environments (the
# zone isn't per-environment, only the records within it are). The root
# module only passes `manage_domain_resource = true` for the production
# environment; staging looks the zone up as a data source instead.

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.34"
    }
  }
}

variable "manage_domain_resource" {
  type    = bool
  default = false
}

resource "digitalocean_domain" "this" {
  count = var.manage_domain_resource ? 1 : 0
  name  = var.domain_name
}

data "digitalocean_domain" "existing" {
  count = var.manage_domain_resource ? 0 : 1
  name  = var.domain_name
}

locals {
  domain = var.manage_domain_resource ? digitalocean_domain.this[0].name : data.digitalocean_domain.existing[0].name

  # Root/apex + www for production (site_subdomain == ""), or a single
  # named subdomain for staging/preview environments.
  primary_records = var.site_subdomain == "" ? ["@", "www"] : [var.site_subdomain]
}

resource "digitalocean_record" "primary" {
  for_each = toset(local.primary_records)

  domain = local.domain
  type   = "A"
  name   = each.value
  value  = var.ipv4_address
  ttl    = 3600
}

# Reserved subdomains for Phases 2-4 (tools., app., learn., api.).
# Pointed at the marketing droplet as a harmless placeholder — each phase
# repoints its own record to its own infra when it's actually built, this
# just claims the DNS name and keeps it resolvable (e.g. returning a
# "coming soon" response via the marketing site's Nginx config) rather than
# NXDOMAIN.
resource "digitalocean_record" "reserved" {
  for_each = var.create_reserved_records ? toset(var.reserved_subdomains) : toset([])

  domain = local.domain
  type   = "A"
  name   = each.value
  value  = var.ipv4_address
  ttl    = 3600
}
