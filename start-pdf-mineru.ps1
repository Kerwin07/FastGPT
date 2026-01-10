# 快速启动 pdf-mineru
Write-Host "启动 pdf-mineru 服务..." -ForegroundColor Cyan

# 停止旧的 marker-pdf
Write-Host "`n停止旧的 marker-pdf 容器..." -ForegroundColor Yellow
docker stop marker-pdf 2>$null
docker rm marker-pdf 2>$null

# 进入目录
Set-Location "C:\Users\Admin\Desktop\FastGPT\plugins\model\pdf-mineru"

# 检查并创建配置文件
$configPath = "$env:USERPROFILE\magic-pdf.json"
if (-not (Test-Path $configPath)) {
    Write-Host "创建配置文件..." -ForegroundColor Yellow
    $config = @'
{
    "device-mode": "cpu",
    "models-dir": "C:/Users/Admin/.cache/mineru",
    "models": {
        "Layout": {"model_path": "doclayout_yolo"},
        "MFD": {"model_path": "doclayout_yolo"},
        "MFR": {"model_path": "unimernet_small"}
    },
    "layout-config": {
        "model": "doclayout_yolo"
    },
    "formula-config": {
        "mfr_model": "unimernet_small",
        "enable": true
    },
    "table-config": {
        "is_table_recog_enable": false,
        "max_time": 400
    }
}
'@
    [System.IO.File]::WriteAllText($configPath, $config, [System.Text.UTF8Encoding]::new($false))
    Write-Host "配置文件已创建" -ForegroundColor Green
}

# 检查依赖
Write-Host "`n检查依赖..." -ForegroundColor Yellow
$requiredPackages = @("magic-pdf", "pycocotools", "ultralytics", "paddlepaddle")
foreach ($pkg in $requiredPackages) {
    $installed = pip list 2>$null | Select-String $pkg
    if (-not $installed) {
        Write-Host "安装 $pkg..." -ForegroundColor Cyan
        if ($pkg -eq "magic-pdf") {
            pip install -U "magic-pdf[full]" --extra-index-url https://wheels.myhloli.com -i https://mirrors.aliyun.com/pypi/simple
        } elseif ($pkg -eq "paddlepaddle") {
            pip install paddlepaddle
        } else {
            pip install $pkg
        }
    }
}

# 检查模型文件
$modelPath = "C:\Users\Admin\.cache\mineru\MFD\YOLO\yolo_v8_ft.pt"
if (-not (Test-Path $modelPath)) {
    Write-Host "`n警告: 模型文件未找到" -ForegroundColor Yellow
    Write-Host "请先运行: .\setup-pdf-mineru.ps1" -ForegroundColor Red
    $response = Read-Host "是否继续启动? (y/n)"
    if ($response -ne "y") {
        exit
    }
}

# 启动服务
Write-Host "`n启动服务..." -ForegroundColor Green
Write-Host "服务地址: http://localhost:7231" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Yellow
Write-Host ""
python main.py
