/**
 * =============================================================================
 * utils.js - 通用工具函数库
 * =============================================================================
 *
 * 职责：
 *   - 防抖 / 节流
 *   - 安全的 localStorage 读写（配额满、隐私模式、禁用时静默失败）
 *   - HTML 转义、URL 规范化、域名提取
 *   - 数组重排序
 *   - 移动端长按拖拽排序（核心交互）
 *
 * 依赖：无（纯工具，不依赖其他业务模块）
 * 被依赖：app.js、theme.js、wallpaper.js 等
 *
 * 设计要点：
 *   - 所有 localStorage 操作都经过 try/catch，避免在严格模式下崩溃
 *   - 长按拖拽与桌面 HTML5 DnD 分离，优先保证手机体验
 *   - isMobile() 断点与 CSS 抽屉侧边栏保持一致（≤1024px）
 */

/**
 * 防抖：在连续触发后等待 wait 毫秒再执行，期间重新触发会重置计时
 * 常用于搜索输入、窗口 resize 等高频事件
 * @param {Function} fn  要防抖的函数
 * @param {number} [wait=180] 等待毫秒
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, wait = 180) {
    let t = null;
    return function debounced(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

/**
 * 节流：保证在 wait 毫秒内最多执行一次
 * 支持尾调用（最后一次触发会在剩余时间后执行）
 * @param {Function} fn
 * @param {number} [wait=100]
 * @returns {Function}
 */
export function throttle(fn, wait = 100) {
    let last = 0;
    let timer = null;
    return function throttled(...args) {
        const now = Date.now();
        const remaining = wait - (now - last);
        if (remaining <= 0) {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            last = now;
            fn.apply(this, args);
        } else if (!timer) {
            timer = setTimeout(() => {
                last = Date.now();
                timer = null;
                fn.apply(this, args);
            }, remaining);
        }
    };
}

/* -------------------------------------------------------------------------- */
/*                              localStorage 安全封装                          */
/* -------------------------------------------------------------------------- */

/**
 * 安全读取 localStorage
 * 在隐私模式、配额满、禁用存储时返回 null，不抛异常
 * @param {string} key
 * @returns {string|null}
 */
export function safeLocalGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (_) {
        return null;
    }
}

/**
 * 安全写入 localStorage
 * @param {string} key
 * @param {string} value
 * @returns {boolean} 是否写入成功
 */
export function safeLocalSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * 安全删除 localStorage 项
 * @param {string} key
 * @returns {boolean}
 */
export function safeLocalRemove(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (_) {
        return false;
    }
}

/* -------------------------------------------------------------------------- */
/*                              字符串 / URL 工具                              */
/* -------------------------------------------------------------------------- */

/**
 * HTML 转义，防止 XSS（用于动态插入到 innerHTML 的文本）
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * 判断当前是否为「抽屉侧边栏」布局断点
 * 手机 + 平板竖屏均使用抽屉 + 遮罩（与 CSS @media max-width: 1024px 对齐）
 * @returns {boolean}
 */
export function isMobile() {
    return window.innerWidth <= 1024;
}

/**
 * 从 URL 中提取 hostname（自动补全协议）
 * @param {string} url
 * @returns {string} 失败时返回空字符串
 */
export function getDomain(url) {
    try {
        let u = (url || '').trim();
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        return new URL(u).hostname;
    } catch {
        return '';
    }
}

/**
 * 规范化 URL：若缺少协议则补上 https://
 * @param {string} url
 * @returns {string}
 */
export function formatUrl(url) {
    let u = (url || '').trim();
    return /^https?:\/\//i.test(u) ? u : 'https://' + u;
}

/**
 * 原地重排序数组元素
 * @param {Array} arr
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {boolean} 是否实际发生了移动
 */
export function reorderArray(arr, fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return false;
    if (fromIndex >= arr.length || toIndex >= arr.length) return false;
    const [item] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, item);
    return true;
}

/**
 * 判断事件目标是否属于「交互控件」，拖拽时应忽略
 * （按钮、输入框、链接等不应启动拖拽）
 * @param {EventTarget} target
 * @returns {boolean}
 */
export function isInteractiveDragTarget(target) {
    if (!target || !target.closest) return false;
    return !!(
        target.closest('button') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('a') ||
        target.closest('label') ||
        target.closest('.manage-title-input') ||
        target.closest('.manage-link-checkbox') ||
        target.closest('.manage-sub-btn') ||
        target.closest('.settings-close-btn')
    );
}

/**
 * 触摸 / 粗指针设备优先长按拖拽，避免原生 HTML5 drag 在滚动时误触发
 */
export function preferTouchLongPress() {
    try {
        if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    } catch (_) { /* ignore */ }
    return !!(
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0 && window.innerWidth <= 1024)
    );
}

/**
 * 清除容器内所有 .drag-over 高亮类
 * @param {HTMLElement|null} container
 */
export function clearDragOverClasses(container) {
    if (!container) return;
    container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

/* -------------------------------------------------------------------------- */
/*                         移动端长按拖拽排序（核心）                            */
/* -------------------------------------------------------------------------- */

/**
 * 绑定移动端长按拖拽排序
 *
 * 交互流程：
 *   1. touchstart → 启动计时器（默认 380ms）
 *   2. 长按期间若移动超过 moveCancelPx → 取消，视为滚动
 *   3. 计时结束 → 进入拖拽态：锁定滚动、生成跟随手指的 ghost、震动反馈
 *   4. touchmove → 更新 ghost 位置 + 高亮落点
 *   5. touchend → 计算目标索引，调用 onReorder，阻止后续合成 click
 *
 * 设计决策：
 *   - 与桌面 HTML5 DnD 完全分离，避免 polyfill 冲突
 *   - 使用 dataset.lpDragBound 防止重复绑定
 *   - ghost 临时设置 pointer-events:none 以正确检测落点
 *
 * @param {HTMLElement} el 可拖元素
 * @param {object} options
 * @param {string} options.itemSelector          同组可落点选择器（相对 container）
 * @param {HTMLElement|string|Function} options.container 容器元素 / 选择器 / 返回容器的函数
 * @param {(fromIndex:number, toIndex:number) => void} options.onReorder
 * @param {() => number} options.getIndex         当前项在列表中的索引
 * @param {number} [options.longPressMs=520]      长按触发时间（设置页偏长，降低误触）
 * @param {number} [options.moveCancelPx=14]      长按前允许的抖动像素（略大便于滚动取消）
 * @param {string} [options.dragClass='dragging']
 * @param {string} [options.overClass='drag-over']
 * @param {(active:boolean) => void} [options.onDragStateChange]
 */
export function bindLongPressDrag(el, options) {
    if (!el || el.dataset.lpDragBound === '1') return;
    el.dataset.lpDragBound = '1';

    const {
        itemSelector,
        container: containerOpt,
        onReorder,
        getIndex,
        longPressMs = 520,
        moveCancelPx = 14,
        dragClass = 'dragging',
        overClass = 'drag-over',
        onDragStateChange
    } = options;

    let pressTimer = null;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let fromIndex = -1;
    let activeId = null;
    let lastOver = null;
    let ghost = null;

    const resolveContainer = () => {
        if (typeof containerOpt === 'function') return containerOpt();
        if (typeof containerOpt === 'string') return document.querySelector(containerOpt);
        return containerOpt || el.parentElement;
    };

    const clearTimer = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    const clearOver = () => {
        if (lastOver) {
            lastOver.classList.remove(overClass);
            lastOver = null;
        }
        const c = resolveContainer();
        if (c) c.querySelectorAll('.' + overClass).forEach(n => n.classList.remove(overClass));
    };

    const setBodyDrag = (on) => {
        document.body.classList.toggle('is-touch-dragging', on);
        if (on) {
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        } else {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        }
        if (typeof onDragStateChange === 'function') onDragStateChange(on);
    };

    const removeGhost = () => {
        if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
        ghost = null;
    };

    const createGhost = (x, y) => {
        removeGhost();
        ghost = el.cloneNode(true);
        ghost.classList.add('touch-drag-ghost');
        ghost.classList.remove(dragClass, overClass);
        ghost.setAttribute('aria-hidden', 'true');
        const rect = el.getBoundingClientRect();
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.transform = `translate3d(${x - rect.width / 2}px, ${y - rect.height / 2}px, 0)`;
        document.body.appendChild(ghost);
    };

    const moveGhost = (x, y) => {
        if (!ghost) return;
        const w = ghost.offsetWidth || 0;
        const h = ghost.offsetHeight || 0;
        ghost.style.transform = `translate3d(${x - w / 2}px, ${y - h / 2}px, 0)`;
    };

    const elementFromPointSafe = (x, y) => {
        // 临时隐藏 ghost，避免挡住落点检测
        if (ghost) ghost.style.pointerEvents = 'none';
        const node = document.elementFromPoint(x, y);
        if (ghost) ghost.style.pointerEvents = 'none';
        return node;
    };

    const findDropTarget = (x, y) => {
        const node = elementFromPointSafe(x, y);
        if (!node || !node.closest) return null;
        const item = node.closest(itemSelector);
        if (!item || item === el) return null;
        const c = resolveContainer();
        if (c && !c.contains(item)) return null;
        return item;
    };

    const startDrag = (x, y) => {
        clearTimer();
        dragging = true;
        fromIndex = typeof getIndex === 'function' ? getIndex() : Number(el.dataset.index);
        activeId = el.dataset.gid || el.dataset.sid || el.dataset.index || null;
        el.classList.add(dragClass);
        setBodyDrag(true);
        createGhost(x, y);
        try {
            if (navigator.vibrate) navigator.vibrate(12);
        } catch (_) { /* ignore */ }
    };

    const endDrag = (x, y, cancelled) => {
        clearTimer();
        const wasDragging = dragging;
        dragging = false;
        el.classList.remove(dragClass);
        clearOver();
        removeGhost();
        setBodyDrag(false);

        if (!wasDragging || cancelled) return;

        const target = findDropTarget(x, y);
        if (!target) return;
        const toIndex = Number(target.dataset.index);
        if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex) || fromIndex === toIndex) return;
        if (typeof onReorder === 'function') onReorder(fromIndex, toIndex);
        try {
            if (navigator.vibrate) navigator.vibrate([8, 30, 8]);
        } catch (_) { /* ignore */ }
    };

    const onTouchStart = (e) => {
        if (e.touches.length !== 1) return;
        // 点在交互控件上不启动长按，避免设置页误拖
        if (e.target && isInteractiveDragTarget(e.target)) {
            return;
        }
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        clearTimer();
        pressTimer = setTimeout(() => {
            startDrag(startX, startY);
        }, longPressMs);
    };

    const onTouchMove = (e) => {
        const t = e.touches[0];
        if (!t) return;
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;

        if (!dragging) {
            // 长按未触发前：位移过大视为滚动，取消长按
            if (pressTimer && (Math.abs(dx) > moveCancelPx || Math.abs(dy) > moveCancelPx)) {
                clearTimer();
            }
            return;
        }

        e.preventDefault();
        moveGhost(t.clientX, t.clientY);

        const target = findDropTarget(t.clientX, t.clientY);
        if (target !== lastOver) {
            if (lastOver) lastOver.classList.remove(overClass);
            lastOver = target;
            if (lastOver) lastOver.classList.add(overClass);
        }
    };

    const onTouchEnd = (e) => {
        const t = (e.changedTouches && e.changedTouches[0]) || null;
        const x = t ? t.clientX : startX;
        const y = t ? t.clientY : startY;
        const wasDragging = dragging;
        endDrag(x, y, false);
        // 若刚完成拖拽，阻止随后合成的 click
        if (wasDragging) {
            e.preventDefault();
            const blockClick = (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                el.removeEventListener('click', blockClick, true);
            };
            el.addEventListener('click', blockClick, true);
            setTimeout(() => el.removeEventListener('click', blockClick, true), 100);
        }
    };

    const onTouchCancel = () => {
        endDrag(startX, startY, true);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchCancel, { passive: true });
}
