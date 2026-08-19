# 添加链接

**设置 → 添加链接**

1. 填写 URL（可省略 `https://`）、标题。
2. 选择所属 **大分类** 与 **二级分类**。
3. 可选：自动抓取图标、自定义图标。
4. 提交保存。

### 导入浏览器书签

同一面板下方支持导入浏览器导出的 **书签 HTML**（Chrome / Edge 等：书签管理器 → 导出）。  
导入会解析为分类结构并**追加**到现有导航（不覆盖）。

---

## 本地图标

将图标放入 `icons/`，并在 `js/config.js` 的 `LOCAL_ICONS` 中按域名登记，例如：

```js
export const LOCAL_ICONS = {
  'github.com': 'github.com.png',
};
```

未登记的域名直接使用在线 favicon，避免无效本地请求。也可在自定义图标中填写 `icons/xxx.png`。
