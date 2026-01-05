#!/usr/bin/env pwsh
# FastGPT 认证系统停止脚本

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║        🛑 停止 FastGPT 认证系统所有服务                 ║" -ForegroundColor Red
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

Write-Host "🔍 查找运行中的服务..." -ForegroundColor Yellow

# 获取所有相关进程
$nodeProcesses = Get-Process | Where-Object { $_.ProcessName -eq "node" }
$javaProcesses = Get-Process | Where-Object { $_.ProcessName -eq "java" }

$totalProcesses = $nodeProcesses.Count + $javaProcesses.Count

if ($totalProcesses -eq 0) {
    Write-Host ""
    Write-Host "✅ 没有发现运行中的服务" -ForegroundColor Green
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "📋 发现以下进程:" -ForegroundColor Cyan
if ($nodeProcesses.Count -gt 0) {
    Write-Host "   Node.js 进程: $($nodeProcesses.Count) 个" -ForegroundColor White
}
if ($javaProcesses.Count -gt 0) {
    Write-Host "   Java 进程: $($javaProcesses.Count) 个" -ForegroundColor White
}
Write-Host ""

# 确认停止
$confirmation = Read-Host "是否停止所有这些进程？(Y/N)"
if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
    Write-Host "❌ 操作已取消" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🛑 正在停止服务..." -ForegroundColor Red

# 停止 Node.js 进程
if ($nodeProcesses.Count -gt 0) {
    Write-Host "   停止 Node.js 进程..." -ForegroundColor Cyan
    $nodeProcesses | ForEach-Object {
        try {
            Stop-Process -Id $_.Id -Force -ErrorAction Stop
            Write-Host "   ✓ 已停止进程 PID: $($_.Id)" -ForegroundColor Green
        } catch {
            Write-Host "   ✗ 无法停止进程 PID: $($_.Id)" -ForegroundColor Red
        }
    }
}

# 停止 Java 进程
if ($javaProcesses.Count -gt 0) {
    Write-Host "   停止 Java 进程..." -ForegroundColor Cyan
    $javaProcesses | ForEach-Object {
        try {
            Stop-Process -Id $_.Id -Force -ErrorAction Stop
            Write-Host "   ✓ 已停止进程 PID: $($_.Id)" -ForegroundColor Green
        } catch {
            Write-Host "   ✗ 无法停止进程 PID: $($_.Id)" -ForegroundColor Red
        }
    }
}

# 等待进程完全关闭
Start-Sleep -Seconds 2

# 验证所有进程已停止
$remainingNode = Get-Process | Where-Object { $_.ProcessName -eq "node" }
$remainingJava = Get-Process | Where-Object { $_.ProcessName -eq "java" }

Write-Host ""
if ($remainingNode.Count -eq 0 -and $remainingJava.Count -eq 0) {
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║        ✅ 所有服务已成功停止！                           ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host "⚠️  警告: 仍有 $($remainingNode.Count + $remainingJava.Count) 个进程未能停止" -ForegroundColor Yellow
    if ($remainingNode.Count -gt 0) {
        Write-Host "   Node.js: $($remainingNode.Count) 个" -ForegroundColor White
    }
    if ($remainingJava.Count -gt 0) {
        Write-Host "   Java: $($remainingJava.Count) 个" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "💡 提示: 可以手动在任务管理器中结束这些进程" -ForegroundColor Yellow
}

Write-Host ""
