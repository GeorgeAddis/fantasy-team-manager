# Run: powershell -File scripts\where-is-docker.ps1
Write-Host "`nChecking common Docker CLI locations...`n" -ForegroundColor Cyan
$candidates = @(
    "${env:ProgramFiles}\Docker\Docker\resources\bin\docker.exe"
    "${env:ProgramFiles(x86)}\Docker\Docker\resources\bin\docker.exe"
    "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
)
$found = $false
foreach ($p in $candidates) {
    if (Test-Path $p) {
        Write-Host "FOUND: $p" -ForegroundColor Green
        & $p version 2>$null
        $found = $true
    } else {
        Write-Host "no    : $p" -ForegroundColor DarkGray
    }
}
if (-not $found) {
    Write-Host "`nNo docker.exe in those folders. Open Docker Desktop once; reinstall if needed.`n" -ForegroundColor Red
}

Write-Host "`nUser PATH entries containing 'Docker':" -ForegroundColor Cyan
$path = [Environment]::GetEnvironmentVariable("Path", "User")
$dockerBits = ($path -split ';' | Where-Object { $_ -match 'Docker' })
if ($dockerBits) { $dockerBits | ForEach-Object { Write-Host "  $_" } }
else { Write-Host "  (none — add: C:\Program Files\Docker\Docker\resources\bin)" -ForegroundColor Yellow }

Write-Host "`nTip: from project folder run:  .\dc.cmd up`n" -ForegroundColor Green
