region         = "fra1"
droplet_size   = "s-1vcpu-512mb-10gb"
domain_name    = "stackprimeconsulting.com.ng"
enable_backups = false

reserved_subdomains = ["tools", "app", "learn", "api"]

# Tighten this to real admin/office IPs before go-live — left permissive
# only as a placeholder.
admin_ssh_ip_allowlist = ["0.0.0.0/0"]

# do_token and ssh_public_key are supplied at apply time via -var or
# TF_VAR_ environment variables (secrets, not committed here).