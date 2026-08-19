# css/ 样式说明

样式按职责分层，入口由 `index.html` 引入，`components.css` 通过 `@import` 聚合部分组件文件。

## 文件职责

| 文件 | 职责 |
|------|------|
| `variables.css` | 主题色、卡片透明度等 CSS 变量 |
| `base.css` | 重置、滚动条、body |
| `layout.css` | 侧边栏、页头、搜索、分组、文件夹布局 |
| `components-cards.css` | 卡片、按钮、空状态、通用弹窗 |
| `components-settings.css` | 设置弹窗、外观、壁纸 UI |
| `components-sync.css` | 同步面板（WebDAV / GitHub / S3） |
| `components-manage.css` | 链接管理、拖拽、分类结构 |
| `components.css` | 兼容重导出（`@import` 上述拆分文件） |
| `responsive.css` | 断点与触控优化 |

## 相关功能文档

- 外观与主题：见 [外观设置](../usage/appearance.md)
- 整体架构：见 [架构说明](../architecture.md)
