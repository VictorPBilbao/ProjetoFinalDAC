#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Stops all BANTADS services
.DESCRIPTION
    Stops all Docker containers and optionally removes volumes
.PARAMETER RemoveVolumes
    Also remove all volumes (databases will be cleared)
.EXAMPLE
    .\stop-bantads.ps1
    # Stop containers but keep data
.EXAMPLE
    .\stop-bantads.ps1 -RemoveVolumes
    # Stop containers and remove all data
#>

param(
    [switch]$RemoveVolumes
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Stopping BANTADS Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($RemoveVolumes) {
    Write-Host "→ Stopping containers and removing volumes..." -ForegroundColor Yellow
    docker compose down -v
    Write-Host "✓ All containers stopped and volumes removed" -ForegroundColor Green
} else {
    Write-Host "→ Stopping containers (keeping volumes)..." -ForegroundColor Yellow
    docker compose down
    Write-Host "✓ All containers stopped (data preserved)" -ForegroundColor Green
}

Write-Host ""
Write-Host "To start again, run: .\start-bantads.ps1" -ForegroundColor Gray
Write-Host ""
