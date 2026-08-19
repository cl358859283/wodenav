# 个人导航（WodeNav）

纯前端个人导航页：分类链接、多搜索引擎、主题与壁纸、拖拽排序、多端同步。  
数据默认保存在浏览器 `localStorage`，适合部署到 **GitHub Pages** / **Cloudflare Pages** / **Vercel** 等静态托管。

---

## 功能概览

| 功能 | 说明 |
|------|------|
| 双布局 | **直显模式**（分组 + 二级标签）/ **文件夹模式**（SVG 文件夹卡片） |
| 侧边栏 | 一级 / 二级分类导航，可折叠，滚动高亮 |
| 搜索 | 多引擎切换、自定义引擎、关键词搜索 |
| 外观 | 深浅色、强调色、壁纸遮罩、卡片透明度 |
| 壁纸 | 本地图库 / 在线 URL / 随机模式 |
| 链接管理 | 增删改、批量、书签 HTML 导入、拖拽排序 |
| 同步备份 | WebDAV / GitHub Gist / S3 / 本地 JSON 导入导出 |

---

## 快速开始

```bash
# 任意静态服务器均可，例如：
npx serve .
# 或 Python
python -m http.server 8080
```

浏览器打开对应地址即可。首次进入会加载 `js/data.js` 中的默认分类与链接。

---

## 目录结构

```
.
├── index.html                 # 页面结构 + 所有弹窗 HTML
├── css/
│   ├── variables.css          # 主题色、FAB 尺寸、间距等 CSS 变量（出厂默认）
│   ├── base.css               # 重置、滚动条、body
│   ├── layout.css             # 侧边栏、搜索、分组、文件夹、FAB、二级标签
│   ├── components-cards.css   # 链接卡片、按钮、空状态、通用弹窗
│   ├── components-settings.css# 设置弹窗、外观、壁纸 UI
│   ├── components-sync.css    # 同步面板
│   ├── components-manage.css  # 链接管理、拖拽列表
│   ├── components.css         # 兼容重导出（@import 上述拆分文件，主入口未引用）
│   └── responsive.css         # 断点与触控优化（会覆盖 variables 中的 FAB 等）
├── js/
│   ├── app.js                 # 入口：boot() 初始化与事件绑定
│   ├── state.js               # 共享状态 S、loadData / saveData / scheduleRender
│   ├── data.js                # 默认分类链接 + 搜索引擎
│   ├── render.js              # 主页渲染（直显 / 文件夹 / 弹窗）
│   ├── sidebar.js             # 侧边栏渲染与滚动高亮
│   ├── links.js               # 链接增删改、书签导入
│   ├── manage.js              # 设置内链接管理树
│   ├── search-engines.js      # 搜索引擎管理
│   ├── home-layout.js         # 首页布局模式切换
│   ├── categories.js          # 设置区可折叠区块辅助
│   ├── theme.js               # 主题 / 强调色 / 遮罩 / 卡片透明度
│   ├── wallpaper.js           # 壁纸系统
│   ├── clock.js               # 时钟
│   ├── dialogs.js             # Alert / Confirm / Prompt
│   ├── config.js              # 本地壁纸列表等配置
│   └── utils.js               # 防抖、转义、长按拖拽等工具
├── wallpaper/                 # Landscape / Portrait 本地壁纸
├── docs/                      # 详细文档（使用、部署、架构）
├── _headers                   # Cloudflare Pages 缓存与安全头
├── .nojekyll                  # GitHub Pages：跳过 Jekyll 处理
├── .github/workflows/pages.yml# 可选：GitHub Actions 部署 Pages
├── wrangler.toml              # 可选：Cloudflare Wrangler 本地/上传
└── README.md
```

更细的说明见 [docs/directory-structure.md](docs/directory-structure.md)。

---

## 模块依赖关系（简图）

```
index.html
    └── app.js (boot)
          ├── state.js ← data.js
          ├── render.js / sidebar.js / manage.js / links.js
          ├── theme.js / wallpaper.js / search-engines.js
          ├── home-layout.js / categories.js / clock.js
          └── utils.js / dialogs.js
```

- **单一数据源**：业务状态集中在 `state.js` 的 `S` 对象。  
- **渲染**：通过 `scheduleRender()` 合并同帧请求，避免重复重排。  
- **持久化**：`saveData()` 写入 `localStorage`；外观单独键 `nav_appearance`。

---

## 常用自定义（保持布局功能不变）

### 1. FAB 右下角按钮大小 / 边距（PC）

桌面尺寸在两处定义，**需同时改**，否则 `responsive.css` 会覆盖：

| 文件 | 说明 |
|------|------|
| `css/variables.css` | `:root` 中 `--fab-*` 默认值 |
| `css/responsive.css` | `@media (min-width: 1025px)` 与 `(min-width: 1400px)` |

主要变量：

```css
--fab-toggle-size   /* 主按钮直径 */
--fab-item-size     /* 展开子按钮直径 */
--fab-icon-size     /* 图标大小 */
--fab-gap           /* 按钮间距 */
--fab-edge          /* 距右下边距 */
```

定位逻辑在 `css/layout.css` 的 `.fab-menu-wrap`（`position: fixed; bottom/right`）。

### 2. 二级目录选中态（侧栏 + 直显标签）

均为透明毛玻璃，避免实心白块：

- 侧栏二级：`.sidebar-sub-row.active`（`layout.css`）
- 直显标签：`.tab-item.active`（`layout.css`）

使用 `color-mix` + `backdrop-filter: blur(10px)`，颜色跟随时强调色 `--primary`。

### 3. 文件夹模式 SVG 边框颜色

`.folder-icon { color: var(--primary); }`  
SVG 使用 `stroke: currentColor`，因此边框绑定强调色。

### 4. 强调色 / 遮罩 / 卡片透明度

- 运行时由 `theme.js` 写入 CSS 变量（`--primary`、`--primary-glow`、`--card-glass-bg` 等）。  
- 出厂默认在 `theme.js`：`DEFAULT_ACCENT_COLOR`、`DEFAULT_MASK_DARKEN`、`DEFAULT_CARD_OPACITY`。

### 5. 默认链接与分类

编辑 `js/data.js` 中的 `DEFAULT_DATA`。用户本地已有数据时以 `localStorage` 为准。

---

## 样式与缓存

`index.html` 中 CSS/JS 带查询参数版本号（如 `?v=20260816e`）。  
修改样式或脚本后请**递增该版本号**，避免 CDN / 浏览器强缓存旧文件。

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [快速开始](docs/getting-started.md) | 本地预览 |
| [主页使用](docs/usage/home.md) | 搜索、侧边栏、布局 |
| [外观设置](docs/usage/appearance.md) | 主题、遮罩、壁纸 |
| [分类管理](docs/usage/categories.md) | 一级 / 二级分类 |
| [同步与备份](docs/usage/sync-backup.md) | WebDAV / GitHub / S3 |
| [部署教程](docs/deploy.md) | Pages / Cloudflare / Vercel |
| [技术说明](docs/tech.md) | 二次开发建议 |
| [维护对照](docs/maintenance.md) | 改什么文件对应什么功能 |

---

## 本次代码整理摘要

1. **删除冗余**：已移除未再使用的「分类结构管理」独立面板逻辑（原 `categories.js` 大段拖拽/渲染，以及 `structure-cat-*` / `structure-sub-*` 样式）。分类增删改与排序统一在**链接管理**（`manage.js`）中完成。  
2. **`categories.js` 精简**：仅保留设置区可折叠辅助函数，并补充模块注释。  
3. **注释**：入口 `app.js`、状态、工具与关键样式块均保留/补充职责说明。  
4. **功能与布局**：侧栏、直显/文件夹、FAB、毛玻璃选中态、文件夹强调色等行为保持不变。

---

## 许可

见 [docs/license.md](docs/license.md)。
