resource "digitalocean_project" "this" {
  # A single shared project across environments/phases keeps everything
  # visible together in the DO dashboard. Guard against re-creating it if it
  # already exists by importing rather than re-declaring in later modules.
  count       = var.environment == "production" ? 1 : 0
  name        = var.project_name
  description = "All infrastructure for stackprimeconsulting.com and related products."
  purpose     = "Web Application"
  environment = "Production"
}

resource "digitalocean_ssh_key" "deploy" {
  name       = "${var.name}-deploy-key"
  public_key = var.ssh_public_key
}

resource "digitalocean_droplet" "this" {
  name     = var.name
  region   = var.region
  size     = var.size
  image    = "ubuntu-22-04-x64"
  ssh_keys = [digitalocean_ssh_key.deploy.fingerprint]
  backups  = var.enable_backups
  monitoring = true

  user_data = templatefile("${path.module}/cloud-init.yaml.tpl", {
    environment = var.environment
  })

  tags = ["stackprime", var.environment, "marketing-site"]
}

resource "digitalocean_project_resources" "this" {
  count   = var.environment == "production" ? 1 : 0
  project = digitalocean_project.this[0].id
  resources = [
    digitalocean_droplet.this.urn,
  ]
}

resource "digitalocean_firewall" "this" {
  name = "${var.name}-fw"

  droplet_ids = [digitalocean_droplet.this.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.admin_ssh_ip_allowlist
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
