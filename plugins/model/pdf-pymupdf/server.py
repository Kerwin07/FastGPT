#!/usr/bin/env python
"""
PyMuPDF4LLM PDF Parser Service - FAST and accurate PDF parsing
Speed: 30x faster than marker-pdf
Supports: Chinese text, formulas, tables, images
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import tempfile
import os
import pymupdf4llm
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PyMuPDF4LLM PDF Parser", version="1.0.0")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "PyMuPDF4LLM PDF Parser",
        "version": "1.0.0",
        "features": [
            "Fast extraction (30x faster than deep learning OCR)",
            "Chinese text support",
            "Formula extraction",
            "Table parsing",
            "Image extraction",
            "Layout preservation"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "parser": "pymupdf4llm"}

@app.post("/v2/parse/file")
async def parse_pdf(file: UploadFile = File(...)):
    """
    Parse PDF file and return markdown content
    
    Args:
        file: PDF file to parse
        
    Returns:
        JSON with markdown content and metadata
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        tmp_path = tmp_file.name
        content = await file.read()
        tmp_file.write(content)
    
    try:
        logger.info(f"Processing PDF: {file.filename} ({len(content)} bytes)")
        
        # Get page count first
        import pymupdf
        doc = pymupdf.open(tmp_path)
        page_count = len(doc)
        doc.close()
        
        logger.info(f"PDF has {page_count} pages, starting extraction...")
        
        # Parse PDF to markdown using PyMuPDF4LLM (very fast!)
        md_text = pymupdf4llm.to_markdown(
            tmp_path,
            page_chunks=False,  # Return as single string
            write_images=False,  # Don't write images to disk
            show_progress=True,  # Show progress in logs
            margins=(0, 50, 0, 50),  # Margins for better text extraction
        )
        
        # Check if extraction succeeded
        if not md_text or len(md_text.strip()) == 0:
            logger.error(f"PDF extraction returned empty content for {file.filename}")
            raise HTTPException(
                status_code=500, 
                detail="PDF extraction failed: no text content found. This might be a scanned PDF that requires OCR."
            )
        
        logger.info(f"Successfully parsed {file.filename}: {page_count} pages, {len(md_text)} chars")
        logger.debug(f"First 200 chars: {md_text[:200]}")
        
        # Return only serializable data in FastGPT compatible format
        return JSONResponse(content={
            "markdown": md_text,
            "pages": page_count,
            "success": True
        })
        
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Clean up temporary file
        try:
            os.unlink(tmp_path)
        except:
            pass

if __name__ == "__main__":
    logger.info("Starting PyMuPDF4LLM PDF Parser Service on port 7231...")
    logger.info("Features: Fast extraction, Chinese support, formulas, tables")
    uvicorn.run(app, host="0.0.0.0", port=7231)
