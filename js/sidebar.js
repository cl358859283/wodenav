/**
 * =============================================================================
 * sidebar.js - 侧边栏与滚动高亮
 * =============================================================================
 */
import { S, saveData } from './state.js';
import {
    throttle, escapeHtml, isMobile,
    safeLocalGet, safeLocalSet
} from './utils.js';


export function initSidebar() {
    S.sidebarCollapsed = safeLocalGet('sidebar_collapsed') !== '0';
    updateSidebarUI();

    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            S.sidebarCollapsed = true;
            safeLocalSet('sidebar_collapsed', '1');
            updateSidebarUI();
        });
    }

    let resizeTimer = null;
    const onViewportChange = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // 从桌面切到移动：强制收起抽屉，避免状态错乱
            if (isMobile() && !S.sidebarCollapsed) {
                // 保持用户打开状态，只同步 class
            }
            if (!isMobile()) {
                document.body.style.overflow = '';
            }
            updateSidebarUI();
            updateScrollObserver();
        }, 120);
    };
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);
}

export function toggleSidebar() {
    const willOpen = S.sidebarCollapsed;
    S.sidebarCollapsed = !S.sidebarCollapsed;
    safeLocalSet('sidebar_collapsed', S.sidebarCollapsed ? '1' : '0');
    // 打开侧边栏时，一二级目录默认折叠
    if (willOpen) {
        S.groups.forEach(g => {
            g.sidebarExpanded = false;
        });
        try { saveData(); } catch (_) { /* ignore */ }
    }
    updateSidebarUI();
}

export function updateSidebarUI() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleBtn = document.getElementById('sidebarToggle');
    if (!sidebar) return;

    const isOpen = !S.sidebarCollapsed;
    sidebar.classList.toggle('collapsed', S.sidebarCollapsed);
    if (toggleBtn) {
        toggleBtn.classList.toggle('is-open', isOpen);
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    if (isMobile()) {
        sidebar.classList.toggle('mobile-open', isOpen);
        if (overlay) overlay.classList.toggle('show', isOpen);
        // 抽屉打开时锁定背景滚动，避免穿透
        document.body.style.overflow = S.sidebarCollapsed ? '' : 'hidden';
    } else {
        // 桌面端：侧边栏不遮罩主内容，可同时操作
        sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
    renderSidebar();
}

const SIDEBAR_FOLDER_ICON = `<svg class="sidebar-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.1c.4 0 .8.16 1.1.44L11 6.8h7.5A2.5 2.5 0 0 1 21 9.3v8.2A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M3 10h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const SIDEBAR_CHEVRON = `<svg class="sidebar-chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;

const SIDEBAR_SUB_ICON = `<svg class="sidebar-sub-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h12M4 18h8"/></svg>`;

function closeSidebarOnMobileOrFolder(isFolderLayout) {
    if (isMobile() || isFolderLayout) {
        S.sidebarCollapsed = true;
        safeLocalSet('sidebar_collapsed', '1');
        updateSidebarUI();
        return true;
    }
    return false;
}

export function renderSidebar() {
    const menuWrap = document.getElementById('sidebarMenu');
    if (!menuWrap) return;
    menuWrap.replaceChildren();

    const isFolderLayout = S.currentHomeLayout === 'folder';
    const frag = document.createDocumentFragment();

    if (!S.groups.length) {
        const empty = document.createElement('div');
        empty.className = 'sidebar-empty';
        empty.textContent = '暂无分类';
        frag.appendChild(empty);
        menuWrap.appendChild(frag);
        return;
    }

    S.groups.forEach((g) => {
        if (!g.subGroups) g.subGroups = [];
        // sidebarExpanded：默认折叠（有二级时）
        if (g.sidebarExpanded === undefined) g.sidebarExpanded = false;

        const linkCount = g.subGroups.reduce((sum, sub) => sum + (sub.links?.length || 0), 0);
        const subCount = g.subGroups.length;
        const countLabel = linkCount || subCount || '';
        const hasSubs = subCount > 0;
        const isExpanded = hasSubs && g.sidebarExpanded;
        const isGroupActive = S.activeGroupId === g.id;

        const block = document.createElement('div');
        block.className = `sidebar-group-block${isGroupActive ? ' active' : ''}${isExpanded ? ' is-expanded' : ''}`;
        block.dataset.gid = g.id;

        const row = document.createElement('div');
        row.className = `sidebar-group-row${isGroupActive ? ' active' : ''}`;

        // 折叠箭头（仅有二级时显示）
        if (hasSubs) {
            const chevronBtn = document.createElement('button');
            chevronBtn.type = 'button';
            chevronBtn.className = `sidebar-chevron${isExpanded ? ' open' : ''}`;
            chevronBtn.setAttribute('aria-label', isExpanded ? '折叠二级分类' : '展开二级分类');
            chevronBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            chevronBtn.innerHTML = SIDEBAR_CHEVRON;
            chevronBtn.onclick = (e) => {
                e.stopPropagation();
                g.sidebarExpanded = !g.sidebarExpanded;
                try { saveData(); } catch (_) { /* ignore */ }
                renderSidebar();
            };
            row.appendChild(chevronBtn);
        } else {
            const spacer = document.createElement('span');
            spacer.className = 'sidebar-chevron-spacer';
            spacer.setAttribute('aria-hidden', 'true');
            row.appendChild(spacer);
        }

        const item = document.createElement('div');
        item.className = 'sidebar-group-item';
        item.setAttribute('role', 'button');
        item.tabIndex = 0;
        item.innerHTML = `
            ${SIDEBAR_FOLDER_ICON}
            <div class="sidebar-text">${escapeHtml(g.title)}</div>
            ${countLabel !== '' ? `<span class="sidebar-count">${escapeHtml(String(countLabel))}</span>` : ''}
        `;
        const activateGroup = () => {
            if (isFolderLayout) {
                import('./render.js').then((m) => {
                    if (typeof m.openFolderModal === 'function') m.openFolderModal(g.id);
                }).catch(() => {});
            } else {
                // 无二级：仅滚动；有二级且折叠时先展开
                if (hasSubs && !g.sidebarExpanded) {
                    g.sidebarExpanded = true;
                    try { saveData(); } catch (_) { /* ignore */ }
                }
                scrollToGroup(g.id);
            }
            if (!closeSidebarOnMobileOrFolder(isFolderLayout)) {
                renderSidebar();
            }
        };
        item.onclick = activateGroup;
        item.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activateGroup();
            }
        };
        row.appendChild(item);
        block.appendChild(row);

        // 可折叠二级目录
        if (hasSubs) {
            const subList = document.createElement('div');
            subList.className = `sidebar-sub-list${isExpanded ? ' open' : ''}`;
            subList.hidden = !isExpanded;
            subList.setAttribute('role', 'group');
            subList.setAttribute('aria-label', `${g.title} 的二级分类`);

            g.subGroups.forEach((sub) => {
                const subLinkCount = sub.links?.length || 0;
                const isSubActive = isGroupActive && (
                    isFolderLayout
                        ? (S.folderPath && S.folderPath.subId === sub.id)
                        : (g.activeSubId === sub.id)
                );

                const subRow = document.createElement('div');
                subRow.className = `sidebar-sub-row${isSubActive ? ' active' : ''}`;

                const subItem = document.createElement('div');
                subItem.className = 'sidebar-sub-item';
                subItem.setAttribute('role', 'button');
                subItem.tabIndex = 0;
                subItem.innerHTML = `
                    ${SIDEBAR_SUB_ICON}
                    <div class="sidebar-text">${escapeHtml(sub.title)}</div>
                    ${subLinkCount ? `<span class="sidebar-count">${escapeHtml(String(subLinkCount))}</span>` : ''}
                `;
                const activateSub = () => {
                    S.activeGroupId = g.id;
                    g.activeSubId = sub.id;
                    if (isFolderLayout) {
                        import('./render.js').then((m) => {
                            if (typeof m.openFolderModal === 'function') {
                                m.openFolderModal(g.id, sub.id);
                            }
                        }).catch(() => {});
                    } else {
                        import('./render.js').then((m) => {
                            if (typeof m.switchTab === 'function') m.switchTab(g.id, sub.id);
                        }).catch(() => {});
                        scrollToGroup(g.id);
                    }
                    if (!closeSidebarOnMobileOrFolder(isFolderLayout)) {
                        renderSidebar();
                    }
                };
                subItem.onclick = activateSub;
                subItem.onkeydown = (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        activateSub();
                    }
                };
                subRow.appendChild(subItem);
                subList.appendChild(subRow);
            });
            block.appendChild(subList);
        }

        frag.appendChild(block);
    });
    menuWrap.appendChild(frag);
}

export function scrollToGroup(gid) {
    const target = document.querySelector(`.group-section[data-gid="${gid}"]`);
    if (!target) {
        S.activeGroupId = gid;
        renderSidebar();
        return;
    }

    S.activeGroupId = gid;
    renderSidebar();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function initScrollObserver() {
    if (!('IntersectionObserver' in window)) {
        window.addEventListener('scroll', handleScrollFallback, { passive: true });
        return;
    }
    updateScrollObserver();
}

export function updateScrollObserver() {
    if (S.scrollObserver) S.scrollObserver.disconnect();
    const sections = document.querySelectorAll('.group-section');
    if (!sections.length) return;

    S.scrollObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                S.activeGroupId = e.target.dataset.gid;
                renderSidebar();
            }
        });
    }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });

    sections.forEach(s => S.scrollObserver.observe(s));
}

export const handleScrollFallback = throttle(() => {
    const sections = document.querySelectorAll('.group-section');
    let currentId = null;
    const st = window.scrollY || window.pageYOffset || 0;
    for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        if (st >= s.offsetTop - 100) currentId = s.dataset.gid;
    }
    if (currentId && currentId !== S.activeGroupId) {
        S.activeGroupId = currentId;
        renderSidebar();
    }
}, 120);

