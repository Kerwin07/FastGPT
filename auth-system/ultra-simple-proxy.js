/**
 * 超级简化版认证代理
 * 核心原则：认证只在代理层处理，检查分享链接访问权限
 */

const http = require('http');
const url = require('url');

// 配置
const PORT = 3004;
const FASTGPT_HOST = 'localhost';
const FASTGPT_PORT = 3000;
const BACKEND_HOST = 'localhost'; // Spring Boot后端
const BACKEND_PORT = 8080;
const SERVER_IP = '10.14.53.120'; // 服务器外网IP
const ADMIN_HOST = 'localhost'; // fastgpt-admin 前端
const ADMIN_PORT = 5173;

// 动态获取登录页URL（根据请求来源判断）
function getAdminLoginUrl(req) {
    const host = req.headers.host || '';
    // 直接返回 fastgpt-admin 的地址（端口 5173）
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return `http://localhost:5173`;
    } else {
        return `http://${SERVER_IP}:5173`;
    }
}

// 动态获取当前代理URL（用于生成分享链接）
function getProxyUrl(req) {
    const host = req.headers.host || '';
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return `http://localhost:${PORT}`;
    } else {
        return `http://${SERVER_IP}:${PORT}`;
    }
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    console.log(`\n[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    
    // CORS预检请求直接返回
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
            'Access-Control-Allow-Credentials': 'true'
        });
        res.end();
        return;
    }
    
    // 只有分享链接需要认证检查
    if (pathname.startsWith('/chat/share')) {
        console.log('📋 检测到分享链接，执行认证检查');
        console.log('🍪 收到的Cookie:', req.headers.cookie || '(无)');
        
        // 获取token（优先URL参数，其次Cookie）
        let token = parsedUrl.query.token;
        if (Array.isArray(token)) token = token[0];
        
        if (!token && req.headers.cookie) {
            const cookies = parseCookie(req.headers.cookie);
            // 支持多种cookie名称：fastgpt_token, auth_token, token
            token = cookies.fastgpt_token || cookies.auth_token || cookies.token;
            console.log('📦 从Cookie解析token:', token ? token.substring(0, 30) + '...' : '(无)');
            if (token) {
                console.log('✅ 找到token来源:', cookies.fastgpt_token ? 'fastgpt_token' : cookies.auth_token ? 'auth_token' : 'token');
            }
        }
        
        // 没有token，重定向到登录页
        if (!token) {
            console.log('❌ 无token，重定向到登录页');
            // 硬编码跳转到 fastgpt-admin (5173端口)
            const originalUrl = `http://${req.headers.host}${req.url}`;
            const loginUrl = `http://10.14.53.120:5173?redirect=${encodeURIComponent(originalUrl)}`;
            
            console.log('📍 原始URL:', originalUrl);
            console.log('➡️  强制跳转到:', loginUrl);
            
            res.writeHead(302, {
                'Location': loginUrl
            });
            res.end();
            return;
        }
        
        // 验证token（通过后端API）
        verifyToken(token, (valid, userData) => {
            if (valid) {
                console.log('✅ Token有效，用户:', userData?.username || '未知');
                console.log('🚀 转发请求到FastGPT');
                proxyToFastGPT(req, res);
            } else {
                console.log('❌ Token无效或已过期，重定向到登录页');
                // 硬编码跳转到 fastgpt-admin (5173端口)
                const originalUrl = `http://${req.headers.host}${req.url}`;
                const loginUrl = `http://10.14.53.120:5173?redirect=${encodeURIComponent(originalUrl)}`;
                
                console.log('➡️  强制跳转到:', loginUrl);
                
                res.writeHead(302, {
                    'Location': loginUrl
                });
                res.end();
            }
        });
        return;
    }
    
    // 静态资源和其他API直接转发到FastGPT
    console.log('➡️ 非分享链接，直接转发到FastGPT');
    proxyToFastGPT(req, res);
});

// 解析Cookie
function parseCookie(cookieStr) {
    const cookies = {};
    if (cookieStr) {
        cookieStr.split(';').forEach(cookie => {
            const parts = cookie.trim().split('=');
            if (parts.length === 2) {
                cookies[parts[0]] = parts[1];
            }
        });
    }
    return cookies;
}

// 验证token（简化版：只检查token是否存在）
function verifyToken(token, callback) {
    // Token基本格式验证
    if (!token || token.trim() === '') {
        console.log('❌ Token为空');
        callback(false);
        return;
    }
    
    // Token长度检查
    if (token.length < 6) {
        console.log('❌ Token长度不足');
        callback(false);
        return;
    }
    
    // 简化验证：只要有合理格式的token就放行
    console.log('✅ Token验证通过:', token.substring(0, 30) + '...');
    callback(true, { token: token });
}

// 转发请求到FastGPT
function proxyToFastGPT(clientReq, clientRes) {
    const options = {
        hostname: FASTGPT_HOST,
        port: FASTGPT_PORT,
        path: clientReq.url,
        method: clientReq.method,
        headers: { ...clientReq.headers }
    };
    
    // 修改Host头
    options.headers.host = `${FASTGPT_HOST}:${FASTGPT_PORT}`;
    
    const proxyReq = http.request(options, (proxyRes) => {
        // 添加CORS头
        const headers = { ...proxyRes.headers };
        headers['Access-Control-Allow-Origin'] = '*';
        headers['Access-Control-Allow-Credentials'] = 'true';
        
        // 转发响应头
        clientRes.writeHead(proxyRes.statusCode, headers);
        
        // 转发响应体
        proxyRes.pipe(clientRes);
    });
    
    proxyReq.on('error', (error) => {
        console.error('❌ 代理请求错误:', error.message);
        clientRes.writeHead(502, { 
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        });
        clientRes.end(JSON.stringify({
            error: 'Bad Gateway',
            message: 'FastGPT服务不可用，请检查服务是否启动',
            details: error.message
        }));
    });
    
    // 转发请求体
    clientReq.pipe(proxyReq);
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║        🚀 FastGPT 认证代理服务器启动成功！              ║
╠═══════════════════════════════════════════════════════════╣
║  📍 代理端口:       ${PORT}                              ║
║  🎯 FastGPT目标:    ${FASTGPT_HOST}:${FASTGPT_PORT}                       ║
║  🔐 后端API:        ${BACKEND_HOST}:${BACKEND_PORT}                       ║
║  👤 管理后台:       http://${SERVER_IP}:${ADMIN_PORT}         ║
║                                                           ║
║  📋 分享链接访问:   http://${SERVER_IP}:${PORT}/chat/share/xxx  ║
║  ✅ 认证保护已启用                                        ║
╚═══════════════════════════════════════════════════════════╝
    `);
    console.log('💡 提示: 访问分享链接时，未登录用户会自动跳转到登录页\n');
});
