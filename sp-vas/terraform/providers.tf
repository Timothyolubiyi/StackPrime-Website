terraform {
  required_version = ">= 1.6.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.34"
    }
  }

  # Local state, deliberately separate from the marketing site's state file.
  # This is the whole point of the app-by-app split: SP VAS can be planned,
  # applied, and torn down independently without touching the marketing
  # site's or SP Fast Speed Test's Terraform state.
}

provider "digitalocean" {
  token = var.do_token
}
