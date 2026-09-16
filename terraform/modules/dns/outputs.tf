output "domain" {
  value = local.domain
}

output "record_fqdns" {
  value = [for r in digitalocean_record.primary : r.fqdn]
}
