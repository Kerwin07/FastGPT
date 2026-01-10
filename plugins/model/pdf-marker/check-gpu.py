#!/usr/bin/env python
"""Check PyTorch GPU configuration"""

import torch

print("=" * 60)
print("PyTorch GPU Configuration Check")
print("=" * 60)

print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

if torch.cuda.is_available():
    print(f"CUDA version: {torch.version.cuda}")
    print(f"GPU count: {torch.cuda.device_count()}")
    print(f"Current GPU: {torch.cuda.current_device()}")
    print(f"GPU name: {torch.cuda.get_device_name(0)}")
    
    props = torch.cuda.get_device_properties(0)
    print(f"GPU memory: {props.total_memory / 1024**3:.1f} GB")
    print(f"GPU compute capability: {props.major}.{props.minor}")
    
    print("\n" + "=" * 60)
    print("✓ GPU IS READY FOR ACCELERATION!")
    print("=" * 60)
    
    # Test GPU operation
    print("\nTesting GPU operation...")
    x = torch.randn(1000, 1000).cuda()
    y = torch.randn(1000, 1000).cuda()
    z = torch.matmul(x, y)
    print(f"GPU test successful! Result shape: {z.shape}")
    print(f"GPU tensor device: {z.device}")
    
else:
    print("\n" + "=" * 60)
    print("✗ CUDA NOT AVAILABLE")
    print("=" * 60)
    print("\nPossible issues:")
    print("1. PyTorch CPU version installed")
    print("2. NVIDIA driver not installed")
    print("3. CUDA toolkit not installed")
