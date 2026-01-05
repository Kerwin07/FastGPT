const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

const app = express();
const PORT = 3003;
const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 8080;

// 中间件
app.use(cors({
    origin: ['http://localhost:5173', 'http://10.14.53.120:5173'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(__dirname));

// 用户注册接口 - 转发到Spring Boot后端
app.post('/api/user/register', (req, res) => {
    console.log('📝 收到注册请求:', { username: req.body.username, email: req.body.email });
    proxyToBackend('/api/user/register', req, res);
});

// 用户登录接口 - 转发到Spring Boot后端
app.post('/api/user/login', (req, res) => {
    console.log('🔐 收到登录请求:', { username: req.body.username });
    proxyToBackend('/api/user/login', req, res);
});

// Token验证接口 - 转发到Spring Boot后端
app.post('/api/user/verify', (req, res) => {
    console.log('🔍 收到token验证请求');
    proxyToBackend('/api/user/verify', req, res);
});

// 获取用户列表接口 - 转发到Spring Boot后端
app.get('/api/users', (req, res) => {
    console.log('📋 收到获取用户列表请求');
    proxyToBackend('/api/users', req, res);
});

// 记录聊天日志接口 - 转发到Spring Boot后端
app.post('/api/chat/log', (req, res) => {
    console.log('💬 收到聊天日志记录请求');
    proxyToBackend('/api/chat/log', req, res);
});

// 查询聊天记录接口 - 转发到Spring Boot后端
app.get('/api/chat/logs', (req, res) => {
    console.log('📊 收到查询聊天记录请求');
    proxyToBackend('/api/chat/logs', req, res);
});

// 转发请求到Spring Boot后端的通用函数
function proxyToBackend(path, req, res) {
    const options = {
        hostname: BACKEND_HOST,
        port: BACKEND_PORT,
        path: path,
        method: req.method,
        headers: {
            'Content-Type': 'application/json',
            ...(req.headers.authorization && { 'Authorization': req.headers.authorization })
        }
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        
        proxyRes.on('data', (chunk) => {
            data += chunk;
        });
        
        proxyRes.on('end', () => {
            res.status(proxyRes.statusCode).json(JSON.parse(data));
        });
    });
    
    proxyReq.on('error', (error) => {
        console.error('❌ 后端请求失败:', error.message);
        res.status(503).json({
            error: 'Service Unavailable',
            message: 'Spring Boot后端服务不可用，请检查服务是否启动',
            details: error.message
        });
    });
    
    if (req.body && Object.keys(req.body).length > 0) {
        proxyReq.write(JSON.stringify(req.body));
    }
    proxyReq.end();
}

// 健康检查接口
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Auth API Server is running' });
});

// 根路径
app.get('/', (req, res) => {
    res.json({ 
        message: 'FastGPT Auth API Server',
        version: '1.0.0',
        endpoints: {
            register: 'POST /api/user/register',
            login: 'POST /api/user/login',
            verify: 'POST /api/user/verify',
            users: 'GET /api/users',
            chatLog: 'POST /api/chat/log',
            chatLogs: 'GET /api/chat/logs'
        }
    });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║        🚀 FastGPT 认证API服务器启动成功！               ║
╠═══════════════════════════════════════════════════════════╣
║  📍 API端口:        ${PORT}                              ║
║  🔐 后端代理:       ${BACKEND_HOST}:${BACKEND_PORT}                       ║
║  🌐 访问地址:       http://10.14.53.120:${PORT}         ║
║                                                           ║
║  📋 API接口:                                              ║
║     POST /api/user/register  - 用户注册                  ║
║     POST /api/user/login     - 用户登录                  ║
║     POST /api/user/verify    - Token验证                 ║
║     GET  /api/users          - 获取用户列表              ║
║     POST /api/chat/log       - 记录聊天                  ║
║     GET  /api/chat/logs      - 查询聊天记录              ║
╚═══════════════════════════════════════════════════════════╝
    `);
    console.log('💡 提示: 所有API请求会自动转发到Spring Boot后端\n');
});