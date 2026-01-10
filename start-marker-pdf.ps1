# Marker PDF Parser Service Startup Script
# High-accuracy PDF parsing with image and formula support

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Marker PDF Parser startup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$markerDir = "C:\Users\Admin\Desktop\FastGPT\plugins\model\pdf-marker"

# Check if directory exists
if (-not (Test-Path $markerDir)) {
    Write-Host "Creating marker directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $markerDir -Force | Out-Null
}

cd $markerDir

# Check Python
Write-Host "Checking Python environment..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python not installed or not in PATH" -ForegroundColor Red
    exit 1
}
Write-Host "Python version: $pythonVersion" -ForegroundColor Green

# Check if marker-pdf is installed
Write-Host ""
Write-Host "Checking marker-pdf dependencies..." -ForegroundColor Yellow
$markerInstalled = python -c "import marker; print(marker.__version__)" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "marker-pdf not installed, installing dependencies..." -ForegroundColor Yellow
    Write-Host "This may take a few minutes..." -ForegroundColor Yellow
    
    # Install dependencies
    pip install marker-pdf torch torchvision paddleocr paddlepaddle pillow fastapi uvicorn python-multipart
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "marker-pdf version: $markerInstalled" -ForegroundColor Green
}

# Download models on first run
Write-Host ""
Write-Host "Checking model files..." -ForegroundColor Yellow
Write-Host "Models will be downloaded automatically on first run (about 2GB), please wait..." -ForegroundColor Yellow

# Start service
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Starting Marker PDF service..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URL: http://localhost:7231" -ForegroundColor Green
Write-Host "API Endpoint: http://localhost:7231/v2/parse/file" -ForegroundColor Green
Write-Host ""
Write-Host "Features:" -ForegroundColor Cyan
Write-Host "  * High-accuracy text extraction" -ForegroundColor Green
Write-Host "  * Image and figure recognition" -ForegroundColor Green
Write-Host "  * Formula and equation support" -ForegroundColor Green
Write-Host "  * Table parsing" -ForegroundColor Green
Write-Host "  * Chinese text support" -ForegroundColor Green
Write-Host "  * Layout preservation" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop service" -ForegroundColor Yellow
Write-Host ""

python server.py
