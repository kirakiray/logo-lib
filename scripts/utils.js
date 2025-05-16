import { CONFIG } from './config.js';

/**
 * 处理URL格式
 * @param {string} url - 需要处理的URL
 * @param {string} baseUrl - 基础URL
 * @returns {string|null} - 格式化后的URL
 */
export function normalizeUrl(url, baseUrl) {
  if (!url) return null;
  
  try {
    // 处理相对URL
    if (url.startsWith('//')) {
      return `https:${url}`;
    } else if (url.startsWith('/')) {
      return `https://${baseUrl}${url}`;
    } else if (!url.startsWith('http')) {
      return `https://${baseUrl}/${url}`;
    }
    return url;
  } catch (error) {
    console.error(`URL格式化错误: ${error.message}`);
    return url; // 返回原始URL，让后续代码尝试处理
  }
}

/**
 * 随机延迟函数
 * @param {number} min - 最小延迟时间（毫秒）
 * @param {number} max - 最大延迟时间（毫秒）
 * @returns {Promise<void>}
 */
export async function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min)) + min;
  console.log(`等待 ${delay}ms 后继续...`);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * 获取请求头
 * @param {string} type - 请求类型 ('webpage' | 'image')
 * @param {string} [website] - 网站域名（用于图片请求的Referer）
 * @returns {Object} - 请求头对象
 */
export function getHeaders(type, website = '') {
  const headers = { ...CONFIG.request.headers.common };
  
  if (type === 'webpage') {
    return { ...headers, ...CONFIG.request.headers.webpage };
  } else if (type === 'image') {
    return {
      ...headers,
      ...CONFIG.request.headers.image,
      'Referer': `https://${website}`
    };
  }
  
  return headers;
}