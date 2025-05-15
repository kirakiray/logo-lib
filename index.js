import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从配置文件读取网站列表
const websitesConfig = await fs.readJSON(path.join(__dirname, "websites.json"));
const websites = websitesConfig.websites;

// 辅助函数：随机延迟，避免频繁请求
async function randomDelay(min = 200, max = 800) {
  const delay = Math.floor(Math.random() * (max - min)) + min;
  console.log(`等待 ${delay}ms 后继续...`);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// 辅助函数：处理URL格式
function normalizeUrl(url, baseUrl) {
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

// 确保source目录存在
const sourceDir = path.join(__dirname, "source");
fs.ensureDirSync(sourceDir);

// 从网站获取logo URL的函数
async function getLogoUrl(website) {
  // 设置请求头，模拟正常浏览器行为
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: "https://www.google.com/",
    "sec-ch-ua":
      '"Google Chrome";v="120", "Chromium";v="120", "Not=A?Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "Cache-Control": "max-age=0",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
  };

  // 添加重试机制
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // 添加随机延迟，避免请求过于频繁
      if (retryCount > 0) {
        const delay = Math.floor(Math.random() * 800) + 400; // 400-1200ms随机延迟
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.log(
          `重试获取 ${website} 的logo (尝试 ${retryCount}/${maxRetries})`
        );
      }

      const response = await axios.get(`https://${website}`, { headers });
      const $ = cheerio.load(response.data);

      // 首先尝试获取manifest.json
      const manifestLink = $('link[rel="manifest"]').first().attr("href");
      if (manifestLink) {
        try {
          const manifestUrl = normalizeUrl(manifestLink, website);

          const manifestResponse = await axios.get(manifestUrl, { headers });
          const manifest = manifestResponse.data;

          if (manifest.icons && Array.isArray(manifest.icons)) {
            // 按尺寸排序，优先选择最大尺寸的图标
            const icons = manifest.icons.sort((a, b) => {
              const sizeA = parseInt((a.sizes || "0x0").split("x")[0]) || 0;
              const sizeB = parseInt((b.sizes || "0x0").split("x")[0]) || 0;
              return sizeB - sizeA;
            });

            if (icons.length > 0) {
              let logoUrl = normalizeUrl(icons[0].src, website);
              if (logoUrl) {
                return logoUrl;
              }
            }
          }
        } catch (manifestError) {
          console.log(`无法获取或解析 manifest.json: ${manifestError.message}`);
        }
      }

      // 如果manifest.json不存在或无法获取logo，回退到其他方法
      const selectors = [
        'link[rel="icon"]',
        'link[rel="shortcut icon"]',
        'link[rel="apple-touch-icon"]',
        'meta[property="og:image"]',
        'img[src*="logo"]',
      ];

      for (const selector of selectors) {
        const element = $(selector).first();
        let logoUrl = normalizeUrl(
          element.attr("href") ||
          element.attr("content") ||
          element.attr("src"),
          website
        );

        if (logoUrl) {
          return logoUrl;
        }
      }

      throw new Error("Logo not found");
    } catch (error) {
      console.error(
        `尝试 ${retryCount + 1}/${maxRetries} - 获取 ${website} 的logo失败:`,
        error.message
      );
      retryCount++;

      // 如果是最后一次尝试，则返回null
      if (retryCount >= maxRetries) {
        console.error(`已达到最大重试次数，无法获取 ${website} 的logo`);
        return null;
      }
    }
  }
  return null; // 所有尝试都失败
}

// 检查logo是否已存在于本地缓存
async function checkLogoCache(website) {
  const sourceJsonPath = path.join(__dirname, "source.json");
  try {
    // 检查source.json中的记录
    const sourceData = await fs.readJSON(sourceJsonPath);
    if (sourceData[website]) {
      const ext = `.${sourceData[website].format}`;
      const fileName = `${website}${ext}`;
      const filePath = path.join(sourceDir, fileName);

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

// 下载logo的函数
async function downloadLogo(website, logoUrl) {
  // 设置请求头，模拟正常浏览器行为
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: `https://${website}`,
    "sec-ch-ua":
      '"Google Chrome";v="120", "Chromium";v="120", "Not=A?Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'same-origin'
  };

  // 添加重试机制
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // 添加随机延迟，避免请求过于频繁
      if (retryCount > 0) {
        const delay = Math.floor(Math.random() * 800) + 400; // 400-1200ms随机延迟
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.log(
          `重试下载 ${website} 的logo (尝试 ${retryCount}/${maxRetries})`
        );
      }

      const response = await axios({
        url: logoUrl,
        responseType: "arraybuffer",
        headers,
        timeout: 10000, // 设置10秒超时
      });

      // 获取文件扩展名
      const contentType = response.headers["content-type"];
      let ext = ".png";
      if (contentType.includes("svg")) ext = ".svg";
      else if (contentType.includes("jpeg") || contentType.includes("jpg"))
        ext = ".jpg";

      const fileName = `${website}${ext}`;
      const filePath = path.join(sourceDir, fileName);

      await fs.writeFile(filePath, response.data);

      // 更新source.json文件
      const sourceJsonPath = path.join(__dirname, "source.json");
      let sourceData = {};
      try {
        sourceData = await fs.readJSON(sourceJsonPath);
      } catch (err) {
        // 如果文件不存在或无法解析，使用空对象
      }

      sourceData[website] = {
        format: ext.substring(1), // 移除前面的点号
        lastUpdated: new Date().toISOString(),
      };

      await fs.writeJSON(sourceJsonPath, sourceData, { spaces: 2 });
      console.log(`成功下载 ${website} 的logo并更新source.json`);
      return true; // 下载成功
    } catch (error) {
      console.error(
        `尝试 ${retryCount + 1}/${maxRetries} - 下载 ${website} 的logo失败:`,
        error.message
      );
      retryCount++;

      // 如果是最后一次尝试，则返回失败
      if (retryCount >= maxRetries) {
        console.error(`已达到最大重试次数，无法下载 ${website} 的logo`);
        return false;
      }
    }
  }
  return false; // 所有尝试都失败
}

// 主函数
async function main() {
  console.log("开始获取网站logo...");

  let successCount = 0;
  let failedCount = 0;
  let cachedCount = 0;

  for (let i = 0; i < websites.length; i++) {
    const website = websites[i];
    console.log(`正在处理 ${website}... (${i + 1}/${websites.length})`);

    try {
      // 检查本地缓存
      const isCached = await checkLogoCache(website);
      if (isCached) {
        console.log(`${website} 的logo已存在于缓存中`);
        cachedCount++;

        // 即使是缓存的网站，也添加短暂延迟，避免连续请求
        if (i < websites.length - 1) {
          await randomDelay(100, 300);
        }
        continue;
      }

      // 获取logo URL
      const logoUrl = await getLogoUrl(website);
      if (!logoUrl) {
        console.error(`无法获取 ${website} 的logo URL`);
        failedCount++;

        // 即使失败也添加延迟
        if (i < websites.length - 1) {
          await randomDelay(300, 600);
        }
        continue;
      }

      // 下载logo前添加短暂延迟
      await randomDelay(200, 500);

      // 下载logo
      const downloadSuccess = await downloadLogo(website, logoUrl);
      if (downloadSuccess) {
        successCount++;
      } else {
        failedCount++;
      }

      // 在处理下一个网站前添加随机延迟
      if (i < websites.length - 1) {
        await randomDelay(500, 1000);
      }
    } catch (error) {
      console.error(`处理 ${website} 时发生错误:`, error.message);
      failedCount++;

      // 出错后添加较长延迟
      if (i < websites.length - 1) {
        await randomDelay(800, 1500);
      }
    }
  }

  console.log("所有logo获取完成！");
  console.log(
    `统计信息: 成功: ${successCount}, 失败: ${failedCount}, 缓存: ${cachedCount}, 总计: ${websites.length}`
  );
}

// 运行主函数
main().catch(console.error);
