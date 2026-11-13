locals {
  name = "stackprime-saas-${var.environment}"
  tags = ["stackprime", "saas-platform", var.environment]
}

data "digitalocean_ssh_key" "admin" {
  name = var.ssh_key_name
}

data "digitalocean_domain" "root" {
  name = var.domain
}

resource "digitalocean_droplet" "saas" {
  name        = local.name
  region      = var.region
  size        = var.droplet_size
  image       = "ubuntu-22-04-x64"
  ssh_keys    = [data.digitalocean_ssh_key.admin.id]
  monitoring  = true
  backups     = var.enable_droplet_backups
  resize_disk = var.resize_disk
  tags        = local.tags

  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    deploy_public_key = var.deploy_public_key
    swap_size         = var.swap_size
  })

  lifecycle {
    # cloud-init only runs on first boot; changing it must not rebuild a droplet that holds the database.
    ignore_changes = [user_data, image]
  }
}

resource "digitalocean_firewall" "saas" {
  name        = "${local.name}-fw"
  droplet_ids = [digitalocean_droplet.saas.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.ssh_allowed_cidrs
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

  # Outbound is open: the API calls Stripe, Zoho SMTP, Spaces and the LLM provider.
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
  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

resource "digitalocean_record" "app" {
  count  = var.create_app_dns_record ? 1 : 0
  domain = data.digitalocean_domain.root.id
  type   = "A"
  name   = "app"
  value  = digitalocean_droplet.saas.ipv4_address
  ttl    = 300
}

# PRIVATE: licensed installers. Served only through short-lived pre-signed URLs.
resource "digitalocean_spaces_bucket" "artifacts" {
  name   = var.artifacts_bucket_name
  region = var.region
  acl    = "private"

  versioning {
    enabled = true
  }
}

# PRIVATE: nightly database dumps, expire automatically.
resource "digitalocean_spaces_bucket" "backups" {
  name   = var.backups_bucket_name
  region = var.region
  acl    = "private"

  lifecycle_rule {
    id      = "expire-old-dumps"
    enabled = true
    expiration {
      days = var.backup_retention_days
    }
  }
}

# Alert before the 1 GB droplet runs out of room. Alerts go to the account email.
resource "digitalocean_monitor_alert" "memory" {
  alerts {
    email = [var.alert_email]
  }
  window      = "10m"
  type        = "v1/insights/droplet/memory_utilization_percent"
  compare     = "GreaterThan"
  value       = 85
  enabled     = true
  entities    = [digitalocean_droplet.saas.id]
  description = "${local.name}: memory above 85% for 10 minutes (consider the 2 GB plan)"
}

resource "digitalocean_monitor_alert" "disk" {
  alerts {
    email = [var.alert_email]
  }
  window      = "10m"
  type        = "v1/insights/droplet/disk_utilization_percent"
  compare     = "GreaterThan"
  value       = 80
  enabled     = true
  entities    = [digitalocean_droplet.saas.id]
  description = "${local.name}: disk above 80%"
}
