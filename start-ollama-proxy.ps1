# Start Ollama Proxy Service

Write-Host "Checking Ollama service..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/v1/models" -Method Get -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    Write-Host "Ollama is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Ollama is not running!" -ForegroundColor Red
    Write-Host "Please start Ollama first: ollama serve" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting FastGPT Ollama Proxy..." -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Gray
Write-Host ""

node .\ollama-proxy.js
