import axios from 'axios';
import * as cheerio from 'cheerio';
import { CONFIG } from './config.js';
import { normalizeUrl, getHeaders, randomDelay } from './utils.js';

/**
 * 从网站获取logo URL
 * @param {string} website - 网站域名
 * @returns {Promise<string|null>} - logo URL或null
 */
export async function getLogoUrl(website) {
  const headers = getHeaders('webpage');
  let retryCount = 0;

  while (retryCount < CONFIG.request.maxRetries) {
    try {
      if (retryCount > 0) {
        await randomDelay(CONFIG.delay.retry.min, CONFIG.delay.retry.max);
        console.log(`重试获取 ${website} 的logo (尝试 ${retryCount}/${CONFIG.request.maxRetries})`);
      }

      const response = await axios.get(`https://${website}`, { headers });
      const $ = cheerio.load(response.data);

      // 尝试获取manifest.json
      const manifestUrl = await tryGetManifestUrl($, website, headers);
      if (manifestUrl) return manifestUrl;

      // 尝试从HTML标签获取logo URL
      const logoUrl = tryGetLogoFromHtml($, website);
      if (logoUrl) return logoUrl;

      throw new Error('Logo not found');
    } catch (error) {
      console.error(`尝试 ${retryCount + 1}/${CONFIG.request.maxRetries} - 获取 ${website} 的logo失败:`, error.message);
      retryCount++;

      if (retryCount >= CONFIG.request.maxRetries) {
        console.error(`已达到最大重试次数，无法获取 ${website} 的logo`);
        return null;
      }
    }
  }
  return null;
}

/**
 * 尝试从manifest.json获取logo URL
 * @param {CheerioAPI} $ - Cheerio实例
 * @param {string} website - 网站域名
 * @param {Object} headers - 请求头
 * @returns {Promise<string|null>} - logo URL或null
 */
async function tryGetManifestUrl($, website, headers) {
  const manifestLink = $('link[rel="manifest"]').first().attr('href');
  if (!manifestLink) return null;

  try {
    const manifestUrl = normalizeUrl(manifestLink, website);
    const manifestResponse = await axios.get(manifestUrl, { headers });
    const manifest = manifestResponse.data;

    if (manifest.icons && Array.isArray(manifest.icons)) {
      // 按尺寸排序，优先选择最大尺寸的图标
      const icons = manifest.icons.sort((a, b) => {
        const sizeA = parseInt((a.sizes || '0x0').split('x')[0]) || 0;
        const sizeB = parseInt((b.sizes || '0x0').split('x')[0]) || 0;
        return sizeB - sizeA;
      });

      if (icons.length > 0) {
        const logoUrl = normalizeUrl(icons[0].src, website);
        if (logoUrl) return logoUrl;
      }
    }
  } catch (manifestError) {
    console.log(`无法获取或解析 manifest.json: ${manifestError.message}`);
  }

  return null;
}

/**
 * 从HTML标签获取logo URL
 * @param {CheerioAPI} $ - Cheerio实例
 * @param {string} website - 网站域名
 * @returns {string|null} - logo URL或null
 */
function tryGetLogoFromHtml($, website) {
  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'meta[property="og:image"]',
    'img[src*="logo"]'
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    const logoUrl = normalizeUrl(
      element.attr('href') ||
      element.attr('content') ||
      element.attr('src'),
      website
    );

    if (logoUrl) return logoUrl;
  }

  return null;
}