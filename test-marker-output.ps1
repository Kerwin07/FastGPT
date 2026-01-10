# Test marker-pdf direct output
param(
    [string]$PdfPath = "C:\Users\Admin\Desktop\FastGPT\test.pdf"
)

Write-Host "Testing marker-pdf with: $PdfPath" -ForegroundColor Cyan

if (-not (Test-Path $PdfPath)) {
    Write-Host "Error: File not found: $PdfPath" -ForegroundColor Red
    exit 1
}

# Upload to marker-pdf
$form = @{
    file = Get-Item $PdfPath
}

Write-Host "Uploading to marker-pdf..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:7231/v2/parse/file" `
        -Method POST `
        -Form $form `
        -TimeoutSec 300

    # Save markdown output
    $outputFile = "marker-output-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
    $response.data.markdown | Out-File $outputFile -Encoding UTF8

    Write-Host "`nMarker-pdf output saved to: $outputFile" -ForegroundColor Green
    Write-Host "`nFirst 50 lines of output:" -ForegroundColor Cyan
    Get-Content $outputFile -Encoding UTF8 -TotalCount 50

    Write-Host "`n================================" -ForegroundColor Yellow
    Write-Host "Check the file for encoding issues!" -ForegroundColor Yellow
    Write-Host "If you see garbage characters, marker-pdf has encoding problems" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Yellow

} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
