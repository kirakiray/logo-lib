import fs from 'fs-extra';
import path from 'path';

// 读取websites.json文件
const websitesJsonPath = path.join(process.cwd(), 'websites.json');
const sourceDir = path.join(process.cwd(), 'source');

async function findUncachedWebsites() {
  try {
    // 读取websites.json
    const websitesData = await fs.readJSON(websitesJsonPath);
    const websites = websitesData.websites;

    // 获取source目录下的所有文件
    const sourceFiles = await fs.readdir(sourceDir);

    // 找出未缓存的域名
    const uncachedWebsites = websites.filter(website => {
      // 检查是否存在对应的.svg、.png或.jpg文件
      return !sourceFiles.some(file => {
        const baseName = path.parse(file).name;
        return baseName === website;
      });
    });

    // 打印结果
    if (uncachedWebsites.length > 0) {
      console.log('未缓存的域名：');
      uncachedWebsites.forEach(website => console.log(website));
      console.log(`\n共有 ${uncachedWebsites.length} 个域名未缓存`);
    } else {
      console.log('所有域名都已缓存');
    }
  } catch (error) {
    console.error('检查未缓存域名时出错：', error);
  }
}

// 执行检查
findUncachedWebsites();