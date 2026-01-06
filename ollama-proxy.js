const express = require('./ollama-proxy-deps/node_modules/express');
const app = express();

app.use(express.json({ limit: '50mb' }));

const OLLAMA_URL = 'http://localhost:11434/v1';
const OPENAI_URL = 'https://oa.api2d.net/v1';  // 使用你的API2D地址
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'fk234054-0hQ880DLf9qmjYER6NJq9FuJEhXDegQJ';

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

// 判断是否是Ollama模型
function isOllamaModel(modelName) {
  if (!modelName) return false;
  return OLLAMA_MODELS.some(m => modelName.includes(m) || m.includes(modelName));
}

// Load axios dynamically
let axios;
(async () => {
  const axiosModule = await import('./ollama-proxy-deps/node_modules/axios/index.js');
  axios = axiosModule.default;
  
  // 代理所有请求
  app.use('/v1', async (req, res) => {
    try {
      const path = req.path;
      const modelName = req.body?.model || '';
      
      // 判断使用哪个后端
      const useOllama = isOllamaModel(modelName);
      const targetUrl = useOllama ? OLLAMA_URL : OPENAI_URL;
      
      console.log(`[${new Date().toISOString()}] ${req.method} ${path}`);
      console.log(`  Model: ${modelName} -> ${useOllama ? 'Ollama本地' : 'OpenAI'}`);
      
      // 准备请求头
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // OpenAI需要真实的API Key，Ollama不需要
      if (useOllama) {
        headers['Authorization'] = 'Bearer ollama';
      } else {
        headers['Authorization'] = req.headers.authorization || `Bearer ${OPENAI_API_KEY}`;
      }
      
      // 转发请求
      const response = await axios({
        method: req.method,
        url: `${targetUrl}${path}`,
        data: req.body,
        headers: headers,
        responseType: req.body?.stream ? 'stream' : 'json',
        timeout: 120000,
        validateStatus: () => true
      });
      
      console.log(`  Status: ${response.status}`);
      
      // 如果是流式响应
      if (req.body?.stream && response.headers['content-type']?.includes('text/event-stream')) {
        res.writeHead(response.status, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        response.data.pipe(res);
      } else {
        res.status(response.status).json(response.data);
      }
      
    } catch (error) {
      console.error('Proxy error:', error.message);
      
      const status = error.response?.status || 500;
      const errorData = error.response?.data || {
        error: {
          message: error.message,
          type: 'proxy_error',
          code: error.code
        }
      };
      
      res.status(status).json(errorData);
    }
  });

  // 健康检查
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      ollama: OLLAMA_URL,
      openai: OPENAI_URL,
      models: {
        ollama: OLLAMA_MODELS,
        openai: 'Dynamic routing via Authorization'
      }
    });
  });

  // 测试Ollama连接
  app.get('/test-ollama', async (req, res) => {
    try {
      const response = await axios.get(`${OLLAMA_URL}/models`, {
        timeout: 5000
      });
      res.json({
        status: 'success',
        message: 'Ollama connected',
        models: response.data
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Ollama connection failed: ' + error.message,
        hint: 'Please ensure Ollama is running: ollama serve'
      });
    }
  });

  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  FastGPT Ollama Proxy Started                              ║
╠════════════════════════════════════════════════════════════╣
║  Port:        http://localhost:${PORT}                        ║
║  Health:      http://localhost:${PORT}/health                 ║
║  Test:        http://localhost:${PORT}/test-ollama            ║
╠════════════════════════════════════════════════════════════╣
║  Ollama:      ${OLLAMA_URL.padEnd(43)} ║
║  OpenAI:      ${OPENAI_URL.padEnd(43)} ║
╠════════════════════════════════════════════════════════════╣
║  FastGPT Config:                                           ║
║    OPENAI_BASE_URL=http://localhost:${PORT}/v1              ║
║    CHAT_API_KEY=your-openai-key                            ║
╚════════════════════════════════════════════════════════════╝
    `);
    
    console.log('Ollama Models:');
    OLLAMA_MODELS.forEach(m => console.log(`   - ${m}`));
    console.log('');
  });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\nShutting down proxy...');
    process.exit(0);
  });
})();
