本地壁纸目录
============

目录结构：

  wallpaper/
  ├── Landscape/     ← 横屏壁纸（桌面、平板横持）
  ├── Portrait/      ← 竖屏壁纸（手机竖持）
  └── README.txt

在 js/config.js 中登记文件名：

const LOCAL_WALLPAPERS = {
    landscape: ['bzhp01.webp', 'bzhp02.webp'],
    portrait:  ['bzsp01.webp', 'bzsp02.webp'],
    any: []
};

设备横/竖屏会自动选用对应文件夹。保存后刷新，在「外观设置 → 壁纸模式 → 本地」中使用。
