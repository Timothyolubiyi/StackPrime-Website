# SP Fast Speed Test infrastructure. Deliberately DNS-only, same pattern as
# sp-vas: the droplet itself is provisioned and owned by the marketing-site
# Terraform state (shared droplet decision). This module only adds what
# SP Fast Speed Test uniquely needs — its own DNS record — so it can be
# pointed at a different droplet later with a one-line change, without
# touching any other app's Terraform state.
#
# IMPORTANT PRE-FLIGHT CHECK: this defaults to stackprimeconsulting.com.ng,
# which may not exist as a DigitalOcean-managed DNS zone yet (unlike
# stackprimeconsulting.com, which the marketing site's Terraform already
# created). Before running `terraform apply`:
#   1. Confirm stackprimeconsulting.com.ng has its nameservers pointed at
#      DigitalOcean (ns1/ns2/ns3.digitalocean.com) at your registrar.
#   2. If no Terraform state has created the zone yet, set
#      manage_domain_resource = true in your .tfvars so THIS run creates it.
#      Only one Terraform state should ever own the zone resource — if the
#      marketing site's infra is updated to manage stackprimeconsulting.com.ng
#      itself later, switch this back to false to avoid a conflict.

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
}

resource "digitalocean_record" "speedtest" {
  domain = local.domain
  type   = "A"
  name   = var.subdomain
  value  = var.droplet_ipv4
  ttl    = 3600
}
