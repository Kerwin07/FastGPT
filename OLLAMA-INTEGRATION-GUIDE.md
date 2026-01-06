# FastGPT + Ollama 集成指南

## 问题说明

FastGPT的"Other"提供商模型配置只定义了模型列表，但**没有单独的API地址配置**。所有模型都共用 `OPENAI_BASE_URL` 环境变量。

这导致：
- 如果设置 `OPENAI_BASE_URL=http://localhost:11434/v1`，只能用Ollama模型
- 如果设置 `OPENAI_BASE_URL=https://api.openai.com/v1`，只能用OpenAI模型
- **无法同时使用OpenAI和Ollama模型**

---

## 解决方案

### 方案1：使用OneAPI统一管理（推荐✅）

OneAPI是一个API中转服务，可以同时管理多个API提供商。

#### 1. 安装OneAPI

```bash
# Docker方式
docker run -d --name oneapi -p 3001:3000 justsong/one-api:latest

# 或者下载可执行文件
# https://github.com/songquanpeng/one-api/releases
```

#### 2. 配置OneAPI

访问 `http://localhost:3001`，添加渠道：

**渠道1 - OpenAI：**
- 名称：OpenAI
- 类型：OpenAI
- Base URL：`https://api.openai.com/v1`
- 密钥：你的OpenAI API Key
- 模型：gpt-4, gpt-3.5-turbo 等

**渠道2 - Ollama：**
- 名称：Ollama本地
- 类型：OpenAI（兼容）
- Base URL：`http://host.docker.internal:11434/v1`
- 密钥：ollama（随便填）
- 模型：qwen3, deepseek-r1, nomic-embed-text 等

#### 3. 配置FastGPT连接OneAPI

在 `projects/app/.env` 或 `projects/app/.env.local` 添加：

```env
# OneAPI地址（替代OPENAI_BASE_URL）
OPENAI_BASE_URL=http://localhost:3001/v1

# OneAPI的令牌（在OneAPI管理后台创建）
CHAT_API_KEY=sk-your-oneapi-token
```

#### 4. 重启FastGPT

```bash
cd projects/app
pnpm build
pnpm start
```

---

### 方案2：创建Ollama代理服务（简单但功能受限）

如果不想安装OneAPI，可以创建一个简单的代理服务来路由不同的模型请求。

#### 1. 创建ollama-proxy.js

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const OLLAMA_URL = 'http://localhost:11434/v1';
const OPENAI_URL = 'https://api.openai.com/v1';

// Ollama本地模型列表
const OLLAMA_MODELS = [
  'qwen3',
  'deepseek-r1',
  'qwen2.5:32b-instruct-q4_K_M',
  'deepseek-v3.1',
  'qwen3-next',
  'gpt-oss',
  'qwen:7b-chat',
  'nomic-embed-text'
];

// 代理所有请求
app.all('/v1/*', async (req, res) => {
  try {
    const path = req.path.replace('/v1', '');
    const modelName = req.body?.model || '';
    
    // 判断使用哪个后端
    const isOllamaModel = OLLAMA_MODELS.some(m => modelName.includes(m));
    const targetUrl = isOllamaModel ? OLLAMA_URL : OPENAI_URL;
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${path}`);
    console.log(`  Model: ${modelName} -> ${isOllamaModel ? 'Ollama' : 'OpenAI'}`);
    
    // 转发请求
    const response = await axios({
      method: req.method,
      url: `${targetUrl}${path}`,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': isOllamaModel 
          ? 'Bearer ollama' 
          : req.headers.authorization || ''
      },
      responseType: req.body?.stream ? 'stream' : 'json'
    });
    
    // 如果是流式响应
    if (req.body?.stream) {
      res.writeHead(response.status, response.headers);
      response.data.pipe(res);
    } else {
      res.status(response.status).json(response.data);
    }
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: {
        message: error.message,
        type: 'proxy_error'
      }
    });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🚀 Ollama Proxy running on http://localhost:${PORT}`);
  console.log(`   Ollama: ${OLLAMA_URL}`);
  console.log(`   OpenAI: ${OPENAI_URL}`);
});
```

#### 2. 安装依赖并启动

```bash
npm install express axios
node ollama-proxy.js
```

#### 3. 配置FastGPT

```env
OPENAI_BASE_URL=http://localhost:3002/v1
CHAT_API_KEY=sk-your-openai-key
```

---

### 方案3：只使用Ollama本地模型

如果你不需要OpenAI模型，只用Ollama：

#### 1. 配置FastGPT

在 `projects/app/.env.local` 添加：

```env
OPENAI_BASE_URL=http://localhost:11434/v1
CHAT_API_KEY=ollama
```

#### 2. 确保Ollama服务运行

```bash
# 查看Ollama服务状态
ollama list

# 测试API
curl http://localhost:11434/v1/models
```

#### 3. 删除OpenAI模型配置

修改 `projects/app/data/model.json`，删除所有OpenAI模型，只保留Other配置。

---

## 模型使用说明

### 向量模型 nomic-embed-text

配置完成后，在FastGPT中：

1. **知识库 → 向量模型选择**
   - 选择 "Nomic-Embed (Ollama本地)"
   - 自动调用 `http://localhost:11434/v1/embeddings`

2. **API调用格式**
   ```bash
   curl http://localhost:11434/v1/embeddings \
     -H "Content-Type: application/json" \
     -d '{
       "model": "nomic-embed-text",
       "input": "你好世界"
     }'
   ```

3. **验证向量模型**
   ```bash
   # 确保Ollama已加载模型
   ollama list | grep nomic-embed-text
   
   # 如果没有，先拉取
   ollama pull nomic-embed-text
   ```

### LLM对话模型

配置完成后，在FastGPT中：

1. **应用 → 模型选择**
   - 选择 "Qwen3 (Ollama本地)" 等
   - 自动调用 `http://localhost:11434/v1/chat/completions`

2. **API调用格式**
   ```bash
   curl http://localhost:11434/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{
       "model": "qwen3",
       "messages": [
         {"role": "user", "content": "你好"}
       ]
     }'
   ```

---

## 常见问题

### Q1: 为什么选了Ollama模型但是报错？

**原因：** `OPENAI_BASE_URL` 没有正确配置，或者Ollama服务没运行。

**解决：**
```bash
# 1. 检查Ollama服务
curl http://localhost:11434/v1/models

# 2. 检查FastGPT环境变量
# projects/app/.env.local
OPENAI_BASE_URL=http://localhost:11434/v1

# 3. 重启FastGPT
cd projects/app && pnpm start
```

### Q2: 想同时使用OpenAI和Ollama怎么办？

**必须使用OneAPI或ollama-proxy代理服务。** FastGPT本身不支持多API地址。

### Q3: nomic-embed-text模型不工作？

**检查步骤：**
```bash
# 1. 确认模型已安装
ollama list

# 2. 手动测试embedding接口
curl http://localhost:11434/v1/embeddings \
  -d '{"model":"nomic-embed-text","input":"test"}'

# 3. 查看FastGPT日志
# 看是否有API调用错误
```

### Q4: 端口11434被占用？

Ollama默认使用11434端口，如需更改：

```bash
# 设置环境变量
export OLLAMA_HOST=0.0.0.0:11435

# 或在启动时指定
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

对应修改 `OPENAI_BASE_URL=http://localhost:11435/v1`

---

## 推荐配置

**生产环境：** 使用OneAPI（方案1）
- ✅ 统一管理所有API
- ✅ 支持负载均衡
- ✅ 详细的调用统计
- ✅ Web管理界面

**开发/测试：** 直连Ollama（方案3）
- ✅ 配置简单
- ✅ 本地调试方便
- ❌ 只能使用Ollama模型

**临时方案：** ollama-proxy（方案2）
- ✅ 快速实现双API支持
- ❌ 功能有限，不适合生产环境
