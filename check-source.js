import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取source.json文件
const sourceJsonPath = path.join(__dirname, 'source.json');
const sourceDir = path.join(__dirname, 'source');

// 确保source目录存在
if (!fs.existsSync(sourceDir)) {
  fs.mkdirSync(sourceDir);
}

// 读取source.json内容
const sourceJson = JSON.parse(fs.readFileSync(sourceJsonPath, 'utf8'));

// 读取source目录中的所有文件
const sourceFiles = fs.readdirSync(sourceDir);

// 遍历source目录中的文件
sourceFiles.forEach(file => {
  const domain = path.parse(file).name;
  const ext = path.parse(file).ext.slice(1); // 移除点号

  // 检查文件是否已在source.json中
  if (!sourceJson[domain]) {
    // 如果不存在，添加新条目
    sourceJson[domain] = {
      format: ext,
      lastUpdated: new Date().toISOString()
    };
    console.log(`添加新图标: ${domain}.${ext}`);
  }
});

// 将更新后的内容写回source.json
fs.writeFileSync(sourceJsonPath, JSON.stringify(sourceJson, null, 2));
console.log('更新完成！');