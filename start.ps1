Write-Host "Starting Financial Analyzer..."

# Backend
$backend = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c cd backend && venv\Scripts\activate && uvicorn main:app --reload" `
    -WindowStyle Hidden `
    -RedirectStandardOutput "backend.log" `
    -RedirectStandardError "backend-error.log" `
    -PassThru

# Zapisz PID
$backend.Id | Out-File "backend.pid"

Start-Sleep -Seconds 3

# Frontend
$frontend = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c cd frontend && npm start" `
    -WindowStyle Hidden `
    -RedirectStandardOutput "frontend.log" `
    -RedirectStandardError "frontend-error.log" `
    -PassThru

# Zapisz PID
$frontend.Id | Out-File "frontend.pid"

Write-Host "Both services started!"
Write-Host "Backend PID: $($backend.Id)"
Write-Host "Frontend PID: $($frontend.Id)"