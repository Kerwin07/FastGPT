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
    const token = localStorage.getItem('fastgpt-auth-token');
    if (!token) return;
    
    try {
      const response = await fetch(`${AUTH_API_URL}/api/chat/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question,
          answer
        })
      });
      
      const data = await response.json();
      console.log('聊天记录已保存到监控系统', data);
    } catch (error) {
      console.error('保存聊天记录失败', error);
    }
  }
};

export default {
  checkAuthAndRedirect,
  logChatToAuthSystem
};