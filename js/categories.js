/**
 * =============================================================================
 * categories.js - 设置面板辅助（可折叠区块）
 * =============================================================================
 *
 * 历史说明：
 *   早期版本曾在此文件实现「分类结构管理」独立面板（structure-cat-*），
 *   该 UI 已合并到链接管理（manage.js），相关拖拽/渲染逻辑已移除。
 *
 * 当前职责：
 *   - setupCollapsibleSection：设置内可折叠卡片
 *   - collapseAllSettingsSections：打开设置时统一折叠，避免面板过高
 *
 * 依赖：state.js（仅 collapse 时写 manage 折叠标记）
 */

import { S } from './state.js';

/**
 * 绑定设置页内「标题行点击 → 折叠/展开卡片」交互
 * @param {string} toggleId  触发按钮/标题元素 id
 * @param {string} cardId    被折叠的卡片容器 id（通过 data-collapsed 控制）
 */
export function setupCollapsibleSection(toggleId, cardId) {
    const toggle = document.getElementById(toggleId);
    const card = document.getElementById(cardId);
    if (!toggle || !card) return;

    toggle.onclick = () => {
        const collapsed = card.dataset.collapsed === 'true';
        const next = !collapsed;
        card.dataset.collapsed = next ? 'true' : 'false';
        toggle.setAttribute('aria-expanded', next ? 'false' : 'true');
    };
}

/**
 * 将设置内所有可折叠区域恢复为折叠状态。
 * 打开设置弹窗时调用，避免上次展开的长列表占满视口。
 * 同时把「链接管理」树内部分组默认全部折叠（写在此处以避免与 render 循环依赖）。
 */
export function collapseAllSettingsSections() {
    const pairs = [
        ['engineListToggle', 'engineListCollapsible']
    ];
    pairs.forEach(([toggleId, cardId]) => {
        const toggle = document.getElementById(toggleId);
        const card = document.getElementById(cardId);
        if (card) card.dataset.collapsed = 'true';
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });

    // 链接管理树：默认全部折叠
    S.manageAllCollapsed = true;
    S.groups.forEach(g => {
        g.manageCollapsed = true;
        (g.subGroups || []).forEach(sub => {
            sub.manageCollapsed = true;
        });
    });
}
