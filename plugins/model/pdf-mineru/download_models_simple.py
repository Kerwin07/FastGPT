#!/usr/bin/env python3
"""Download PDF-Extract-Kit models"""
import os
from pathlib import Path

try:
    from modelscope import snapshot_download
    
    # 设置模型目录
    models_dir = Path.home() / '.cache' / 'mineru'
    models_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Downloading models to: {models_dir}")
    print("This may take 10-30 minutes depending on your network speed...")
    
    # 下载模型
    model_path = snapshot_download(
        'opendatalab/PDF-Extract-Kit-1.0',
        local_dir=str(models_dir),
        revision='master'
    )
    
    print(f"\nModels downloaded successfully to: {model_path}")
    
    # 检查关键文件
    yolo_model = models_dir / 'MFD' / 'YOLO' / 'yolo_v8_ft.pt'
    if yolo_model.exists():
        print(f"✓ YOLO model found: {yolo_model}")
    else:
        print(f"✗ YOLO model NOT found at: {yolo_model}")
    
except ImportError:
    print("Error: modelscope not installed. Please run:")
    print("  pip install modelscope")
    exit(1)
except Exception as e:
    print(f"Error downloading models: {e}")
    exit(1)
