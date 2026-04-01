# Zatrzymaj backend (uvicorn)
$uvicorn = Get-Process -Name "python" -ErrorAction SilentlyContinue
if ($uvicorn) {
    $uvicorn | Stop-Process -Force
    Write-Host "Backend zatrzymany." -ForegroundColor Green
} else {
    Write-Host "Backend nie był uruchomiony." -ForegroundColor Yellow
}

# Zatrzymaj frontend (node)
$node = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($node) {
    $node | Stop-Process -Force
    Write-Host "Frontend zatrzymany." -ForegroundColor Green
} else {
    Write-Host "Frontend nie był uruchomiony." -ForegroundColor Yellow
}

Write-Host "Financial Analyzer zatrzymany!" -ForegroundColor Cyan