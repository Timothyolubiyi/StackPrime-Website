variable "name" {
  description = "Droplet name, e.g. stackprime-marketing-prod"
  type        = string
}

variable "region" {
  type = string
}

variable "size" {
  type = string
}

variable "ssh_public_key" {
  type = string
}

variable "admin_ssh_ip_allowlist" {
  type = list(string)
}

variable "environment" {
  type = string
}

variable "enable_backups" {
  type    = bool
  default = false
}

variable "project_name" {
  description = "DigitalOcean Project to assign this droplet's resources to"
  type        = string
  default     = "StackPrime Consulting"
}
