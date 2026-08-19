/**
 * =============================================================================
 * render.js - 主页渲染、卡片、文件夹模式
 * =============================================================================
 */
import { S, scheduleRender, saveData, setRenderFn } from './state.js';
import {
    escapeHtml, isMobile, formatUrl, reorderArray,
    isInteractiveDragTarget, clearDragOverClasses, bindLongPressDrag,
    preferTouchLongPress
} from './utils.js';
import { openModal, closeModal } from './dialogs.js';
import { getLinkIconHtml } from './links.js';
import { renderSidebar, updateScrollObserver } from './sidebar.js';
import { applyHomeLayout } from './home-layout.js';
// circular: manage imports render; live binding works after both modules evaluate
import { renderManageList } from './manage.js';

// 兼容旧引用：对外仍导出同名函数
export { preferTouchLongPress };

export function switchTab(gid, sid) {
    const group = S.groups.find(g => g.id === gid);
    if (!group || group.activeSubId === sid) return;
    const prevSid = group.activeSubId;
    group.activeSubId = sid;

    // 增量更新 DOM，避免整页 render
    const section = document.querySelector(`.group-section[data-gid="${CSS.escape(gid)}"]`);
    if (!section) {
        render({ skipManage: true, skipSelect: true });
        return;
    }

    section.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.sid === sid);
    });

    section.querySelectorAll('.tab-panel').forEach(panel => {
        const isActive = panel.dataset.sid === sid;
        panel.classList.toggle('active', isActive);
        if (!isActive) return;

        const grid = panel.querySelector('.grid-wrapper');
        if (!grid) return;
        // 仅在尚未渲染卡片时填充，已有内容则复用
        if (grid.childElementCount === 0) {
            const sub = group.subGroups.find(s => s.id === sid);
            if (!sub) return;
            const linkFrag = document.createDocumentFragment();
            sub.links.forEach((link, i) => linkFrag.appendChild(createCard(link, i)));
            grid.appendChild(linkFrag);
        }
    });

    // 可选：清空已离开的 panel，降低常驻 DOM（链接很多时更有利）
    if (prevSid && prevSid !== sid) {
        const prevPanel = section.querySelector(`.tab-panel[data-sid="${CSS.escape(prevSid)}"]`);
        const prevGrid = prevPanel?.querySelector('.grid-wrapper');
        if (prevGrid && prevGrid.childElementCount > 48) {
            prevGrid.replaceChildren();
        }
    }
}

export function createCard(link, animIndex = 0) {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = link.url ? formatUrl(link.url) : '#';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.title = link.desc ? `${link.name} — ${link.desc}` : (link.name || '');
    if (!link.url) {
        card.onclick = (e) => e.preventDefault();
    }
    // 错落入场：更短、限制最大延迟
    const delay = Math.min(animIndex, 18) * 22;
    card.style.animationDelay = delay + 'ms';
    const descHtml = link.desc
        ? `<div class="card-desc">${escapeHtml(link.desc)}</div>`
        : '';
    card.innerHTML = `
        <div class="card-icon-circle">${getLinkIconHtml(link)}</div>
        <div class="card-text-area">
            <div class="card-name">
                <span>${escapeHtml(link.name)}</span>
                ${link.isRocket ? '<span class="rocket-tag" aria-hidden="true">⚡</span>' : ''}
                <svg class="external-icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </div>
            ${descHtml}
        </div>
    `;
    return card;
}

/** 生成统一空状态 DOM */
export function createEmptyState({ title, desc, iconSvg }) {
    const wrap = document.createElement('div');
    wrap.className = 'empty-state folder-empty';
    wrap.innerHTML = `
        <div class="empty-state-icon" aria-hidden="true">${iconSvg || ''}</div>
        <div class="empty-state-title">${escapeHtml(title || '暂无内容')}</div>
        <div class="empty-state-desc">${escapeHtml(desc || '')}</div>
    `;
    return wrap;
}

export const EMPTY_ICON_FOLDER = `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
export const EMPTY_ICON_LINK = `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

/**
 * @param {{ skipManage?: boolean, skipSelect?: boolean }} [options]
 */
/** 拖拽后抑制一次 click，避免误打开文件夹 */


export function makeFolderCard({ title, meta, badge, onClick }) {
    const folder = document.createElement('button');
    folder.type = 'button';
    folder.className = 'folder-card';
    folder.title = meta ? `${title}（${meta}）` : title;
    const badgeHtml = (badge != null && badge !== '' && Number(badge) > 0)
        ? `<span class="folder-badge">${escapeHtml(String(badge))}</span>`
        : '';
    /* 极简描边文件夹 SVG */
    folder.innerHTML = `
        <div class="folder-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path class="folder-outline" d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.1c.4 0 .8.16 1.1.44L11 6.8h7.5A2.5 2.5 0 0 1 21 9.3v8.2A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                <path class="folder-line" d="M3 10h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            ${badgeHtml}
        </div>
        <div class="folder-title">${escapeHtml(title)}</div>
        ${meta ? `<div class="folder-meta">${escapeHtml(meta)}</div>` : ''}
    `;
    folder.onclick = (e) => {
        if (S.suppressFolderClick) {
            S.suppressFolderClick = false;
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (typeof onClick === 'function') onClick(e);
    };
    return folder;
}

/** 是否优先使用触摸长按（手机/平板），避免与 DnD polyfill 抢事件 */
/** 主页文件夹卡片拖拽排序（一级或二级；桌面 HTML5 DnD + 移动端长按） */
export function setupHomeFolderCardDrag(card, options) {
    const { type, index, gid, listSelector, onReorder } = options;
    const useTouch = preferTouchLongPress();
    card.draggable = !useTouch;
    card.dataset.dragType = type;
    card.dataset.index = String(index);
    if (gid) card.dataset.gid = gid;

    card.ondragstart = (e) => {
        e.stopPropagation();
        S.dragState = { type, fromIndex: index, gid: gid || null };
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        S.suppressFolderClick = false;
    };
    card.ondragend = () => {
        card.classList.remove('dragging');
        const grid = card.closest(listSelector) || card.parentElement;
        if (grid) grid.querySelectorAll('.folder-card.drag-over').forEach(el => el.classList.remove('drag-over'));
        if (S.dragState && S.dragState.type === type) {
            S.suppressFolderClick = true;
            setTimeout(() => { S.suppressFolderClick = false; }, 80);
        }
        S.dragState = null;
    };
    card.ondragover = (e) => {
        if (!S.dragState || S.dragState.type !== type) return;
        if (gid && S.dragState.gid !== gid) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        const grid = card.closest(listSelector) || card.parentElement;
        if (grid) grid.querySelectorAll('.folder-card.drag-over').forEach(el => el.classList.remove('drag-over'));
        card.classList.add('drag-over');
    };
    card.ondragleave = (e) => {
        if (!card.contains(e.relatedTarget)) {
            card.classList.remove('drag-over');
        }
    };
    card.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('drag-over');
        if (!S.dragState || S.dragState.type !== type) return;
        if (gid && S.dragState.gid !== gid) return;
        const from = S.dragState.fromIndex;
        const to = index;
        S.dragState = null;
        if (from === to) return;
        if (typeof onReorder === 'function') onReorder(from, to);
        S.suppressFolderClick = true;
        setTimeout(() => { S.suppressFolderClick = false; }, 80);
    };

    // 移动端：长按拖拽（不依赖 polyfill，滚动与点击更稳）
    bindLongPressDrag(card, {
        itemSelector: '.folder-card',
        container: () => card.closest(listSelector) || card.parentElement,
        getIndex: () => Number(card.dataset.index),
        onReorder: (from, to) => {
            S.suppressFolderClick = true;
            setTimeout(() => { S.suppressFolderClick = false; }, 120);
            if (typeof onReorder === 'function') onReorder(from, to);
        },
        onDragStateChange: (active) => {
            if (active) S.suppressFolderClick = true;
        }
    });
}

/** 打开一级分类对话框，展示二级文件夹；可选直接进入某个二级 */
export function openFolderModal(groupId, subId = null) {
    const group = S.groups.find(g => g.id === groupId);
    if (!group) return;
    if (!group.subGroups) group.subGroups = [];
    let resolvedSubId = null;
    if (subId && group.subGroups.some(s => s.id === subId)) {
        resolvedSubId = subId;
        group.activeSubId = subId;
    }
    S.folderPath = { groupId: group.id, subId: resolvedSubId };
    S.activeGroupId = group.id;
    renderFolderModalContent();
    openModal('folderModal');
}

export function closeFolderModal() {
    closeModal('folderModal');
    S.folderPath = { groupId: null, subId: null };
}

/** 渲染对话框内容：二级文件夹 或 链接列表 */
export function renderFolderModalContent() {
    const body = document.getElementById('folderModalBody');
    const titleEl = document.getElementById('folderModalTitle');
    const backBtn = document.getElementById('folderModalBackBtn');
    if (!body || !titleEl) return;

    const group = S.groups.find(g => g.id === S.folderPath.groupId);
    if (!group) {
        closeFolderModal();
        return;
    }
    if (!group.subGroups) group.subGroups = [];

    body.replaceChildren();

    // 二级目录层：显示 subGroups 文件夹
    if (!S.folderPath.subId) {
        titleEl.textContent = group.title;
        if (backBtn) backBtn.hidden = true;

        if (!group.subGroups.length) {
            body.appendChild(createEmptyState({
                title: '暂无二级目录',
                desc: '可在「设置 → 分类管理」中新建二级分类',
                iconSvg: EMPTY_ICON_FOLDER
            }));
            return;
        }

        const folderGrid = document.createElement('div');
        folderGrid.className = 'folder-grid';
        group.subGroups.forEach((sub, subIndex) => {
            const linkCount = sub.links?.length || 0;
            const card = makeFolderCard({
                title: sub.title,
                meta: linkCount ? `${linkCount} 个链接` : '空目录',
                badge: linkCount,
                onClick: () => {
                    S.folderPath = { groupId: group.id, subId: sub.id };
                    group.activeSubId = sub.id;
                    renderFolderModalContent();
                }
            });
            setupHomeFolderCardDrag(card, {
                type: 'home-sub-folder',
                index: subIndex,
                gid: group.id,
                listSelector: '.folder-grid',
                onReorder: (from, to) => {
                    if (reorderArray(group.subGroups, from, to)) {
                        saveData();
                        renderFolderModalContent();
                        render({ skipManage: true, skipSelect: true });
                    }
                }
            });
            folderGrid.appendChild(card);
        });
        body.appendChild(folderGrid);
        return;
    }

    // 链接层：显示二级目录内的链接
    const sub = group.subGroups.find(s => s.id === S.folderPath.subId);
    if (!sub) {
        S.folderPath = { groupId: group.id, subId: null };
        renderFolderModalContent();
        return;
    }

    titleEl.textContent = `${group.title} / ${sub.title}`;
    if (backBtn) backBtn.hidden = false;

    if (!sub.links || !sub.links.length) {
        body.appendChild(createEmptyState({
            title: '暂无链接',
            desc: '点击右下角设置，在「添加链接」中添加网站',
            iconSvg: EMPTY_ICON_LINK
        }));
        return;
    }

    const linkGrid = document.createElement('div');
    linkGrid.className = 'grid-wrapper';
    const linkFrag = document.createDocumentFragment();
    sub.links.forEach((link, i) => linkFrag.appendChild(createCard(link, i)));
    linkGrid.appendChild(linkFrag);
    body.appendChild(linkGrid);
}

export function initFolderModal() {
    const modal = document.getElementById('folderModal');
    const closeBtn = document.getElementById('folderModalCloseBtn');
    const backBtn = document.getElementById('folderModalBackBtn');
    if (closeBtn) closeBtn.onclick = () => closeFolderModal();
    if (backBtn) {
        backBtn.onclick = () => {
            S.folderPath = { groupId: S.folderPath.groupId, subId: null };
            renderFolderModalContent();
        };
    }
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) closeFolderModal();
        };
    }
}

/** 主页文件夹模式：仅渲染一级分类文件夹（可拖动排序） */
export function renderFolderLayout(frag) {
    if (!S.groups.length) {
        frag.appendChild(createEmptyState({
            title: '还没有分类',
            desc: '点击右下角设置，在「分类管理」中创建第一个大分类',
            iconSvg: EMPTY_ICON_FOLDER
        }));
        return;
    }
    const folderGrid = document.createElement('div');
    folderGrid.className = 'folder-grid';

    S.groups.forEach((group, index) => {
        if (!group.subGroups) group.subGroups = [];
        const subCount = group.subGroups.length;
        const linkCount = group.subGroups.reduce((sum, sub) => sum + (sub.links?.length || 0), 0);
        const card = makeFolderCard({
            title: group.title,
            meta: subCount
                ? `${subCount} 个目录${linkCount ? ` · ${linkCount} 链接` : ''}`
                : (linkCount ? `${linkCount} 个链接` : '空分类'),
            badge: linkCount || subCount,
            onClick: () => openFolderModal(group.id)
        });
        setupHomeFolderCardDrag(card, {
            type: 'home-group-folder',
            index,
            listSelector: '.folder-grid',
            onReorder: (from, to) => {
                if (reorderArray(S.groups, from, to)) {
                    saveData();
                    render();
                }
            }
        });
        folderGrid.appendChild(card);
    });

    frag.appendChild(folderGrid);
}

export function render(options = {}) {
    const { skipManage = false, skipSelect = false } = options;
    const container = document.getElementById('container');
    if (!container) return;

    const frag = document.createDocumentFragment();
    if (!S.activeGroupId && S.groups.length) S.activeGroupId = S.groups[0].id;

    // 文件夹模式：只展示文件夹图标网格
    if (S.currentHomeLayout === 'folder') {
        renderFolderLayout(frag);
        container.replaceChildren(frag);
        renderSidebar();
        updateScrollObserver();
        if (!skipManage) {
            const settingsModal = document.getElementById('settingsModal');
            const managePanel = document.getElementById('tab-manage');
            const manageVisible = settingsModal &&
                settingsModal.style.display === 'flex' &&
                managePanel && managePanel.classList.contains('active');
            if (manageVisible) {
                const manageFilter = document.getElementById('manageSearchInput')?.value.trim().toLowerCase() || '';
                renderManageList(manageFilter);
            }
        }
        if (!skipSelect) updateSelectOptions();
        return;
    }

    // 直显模式：渲染全部分组内容（一级分组 / 二级标签可拖动排序）
    if (!S.groups.length) {
        frag.appendChild(createEmptyState({
            title: '还没有分类',
            desc: '点击右下角设置，在「分类管理」中创建第一个大分类',
            iconSvg: EMPTY_ICON_FOLDER
        }));
        container.replaceChildren(frag);
        renderSidebar();
        if (!skipSelect) updateSelectOptions();
        return;
    }
    S.groups.forEach((group, groupIndex) => {
        if (!group.subGroups) group.subGroups = [];
        if (!group.activeSubId && group.subGroups.length) group.activeSubId = group.subGroups[0].id;

        const section = document.createElement('div');
        section.className = 'group-section';
        section.dataset.gid = group.id;
        section.dataset.index = String(groupIndex);

        const header = document.createElement('div');
        header.className = 'group-header';
        header.draggable = !preferTouchLongPress();
        header.title = preferTouchLongPress() ? '长按可拖动调整一级分类顺序' : '拖动可调整一级分类顺序';

        const titleWrap = document.createElement('div');
        titleWrap.className = 'group-title-wrap';
        const linkCount = group.subGroups.reduce((sum, sub) => sum + (sub.links?.length || 0), 0);
        const subCount = group.subGroups.length;
        const metaText = subCount
            ? `${subCount} 个子类 · ${linkCount} 个链接`
            : `${linkCount} 个链接`;
        titleWrap.innerHTML = `
            <div class="group-title">
                <span>${escapeHtml(group.title)}</span>
            </div>
            <div class="group-meta">${escapeHtml(metaText)}</div>
        `;
        header.appendChild(titleWrap);
        section.appendChild(header);

        // 一级分类拖拽
        header.ondragstart = (e) => {
            e.stopPropagation();
            S.dragState = { type: 'home-group-section', fromIndex: groupIndex, gid: group.id };
            section.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', group.id);
        };
        header.ondragend = () => {
            section.classList.remove('dragging');
            document.querySelectorAll('.group-section.drag-over').forEach(el => el.classList.remove('drag-over'));
            S.dragState = null;
        };
        section.ondragover = (e) => {
            if (!S.dragState || S.dragState.type !== 'home-group-section') return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            document.querySelectorAll('.group-section.drag-over').forEach(el => el.classList.remove('drag-over'));
            section.classList.add('drag-over');
        };
        section.ondragleave = (e) => {
            if (!section.contains(e.relatedTarget)) {
                section.classList.remove('drag-over');
            }
        };
        section.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            section.classList.remove('drag-over');
            if (!S.dragState || S.dragState.type !== 'home-group-section') return;
            const from = S.dragState.fromIndex;
            const to = groupIndex;
            S.dragState = null;
            if (reorderArray(S.groups, from, to)) {
                saveData();
                render();
            }
        };

        // 移动端长按拖一级分组
        bindLongPressDrag(header, {
            itemSelector: '.group-section',
            container: () => document.getElementById('container'),
            getIndex: () => Number(section.dataset.index),
            dragClass: 'dragging',
            overClass: 'drag-over',
            onReorder: (from, to) => {
                // 高亮落在 section 上：把 dragging 类作用到 section
                if (reorderArray(S.groups, from, to)) {
                    saveData();
                    render();
                }
            },
            onDragStateChange: (active) => {
                section.classList.toggle('dragging', active);
            }
        });
        // 长按落点检测用 section 的 index，需让 over 样式打在 section
        // bindLongPressDrag 默认给 el(header) 加 dragging；额外同步到 section
        header.addEventListener('touchstart', () => {}, { passive: true });

        const groupContent = document.createElement('div');
        groupContent.className = 'group-content';

        if (group.subGroups.length) {
            const tabBarWrap = document.createElement('div');
            tabBarWrap.className = 'tab-bar-wrap';
            const tabScroll = document.createElement('div');
            tabScroll.className = 'tab-scroll';

            group.subGroups.forEach((sub, subIndex) => {
                const isActive = sub.id === group.activeSubId;
                const tabItem = document.createElement('button');
                tabItem.type = 'button';
                tabItem.className = `tab-item${isActive ? ' active' : ''}`;
                tabItem.dataset.sid = sub.id;
                tabItem.dataset.index = String(subIndex);
                tabItem.draggable = !preferTouchLongPress();
                tabItem.title = preferTouchLongPress() ? '长按可拖动调整二级分类顺序' : '拖动可调整二级分类顺序';
                tabItem.onclick = (e) => {
                    if (S.suppressFolderClick) {
                        S.suppressFolderClick = false;
                        e.preventDefault();
                        return;
                    }
                    switchTab(group.id, sub.id);
                };
                tabItem.innerHTML = `<span>${escapeHtml(sub.title)}</span>`;

                tabItem.ondragstart = (e) => {
                    e.stopPropagation();
                    S.dragState = { type: 'home-tab', fromIndex: subIndex, gid: group.id, sid: sub.id };
                    tabItem.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', sub.id);
                    S.suppressFolderClick = false;
                };
                tabItem.ondragend = () => {
                    tabItem.classList.remove('dragging');
                    tabScroll.querySelectorAll('.tab-item.drag-over').forEach(el => el.classList.remove('drag-over'));
                    if (S.dragState && S.dragState.type === 'home-tab') {
                        S.suppressFolderClick = true;
                        setTimeout(() => { S.suppressFolderClick = false; }, 80);
                    }
                    S.dragState = null;
                };
                tabItem.ondragover = (e) => {
                    if (!S.dragState || S.dragState.type !== 'home-tab' || S.dragState.gid !== group.id) return;
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    tabScroll.querySelectorAll('.tab-item.drag-over').forEach(el => el.classList.remove('drag-over'));
                    tabItem.classList.add('drag-over');
                };
                tabItem.ondragleave = (e) => {
                    if (!tabItem.contains(e.relatedTarget)) {
                        tabItem.classList.remove('drag-over');
                    }
                };
                tabItem.ondrop = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    tabItem.classList.remove('drag-over');
                    if (!S.dragState || S.dragState.type !== 'home-tab' || S.dragState.gid !== group.id) return;
                    const from = S.dragState.fromIndex;
                    const to = subIndex;
                    S.dragState = null;
                    S.suppressFolderClick = true;
                    setTimeout(() => { S.suppressFolderClick = false; }, 80);
                    if (reorderArray(group.subGroups, from, to)) {
                        saveData();
                        render();
                    }
                };

                bindLongPressDrag(tabItem, {
                    itemSelector: '.tab-item',
                    container: () => tabScroll,
                    getIndex: () => Number(tabItem.dataset.index),
                    onReorder: (from, to) => {
                        S.suppressFolderClick = true;
                        setTimeout(() => { S.suppressFolderClick = false; }, 120);
                        if (reorderArray(group.subGroups, from, to)) {
                            saveData();
                            render();
                        }
                    },
                    onDragStateChange: (active) => {
                        if (active) S.suppressFolderClick = true;
                    }
                });

                tabScroll.appendChild(tabItem);
            });
            tabBarWrap.appendChild(tabScroll);
            groupContent.appendChild(tabBarWrap);

            group.subGroups.forEach((sub) => {
                const panel = document.createElement('div');
                panel.className = `tab-panel${sub.id === group.activeSubId ? ' active' : ''}`;
                panel.dataset.sid = sub.id;
                const grid = document.createElement('div');
                grid.className = 'grid-wrapper';

                // 仅渲染当前激活子分类的卡片，减少初始 DOM 量
                if (sub.id === group.activeSubId) {
                    const linkFrag = document.createDocumentFragment();
                    sub.links.forEach((link, i) => linkFrag.appendChild(createCard(link, i)));
                    grid.appendChild(linkFrag);
                }

                panel.appendChild(grid);
                groupContent.appendChild(panel);
            });
        }
        section.appendChild(groupContent);
        frag.appendChild(section);
    });

    container.replaceChildren(frag);

    renderSidebar();
    updateScrollObserver();

    // 管理面板未打开时不必重绘管理列表，显著降低操作延迟
    if (!skipManage) {
        const settingsModal = document.getElementById('settingsModal');
        const managePanel = document.getElementById('tab-manage');
        const manageVisible = settingsModal &&
            settingsModal.style.display === 'flex' &&
            managePanel && managePanel.classList.contains('active');
        if (manageVisible) {
            const manageFilter = document.getElementById('manageSearchInput')?.value.trim().toLowerCase() || '';
            renderManageList(manageFilter);
        }
    }
    if (!skipSelect) updateSelectOptions();
}

export function updateSelectOptions() {
    const groupSelect = document.getElementById('linkGroupSelect');
    const subGroupSelect = document.getElementById('linkSubGroupSelect');
    const parentSelect = document.getElementById('newSubGroupParentSelect');

    const fillGroupSelect = (el) => {
        if (!el) return;
        const prev = el.value;
        el.innerHTML = '';
        S.groups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.innerText = g.title;
            el.appendChild(opt);
        });
        if (prev && S.groups.some(g => g.id === prev)) el.value = prev;
    };

    fillGroupSelect(groupSelect);
    fillGroupSelect(parentSelect);

    if (groupSelect && subGroupSelect && S.groups.length > 0) {
        const selectedGroupId = groupSelect.value || S.groups[0].id;
        const currentGroup = S.groups.find(g => g.id === selectedGroupId) || S.groups[0];
        subGroupSelect.innerHTML = '';
        currentGroup.subGroups.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id;
            opt.innerText = sub.title;
            subGroupSelect.appendChild(opt);
        });
    }
}

export function updateBatchBarVisibility() {
    const checkedBoxes = document.querySelectorAll('.manage-link-checkbox:checked');
    const batchBar = document.getElementById('manageBatchBar');
    if (!batchBar) return;

    if (checkedBoxes.length > 0) {
        batchBar.classList.add('show');
    } else {
        batchBar.classList.remove('show');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
    }
}

export function setManageCollapseAll(collapsed) {
    S.manageAllCollapsed = collapsed;
    S.groups.forEach(g => {
        g.manageCollapsed = collapsed;
        g.subGroups.forEach(sub => {
            sub.manageCollapsed = collapsed;
        });
    });
    const searchVal = document.getElementById('manageSearchInput')?.value.trim().toLowerCase() || '';
    renderManageList(searchVal);
}






// 注册到 state，供 scheduleRender 调用
setRenderFn(render);
