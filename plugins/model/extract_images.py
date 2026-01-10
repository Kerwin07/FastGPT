#!/usr/bin/env python
"""
从PDF中提取所有图片
适用于扫描版PDF，可以提取其中的图片/图表
"""

import fitz  # PyMuPDF
import sys
from pathlib import Path
import os

def extract_images_from_pdf(pdf_path, output_dir="extracted_images"):
    """
    从PDF中提取所有图片
    
    Args:
        pdf_path: PDF文件路径
        output_dir: 图片输出目录
    """
    # 创建输出目录
    Path(output_dir).mkdir(exist_ok=True)
    
    print(f"正在处理PDF: {pdf_path}")
    print(f"输出目录: {output_dir}")
    print("-" * 60)
    
    # 打开PDF
    doc = fitz.open(pdf_path)
    total_images = 0
    
    # 遍历所有页
    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images(full=True)
        
        if not image_list:
            continue
        
        print(f"\n页面 {page_num + 1}:")
        print(f"  找到 {len(image_list)} 个图片")
        
        # 提取每个图片
        for img_index, img in enumerate(image_list):
            xref = img[0]
            
            try:
                # 提取图片
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                # 生成文件名
                image_filename = f"page{page_num + 1:03d}_img{img_index + 1:02d}.{image_ext}"
                image_path = os.path.join(output_dir, image_filename)
                
                # 保存图片
                with open(image_path, "wb") as img_file:
                    img_file.write(image_bytes)
                
                # 获取图片尺寸
                width = base_image.get("width", 0)
                height = base_image.get("height", 0)
                size_kb = len(image_bytes) / 1024
                
                print(f"  ✓ {image_filename} ({width}x{height}, {size_kb:.1f} KB)")
                total_images += 1
                
            except Exception as e:
                print(f"  ✗ 图片 {img_index + 1} 提取失败: {e}")
    
    doc.close()
    
    print("\n" + "=" * 60)
    print(f"提取完成!")
    print(f"总共提取: {total_images} 个图片")
    print(f"保存位置: {Path(output_dir).absolute()}")
    print("=" * 60)
    
    # 生成markdown引用
    markdown_file = os.path.join(output_dir, "image_references.md")
    with open(markdown_file, "w", encoding="utf-8") as f:
        f.write("# 图片引用\n\n")
        f.write("将以下内容复制到您的markdown文档中：\n\n")
        f.write("```markdown\n")
        
        current_page = 0
        for filename in sorted(os.listdir(output_dir)):
            if filename.endswith(('.png', '.jpg', '.jpeg')):
                page_num = int(filename.split('_')[0].replace('page', ''))
                if page_num != current_page:
                    f.write(f"\n## Page {page_num}\n\n")
                    current_page = page_num
                f.write(f"![{filename}](extracted_images/{filename})\n\n")
        
        f.write("```\n")
    
    print(f"\nMarkdown引用已生成: {markdown_file}")
    return total_images

if __name__ == "__main__":
    # 查找PDF文件
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
    else:
        # 在Desktop查找PDF
        desktop_path = Path.home() / "Desktop"
        pdf_files = list(desktop_path.glob("*.pdf"))
        
        if not pdf_files:
            print("错误: 未找到PDF文件")
            print("用法: python extract_images.py <pdf文件路径>")
            sys.exit(1)
        
        print("找到的PDF文件:")
        for i, f in enumerate(pdf_files, 1):
            print(f"  {i}. {f.name}")
        
        if len(pdf_files) == 1:
            pdf_file = str(pdf_files[0])
            print(f"\n使用: {pdf_files[0].name}")
        else:
            choice = input("\n请选择 (1-{}): ".format(len(pdf_files)))
            pdf_file = str(pdf_files[int(choice) - 1])
    
    # 检查文件
    if not Path(pdf_file).exists():
        print(f"错误: 文件不存在: {pdf_file}")
        sys.exit(1)
    
    # 提取图片
    try:
        extract_images_from_pdf(pdf_file)
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
