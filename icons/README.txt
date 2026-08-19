本地图标目录（性能优先）
========================

与壁纸相同：放入文件后，在 js/config.js 的 LOCAL_ICONS 中登记。
运行时按域名 O(1) 查找，不会扫描目录，也不会对缺失文件连环请求。

步骤：
  1. 将图标放入 icons/（如 github.com.png）
  2. 在 js/config.js 登记：

     export const LOCAL_ICONS = {
         'github.com': 'github.com.png',
         'bilibili.com': 'bilibili.com.webp',
     };

  3. 刷新页面即可

解析顺序：
  1. 链接自定义图标 localIcon
  2. LOCAL_ICONS 登记的本地文件
  3. 在线 favicon.im
  4. 标题首字母

未在 LOCAL_ICONS 中登记的域名不会访问 icons/，避免大量 404。
