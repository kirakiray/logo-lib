import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

// 常量配置
export const CONFIG = {
  // 文件路径
  paths: {
    root: rootDir,
    source: path.join(rootDir, 'source'),
    websites: path.join(rootDir, 'websites.json'),
    sourceJson: path.join(rootDir, 'source.json')
  },
  
  // 请求配置
  request: {
    maxRetries: 3,
    timeout: 10000,
    headers: {
      common: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'sec-ch-ua': '"Google Chrome";v="120", "Chromium";v="120", "Not=A?Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'Connection': 'keep-alive'
      },
      webpage: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Referer': 'https://www.google.com/'
      },
      image: {
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-origin'
      }
    }
  },

  // 延迟配置
  delay: {
    retry: {
      min: 400,
      max: 1200
    },
    cache: {
      min: 100,
      max: 300
    },
    download: {
      min: 200,
      max: 500
    },
    error: {
      min: 800,
      max: 1500
    },
    next: {
      min: 500,
      max: 1000
    }
  }
};