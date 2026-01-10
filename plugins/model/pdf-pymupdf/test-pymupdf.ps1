#!/usr/bin/env pwsh
# Test PyMuPDF PDF Parser with a sample PDF

param(
    [string]$PdfPath = ""
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "PyMuPDF PDF Parser Test" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Find a PDF file if not specified
if ([string]::IsNullOrEmpty($PdfPath)) {
    Write-Host "`nSearching for test PDF files..." -ForegroundColor Yellow
    
    $searchPaths = @(
        "C:\Users\Admin\Desktop\*.pdf",
        "C:\Users\Admin\Documents\*.pdf",
        "C:\Users\Admin\Downloads\*.pdf"
    )
    
    foreach ($pattern in $searchPaths) {
        $found = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $PdfPath = $found.FullName
            break
        }
    }
}

if ([string]::IsNullOrEmpty($PdfPath) -or !(Test-Path $PdfPath)) {
    Write-Host "Error: No PDF file found or specified" -ForegroundColor Red
    Write-Host "Usage: .\test-pymupdf.ps1 -PdfPath 'path\to\file.pdf'" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nTest PDF: $PdfPath" -ForegroundColor Green
$fileInfo = Get-Item $PdfPath
Write-Host "File size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Cyan

# Test health endpoint
Write-Host "`n1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:7231/health" -Method Get
    Write-Host "   Status: $($health.status)" -ForegroundColor Green
    Write-Host "   Parser: $($health.parser)" -ForegroundColor Green
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Is the service running? Run: .\start.ps1" -ForegroundColor Yellow
    exit 1
}

# Upload and parse PDF
Write-Host "`n2. Uploading and parsing PDF..." -ForegroundColor Yellow
Write-Host "   This should take 10-30 seconds..." -ForegroundColor Cyan

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

try {
    # Create multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $fileBytes = [System.IO.File]::ReadAllBytes($PdfPath)
    $fileName = [System.IO.Path]::GetFileName($PdfPath)
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
        "Content-Type: application/pdf",
        "",
        [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetString($fileBytes),
        "--$boundary--"
    )
    
    $body = $bodyLines -join "`r`n"
    
    $response = Invoke-RestMethod `
        -Uri "http://localhost:7231/v2/parse/file" `
        -Method Post `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body ([System.Text.Encoding]::GetEncoding("ISO-8859-1").GetBytes($body)) `
        -TimeoutSec 300
    
    $stopwatch.Stop()
    
    Write-Host "`n3. Parse Results:" -ForegroundColor Green
    Write-Host "   Time taken: $($stopwatch.Elapsed.TotalSeconds.ToString('F2')) seconds" -ForegroundColor Cyan
    
    if ($response.success) {
        Write-Host "   Success: True" -ForegroundColor Green
    }
    
    if ($response.pages) {
        Write-Host "   Pages: $($response.pages)" -ForegroundColor Cyan
    }
    
    if ($response.markdown) {
        $mdLength = $response.markdown.Length
        Write-Host "   Markdown length: $mdLength characters" -ForegroundColor Cyan
        
        if ($mdLength -gt 0) {
            Write-Host "`n4. Sample output (first 500 chars):" -ForegroundColor Yellow
            Write-Host "   ----------------------------------------" -ForegroundColor Gray
            Write-Host "   $($response.markdown.Substring(0, [Math]::Min(500, $mdLength)))" -ForegroundColor White
            if ($mdLength > 500) {
                Write-Host "   ... ($($mdLength - 500) more characters)" -ForegroundColor Gray
            }
            Write-Host "   ----------------------------------------" -ForegroundColor Gray
            
            # Save to file
            $outputPath = "$PSScriptRoot\test-output.md"
            $response.markdown | Out-File -FilePath $outputPath -Encoding UTF8
            Write-Host "`n5. Full output saved to: $outputPath" -ForegroundColor Green
            
            Write-Host "`n==================================" -ForegroundColor Green
            Write-Host "TEST PASSED! PDF parsed successfully" -ForegroundColor Green
            Write-Host "==================================" -ForegroundColor Green
        } else {
            Write-Host "`nWARNING: Markdown content is empty!" -ForegroundColor Yellow
            Write-Host "This PDF might be:" -ForegroundColor Yellow
            Write-Host "  - A scanned image (requires OCR)" -ForegroundColor Yellow
            Write-Host "  - Corrupted" -ForegroundColor Yellow
            Write-Host "  - Protected/encrypted" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`nERROR: No markdown field in response!" -ForegroundColor Red
        Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Red
    }
    
} catch {
    $stopwatch.Stop()
    Write-Host "`nERROR: Failed to parse PDF" -ForegroundColor Red
    Write-Host "Time before error: $($stopwatch.Elapsed.TotalSeconds.ToString('F2')) seconds" -ForegroundColor Cyan
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        try {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "Details: $($errorDetails.detail)" -ForegroundColor Red
        } catch {
            Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    
    exit 1
}
