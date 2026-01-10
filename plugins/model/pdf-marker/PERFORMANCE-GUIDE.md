# Marker PDF 性能说明与优化建议

## 当前性能表现

测试文档：信号处理与系统分析综合实验教程.pdf（36MB，205页）

处理时间明细：
- 布局识别（Layout Recognition）：34分14秒（205页，每页10秒）
- OCR错误检测：<1秒（52个区域）
- 文本框检测：3分29秒（52个区域，每区域4秒）
- 文本识别（主要）：1小时21分08秒（3461个文本块，每块1.4秒）
- 文本识别（次要）：9分54秒（263个文本块，每块2.3秒）
- 表格识别：36秒（7个表格，每表格5.3秒）
- 图片文字检测：42秒（10个图片区域，每区域4.2秒）
- 图片文字识别：25分35秒（835个文本块，每块1.8秒）

**总处理时间：约2小时**

## 性能瓶颈分析

### 1. CPU密集型操作
- 文本识别是主要瓶颈（占用约80%时间）
- OCR模型推理需要大量CPU计算
- 单线程处理，未使用GPU加速

### 2. 模型大小
下载的模型总计约2.2GB：
- Layout模型：1.35GB（布局识别）
- Text Recognition模型：1.34GB（文字识别）
- Table Recognition模型：201MB（表格识别）
- Text Detection模型：73.4MB（文字检测）
- OCR Error Detection模型：258MB（错误检测）

### 3. 处理流程
对205页文档：
- 识别了3461+263+835=4559个文本块
- 处理了7个表格
- 处理了10个图片区域
- 每个文本块平均需要1.5-2秒

## 为什么这么慢？

### 原因1：高精度要求
Marker-pdf使用了业界最先进的OCR模型（surya-ocr），提供：
- ✅ 准确的中文识别
- ✅ 公式/图表理解
- ✅ 布局保持
- ✅ 表格结构识别

代价是处理速度慢。

### 原因2：CPU处理
- 没有使用GPU加速
- Python单线程处理
- 每个文本块都需要深度学习模型推理

### 原因3：文档复杂度
您的文档包含：
- 205页内容
- 大量数学公式
- 多个表格和图表
- 中英文混排

## 解决方案

### 已实施的修复

#### 1. 修复JSON序列化错误 ✅
**问题**：`Object of type Image is not JSON serializable`

**原因**：返回的`rendered`对象包含Python Image对象，无法转为JSON

**修复**：只返回可序列化的数据（文本、数字、计数）

```python
# 修复前（会报错）
return JSONResponse(content={
    "markdown": rendered.markdown,  # 可能包含Image对象
    "images": rendered.images  # Image对象列表
})

# 修复后（正常工作）
return JSONResponse(content={
    "markdown": markdown_text,  # 纯文本
    "images": image_count,  # 只返回数量
    "metadata": {
        "pages": page_count
    }
})
```

#### 2. 增加超时时间 ✅
**问题**：FastGPT默认15分钟超时，大文档需要2小时

**修复**：将超时增加到4小时（14400000ms）

修改的文件：
- `packages/service/common/file/read/utils.ts`：PDF解析API超时
- `projects/app/src/web/core/dataset/api.ts`：前端上传超时

```typescript
// 修改前
timeout: 900000  // 15分钟

// 修改后
timeout: 14400000  // 4小时
```

### 性能优化建议

#### 选项1：使用GPU加速（推荐）⚡
如果有NVIDIA显卡：

1. 安装CUDA和PyTorch GPU版本：
```powershell
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

2. Marker会自动使用GPU，速度提升3-10倍

**预期效果**：2小时 → 15-40分钟

#### 选项2：降低精度换取速度
修改`server.py`配置：

```python
config = {
    "output_format": "markdown",
    "languages": ["Chinese", "English"],
    "disable_image_extraction": True,  # 禁用图片提取
    "disable_ocr": False,  # 保持OCR
    "page_range": [0, 50]  # 只处理前50页
}
```

**预期效果**：2小时 → 30-60分钟（部分功能受限）

#### 选项3：分页处理
将大文档拆分成多个小文档上传：
- 每次上传20-30页
- 处理时间：每批5-10分钟
- 手动合并结果

**预期效果**：不改变总时间，但避免单次超时

#### 选项4：使用其他PDF解析器
如果不需要这么高的精度：

| 解析器 | 速度 | 精度 | 图片 | 公式 | 中文 |
|--------|------|------|------|------|------|
| marker-pdf | 慢 ⭐ | 高 ⭐⭐⭐⭐⭐ | ✅ | ✅ | ✅ |
| pdf-mineru | 快 ⭐⭐⭐ | 中 ⭐⭐⭐ | ✅ | ⚠️ | ✅ |
| pymupdf | 很快 ⭐⭐⭐⭐⭐ | 低 ⭐⭐ | ⚠️ | ❌ | ⚠️ |

### 推荐方案

**对于您的需求（高精度 + 图片 + 公式 + 中文）：**

1. **短期**：使用当前配置（已修复错误和超时）
   - 现在服务可以正常工作
   - 大文档需要等待2-4小时
   - 适合离线批量处理

2. **长期**：安装GPU加速
   - 速度提升3-10倍
   - 保持相同的高精度
   - 大文档处理降到15-40分钟

## 重新启动FastGPT使配置生效

修改了超时配置后，需要重启FastGPT：

```powershell
# 停止当前服务
cd C:\Users\Admin\Desktop\FastGPT\projects\app
# 按 Ctrl+C 停止 pnpm dev

# 重新构建（如果需要）
pnpm build

# 启动
pnpm dev
```

## 测试建议

1. **小文档测试**（5-10页）：
   - 处理时间：约5-10分钟
   - 验证功能正常

2. **中等文档测试**（30-50页）：
   - 处理时间：约30-60分钟
   - 验证超时配置生效

3. **大文档处理**（200页+）：
   - 处理时间：2-4小时
   - 建议使用GPU或分页处理

## 监控处理进度

服务会输出详细进度：
```
Recognizing Layout: 100%|████| 205/205 [34:14<00:00, 10.02s/it]
Recognizing Text: 100%|█████| 3461/3461 [1:21:08<00:00, 1.41s/it]
```

您可以看到：
- 当前处理到哪一页/哪个文本块
- 剩余时间估算
- 处理速度（秒/项）

## 当前服务状态

✅ **已修复**：
1. JSON序列化错误
2. 超时设置（15分钟 → 4小时）

✅ **服务正常运行**：
- 地址：http://localhost:7231
- 端点：POST /v2/parse/file
- 健康检查：GET /health

⚠️ **性能特点**：
- 高精度OCR需要较长处理时间
- 205页文档约需2小时
- CPU处理，未使用GPU加速

## 下一步

1. **重启FastGPT前端**（使超时配置生效）
2. **重新上传PDF测试**（应该不会超时了）
3. **考虑安装GPU支持**（大幅提速）

需要帮助安装GPU加速或配置其他优化吗？
