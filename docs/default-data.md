# 默认数据与部署

### 15.1 数据优先级

1. 本机 `localStorage` 中有导航数据 → 用本地。  
2. 否则 → 用 `js/data.js` 的 `DEFAULT_DATA` / `DEFAULT_ENGINES`。

### 15.2 推荐多端同步工作流

1. 任意设备打开站点并编辑。  
2. **设置 → 同步 → 部署同步 → 导出 data.js**（或改用 GitHub / WebDAV 上传 JSON）。  
3. 替换仓库 `js/data.js` 并推送。  
4. 其他设备 **清除本地数据** 后刷新。

### 15.3 手改默认数据

直接编辑 `js/data.js` 中的 `DEFAULT_DATA`、`DEFAULT_ENGINES` 即可调整新访客或清缓存后的默认导航。

---
