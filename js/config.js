/**
 * =============================================================================
 * config.js - 项目静态配置
 * =============================================================================
 *
 * 职责：
 *   - 本地壁纸文件名列表（按横屏 / 竖屏 / 通用分组）
 *   - 壁纸子目录名称映射
 *
 * 修改壁纸的标准流程：
 *   1. 把图片放入 wallpaper/Landscape/ 或 wallpaper/Portrait/
 *   2. 在下方 LOCAL_WALLPAPERS 对应数组中追加文件名
 *   3. 刷新页面 → 外观设置 → 壁纸模式选择「本地」→ 换一张
 *
 * 注意：
 *   - 只需写文件名，程序会自动拼接 wallpaper/Landscape/ 或 Portrait/
 *   - 也可写带目录的相对路径（如 Landscape/foo.webp）
 *   - any 数组可作为任意方向的回退池（当前默认空）
 *
 * 被依赖：wallpaper.js
 */

/** @type {{ landscape: string[], portrait: string[], any: string[] }} */
export const LOCAL_WALLPAPERS = {
    landscape: [
        'bzhp01.webp',
        'bzhp02.webp',
    ],
    portrait: [
        'bzsp01.webp',
        'bzsp02.webp',
    ],
    any: []
};

/**
 * 横/竖屏子目录名（对应 wallpaper/ 下文件夹）
 * 修改目录结构时需同步改这里
 */
export const WALLPAPER_DIR = {
    landscape: 'Landscape',
    portrait: 'Portrait'
};


/**
 * 本地图标目录（相对站点根路径）
 *
 * 性能说明：
 *   不会自动扫描目录（静态站无法可靠枚举文件）。
 *   请把图标放入 icons/ 后，在 LOCAL_ICONS 中登记，运行时 O(1) 命中，无 404 探测。
 *
 * 示例：
 *   icons/github.com.png  →  LOCAL_ICONS: { 'github.com': 'github.com.png' }
 *   也可写完整相对路径：    { 'github.com': 'icons/github.com.png' }
 */
export const LOCAL_ICON_DIR = 'icons';

/**
 * 域名 → 文件名（或相对路径）映射。空对象表示不使用本地图标，全部走在线 favicon。
 * @type {Record<string, string>}
 */
export const LOCAL_ICONS = {
    // 'github.com': 'github.com.png',
    // 'bilibili.com': 'bilibili.com.webp',
};
