const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// 创建Next.js应用实例
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// 全局错误处理 - 捕获未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION] 发生错误，但进程将继续运行:');
  console.error('时间:', new Date().toISOString());
  console.error('错误:', error);
  console.error('堆栈:', error.stack);
  console.error('----------------------------\n');
  // 不退出进程，继续运行
});

// 全局错误处理 - 捕获未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION] 发生Promise拒绝，但进程将继续运行:');
  console.error('时间:', new Date().toISOString());
  console.error('原因:', reason);
  console.error('Promise:', promise);
  console.error('----------------------------\n');
  // 不退出进程，继续运行
});

// 捕获进程信号
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在优雅关闭...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在优雅关闭...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

let server;

app.prepare().then(() => {
  server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[REQUEST ERROR] 处理请求时发生错误:');
      console.error('时间:', new Date().toISOString());
      console.error('URL:', req.url);
      console.error('错误:', err);
      console.error('----------------------------\n');
      
      // 尝试返回500错误响应
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> FastGPT服务器已启动，访问地址: http://${hostname}:${port}`);
    console.log(`> 错误处理已启用：遇到错误时将记录日志但不会终止进程`);
  });

  // 服务器错误处理
  server.on('error', (error) => {
    console.error('[SERVER ERROR] 服务器错误:');
    console.error('时间:', new Date().toISOString());
    console.error('错误:', error);
    console.error('----------------------------\n');
  });
});
