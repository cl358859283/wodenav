/**
 * =============================================================================
 * manage.js - 链接管理面板（批量操作、搜索过滤、拖拽）
 * =============================================================================
 */
import { S, scheduleRender, saveData } from './state.js';
import {
    escapeHtml, isMobile, reorderArray, isInteractiveDragTarget,
    clearDragOverClasses, bindLongPressDrag, preferTouchLongPress
} from './utils.js';
import { openModal, closeModal, showAlert, showConfirm } from './dialogs.js';
import {
    openEditLinkModal, findLinkById, removeLinkById, removeLinksByIds,
    showMovePicker, sameId, getLinkIconHtml
} from './links.js';

function updateBatchBarVisibility() {
    const bar = document.getElementById('batchActionBar');
    if (!bar) return;
    const checked = document.querySelectorAll('.manage-link-checkbox:checked').length;
    bar.style.display = checked > 0 ? 'flex' : 'none';
    const countEl = document.getElementById('batchSelectedCount');
    if (countEl) countEl.textContent = String(checked);
}

/** 在标题文字上直接内联重命名 */
function startInlineRename(spanEl, currentTitle, onSave) {
    if (!spanEl || spanEl.dataset.editing === '1') return;
    spanEl.dataset.editing = '1';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'manage-title-input';
    input.value = currentTitle;
    input.setAttribute('autocomplete', 'off');

    const parent = spanEl.parentNode;
    parent.replaceChild(input, spanEl);
    input.focus();
    input.select();

    let finished = false;
    const finish = (commit) => {
        if (finished) return;
        finished = true;
        const val = (input.value || '').trim();
        if (commit && val && val !== currentTitle) {
            onSave(val);
        } else {
            // 取消或未改动：恢复列表（避免残留 input）
            const manageFilter = document.getElementById('manageSearchInput')?.value.trim().toLowerCase() || '';
            renderManageList(manageFilter);
        }
    };

    input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            e.preventDefault();
            finish(true);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            finish(false);
        }
    });
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('blur', () => finish(true));
}

export function setupGroupDrag(groupDiv, g, groupIndex, filterText) {
    const useTouch = preferTouchLongPress();
    groupDiv.draggable = false;
    groupDiv.dataset.dragType = 'group';
    groupDiv.dataset.gid = g.id;
    groupDiv.dataset.index = String(groupIndex);

    const header = groupDiv.querySelector('.manage-group-header');
    if (header) {
        // 手机端关闭原生 HTML5 拖拽，避免滚动时误触发
        header.draggable = !useTouch;
        header.ondragstart = (e) => {
            if (isInteractiveDragTarget(e.target)) {
                e.preventDefault();
                return;
            }
            e.stopPropagation();
            S.dragState = { type: 'group', gid: g.id, fromIndex: groupIndex };
            groupDiv.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', g.id);
        };
        header.ondragend = () => {
            groupDiv.classList.remove('dragging');
            clearDragOverClasses(document.getElementById('manageGroupsContainer'));
            S.dragState = null;
        };
    }

    groupDiv.ondragover = (e) => {
        if (!S.dragState || S.dragState.type !== 'group') return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        clearDragOverClasses(document.getElementById('manageGroupsContainer'));
        groupDiv.classList.add('drag-over');
    };
    groupDiv.ondragleave = (e) => {
        if (!groupDiv.contains(e.relatedTarget)) {
            groupDiv.classList.remove('drag-over');
        }
    };
    groupDiv.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        groupDiv.classList.remove('drag-over');
        if (!S.dragState || S.dragState.type !== 'group') return;
        const from = S.dragState.fromIndex;
        const to = groupIndex;
        if (reorderArray(S.groups, from, to)) {
            saveData();
            scheduleRender();
            const manageFilter = document.getElementById('manageSearchInput')?.value.trim().toLowerCase() || '';
            renderManageList(manageFilter);
        }
        S.dragState = null;
    };

    // 移动端：长按拖一级分类
    bindLongPressDrag(groupDiv, {
        itemSelector: '.manage-group-item',
        container: () => document.getElementById('manageGroupsContainer'),
        getIndex: () => Number(groupDiv.dataset.index),
        longPressMs: 550,
        moveCancelPx: 16,
        onReorder: (from, to) => {
            if (reorderArray(S.groups, from, to)) {
                saveData();
                scheduleRender();
                const manageFilter = document.getElementById('manageSearchInput')?.value.trim().toLowerCase() || '';
                renderManageList(manageFilter);
            }
        }
    });
}

export function setupSubgroupDrag(subBox, g, sub, subIndex, filterText) {
    const useTouch = preferTouchLongPress();
    subBox.draggable = !useTouch;
    subBox.dataset.dragType = 'subgroup';
    subBox.dataset.gid = g.id;
    subBox.dataset.sid = sub.id;
    subBox.dataset.index = String(subIndex);

    subBox.ondragstart = (e) => {
        if (e.target.closest && e.target.closest('.manage-link-row')) {
            e.preventDefault();
            return;
        }
        if (isInteractiveDragTarget(e.target)) {
            e.preventDefault();
            return;
        }
        e.stopPropagation();
        S.dragState = { type: 'subgroup', gid: g.id, sid: sub.id, fromIndex: subIndex };
        subBox.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', sub.id);
    };
    subBox.ondragend = () => {
        subBox.classList.remove('dragging');
        clearDragOverClasses(document.getElementById('manageGroupsContainer'));
        S.dragState = null;
    };

    subBox.ondragover = (e) => {
        if (!S.dragState || S.dragState.type !== 'subgroup' || S.dragState.gid !== g.id) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        const parent = subBox.parentElement;
        if (parent) parent.querySelectorAll('.manage-subgroup-box.drag-over').forEach(el => el.classList.remove('drag-over'));
        subBox.classList.add('drag-over');
    };
    subBox.ondragleave = (e) => {
        if (!subBox.contains(e.relatedTarget)) {
            subBox.classList.remove('drag-over');
        }
    };
    subBox.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        subBox.classList.remove('drag-over');
        if (!S.dragState || S.dragState.type !== 'subgroup' || S.dragState.gid !== g.id) return;
        const from = S.dragState.fromIndex;
        const to = subIndex;
        if (reorderArray(g.subGroups, from, to)) {
            saveData();
            scheduleRender();
            const manageFilter = document.getElementById('manageSearchInput')?.value.trim().toLowerCase() || '';
            renderManageList(manageFilter);
        }
        S.dragState = null;
    };

    bindLongPressDrag(subBox, {
        itemSelector: '.manage-subgroup-box',
        container: () => subBox.parentElement,
        getIndex: () => Number(subBox.dataset.index),
        longPressMs: 550,
        moveCancelPx: 16,
        onReorder: (from, to) => {
            if (reorderArray(g.subGroups, from, to)) {
                saveData();
                scheduleRender();
                const manageFilter = document.getElementById('manageSearchInput')?.value.trim().toLowerCase() || '';
                renderManageList(manageFilter);
            }
        }
    });
}

export function setupLinkDrag(linkRow, g, sub, link, linkIndex, filterText) {
    const useTouch = preferTouchLongPress();
    linkRow.draggable = !useTouch;
    linkRow.dataset.dragType = 'link';
    linkRow.dataset.gid = g.id;
    linkRow.dataset.sid = sub.id;
    linkRow.dataset.linkId = link.id;
    linkRow.dataset.index = String(linkIndex);

    linkRow.ondragstart = (e) => {
        if (isInteractiveDragTarget(e.target)) {
            e.preventDefault();
            return;
        }
        e.stopPropagation();
        S.dragState = { type: 'link', gid: g.id, sid: sub.id, id: link.id, fromIndex: linkIndex };
        linkRow.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(link.id));
    };
    linkRow.ondragend = () => {
        linkRow.classList.remove('dragging');
        clearDragOverClasses(document.getElementById('manageGroupsContainer'));
        S.dragState = null;
    };

    linkRow.ondragover = (e) => {
        if (!S.dragState || S.dragState.type !== 'link' || S.dragState.gid !== g.id || S.dragState.sid !== sub.id) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        const parent = linkRow.parentElement;
        if (parent) parent.querySelectorAll('.manage-link-row.drag-over').forEach(el => el.classList.remove('drag-over'));
        linkRow.classList.add('drag-over');
    };
    linkRow.ondragleave = (e) => {
        if (!linkRow.contains(e.relatedTarget)) {
            linkRow.classList.remove('drag-over');
        }
    };
    linkRow.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        linkRow.classList.remove('drag-over');
        if (!S.dragState || S.dragState.type !== 'link' || S.dragState.gid !== g.id || S.dragState.sid !== sub.id) return;
        const from = S.dragState.fromIndex;
        const to = linkIndex;
        if (reorderArray(sub.links, from, to)) {
            saveData();
            scheduleRender();
            const manageFilter = document.getElementById('manageSearchInput')?.value.trim().toLowerCase() || '';
            renderManageList(manageFilter);
        }
        S.dragState = null;
    };

    bindLongPressDrag(linkRow, {
        itemSelector: '.manage-link-row',
        container: () => linkRow.parentElement,
        getIndex: () => Number(linkRow.dataset.index),
        longPressMs: 550,
        moveCancelPx: 16,
        onReorder: (from, to) => {
            if (reorderArray(sub.links, from, to)) {
                saveData();
                scheduleRender();
                const manageFilter = document.getElementById('manageSearchInput')?.value.trim().toLowerCase() || '';
                renderManageList(manageFilter);
            }
        }
    });
}

export function renderManageList(filterText = '') {
    const container = document.getElementById('manageGroupsContainer');
    const countLabel = document.getElementById('manageCategoryCount');
    if (!container) return;
    container.innerHTML = '';

    let totalCategories = S.groups.length;
    let visibleCount = 0;
    const listFrag = document.createDocumentFragment();

    S.groups.forEach((g, groupIndex) => {
        let groupHasMatch = false;
        if (filterText) {
            g.subGroups.forEach(sub => {
                sub.links.forEach(link => {
                    if (link.name.toLowerCase().includes(filterText) || link.url.toLowerCase().includes(filterText)) {
                        groupHasMatch = true;
                    }
                });
            });
            if (!groupHasMatch) return;
        }
        visibleCount++;

        let groupLinksCount = 0;
        g.subGroups.forEach(sub => {
            groupLinksCount += sub.links.length;
        });

        const groupDiv = document.createElement('div');
        groupDiv.className = 'manage-group-item';

        let isGroupCollapsed = filterText ? false : (g.manageCollapsed || false);

        const groupHeader = document.createElement('div');
        groupHeader.className = 'manage-group-header';
        groupHeader.innerHTML = `
            <div class="manage-group-header-left">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="transform: rotate(${isGroupCollapsed ? '-90deg' : '0deg'}); transition: transform 0.2s;">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                <span class="manage-title-text" data-gid="${g.id}">${escapeHtml(g.title)}</span>
                <span class="manage-link-count" style="color: var(--text-sub); font-size: 0.85rem; font-weight: normal;">${groupLinksCount} 个链接</span>
            </div>
            <div class="manage-group-header-right">
                <button type="button" class="manage-action-icon-btn" data-action="cat-edit" data-gid="${g.id}" title="重命名">
                    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button type="button" class="manage-action-icon-btn danger" data-action="cat-delete" data-gid="${g.id}" title="删除">
                    <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;

        groupDiv.appendChild(groupHeader);
        setupGroupDrag(groupDiv, g, groupIndex, filterText);

        const subgroupsContainer = document.createElement('div');
        subgroupsContainer.className = 'manage-subgroups-container';
        subgroupsContainer.style.display = isGroupCollapsed ? 'none' : 'flex';

        groupHeader.onclick = (e) => {
            if (e.target.closest('.manage-title-input') || e.target.closest('button')) return;
            g.manageCollapsed = !g.manageCollapsed;
            const collapsed = !!g.manageCollapsed;
            subgroupsContainer.style.display = collapsed ? 'none' : 'flex';
            const chev = groupHeader.querySelector('svg');
            if (chev) chev.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        };

        g.subGroups.forEach((sub, subIndex) => {
            let visibleLinks = sub.links;
            if (filterText) {
                visibleLinks = sub.links.filter(link =>
                    link.name.toLowerCase().includes(filterText) || link.url.toLowerCase().includes(filterText)
                );
                if (visibleLinks.length === 0) return;
            }

            let isSubCollapsed = filterText ? false : (sub.manageCollapsed || false);

            const subBox = document.createElement('div');
            subBox.className = 'manage-subgroup-box';

            const subHeader = document.createElement('div');
            subHeader.className = 'manage-subgroup-header';
            subHeader.innerHTML = `
                <div class="manage-subgroup-title-wrap">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="transform: rotate(${isSubCollapsed ? '-90deg' : '0deg'}); transition: transform 0.2s;">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <span class="manage-subtitle-text" data-gid="${g.id}" data-sid="${sub.id}">${escapeHtml(sub.title)}</span>
                    <span style="color: var(--text-sub); font-size: 0.78rem;">(${sub.links.length})</span>
                </div>
                <div class="manage-subgroup-actions">
                    <button type="button" class="manage-action-icon-btn" data-action="sub-edit" data-gid="${g.id}" data-sid="${sub.id}" title="重命名">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button type="button" class="manage-action-icon-btn danger" data-action="sub-delete" data-gid="${g.id}" data-sid="${sub.id}" title="删除">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;

            subBox.appendChild(subHeader);
            setupSubgroupDrag(subBox, g, sub, subIndex, filterText);

            const subLinksContainer = document.createElement('div');
            subLinksContainer.className = 'manage-subgroup-links';
            subLinksContainer.style.display = isSubCollapsed ? 'none' : 'flex';

            subHeader.onclick = (e) => {
                if (e.target.closest('.manage-title-input') || e.target.closest('button')) return;
                sub.manageCollapsed = !sub.manageCollapsed;
                const collapsed = !!sub.manageCollapsed;
                subLinksContainer.style.display = collapsed ? 'none' : 'flex';
                const chev = subHeader.querySelector('svg');
                if (chev) chev.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
            };

            visibleLinks.forEach((link) => {
                const linkIndex = sub.links.findIndex(l => sameId(l.id, link.id));
                const linkRow = document.createElement('div');
                linkRow.className = 'manage-link-row';
                linkRow.dataset.linkId = String(link.id);

                linkRow.innerHTML = `
                    <div class="manage-link-left">
                        <input type="checkbox" class="manage-link-checkbox" data-link-id="${link.id}">
                        <div class="manage-link-icon">${getLinkIconHtml(link)}</div>
                        <div class="manage-link-title" title="${escapeHtml(link.name)}">${escapeHtml(link.name)}${link.isRocket ? ' <span class="rocket-tag">⚡</span>' : ''}</div>
                    </div>
                    <div class="manage-link-right">
                        <button type="button" class="manage-sub-btn" data-action="move-link" data-link-id="${link.id}">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                            移动
                        </button>
                        <button type="button" class="manage-sub-btn danger" data-action="delete-link" data-link-id="${link.id}">
                            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            删除
                        </button>
                    </div>
                `;
                setupLinkDrag(linkRow, g, sub, link, linkIndex, filterText);
                subLinksContainer.appendChild(linkRow);
            });

            subBox.appendChild(subLinksContainer);
            subgroupsContainer.appendChild(subBox);
        });

        groupDiv.appendChild(subgroupsContainer);
        listFrag.appendChild(groupDiv);
    });

    container.appendChild(listFrag);

    if (countLabel) {
        countLabel.innerText = `${visibleCount} / ${totalCategories} 个分类`;
    }

    updateBatchBarVisibility();
    setupManageListDelegation();
}

/** 链接管理列表：事件委托（只绑定一次） */
export function setupManageListDelegation() {
    const container = document.getElementById('manageGroupsContainer');
    if (!container || container.dataset.delegated === '1') return;
    container.dataset.delegated = '1';

    container.addEventListener('change', (e) => {
        if (!e.target.classList.contains('manage-link-checkbox')) return;
        updateBatchBarVisibility();
        const allBoxes = container.querySelectorAll('.manage-link-checkbox');
        const checkedBoxes = container.querySelectorAll('.manage-link-checkbox:checked');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = allBoxes.length > 0 && allBoxes.length === checkedBoxes.length;
        }
    });

    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (btn) {
            e.stopPropagation();
            const action = btn.dataset.action;
            const linkId = btn.dataset.linkId;
            const gid = btn.dataset.gid;
            const sid = btn.dataset.sid;

            if (action === 'delete-link') {
                const ok = await showConfirm('确定要删除此链接吗？', '删除链接');
                if (ok) {
                    removeLinkById(linkId);
                    saveData();
                    scheduleRender();
                }
                return;
            }
            if (action === 'move-link') {
                const target = await showMovePicker('请选择要移动到的目标二级分类');
                if (!target) return;
                const foundLink = removeLinkById(linkId);
                if (!foundLink) return;
                const destSub = S.groups.find(g => g.id === target.gid)?.subGroups.find(s => s.id === target.sid);
                if (destSub) {
                    destSub.links.push(foundLink);
                    saveData();
                    scheduleRender();
                    await showAlert('移动成功！');
                }
                return;
            }
            if (action === 'cat-edit') {
                const g = S.groups.find(item => item.id === gid);
                if (!g) return;
                const span = btn.closest('.manage-group-header')?.querySelector('.manage-title-text');
                if (!span) return;
                startInlineRename(span, g.title, (newTitle) => {
                    g.title = newTitle;
                    saveData();
                    scheduleRender();
                });
                return;
            }
            if (action === 'cat-delete') {
                const ok = await showConfirm('确定要删除该大分类及其所有二级分类和链接吗？', '删除分类');
                if (ok) {
                    S.groups = S.groups.filter(item => item.id !== gid);
                    if (S.activeGroupId === gid) S.activeGroupId = S.groups[0]?.id || null;
                    saveData();
                    scheduleRender();
                }
                return;
            }
            if (action === 'sub-edit') {
                const g = S.groups.find(item => item.id === gid);
                const sub = g?.subGroups.find(s => s.id === sid);
                if (!sub) return;
                const span = btn.closest('.manage-subgroup-header')?.querySelector('.manage-subtitle-text');
                if (!span) return;
                startInlineRename(span, sub.title, (newTitle) => {
                    sub.title = newTitle;
                    saveData();
                    scheduleRender();
                });
                return;
            }
            if (action === 'sub-delete') {
                const g = S.groups.find(item => item.id === gid);
                if (!g) return;
                if (g.subGroups.length <= 1) {
                    await showAlert('每个大分类至少需保留一个二级分类！');
                    return;
                }
                const ok = await showConfirm('确定要删除该二级分类吗？其中的链接也将被移除。', '删除二级分类');
                if (ok) {
                    g.subGroups = g.subGroups.filter(s => s.id !== sid);
                    if (g.activeSubId === sid) g.activeSubId = g.subGroups[0]?.id || null;
                    saveData();
                    scheduleRender();
                }
                return;
            }
        }

        if (e.target.closest('.manage-link-checkbox') || e.target.closest('.manage-sub-btn')) return;
        const row = e.target.closest('.manage-link-row');
        if (!row) return;
        const linkId = row.dataset.linkId;
        const found = findLinkById(linkId);
        if (found) openEditLinkModal(found.link);
    });
}

