# Fix marker-pdf encoding issue
Write-Host "Stopping and reconfiguring marker-pdf..." -ForegroundColor Cyan

# 1. Stop existing container
docker stop marker-pdf 2>$null
docker rm marker-pdf 2>$null

# 2. Restart with Chinese encoding environment variables
docker run -d `
  --name marker-pdf `
  -p 7231:7231 `
  --gpus all `
  -e LANG=zh_CN.UTF-8 `
  -e LC_ALL=zh_CN.UTF-8 `
  -e PYTHONIOENCODING=utf-8 `
  -v C:/Users/Admin/Desktop/FastGPT/marker-temp:/tmp/marker `
  registry.cn-hangzhou.aliyuncs.com/fastgpt/marker:v0.2

Write-Host "Marker-pdf restarted with encoding config:" -ForegroundColor Green
Write-Host "  LANG=zh_CN.UTF-8" -ForegroundColor Gray
Write-Host "  LC_ALL=zh_CN.UTF-8" -ForegroundColor Gray
Write-Host "  PYTHONIOENCODING=utf-8" -ForegroundColor Gray

# 3. Wait for startup
Write-Host ""
Write-Host "Waiting for service to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 4. Check status
Write-Host ""
Write-Host "Container logs:" -ForegroundColor Cyan
docker logs marker-pdf --tail 20

Write-Host ""
Write-Host "Fix complete! You can now test PDF upload again" -ForegroundColor Green
