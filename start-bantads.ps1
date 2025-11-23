$ErrorActionPreference = "Stop"

Write-Host "Starting BANTADS..." -ForegroundColor Cyan

Write-Host "`nBuilding Java microservices..." -ForegroundColor Yellow
$services = @("account-query-service", "account-service", "auth-service", "client-service", "manager-service", "saga-orchestrator")
foreach ($service in $services) {
    Push-Location "bantads-backend\$service"
    & ./mvnw.cmd clean package -DskipTests | Out-Null
    Pop-Location
}

Write-Host "Starting Docker containers..." -ForegroundColor Yellow
docker compose up -d --build

Write-Host "Starting Angular frontend..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd bantads-frontend; ng serve"

Write-Host "`nBANTADS is starting!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:4200" -ForegroundColor Cyan
Write-Host "API Gateway: http://localhost:3000" -ForegroundColor Cyan
Write-Host "RabbitMQ Management: http://localhost:15672" -ForegroundColor Cyan
