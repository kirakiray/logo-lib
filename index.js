import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 常用网站列表
const websites = [
  'github.com',
  'google.com',
  'facebook.com',
  'twitter.com',
  'linkedin.com',
  'reddit.com',
  'instagram.com',
  'youtube.com',
  'amazon.com',
  'microsoft.com'
];

// 确保source目录存在
const sourceDir = path.join(__dirname, 'source');
fs.ensureDirSync(sourceDir);

// 从网站获取logo URL的函数
async function getLogoUrl(website) {
  try {
    const response = await axios.get(`https://${website}`);
    const $ = cheerio.load(response.data);
    
    // 尝试不同的选择器来找到logo
    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'meta[property="og:image"]',
      'img[src*="logo"]'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      let logoUrl = element.attr('href') || element.attr('content') || element.attr('src');
      
      if (logoUrl) {
        // 处理相对URL
        if (logoUrl.startsWith('//')) {
          logoUrl = `https:${logoUrl}`;
        } else if (logoUrl.startsWith('/')) {
          logoUrl = `https://${website}${logoUrl}`;
        } else if (!logoUrl.startsWith('http')) {
          logoUrl = `https://${website}/${logoUrl}`;
        }
        return logoUrl;
      }
    }
    
    throw new Error('Logo not found');
  } catch (error) {
    console.error(`Error fetching logo from ${website}:`, error.message);
    return null;
  }
}

// 下载logo的函数
async function downloadLogo(website, logoUrl) {
  try {
    const response = await axios({
      url: logoUrl,
      responseType: 'arraybuffer'
    });
    
    // 获取文件扩展名
    const contentType = response.headers['content-type'];
    let ext = '.png';
    if (contentType.includes('svg')) ext = '.svg';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
    
    const fileName = `${website}${ext}`;
    const filePath = path.join(sourceDir, fileName);
    
    await fs.writeFile(filePath, response.data);
    
    // 更新source.json文件
    const sourceJsonPath = path.join(__dirname, 'source.json');
    let sourceData = {};
    try {
      sourceData = await fs.readJSON(sourceJsonPath);
    } catch (err) {
      // 如果文件不存在或无法解析，使用空对象
    }
    
    sourceData[website] = {
      format: ext.substring(1), // 移除前面的点号
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeJSON(sourceJsonPath, sourceData, { spaces: 2 });
    console.log(`Successfully downloaded logo for ${website} and updated source.json`);
  } catch (error) {
    console.error(`Error downloading logo for ${website}:`, error.message);
  }
}

// 主函数
async function main() {
  console.log('开始获取网站logo...');
  
  for (const website of websites) {
    console.log(`正在处理 ${website}...`);
    const logoUrl = await getLogoUrl(website);
    if (logoUrl) {
      await downloadLogo(website, logoUrl);
    }
  }
  
  console.log('所有logo获取完成！');
}

// 运行主函数
main().catch(console.error);