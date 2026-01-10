#!/usr/bin/env pwsh
# Start PyMuPDF4LLM PDF Parser Service

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "PyMuPDF4LLM PDF Parser Service" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check Python version
$pythonVersion = python --version 2>&1
Write-Host "Python version: $pythonVersion" -ForegroundColor Green

# Check if pymupdf4llm is installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow
$installed = python -c "import pymupdf4llm; print('OK')" 2>&1
if ($installed -ne "OK") {
    Write-Host "Installing pymupdf4llm..." -ForegroundColor Yellow
    pip install pymupdf4llm pillow -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
}

Write-Host ""
Write-Host "Features:" -ForegroundColor Cyan
Write-Host "  - FAST: 30x faster than deep learning OCR" -ForegroundColor Green
Write-Host "  - Accurate: 80-90% text extraction accuracy" -ForegroundColor Green
Write-Host "  - Chinese: Full Chinese text support" -ForegroundColor Green
Write-Host "  - Formulas: Math formula extraction" -ForegroundColor Green
Write-Host "  - Tables: Table structure parsing" -ForegroundColor Green
Write-Host "  - Images: Image reference extraction" -ForegroundColor Green
Write-Host ""

Write-Host "Starting service on port 7231..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start the service
python "$PSScriptRoot\server.py"
