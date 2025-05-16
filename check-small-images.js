import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, 'source');
const SIZE_THRESHOLD = 100; // 尺寸阈值(宽或高小于此值视为小图片)

async function checkSmallImages() {
  try {
    // 读取source目录中的所有文件
    const files = fs.readdirSync(sourceDir);
    const smallImages = [];

    // 过滤掉SVG文件
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext !== '.svg' && ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    });

    // 检查每个图片的尺寸
    for (const file of imageFiles) {
      const filePath = path.join(sourceDir, file);
      try {
        const metadata = await sharp(filePath).metadata();
        
        if (metadata.width < SIZE_THRESHOLD || metadata.height < SIZE_THRESHOLD) {
          smallImages.push({
            name: file,
            width: metadata.width,
            height: metadata.height
          });
        }
      } catch (error) {
        // console.log(`跳过不支持的图片格式: ${file}`);
        continue;
      }
    }

    // 打印结果
    if (smallImages.length > 0) {
      console.log('发现小尺寸图片:');
      smallImages.forEach(img => {
        console.log(`${img.name} (${img.width}x${img.height})`);
      });
      console.log(`\n共有 ${smallImages.length} 个小尺寸图片`);
    } else {
      console.log('没有发现小尺寸图片');
    }
  } catch (error) {
    console.error('检查小尺寸图片时出错:', error);
  }
}

// 执行检查
checkSmallImages();