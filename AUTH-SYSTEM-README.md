# FastGPT 认证系统使用指南

## 📋 系统架构

```
┌─────────────────┐
│  用户浏览器      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  🛡️  认证代理服务器 (ultra-simple-proxy.js)  │
│  端口: 3004                                  │
│  作用: 拦截分享链接，检查登录状态            │
└────────┬──────────────────────┬─────────────┘
         │                      │
         ▼                      ▼
┌────────────────┐    ┌────────────────────┐
│ 💬 FastGPT     │    │ 🖥️  管理前端        │
│ 端口: 3000     │    │ (fastgpt-admin)   │
│                │    │ 端口: 5173         │
└────────────────┘    └─────────┬──────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │ 🔑 认证API      │
                      │ (simple-server) │
                      │ 端口: 3003      │
                      └────────┬────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │ 🔐 Spring Boot   │
                      │ 后端API          │
                      │ 端口: 8080       │
                      └──────────────────┘
```

## 🚀 快速启动

### 方式一：一键启动（推荐）

在 FastGPT 根目录下运行：

```powershell
.\start-integrated-system.ps1
```

这会依次启动所有服务：
1. Spring Boot 后端 (8080)
2. 认证API服务器 (3003)
3. 认证代理服务器 (3004)
4. 管理前端 (5173)
5. FastGPT 主服务 (3000)

### 方式二：手动启动

#### 1. 启动 Spring Boot 后端
```powershell
cd fastgpt-backend
mvn spring-boot:run
```

#### 2. 启动认证API服务器
```powershell
cd auth-system
node simple-server.js
```

#### 3. 启动认证代理服务器
```powershell
cd auth-system
node ultra-simple-proxy.js
```

#### 4. 启动管理前端
```powershell
cd fastgpt-admin
pnpm dev
```

#### 5. 启动 FastGPT
```powershell
cd projects/app
pnpm dev
```

## 📝 使用流程

### 步骤 1: 创建 FastGPT 应用
1. 访问 http://localhost:3000
2. 登录并创建一个应用
3. 配置应用功能和知识库
4. 点击"分享"按钮，生成分享链接

### 步骤 2: 获取分享链接
FastGPT 生成的原始分享链接格式：
```
http://localhost:3000/chat/share/xxx-xxx-xxx
```

### 步骤 3: 修改分享链接
将端口从 `3000` 改为 `3004`（认证代理端口）：
```
原始链接: http://localhost:3000/chat/share/xxx-xxx-xxx
修改后:   http://localhost:3004/chat/share/xxx-xxx-xxx
```

### 步骤 4: 访问受保护的分享链接
1. 复制修改后的链接
2. 在浏览器中访问
3. 如果未登录，会自动跳转到登录页面（http://localhost:5173）
4. 注册新账号或使用已有账号登录
5. 登录成功后，会自动跳转回原始分享链接
6. 现在可以正常使用分享的对话功能

## 🔐 认证流程说明

```
用户访问分享链接
     ↓
认证代理拦截请求
     ↓
检查是否有 token
     ↓
   没有 token ────→ 重定向到登录页 ────→ 用户登录 ────→ 获取 token
     ↓                                                      ↓
   有 token                                                 │
     ↓                                                      │
验证 token 有效性 ←───────────────────────────────────────┘
     ↓
  有效 ────→ 转发到 FastGPT ────→ 显示对话页面
     ↓
  无效 ────→ 重定向到登录页
```

## 🌐 外网访问配置

如果需要从外网访问，修改以下配置：

### 1. ultra-simple-proxy.js
```javascript
const SERVER_IP = '你的服务器外网IP';  // 例如: '10.14.53.120'
```

### 2. 访问地址
```
管理前端: http://你的IP:5173
认证代理: http://你的IP:3004
FastGPT:  http://你的IP:3000
```

### 3. 分享链接格式
```
http://你的IP:3004/chat/share/xxx-xxx-xxx
```

## 🔧 配置说明

### simple-server.js（认证API服务器）
- **端口**: 3003
- **功能**: 
  - 处理用户注册、登录
  - 验证 token
  - 转发所有请求到 Spring Boot 后端
- **API接口**:
  - `POST /api/user/register` - 用户注册
  - `POST /api/user/login` - 用户登录
  - `POST /api/user/verify` - Token验证
  - `GET /api/users` - 获取用户列表
  - `POST /api/chat/log` - 记录聊天
  - `GET /api/chat/logs` - 查询聊天记录

### ultra-simple-proxy.js（认证代理服务器）
- **端口**: 3004
- **功能**:
  - 拦截所有 `/chat/share` 分享链接
  - 检查用户是否已登录（token验证）
  - 未登录用户重定向到登录页
  - 已登录用户转发到 FastGPT
- **保护范围**: 只保护分享链接，其他请求直接转发

### fastgpt-admin（管理前端）
- **端口**: 5173
- **技术栈**: React + Vite + TypeScript
- **功能**:
  - 用户注册界面
  - 用户登录界面
  - 登录成功后保存 token 到 Cookie
  - 支持登录后跳转回原始分享链接

## 🎯 工作原理

### 1. 分享链接保护
当用户访问 `http://localhost:3004/chat/share/xxx` 时：

1. 认证代理检查请求中的 Cookie 或 URL 参数是否包含 token
2. 如果没有 token，重定向到登录页，并保存原始 URL
3. 用户在登录页输入用户名密码
4. 登录成功后，服务器返回 token
5. 前端将 token 保存到 Cookie
6. 自动跳转回原始分享链接
7. 认证代理再次检查，发现有 token
8. 调用后端 API 验证 token 有效性
9. 验证通过后，转发请求到 FastGPT
10. 用户看到对话页面

### 2. Token 验证
- Token 通过 Cookie 传递（key: `auth_token` 或 `token`）
- 也支持通过 URL 参数传递（`?token=xxx`）
- 认证代理调用 Spring Boot 后端验证 token
- 如果后端不可用，降级为基本格式验证（长度检查）

### 3. CORS 处理
- 认证代理自动添加 CORS 头
- 支持跨域请求
- 允许 Cookie 传递

## 📊 端口占用

| 服务 | 端口 | 用途 |
|------|------|------|
| Spring Boot 后端 | 8080 | 数据库操作、用户管理 |
| 认证API服务器 | 3003 | API转发、简化前端调用 |
| 认证代理服务器 | 3004 | 分享链接保护、token验证 |
| 管理前端 | 5173 | 登录注册界面 |
| FastGPT 主服务 | 3000 | AI对话功能 |

## 🐛 故障排除

### 问题1: 认证代理启动失败
**原因**: 端口 3004 被占用

**解决**:
```powershell
# 查找占用端口的进程
netstat -ano | findstr :3004

# 结束进程（替换 <PID> 为实际进程ID）
taskkill /F /PID <PID>
```

### 问题2: 登录后跳转404
**原因**: FastGPT 服务未启动

**解决**: 确保 FastGPT 在端口 3000 运行

### 问题3: Token验证失败
**原因**: Spring Boot 后端未启动

**解决**: 
1. 启动 Spring Boot 后端
2. 或使用降级策略（代理会自动处理）

### 问题4: CORS 错误
**原因**: 前端域名未在白名单中

**解决**: 在 `simple-server.js` 中添加：
```javascript
app.use(cors({
    origin: ['http://localhost:5173', 'http://你的IP:5173'],
    credentials: true
}));
```

## 📦 依赖安装

### auth-system
```powershell
cd auth-system
npm install express cors
```

### fastgpt-admin
```powershell
cd fastgpt-admin
pnpm install
```

## 🔄 系统更新

### 更新认证API服务器
```powershell
cd auth-system
# 修改 simple-server.js
# 重启服务
```

### 更新认证代理服务器
```powershell
cd auth-system
# 修改 ultra-simple-proxy.js
# 重启服务
```

### 更新管理前端
```powershell
cd fastgpt-admin
pnpm build
pnpm preview
```

## 📖 参考文档

- [FastGPT 官方文档](https://doc.fastgpt.in/)
- [Express.js 文档](https://expressjs.com/)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)

## 💡 最佳实践

1. **生产环境部署**:
   - 使用 HTTPS
   - 配置反向代理（Nginx/Caddy）
   - 使用环境变量管理配置
   - 启用 JWT token 过期机制

2. **安全建议**:
   - 定期更新 token
   - 实现刷新 token 机制
   - 添加请求频率限制
   - 记录所有认证日志

3. **性能优化**:
   - 使用 Redis 缓存 token 验证结果
   - 启用 HTTP/2
   - 压缩响应数据

## 📞 技术支持

如有问题，请查看：
- auth-system-guide.md
- auth-system-integration-guide.md
- fastgpt-auth-integration.md
