# FastGPT PDF 问题完整解决方案

## 问题总结
1. **Ollama模型频繁阻塞** - qwen3 模型在使用后不自动卸载，导致embedding服务无法响应
2. **PDF内容出现乱码** - 可能是编码问题或chunk大小超限

---

## 解决方案1: Ollama模型管理（防止阻塞）

### 已创建优化启动脚本

使用 `start-ollama-optimized.ps1` 启动Ollama：

```powershell
.\start-ollama-optimized.ps1
```

**配置说明：**
- `OLLAMA_MAX_LOADED_MODELS=1` - 同时只加载1个模型
- `OLLAMA_KEEP_ALIVE=2m` - 2分钟不用后自动卸载
- `OLLAMA_NUM_PARALLEL=1` - 禁用并行请求，避免冲突

### 监控脚本（可选）

如果还是出现阻塞，可以使用监控脚本自动重启：

```powershell
# 创建monitor-ollama.ps1
while ($true) {
    $stuck = ollama ps | Select-String "Stopping..."
    if ($stuck) {
        Write-Host "检测到模型卡住，强制重启..." -ForegroundColor Red
        Get-Process ollama* | Stop-Process -Force
        Start-Sleep -Seconds 3
        Start-Process powershell -ArgumentList "-Command", ".\start-ollama-optimized.ps1" -WindowStyle Hidden
    }
    Start-Sleep -Seconds 300  # 每5分钟检查一次
}
```

---

## 解决方案2: PDF乱码问题诊断

### 可能原因及对策

#### 1. **marker-pdf编码问题**

marker-pdf v0.2 默认输出UTF-8，检查配置：

```bash
docker logs marker-pdf | Select-String -Pattern "encoding|charset" -Last 20
```

#### 2. **chunk大小超限导致截断**

当前问题：bge-m3 context limit = 4096 tokens，某些chunk太大。

**修改FastGPT chunk配置：**

1. 进入FastGPT Web界面 → 知识库 → 设置
2. 将"单段最大长度"从默认值改为 **2000**

或修改[config.json](C:/Users/Admin/Desktop/FastGPT/fastgpt/config.json):
```json
{
  "feConfigs": {
    ...
  },
  "systemEnv": {
    ...
    "chunkSize": 2000,  // 添加这行
    ...
  }
}
```

#### 3. **marker-pdf解析质量检查**

测试marker-pdf是否正常工作：

```powershell
# 准备测试PDF
$testPdf = "C:\path\to\test.pdf"

# 调用marker-pdf API
curl --location --request POST "http://localhost:7231/v2/parse/file" `
  --form "file=@$testPdf" | ConvertFrom-Json | Select-Object -ExpandProperty markdown | Out-File test-output.md -Encoding UTF8

# 检查输出
Get-Content test-output.md -Encoding UTF8 | Select-Object -First 50
```

如果输出看起来正常（中文清晰、格式正确），说明marker-pdf没问题。

#### 4. **MongoDB数据编码问题**

检查已存储的数据：

```javascript
// 连接MongoDB
use fastgpt

// 查看最近插入的数据
db.dataset_datas.find().sort({_id:-1}).limit(1).pretty()

// 检查q字段（问题文本）是否乱码
db.dataset_datas.findOne({}, {q: 1})
```

如果MongoDB里存储的就是乱码，问题在上游（marker-pdf或FastGPT）。
如果MongoDB存储正常但显示乱码，问题在前端。

---

## 解决方案3: FastGPT chunk配置优化

### 修改 chunk 设置避免超限

**文件：** `packages/service/core/dataset/data/controller.ts`

找到chunk生成逻辑，确保每个chunk不超过2000 tokens：

```typescript
// 示例：限制chunk大小
const maxChunkSize = 2000; // 确保不超过embedding模型限制
```

或者在知识库上传时选择：
- **直接分块模式** - 使用较小的chunk
- **QA拆分模式** - 让LLM生成更精炼的问答对

---

## 解决方案4: 完整测试流程

### 步骤1: 重启所有服务

```powershell
# 1. 停止Ollama
Get-Process ollama* | Stop-Process -Force

# 2. 启动优化版Ollama
.\start-ollama-optimized.ps1

# 3. 等待3秒确保启动
Start-Sleep -Seconds 3

# 4. 检查状态
ollama ps
```

### 步骤2: 清理MongoDB旧数据

```javascript
use fastgpt

// 删除之前失败的数据（可选）
db.dataset_datas.deleteMany({
  "a": { $exists: false }  // 删除没有answer字段的数据
})

// 删除失败的training tasks
db.dataset_trainings.deleteMany({
  "retryCount": { $gte: 5 }
})
```

### 步骤3: 测试小文件上传

1. 准备一个 **5-10页的简单PDF** （避免复杂表格/图片）
2. 在FastGPT知识库中上传
3. **勾选"直接分块"** （不要用QA模式，避免触发qwen3）
4. 设置"单段最大长度"为 **1500**

### 步骤4: 监控日志

**终端1：FastGPT日志**
```powershell
cd projects\app
$env:LOG_LEVEL="debug"
pnpm start
```

**终端2：Ollama日志**
```powershell
# 查看当前运行的Ollama终端输出
```

**终端3：MongoDB查询**
```powershell
mongosh "mongodb://myusername:mypassword@localhost:27017/fastgpt?authSource=admin"
# 然后执行
use fastgpt
db.dataset_datas.countDocuments()  # 应该逐渐增加
```

### 步骤5: 验证结果

上传完成后检查：

```javascript
// 查看数据条数
db.dataset_datas.countDocuments()

// 查看第一条数据内容
db.dataset_datas.findOne({}, {q: 1, a: 1})

// 检查是否有乱码
// 如果看到类似 "鏂囨湰" 这种字符，说明编码有问题
```

---

## 排查乱码的具体步骤

### 如果数据库中是乱码：

1. **检查marker-pdf输出**
   ```bash
   curl -X POST "http://localhost:7231/v2/parse/file" \
     -F "file=@test.pdf" \
     -o marker-output.json
   
   # 查看输出编码
   file marker-output.json
   cat marker-output.json | head -50
   ```

2. **检查FastGPT接收到的数据**
   在 `packages/service/common/file/read/utils.ts` 的 `parsePdfFromCustomService` 函数中添加日志：
   ```typescript
   console.log('Marker response sample:', rawText.substring(0, 200));
   ```

3. **检查FastGPT存储时的编码**
   在 `packages/service/core/dataset/data/controller.ts` 中添加日志：
   ```typescript
   console.log('Chunk text before save:', chunks[0].substring(0, 100));
   ```

### 如果数据库正常但前端显示乱码：

1. 检查前端请求的Content-Type
2. 检查API响应的charset
3. 检查浏览器编码设置

---

## 临时workaround（如果乱码无法解决）

### 方案A: 使用系统内置PDF解析

在 `config.json` 中**临时移除** customPdfParse 配置：

```json
{
  "systemEnv": {
    "customPdfParse": {
      "url": "",  // 留空使用内置解析器
      "key": "",
      "doc2xKey": "",
      "price": 0
    }
  }
}
```

重启FastGPT，会使用pdfjs内置解析器（无法识别图片/表格，但至少不会乱码）。

### 方案B: 使用其他PDF解析服务

如果marker-pdf有问题，可以尝试：
- doc2x（商业服务）
- MinerU（开源替代）
- PDF-mistral（基于Mistral OCR）

---

## 最可能的解决方案

根据您的描述"大部分都是乱码"，最可能的问题是：

### **问题根源：marker-pdf v0.2 输出编码**

Docker容器内的marker-pdf可能使用了错误的字符集。

**验证方法：**

```powershell
# 直接测试marker-pdf API
$headers = @{
    "Content-Type" = "multipart/form-data"
}

$form = @{
    file = Get-Item -Path "C:\path\to\test.pdf"
}

$response = Invoke-RestMethod -Uri "http://localhost:7231/v2/parse/file" `
    -Method Post -Form $form

# 输出到文件检查
$response.data.markdown | Out-File -FilePath "test-marker-output.txt" -Encoding UTF8

# 查看是否乱码
Get-Content "test-marker-output.txt" -Encoding UTF8 | Select-Object -First 20
```

如果这里已经是乱码，需要：

1. **重新拉取marker-pdf镜像**
   ```powershell
   docker rm -f marker-pdf
   docker pull crpi-h3snc261q1dosroc.cn-hangzhou.personal.cr.aliyuncs.com/marker11/marker_images:v0.2
   docker run --gpus all -itd -p 7231:7232 --name marker-pdf `
     -e PROCESSES_PER_GPU="2" `
     -e LANG="zh_CN.UTF-8" `
     crpi-h3snc261q1dosroc.cn-hangzhou.personal.cr.aliyuncs.com/marker11/marker_images:v0.2
   ```

2. **或者修改容器内编码**
   ```powershell
   docker exec -it marker-pdf bash
   export LANG=zh_CN.UTF-8
   export LC_ALL=zh_CN.UTF-8
   ```

---

## 下一步操作建议

1. **立即执行：** 使用优化版Ollama脚本
   ```powershell
   Get-Process ollama* | Stop-Process -Force
   .\start-ollama-optimized.ps1
   ```

2. **立即测试：** 验证marker-pdf输出是否乱码
   ```powershell
   # 使用上面的PowerShell命令测试marker-pdf API
   ```

3. **根据测试结果：**
   - 如果marker-pdf输出正常 → 问题在FastGPT存储层，检查MongoDB编码
   - 如果marker-pdf输出乱码 → 重启marker-pdf容器并设置LANG环境变量
   - 如果都正常但前端显示乱码 → 前端编码问题，检查HTTP响应头

4. **完成后测试：**
   - 上传一个小的中文PDF
   - 使用"直接分块"模式
   - 设置chunk大小为1500
   - 检查MongoDB数据是否正常

---

## 需要您提供的信息

为了进一步诊断，请告诉我：

1. **乱码出现在哪里？**
   - [ ] FastGPT前端显示
   - [ ] MongoDB数据库中
   - [ ] marker-pdf直接输出

2. **什么样的乱码？**
   - 中文变成问号 `???`
   - 中文变成方块 `□□□`
   - 中文变成奇怪字符 `鏂囨湰`

3. **测试marker-pdf后的结果？**
   请运行上面的PowerShell测试命令并告诉我输出内容的前几行。
