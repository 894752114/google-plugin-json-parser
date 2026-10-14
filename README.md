# JSON 解析器

Chrome 扩展：粘贴 JSON 即可自动解析、反转义与美化，支持嵌套转义字符串。

## 功能

- 粘贴即解析，自动美化格式
- 自动处理转义字符与多重编码
- 树形展示，支持一键展开 / 收起
- 压缩 JSON、一键复制结果
- 点击扩展图标会在新标签页打开全屏界面

## 安装方式（开发者模式）

1. 克隆或下载本仓库到本地：

```bash
git clone https://github.com/894752114/google-plugin-json-parser.git
```

2. 打开 Chrome，地址栏进入扩展管理页：

```
chrome://extensions/
```

3. 打开右上角 **开发者模式**
4. 点击 **加载已解压的扩展程序**
5. 选择本项目文件夹（包含 `manifest.json` 的目录）
6. 安装成功后，点击浏览器工具栏中的扩展图标即可使用

> 修改代码后，在 `chrome://extensions/` 页面点击本扩展的 **重新加载** 即可生效。

## 目录结构

```
google_plugin/
├── manifest.json      # 扩展配置
├── background.js      # 点击图标打开标签页
├── popup.html         # 主界面
├── popup.css
├── popup.js
├── icons/             # 图标
└── README.md
```

## 环境要求

- Chromium 内核浏览器（Chrome / Edge 等）
- 支持 Manifest V3
