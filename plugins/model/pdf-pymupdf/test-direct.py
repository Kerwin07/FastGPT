#!/usr/bin/env python
"""Simple test to check if PyMuPDF can extract text from a PDF"""

import sys
import pymupdf4llm
import pymupdf
from pathlib import Path

def test_pdf(pdf_path):
    """Test PDF extraction"""
    print(f"Testing PDF: {pdf_path}")
    
    # Check if file exists
    if not Path(pdf_path).exists():
        print(f"ERROR: File not found: {pdf_path}")
        return False
    
    # Get file size
    size_mb = Path(pdf_path).stat().st_size / (1024 * 1024)
    print(f"File size: {size_mb:.2f} MB")
    
    # Open with pymupdf to check page count
    print("\n1. Checking page count...")
    try:
        doc = pymupdf.open(pdf_path)
        page_count = len(doc)
        print(f"   Pages: {page_count}")
        
        # Check if pages have text
        first_page = doc[0]
        text = first_page.get_text()
        print(f"   First page text length: {len(text)} chars")
        if len(text) > 0:
            print(f"   Sample: {text[:200]}")
        else:
            print("   WARNING: First page has no extractable text!")
            print("   This might be a scanned PDF that needs OCR")
        
        doc.close()
    except Exception as e:
        print(f"   ERROR: {e}")
        return False
    
    # Extract with pymupdf4llm
    print("\n2. Extracting markdown with PyMuPDF4LLM...")
    try:
        md_text = pymupdf4llm.to_markdown(
            pdf_path,
            page_chunks=False,
            write_images=False,
            show_progress=True
        )
        
        print(f"   Markdown length: {len(md_text)} chars")
        
        if len(md_text) == 0:
            print("   ERROR: Extraction returned empty content!")
            print("   Possible reasons:")
            print("   - PDF is scanned images (needs OCR)")
            print("   - PDF is encrypted/protected")
            print("   - PDF uses non-standard fonts")
            return False
        
        print(f"\n3. Sample output (first 500 chars):")
        print("   " + "-" * 60)
        print("   " + md_text[:500].replace("\n", "\n   "))
        print("   " + "-" * 60)
        
        print("\n SUCCESS: PDF extraction working!")
        return True
        
    except Exception as e:
        print(f"   ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Find a test PDF
    test_paths = [
        r"C:\Users\Admin\Desktop\信号处理与系统分析综合实验教程.pdf",
        r"C:\Users\Admin\Desktop\*.pdf",
    ]
    
    import glob
    pdf_file = None
    
    for pattern in test_paths:
        if "*" in pattern:
            files = glob.glob(pattern)
            if files:
                pdf_file = files[0]
                break
        else:
            if Path(pattern).exists():
                pdf_file = pattern
                break
    
    if not pdf_file:
        print("ERROR: No PDF file found for testing")
        print("Please specify a PDF file:")
        print("  python test-direct.py <path-to-pdf>")
        sys.exit(1)
    
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
    
    print("=" * 70)
    print("PyMuPDF Direct Test")
    print("=" * 70)
    print()
    
    success = test_pdf(pdf_file)
    
    print()
    print("=" * 70)
    if success:
        print("RESULT: PASS ✓")
    else:
        print("RESULT: FAIL ✗")
    print("=" * 70)
    
    sys.exit(0 if success else 1)
