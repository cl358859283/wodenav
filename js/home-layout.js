/**
 * =============================================================================
 * home-layout.js - 首页布局模式（文件夹 / 直显）
 * =============================================================================
 */
import { S, scheduleRender } from './state.js';
import { safeLocalGet, safeLocalSet } from './utils.js';
import { closeModal } from './dialogs.js';

export const HOME_LAYOUT_LABELS = {
    folder: '主页显示一级分类文件夹，点击后在对话框中浏览二级目录与链接',
    direct: '直接展示所有分类与链接，适合内容较少时一览无余'
};

/** 文件夹模式导航路径：null 表示根目录；groupId 进入一级分类；subId 进入二级目录 */


export function loadHomeLayout() {
    const saved = safeLocalGet('nav_home_layout');
    if (saved && ['folder', 'direct'].includes(saved)) {
        S.currentHomeLayout = saved;
    } else {
        // 兼容旧版 sidebar，自动回退到直显
        S.currentHomeLayout = 'direct';
        if (saved === 'sidebar') safeLocalSet('nav_home_layout', 'direct');
    }
}

export function setHomeLayout(layout) {
    if (!['folder', 'direct'].includes(layout)) layout = 'direct';
    S.currentHomeLayout = layout;
    safeLocalSet('nav_home_layout', layout);
    // 切换布局时关闭文件夹对话框并重置路径
    S.folderPath = { groupId: null, subId: null };
    const folderModal = document.getElementById('folderModal');
    if (folderModal && folderModal.style.display === 'flex') {
        closeModal('folderModal');
    }
    updateHomeLayoutUI();
    applyHomeLayout();
    scheduleRender();
}

export function updateHomeLayoutUI() {
    document.querySelectorAll('.home-layout-btn').forEach(btn => {
        const isActive = btn.dataset.layout === S.currentHomeLayout;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    const desc = document.getElementById('homeLayoutDesc');
    if (desc) desc.textContent = HOME_LAYOUT_LABELS[S.currentHomeLayout] || '';
}

export function applyHomeLayout() {
    document.body.classList.remove('layout-folder', 'layout-direct', 'layout-sidebar');
    document.body.classList.add(`layout-${S.currentHomeLayout}`);
}

export function initHomeLayout() {
    loadHomeLayout();
    updateHomeLayoutUI();
    applyHomeLayout();

    document.querySelectorAll('.home-layout-btn').forEach(btn => {
        btn.onclick = () => {
            setHomeLayout(btn.dataset.layout);
        };
    });
}

