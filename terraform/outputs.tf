output "droplet_ip" {
  description = "Public IPv4 address of the production droplet"
  value       = module.droplet.ipv4_address
}

output "droplet_name" {
  value = module.droplet.droplet_name
}

output "dns_records" {
  value = module.dns.record_fqdns
}