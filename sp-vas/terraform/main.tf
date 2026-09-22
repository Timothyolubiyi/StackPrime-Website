# SP VAS infrastructure. Deliberately DNS-only: the droplet itself is
# provisioned and owned by the marketing-site-infra Terraform state (shared
# droplet decision — see project notes). This module only adds what SP VAS
# uniquely needs: its own DNS record, so it can be pointed at a different
# droplet later with a one-line change here, without touching any other
# app's Terraform state.

data "digitalocean_domain" "existing" {
  name = var.domain_name
}

resource "digitalocean_record" "vas" {
  domain = data.digitalocean_domain.existing.name
  type   = "A"
  name   = var.subdomain
  value  = var.droplet_ipv4
  ttl    = 3600
}
