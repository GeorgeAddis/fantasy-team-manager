@echo off
REM Docker Compose without relying on PATH (Cursor/PS often misses updated PATH)
setlocal EnableDelayedExpansion

set "DOCKER_EXE="
set "DOCKER_BIN="
for %%D in (
  "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe"
  "%ProgramFiles(x86)%\Docker\Docker\resources\bin\docker.exe"
  "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
) do if exist %%~D (
  set "DOCKER_EXE=%%~D"
  set "DOCKER_BIN=%%~dpD"
  goto :found
)
:found
if not defined DOCKER_EXE (
  echo.
  echo [dc.cmd] docker.exe not found in usual Docker Desktop locations.
  echo Install/start Docker Desktop, or edit dc.cmd and set DOCKER_EXE manually.
  echo.
  exit /b 1
)

REM So builds/pulls find docker-credential-desktop (Docker config credsStore=desktop)
set "PATH=%DOCKER_BIN%;%PATH%"

"%DOCKER_EXE%" compose %*
exit /b %ERRORLEVEL%
