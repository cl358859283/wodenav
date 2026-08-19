/**
 * =============================================================================
 * search-engines.js - 搜索引擎管理与渲染
 * =============================================================================
 */
import { S, scheduleRender, saveData } from './state.js';
import {
    escapeHtml, isMobile, reorderArray, isInteractiveDragTarget,
    clearDragOverClasses, bindLongPressDrag, preferTouchLongPress,
    safeLocalGet, safeLocalSet
} from './utils.js';
import { openModal, closeModal, showAlert, showConfirm, showPrompt } from './dialogs.js';
import { DEFAULT_ENGINES } from './data.js';
import { switchTab } from './render.js';
import { scrollToGroup } from './sidebar.js';

export function initSearchEngine() {
    const savedEngines = safeLocalGet('nav_engines_v2');
    const savedKeys = safeLocalGet('nav_engines_keys_v2');

    try {
        S.searchEngines = savedEngines ? JSON.parse(savedEngines) : JSON.parse(JSON.stringify(DEFAULT_ENGINES));
    } catch { S.searchEngines = JSON.parse(JSON.stringify(DEFAULT_ENGINES)); }

    try {
        S.searchEngineKeys = savedKeys ? JSON.parse(savedKeys) : Object.keys(S.searchEngines);
    } catch { S.searchEngineKeys = Object.keys(S.searchEngines); }

    // 过滤无效 key，并补齐缺失项
    S.searchEngineKeys = S.searchEngineKeys.filter(k => S.searchEngines[k]);
    Object.keys(S.searchEngines).forEach(k => {
        if (!S.searchEngineKeys.includes(k)) S.searchEngineKeys.push(k);
    });

    const savedCurrent = safeLocalGet('search_engine');
    if (savedCurrent && S.searchEngines[savedCurrent]) {
        S.currentEngine = savedCurrent;
    } else {
        S.currentEngine = S.searchEngineKeys[0] || 'baidu';
    }

    const toggle = document.getElementById('engineToggle');
    const list = document.getElementById('engineList');
    if (!toggle || !list) return;

    const closeEngineList = () => {
        S.engineOpen = false;
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        list.classList.remove('open');
    };

    toggle.onclick = (e) => {
        e.stopPropagation();
        S.engineOpen = !S.engineOpen;
        toggle.classList.toggle('open', S.engineOpen);
        toggle.setAttribute('aria-expanded', S.engineOpen ? 'true' : 'false');
        list.classList.toggle('open', S.engineOpen);
    };

    renderEngineList();

    /** 执行当前搜索框关键词搜索（回车 / 搜索按钮共用） */
    function performSearch() {
        const input = document.getElementById('searchInput');
        if (!input) return;
        const raw = input.value.trim();
        if (!raw) {
            input.focus();
            return;
        }
        const kw = encodeURIComponent(raw);
        const engInfo = S.searchEngines[S.currentEngine];
        if (!engInfo || !engInfo.url) return;

        if (S.currentEngine === 'local' || String(engInfo.url).startsWith('#localSearch')) {
            const kwLower = raw.toLowerCase();
            let first = null;
            for (const g of S.groups) {
                if (!g.subGroups) continue;
                for (const sub of g.subGroups) {
                    if (!sub.links) continue;
                    for (const link of sub.links) {
                        const match = (link.name || '').toLowerCase().includes(kwLower) ||
                                      (link.desc || '').toLowerCase().includes(kwLower) ||
                                      (link.url && link.url.toLowerCase().includes(kwLower));
                        if (match) {
                            if (!first) first = { gid: g.id, sid: sub.id };
                            break;
                        }
                    }
                    if (first) break;
                }
                if (first) break;
            }
            if (first) {
                switchTab(first.gid, first.sid);
                setTimeout(() => scrollToGroup(first.gid), 80);
            } else {
                showAlert('本站未找到匹配「' + raw + '」的链接');
            }
        } else {
            let targetUrl = engInfo.url;
            if (targetUrl.includes('%s')) {
                targetUrl = targetUrl.replace(/%s/g, kw);
            } else {
                targetUrl = targetUrl + kw;
            }
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
        }
    }

    const input = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClearBtn');
    const syncClearVisibility = () => {
        if (!clearBtn || !input) return;
        const has = !!input.value.trim();
        if (has) clearBtn.removeAttribute('hidden');
        else clearBtn.setAttribute('hidden', '');
    };
    if (input) {
        input.addEventListener('keydown', e => {
            if (e.key !== 'Enter' || e.isComposing) return;
            e.preventDefault();
            performSearch();
        });
        input.addEventListener('input', syncClearVisibility);
        input.addEventListener('focus', syncClearVisibility);
        syncClearVisibility();
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!input) return;
            input.value = '';
            syncClearVisibility();
            input.focus();
        });
    }

    const searchBtn = document.getElementById('searchSubmitBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            performSearch();
        });
    }

    document.addEventListener('click', (e) => {
        if (!S.engineOpen) return;
        const wrap = document.querySelector('.search-wrapper');
        if (!wrap || !wrap.contains(e.target)) closeEngineList();
    });
}

export function renderEngineList() {
    const list = document.getElementById('engineList');
    if (!list) return;
    list.replaceChildren();
    const frag = document.createDocumentFragment();
    S.searchEngineKeys.forEach(key => {
        const eng = S.searchEngines[key];
        if (!eng) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `engine-btn${key === S.currentEngine ? ' active' : ''}`;
        btn.textContent = eng.name + (eng.isRocket ? ' ⚡' : '');
        btn.onclick = () => {
            S.currentEngine = key;
            safeLocalSet('search_engine', S.currentEngine);
            updateEngineActive();
            S.engineOpen = false;
            const toggle = document.getElementById('engineToggle');
            if (toggle) {
                toggle.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
            list.classList.remove('open');
        };
        frag.appendChild(btn);
    });
    list.appendChild(frag);
    updateEngineActive();
}

export function updateEngineActive() {
    const currentObj = S.searchEngines[S.currentEngine];
    const nameEl = document.getElementById('currentEngineName');
    if (!nameEl) return;
    nameEl.textContent = currentObj
        ? (currentObj.name + (currentObj.isRocket ? ' ⚡' : ''))
        : '选择引擎';
    document.querySelectorAll('#engineList .engine-btn').forEach((btn, i) => {
        const key = S.searchEngineKeys[i];
        btn.classList.toggle('active', key === S.currentEngine);
    });
}

export function saveSearchEnginesData() {
    safeLocalSet('nav_engines_v2', JSON.stringify(S.searchEngines));
    safeLocalSet('nav_engines_keys_v2', JSON.stringify(S.searchEngineKeys));
    renderEngineList();
}

// 搜索引擎拖拽与管理渲染实现
export function setupEngineRowDrag(row, key, index) {
    const useTouch = preferTouchLongPress();
    row.draggable = !useTouch;
    row.dataset.engineKey = key;
    row.dataset.index = String(index);

    row.ondragstart = (e) => {
        if (isInteractiveDragTarget(e.target)) {
            e.preventDefault();
            return;
        }
        e.stopPropagation();
        S.dragState = { type: 'engine', key, fromIndex: index };
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', key);
    };
    row.ondragend = () => {
        row.classList.remove('dragging');
        clearDragOverClasses(document.getElementById('manageEngineList'));
        S.dragState = null;
    };

    row.ondragover = (e) => {
        if (!S.dragState || S.dragState.type !== 'engine') return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        clearDragOverClasses(document.getElementById('manageEngineList'));
        row.classList.add('drag-over');
    };
    row.ondragleave = (e) => {
        if (!row.contains(e.relatedTarget)) {
            row.classList.remove('drag-over');
        }
    };
    row.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        row.classList.remove('drag-over');
        if (!S.dragState || S.dragState.type !== 'engine') return;
        const from = S.dragState.fromIndex;
        const to = index;
        if (reorderArray(S.searchEngineKeys, from, to)) {
            saveSearchEnginesData();
            renderSearchEngineManageList();
        }
        S.dragState = null;
    };

    bindLongPressDrag(row, {
        itemSelector: '.manage-engine-row',
        container: () => document.querySelector('#manageEngineList .manage-engine-dropdown') || document.getElementById('manageEngineList'),
        getIndex: () => Number(row.dataset.index),
        longPressMs: 550,
        moveCancelPx: 16,
        onReorder: (from, to) => {
            if (reorderArray(S.searchEngineKeys, from, to)) {
                saveSearchEnginesData();
                renderSearchEngineManageList();
            }
        }
    });
}

export function renderSearchEngineManageList() {
    const container = document.getElementById('manageEngineList');
    if (!container) return;
    container.innerHTML = '';

    const countEl = document.getElementById('engineListCount');
    if (countEl) countEl.textContent = String(S.searchEngineKeys.length);

    if (!S.searchEngineKeys.length) {
        container.innerHTML = '<div class="move-empty">暂无搜索引擎</div>';
        return;
    }

    const list = document.createElement('div');
    list.className = 'manage-engine-dropdown';

    S.searchEngineKeys.forEach((key, index) => {
        const eng = S.searchEngines[key];
        if (!eng) return;

        const row = document.createElement('div');
        row.className = 'manage-engine-row';
        row.innerHTML = `
            <div class="manage-engine-meta">
                <div class="manage-engine-name">${escapeHtml(eng.name)}${eng.isRocket ? ' <span class="rocket-tag">⚡</span>' : ''}</div>
                <div class="manage-engine-url" title="${escapeHtml(eng.url || '')}">${escapeHtml(eng.url || '')}</div>
            </div>
            <div class="manage-engine-actions">
                <button type="button" class="manage-action-icon-btn" data-action="engine-edit" data-key="${key}" title="编辑">
                    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button type="button" class="manage-action-icon-btn danger" data-action="engine-delete" data-key="${key}" title="删除" ${S.searchEngineKeys.length <= 1 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        setupEngineRowDrag(row, key, index);
        list.appendChild(row);
    });

    container.appendChild(list);

    list.querySelectorAll('button[data-action]').forEach(btn => {
        const action = btn.dataset.action;
        const key = btn.dataset.key;
        if (action === 'engine-edit') {
            btn.onclick = (e) => {
                e.stopPropagation();
                openEditEngineModal(key);
            };
        } else if (action === 'engine-delete') {
            btn.onclick = async (e) => {
                e.stopPropagation();
                if (S.searchEngineKeys.length <= 1) {
                    await showAlert("至少需保留一个搜索引擎！");
                    return;
                }
                const ok = await showConfirm(`确定要删除搜索引擎「${S.searchEngines[key]?.name || key}」吗？`, '删除搜索引擎');
                if (ok) {
                    delete S.searchEngines[key];
                    S.searchEngineKeys = S.searchEngineKeys.filter(k => k !== key);
                    if (S.currentEngine === key) {
                        S.currentEngine = S.searchEngineKeys[0];
                        localStorage.setItem('search_engine', S.currentEngine);
                    }
                    saveSearchEnginesData();
                    renderSearchEngineManageList();
                }
            };
        }
    });
}

export function openEditEngineModal(key) {
    S.editingEngineKey = key;
    const eng = S.searchEngines[key];
    if (!eng) return;
    document.getElementById('editEngineName').value = eng.name || '';
    document.getElementById('editEngineUrl').value = eng.url || '';
    document.getElementById('editEngineRocket').checked = !!eng.isRocket;
    openModal('editEngineModal');
}

export function closeEditEngineModal() {
    closeModal('editEngineModal');
    S.editingEngineKey = null;
}

export function saveEditEngine() {
    if (!S.editingEngineKey || !S.searchEngines[S.editingEngineKey]) return;
    const name = document.getElementById('editEngineName').value.trim();
    const url = document.getElementById('editEngineUrl').value.trim();
    const isRocket = document.getElementById('editEngineRocket').checked;
    if (!name || !url) {
        showAlert('请填写名称和 URL！');
        return;
    }
    S.searchEngines[S.editingEngineKey] = { name, url, isRocket };
    saveSearchEnginesData();
    closeEditEngineModal();
    renderSearchEngineManageList();
}
