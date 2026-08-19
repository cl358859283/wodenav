/**
 * =============================================================================
 * state.js - 全局共享状态与数据持久化
 * =============================================================================
 *
 * 职责：持有可变业务状态，提供 loadData / saveData / scheduleRender
 * 其他模块通过 import { S, loadData, saveData, scheduleRender } 访问
 */
import { DEFAULT_DATA } from './data.js';
import { safeLocalGet } from './utils.js';
import { showAlert } from './dialogs.js';

/** 共享可变状态（单一数据源） */
export const S = {
    groups: [],
    searchEngines: {},
    searchEngineKeys: [],
    currentEngine: 'baidu',
    engineOpen: false,
    sidebarCollapsed: true,
    activeGroupId: null,
    scrollObserver: null,
    currentHomeLayout: 'direct',
    folderPath: { groupId: null, subId: null },
    customIconPath: '',
    editingLinkId: null,
    editingEngineKey: null,
    manageAllCollapsed: false,
    manageSearchTimer: null,
    suppressFolderClick: false,
    dragState: null,
    clockTimer: null,
    renderScheduled: false,
};

/** @type {Function|null} */
let _renderFn = null;

export function setRenderFn(fn) {
    _renderFn = fn;
}

/** 合并同帧多次 render 请求，减少重排 */
export function scheduleRender(options) {
    if (S.renderScheduled) return;
    S.renderScheduled = true;
    requestAnimationFrame(() => {
        S.renderScheduled = false;
        if (_renderFn) _renderFn(options);
    });
}

export function loadData() {
    const raw = safeLocalGet('nav_data_v6');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('nav_data_v6 is not an array');
            S.groups = parsed;
            S.groups.forEach(g => {
                if (!g || typeof g !== 'object') return;
                if (g.desc === undefined) g.desc = '';
                if (g.collapsed === undefined) g.collapsed = false;
                if (!Array.isArray(g.subGroups)) g.subGroups = [];
                // 侧边栏二级目录展开状态：默认折叠
                if (g.sidebarExpanded === undefined) {
                    g.sidebarExpanded = false;
                }
                g.subGroups.forEach(s => {
                    if (!s || typeof s !== 'object') return;
                    if (!Array.isArray(s.links)) s.links = [];
                    s.links.forEach(l => {
                        if (!l || typeof l !== 'object') return;
                        l.isExternal = true;
                        if (l.isRocket === undefined) l.isRocket = false;
                        if (l.localIcon === undefined) l.localIcon = '';
                    });
                });
            });
            if (S.groups.length && !S.groups.find(g => g.id === S.activeGroupId)) {
                S.activeGroupId = S.groups[0].id;
            }
            return;
        } catch (err) {
            console.error("加载数据解析失败, 回滚默认数据", err);
        }
    }
    S.groups = JSON.parse(JSON.stringify(DEFAULT_DATA));
    if (S.groups.length) S.activeGroupId = S.groups[0].id;
}

export function saveData() {
    try {
        localStorage.setItem('nav_data_v6', JSON.stringify(S.groups));
    } catch (err) {
        if (err && (err.name === 'QuotaExceededError' || err.code === 22 || err.number === -2147024882)) {
            showAlert('本地存储空间已满（LocalStorage 配额超限）！建议先使用“同步”功能导出 JSON 备份，然后清理部分不需要的链接。');
        } else {
            console.error('保存数据时发生未知错误:', err);
            showAlert('保存数据失败，请检查浏览器存储设置。');
        }
    }
}
