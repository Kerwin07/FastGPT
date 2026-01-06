# FastGPT + Ollama 快速配置指南

## 当前问题

你添加了Ollama模型到 `Other.json`，但是：
- ❌ 没有配置API地址
- ❌ FastGPT不知道去哪里调用Ollama
- ❌ 如果配置了Ollama地址，OpenAI模型就不能用了

## 解决方案：使用代理服务

我已经创建了 `ollama-proxy.js`，它可以：
- ✅ 自动识别Ollama模型，转发到 `http://localhost:11434/v1`
- ✅ 自动识别OpenAI模型，转发到 `https://api.openai.com/v1`
- ✅ 同时支持OpenAI和Ollama模型

---

## 配置步骤

### 1️⃣ 启动Ollama服务

```powershell
# 确保Ollama正在运行
ollama serve

# 验证服务
curl http://localhost:11434/v1/models
```

### 2️⃣ 启动代理服务

```powershell
# 首次运行会自动安装依赖
.\start-ollama-proxy.ps1

# 或者手动启动
npm install express axios
node .\ollama-proxy.js
```

代理将运行在 `http://localhost:3002`

### 3️⃣ 配置FastGPT环境变量

创建或编辑 `projects/app/.env.local`:

```env
# 使用代理服务地址
OPENAI_BASE_URL=http://localhost:3002/v1

# 你的OpenAI API Key（用于OpenAI模型）
CHAT_API_KEY=sk-your-openai-api-key-here
```

**如果你只使用Ollama本地模型，不需要OpenAI：**
```env
OPENAI_BASE_URL=http://localhost:11434/v1
CHAT_API_KEY=ollama
```

### 4️⃣ 重启FastGPT

```powershell
cd projects/app
pnpm build
pnpm start
```

---

## 使用说明

### 向量模型 nomic-embed-text

1. **在知识库中选择向量模型**
   - 进入知识库设置
   - 向量模型选择："Nomic-Embed (Ollama本地)"
   - 保存

2. **测试向量化**
   ```powershell
   # 直接测试Ollama API
   curl http://localhost:11434/v1/embeddings `
     -H "Content-Type: application/json" `
     -d '{"model":"nomic-embed-text","input":"测试文本"}'
   
   # 通过代理测试
   curl http://localhost:3002/v1/embeddings `
     -H "Content-Type: application/json" `
     -d '{"model":"nomic-embed-text","input":"测试文本"}'
   ```

### LLM对话模型

1. **在应用中选择对话模型**
   - 创建或编辑应用
   - 模型选择："Qwen3 (Ollama本地)" 或其他Ollama模型
   - 保存

2. **测试对话**
   ```powershell
   # 直接测试Ollama API
   curl http://localhost:11434/v1/chat/completions `
     -H "Content-Type: application/json" `
     -d '{"model":"qwen3","messages":[{"role":"user","content":"你好"}]}'
   
   # 通过代理测试
   curl http://localhost:3002/v1/chat/completions `
     -H "Content-Type: application/json" `
     -d '{"model":"qwen3","messages":[{"role":"user","content":"你好"}]}'
   ```

---

## 代理工作原理

```
FastGPT 请求
    ↓
http://localhost:3002/v1/...
    ↓
ollama-proxy.js 判断模型名称
    ↓
┌─────────────────┬─────────────────┐
│  Ollama模型？   │   OpenAI模型？  │
│  (qwen3等)      │   (gpt-4等)     │
└─────────────────┴─────────────────┘
    ↓                    ↓
localhost:11434    api.openai.com
```

**模型路由规则：**
- `qwen3` → Ollama
- `deepseek-r1` → Ollama
- `nomic-embed-text` → Ollama
- `gpt-4` → OpenAI
- `gpt-3.5-turbo` → OpenAI

---

## 验证配置

### 检查代理服务

```powershell
# 健康检查
curl http://localhost:3002/health

# 测试Ollama连接
curl http://localhost:3002/test-ollama
```

### 检查Ollama模型

```powershell
# 查看已安装的模型
ollama list

# 拉取缺失的模型
ollama pull nomic-embed-text
ollama pull qwen3
ollama pull deepseek-r1
```

### 检查FastGPT配置

查看 `projects/app/.env.local`:
```env
OPENAI_BASE_URL=http://localhost:3002/v1  ← 应该指向代理
CHAT_API_KEY=sk-xxx                       ← OpenAI密钥
```

---

## 常见问题

### Q: 为什么选了nomic-embed-text但报错？

**检查清单：**
1. Ollama服务是否运行：`curl http://localhost:11434/v1/models`
2. 模型是否安装：`ollama list | grep nomic`
3. 代理服务是否运行：`curl http://localhost:3002/health`
4. FastGPT环境变量是否正确：查看 `.env.local`

### Q: OpenAI模型还能用吗？

**能用！** 代理会自动识别：
- Ollama模型 → 转发到本地11434端口
- OpenAI模型 → 转发到 api.openai.com
- 需要在 `.env.local` 配置真实的 `CHAT_API_KEY`

### Q: 不想用代理，只用Ollama可以吗？

**可以！** 直接配置：
```env
OPENAI_BASE_URL=http://localhost:11434/v1
CHAT_API_KEY=ollama
```

但这样只能用Ollama模型，OpenAI模型会失败。

### Q: 向量模型的维度是多少？

**nomic-embed-text: 768维**

在FastGPT知识库配置中会自动识别。如果需要验证：
```powershell
curl http://localhost:11434/v1/embeddings `
  -d '{"model":"nomic-embed-text","input":"test"}' | ConvertFrom-Json | Select -ExpandProperty data | Select -ExpandProperty embedding | Measure-Object
```

---

## 推荐配置

**开发环境：**
- 使用 `ollama-proxy.js` 代理
- 同时支持OpenAI和Ollama
- 方便切换和测试

**生产环境：**
- 使用OneAPI（更强大的API管理平台）
- 支持负载均衡、统计、限流等
- GitHub: https://github.com/songquanpeng/one-api

**纯本地部署：**
- 直连Ollama，不用代理
- `OPENAI_BASE_URL=http://localhost:11434/v1`
- 删除OpenAI模型配置

---

## 下一步

1. ✅ 启动代理服务：`.\start-ollama-proxy.ps1`
2. ✅ 配置 `projects/app/.env.local`
3. ✅ 重启FastGPT：`cd projects/app && pnpm start`
4. ✅ 在知识库中测试 nomic-embed-text
5. ✅ 在应用中测试 Ollama LLM模型

有问题随时问！
