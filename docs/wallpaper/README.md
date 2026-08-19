# wallpaper/ 本地壁纸

## 配置说明

### 目录

```
wallpaper/
├── Landscape/     # 横屏（桌面、平板横持）
│   ├── bz01.webp
│   ├── bz02.webp
│   └── bz03.webp
├── Portrait/      # 竖屏（手机竖持）
│   ├── bz04.webp
│   └── bz05.webp
└── README.txt
```

### 在代码中登记

编辑 `js/config.js`：

```js
const LOCAL_WALLPAPERS = {
    landscape: [
        'bzhp01.webp',
        'bzhp02.webp',
    ],
    portrait: [
        'bzsp01.webp',
        'bzsp02.webp',
    ],
    any: []   // 可选：放在 wallpaper/ 根目录，作回退
};
```

只需写**文件名**，程序会自动拼到 `wallpaper/Landscape/` 或 `wallpaper/Portrait/`。  
也可写完整相对路径，如 `Landscape/foo.webp`。

### 使用步骤

1. 把图片放入对应子文件夹。  
2. 在 `LOCAL_WALLPAPERS` 中加上文件名。  
3. 刷新页面 → **外观设置 → 壁纸模式 → 本地**。  
4. 点 **换一张** 在当前方向的壁纸池中切换。  
5. 旋转设备时自动切换到另一方向的池（各自记住上次索引）。

### API 壁纸小技巧

URL 中可使用 `{width}` / `{height}` 占位，会按当前横竖屏替换为合适尺寸。  
对 `source.unsplash.com`、`picsum.photos` 等常见地址也会自动改写宽高。

---

另见项目内 `wallpaper/README.txt`。

相关代码：`js/config.js`（文件名登记）、`js/wallpaper.js`（运行时逻辑）。
