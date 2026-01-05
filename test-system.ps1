# FastGPT 认证系统测试脚本

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        🧪 FastGPT 认证系统测试                          ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 测试端口是否可用
function Test-Port {
    param (
        [string]$Host,
        [int]$Port,
        [string]$ServiceName
    )
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect($Host, $Port)
        $tcpClient.Close()
        Write-Host "✅ $ServiceName (端口 $Port) - 运行中" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ $ServiceName (端口 $Port) - 未运行" -ForegroundColor Red
        return $false
    }
}

Write-Host "📋 检查服务状态..." -ForegroundColor Yellow
Write-Host ""

$allRunning = $true

# 测试各个服务
$springBoot = Test-Port -Host "localhost" -Port 8080 -ServiceName "Spring Boot 后端"
$authApi = Test-Port -Host "localhost" -Port 3003 -ServiceName "认证API服务器"
$authProxy = Test-Port -Host "localhost" -Port 3004 -ServiceName "认证代理服务器"
$adminFrontend = Test-Port -Host "localhost" -Port 5173 -ServiceName "管理前端"
$fastgpt = Test-Port -Host "localhost" -Port 3000 -ServiceName "FastGPT主服务"

Write-Host ""

# 判断是否所有服务都在运行
if (-not $springBoot) { $allRunning = $false }
if (-not $authApi) { $allRunning = $false }
if (-not $authProxy) { $allRunning = $false }
if (-not $adminFrontend) { $allRunning = $false }
if (-not $fastgpt) { $allRunning = $false }

if ($allRunning) {
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║        ✅ 所有服务正常运行！                             ║" -ForegroundColor Green
    Write-Host "╠═══════════════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "║  可以开始使用认证系统了！                                ║" -ForegroundColor White
    Write-Host "║                                                           ║" -ForegroundColor White
    Write-Host "║  下一步:                                                  ║" -ForegroundColor Yellow
    Write-Host "║  1. 访问 http://localhost:5173 注册账号                  ║" -ForegroundColor White
    Write-Host "║  2. 访问 http://localhost:3000 创建 FastGPT 应用         ║" -ForegroundColor White
    Write-Host "║  3. 生成分享链接并修改端口为 3004                        ║" -ForegroundColor White
    Write-Host "║  4. 访问修改后的链接测试认证功能                         ║" -ForegroundColor White
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║        ⚠️  部分服务未运行                                ║" -ForegroundColor Red
    Write-Host "╠═══════════════════════════════════════════════════════════╣" -ForegroundColor Red
    Write-Host "║  请执行以下命令启动所有服务:                             ║" -ForegroundColor Yellow
    Write-Host "║                                                           ║" -ForegroundColor White
    Write-Host "║  .\start-integrated-system.ps1                           ║" -ForegroundColor White
    Write-Host "║                                                           ║" -ForegroundColor White
    Write-Host "║  或者手动启动缺失的服务                                  ║" -ForegroundColor White
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Red
}

Write-Host ""

# 测试 API 连通性（如果认证API运行中）
if ($authApi) {
    Write-Host "🔍 测试 API 连通性..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        # 测试健康检查端点（如果有）
        $response = Invoke-WebRequest -Uri "http://localhost:3003" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "✅ 认证API响应正常 (状态码: $($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  认证API响应异常: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

# 显示访问地址
Write-Host "📍 快速访问地址:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  🔐 后端API:        http://localhost:8080" -ForegroundColor White
Write-Host "  🔑 认证API:        http://localhost:3003" -ForegroundColor White
Write-Host "  🛡️  认证代理:       http://localhost:3004" -ForegroundColor White
Write-Host "  🖥️  管理前端:       http://localhost:5173" -ForegroundColor White
Write-Host "  💬 FastGPT:        http://localhost:3000" -ForegroundColor White
Write-Host ""

Write-Host "💡 提示: 使用 Ctrl+C 复制这些地址到浏览器" -ForegroundColor Cyan
Write-Host ""
