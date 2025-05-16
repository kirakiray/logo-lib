import fs from 'fs-extra';
import { CONFIG } from './config.js';
import { randomDelay } from './utils.js';
import { getLogoUrl } from './logoFetcher.js';
import { checkLogoCache, downloadLogo } from './cacheManager.js';

// 从配置文件读取网站列表
const websitesConfig = await fs.readJSON(CONFIG.paths.websites);
const websites = websitesConfig.websites;

/**
 * 主函数
 */
async function main() {
  console.log('开始获取网站logo...');

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
          await randomDelay(CONFIG.delay.cache.min, CONFIG.delay.cache.max);
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
          await randomDelay(CONFIG.delay.retry.min, CONFIG.delay.retry.max);
        }
        continue;
      }

      // 下载logo前添加短暂延迟
      await randomDelay(CONFIG.delay.download.min, CONFIG.delay.download.max);

      // 下载logo
      const downloadSuccess = await downloadLogo(website, logoUrl);
      if (downloadSuccess) {
        successCount++;
      } else {
        failedCount++;
      }

      // 在处理下一个网站前添加随机延迟
      if (i < websites.length - 1) {
        await randomDelay(CONFIG.delay.next.min, CONFIG.delay.next.max);
      }
    } catch (error) {
      console.error(`处理 ${website} 时发生错误:`, error.message);
      failedCount++;

      // 出错后添加较长延迟
      if (i < websites.length - 1) {
        await randomDelay(CONFIG.delay.error.min, CONFIG.delay.error.max);
      }
    }
  }

  console.log('所有logo获取完成！');
  console.log(
    `统计信息: 成功: ${successCount}, 失败: ${failedCount}, 缓存: ${cachedCount}, 总计: ${websites.length}`
  );
}

// 运行主函数
main().catch(console.error);