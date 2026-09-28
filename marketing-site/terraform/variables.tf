variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "DigitalOcean region slug"
  type        = string
  default     = "fra1"
}

variable "droplet_size" {
  description = "DigitalOcean droplet size slug"
  type        = string
  default     = "s-1vcpu-1gb" # ~$6/month, enough for Node.js builds
}

variable "domain_name" {
  description = "Root domain managed in DigitalOcean DNS (e.g. stackprimeconsulting.com.ng)"
  type        = string
  default     = "stackprimeconsulting.com.ng"
}

variable "ssh_public_key" {
  description = "SSH public key content, added to the droplet for deploy access"
  type        = string
}

variable "admin_ssh_ip_allowlist" {
  description = "CIDR blocks allowed to SSH into the droplet (keep this tight — deploy runners + admin IPs only)"
  type        = list(string)
  default     = ["0.0.0.0/0"] # placeholder — tighten before real use
}

variable "enable_backups" {
  description = "Enable DigitalOcean droplet backups (~20% extra cost). Off by default to stay in the lean tier."
  type        = bool
  default     = false
}

variable "reserved_subdomains" {
  description = "Subdomains reserved in DNS for future phases (Web Solutions, SaaS Platform, Training Academy) — free A records pointed at this same droplet as placeholders until each phase gets its own infra."
  type        = list(string)
  default     = ["tools", "app", "learn", "api"]
}