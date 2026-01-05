/**
 * FastGPT认证系统集成模块
 * 用于处理分享链接的认证跳转
 * 
 * 注意：认证检查已由 ultra-simple-proxy (3004端口) 统一处理
 * 这里只需要从URL提取token并保存到cookie，供后续API调用使用
 */

// 认证代理服务器的地址
const AUTH_PROXY_URL = 'http://10.14.53.120:3004';
const AUTH_ADMIN_URL = 'http://10.14.53.120:5173';
const AUTH_API_URL = 'http://10.14.53.120:8080';

// 从URL参数或Cookie中获取token并保存（不做redirect检查）
export const checkAuthAndRedirect = (shareId) => {
  // 如果在浏览器环境下执行
  if (typeof window !== 'undefined') {
    try {
      // 1. 优先从URL参数中获取token（登录后跳转回来时携带）
      const urlParams = new URLSearchParams(window.location.search);
      let token = urlParams.get('token');
      
      // 2. 如果URL中没有，尝试从Cookie中读取
      if (!token) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'token' || name === 'auth_token' || name === 'fastgpt_token' || name === 'user-token') {
            token = value;
            break;
          }
        }
      }
      
      // 3. 如果找到token，保存到多个地方确保可用
      if (token && token.length > 6) {
        console.log('✅ 检测到认证token，已保存');
        // 保存到Cookie（供ultra-simple-proxy使用）
        document.cookie = `token=${token}; path=/; max-age=86400`;
        document.cookie = `fastgpt_token=${token}; path=/; max-age=86400`;
        // 保存到localStorage（供前端使用）
        localStorage.setItem('fastgpt-auth-token', token);
        localStorage.setItem('user-token', token);
        return true;
      }
      
      // 4. 没有token - 但不在这里redirect（由ultra-simple-proxy统一处理）
      console.log('ℹ️  未检测到token，认证检查将由代理服务器处理');
      return true; // 返回true避免阻塞页面加载
      
    } catch (error) {
      console.error('❌ Token处理失败:', error);
      return true; // 出错也返回true，避免阻塞
    }
  }
  
  return true;
};

// 记录聊天内容到监控系统
export const logChatToAuthSystem = async (question, answer) => {
  if (typeof window !== 'undefined') {
    try {
      // 获取当前用户信息（从多个地方尝试）
      const userIdStr = localStorage.getItem('userId') || 
                       localStorage.getItem('user_id') ||
                       localStorage.getItem('fastgpt_user_id');
      
      const shareId = new URLSearchParams(window.location.search).get('shareId');
      const appId = localStorage.getItem('appId');
      
      // 尝试从多个地方获取userId
      let userId = null;
      if (userIdStr) {
        userId = parseInt(userIdStr);
      }
      
      // 如果localStorage没有，尝试从Cookie获取
      if (!userId) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'userId' || name === 'user_id' || name === 'fastgpt_user_id') {
            userId = parseInt(value);
            if (!isNaN(userId)) {
              console.log('✓ 从Cookie获取到userId:', userId);
              break;
            }
          }
        }
      }
      
      // 尝试从token解析userId（token格式可能是 jwt_token_123）
      if (!userId) {
        const token = localStorage.getItem('fastgpt-auth-token') || 
                     localStorage.getItem('admin-token') ||
                     localStorage.getItem('user-token') ||
                     localStorage.getItem('token');
        if (token) {
          // 1. 尝试解析 jwt_token_123 格式
          const match = token.match(/jwt_token_(\d+)/);
          if (match && match[1]) {
            userId = parseInt(match[1]);
            console.log('✓ 从token (jwt_token格式) 解析到userId:', userId);
          } else {
            // 2. 尝试JWT格式解析
            try {
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                userId = payload.userId || payload.id || payload.sub;
                if (userId) {
                  console.log('✓ 从token (JWT格式) 解析到userId:', userId);
                }
              }
            } catch (e) {
              console.log('ℹ️ Token不是标准JWT格式或解析失败');
            }
          }
        }
      }
      
      console.log('📝 准备记录对话:');
      console.log('  - userId:', userId || '未获取到（将使用null）');
      console.log('  - shareId:', shareId);
      console.log('  - appId:', appId);
      console.log('  - question:', question?.substring(0, 50) + '...');
      console.log('  - answer:', answer?.substring(0, 50) + '...');
      
      // 即使没有userId也要记录（后端可以接受null）
      const requestBody = {
        userId: userId,
        question: question,
        answer: answer,
        shareId: shareId,
        appId: appId
      };
      
      console.log('🌐 发送请求到:', `${AUTH_API_URL}/api/conversation/log`);
      console.log('📦 请求体:', JSON.stringify(requestBody, null, 2));
      
      // 调用后端API保存对话记录
      const response = await fetch(`${AUTH_API_URL}/api/conversation/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 响应状态:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📨 响应数据:', data);
      
      if (data.code === 1) {
        console.log('✅ 聊天记录已保存到监控系统，ID:', data.data?.id);
      } else {
        console.error('⚠️ 保存聊天记录返回错误:', data.message);
        console.error('完整错误信息:', data);
      }
    } catch (error) {
      console.error('❌ 保存聊天记录失败:');
      console.error('错误类型:', error.name);
      console.error('错误消息:', error.message);
      console.error('完整错误:', error);
    }
  }
};

export default {
  checkAuthAndRedirect,
  logChatToAuthSystem
};