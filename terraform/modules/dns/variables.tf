variable "domain_name" {
  description = "Root domain, e.g. stackprimeconsulting.com"
  type        = string
}

variable "ipv4_address" {
  description = "IPv4 address the records should point to"
  type        = string
}

variable "site_subdomain" {
  description = "Subdomain for this environment's site. Empty string = apex + www (production). A value like \"staging\" creates only staging.<domain>."
  type        = string
  default     = ""
}

variable "reserved_subdomains" {
  description = "Additional subdomains to reserve, pointed at the same droplet for now (placeholder until each phase gets its own infra)"
  type        = list(string)
  default     = []
}

variable "create_reserved_records" {
  description = "Whether to create the reserved-subdomain placeholder records (only do this once, from the production environment, to avoid duplicate-record conflicts across environments)"
  type        = bool
  default     = false
}
