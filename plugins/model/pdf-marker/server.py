#!/usr/bin/env python
"""
Marker PDF Parser Service - FastAPI server for high-accuracy PDF parsing
Supports images, formulas, tables, and Chinese text recognition
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import tempfile
import os
from pathlib import Path
from marker.converters.pdf import PdfConverter
from marker.models import create_model_dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Marker PDF Parser", version="1.0.0")

# Load models on startup
models = None

@app.on_event("startup")
async def startup_event():
    global models
    logger.info("Loading Marker PDF models...")
    try:
        models = create_model_dict()
        logger.info("Models loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        models = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "models_loaded": models is not None}

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
    
    if models is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        tmp_path = tmp_file.name
        content = await file.read()
        tmp_file.write(content)
    
    try:
        logger.info(f"Processing PDF: {file.filename} ({len(content)} bytes)")
        
        # Convert PDF to markdown (使用之前可用的简单配置)
        converter = PdfConverter(
            artifact_dict=models,
            config={
                "output_format": "markdown",
                "languages": ["Chinese", "English"]
            }
        )
        
        rendered = converter(tmp_path)
        
        # Extract markdown text (rendered is already a string in markdown format)
        if isinstance(rendered, str):
            markdown_text = rendered
        else:
            # If it's a FullyRendered object, get the markdown
            markdown_text = str(rendered)
        
        # Get metadata from converter
        page_count = 0
        if hasattr(converter, 'page_count'):
            page_count = converter.page_count
        
        logger.info(f"Successfully parsed {file.filename}: {page_count} pages, {len(markdown_text)} chars")
        
        # Return data in FastGPT compatible format
        return JSONResponse(content={
            "markdown": markdown_text,
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

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "Marker PDF Parser",
        "version": "1.0.0",
        "features": [
            "High-accuracy text extraction",
            "Image and figure recognition",
            "Formula and equation support",
            "Table parsing",
            "Chinese text support",
            "Layout preservation"
        ],
        "endpoints": {
            "parse": "POST /v2/parse/file",
            "health": "GET /health"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=7231,
        log_level="info"
    )
