# 技术说明与二次开发

### 19.1 技术栈

- 纯原生 HTML / CSS / JavaScript（ES Modules）
- 无构建工具、无框架依赖
- 兼容现代浏览器（Chrome / Edge / Firefox / Safari 较新版本）

### 19.2 二次开发建议

1. **修改默认数据**：直接编辑 `js/data.js`，或在页面操作后导出覆盖。
2. **增加新功能**：优先在 `app.js` 对应分区添加，复杂逻辑可抽到新模块再 import。
3. **样式调整**：优先改 `css/variables.css` 中的 CSS 变量，再针对性改 layout / components。
4. **壁纸扩展**：在 `config.js` 登记文件名即可，无需改 `wallpaper.js`。
5. **调试**：打开浏览器开发者工具 → Console / Network，关注 localStorage 写入与图片 404。

### 19.3 代码注释说明

各 JS 文件均已添加：

- 文件级职责说明与依赖关系
- 关键函数 JSDoc（参数、返回值、设计意图）
- 分区注释（便于在大文件中快速定位）

阅读代码时建议从 `app.js` 顶部的职责分区开始，再按需深入各模块。

---
