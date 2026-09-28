variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Root domain (already managed in DigitalOcean DNS by the marketing site's Terraform)"
  type        = string
  default     = "stackprimeconsulting.com.ng"
}

variable "subdomain" {
  description = "Subdomain SP VAS responds on"
  type        = string
  default     = "vas"
}

variable "droplet_ipv4" {
  description = "IPv4 of the shared Phase 1 droplet SP VAS deploys onto. Copy this from the marketing-site-infra Terraform output (droplet_ip) — not looked up automatically, since these are deliberately separate Terraform states."
  type        = string
}
