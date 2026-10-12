terraform {
  required_version = ">= 1.6.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.34"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

# Local state, same rationale as sp-vas and the marketing site: no remote
# backend in the lean setup. Back up terraform.tfstate manually after apply.
