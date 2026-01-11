const express = require('./ollama-proxy-deps/node_modules/express');
const app = express();

app.use(express.json({ limit: '50mb' }));

const OLLAMA_URL = 'http://localhost:11434/v1';
const OPENAI_URL = 'https://oa.api2d.net/v1';  // 使用你的API2D地址
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'fk234054-0hQ880DLf9qmjYER6NJq9FuJEhXDegQJ';

// Ollama本地模型列表 - 包含所有已安装的模型
const OLLAMA_MODELS = [
  // === 对话模型 ===
  'qwen3',
  'qwen3:latest',
  'deepseek-r1',
  'deepseek-r1:latest',
  'qwen2.5:32b-instruct-q4_K_M',
  'deepseek-v3.1',
  'deepseek-v3.1:latest',
  'qwen3-next',
  'qwen3-next:latest',
  'gpt-oss',
  'gpt-oss:latest',
  'qwen:7b-chat',
  
  // === 向量模型 (Embedding) ===
  'nomic-embed-text',
  'nomic-embed-text:latest',
  'bge-m3',
  'bge-m3:latest',
  'qwen3-embedding',
  'qwen3-embedding:latest',
  'bge-base-zh',
  'bge-base-zh-v1.5',
  'bge-large-zh',
  'bge-large-zh-v1.5',
  'text-embedding-ada-002',  // 映射到本地模型
  'text-embedding-3-small',  // 映射到本地模型
  'text-embedding-3-large'   // 映射到本地模型
];

// OpenAI embedding 模型映射到本地最佳模型
const EMBEDDING_MODEL_MAPPING = {
  'text-embedding-ada-002': 'bge-m3',        // OpenAI ada-002 → BGE-M3
  'text-embedding-3-small': 'bge-m3',        // OpenAI 3-small → BGE-M3
  'text-embedding-3-large': 'qwen3-embedding', // OpenAI 3-large → Qwen3-Embedding
  'text-embedding-3': 'bge-m3'
};

// 判断是否是Ollama模型
function isOllamaModel(modelName) {
  if (!modelName) return false;
  return OLLAMA_MODELS.some(m => modelName.includes(m) || m.includes(modelName));
}

// 映射模型名称
function mapModelName(modelName, path) {
  // 只对 embedding 接口进行模型映射
  if (path.includes('/embeddings') && EMBEDDING_MODEL_MAPPING[modelName]) {
    const mappedModel = EMBEDDING_MODEL_MAPPING[modelName];
    console.log(`  模型映射: ${modelName} → ${mappedModel}`);
    return mappedModel;
  }
  return modelName;
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
      let modelName = req.body?.model || '';
      
      // 应用模型映射
      const originalModel = modelName;
      modelName = mapModelName(modelName, path);
      if (req.body && req.body.model) {
        req.body.model = modelName;
      }
      
      // 判断使用哪个后端
      const useOllama = isOllamaModel(modelName);
      const targetUrl = useOllama ? OLLAMA_URL : OPENAI_URL;
      
      console.log(`[${new Date().toISOString()}] ${req.method} ${path}`);
      if (originalModel !== modelName) {
        console.log(`  原始模型: ${originalModel}`);
      }
      console.log(`  目标模型: ${modelName} -> ${useOllama ? 'Ollama本地' : 'OpenAI'}`);
      
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
  // 健康检查接口
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Ollama-OpenAI Proxy',
      version: '2.0',
      backends: {
        ollama: OLLAMA_URL,
        openai: OPENAI_URL
      },
      models: {
        ollama: OLLAMA_MODELS.length,
        mapping: EMBEDDING_MODEL_MAPPING
      }
    });
  });

  // 列出所有支持的模型
  app.get('/models', (req, res) => {
    res.json({
      ollama_models: OLLAMA_MODELS,
      embedding_mapping: EMBEDDING_MODEL_MAPPING,
      note: 'Ollama models route to local, others route to OpenAI'
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
