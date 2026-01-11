# 解决 FastGPT 402 错误（Embedding 向量化失败）

## 🔴 错误原因

**402 status code (no body)** = **API2D 账户余额不足或 API Key 失效**

你的知识库检索时需要将用户问题转换成向量（embedding），调用的是：
- **API2D 代理服务**：`https://oa.api2d.net/v1`
- **API Key**：`fk234054-0hQ880DLf9qmjYER6NJq9FuJEhXDegQJ`

这个 API Key 可能：
1. ❌ 余额不足（已欠费）
2. ❌ 已失效或过期
3. ❌ 达到速率限制

---

## ✅ 立即解决方案（切换到免费 Ollama Embedding）

### 步骤 1：启动 Ollama 服务（如果未运行）

```powershell
# 检查 Ollama 是否运行
ollama list

# 如果未运行，启动 Ollama
# （通常在 Windows 上 Ollama 会自动启动）
```

### 步骤 2：拉取 nomic-embed-text 向量模型

```powershell
# 拉取模型（约 275MB）
ollama pull nomic-embed-text

# 验证安装
ollama list
```

你应该看到：
```
NAME                    ID              SIZE
nomic-embed-text:latest abc123          274MB
```

### 步骤 3：启动 ollama-proxy 代理服务

你已经有 `ollama-proxy.js` 文件了，检查它是否配置了 nomic-embed-text：

```powershell
# 查看代理配置
cat ollama-proxy.js | Select-String -Pattern "nomic-embed-text"
```

应该看到：
```javascript
const OLLAMA_MODELS = [
  'qwen3',
  'deepseek-r1',
  'nomic-embed-text'  // ← 确认这一行存在
];
```

**启动代理：**

```powershell
# 进入 FastGPT 目录
cd C:\Users\Admin\Desktop\FastGPT

# 启动代理（保持运行）
node ollama-proxy.js
```

你应该看到：
```
Ollama-OpenAI 代理服务启动在 http://localhost:3002
```

### 步骤 4：修改 FastGPT 环境变量

编辑 `projects/app/.env.local`：

```env
# OpenAI - 使用本地 Ollama 代理（免费）
OPENAI_BASE_URL=http://localhost:3002/v1
OPENAI_API_KEY=ollama
CHAT_API_KEY=ollama
```

**保存后重启 FastGPT：**

```powershell
# 停止 FastGPT
Ctrl+C

# 重新启动
cd C:\Users\Admin\Desktop\FastGPT\projects\app
pnpm dev
```

### 步骤 5：在知识库中选择 nomic-embed-text

**方法 A：Web 界面修改（推荐）**

1. 打开 FastGPT：`http://10.14.53.120:3000`
2. 进入【知识库】
3. 点击你的知识库 → 【设置】
4. 找到"向量模型"下拉菜单
5. 选择 **"Nomic-Embed (Ollama本地)"** 或 **"nomic-embed-text"**
6. 保存

⚠️ **注意**：如果知识库已有数据，修改向量模型需要重建索引（会重新向量化所有数据）

**方法 B：临时测试（不修改知识库）**

如果只是临时解决，可以让 ollama-proxy 自动路由 text-embedding 请求到 nomic-embed-text。

编辑 `ollama-proxy.js`，添加模型映射：

```javascript
// 模型映射：将 OpenAI embedding 模型映射到 Ollama
const MODEL_MAPPING = {
  'text-embedding-ada-002': 'nomic-embed-text',
  'text-embedding-3-small': 'nomic-embed-text',
  'text-embedding-3-large': 'nomic-embed-text'
};

// 在请求处理中添加
app.all('/v1/*', async (req, res) => {
  let modelName = req.body.model;
  
  // 映射 embedding 模型
  if (MODEL_MAPPING[modelName]) {
    modelName = MODEL_MAPPING[modelName];
    req.body.model = modelName;
  }
  
  // ... 后续代码
});
```

---

## 🔧 完整配置检查清单

### 1. Ollama 服务运行
```powershell
curl http://localhost:11434/v1/models
```
✅ 应该返回模型列表

### 2. nomic-embed-text 已安装
```powershell
ollama list | grep nomic
```
✅ 应该看到 `nomic-embed-text`

### 3. ollama-proxy 运行
```powershell
curl http://localhost:3002/health
```
✅ 应该返回 OK 或 200 状态

### 4. 环境变量正确
检查 `projects/app/.env.local`：
```env
OPENAI_BASE_URL=http://localhost:3002/v1
OPENAI_API_KEY=ollama
```

### 5. 测试 embedding API
```powershell
curl http://localhost:3002/v1/embeddings `
  -H "Content-Type: application/json" `
  -d '{"model":"nomic-embed-text","input":"测试文本"}'
```
✅ 应该返回向量数组

---

## 🎯 快速验证（三步走）

### 第 1 步：确认 Ollama 和代理运行

**终端 1（启动 Ollama - 如果未运行）：**
```powershell
# Ollama 通常自动启动，检查即可
ollama list
```

**终端 2（启动代理）：**
```powershell
cd C:\Users\Admin\Desktop\FastGPT
node ollama-proxy.js
```

### 第 2 步：修改环境变量

编辑 `projects/app/.env.local`：
```env
OPENAI_BASE_URL=http://localhost:3002/v1
OPENAI_API_KEY=ollama
```

### 第 3 步：重启 FastGPT

**终端 3：**
```powershell
cd C:\Users\Admin\Desktop\FastGPT\projects\app
pnpm dev
```

### 测试

在 FastGPT 中问任何问题，知识库检索应该正常工作了！

---

## 🆚 方案对比

| 方案 | 优点 | 缺点 | 费用 |
|-----|------|------|------|
| **API2D（当前）** | 云端，无需本地算力 | ❌ 需要付费，余额用完就挂 | 💰 付费 |
| **Ollama nomic-embed-text** | ✅ 完全免费，本地运行 | 需要本地算力（但很小） | 🆓 免费 |
| **自建 BGE 模型** | 支持中文更好 | 配置复杂 | 🆓 免费 |

**推荐：Ollama nomic-embed-text**（免费 + 简单）

---

## ❓ 常见问题

### Q1: 我想同时使用 Ollama 和 OpenAI 怎么办？

**A:** 使用 ollama-proxy 代理！它会自动识别模型：
- `nomic-embed-text` → Ollama（本地免费）
- `text-embedding-ada-002` → OpenAI（需要真实 API Key）

配置：
```env
OPENAI_BASE_URL=http://localhost:3002/v1
OPENAI_API_KEY=你的真实OpenAI_Key
```

代理会根据模型名称自动路由。

### Q2: nomic-embed-text 向量维度是多少？

**A:** 768 维

与 OpenAI 的 `text-embedding-ada-002`（1536维）不同，但对检索效果影响不大。

### Q3: 需要重建知识库索引吗？

**A:** 如果切换向量模型（如从 ada-002 → nomic-embed-text），**需要重建索引**。

FastGPT 会提示你：
```
向量模型已更改，需要重新训练知识库数据
```

点击"重新训练"即可（会消耗算力重新向量化所有文档）。

### Q4: ollama-proxy 必须一直运行吗？

**A:** 是的！它是 FastGPT 和 Ollama 之间的桥梁。

**推荐做法：**
1. 开发环境：手动启动 `node ollama-proxy.js`
2. 生产环境：使用 PM2 或 Docker 保持运行

**PM2 方式：**
```powershell
npm install -g pm2
pm2 start ollama-proxy.js --name "ollama-proxy"
pm2 save
pm2 startup
```

### Q5: API2D 还想保留怎么办？

**A:** 充值 API2D 账户：

1. 访问 https://api2d.com
2. 登录你的账户
3. 充值余额
4. 恢复原来的配置：
   ```env
   OPENAI_BASE_URL=https://oa.api2d.net/v1
   OPENAI_API_KEY=fk234054-0hQ880DLf9qmjYER6NJq9FuJEhXDegQJ
   ```

---

## 📊 性能对比

| 模型 | 维度 | 速度 | 中文支持 | 成本 |
|-----|------|------|----------|------|
| text-embedding-ada-002 | 1536 | 快（云端） | 中 | 付费 |
| text-embedding-3-small | 1536 | 快（云端） | 好 | 付费 |
| nomic-embed-text | 768 | 中等（本地） | 中 | 免费 |
| bge-base-zh-v1.5 | 768 | 慢（本地） | 优秀 | 免费 |

**对于中文知识库，建议：**
1. 简单场景：nomic-embed-text（免费够用）
2. 专业场景：bge-base-zh-v1.5（中文最佳）
3. 云端场景：text-embedding-3-small（付费快速）

---

## 🚀 总结

**最简单的解决方案（5分钟搞定）：**

1. 拉取模型：`ollama pull nomic-embed-text`
2. 启动代理：`node ollama-proxy.js`
3. 改环境变量：`OPENAI_BASE_URL=http://localhost:3002/v1`
4. 重启 FastGPT：`pnpm dev`
5. 测试知识库检索 ✅

**不需要修改任何代码，不需要重建知识库（如果用代理模型映射）！**
