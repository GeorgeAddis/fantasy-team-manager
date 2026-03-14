# One-time Laravel bootstrap
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
. "$PSScriptRoot\docker-env.ps1"
docker compose --profile init run --rm composer-init
