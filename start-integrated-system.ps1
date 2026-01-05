# 启动FastGPT完整认证系统整合脚本

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        🚀 FastGPT 完整认证系统启动中...                ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 关闭可能已经在运行的Node.js和Java进程
Write-Host "🧹 清理现有进程..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.ProcessName -eq "java" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "✅ 清理完成" -ForegroundColor Green
Write-Host ""

# 启动Spring Boot后端
Write-Host "1️⃣  启动Spring Boot后端服务..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command cd C:\Users\Admin\Desktop\FastGPT\fastgpt-backend; Write-Host '🔐 Spring Boot后端服务 (端口: 8080)' -ForegroundColor Magenta; mvn spring-boot:run"
Write-Host "   🔐 后端API: http://localhost:8080" -ForegroundColor White
Start-Sleep -Seconds 5

# 启动认证API服务
Write-Host "2️⃣  启动认证API服务..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command cd C:\Users\Admin\Desktop\FastGPT\auth-system; Write-Host '🔑 认证API服务器 (端口: 3003)' -ForegroundColor Magenta; node simple-server.js"
Write-Host "   🔑 认证API: http://localhost:3003" -ForegroundColor White
Start-Sleep -Seconds 3

# 启动认证代理服务
Write-Host "3️⃣  启动认证代理服务..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command cd C:\Users\Admin\Desktop\FastGPT\auth-system; Write-Host '🛡️  认证代理服务器 (端口: 3004)' -ForegroundColor Magenta; node ultra-simple-proxy.js"
Write-Host "   🛡️  认证代理: http://localhost:3004" -ForegroundColor White
Start-Sleep -Seconds 3

# 启动管理前端
Write-Host "4️⃣  启动管理前端..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command cd C:\Users\Admin\Desktop\FastGPT\fastgpt-admin; Write-Host '🖥️  管理前端 (端口: 5173)' -ForegroundColor Magenta; pnpm dev"
Write-Host "   🖥️  管理前端: http://localhost:5173" -ForegroundColor White
Start-Sleep -Seconds 5

# 启动FastGPT主服务
Write-Host "5️⃣  启动FastGPT主服务..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command cd C:\Users\Admin\Desktop\FastGPT\projects\app; Write-Host '💬 FastGPT主服务 (端口: 3000)' -ForegroundColor Magenta; pnpm dev"
Write-Host "   💬 FastGPT: http://localhost:3000" -ForegroundColor White

Write-Host "   💬 FastGPT: http://localhost:3000" -ForegroundColor White

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        ✅ 所有服务启动完成！                             ║" -ForegroundColor Green
Write-Host "╠═══════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  服务列表:                                                ║" -ForegroundColor White
Write-Host "║  🔐 后端API:        http://localhost:8080                ║" -ForegroundColor White
Write-Host "║  🔑 认证API:        http://localhost:3003                ║" -ForegroundColor White
Write-Host "║  🛡️  认证代理:       http://localhost:3004                ║" -ForegroundColor White
Write-Host "║  🖥️  管理前端:       http://localhost:5173                ║" -ForegroundColor White
Write-Host "║  💬 FastGPT:        http://localhost:3000                ║" -ForegroundColor White
Write-Host "║                                                           ║" -ForegroundColor White
Write-Host "║  使用说明:                                                ║" -ForegroundColor Yellow
Write-Host "║  1. 访问 FastGPT 创建应用并生成分享链接                 ║" -ForegroundColor White
Write-Host "║  2. 将分享链接的端口从 3000 改为 3004:                   ║" -ForegroundColor White
Write-Host "║     原始: http://localhost:3000/chat/share/xxx           ║" -ForegroundColor White
Write-Host "║     修改: http://localhost:3004/chat/share/xxx           ║" -ForegroundColor White
Write-Host "║  3. 通过修改后的链接访问需要先登录                       ║" -ForegroundColor White
Write-Host "║  4. 在管理前端注册账号或登录后才能访问分享内容           ║" -ForegroundColor White
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "💡 提示: 所有服务在独立窗口运行，关闭窗口即停止服务" -ForegroundColor Yellow
Write-Host ""