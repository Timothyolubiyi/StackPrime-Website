# Single-environment (production only) lean setup: one droplet, free DNS,
# no Container Registry, no Spaces. Images are built directly on the
# droplet by the CI/CD workflow instead of pushed to a registry.

module "droplet" {
  source = "./modules/droplet"

  name                   = "stackprime-marketing-production"
  region                 = var.region
  size                   = var.droplet_size
  ssh_public_key         = var.ssh_public_key
  admin_ssh_ip_allowlist = var.admin_ssh_ip_allowlist
  environment            = "production"
  enable_backups         = var.enable_backups
}

module "dns" {
  source = "./modules/dns"

  domain_name              = var.domain_name
  ipv4_address             = module.droplet.ipv4_address
  site_subdomain           = "" # apex + www
  manage_domain_resource   = true
  create_reserved_records  = true
  reserved_subdomains      = var.reserved_subdomains
}