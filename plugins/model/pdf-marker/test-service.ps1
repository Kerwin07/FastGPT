#!/usr/bin/env pwsh
# Test Marker PDF Service

Write-Host "Testing Marker PDF Service..." -ForegroundColor Cyan

# Test health check
Write-Host "`nTesting health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:7231/health" -Method Get -ErrorAction Stop
    Write-Host "Health check successful!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Is the service running? Check with: Get-Process python" -ForegroundColor Yellow
    exit 1
}

# Find a sample PDF for testing
Write-Host "`nLooking for PDF files to test..." -ForegroundColor Yellow
$pdfFiles = Get-ChildItem -Path "C:\Users\Admin\Desktop" -Filter "*.pdf" -File | Select-Object -First 1

if ($pdfFiles) {
    $testPdf = $pdfFiles.FullName
    Write-Host "Found test PDF: $testPdf" -ForegroundColor Cyan
    
    Write-Host "`nUploading PDF for parsing (this may take a while)..." -ForegroundColor Yellow
    try {
        $form = @{
            file = Get-Item -Path $testPdf
        }
        
        $response = Invoke-RestMethod -Uri "http://localhost:7231/v2/parse/file" -Method Post -Form $form -TimeoutSec 300
        
        Write-Host "`nParsing successful!" -ForegroundColor Green
        Write-Host "Markdown length: $($response.markdown.Length) characters" -ForegroundColor Cyan
        Write-Host "Images found: $($response.images)" -ForegroundColor Cyan
        
        # Save markdown output
        $outputPath = "C:\Users\Admin\Desktop\FastGPT\plugins\model\pdf-marker\test-output.md"
        $response.markdown | Out-File -FilePath $outputPath -Encoding UTF8
        Write-Host "`nMarkdown saved to: $outputPath" -ForegroundColor Green
        
    } catch {
        Write-Host "PDF parsing failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "No PDF files found in Desktop. Skipping parse test." -ForegroundColor Yellow
}

Write-Host "`nAll tests completed!" -ForegroundColor Green
