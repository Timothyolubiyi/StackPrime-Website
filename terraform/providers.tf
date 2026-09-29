terraform {
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

# NOTE: Terraform state is LOCAL for this lean setup (no remote backend) —
# dropping the DO Spaces bucket for state storage was necessary to avoid its
# ~$5/month cost, which would have defeated the point of a lean setup.
#
# This means terraform.tfstate only exists on whichever machine runs
# `terraform apply`. Back it up manually after every apply (e.g. copy it
# somewhere encrypted/off this machine) — losing it without a backup means
# Terraform loses track of what it created, and recovering requires manual
# `terraform import` for every resource. If that risk matters more than the
# ~$5/month, reintroducing a DO Spaces remote backend is a small change.