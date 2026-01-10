# Deploy pdf-mineru local PDF parser
Write-Host "=== Deploying pdf-mineru local PDF parser ===" -ForegroundColor Cyan

# Check Python
Write-Host "`nStep 1: Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python installed: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python not installed. Please install Python 3.10" -ForegroundColor Red
    exit 1
}

# Navigate to directory
Write-Host "`nStep 2: Navigate to pdf-mineru directory..." -ForegroundColor Yellow
Set-Location "C:\Users\Admin\Desktop\FastGPT\plugins\model\pdf-mineru"

# Install dependencies
Write-Host "`nStep 3: Installing magic-pdf (this may take 5-10 minutes)..." -ForegroundColor Yellow
pip install -U "magic-pdf[full]" --extra-index-url https://wheels.myhloli.com -i https://mirrors.aliyun.com/pypi/simple

# Install modelscope and additional dependencies
Write-Host "`nStep 4: Installing modelscope and dependencies..." -ForegroundColor Yellow
pip install modelscope pycocotools

# Download models
Write-Host "`nStep 5: Downloading model files..." -ForegroundColor Yellow
if (Test-Path "download_models_simple.py") {
    python download_models_simple.py
} else {
    Write-Host "Creating model download script..." -ForegroundColor Cyan
    Write-Host "Model download will take 10-30 minutes (8GB+ download)" -ForegroundColor Yellow
    python -c "from modelscope import snapshot_download; from pathlib import Path; models_dir = Path.home() / '.cache' / 'mineru'; models_dir.mkdir(parents=True, exist_ok=True); print(f'Downloading to: {models_dir}'); snapshot_download('opendatalab/PDF-Extract-Kit-1.0', local_dir=str(models_dir), revision='master'); print('Download complete!')"
}

# Fix model directory structure
Write-Host "`nStep 6: Fixing model directory structure..." -ForegroundColor Yellow
$cacheDir = "$env:USERPROFILE\.cache\mineru"
if (Test-Path "$cacheDir\models") {
    Get-ChildItem "$cacheDir\models" -Directory | ForEach-Object {
        $name = $_.Name
        if (-not (Test-Path "$cacheDir\$name")) {
            Write-Host "  Copying $name..." -ForegroundColor Cyan
            Copy-Item -Path "$cacheDir\models\$name" -Destination "$cacheDir\" -Recurse -Force
        }
    }
    Write-Host "Model directories fixed" -ForegroundColor Green
}

# Check GPU
Write-Host "`nStep 7: Checking GPU support..." -ForegroundColor Yellow
try {
    $gpuInfo = nvidia-smi 2>&1
    if ($gpuInfo -match "CUDA") {
        Write-Host "NVIDIA GPU detected, configuring GPU acceleration" -ForegroundColor Green
        
        # Configure GPU mode
        $configPath = "$env:USERPROFILE\magic-pdf.json"
        if (Test-Path $configPath) {
            $config = Get-Content $configPath -Raw | ConvertFrom-Json
            $config.'device-mode' = 'cuda'
            $config | ConvertTo-Json -Depth 10 | Out-File $configPath -Encoding UTF8
            Write-Host "GPU mode configured" -ForegroundColor Green
        }
        
        # Install GPU versions
        Write-Host "Installing GPU version of PyTorch..." -ForegroundColor Cyan
        pip install --force-reinstall torch==2.3.1 torchvision==0.18.1 "numpy<2.0.0" --index-url https://download.pytorch.org/whl/cu118
        pip install paddlepaddle-gpu==2.6.1
    }
} catch {
    Write-Host "No GPU detected, using CPU mode (slower)" -ForegroundColor Yellow
}

# Check files
Write-Host "`nStep 8: Checking project files..." -ForegroundColor Yellow
if (Test-Path "main.py") {
    Write-Host "main.py exists" -ForegroundColor Green
} else {
    Write-Host "main.py not found" -ForegroundColor Red
    exit 1
}

Write-Host "`n==================================" -ForegroundColor Green
Write-Host "pdf-mineru deployment complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host "`nTo start the service:" -ForegroundColor Cyan
Write-Host "  cd C:\Users\Admin\Desktop\FastGPT\plugins\model\pdf-mineru" -ForegroundColor White
Write-Host "  python main.py" -ForegroundColor White
Write-Host "`nService will run on: http://localhost:7231" -ForegroundColor Yellow
