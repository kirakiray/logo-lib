import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { CONFIG } from './config.js';
import { getHeaders } from './utils.js';

/**
 * 检查logo是否已存在于本地缓存
 * @param {string} website - 网站域名
 * @returns {Promise<boolean>} - 是否存在于缓存
 */
export async function checkLogoCache(website) {
  try {
    // 检查source.json中的记录
    const sourceData = await fs.readJSON(CONFIG.paths.sourceJson);
    if (sourceData[website]) {
      const ext = `.${sourceData[website].format}`;
      const fileName = `${website}${ext}`;
      const filePath = path.join(CONFIG.paths.source, fileName);

      // 检查文件是否存在
      const fileExists = await fs.pathExists(filePath);
      if (fileExists) {
        console.log(`使用本地缓存的logo: ${website}`);
        return true;
      }
    }
    return false;
  } catch (err) {
    return false;
  }
}

/**
 * 下载logo并保存到本地
 * @param {string} website - 网站域名
 * @param {string} logoUrl - logo的URL
 * @returns {Promise<boolean>} - 下载是否成功
 */
export async function downloadLogo(website, logoUrl) {
  const headers = getHeaders('image', website);
  let retryCount = 0;

  while (retryCount < CONFIG.request.maxRetries) {
    try {
      if (retryCount > 0) {
        const delay = Math.floor(Math.random() * 800) + 400;
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.log(`重试下载 ${website} 的logo (尝试 ${retryCount}/${CONFIG.request.maxRetries})`);
      }

      const response = await axios({
        url: logoUrl,
        responseType: 'arraybuffer',
        headers,
        timeout: CONFIG.request.timeout
      });

      // 获取文件扩展名
      const contentType = response.headers['content-type'];
      let ext = '.png';
      if (contentType.includes('svg')) ext = '.svg';
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';

      const fileName = `${website}${ext}`;
      const filePath = path.join(CONFIG.paths.source, fileName);

      // 确保source目录存在
      await fs.ensureDir(CONFIG.paths.source);

      // 保存文件
      await fs.writeFile(filePath, response.data);

      // 更新source.json
      await updateSourceJson(website, ext);

      console.log(`成功下载 ${website} 的logo并更新source.json`);
      return true;
    } catch (error) {
      console.error(
        `尝试 ${retryCount + 1}/${CONFIG.request.maxRetries} - 下载 ${website} 的logo失败:`,
        error.message
      );
      retryCount++;

      if (retryCount >= CONFIG.request.maxRetries) {
        console.error(`已达到最大重试次数，无法下载 ${website} 的logo`);
        return false;
      }
    }
  }
  return false;
}

/**
 * 更新source.json文件
 * @param {string} website - 网站域名
 * @param {string} ext - 文件扩展名
 * @returns {Promise<void>}
 */
async function updateSourceJson(website, ext) {
  let sourceData = {};
  try {
    sourceData = await fs.readJSON(CONFIG.paths.sourceJson);
  } catch (err) {
    // 如果文件不存在或无法解析，使用空对象
  }

  sourceData[website] = {
    format: ext.substring(1), // 移除前面的点号
    lastUpdated: new Date().toISOString()
  };

  await fs.writeJSON(CONFIG.paths.sourceJson, sourceData, { spaces: 2 });
}