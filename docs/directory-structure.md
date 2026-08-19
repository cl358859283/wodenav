# 目录结构

```
.
├── index.html                 # 页面入口（结构 + 所有弹窗 HTML）
├── css/
│   ├── variables.css          # 主题色、卡片透明度等 CSS 变量
│   ├── base.css               # 重置、滚动条、body
│   ├── layout.css             # 侧边栏、页头、搜索、分组、文件夹布局
│   ├── components-cards.css   # 卡片、按钮、空状态、通用弹窗
│   ├── components-settings.css# 设置弹窗、外观、壁纸 UI
│   ├── components-sync.css    # 同步面板（WebDAV / GitHub / S3）
│   ├── components-manage.css  # 链接管理、拖拽、分类结构
│   ├── components.css         # 兼容重导出（@import 上述拆分文件）
│   └── responsive.css         # 断点与触控优化
├── js/
│   ├── app.js                 # 入口：boot() 初始化与事件绑定
│   ├── state.js               # 共享状态、loadData / saveData / scheduleRender
│   ├── links.js               # 链接增删改、移动、书签导入
│   ├── home-layout.js         # 首页布局（文件夹 / 直显）
│   ├── sidebar.js             # 侧边栏与滚动高亮
│   ├── search-engines.js      # 搜索引擎管理
│   ├── categories.js          # 设置区可折叠区块辅助
│   ├── clock.js               # 时钟
│   ├── render.js              # 主页渲染、卡片、文件夹模式
│   ├── manage.js              # 链接管理面板（分类/链接增删改与拖拽）
│   ├── config.js              # 本地壁纸列表等配置
│   ├── data.js                # 默认分类链接 + 搜索引擎
│   ├── dialogs.js             # Alert / Confirm / Prompt
│   ├── theme.js               # 主题模式、强调色、遮罩、卡片透明度
│   ├── wallpaper.js           # 壁纸系统
│   └── utils.js               # 通用工具、移动端长按拖拽
├── wallpaper/
│   ├── Landscape/             # 横屏壁纸
│   ├── Portrait/              # 竖屏壁纸
│   └── README.txt
├── docs/                      # 文档（按文件夹结构拆分）
│   ├── css/
│   ├── js/
│   ├── wallpaper/
│   ├── usage/
│   └── ...
├── _headers                   # Cloudflare Pages 缓存/安全头（可选）
└── README.md
```

---
