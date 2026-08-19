/**
 * =============================================================================
 * app.js - 个人导航主应用入口（初始化与事件绑定）
 * =============================================================================
 *
 * 模块职责已按功能拆分，本文件仅负责 boot() 编排与事件绑定。
 *
 * 依赖模块：
 *   state.js          - 共享状态 / loadData / saveData / scheduleRender
 *   links.js          - 链接增删改、书签导入
 *   home-layout.js    - 首页布局模式
 *   sidebar.js        - 侧边栏
 *   search-engines.js - 搜索引擎
 *   categories.js     - 设置区可折叠区块辅助
 *   clock.js          - 时钟
 *   render.js         - 主页渲染
 *   manage.js         - 链接管理面板
 *   theme.js / wallpaper.js / dialogs.js / utils.js / data.js
 */
import { S, loadData, saveData, scheduleRender } from './state.js';
import {
    showMovePicker, openEditLinkModal, closeEditLinkModal, saveEditLink,
    updateIconPreview, updateEditLinkIconPreview, getLinkIconHtml,
    findLinkById, removeLinkById, removeLinksByIds, addSubGroupTo,
    importBookmarksFromFile, sameId, openIconPicker
} from './links.js';
import {
    HOME_LAYOUT_LABELS, loadHomeLayout, setHomeLayout, updateHomeLayoutUI,
    applyHomeLayout, initHomeLayout
} from './home-layout.js';
import {
    initSidebar, toggleSidebar, updateSidebarUI, renderSidebar,
    scrollToGroup, initScrollObserver, updateScrollObserver
} from './sidebar.js';
import {
    initSearchEngine, renderEngineList, updateEngineActive, saveSearchEnginesData,
    renderSearchEngineManageList, openEditEngineModal, closeEditEngineModal, saveEditEngine
} from './search-engines.js';
import {
    setupCollapsibleSection, collapseAllSettingsSections
} from './categories.js';
import { updateTime, startClock, stopClock, bindClockVisibility } from './clock.js';
import {
    render, createCard, createEmptyState, makeFolderCard,
    openFolderModal, closeFolderModal, renderFolderModalContent, initFolderModal,
    renderFolderLayout, switchTab, updateSelectOptions, updateBatchBarVisibility,
    setManageCollapseAll
} from './render.js';
import {
    renderManageList, setupManageListDelegation,
    setupGroupDrag, setupSubgroupDrag, setupLinkDrag
} from './manage.js';
import {
    debounce, throttle, escapeHtml, isMobile, getDomain, formatUrl,
    reorderArray, isInteractiveDragTarget, clearDragOverClasses,
    bindLongPressDrag, safeLocalGet, safeLocalSet
} from './utils.js';
import {
    openModal, closeModal, showAlert, showConfirm, showPrompt
} from './dialogs.js';
import {
    initTheme, initThemeModeSelect, initAppearanceSliders,
    toggleTheme, updateThemeModeUI, getCurrentThemeMode, resetAppearanceToDefaults,
    setThemeMode
} from './theme.js';
import { initWallpaper, resetWallpaperToDefault, refreshWallpaper } from './wallpaper.js';
import { DEFAULT_DATA, DEFAULT_ENGINES } from './data.js';

function boot() {
    initTheme();
    initHomeLayout();
    initFolderModal();
    loadData();
    scheduleRender();
    startClock();
    bindClockVisibility();
    initSidebar();
    initSearchEngine();
    initScrollObserver();

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // 初始同步 checkbox 状态（checked = 深色）
        themeToggle.checked = !document.documentElement.classList.contains('light-mode');
        themeToggle.addEventListener('change', () => {
            const next = themeToggle.checked ? 'dark' : 'light';
            setThemeMode(next);
        });
    }
    initThemeModeSelect();
    updateThemeModeUI(getCurrentThemeMode());
    initAppearanceSliders();
    initWallpaper();
    const settingsModal = document.getElementById('settingsModal');
    function openSettingsModal() {
        try { collapseAllSettingsSections(); } catch (e) { console.warn('collapseAllSettingsSections', e); }
        settingsModal.style.display = 'flex';
        settingsModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('settings-open');
        // 移动端锁定背景滚动
        if (isMobile()) document.body.style.overflow = 'hidden';
        try { updateSelectOptions(); } catch (e) { console.warn('updateSelectOptions', e); }
    }
    function closeSettingsModal() {
        settingsModal.style.display = 'none';
        settingsModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('settings-open');
        // 若侧边栏未打开，恢复滚动
        if (isMobile()) {
            const sidebar = document.getElementById('sidebar');
            const drawerOpen = sidebar && sidebar.classList.contains('mobile-open');
            if (!drawerOpen) document.body.style.overflow = '';
        } else {
            document.body.style.overflow = '';
        }
    }
    // 圆形展开菜单（方案A）
    const fabMenu = document.getElementById('fabMenu');
    const fabToggleBtn = document.getElementById('fabToggleBtn');
    if (fabMenu && fabToggleBtn) {
        fabToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = fabMenu.classList.toggle('open');
            fabToggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            fabToggleBtn.setAttribute('aria-label', isOpen ? '收起快捷菜单' : '展开快捷菜单');
        });
        // 点击页面其它区域收起
        document.addEventListener('click', (e) => {
            if (!fabMenu.contains(e.target) && fabMenu.classList.contains('open')) {
                fabMenu.classList.remove('open');
                fabToggleBtn.setAttribute('aria-expanded', 'false');
                fabToggleBtn.setAttribute('aria-label', '展开快捷菜单');
            }
        });
        // 设置
        const fabSettingsBtn = document.getElementById('fabSettingsBtn');
        if (fabSettingsBtn) {
            fabSettingsBtn.addEventListener('click', () => {
                fabMenu.classList.remove('open');
                fabToggleBtn.setAttribute('aria-expanded', 'false');
                openSettingsModal();
            });
        }
        // 换壁纸
        const fabWallpaperBtn = document.getElementById('fabWallpaperBtn');
        if (fabWallpaperBtn) {
            fabWallpaperBtn.addEventListener('click', () => {
                refreshWallpaper();
                fabMenu.classList.remove('open');
                fabToggleBtn.setAttribute('aria-expanded', 'false');
            });
        }
        // 聚焦搜索
        const fabSearchBtn = document.getElementById('fabSearchBtn');
        if (fabSearchBtn) {
            fabSearchBtn.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                fabMenu.classList.remove('open');
                fabToggleBtn.setAttribute('aria-expanded', 'false');
            });
        }
    }
    document.getElementById('btnCloseSettings').onclick = closeSettingsModal;
    settingsModal.onclick = (e) => {
        if (e.target === settingsModal) closeSettingsModal();
    };
    // Esc 关闭设置；其它弹窗由各自逻辑处理
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (settingsModal.style.display === 'flex') {
            // 若有嵌套确认框打开，优先留给确认框
            const nested = ['confirmModal', 'promptModal', 'alertModal', 'editLinkModal', 'editEngineModal', 'moveModal'];
            const anyNested = nested.some(id => {
                const el = document.getElementById(id);
                return el && el.style.display === 'flex';
            });
            if (!anyNested) {
                e.preventDefault();
                closeSettingsModal();
            }
        }
    });

    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.onclick = () => {
            const targetId = btn.dataset.tab;
            const targetPanel = targetId ? document.getElementById(targetId) : null;
            if (!targetPanel) return;

            document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            targetPanel.classList.add('active');

            if (targetId === 'tab-manage') {
                setManageCollapseAll(true);
                updateSelectOptions();
                const manageFilter = document.getElementById('manageSearchInput')?.value.trim().toLowerCase() || '';
                renderManageList(manageFilter);
            } else if (targetId === 'tab-engines') {
                const engineCard = document.getElementById('engineListCollapsible');
                const engineToggle = document.getElementById('engineListToggle');
                if (engineCard) engineCard.dataset.collapsed = 'true';
                if (engineToggle) engineToggle.setAttribute('aria-expanded', 'false');
                renderSearchEngineManageList();
            }
        };
    });

    const batchCancelBtn = document.getElementById('batchCancelBtn');
    if (batchCancelBtn) {
        batchCancelBtn.onclick = () => {
            document.querySelectorAll('.manage-link-checkbox').forEach(cb => cb.checked = false);
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
            updateBatchBarVisibility();
        };
    }

    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.onchange = () => {
            const isChecked = selectAllCheckbox.checked;
            document.querySelectorAll('.manage-link-checkbox').forEach(cb => cb.checked = isChecked);
            updateBatchBarVisibility();
        };
    }

    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    if (batchDeleteBtn) {
        batchDeleteBtn.onclick = async () => {
            const checkedBoxes = document.querySelectorAll('.manage-link-checkbox:checked');
            if (!checkedBoxes.length) return;
            const ok = await showConfirm(`确定要删除选中的 ${checkedBoxes.length} 个链接吗？此操作不可恢复。`, '批量删除');
            if (ok) {
                const ids = Array.from(checkedBoxes).map(cb => cb.dataset.linkId);
                removeLinksByIds(ids);
                saveData();
                scheduleRender();
            }
        };
    }

    const batchMoveBtn = document.getElementById('batchMoveBtn');
    if (batchMoveBtn) {
        batchMoveBtn.onclick = async () => {
            const checkedBoxes = document.querySelectorAll('.manage-link-checkbox:checked');
            if (!checkedBoxes.length) return;
            const target = await showMovePicker(`请选择要将这 ${checkedBoxes.length} 个链接移动到的目标二级分类`);
            if (!target) return;
            const ids = Array.from(checkedBoxes).map(cb => cb.dataset.linkId);
            const movedLinks = removeLinksByIds(ids);
            const destSub = S.groups.find(g => g.id === target.gid)?.subGroups.find(s => s.id === target.sid);
            if (destSub && movedLinks.length) {
                destSub.links.push(...movedLinks);
                saveData();
                scheduleRender();
                await showAlert(`成功移动 ${movedLinks.length} 个链接！`);
            }
        };
    }

    const manageSearchInput = document.getElementById('manageSearchInput');
    if (manageSearchInput) {
        const debouncedManageSearch = debounce((value) => {
            renderManageList(value.trim().toLowerCase());
        }, 160);
        manageSearchInput.oninput = (e) => debouncedManageSearch(e.target.value);
    }

    const manageCollapseAllBtn = document.getElementById('manageCollapseAllBtn');
    const manageExpandAllBtn = document.getElementById('manageExpandAllBtn');
    if (manageCollapseAllBtn) manageCollapseAllBtn.onclick = () => setManageCollapseAll(true);
    if (manageExpandAllBtn) manageExpandAllBtn.onclick = () => setManageCollapseAll(false);

    setupCollapsibleSection('engineListToggle', 'engineListCollapsible');

    const createNewFolderBtn = document.getElementById('createNewFolderBtn');
    const newFolderNameInput = document.getElementById('newFolderNameInput');
    const doCreateFolder = () => {
        const val = (newFolderNameInput?.value || '').trim();
        if (!val) {
            newFolderNameInput?.focus();
            return;
        }
        const newGid = 'g_' + Date.now();
        const newSid = 's_' + Date.now();
        S.groups.push({
            id: newGid,
            title: val,
            desc: '',
            collapsed: false,
            activeSubId: newSid,
            subGroups: [
                { id: newSid, title: '默认标签', fold: false, links: [] }
            ],
            links: []
        });
        if (newFolderNameInput) newFolderNameInput.value = '';
        saveData();
        scheduleRender();
        updateSelectOptions();
    };
    if (createNewFolderBtn) createNewFolderBtn.onclick = doCreateFolder;
    if (newFolderNameInput) {
        newFolderNameInput.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); doCreateFolder(); }
        };
    }

    const createNewSubGroupBtn = document.getElementById('createNewSubGroupBtn');
    const newSubGroupNameInput = document.getElementById('newSubGroupNameInput');
    const newSubGroupParentSelect = document.getElementById('newSubGroupParentSelect');
    const doCreateSubGroup = () => {
        const val = (newSubGroupNameInput?.value || '').trim();
        const gid = newSubGroupParentSelect?.value;
        if (!val) {
            newSubGroupNameInput?.focus();
            return;
        }
        if (!gid) return;
        const g = S.groups.find(item => item.id === gid);
        if (!g) return;
        addSubGroupTo(g, val);
        if (newSubGroupNameInput) newSubGroupNameInput.value = '';
        saveData();
        scheduleRender();
        updateSelectOptions();
    };
    if (createNewSubGroupBtn) createNewSubGroupBtn.onclick = doCreateSubGroup;
    if (newSubGroupNameInput) {
        newSubGroupNameInput.onkeydown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); doCreateSubGroup(); }
        };
    }

    const addNewEngineBtn = document.getElementById('addNewEngineBtn');
    const newEngineNameInput = document.getElementById('newEngineNameInput');
    const newEngineUrlInput = document.getElementById('newEngineUrlInput');
    const doAddNewEngine = async () => {
        const nameInput = document.getElementById('newEngineNameInput');
        const urlInput = document.getElementById('newEngineUrlInput');
        const rocketInput = document.getElementById('newEngineRocketInput');
        const name = (nameInput?.value || '').trim();
        const url = (urlInput?.value || '').trim();
        const isRocket = !!(rocketInput?.checked);

        if (!name || !url) {
            await showAlert('请填写搜索引擎名称和 URL！');
            return;
        }

        const key = 'eng_' + Date.now();
        S.searchEngines[key] = { name, url, isRocket };
        S.searchEngineKeys.push(key);

        if (nameInput) nameInput.value = '';
        if (urlInput) urlInput.value = '';
        if (rocketInput) rocketInput.checked = false;

        saveSearchEnginesData();
        renderSearchEngineManageList();
        await showAlert('添加搜索引擎成功！');
    };
    if (addNewEngineBtn) addNewEngineBtn.onclick = doAddNewEngine;
    // 在名称/URL 输入框按回车直接添加，并阻止外层 form 误提交
    [newEngineNameInput, newEngineUrlInput].forEach((el) => {
        if (!el) return;
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doAddNewEngine();
            }
        });
    });

    const addLinkForm = document.getElementById('addLinkForm');
    if (addLinkForm) {
        addLinkForm.onsubmit = async (e) => {
            e.preventDefault();
            // 仅在「添加链接」面板激活时处理，避免同步/外观等面板按回车误触发
            const addPanel = document.getElementById('tab-add');
            const enginesPanel = document.getElementById('tab-engines');
            if (enginesPanel && enginesPanel.classList.contains('active')) {
                // 搜索引擎面板回车：交给 doAddNewEngine（输入框 keydown 已处理，此处兜底）
                await doAddNewEngine();
                return;
            }
            if (addPanel && !addPanel.classList.contains('active')) {
                return;
            }
            const url = document.getElementById('linkUrlInput').value.trim();
            const name = document.getElementById('linkNameInput').value.trim();
            const descInput = document.getElementById('linkDescInput');
            const desc = descInput ? descInput.value.trim() : '';
            const gid = document.getElementById('linkGroupSelect').value;
            const sid = document.getElementById('linkSubGroupSelect').value;

            if (!url || !name || !gid || !sid) {
                await showAlert("请填写完整信息！");
                return;
            }

            const g = S.groups.find(item => item.id === gid);
            if (!g) return;
            const sub = g.subGroups.find(s => s.id === sid);
            if (!sub) return;

            sub.links.push({
                id: Date.now(),
                name: name,
                desc: desc,
                url: formatUrl(url),
                localIcon: S.customIconPath,
                isExternal: true,
                isRocket: document.getElementById('linkRocketInput').checked
            });

            saveData();
            scheduleRender();
            await showAlert("添加成功！");
            closeSettingsModal();
            addLinkForm.reset();
            S.customIconPath = '';
            updateIconPreview('');
        };
    }

    const linkGroupSelect = document.getElementById('linkGroupSelect');
    if (linkGroupSelect) {
        linkGroupSelect.onchange = () => {
            const gid = linkGroupSelect.value;
            const g = S.groups.find(item => item.id === gid);
            const subGroupSelect = document.getElementById('linkSubGroupSelect');
            if (!subGroupSelect || !g) return;

            subGroupSelect.innerHTML = '';
            g.subGroups.forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub.id;
                opt.innerText = sub.title;
                subGroupSelect.appendChild(opt);
            });
        };
    }

    const autoFetchBtn = document.getElementById('autoFetchBtn');
    if (autoFetchBtn) {
        autoFetchBtn.onclick = async () => {
            const urlInput = document.getElementById('linkUrlInput');
            let val = urlInput.value.trim();
            if (!val) {
                await showAlert("请先输入网址！");
                return;
            }
            if (!/^https?:\/\//i.test(val)) val = 'https://' + val;
            try {
                const uObj = new URL(val);
                const domain = uObj.hostname;
                const nameInput = document.getElementById('linkNameInput');
                if (!nameInput.value) {
                    let parts = domain.split('.');
                    if (parts.length >= 2) {
                        nameInput.value = parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
                    } else {
                        nameInput.value = domain;
                    }
                }
                updateIconPreview(`https://favicon.im/${domain}?larger=true`);
                await showAlert("已自动获取标题与图标候选！");
            } catch {
                await showAlert("网址格式不正确，无法自动抓取。");
            }
        };
    }

    const customIconBtn = document.getElementById('customIconBtn');
    if (customIconBtn) {
        customIconBtn.onclick = () => {
            openIconPicker((src) => {
                S.customIconPath = src || '';
                updateIconPreview(S.customIconPath);
            }, S.customIconPath || '');
        };
    }

    function normalizeImportedGroups(raw) {
        let data = raw;
        if (data && !Array.isArray(data) && Array.isArray(data.groups)) {
            data = data.groups;
        }
        // 支持从导出的 data.js 文本中解析出的 DEFAULT_DATA
        if (data && !Array.isArray(data) && Array.isArray(data.DEFAULT_DATA)) {
            data = data.DEFAULT_DATA;
        }
        if (!Array.isArray(data)) {
            throw new Error('根节点必须是数组，或包含 groups / DEFAULT_DATA 数组的对象');
        }
        return data.map((g, gi) => {
            if (!g || typeof g !== 'object') throw new Error(`第 ${gi + 1} 个分类格式无效`);
            const subGroups = Array.isArray(g.subGroups) ? g.subGroups : [];
            const normalizedSubs = subGroups.map((s, si) => {
                if (!s || typeof s !== 'object') throw new Error(`分类「${g.title || gi}」的第 ${si + 1} 个二级分类无效`);
                const links = Array.isArray(s.links) ? s.links : [];
                return {
                    id: s.id || ('s_' + Date.now() + '_' + gi + '_' + si),
                    title: String(s.title || '未命名'),
                    fold: !!s.fold,
                    manageCollapsed: !!s.manageCollapsed,
                    links: links.map((l, li) => ({
                        id: l.id != null ? l.id : (Date.now() + gi * 1000 + si * 100 + li),
                        name: String(l.name || '未命名链接'),
                        desc: String(l.desc || ''),
                        url: String(l.url || ''),
                        localIcon: String(l.localIcon || ''),
                        isExternal: true,
                        isRocket: !!l.isRocket
                    }))
                };
            });
            if (!normalizedSubs.length) {
                normalizedSubs.push({
                    id: 's_' + Date.now() + '_' + gi,
                    title: '默认',
                    fold: false,
                    links: []
                });
            }
            return {
                id: g.id || ('g_' + Date.now() + '_' + gi),
                title: String(g.title || '未命名分类'),
                desc: String(g.desc || ''),
                collapsed: !!g.collapsed,
                manageCollapsed: !!g.manageCollapsed,
                activeSubId: g.activeSubId || normalizedSubs[0].id,
                subGroups: normalizedSubs,
                links: []
            };
        });
    }

    /** 从 JSON 对象或 data.js 源码文本中解析出可导入的结构 */
    function parseImportPayload(text) {
        const trimmed = (text || '').trim();
        // 尝试直接 JSON
        try {
            return JSON.parse(trimmed);
        } catch { /* continue */ }

        // 尝试从 data.js 模块源码中提取 DEFAULT_DATA / DEFAULT_ENGINES
        // 支持 export const DEFAULT_DATA = [...]; 等形式
        const extractExport = (name) => {
            const re = new RegExp(
                '(?:export\\s+const\\s+' + name + '\\s*=\\s*)([\\[{][\\s\\S]*?)(?=;\\s*(?:export\\s+const|//|$)|;\\s*$)',
                'm'
            );
            const m = trimmed.match(re);
            if (!m) return null;
            try {
                // 使用 Function 在受限方式下求值数组/对象字面量
                return new Function('return (' + m[1] + ')')();
            } catch {
                return null;
            }
        };
        const defaultData = extractExport('DEFAULT_DATA');
        const defaultEngines = extractExport('DEFAULT_ENGINES');
        if (defaultData || defaultEngines) {
            return {
                version: 6,
                groups: defaultData || [],
                engines: defaultEngines || null,
                source: 'data.js'
            };
        }
        throw new Error('无法解析：既不是有效 JSON，也不是可识别的 data.js 模块');
    }

    function downloadTextFile(filename, content, mime) {
        const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    function buildFullBackupPayload() {
        return {
            version: 6,
            exportedAt: new Date().toISOString(),
            groups: S.groups,
            engines: S.searchEngines,
            engineKeys: S.searchEngineKeys,
            currentEngine: S.currentEngine
        };
    }

    function buildDataJsContent() {
        const header = `/**
 * 分类链接默认数据 & 搜索引擎配置
 * 可独立修改本文件来调整默认导航与搜索引擎
 *
 * 由导航页「同步 → 导出 data.js」生成
 * 生成时间: ${new Date().toISOString()}
 *
 * 部署到 GitHub Pages / Cloudflare Pages 后：
 * 其他设备清除本地导航数据即可加载本文件中的默认配置，实现多端同步。
 */
`;
        const dataStr = JSON.stringify(S.groups, null, 4);
        const enginesStr = JSON.stringify(S.searchEngines, null, 4);
        return (
            header +
            '/** 默认分类与链接数据 */\n' +
            'export const DEFAULT_DATA = ' + dataStr + ';\n\n' +
            '/** 默认搜索引擎配置 */\n' +
            'export const DEFAULT_ENGINES = ' + enginesStr + ';\n'
        );
    }

    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
        exportDataBtn.onclick = () => {
            const payload = buildFullBackupPayload();
            downloadTextFile(
                `nav_backup_${new Date().toISOString().slice(0, 10)}.json`,
                JSON.stringify(payload, null, 2),
                'application/json;charset=utf-8'
            );
        };
    }

    const exportDataJsBtn = document.getElementById('exportDataJsBtn');
    if (exportDataJsBtn) {
        exportDataJsBtn.onclick = () => {
            const content = buildDataJsContent();
            downloadTextFile('data.js', content, 'text/javascript;charset=utf-8');
        };
    }

    const importDataBtn = document.getElementById('importDataBtn');
    const importDataFileInput = document.getElementById('importDataFileInput');
    if (importDataBtn && importDataFileInput) {
        importDataBtn.onclick = () => importDataFileInput.click();
        importDataFileInput.onchange = async () => {
            const file = importDataFileInput.files && importDataFileInput.files[0];
            importDataFileInput.value = '';
            if (!file) return;
            let text;
            try {
                text = await file.text();
            } catch {
                await showAlert('读取文件失败，请重试。');
                return;
            }
            let parsed;
            try {
                parsed = parseImportPayload(text);
            } catch (err) {
                await showAlert('解析失败：' + (err.message || '请确认是本站导出的 JSON 或 data.js'));
                return;
            }
            let importedGroups;
            try {
                importedGroups = normalizeImportedGroups(parsed);
            } catch (err) {
                await showAlert('配置结构无效：' + (err.message || '未知错误'));
                return;
            }
            if (!importedGroups.length) {
                await showAlert('文件中没有可用的分类数据。');
                return;
            }

            const hasEngines = parsed && parsed.engines && typeof parsed.engines === 'object' && !Array.isArray(parsed.engines);
            let linkCount = 0;
            importedGroups.forEach(g => g.subGroups.forEach(s => { linkCount += s.links.length; }));
            const engineHint = hasEngines
                ? `，并恢复 ${Object.keys(parsed.engines).length} 个搜索引擎`
                : '';
            const ok = await showConfirm(
                `将用导入的数据覆盖当前导航（${importedGroups.length} 个分类 / ${linkCount} 条链接${engineHint}）。此操作不可撤销，建议先导出备份。是否继续？`,
                '导入配置'
            );
            if (!ok) return;

            S.groups = importedGroups;
            S.activeGroupId = S.groups[0]?.id || null;
            saveData();

            if (hasEngines) {
                S.searchEngines = JSON.parse(JSON.stringify(parsed.engines));
                if (Array.isArray(parsed.engineKeys) && parsed.engineKeys.length) {
                    S.searchEngineKeys = parsed.engineKeys.filter(k => S.searchEngines[k]);
                    Object.keys(S.searchEngines).forEach(k => {
                        if (!S.searchEngineKeys.includes(k)) S.searchEngineKeys.push(k);
                    });
                } else {
                    S.searchEngineKeys = Object.keys(S.searchEngines);
                }
                if (parsed.currentEngine && S.searchEngines[parsed.currentEngine]) {
                    S.currentEngine = parsed.currentEngine;
                    localStorage.setItem('search_engine', S.currentEngine);
                } else if (!S.searchEngines[S.currentEngine]) {
                    S.currentEngine = S.searchEngineKeys[0] || 'baidu';
                    localStorage.setItem('search_engine', S.currentEngine);
                }
                saveSearchEnginesData();
            }

            scheduleRender();
            await showAlert(
                `导入成功！共 ${importedGroups.length} 个分类、${linkCount} 条链接` +
                (hasEngines ? `，搜索引擎已同步。` : '。')
            );
        };
    }

    // 数据清理：下拉选择 + 执行（清空书签 / 清除本地数据）
    const dataCleanupTypeEl = document.getElementById('dataCleanupType');
    const dataCleanupExecBtn = document.getElementById('dataCleanupExecBtn');
    const dataCleanupHintClear = document.getElementById('dataCleanupHintClear');
    const dataCleanupHintReset = document.getElementById('dataCleanupHintReset');

    function updateDataCleanupHints() {
        const type = dataCleanupTypeEl ? dataCleanupTypeEl.value : 'clear-bookmarks';
        const showClear = type === 'clear-bookmarks';
        const showReset = type === 'reset-local';
        if (dataCleanupHintClear) {
            dataCleanupHintClear.hidden = !showClear;
            dataCleanupHintClear.style.display = showClear ? '' : 'none';
        }
        if (dataCleanupHintReset) {
            dataCleanupHintReset.hidden = !showReset;
            dataCleanupHintReset.style.display = showReset ? '' : 'none';
        }
    }

    if (dataCleanupTypeEl) {
        dataCleanupTypeEl.addEventListener('change', updateDataCleanupHints);
        updateDataCleanupHints();
    }

    if (dataCleanupExecBtn) {
        dataCleanupExecBtn.onclick = async () => {
            const type = dataCleanupTypeEl ? dataCleanupTypeEl.value : 'clear-bookmarks';

            if (type === 'reset-local') {
                const ok = await showConfirm(
                    '将清除本机导航与搜索引擎的本地缓存，刷新后将使用站点 js/data.js 中的默认数据。主题、壁纸等外观设置会保留。是否继续？',
                    '清除本地数据'
                );
                if (!ok) return;
                try {
                    localStorage.removeItem('nav_data_v6');
                    localStorage.removeItem('nav_engines_v2');
                    localStorage.removeItem('nav_engines_keys_v2');
                    localStorage.removeItem('search_engine');
                } catch (e) {
                    console.error(e);
                }
                await showAlert('本地导航数据已清除。页面即将刷新以加载默认配置。');
                location.reload();
                return;
            }

            // clear-bookmarks
            let linkCount = 0;
            S.groups.forEach(g => g.subGroups.forEach(s => { linkCount += (s.links || []).length; }));
            if (linkCount === 0) {
                await showAlert('当前没有可清空的书签。');
                return;
            }
            const ok = await showConfirm(
                `将删除全部 ${linkCount} 条链接书签，分类结构会保留。此操作不可撤销，建议先导出 JSON 备份。是否继续？`,
                '清空所有书签'
            );
            if (!ok) return;
            S.groups.forEach(g => {
                g.subGroups.forEach(s => { s.links = []; });
            });
            saveData();
            scheduleRender();
            await showAlert(`已清空 ${linkCount} 条书签。`);
        };
    }

    // 外观恢复默认
    const resetAppearanceBtn = document.getElementById('resetAppearanceBtn');
    if (resetAppearanceBtn) {
        resetAppearanceBtn.onclick = async () => {
            const ok = await showConfirm(
                '将恢复主题、首页布局、遮罩暗化、卡片透明度与壁纸为默认值。是否继续？',
                '恢复默认外观'
            );
            if (!ok) return;
            resetAppearanceToDefaults();
            setHomeLayout('direct');
            resetWallpaperToDefault();
            await showAlert('外观已恢复为默认值。');
        };
    }

    // ===== 存储类型切换（WebDAV / GitHub / S3·R2 / 本地备份 / 部署同步） =====
    const SYNC_TYPE_KEY = 'nav_sync_storage_type_v1';
    function setSyncStoragePanel(type) {
        const valid = ['webdav', 'github', 's3', 'local', 'deploy'];
        const t = valid.includes(type) ? type : 'webdav';
        document.querySelectorAll('.sync-storage-panel').forEach((panel) => {
            const show = panel.getAttribute('data-type') === t;
            panel.hidden = !show;
        });
        const sel = document.getElementById('syncStorageType');
        if (sel && sel.value !== t) sel.value = t;
        try { localStorage.setItem(SYNC_TYPE_KEY, t); } catch (e) {}
    }
    const syncStorageTypeEl = document.getElementById('syncStorageType');
    if (syncStorageTypeEl) {
        let savedType = 'webdav';
        try {
            const s = localStorage.getItem(SYNC_TYPE_KEY);
            if (s) savedType = s;
        } catch (e) {}
        setSyncStoragePanel(savedType);
        syncStorageTypeEl.addEventListener('change', () => {
            setSyncStoragePanel(syncStorageTypeEl.value);
        });
    }

    // ===== WebDAV 配置与操作 =====
    const WEBDAV_CFG_KEY = 'nav_webdav_cfg_v1';
    function loadWebdavCfg() {
        try {
            const raw = localStorage.getItem(WEBDAV_CFG_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
    function saveWebdavCfg(cfg) {
        try {
            localStorage.setItem(WEBDAV_CFG_KEY, JSON.stringify(cfg));
        } catch (e) {
            console.error(e);
        }
    }
    function getWebdavFormValues() {
        return {
            type: 'webdav',
            url: (document.getElementById('webdavUrl')?.value || '').trim().replace(/\/+$/, ''),
            user: (document.getElementById('webdavUser')?.value || '').trim(),
            pass: (document.getElementById('webdavPass')?.value || ''),
            path: (document.getElementById('webdavPath')?.value || '/data.json').trim() || '/data.json'
        };
    }
    function applyWebdavCfgToForm(cfg) {
        if (!cfg) return;
        const urlEl = document.getElementById('webdavUrl');
        const userEl = document.getElementById('webdavUser');
        const passEl = document.getElementById('webdavPass');
        const pathEl = document.getElementById('webdavPath');
        if (urlEl && cfg.url) urlEl.value = cfg.url;
        if (userEl && cfg.user) userEl.value = cfg.user;
        if (passEl && cfg.pass) passEl.value = cfg.pass;
        if (pathEl && cfg.path) pathEl.value = cfg.path;
    }
    applyWebdavCfgToForm(loadWebdavCfg());

    function webdavAuthHeader(user, pass) {
        return 'Basic ' + btoa(unescape(encodeURIComponent(user + ':' + pass)));
    }
    function buildWebdavFileUrl(base, path) {
        const p = path.startsWith('/') ? path : '/' + path;
        return base.replace(/\/+$/, '') + p;
    }
    function setWebdavStatus(msg, isError) {
        const el = document.getElementById('webdavStatusHint');
        if (!el) return;
        el.textContent = msg;
        el.style.color = isError ? '#ef4444' : '';
    }

    async function webdavRequest(method, fileUrl, user, pass, body) {
        const headers = {
            Authorization: webdavAuthHeader(user, pass)
        };
        if (body != null) {
            headers['Content-Type'] = 'application/json;charset=utf-8';
        }
        const opts = { method, headers };
        if (body != null) opts.body = body;
        const res = await fetch(fileUrl, opts);
        return res;
    }

    const webdavTestBtn = document.getElementById('webdavTestBtn');
    if (webdavTestBtn) {
        webdavTestBtn.onclick = async () => {
            const cfg = getWebdavFormValues();
            if (!cfg.url || !cfg.user) {
                setWebdavStatus('请填写 WebDAV URL 与用户名', true);
                return;
            }
            saveWebdavCfg(cfg);
            setWebdavStatus('正在测试连接…');
            const fileUrl = buildWebdavFileUrl(cfg.url, cfg.path);
            try {
                const res = await webdavRequest('GET', fileUrl, cfg.user, cfg.pass);
                if (res.ok || res.status === 404) {
                    setWebdavStatus(res.status === 404
                        ? '连接成功（远程文件尚不存在，可上传）'
                        : '连接成功，远程文件可访问');
                } else if (res.status === 401 || res.status === 403) {
                    setWebdavStatus('认证失败，请检查用户名与应用密码', true);
                } else {
                    setWebdavStatus(`连接异常：HTTP ${res.status}`, true);
                }
            } catch (e) {
                setWebdavStatus('连接失败：' + (e.message || '可能是 CORS 未开启或网络错误'), true);
            }
        };
    }

    const webdavUploadBtn = document.getElementById('webdavUploadBtn');
    if (webdavUploadBtn) {
        webdavUploadBtn.onclick = async () => {
            const cfg = getWebdavFormValues();
            if (!cfg.url || !cfg.user) {
                setWebdavStatus('请填写 WebDAV URL 与用户名', true);
                return;
            }
            saveWebdavCfg(cfg);
            const ok = await showConfirm('将把当前导航与搜索引擎配置上传到 WebDAV 远程路径，覆盖远程文件。是否继续？', '上传到云端');
            if (!ok) return;
            setWebdavStatus('正在上传…');
            const payload = buildFullBackupPayload();
            const body = JSON.stringify(payload, null, 2);
            const fileUrl = buildWebdavFileUrl(cfg.url, cfg.path);
            try {
                const res = await webdavRequest('PUT', fileUrl, cfg.user, cfg.pass, body);
                if (res.ok || res.status === 201 || res.status === 204) {
                    setWebdavStatus('上传成功');
                    await showAlert('已成功上传到 WebDAV。');
                } else if (res.status === 401 || res.status === 403) {
                    setWebdavStatus('认证失败，请检查用户名与应用密码', true);
                } else {
                    setWebdavStatus(`上传失败：HTTP ${res.status}`, true);
                }
            } catch (e) {
                setWebdavStatus('上传失败：' + (e.message || '可能是 CORS 未开启或网络错误'), true);
            }
        };
    }

    const webdavDownloadBtn = document.getElementById('webdavDownloadBtn');
    if (webdavDownloadBtn) {
        webdavDownloadBtn.onclick = async () => {
            const cfg = getWebdavFormValues();
            if (!cfg.url || !cfg.user) {
                setWebdavStatus('请填写 WebDAV URL 与用户名', true);
                return;
            }
            saveWebdavCfg(cfg);
            setWebdavStatus('正在下载…');
            const fileUrl = buildWebdavFileUrl(cfg.url, cfg.path);
            try {
                const res = await webdavRequest('GET', fileUrl, cfg.user, cfg.pass);
                if (!res.ok) {
                    if (res.status === 404) {
                        setWebdavStatus('远程文件不存在，请先上传', true);
                    } else if (res.status === 401 || res.status === 403) {
                        setWebdavStatus('认证失败，请检查用户名与应用密码', true);
                    } else {
                        setWebdavStatus(`下载失败：HTTP ${res.status}`, true);
                    }
                    return;
                }
                const text = await res.text();
                let parsed;
                try {
                    parsed = parseImportPayload(text);
                } catch (err) {
                    setWebdavStatus('远程文件解析失败：' + (err.message || '不是有效 JSON'), true);
                    return;
                }
                let importedGroups;
                try {
                    importedGroups = normalizeImportedGroups(parsed);
                } catch (err) {
                    setWebdavStatus('配置结构无效：' + (err.message || ''), true);
                    return;
                }
                if (!importedGroups.length) {
                    setWebdavStatus('远程文件中没有可用分类数据', true);
                    return;
                }
                const hasEngines = parsed && parsed.engines && typeof parsed.engines === 'object' && !Array.isArray(parsed.engines);
                let linkCount = 0;
                importedGroups.forEach(g => g.subGroups.forEach(s => { linkCount += s.links.length; }));
                const engineHint = hasEngines ? `，并恢复 ${Object.keys(parsed.engines).length} 个搜索引擎` : '';
                const ok = await showConfirm(
                    `将用云端数据覆盖当前导航（${importedGroups.length} 个分类 / ${linkCount} 条链接${engineHint}）。是否继续？`,
                    '从云端下载'
                );
                if (!ok) {
                    setWebdavStatus('已取消下载');
                    return;
                }
                S.groups = importedGroups;
                S.activeGroupId = S.groups[0]?.id || null;
                saveData();
                if (hasEngines) {
                    S.searchEngines = JSON.parse(JSON.stringify(parsed.engines));
                    if (Array.isArray(parsed.engineKeys) && parsed.engineKeys.length) {
                        S.searchEngineKeys = parsed.engineKeys.filter(k => S.searchEngines[k]);
                        Object.keys(S.searchEngines).forEach(k => {
                            if (!S.searchEngineKeys.includes(k)) S.searchEngineKeys.push(k);
                        });
                    } else {
                        S.searchEngineKeys = Object.keys(S.searchEngines);
                    }
                    if (parsed.currentEngine && S.searchEngines[parsed.currentEngine]) {
                        S.currentEngine = parsed.currentEngine;
                        localStorage.setItem('search_engine', S.currentEngine);
                    } else if (!S.searchEngines[S.currentEngine]) {
                        S.currentEngine = S.searchEngineKeys[0] || 'baidu';
                        localStorage.setItem('search_engine', S.currentEngine);
                    }
                    saveSearchEnginesData();
                }
                scheduleRender();
                setWebdavStatus('下载并应用成功');
                await showAlert(`已从云端恢复：${importedGroups.length} 个分类、${linkCount} 条链接` + (hasEngines ? '，搜索引擎已同步。' : '。'));
            } catch (e) {
                setWebdavStatus('下载失败：' + (e.message || '可能是 CORS 未开启或网络错误'), true);
            }
        };
    }

    ['webdavUrl', 'webdavUser', 'webdavPass', 'webdavPath'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                saveWebdavCfg(getWebdavFormValues());
            });
        }
    });

    // ===== GitHub 仓库同步 =====
    const GITHUB_CFG_KEY = 'nav_github_cfg_v1';
    function loadGithubCfg() {
        try {
            const raw = localStorage.getItem(GITHUB_CFG_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
    function saveGithubCfg(cfg) {
        try {
            localStorage.setItem(GITHUB_CFG_KEY, JSON.stringify(cfg));
        } catch (e) {
            console.error(e);
        }
    }
    function getGithubFormValues() {
        return {
            token: (document.getElementById('githubToken')?.value || '').trim(),
            owner: (document.getElementById('githubOwner')?.value || '').trim(),
            repo: (document.getElementById('githubRepo')?.value || '').trim(),
            branch: (document.getElementById('githubBranch')?.value || 'main').trim() || 'main',
            path: (document.getElementById('githubPath')?.value || 'public/data.json').trim() || 'public/data.json'
        };
    }
    function applyGithubCfgToForm(cfg) {
        if (!cfg) return;
        const map = {
            githubToken: cfg.token,
            githubOwner: cfg.owner,
            githubRepo: cfg.repo,
            githubBranch: cfg.branch,
            githubPath: cfg.path
        };
        Object.entries(map).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el && val != null && val !== '') el.value = val;
        });
    }
    applyGithubCfgToForm(loadGithubCfg());

    function setGithubStatus(msg, isError) {
        const el = document.getElementById('githubStatusHint');
        if (!el) return;
        el.textContent = msg;
        el.style.color = isError ? '#ef4444' : '';
    }

    function githubContentsUrl(owner, repo, path, branch) {
        const encodedPath = path.split('/').map(encodeURIComponent).join('/');
        let url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
        if (branch) url += `?ref=${encodeURIComponent(branch)}`;
        return url;
    }

    async function githubApiRequest(method, url, token, bodyObj) {
        const headers = {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28'
        };
        const opts = { method, headers };
        if (bodyObj != null) {
            headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(bodyObj);
        }
        return fetch(url, opts);
    }

    function utf8ToBase64(str) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        bytes.forEach((b) => { binary += String.fromCharCode(b); });
        return btoa(binary);
    }

    function base64ToUtf8(b64) {
        const binary = atob(b64.replace(/\n/g, ''));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    }

    function validateGithubCfg(cfg) {
        if (!cfg.token) return '请填写 GitHub Token（需要 repo 权限）';
        if (!cfg.owner) return '请填写用户名（仓库所有者）';
        if (!cfg.repo) return '请填写仓库名';
        if (!cfg.path) return '请填写文件路径';
        return null;
    }

    async function applyImportedNavData(parsed, confirmTitle) {
        let importedGroups;
        try {
            importedGroups = normalizeImportedGroups(parsed);
        } catch (err) {
            throw new Error('配置结构无效：' + (err.message || ''));
        }
        if (!importedGroups.length) {
            throw new Error('远程文件中没有可用分类数据');
        }
        const hasEngines = parsed && parsed.engines && typeof parsed.engines === 'object' && !Array.isArray(parsed.engines);
        let linkCount = 0;
        importedGroups.forEach(g => g.subGroups.forEach(s => { linkCount += s.links.length; }));
        const engineHint = hasEngines ? `，并恢复 ${Object.keys(parsed.engines).length} 个搜索引擎` : '';
        const ok = await showConfirm(
            `将用云端数据覆盖当前导航（${importedGroups.length} 个分类 / ${linkCount} 条链接${engineHint}）。是否继续？`,
            confirmTitle || '从云端拉取'
        );
        if (!ok) return null;

        S.groups = importedGroups;
        S.activeGroupId = S.groups[0]?.id || null;
        saveData();
        if (hasEngines) {
            S.searchEngines = JSON.parse(JSON.stringify(parsed.engines));
            if (Array.isArray(parsed.engineKeys) && parsed.engineKeys.length) {
                S.searchEngineKeys = parsed.engineKeys.filter(k => S.searchEngines[k]);
                Object.keys(S.searchEngines).forEach(k => {
                    if (!S.searchEngineKeys.includes(k)) S.searchEngineKeys.push(k);
                });
            } else {
                S.searchEngineKeys = Object.keys(S.searchEngines);
            }
            if (parsed.currentEngine && S.searchEngines[parsed.currentEngine]) {
                S.currentEngine = parsed.currentEngine;
                localStorage.setItem('search_engine', S.currentEngine);
            } else if (!S.searchEngines[S.currentEngine]) {
                S.currentEngine = S.searchEngineKeys[0] || 'baidu';
                localStorage.setItem('search_engine', S.currentEngine);
            }
            saveSearchEnginesData();
        }
        scheduleRender();
        return { importedGroups, linkCount, hasEngines };
    }

    const githubTestBtn = document.getElementById('githubTestBtn');
    if (githubTestBtn) {
        githubTestBtn.onclick = async () => {
            const cfg = getGithubFormValues();
            const err = validateGithubCfg(cfg);
            if (err) {
                setGithubStatus(err, true);
                return;
            }
            saveGithubCfg(cfg);
            setGithubStatus('正在测试连接…');
            try {
                const url = githubContentsUrl(cfg.owner, cfg.repo, cfg.path, cfg.branch);
                const res = await githubApiRequest('GET', url, cfg.token);
                if (res.ok) {
                    setGithubStatus('连接成功，远程文件可访问');
                } else if (res.status === 404) {
                    setGithubStatus('连接成功（远程文件尚不存在，可保存上传）');
                } else if (res.status === 401) {
                    setGithubStatus('认证失败，请检查 Token 是否有效', true);
                } else if (res.status === 403) {
                    setGithubStatus('权限不足，Token 需具备 repo 权限', true);
                } else {
                    const body = await res.json().catch(() => ({}));
                    setGithubStatus(`连接异常：HTTP ${res.status}` + (body.message ? ' — ' + body.message : ''), true);
                }
            } catch (e) {
                setGithubStatus('连接失败：' + (e.message || '网络错误'), true);
            }
        };
    }

    const githubUploadBtn = document.getElementById('githubUploadBtn');
    if (githubUploadBtn) {
        githubUploadBtn.onclick = async () => {
            const cfg = getGithubFormValues();
            const err = validateGithubCfg(cfg);
            if (err) {
                setGithubStatus(err, true);
                return;
            }
            saveGithubCfg(cfg);
            const ok = await showConfirm(
                '将把当前导航与搜索引擎配置推送到 GitHub 仓库，覆盖云端旧数据。若站点通过 Pages/CDN 分发，生效可能需 1–5 分钟。是否继续？',
                '保存到云端'
            );
            if (!ok) return;
            setGithubStatus('正在保存到 GitHub…');
            try {
                const getUrl = githubContentsUrl(cfg.owner, cfg.repo, cfg.path, cfg.branch);
                let sha = null;
                const getRes = await githubApiRequest('GET', getUrl, cfg.token);
                if (getRes.ok) {
                    const meta = await getRes.json();
                    sha = meta.sha || null;
                } else if (getRes.status !== 404) {
                    if (getRes.status === 401) {
                        setGithubStatus('认证失败，请检查 Token', true);
                        return;
                    }
                    if (getRes.status === 403) {
                        setGithubStatus('权限不足，Token 需具备 repo 权限', true);
                        return;
                    }
                    setGithubStatus(`读取远程文件失败：HTTP ${getRes.status}`, true);
                    return;
                }

                const payload = buildFullBackupPayload();
                const content = utf8ToBase64(JSON.stringify(payload, null, 2));
                const putUrl = githubContentsUrl(cfg.owner, cfg.repo, cfg.path);
                const putBody = {
                    message: `Update nav data · ${new Date().toISOString()}`,
                    content,
                    branch: cfg.branch
                };
                if (sha) putBody.sha = sha;

                const putRes = await githubApiRequest('PUT', putUrl, cfg.token, putBody);
                if (putRes.ok || putRes.status === 201) {
                    setGithubStatus('已保存到 GitHub（CDN 可能需 1–5 分钟生效）');
                    await showAlert('已成功推送到 GitHub 仓库。');
                } else if (putRes.status === 401) {
                    setGithubStatus('认证失败，请检查 Token', true);
                } else if (putRes.status === 403) {
                    setGithubStatus('权限不足，Token 需具备 repo 权限', true);
                } else if (putRes.status === 409) {
                    setGithubStatus('冲突：远程文件已被修改，请先拉取再保存', true);
                } else {
                    const body = await putRes.json().catch(() => ({}));
                    setGithubStatus(`保存失败：HTTP ${putRes.status}` + (body.message ? ' — ' + body.message : ''), true);
                }
            } catch (e) {
                setGithubStatus('保存失败：' + (e.message || '网络错误'), true);
            }
        };
    }

    const githubDownloadBtn = document.getElementById('githubDownloadBtn');
    if (githubDownloadBtn) {
        githubDownloadBtn.onclick = async () => {
            const cfg = getGithubFormValues();
            const err = validateGithubCfg(cfg);
            if (err) {
                setGithubStatus(err, true);
                return;
            }
            saveGithubCfg(cfg);
            setGithubStatus('正在从 GitHub 拉取…');
            try {
                const url = githubContentsUrl(cfg.owner, cfg.repo, cfg.path, cfg.branch);
                const res = await githubApiRequest('GET', url, cfg.token);
                if (!res.ok) {
                    if (res.status === 404) {
                        setGithubStatus('远程文件不存在，请先保存到云端', true);
                    } else if (res.status === 401) {
                        setGithubStatus('认证失败，请检查 Token', true);
                    } else if (res.status === 403) {
                        setGithubStatus('权限不足，Token 需具备 repo 权限', true);
                    } else {
                        setGithubStatus(`拉取失败：HTTP ${res.status}`, true);
                    }
                    return;
                }
                const meta = await res.json();
                if (!meta.content) {
                    setGithubStatus('远程响应无文件内容（可能是目录）', true);
                    return;
                }
                const text = base64ToUtf8(meta.content);
                let parsed;
                try {
                    parsed = parseImportPayload(text);
                } catch (parseErr) {
                    setGithubStatus('远程文件解析失败：' + (parseErr.message || '不是有效 JSON'), true);
                    return;
                }
                let result;
                try {
                    result = await applyImportedNavData(parsed, '从云端拉取');
                } catch (applyErr) {
                    setGithubStatus(applyErr.message || '应用数据失败', true);
                    return;
                }
                if (!result) {
                    setGithubStatus('已取消拉取');
                    return;
                }
                setGithubStatus('拉取并应用成功');
                await showAlert(
                    `已从 GitHub 恢复：${result.importedGroups.length} 个分类、${result.linkCount} 条链接` +
                    (result.hasEngines ? '，搜索引擎已同步。' : '。')
                );
            } catch (e) {
                setGithubStatus('拉取失败：' + (e.message || '网络错误'), true);
            }
        };
    }

    ['githubToken', 'githubOwner', 'githubRepo', 'githubBranch', 'githubPath'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                saveGithubCfg(getGithubFormValues());
            });
        }
    });

    // ===== S3 / Cloudflare R2 配置与操作（AWS Signature V4） =====
    const S3_CFG_KEY = 'nav_s3_cfg_v1';
    function loadS3Cfg() {
        try {
            const raw = localStorage.getItem(S3_CFG_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
    function saveS3Cfg(cfg) {
        try {
            localStorage.setItem(S3_CFG_KEY, JSON.stringify(cfg));
        } catch (e) {
            console.error(e);
        }
    }
    function getS3FormValues() {
        return {
            type: 's3',
            endpoint: (document.getElementById('s3Endpoint')?.value || '').trim().replace(/\/+$/, ''),
            accessKeyId: (document.getElementById('s3AccessKeyId')?.value || '').trim(),
            secretAccessKey: (document.getElementById('s3SecretAccessKey')?.value || ''),
            bucket: (document.getElementById('s3Bucket')?.value || '').trim(),
            publicUrl: (document.getElementById('s3PublicUrl')?.value || '').trim().replace(/\/+$/, ''),
            path: (document.getElementById('s3Path')?.value || 'data.json').trim().replace(/^\/+/, '') || 'data.json'
        };
    }
    function applyS3CfgToForm(cfg) {
        if (!cfg) return;
        const map = {
            s3Endpoint: cfg.endpoint,
            s3AccessKeyId: cfg.accessKeyId,
            s3SecretAccessKey: cfg.secretAccessKey,
            s3Bucket: cfg.bucket,
            s3PublicUrl: cfg.publicUrl,
            s3Path: cfg.path
        };
        Object.keys(map).forEach((id) => {
            const el = document.getElementById(id);
            if (el && map[id] != null && map[id] !== '') el.value = map[id];
        });
    }
    function setS3Status(msg, isError) {
        const el = document.getElementById('s3StatusHint');
        if (!el) return;
        el.textContent = msg;
        el.style.color = isError ? '#ef4444' : '';
    }

    // --- Minimal AWS Signature Version 4 (browser, path-style / virtual-hosted compatible) ---
    function s3Utf8Encode(str) {
        return new TextEncoder().encode(str);
    }
    async function s3Sha256Hex(data) {
        const buf = typeof data === 'string' ? s3Utf8Encode(data) : data;
        const hash = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    async function s3Hmac(key, data) {
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            typeof key === 'string' ? s3Utf8Encode(key) : key,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', cryptoKey, s3Utf8Encode(data));
        return new Uint8Array(sig);
    }
    async function s3GetSignatureKey(secretKey, dateStamp, region, service) {
        const kDate = await s3Hmac('AWS4' + secretKey, dateStamp);
        const kRegion = await s3Hmac(kDate, region);
        const kService = await s3Hmac(kRegion, service);
        return s3Hmac(kService, 'aws4_request');
    }
    function s3UriEncode(str, encodeSlash) {
        return encodeURIComponent(str)
            .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
            .replace(/%2F/gi, encodeSlash ? '%2F' : '/');
    }
    function s3ParseEndpoint(endpoint) {
        let url;
        try {
            url = new URL(endpoint);
        } catch {
            throw new Error('Endpoint 格式无效');
        }
        return { host: url.host, origin: url.origin, protocol: url.protocol };
    }
    /** 构建对象 URL：优先 path-style（兼容 R2 / MinIO） */
    function s3BuildObjectUrl(endpoint, bucket, objectKey) {
        const { origin } = s3ParseEndpoint(endpoint);
        const key = String(objectKey || '').replace(/^\/+/, '');
        const encodedKey = key.split('/').map(seg => s3UriEncode(seg, true)).join('/');
        return `${origin}/${encodeURIComponent(bucket)}/${encodedKey}`;
    }
    async function s3SignedRequest(method, cfg, objectKey, bodyText) {
        if (!cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucket) {
            throw new Error('请完整填写 Endpoint、Access Key、Secret Key 与 Bucket');
        }
        const { host } = s3ParseEndpoint(cfg.endpoint);
        // R2 / 多数兼容服务用 auto；从 endpoint 猜测标准 AWS 区域
        let region = 'auto';
        const m = host.match(/s3[.-]([a-z0-9-]+)\.amazonaws\.com/i);
        if (m) region = m[1];
        else if (/\.r2\.cloudflarestorage\.com$/i.test(host)) region = 'auto';
        const service = 's3';
        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.slice(0, 8);
        const payloadHash = await s3Sha256Hex(bodyText == null ? '' : bodyText);
        const keyPath = String(objectKey || '').replace(/^\/+/, '').split('/').filter(Boolean)
            .map(seg => s3UriEncode(seg, true)).join('/');
        // path-style: /bucket/key — bucket 名按 AWS 规则不编码特殊字符外的部分
        const canonicalUri = '/' + s3UriEncode(cfg.bucket, true) + (keyPath ? '/' + keyPath : '');
        const hasBody = bodyText != null;
        const contentType = hasBody ? 'application/json;charset=utf-8' : '';
        let canonicalHeaders =
            (hasBody ? 'content-type:' + contentType + '\n' : '') +
            'host:' + host + '\n' +
            'x-amz-content-sha256:' + payloadHash + '\n' +
            'x-amz-date:' + amzDate + '\n';
        const signedHeaders = (hasBody ? 'content-type;' : '') + 'host;x-amz-content-sha256;x-amz-date';
        const canonicalRequest = [
            method,
            canonicalUri,
            '',
            canonicalHeaders,
            signedHeaders,
            payloadHash
        ].join('\n');
        const algorithm = 'AWS4-HMAC-SHA256';
        const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
        const stringToSign = [
            algorithm,
            amzDate,
            credentialScope,
            await s3Sha256Hex(canonicalRequest)
        ].join('\n');
        const signingKey = await s3GetSignatureKey(cfg.secretAccessKey, dateStamp, region, service);
        const signatureBuf = await s3Hmac(signingKey, stringToSign);
        const signature = Array.from(signatureBuf).map(b => b.toString(16).padStart(2, '0')).join('');
        const authorization =
            `${algorithm} Credential=${cfg.accessKeyId}/${credentialScope}, ` +
            `SignedHeaders=${signedHeaders}, Signature=${signature}`;

        const url = s3BuildObjectUrl(cfg.endpoint, cfg.bucket, objectKey);
        const headers = {
            'Authorization': authorization,
            'x-amz-content-sha256': payloadHash,
            'x-amz-date': amzDate
        };
        if (hasBody) headers['Content-Type'] = contentType;
        const opts = { method, headers };
        if (hasBody) opts.body = bodyText;
        return fetch(url, opts);
    }

    // 加载已保存配置到表单
    (function initS3Form() {
        const cfg = loadS3Cfg();
        if (cfg) applyS3CfgToForm(cfg);
    })();

    const s3TestBtn = document.getElementById('s3TestBtn');
    if (s3TestBtn) {
        s3TestBtn.onclick = async () => {
            const cfg = getS3FormValues();
            if (!cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucket) {
                setS3Status('请填写 Endpoint、Access Key、Secret Key 与 Bucket', true);
                return;
            }
            saveS3Cfg(cfg);
            setS3Status('正在测试连接…');
            try {
                const res = await s3SignedRequest('GET', cfg, cfg.path, null);
                if (res.ok) {
                    setS3Status('连接成功，远程文件可访问');
                } else if (res.status === 404) {
                    setS3Status('连接成功（远程文件尚不存在，可上传）');
                } else if (res.status === 403 || res.status === 401) {
                    setS3Status('认证失败，请检查 Access Key / Secret 与 Bucket 权限', true);
                } else {
                    setS3Status(`连接异常：HTTP ${res.status}`, true);
                }
            } catch (e) {
                setS3Status('连接失败：' + (e.message || '可能是 CORS 未开启或网络错误'), true);
            }
        };
    }

    const s3UploadBtn = document.getElementById('s3UploadBtn');
    if (s3UploadBtn) {
        s3UploadBtn.onclick = async () => {
            const cfg = getS3FormValues();
            if (!cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucket) {
                setS3Status('请填写 Endpoint、Access Key、Secret Key 与 Bucket', true);
                return;
            }
            saveS3Cfg(cfg);
            const ok = await showConfirm('将把当前导航与搜索引擎配置上传到 S3/R2，覆盖远程文件。是否继续？', '上传到云端');
            if (!ok) return;
            setS3Status('正在上传…');
            try {
                const payload = buildFullBackupPayload();
                const body = JSON.stringify(payload, null, 2);
                const res = await s3SignedRequest('PUT', cfg, cfg.path, body);
                if (res.ok || res.status === 200 || res.status === 204) {
                    setS3Status('上传成功');
                    await showAlert('已成功上传到 S3 / Cloudflare R2。');
                } else if (res.status === 403 || res.status === 401) {
                    setS3Status('上传失败：认证或权限不足', true);
                } else {
                    const t = await res.text().catch(() => '');
                    setS3Status(`上传失败：HTTP ${res.status}` + (t ? ' — ' + t.slice(0, 120) : ''), true);
                }
            } catch (e) {
                setS3Status('上传失败：' + (e.message || '可能是 CORS 未开启或网络错误'), true);
            }
        };
    }

    const s3DownloadBtn = document.getElementById('s3DownloadBtn');
    if (s3DownloadBtn) {
        s3DownloadBtn.onclick = async () => {
            const cfg = getS3FormValues();
            if (!cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucket) {
                setS3Status('请填写 Endpoint、Access Key、Secret Key 与 Bucket', true);
                return;
            }
            saveS3Cfg(cfg);
            setS3Status('正在下载…');
            try {
                const res = await s3SignedRequest('GET', cfg, cfg.path, null);
                if (!res.ok) {
                    if (res.status === 404) {
                        setS3Status('远程文件不存在，请先上传', true);
                    } else if (res.status === 403 || res.status === 401) {
                        setS3Status('认证失败，请检查 Access Key / Secret 与权限', true);
                    } else {
                        setS3Status(`下载失败：HTTP ${res.status}`, true);
                    }
                    return;
                }
                const text = await res.text();
                let parsed;
                try {
                    parsed = parseImportPayload(text);
                } catch (err) {
                    setS3Status('远程文件解析失败：' + (err.message || '不是有效 JSON'), true);
                    return;
                }
                let importedGroups;
                try {
                    importedGroups = normalizeImportedGroups(parsed);
                } catch (err) {
                    setS3Status('配置结构无效：' + (err.message || ''), true);
                    return;
                }
                if (!importedGroups.length) {
                    setS3Status('远程文件中没有可用分类数据', true);
                    return;
                }
                const hasEngines = parsed && parsed.engines && typeof parsed.engines === 'object' && !Array.isArray(parsed.engines);
                let linkCount = 0;
                importedGroups.forEach(g => g.subGroups.forEach(s => { linkCount += s.links.length; }));
                const engineHint = hasEngines ? `，并恢复 ${Object.keys(parsed.engines).length} 个搜索引擎` : '';
                const ok = await showConfirm(
                    `将用云端数据覆盖当前导航（${importedGroups.length} 个分类 / ${linkCount} 条链接${engineHint}）。是否继续？`,
                    '从云端下载'
                );
                if (!ok) {
                    setS3Status('已取消下载');
                    return;
                }
                S.groups = importedGroups;
                S.activeGroupId = S.groups[0]?.id || null;
                saveData();
                if (hasEngines) {
                    S.searchEngines = JSON.parse(JSON.stringify(parsed.engines));
                    if (Array.isArray(parsed.engineKeys) && parsed.engineKeys.length) {
                        S.searchEngineKeys = parsed.engineKeys.filter(k => S.searchEngines[k]);
                        Object.keys(S.searchEngines).forEach(k => {
                            if (!S.searchEngineKeys.includes(k)) S.searchEngineKeys.push(k);
                        });
                    } else {
                        S.searchEngineKeys = Object.keys(S.searchEngines);
                    }
                    if (parsed.currentEngine && S.searchEngines[parsed.currentEngine]) {
                        S.currentEngine = parsed.currentEngine;
                        localStorage.setItem('search_engine', S.currentEngine);
                    } else if (!S.searchEngines[S.currentEngine]) {
                        S.currentEngine = S.searchEngineKeys[0] || 'baidu';
                        localStorage.setItem('search_engine', S.currentEngine);
                    }
                    saveSearchEnginesData();
                }
                scheduleRender();
                setS3Status('下载并应用成功');
                await showAlert(`已从云端恢复：${importedGroups.length} 个分类、${linkCount} 条链接` + (hasEngines ? '，搜索引擎已同步。' : '。'));
            } catch (e) {
                setS3Status('下载失败：' + (e.message || '可能是 CORS 未开启或网络错误'), true);
            }
        };
    }

    ['s3Endpoint', 's3AccessKeyId', 's3SecretAccessKey', 's3Bucket', 's3PublicUrl', 's3Path'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                saveS3Cfg(getS3FormValues());
            });
        }
    });

    const importBookmarksBtn = document.getElementById('importBookmarksBtn');
    const bookmarkFileInput = document.getElementById('bookmarkFileInput');
    if (importBookmarksBtn && bookmarkFileInput) {
        importBookmarksBtn.onclick = () => bookmarkFileInput.click();
        bookmarkFileInput.onchange = async () => {
            const file = bookmarkFileInput.files && bookmarkFileInput.files[0];
            bookmarkFileInput.value = '';
            if (file) await importBookmarksFromFile(file);
        };
    }

    const editLinkModal = document.getElementById('editLinkModal');
    document.getElementById('btnCloseEditLink').onclick = closeEditLinkModal;
    document.getElementById('editLinkCancelBtn').onclick = closeEditLinkModal;
    document.getElementById('editLinkSaveBtn').onclick = saveEditLink;
    editLinkModal.onclick = (e) => {
        if (e.target === editLinkModal) closeEditLinkModal();
    };

    const editEngineModal = document.getElementById('editEngineModal');
    document.getElementById('btnCloseEditEngine').onclick = closeEditEngineModal;
    document.getElementById('editEngineCancelBtn').onclick = closeEditEngineModal;
    document.getElementById('editEngineSaveBtn').onclick = saveEditEngine;
    editEngineModal.onclick = (e) => {
        if (e.target === editEngineModal) closeEditEngineModal();
    };

    document.getElementById('editLinkFetchBtn').onclick = async () => {
        let val = document.getElementById('editLinkUrl').value.trim();
        if (!val) {
            await showAlert('请先输入网址！');
            return;
        }
        if (!/^https?:\/\//i.test(val)) val = 'https://' + val;
        try {
            const domain = new URL(val).hostname;
            const nameInput = document.getElementById('editLinkName');
            if (!nameInput.value.trim()) {
                const parts = domain.split('.');
                const base = parts.length >= 2 ? parts[parts.length - 2] : domain;
                nameInput.value = base.charAt(0).toUpperCase() + base.slice(1);
            }
            const favicon = `https://favicon.im/${domain}?larger=true`;
            if (!document.getElementById('editLinkIcon').value.trim()) {
                document.getElementById('editLinkIcon').value = '';
            }
            updateEditLinkIconPreview(favicon, nameInput.value);
            await showAlert('已自动获取标题与图标候选！');
        } catch {
            await showAlert('网址格式不正确，无法自动抓取。');
        }
    };
    document.getElementById('editLinkIcon').oninput = (e) => {
        const src = e.target.value.trim();
        const name = document.getElementById('editLinkName').value.trim();
        if (src) {
            updateEditLinkIconPreview(src, name);
        } else {
            const domain = getDomain(document.getElementById('editLinkUrl').value);
            updateEditLinkIconPreview(domain ? `https://favicon.im/${domain}?larger=true` : '', name);
        }
    };
    document.getElementById('editLinkName').oninput = (e) => {
        const iconVal = document.getElementById('editLinkIcon').value.trim();
        if (!iconVal) {
            const domain = getDomain(document.getElementById('editLinkUrl').value);
            updateEditLinkIconPreview(domain ? `https://favicon.im/${domain}?larger=true` : '', e.target.value);
        }
    };

    


}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
