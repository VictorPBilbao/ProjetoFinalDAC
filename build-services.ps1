# Script to compile all Java microservices
# Author: Build automation script for BANTADS project

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Building BANTADS Microservices" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Define the base directory
$baseDir = "bantads-backend"

# Define all Java services to build
$services = @(
    "account-query-service",
    "account-service",
    "auth-service",
    "client-service",
    "manager-service",
    "saga-orchestrator"
)

# Track build status
$buildResults = @()

foreach ($service in $services) {
    Write-Host "Building $service..." -ForegroundColor Yellow
    $servicePath = Join-Path $baseDir $service
    
    if (Test-Path $servicePath) {
        Push-Location $servicePath
        
        # Run Maven clean package, skip tests for faster builds
        # Remove -DskipTests if you want to run tests
        $output = & ./mvnw.cmd clean package -DskipTests 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $service built successfully!" -ForegroundColor Green
            $buildResults += [PSCustomObject]@{
                Service = $service
                Status = "SUCCESS"
            }
        } else {
            Write-Host "✗ $service build FAILED!" -ForegroundColor Red
            $buildResults += [PSCustomObject]@{
                Service = $service
                Status = "FAILED"
            }
        }
        
        Pop-Location
        Write-Host ""
    } else {
        Write-Host "✗ Service directory not found: $servicePath" -ForegroundColor Red
        $buildResults += [PSCustomObject]@{
            Service = $service
            Status = "NOT FOUND"
        }
        Write-Host ""
    }
}

# Print summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Build Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
$buildResults | Format-Table -AutoSize

# Count results
$successCount = ($buildResults | Where-Object { $_.Status -eq "SUCCESS" }).Count
$failedCount = ($buildResults | Where-Object { $_.Status -eq "FAILED" }).Count

Write-Host ""
Write-Host "Total: $($services.Count) services" -ForegroundColor White
Write-Host "Success: $successCount" -ForegroundColor Green
Write-Host "Failed: $failedCount" -ForegroundColor Red

if ($failedCount -gt 0) {
    exit 1
} else {
    Write-Host ""
    Write-Host "All services built successfully! ✓" -ForegroundColor Green
    exit 0
}
