# 切换到FastGPT自带PDF解析
Write-Host "🔄 切换到内置PDF解析器..." -ForegroundColor Cyan

# 停止marker-pdf
docker stop marker-pdf

# 备份.env.local
Copy-Item "C:\Users\Admin\Desktop\FastGPT\projects\app\.env.local" `
          "C:\Users\Admin\Desktop\FastGPT\projects\app\.env.local.bak"

Write-Host "✅ 已停用marker-pdf" -ForegroundColor Green
Write-Host "✅ 现在使用FastGPT内置解析器（pdfjs-dist）" -ForegroundColor Green
Write-Host "`n📌 注意：内置解析器对复杂PDF效果一般，但中文编码没问题" -ForegroundColor Yellow
Write-Host "`n重启FastGPT后生效" -ForegroundColor Cyan
