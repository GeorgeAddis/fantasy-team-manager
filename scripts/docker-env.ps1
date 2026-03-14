# Put Docker on PATH for this PowerShell session (Cursor often doesn't inherit it)
$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
if (Test-Path "$dockerBin\docker.exe") {
    $env:PATH = "$dockerBin;$env:PATH"
    Write-Host "Docker CLI on PATH for this session." -ForegroundColor Green
} else {
    Write-Host "docker.exe not found at: $dockerBin" -ForegroundColor Red
    Write-Host "Install Docker Desktop, or if it's elsewhere, edit this script." -ForegroundColor Yellow
    exit 1
}
