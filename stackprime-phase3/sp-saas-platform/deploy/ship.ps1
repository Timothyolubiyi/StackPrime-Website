<#
.SYNOPSIS
  Builds the API image on this PC, copies it to the droplet, and rolls it out
  (migrations, restart, health check, automatic rollback if the API does not start).

.EXAMPLE
  .\ship.ps1 -Server app.stackprimeconsulting.com.ng
#>
param(
  [Parameter(Mandatory = $true)][string]$Server,
  [string]$Key = "$HOME\.ssh\sp_saas_deploy",
  [string]$Tag = ("manual-" + (Get-Date -Format "yyyyMMdd-HHmm"))
)
$ErrorActionPreference = 'Stop'

function Run([string]$What, [scriptblock]$Block) {
  Write-Host "==> $What" -ForegroundColor Cyan
  & $Block
  if ($LASTEXITCODE -ne 0) { throw "Failed: $What (exit code $LASTEXITCODE)" }
}

$api    = (Resolve-Path (Join-Path $PSScriptRoot '..\api')).Path
$image  = "registry.digitalocean.com/local/sp-saas-api:$Tag"   # "local" must match DO_REGISTRY_NAMESPACE in the server's .env
$tar    = Join-Path $env:TEMP "sp-saas-api-$Tag.tar"
$target = "deploy@$Server"
$opts   = @('-i', $Key, '-o', 'StrictHostKeyChecking=accept-new')

Run "Build the image ($Tag)"            { docker build -t $image $api }
Run "Save the image to a file"          { docker save -o $tar $image }
Run "Prepare folders on the server"     { ssh @opts $target 'mkdir -p /opt/sp-saas/deploy/nginx /opt/sp-saas/deploy/web-dist' }
Run "Upload the image (a few minutes)"  { scp @opts $tar "${target}:/tmp/sp-saas-api.tar" }
Run "Upload deploy files"               { scp @opts "$PSScriptRoot\docker-compose.yml" "$PSScriptRoot\remote-rollout.sh" "$PSScriptRoot\backup.sh" "$PSScriptRoot\init-letsencrypt.sh" "$PSScriptRoot\setup-env.sh" "${target}:/opt/sp-saas/deploy/" }
Run "Upload the nginx config"           { scp @opts "$PSScriptRoot\nginx\app.conf" "${target}:/opt/sp-saas/deploy/nginx/app.conf" }

$script = ((Get-Content "$PSScriptRoot\remote-rollout.sh" -Raw) -replace "`r", "") -replace "__TAG__", $Tag
Run "Roll out on the server"            { $script | ssh @opts $target 'bash -s' }

Remove-Item $tar -ErrorAction SilentlyContinue
Write-Host "Done. Deployed $Tag to $Server" -ForegroundColor Green
