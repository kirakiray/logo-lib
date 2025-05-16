import axios from "axios";
import * as cheerio from "cheerio";
import { CONFIG } from "./config.js";
import { normalizeUrl, getHeaders, randomDelay } from "./utils.js";

/**
 * 从 iconify.design 获取 SVG logo
 * @param {string} website - 网站域名
 * @returns {Promise<string|null>} - SVG logo URL或null
 */
async function tryGetIconifySvg(website) {
  try {
    const domain = website.split(".")[0];
    const iconifyUrl = `https://api.iconify.design/logos/${domain}.svg`;
    console.log(`尝试从 iconify.design 获取 ${domain} 的 SVG logo`);
    const response = await axios.get(iconifyUrl);
    if (response.status === 200 && response.data.includes("<svg")) {
      return iconifyUrl;
    }
  } catch (error) {
    console.log(
      `无法从 iconify.design 获取 ${website} 的 SVG logo: ${error.message}`
    );
  }
  return null;
}

/**
 * 从网站获取logo URL
 * @param {string} website - 网站域名
 * @returns {Promise<string|null>} - logo URL或null
 */
export async function getLogoUrl(website) {
  const headers = getHeaders("webpage");
  let retryCount = 0;

  while (retryCount < CONFIG.request.maxRetries) {
    try {
      if (retryCount > 0) {
        await randomDelay(CONFIG.delay.retry.min, CONFIG.delay.retry.max);
        console.log(
          `重试获取 ${website} 的logo (尝试 ${retryCount}/${CONFIG.request.maxRetries})`
        );
      }

      const response = await axios.get(`https://${website}`, { headers });
      const $ = cheerio.load(response.data);

      // 尝试从 iconify.design 获取 SVG logo
      const iconifySvg = await tryGetIconifySvg(website);
      if (iconifySvg) return iconifySvg;

      // 尝试获取manifest.json
      const manifestUrl = await tryGetManifestUrl($, website, headers);
      if (manifestUrl) return manifestUrl;

      // 尝试从HTML标签获取logo URL
      const logoUrl = tryGetLogoFromHtml($, website);
      if (logoUrl) return logoUrl;

      throw new Error("Logo not found");
    } catch (error) {
      console.error(
        `尝试 ${retryCount + 1}/${
          CONFIG.request.maxRetries
        } - 获取 ${website} 的logo失败:`,
        error.message
      );
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
  const manifestLink = $('link[rel="manifest"]').first().attr("href");
  if (!manifestLink) return null;

  try {
    const manifestUrl = normalizeUrl(manifestLink, website);
    const manifestResponse = await axios.get(manifestUrl, { headers });
    const manifest = manifestResponse.data;

    if (manifest.icons && Array.isArray(manifest.icons)) {
      // 优先选择 SVG 格式的图标
      const svgIcon = manifest.icons.find((icon) =>
        icon.src?.toLowerCase().endsWith(".svg")
      );
      if (svgIcon) {
        const logoUrl = normalizeUrl(svgIcon.src, website);
        if (logoUrl) return logoUrl;
      }

      // 如果没有 SVG 格式，按尺寸排序选择最大尺寸的图标
      const icons = manifest.icons.sort((a, b) => {
        const sizeA = parseInt((a.sizes || "0x0").split("x")[0]) || 0;
        const sizeB = parseInt((b.sizes || "0x0").split("x")[0]) || 0;
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
    'link[rel="icon"][type="image/svg+xml"]',
    'link[rel="shortcut icon"][type="image/svg+xml"]',
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'meta[property="og:image"]',
    'img[src*="logo"][src$=".svg"]',
    'img[src*="logo"]',
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    const logoUrl = normalizeUrl(
      element.attr("href") || element.attr("content") || element.attr("src"),
      website
    );

    if (logoUrl) return logoUrl;
  }

  return null;
}
