# 快速开始

```bash
# 任意静态服务器即可预览，例如：
npx serve .
# 或
python3 -m http.server 8080
```

浏览器打开对应地址即可。首次访问使用 `js/data.js` 中的默认分类与搜索引擎；之后的增删改会写入本机 `localStorage`。

> **注意**：必须通过 HTTP(S) 访问（不能直接双击 `index.html` 用 `file://` 打开），否则 ES Module 与部分 API 会受限。

---
