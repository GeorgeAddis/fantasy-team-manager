# From project root: API + Postgres
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
. "$PSScriptRoot\docker-env.ps1"
docker compose up @args
