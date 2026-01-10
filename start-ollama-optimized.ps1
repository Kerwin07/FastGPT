# Ollama 优化启动脚本 - 防止模型阻塞
# 
# 配置说明：
# - 限制同时只加载1个模型
# - 2分钟不用后自动卸载
# - 禁用并行处理避免冲突

Write-Host "================================" -ForegroundColor Cyan
Write-Host "启动 Ollama (优化配置)" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 设置环境变量 - 防止多模型冲突
$env:OLLAMA_MAX_LOADED_MODELS = "1"           # 只允许1个模型在内存中
$env:OLLAMA_KEEP_ALIVE = "2m"                 # 2分钟后自动卸载
$env:OLLAMA_NUM_PARALLEL = "1"                # 禁用并行请求
$env:OLLAMA_MAX_QUEUE = "512"                 # 请求队列大小
$env:OLLAMA_FLASH_ATTENTION = "false"         # 禁用flash attention避免问题

Write-Host "配置已设置：" -ForegroundColor Green
Write-Host "  - 最大加载模型数: 1" -ForegroundColor Gray
Write-Host "  - 自动卸载时间: 2分钟" -ForegroundColor Gray
Write-Host "  - 并行请求: 禁用" -ForegroundColor Gray
Write-Host ""

# 启动Ollama
Write-Host "正在启动 Ollama 服务..." -ForegroundColor Yellow
ollama serve
