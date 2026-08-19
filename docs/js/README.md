# js/ 脚本说明

ES Module 组织，入口为 `app.js`（由 `index.html` 以 `type="module"` 引入）。

## 架构与模块

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│  (结构 + 所有弹窗 DOM + 引入 CSS / JS Module)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
     css/*.css        js/app.js        js/data.js
   (样式分层)      (核心业务入口)      (默认数据)
          │                │
          │     ┌──────────┼──────────┬──────────┐
          │     ▼          ▼          ▼          ▼
          │  utils.js  dialogs.js  theme.js  wallpaper.js
          │  (工具)    (弹窗)      (主题)    (壁纸)
          │
          └─── config.js（壁纸静态配置）
```

### 模块职责

| 模块 | 职责 | 关键依赖 |
|------|------|----------|
| **app.js** | 入口：boot()、事件绑定、同步面板编排 | 几乎所有其他模块 |
| **state.js** | 共享状态 S、loadData / saveData / scheduleRender | data.js, utils.js |
| **render.js** | 主页直显/文件夹渲染、文件夹弹窗 | state, utils |
| **sidebar.js** | 侧边栏渲染与滚动高亮 | state, utils |
| **manage.js** | 设置内链接管理树与拖拽 | state, utils |
| **links.js** | 链接增删改、书签导入 | state, dialogs |
| **search-engines.js** | 搜索引擎管理与拖拽 | state, utils |
| **home-layout.js** | 首页布局模式（文件夹 / 直显） | — |
| **categories.js** | 设置区可折叠区块辅助 | state |
| **data.js** | 默认分类树 + 默认搜索引擎 | 无 |
| **config.js** | 本地壁纸文件名列表、目录名映射 | 无 |
| **utils.js** | 防抖/节流、安全 localStorage、HTML 转义、长按拖拽 | 无 |
| **dialogs.js** | Promise 化 Alert/Confirm/Prompt | 无 |
| **theme.js** | 主题模式、强调色、遮罩/卡片透明度 | utils |
| **wallpaper.js** | 四种壁纸模式、方向自适应、换一张 | config.js, dialogs.js |
| **clock.js** | 时钟显示与可见性绑定 | — |

### 数据流

1. **启动**：`boot()` → `loadData()` 从 localStorage 读取（无则用 `DEFAULT_DATA`）→ 初始化主题/壁纸/布局 → `render()`
2. **用户操作**：修改内存中的 `groups` / `engines` → `saveData()` 写 localStorage → `scheduleRender()` → `requestAnimationFrame` → `render()`
3. **同步**：导出 JSON / data.js，或通过 WebDAV / GitHub / S3 上传下载

### 性能优化点

- `scheduleRender` 合并同帧多次渲染请求，减少重排
- 链接管理列表使用**事件委托**，避免为每个链接单独绑事件
- 拖拽过程中尽量缓存索引与容器引用
- 壁纸方向切换使用独立索引记忆，避免旋转后重新从 0 开始

---

## 数据模型

### 分类与链接

```js
// Group（一级分类）
{
  id: string,              // 唯一 ID，如 'g1'
  title: string,           // 显示名称
  desc: string,            // 描述
  collapsed: boolean,      // 是否折叠
  activeSubId: string,     // 当前激活的二级分类 id
  subGroups: SubGroup[],   // 二级分类列表
  links: Link[]            // 兼容旧数据，通常为空
}

// SubGroup（二级分类）
{
  id: string,
  title: string,
  fold: boolean,           // 是否折叠
  links: Link[]
}

// Link
{
  id: number | string,
  name: string,
  desc: string,
  url: string,
  localIcon: string,       // 自定义图标 URL，空则用 favicon 服务
  isExternal: boolean,
  isRocket: boolean        // 火箭标记（UI 强调）
}
```

### 搜索引擎

```js
{
  [key: string]: {
    name: string,
    url: string,           // 查询词直接拼在末尾，或使用 %s 占位
    isRocket: boolean
  }
}
```

### 本地存储 Key

| Key | 内容 |
|-----|------|
| `nav_data` | 分类与链接完整 JSON |
| `nav_engines` | 搜索引擎配置 |
| `nav_theme_mode` | 主题模式 |
| `nav_appearance` | 遮罩暗化 / 卡片透明度 |
| `nav_wallpaper` | 壁纸模式与状态 |
| `nav_home_layout` | 首页布局（folder / direct） |

---

## 各文件一览

| 文件 | 职责 |
|------|------|
| `app.js` | 入口：`boot()` 初始化与事件绑定 |
| `state.js` | 共享状态、`loadData` / `saveData` / `scheduleRender` |
| `links.js` | 链接增删改、移动、书签导入 |
| `home-layout.js` | 首页布局（文件夹 / 直显） |
| `sidebar.js` | 侧边栏与滚动高亮 |
| `search-engines.js` | 搜索引擎管理 |
| `categories.js` | 设置区折叠等辅助 |
| `clock.js` | 时钟 |
| `render.js` | 主页渲染、卡片、文件夹模式 |
| `manage.js` | 链接管理面板 |
| `config.js` | 本地壁纸列表等配置 |
| `data.js` | 默认分类链接 + 搜索引擎 |
| `dialogs.js` | Alert / Confirm / Prompt |
| `theme.js` | 主题模式、遮罩暗化、卡片透明度 |
| `wallpaper.js` | 壁纸系统 |
| `utils.js` | 通用工具、移动端长按拖拽 |

## 相关文档

- 功能使用：见 [usage/](../usage/)
- 壁纸配置：见 [wallpaper/](../wallpaper/)
- 二次开发：见 [tech.md](../tech.md)
