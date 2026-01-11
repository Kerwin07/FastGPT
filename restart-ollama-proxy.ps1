# 重启 Ollama 代理服务
Write-Host "正在停止旧的 ollama-proxy 进程..." -ForegroundColor Yellow

# 查找并停止所有 node 进程中运行 ollama-proxy.js 的
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    $process = $_
    try {
        $cmdline = (Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
        if ($cmdline -like "*ollama-proxy.js*") {
            Write-Host "  发现进程 PID $($process.Id): $cmdline" -ForegroundColor Cyan
            Stop-Process -Id $process.Id -Force
            Write-Host "  ✓ 已停止" -ForegroundColor Green
        }
    } catch {
        # 忽略错误
    }
}

Start-Sleep -Seconds 1

# 启动新的代理服务
Write-Host ""
Write-Host "正在启动新的 ollama-proxy 服务..." -ForegroundColor Yellow
Write-Host "  监听端口: http://localhost:3002" -ForegroundColor Cyan
Write-Host "  按 Ctrl+C 停止服务" -ForegroundColor Gray
Write-Host ""

# 启动服务
node ollama-proxy.js
