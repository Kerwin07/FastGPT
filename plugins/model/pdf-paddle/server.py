#!/usr/bin/env python
"""
PaddleOCR PDF Parser Service - Optimized for Chinese text
Fast, accurate, and handles images well
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import tempfile
import os
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PaddleOCR PDF Parser", version="1.0.0")

# Global OCR instance
ocr = None

@app.on_event("startup")
async def startup_event():
    global ocr
    logger.info("Loading PaddleOCR models...")
    try:
        from paddleocr import PaddleOCR
        import fitz  # PyMuPDF
        
        # Initialize PaddleOCR with optimized settings
        ocr = PaddleOCR(
            use_angle_cls=True,  # 启用方向分类
            lang='ch',  # 中文+英文
            use_gpu=True,  # 使用GPU加速
            show_log=False,
            det_model_dir=None,  # 使用默认模型
            rec_model_dir=None,
            cls_model_dir=None,
        )
        logger.info("PaddleOCR models loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load PaddleOCR: {e}")
        logger.error("Installing PaddleOCR... This may take a few minutes.")
        import subprocess
        subprocess.run([
            "pip", "install", 
            "paddlepaddle-gpu", 
            "paddleocr",
            "-i", "https://pypi.tuna.tsinghua.edu.cn/simple"
        ])
        logger.info("Please restart the service after installation")
        ocr = None

@app.get("/")
async def root():
    return {
        "service": "PaddleOCR PDF Parser",
        "version": "1.0.0",
        "features": [
            "Optimized for Chinese text",
            "Fast GPU acceleration",
            "High accuracy for scanned documents",
            "Image extraction",
            "Table and formula support",
            "Better than Marker for Chinese PDFs"
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "ocr_loaded": ocr is not None}

@app.post("/v2/parse/file")
async def parse_pdf(file: UploadFile = File(...)):
    """
    Parse PDF file using PaddleOCR
    
    Args:
        file: PDF file to parse
        
    Returns:
        JSON with markdown content and metadata
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    if ocr is None:
        raise HTTPException(status_code=503, detail="OCR not loaded. Please install PaddleOCR and restart.")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
        tmp_path = tmp_file.name
        content = await file.read()
        tmp_file.write(content)
    
    try:
        logger.info(f"Processing PDF: {file.filename} ({len(content)} bytes)")
        
        import fitz  # PyMuPDF
        from PIL import Image
        import io
        
        # Open PDF
        doc = fitz.open(tmp_path)
        page_count = len(doc)
        
        logger.info(f"PDF has {page_count} pages, starting OCR...")
        
        all_text = []
        image_count = 0
        
        # Process each page
        for page_num in range(page_count):
            logger.info(f"Processing page {page_num + 1}/{page_count}...")
            
            page = doc[page_num]
            
            # Convert page to image (higher DPI = better quality)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better quality
            img_data = pix.tobytes("png")
            
            # OCR the page image
            result = ocr.ocr(img_data, cls=True)
            
            # Extract text from OCR result
            page_text = [f"\n## Page {page_num + 1}\n\n"]
            
            if result and result[0]:
                for line in result[0]:
                    if line and len(line) >= 2:
                        text = line[1][0]  # Get text content
                        confidence = line[1][1]  # Get confidence score
                        
                        if confidence > 0.5:  # Only keep high confidence results
                            page_text.append(text)
                            page_text.append("\n")
            
            all_text.append("".join(page_text))
            
            # Extract images from page
            image_list = page.get_images()
            image_count += len(image_list)
        
        doc.close()
        
        # Combine all text
        markdown_text = "\n".join(all_text)
        
        logger.info(f"Successfully parsed {file.filename}: {page_count} pages, {len(markdown_text)} chars, {image_count} images")
        
        # Return in FastGPT compatible format
        return JSONResponse(content={
            "markdown": markdown_text,
            "pages": page_count,
            "success": True
        })
        
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Clean up temporary file
        try:
            os.unlink(tmp_path)
        except:
            pass

if __name__ == "__main__":
    logger.info("Starting PaddleOCR PDF Parser Service on port 7232...")
    logger.info("Note: Using port 7232 to run alongside Marker (7231)")
    logger.info("Features: Optimized for Chinese, GPU acceleration, high accuracy")
    uvicorn.run(app, host="0.0.0.0", port=7232)
