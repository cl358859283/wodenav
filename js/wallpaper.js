/**
 * =============================================================================
 * wallpaper.js - 壁纸系统（本地 / API / 网络图）
 * =============================================================================
 *
 * 职责：
 *   - 四种模式：default（主题自带）/ local（本地横竖屏）/ api / network
 *   - 本地模式按设备方向自动选择 Landscape 或 Portrait 池
 *   - 旋转屏幕时平滑切换方向池并记住各自索引
 *   - API 模式支持 {width}/{height} 占位与常见随机图接口自动改写
 *   - 网络模式支持直链或本地上传生成的 Data URL
 *
 * 依赖：config.js（LOCAL_WALLPAPERS / WALLPAPER_DIR）、dialogs.js
 * 被依赖：app.js
 *
 * 存储 key：nav_wallpaper
 *
 * 关键状态：
 *   wallpaperState = {
 *     mode: 'default'|'local'|'api'|'network',
 *     cache: string[],           // 当前方向可用图片 URL
 *     currentIndex: number,
 *     apiUrl: string,
 *     networkUrl: string,
 *     indexByOrient: { landscape: number, portrait: number }
 *   }
 */
import { LOCAL_WALLPAPERS, WALLPAPER_DIR } from './config.js';
import { showAlert } from './dialogs.js';

// ========== 壁纸模式 ==========

const WALLPAPER_STORAGE_KEY = 'nav_wallpaper';

/** url -> 'landscape' | 'portrait' | 'square' | 'unknown' */
const wallpaperOrientCache = Object.create(null);

let wallpaperState = {
    mode: 'default',        // default | local | api | network
    cache: [],              // string[] image urls（当前方向可用的列表）
    currentIndex: 0,
    apiUrl: '',
    networkUrl: '',
    /** 各方向独立记住索引，旋转屏幕时更顺滑 */
    indexByOrient: { landscape: 0, portrait: 0 }
};

/** 当前设备方向：landscape | portrait */
function getDeviceOrientation() {
    try {
        if (window.matchMedia) {
            if (window.matchMedia('(orientation: portrait)').matches) return 'portrait';
            if (window.matchMedia('(orientation: landscape)').matches) return 'landscape';
        }
    } catch (_) { /* ignore */ }
    return window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
}

function normalizeLocalWallpaperName(f) {
    return String(f || '').replace(/^\.?\/?wallpaper\//, '').replace(/^\/+/, '').trim();
}

/**
 * 将配置项解析为实际 URL 路径（wallpaper/...）
 * @param {string} file 文件名或已含子目录的相对路径
 * @param {'landscape'|'portrait'|null} orientBucket 所属方向桶
 */
function resolveLocalWallpaperPath(file, orientBucket) {
    let name = normalizeLocalWallpaperName(file);
    if (!name) return '';
    // 已写明 Landscape/ 或 Portrait/ 则不再拼接
    if (/^(landscape|portrait)\//i.test(name)) {
        const parts = name.split('/');
        parts[0] = parts[0].toLowerCase() === 'landscape'
            ? WALLPAPER_DIR.landscape
            : WALLPAPER_DIR.portrait;
        return `wallpaper/${parts.join('/')}`;
    }
    if (orientBucket === 'landscape') {
        return `wallpaper/${WALLPAPER_DIR.landscape}/${name}`;
    }
    if (orientBucket === 'portrait') {
        return `wallpaper/${WALLPAPER_DIR.portrait}/${name}`;
    }
    return `wallpaper/${name}`;
}

function guessOrientFromFilename(name) {
    const n = String(name || '').toLowerCase();
    // 子目录优先：wallpaper/Landscape/xxx 或 Landscape/xxx
    if (n.includes('/landscape/') || n.includes('landscape/') || /(^|\/)landscape(\/|$)/.test(n)) {
        return 'landscape';
    }
    if (n.includes('/portrait/') || n.includes('portrait/') || /(^|\/)portrait(\/|$)/.test(n)) {
        return 'portrait';
    }
    if (/(^|[-_/])(h|horiz|wide)([-_.]|$)/i.test(n)) return 'landscape';
    if (/(^|[-_/])(v|vert|tall)([-_.]|$)/i.test(n)) return 'portrait';
    return null;
}

function classifyByAspect(w, h) {
    if (!w || !h) return 'unknown';
    const ratio = w / h;
    if (ratio >= 1.12) return 'landscape';
    if (ratio <= 0.9) return 'portrait';
    return 'square';
}

/**
 * 探测图片是否可加载，并返回方向。
 * 返回 'landscape' | 'portrait' | 'square' | 'unknown' | null（加载失败）。
 * 始终真正发起请求，避免配置了不存在的文件时仍被计入数量。
 */
function probeImageOrientation(url, forcedOrient = null) {
    if (!url) return Promise.resolve(null);
    // 已成功探测过的直接返回（失败结果不缓存为有效方向）
    if (wallpaperOrientCache[url] && wallpaperOrientCache[url] !== 'invalid') {
        return Promise.resolve(wallpaperOrientCache[url]);
    }
    if (wallpaperOrientCache[url] === 'invalid') {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        const img = new Image();
        let settled = false;
        const done = (orient) => {
            if (settled) return;
            settled = true;
            if (orient) {
                wallpaperOrientCache[url] = orient;
            } else {
                wallpaperOrientCache[url] = 'invalid';
            }
            resolve(orient);
        };
        img.onload = () => {
            // 优先使用配置强制方向，其次按宽高比，最后按文件名猜测
            const byAspect = classifyByAspect(img.naturalWidth, img.naturalHeight);
            const byName = guessOrientFromFilename(url);
            done(forcedOrient || byAspect || byName || 'unknown');
        };
        img.onerror = () => done(null);
        setTimeout(() => {
            // 超时仍未完成则视为失败，避免挂起
            if (!settled) done(null);
        }, 4000);
        img.src = url;
    });
}

/** 展开 LOCAL_WALLPAPERS 为带方向提示的 url 列表 */
function expandLocalWallpaperEntries() {
    const entries = [];
    const pushList = (list, forcedOrient) => {
        (list || []).forEach((f) => {
            const url = resolveLocalWallpaperPath(f, forcedOrient);
            if (!url) return;
            entries.push({
                url,
                forcedOrient: forcedOrient || guessOrientFromFilename(url)
            });
        });
    };
    if (Array.isArray(LOCAL_WALLPAPERS)) {
        // 兼容旧写法：纯数组（放在 wallpaper/ 根目录，自动探测方向）
        pushList(LOCAL_WALLPAPERS, null);
    } else if (LOCAL_WALLPAPERS && typeof LOCAL_WALLPAPERS === 'object') {
        pushList(LOCAL_WALLPAPERS.landscape, 'landscape');
        pushList(LOCAL_WALLPAPERS.portrait, 'portrait');
        pushList(LOCAL_WALLPAPERS.any, null);
    }
    return entries;
}

async function buildOrientedLocalCache() {
    const orient = getDeviceOrientation();
    const entries = expandLocalWallpaperEntries();
    if (!entries.length) {
        wallpaperState.cache = [];
        return { orient, list: [] };
    }

    // 对每张图真正探测可加载性；失败的不进入缓存，避免数量统计错误
    const results = await Promise.all(entries.map(async (e) => {
        const o = await probeImageOrientation(e.url, e.forcedOrient);
        return { url: e.url, orient: o };
    }));

    const preferred = [];
    const fallback = [];
    results.forEach(({ url, orient: o }) => {
        // 加载失败（null）直接丢弃，不计入数量
        if (!o || o === 'invalid') return;
        if (o === orient || o === 'square') {
            preferred.push(url);
        } else {
            fallback.push(url);
        }
    });

    // 优先当前方向，不足时用另一方向补齐
    const list = preferred.length ? preferred : fallback;
    wallpaperState.cache = list;
    return { orient, list };
}

/** 按方向调整 API URL（常见随机图接口注入宽高） */
function adaptApiUrlForOrientation(apiUrl) {
    const orient = getDeviceOrientation();
    const isPortrait = orient === 'portrait';
    // 手机竖屏用较高图，桌面横屏用宽图
    const w = isPortrait ? 1080 : 1920;
    const h = isPortrait ? 1920 : 1080;
    let url = (apiUrl || '').trim();
    if (!url) return url;

    // 已含明确尺寸的占位则替换
    if (/\{width\}|\{height\}|\{w\}|\{h\}/i.test(url)) {
        return url
            .replace(/\{width\}|\{w\}/gi, String(w))
            .replace(/\{height\}|\{h\}/gi, String(h));
    }
    // unsplash source / picsum 等常见写法
    if (/source\.unsplash\.com/i.test(url)) {
        return url.replace(/\/\d+x\d+/, `/${w}x${h}`).replace(/\/random\/?$/, `/random/${w}x${h}`);
    }
    if (/picsum\.photos/i.test(url)) {
        return url.replace(/\/\d+\/\d+/, `/${w}/${h}`).replace(/picsum\.photos\/?$/, `picsum.photos/${w}/${h}`);
    }
    return url;
}

/** 屏幕方向变化时切换到对应壁纸池 */
async function onDeviceOrientationChange() {
    if (wallpaperState.mode !== 'local') {
        // API：仅在用户点「换一张」时按新尺寸拉取；网络图靠 CSS cover 裁切
        document.body.dataset.deviceOrient = getDeviceOrientation();
        return;
    }
    const prevOrient = document.body.dataset.deviceOrient || '';
    const orient = getDeviceOrientation();
    document.body.dataset.deviceOrient = orient;
    if (prevOrient === orient && wallpaperState.cache.length) return;

    // 记住离开方向的索引
    if (prevOrient === 'landscape' || prevOrient === 'portrait') {
        wallpaperState.indexByOrient[prevOrient] = wallpaperState.currentIndex;
    }

    await buildOrientedLocalCache();
    if (!wallpaperState.cache.length) {
        applyWallpaperUrl('');
        updateWallpaperCacheUI();
        return;
    }
    const idx = wallpaperState.indexByOrient[orient] || 0;
    setCurrentWallpaperByIndex(idx);
}

function bindOrientationWatcher() {
    const handler = () => {
        // 旋转动画过程中尺寸会抖动，稍延迟再算
        clearTimeout(bindOrientationWatcher._t);
        bindOrientationWatcher._t = setTimeout(() => {
            onDeviceOrientationChange().catch(() => {});
        }, 180);
    };
    window.addEventListener('orientationchange', handler);
    window.addEventListener('resize', handler);
    try {
        if (window.matchMedia) {
            const mql = window.matchMedia('(orientation: portrait)');
            if (mql.addEventListener) mql.addEventListener('change', handler);
            else if (mql.addListener) mql.addListener(handler);
        }
    } catch (_) { /* ignore */ }
    document.body.dataset.deviceOrient = getDeviceOrientation();
}

function loadWallpaperState() {
    try {
        const raw = localStorage.getItem(WALLPAPER_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                wallpaperState.mode = ['default', 'local', 'api', 'network'].includes(parsed.mode) ? parsed.mode : 'default';
                wallpaperState.cache = Array.isArray(parsed.cache) ? parsed.cache.filter(u => typeof u === 'string' && u) : [];
                wallpaperState.currentIndex = Number.isFinite(parsed.currentIndex) ? parsed.currentIndex : 0;
                wallpaperState.apiUrl = typeof parsed.apiUrl === 'string' ? parsed.apiUrl : '';
                wallpaperState.networkUrl = typeof parsed.networkUrl === 'string' ? parsed.networkUrl : '';
                if (parsed.indexByOrient && typeof parsed.indexByOrient === 'object') {
                    wallpaperState.indexByOrient = {
                        landscape: Number.isFinite(parsed.indexByOrient.landscape) ? parsed.indexByOrient.landscape : 0,
                        portrait: Number.isFinite(parsed.indexByOrient.portrait) ? parsed.indexByOrient.portrait : 0
                    };
                }
            }
        }
    } catch (_) { /* ignore */ }
}

function saveWallpaperState() {
    try {
        const orient = getDeviceOrientation();
        if (orient === 'landscape' || orient === 'portrait') {
            wallpaperState.indexByOrient[orient] = wallpaperState.currentIndex;
        }
        localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify({
            mode: wallpaperState.mode,
            cache: wallpaperState.cache.slice(0, 30),
            currentIndex: wallpaperState.currentIndex,
            apiUrl: wallpaperState.apiUrl,
            networkUrl: wallpaperState.networkUrl,
            indexByOrient: wallpaperState.indexByOrient
        }));
    } catch (_) { /* ignore */ }
}

function updateWallpaperCacheUI() {
    const el = document.getElementById('wallpaperCacheText');
    if (el) {
        const n = wallpaperState.cache.length;
        const orient = getDeviceOrientation();
        const orientLabel = orient === 'portrait' ? '竖屏' : '横屏';
        el.textContent = n > 0
            ? `当前缓存 · ${orientLabel}可用 ${n} 张壁纸`
            : '当前缓存 · 暂无壁纸';
    }
}

export function applyWallpaperUrl(url) {
    if (!url) {
        document.body.classList.remove('has-wallpaper');
        document.documentElement.style.removeProperty('--wallpaper-image');
        return;
    }
    // 注意：--wallpaper-image 在 components.css 中被 var() 引用，
    // 相对路径会按该样式表（/css/）而不是页面本身来解析，因此这里
    // 必须转换成绝对 URL，否则本地壁纸等相对路径会 404。
    let resolved = url;
    if (!/^(https?:)?\/\//i.test(url) && !url.startsWith('data:')) {
        resolved = new URL(url, document.baseURI).href;
    }
    document.documentElement.style.setProperty('--wallpaper-image', `url("${resolved.replace(/"/g, '\\"')}")`);
    document.body.classList.add('has-wallpaper');
}

function setCurrentWallpaperByIndex(idx) {
    if (!wallpaperState.cache.length) {
        applyWallpaperUrl('');
        updateWallpaperCacheUI();
        return;
    }
    const i = ((idx % wallpaperState.cache.length) + wallpaperState.cache.length) % wallpaperState.cache.length;
    wallpaperState.currentIndex = i;
    applyWallpaperUrl(wallpaperState.cache[i]);
    updateWallpaperCacheUI();
    saveWallpaperState();
}

function addToWallpaperCache(url, preferFront = false) {
    if (!url || typeof url !== 'string') return;
    const clean = url.trim();
    if (!clean) return;
    const existing = wallpaperState.cache.indexOf(clean);
    if (existing !== -1) {
        wallpaperState.cache.splice(existing, 1);
    }
    if (preferFront) {
        wallpaperState.cache.unshift(clean);
    } else {
        wallpaperState.cache.push(clean);
    }
    if (wallpaperState.cache.length > 30) {
        wallpaperState.cache = wallpaperState.cache.slice(0, 30);
    }
}

async function resolveApiWallpaper(apiUrl) {
    const url = (apiUrl || '').trim();
    if (!url) throw new Error('请填写 API 地址');
    if (/\.(jpe?g|png|webp|gif|avif|bmp)(\?|$)/i.test(url) || /\/image|\/photo|\/wallpaper/i.test(url)) {
        return url;
    }
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API 请求失败 (${res.status})`);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('image/')) {
        return url;
    }
    const text = await res.text();
    try {
        const data = JSON.parse(text);
        const candidate =
            data.url || data.img || data.image || data.src ||
            data.data?.url || data.data?.img || data.data?.image ||
            (Array.isArray(data.images) && (data.images[0]?.url || data.images[0])) ||
            (Array.isArray(data) && (data[0]?.url || data[0]));
        if (typeof candidate === 'string' && candidate) {
            return candidate;
        }
    } catch (_) {
        const line = text.trim().split(/\s+/)[0];
        if (/^https?:\/\//i.test(line)) return line;
    }
    throw new Error('无法从 API 解析出图片地址');
}

async function ensureModeCache(mode) {
    if (mode === 'local') {
        await buildOrientedLocalCache();
        return;
    }
    if (mode === 'api') {
        if (wallpaperState.apiUrl) {
            try {
                const adapted = adaptApiUrlForOrientation(wallpaperState.apiUrl);
                const one = await resolveApiWallpaper(adapted);
                wallpaperState.cache = [one];
            } catch (e) {
                console.warn(e);
            }
        }
        return;
    }
    if (mode === 'network') {
        return;
    }
}

export function switchWallpaperMode(mode) {
    if (!['default', 'local', 'api', 'network'].includes(mode)) mode = 'default';
    wallpaperState.mode = mode;
    document.querySelectorAll('.wallpaper-mode-btn').forEach(btn => {
        const active = btn.dataset.mode === mode;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.wallpaper-mode-panel').forEach(p => {
        p.hidden = true;
    });
    const panelMap = {
        default: 'wallpaperPanelDefault',
        local: 'wallpaperPanelLocal',
        api: 'wallpaperPanelApi',
        network: 'wallpaperPanelNetwork'
    };
    const panel = document.getElementById(panelMap[mode]);
    if (panel) panel.hidden = false;

    const apiInput = document.getElementById('wallpaperApiUrl');
    const netInput = document.getElementById('wallpaperNetworkUrl');
    if (apiInput) apiInput.value = wallpaperState.apiUrl || '';
    if (netInput) netInput.value = wallpaperState.networkUrl || '';

    if (mode === 'default') {
        applyWallpaperUrl('');
        updateWallpaperCacheUI();
    }

    saveWallpaperState();
}

export async function refreshWallpaper() {
    const btns = [
        document.getElementById('wallpaperRefreshBtn')
    ].filter(Boolean);
    btns.forEach(b => { b.disabled = true; });
    try {
        const mode = wallpaperState.mode;
        if (mode === 'default') {
            // 默认模式下：若有本地壁纸则切入本地并换一张，否则提示去设置
            await ensureModeCache('local');
            if (wallpaperState.cache.length) {
                wallpaperState.mode = 'local';
                document.querySelectorAll('.wallpaper-mode-btn').forEach(btn => {
                    const active = btn.dataset.mode === 'local';
                    btn.classList.toggle('active', active);
                    btn.setAttribute('aria-selected', active ? 'true' : 'false');
                });
                document.querySelectorAll('.wallpaper-mode-panel').forEach(p => { p.hidden = true; });
                const panel = document.getElementById('wallpaperPanelLocal');
                if (panel) panel.hidden = false;
                setCurrentWallpaperByIndex(wallpaperState.currentIndex + 1);
                saveWallpaperState();
                return;
            }
            await showAlert('当前为默认背景。请先在「设置 → 外观」选择本地 / API / 网络壁纸，或将图片放入 wallpaper 目录。');
            return;
        }
        if (mode === 'local') {
            await ensureModeCache('local');
            if (!wallpaperState.cache.length) {
                await showAlert('本地壁纸列表为空。请把图片放到 wallpaper/Landscape 或 wallpaper/Portrait，并在 js/config.js 的 LOCAL_WALLPAPERS 中登记文件名。');
                return;
            }
            setCurrentWallpaperByIndex(wallpaperState.currentIndex + 1);
            return;
        }
        if (mode === 'api') {
            const apiUrl = (document.getElementById('wallpaperApiUrl')?.value || wallpaperState.apiUrl || '').trim();
            wallpaperState.apiUrl = apiUrl;
            if (!apiUrl) {
                await showAlert('请先填写 API 地址。');
                return;
            }
            const adapted = adaptApiUrlForOrientation(apiUrl);
            const url = await resolveApiWallpaper(adapted);
            addToWallpaperCache(url, true);
            setCurrentWallpaperByIndex(0);
            return;
        }
        if (mode === 'network') {
            const netUrl = (document.getElementById('wallpaperNetworkUrl')?.value || wallpaperState.networkUrl || '').trim();
            if (netUrl) {
                if (!/^https?:\/\//i.test(netUrl) && !netUrl.startsWith('data:image/')) {
                    await showAlert('请输入以 http://、https:// 开头的图片链接，或使用上传功能');
                    return;
                }
                wallpaperState.networkUrl = netUrl.startsWith('data:') ? '' : netUrl;
                addToWallpaperCache(netUrl, true);
                setCurrentWallpaperByIndex(0);
                return;
            }
            if (!wallpaperState.cache.length) {
                await showAlert('请先添加网络图片 URL 或上传图片。');
                return;
            }
            setCurrentWallpaperByIndex(wallpaperState.currentIndex + 1);
            return;
        }
    } catch (err) {
        await showAlert('获取壁纸失败：' + (err.message || '未知错误'));
    } finally {
        btns.forEach(b => { b.disabled = false; });
        updateWallpaperCacheUI();
        saveWallpaperState();
    }
}

/** 恢复默认壁纸（清空自定义模式与缓存引用） */
export function resetWallpaperToDefault() {
    wallpaperState.mode = 'default';
    wallpaperState.cache = [];
    wallpaperState.currentIndex = 0;
    wallpaperState.apiUrl = '';
    wallpaperState.networkUrl = '';
    wallpaperState.indexByOrient = { landscape: 0, portrait: 0 };
    saveWallpaperState();
    switchWallpaperMode('default');
    const apiInput = document.getElementById('wallpaperApiUrl');
    const netInput = document.getElementById('wallpaperNetworkUrl');
    if (apiInput) apiInput.value = '';
    if (netInput) netInput.value = '';
    updateWallpaperCacheUI();
}

export function initWallpaper() {
    loadWallpaperState();
    switchWallpaperMode(wallpaperState.mode);
    bindOrientationWatcher();

    if (wallpaperState.mode === 'default') {
        applyWallpaperUrl('');
    } else if (wallpaperState.mode === 'local') {
        ensureModeCache('local').then(() => {
            if (!wallpaperState.cache.length) return;
            const orient = getDeviceOrientation();
            const idx = wallpaperState.indexByOrient[orient] || wallpaperState.currentIndex || 0;
            setCurrentWallpaperByIndex(idx);
        });
    } else if (wallpaperState.cache.length) {
        setCurrentWallpaperByIndex(wallpaperState.currentIndex);
    }

    updateWallpaperCacheUI();

    document.querySelectorAll('.wallpaper-mode-btn').forEach(btn => {
        btn.onclick = () => {
            const next = btn.dataset.mode;
            switchWallpaperMode(next);
            if (next === 'default') {
                return;
            }
            if (next === 'local') {
                ensureModeCache('local').then(() => {
                    updateWallpaperCacheUI();
                    if (wallpaperState.cache.length) {
                        const orient = getDeviceOrientation();
                        const idx = wallpaperState.indexByOrient[orient] || 0;
                        setCurrentWallpaperByIndex(idx);
                    }
                });
            }
        };
    });

    const refreshBtn = document.getElementById('wallpaperRefreshBtn');
    if (refreshBtn) refreshBtn.onclick = () => refreshWallpaper();

    // API：回车应用
    const apiInput = document.getElementById('wallpaperApiUrl');
    if (apiInput) {
        apiInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await refreshWallpaper();
            }
        });
        apiInput.addEventListener('change', () => {
            wallpaperState.apiUrl = (apiInput.value || '').trim();
            saveWallpaperState();
        });
    }

    // 网络图片：回车应用
    const netInput = document.getElementById('wallpaperNetworkUrl');
    if (netInput) {
        netInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await refreshWallpaper();
            }
        });
        netInput.addEventListener('change', () => {
            const val = (netInput.value || '').trim();
            if (val && !val.startsWith('data:')) {
                wallpaperState.networkUrl = val;
                saveWallpaperState();
            }
        });
    }

    // 本地上传图片 → Data URL
    const uploadBtn = document.getElementById('wallpaperUploadBtn');
    const fileInput = document.getElementById('wallpaperFileInput');
    if (uploadBtn && fileInput) {
        uploadBtn.onclick = () => fileInput.click();
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files && fileInput.files[0];
            fileInput.value = '';
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                await showAlert('请选择图片文件');
                return;
            }
            // 限制约 4MB，避免 localStorage 爆掉
            if (file.size > 4 * 1024 * 1024) {
                await showAlert('图片过大（建议 < 4MB）。请压缩后再上传，或使用在线图床获取直链。');
                return;
            }
            try {
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('读取文件失败'));
                    reader.readAsDataURL(file);
                });
                if (netInput) netInput.value = dataUrl;
                addToWallpaperCache(dataUrl, true);
                setCurrentWallpaperByIndex(0);
                updateWallpaperCacheUI();
                saveWallpaperState();
            } catch (err) {
                await showAlert(err.message || '上传失败');
            }
        });
    }
}

