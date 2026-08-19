/**
 * =============================================================================
 * links.js - 链接增删改、移动选择器、图标预览、书签导入
 * =============================================================================
 */
import { S, scheduleRender, saveData } from './state.js';
import {
    escapeHtml, getDomain, formatUrl, safeLocalGet
} from './utils.js';
import { LOCAL_ICON_DIR, LOCAL_ICONS } from './config.js';
import { openModal, closeModal, showAlert, showConfirm, showPrompt } from './dialogs.js';

export function showMovePicker(hint = '请选择要移动到的目标二级分类') {
    return new Promise(resolve => {
        const modal = openModal('moveModal');
        document.getElementById('moveTitle').textContent = '选择目标分类';
        document.getElementById('moveHint').textContent = hint;
        const list = document.getElementById('moveTargetList');
        const collapsedMap = {};

        function renderList() {
            list.innerHTML = '';
            if (!S.groups.length) {
                list.innerHTML = '<div class="move-empty">暂无可用分类</div>';
                return;
            }
            S.groups.forEach((g) => {
                const collapsed = !!collapsedMap[g.id];
                const groupBox = document.createElement('div');
                groupBox.className = 'move-group-box';

                const groupHeader = document.createElement('div');
                groupHeader.className = 'move-group-header';
                groupHeader.innerHTML = `
                    <svg class="move-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="transform:rotate(${collapsed ? '-90deg' : '0deg'})">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;opacity:.7">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span class="move-group-title">${escapeHtml(g.title)}</span>
                    <span class="move-group-count">${g.subGroups.length} 个子分类</span>
                `;
                groupHeader.onclick = () => {
                    collapsedMap[g.id] = !collapsedMap[g.id];
                    renderList();
                };
                groupBox.appendChild(groupHeader);

                if (!collapsed) {
                    const subWrap = document.createElement('div');
                    subWrap.className = 'move-sub-wrap';
                    if (!g.subGroups.length) {
                        subWrap.innerHTML = '<div class="move-empty-sub">暂无二级分类</div>';
                    } else {
                        g.subGroups.forEach((sub) => {
                            const subBtn = document.createElement('button');
                            subBtn.type = 'button';
                            subBtn.className = 'move-sub-btn';
                            subBtn.innerHTML = `
                                <span class="move-sub-title">${escapeHtml(sub.title)}</span>
                                <span class="move-sub-count">${sub.links.length}</span>
                            `;
                            subBtn.onclick = (e) => {
                                e.stopPropagation();
                                done({ gid: g.id, sid: sub.id, name: `${g.title} > ${sub.title}` });
                            };
                            subWrap.appendChild(subBtn);
                        });
                    }
                    groupBox.appendChild(subWrap);
                }
                list.appendChild(groupBox);
            });
        }

        renderList();
        const cancelBtn = document.getElementById('moveCancelBtn');
        const done = (result) => {
            closeModal('moveModal');
            cancelBtn.onclick = null;
            modal.onclick = null;
            resolve(result);
        };
        cancelBtn.onclick = () => done(null);
        modal.onclick = (e) => { if (e.target === modal) done(null); };
    });
}

export function updateIconPreview(src) {
    const container = document.getElementById('iconPreviewContainer');
    if (!container) return;
    if (src) {
        container.innerHTML = `<img src="${escapeHtml(src)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" onerror="this.parentElement.textContent='?'">`;
    } else {
        container.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
    }
}

/** 预设图标路径数据（用于生成 SVG data URI） */
const PRESET_ICON_PATHS = [
    // 第一行
    'M16 18l6-6-6-6M8 6l-6 6 6 6',
    'M12 2a7 7 0 0 0-4.9 12 3.5 3.5 0 0 1 1.4 2.6V18h7v-1.4a3.5 3.5 0 0 1 1.4-2.6A7 7 0 0 0 12 2z',
    'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
    'M9 3h6v4H9zM5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7zM9 11h6',
    'M4 6h16M4 12h16M4 18h10',
    'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    // 第二行
    'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    'M3 12h18M3 6h18M3 18h18',
    'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    'M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01',
    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z',
    // 第三行
    'M3 11l19-9-9 19-2-8-8-2z',
    'M12 2L2 7l10 5 10-5-10-5z',
    'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
    'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2zM12 11v6M9 14h6',
    'M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z',
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
    // 第四行
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15h6',
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4',
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15h6',
    'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
    'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
    // 第五行
    'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6',
    'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
    'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
    'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2zM8 7h8M8 11h8',
    'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h2M8 17h2M14 13h2M14 17h2',
    // 第六行
    'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
    'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
    'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    'M4 17l6-6-6-6M12 19h8',
    'M16 18l6-6-6-6M8 6l-6 6 6 6',
    'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
];

function svgPathToDataUri(pathD) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${pathD}"/></svg>`;
    return `data:image/svg+xml,${svg}`;
}

function ensureIconPickerGrid() {
    const grid = document.getElementById('iconPickerGrid');
    if (!grid || grid.dataset.ready === '1') return grid;
    grid.innerHTML = PRESET_ICON_PATHS.map((d, i) => `
        <button type="button" class="icon-picker-item" data-icon-index="${i}" title="预设图标 ${i + 1}">
            <svg viewBox="0 0 24 24"><path d="${d}"></path></svg>
        </button>
    `).join('');
    grid.dataset.ready = '1';
    return grid;
}

/**
 * 打开自定义图标选择弹窗
 * @param {(src: string) => void} onSelect 选中图标后的回调（data URL 或 SVG data URI）
 * @param {string} [currentSrc] 当前已选图标，用于高亮
 */
export function openIconPicker(onSelect, currentSrc = '') {
    const modal = document.getElementById('iconPickerModal');
    if (!modal) return;

    const grid = ensureIconPickerGrid();
    const fileInput = document.getElementById('iconPickerFileInput');
    const uploadBtn = document.getElementById('iconPickerUploadBtn');
    const closeBtn = document.getElementById('iconPickerCloseBtn');

    const finish = (src) => {
        closeModal('iconPickerModal');
        if (src && typeof onSelect === 'function') onSelect(src);
    };

    // 高亮当前选中
    if (grid) {
        grid.querySelectorAll('.icon-picker-item').forEach(btn => {
            const idx = Number(btn.dataset.iconIndex);
            const src = svgPathToDataUri(PRESET_ICON_PATHS[idx]);
            btn.classList.toggle('active', !!currentSrc && currentSrc === src);
            btn.onclick = () => finish(src);
        });
    }

    if (uploadBtn && fileInput) {
        uploadBtn.onclick = () => fileInput.click();
        fileInput.value = '';
        fileInput.onchange = async () => {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const okType = /image\/(jpeg|png|webp)/i.test(file.type);
            if (!okType) {
                await showAlert('仅支持 JPG、PNG、WEBP 格式');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                await showAlert('图片大小不能超过 2MB');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                if (typeof result === 'string') finish(result);
            };
            reader.onerror = () => showAlert('读取图片失败');
            reader.readAsDataURL(file);
        };
    }

    if (closeBtn) closeBtn.onclick = () => closeModal('iconPickerModal');
    modal.onclick = (e) => { if (e.target === modal) closeModal('iconPickerModal'); };

    openModal('iconPickerModal');
}

export function updateEditLinkIconPreview(src, name) {
    const inner = document.getElementById('editLinkIconInner');
    if (!inner) return;
    if (src) {
        inner.innerHTML = `<img src="${escapeHtml(src)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" onerror="this.parentElement.textContent='?'">`;
    } else if (name) {
        inner.textContent = (name[0] || '?').toUpperCase();
    } else {
        inner.textContent = '?';
    }
}

export function openEditLinkModal(link) {
    S.editingLinkId = link.id;
    document.getElementById('editLinkUrl').value = link.url || '';
    document.getElementById('editLinkName').value = link.name || '';
    const descEl = document.getElementById('editLinkDesc');
    if (descEl) descEl.value = link.desc || '';
    document.getElementById('editLinkIcon').value = link.localIcon || '';
    document.getElementById('editLinkRocket').checked = !!link.isRocket;
    const resolved = resolveLinkIconSrc(link);
    updateEditLinkIconPreview(resolved ? resolved.src : '', link.name);
    openModal('editLinkModal');
}

export function closeEditLinkModal() {
    closeModal('editLinkModal');
    S.editingLinkId = null;
}

export function saveEditLink() {
    if (S.editingLinkId == null) return;
    const url = document.getElementById('editLinkUrl').value.trim();
    const name = document.getElementById('editLinkName').value.trim();
    const descEl = document.getElementById('editLinkDesc');
    const desc = descEl ? descEl.value.trim() : '';
    const icon = document.getElementById('editLinkIcon').value.trim();
    if (!url || !name) {
        showAlert('请填写 URL 和标题！');
        return;
    }
    const found = findLinkById(S.editingLinkId);
    if (!found) {
        closeEditLinkModal();
        return;
    }
    found.link.url = formatUrl(url);
    found.link.name = name;
    found.link.desc = desc;
    found.link.localIcon = icon;
    found.link.isRocket = document.getElementById('editLinkRocket').checked;
    saveData();
    closeEditLinkModal();
    scheduleRender();
}

/**
 * 规范化本地图标路径（支持 icons/xxx.png、相对路径、绝对 URL / file 路径）
 */
export function normalizeIconPath(path) {
    if (!path) return '';
    let fp = String(path).trim().replace(/\\/g, '/');
    if (/^[a-zA-Z]:\//.test(fp)) fp = 'file:///' + fp;
    return fp;
}

/** 运行时负缓存：已确认不存在的本地路径，避免重复 404 */
const _iconMissCache = new Set();

/** 域名 → 已解析的最终 src（会话内缓存，减少重复计算） */
const _iconResolvedCache = new Map();

/**
 * 从 LOCAL_ICONS 登记表解析本地路径（O(1)，无目录扫描）
 * @param {string} domain
 * @returns {string} 相对路径或空串
 */
export function lookupRegisteredLocalIcon(domain) {
    if (!domain || !LOCAL_ICONS) return '';
    const map = LOCAL_ICONS;
    let file = map[domain] || '';
    if (!file && domain.startsWith('www.')) {
        file = map[domain.slice(4)] || '';
    }
    if (!file) {
        // 也允许以文件名（含扩展名）为 key 的写法
        const keys = Object.keys(map);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (k === domain || k.startsWith(domain + '.') || map[k] === domain) {
                file = map[k];
                break;
            }
        }
    }
    if (!file) return '';
    if (/^(https?:|data:|file:|\/)/i.test(file) || file.includes('/')) {
        return file.startsWith('icons/') || /^(https?:|data:|file:|\/)/i.test(file)
            ? file
            : `${LOCAL_ICON_DIR || 'icons'}/${file}`;
    }
    return `${LOCAL_ICON_DIR || 'icons'}/${file}`;
}

/**
 * 解析链接最终图标地址（自定义 > 本地登记 > 在线 favicon）
 * @returns {{ src: string, domain: string, isRemote: boolean } | null}
 */
export function resolveLinkIconSrc(link) {
    if (!link) return null;
    if (link.localIcon) {
        const src = normalizeIconPath(link.localIcon);
        return src ? { src, domain: '', isRemote: /^https?:/i.test(src) } : null;
    }
    const domain = getDomain(link.url);
    if (!domain) return null;

    if (_iconResolvedCache.has(domain)) {
        return _iconResolvedCache.get(domain);
    }

    const local = lookupRegisteredLocalIcon(domain);
    if (local && !_iconMissCache.has(local)) {
        const resolved = { src: local, domain, isRemote: false };
        _iconResolvedCache.set(domain, resolved);
        return resolved;
    }

    const remote = `https://favicon.im/${domain}?larger=true`;
    const resolved = { src: remote, domain, isRemote: true };
    _iconResolvedCache.set(domain, resolved);
    return resolved;
}

/**
 * 图标 onerror：本地登记失败则改走在线 favicon，再失败显示首字母
 * 负缓存本地路径，同页后续渲染不再请求该本地文件
 */
export function handleNavIconError(el) {
    if (!el) return;
    const fallback = el.dataset.fallback || '?';
    const domain = el.dataset.domain || '';
    const triedLocal = el.dataset.triedLocal === '1';

    if (el.dataset.localSrc) {
        _iconMissCache.add(el.dataset.localSrc);
    }

    if (domain && !triedLocal) {
        // 本地失败 → 一次远程回退
        el.dataset.triedLocal = '1';
        _iconResolvedCache.set(domain, {
            src: `https://favicon.im/${domain}?larger=true`,
            domain,
            isRemote: true
        });
        el.src = `https://favicon.im/${domain}?larger=true`;
        return;
    }

    el.outerHTML = `<span>${fallback}</span>`;
}

try {
    if (typeof window !== 'undefined') {
        window.handleNavIconError = handleNavIconError;
    }
} catch (_) { /* ignore */ }

/**
 * 生成图标 img HTML（懒加载；本地仅走登记表，避免多扩展名连环 404）
 */
export function getLinkIconHtml(link) {
    const fallbackChar = escapeHtml((link.name || '?')[0].toUpperCase());
    const resolved = resolveLinkIconSrc(link);

    if (!resolved || !resolved.src) {
        return `<span>${fallbackChar}</span>`;
    }

    const src = escapeHtml(resolved.src);
    const domainAttr = resolved.domain ? ` data-domain="${escapeHtml(resolved.domain)}"` : '';
    const localAttr = !resolved.isRemote
        ? ` data-local-src="${src}" data-tried-local="0"`
        : ' data-tried-local="1"';

    // 已是远程：失败直接首字母；本地：失败再试远程一次
    if (resolved.isRemote && !link.localIcon) {
        return `<img src="${src}" alt="" width="44" height="44" loading="lazy" decoding="async" data-fallback="${fallbackChar}"${domainAttr}${localAttr} onerror="this.outerHTML='<span>'+this.dataset.fallback+'</span>'">`;
    }
    if (link.localIcon) {
        return `<img src="${src}" alt="" width="44" height="44" loading="lazy" decoding="async" data-fallback="${fallbackChar}" onerror="this.outerHTML='<span>'+this.dataset.fallback+'</span>'">`;
    }
    return `<img src="${src}" alt="" width="44" height="44" loading="lazy" decoding="async" data-fallback="${fallbackChar}"${domainAttr}${localAttr} onerror="window.handleNavIconError&&window.handleNavIconError(this)">`;
}

/** 链接 ID 宽松比较（兼容 number / string） */
export function sameId(a, b) {
    if (a == null || b == null) return false;
    return String(a) === String(b);
}

export function findLinkById(linkId) {
    for (const g of S.groups) {
        for (const sub of g.subGroups) {
            const idx = sub.links.findIndex(l => sameId(l.id, linkId));
            if (idx !== -1) return { group: g, sub, link: sub.links[idx], linkIndex: idx };
        }
    }
    return null;
}

export function removeLinkById(linkId) {
    const found = findLinkById(linkId);
    if (!found) return null;
    return found.sub.links.splice(found.linkIndex, 1)[0];
}

export function removeLinksByIds(ids) {
    const idSet = new Set((ids || []).map(id => String(id)));
    const removed = [];
    S.groups.forEach(g => {
        g.subGroups.forEach(sub => {
            sub.links = sub.links.filter(l => {
                if (idSet.has(String(l.id))) { removed.push(l); return false; }
                return true;
            });
        });
    });
    return removed;
}

export function addSubGroupTo(group, title) {
    const sub = { id: 's_' + Date.now(), title: title.trim(), fold: false, links: [] };
    group.subGroups.push(sub);
    return sub;
}

export function parseBookmarkHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    let idSeq = Date.now();
    const nextId = (prefix) => prefix + '_' + (idSeq++);

    function parseDl(dl) {
        const result = { folders: [], links: [] };
        if (!dl) return result;
        let node = dl.firstElementChild;
        while (node) {
            if (node.tagName === 'DT') {
                const h3 = node.querySelector(':scope > H3');
                const a = node.querySelector(':scope > A');
                if (h3) {
                    const folderName = (h3.textContent || '').trim() || '未命名文件夹';
                    let childDl = node.nextElementSibling;
                    if (!childDl || childDl.tagName !== 'DL') {
                        childDl = node.querySelector(':scope > DL');
                    }
                    const children = parseDl(childDl);
                    result.folders.push({
                        title: folderName,
                        folders: children.folders,
                        links: children.links
                    });
                    if (childDl && childDl.parentElement === dl) {
                        node = childDl.nextElementSibling;
                        continue;
                    }
                } else if (a) {
                    const href = a.getAttribute('href') || '';
                    if (href && !href.toLowerCase().startsWith('javascript:') && !href.toLowerCase().startsWith('data:')) {
                        result.links.push({
                            name: (a.textContent || '').trim() || href,
                            url: href,
                            icon: a.getAttribute('ICON') || a.getAttribute('icon') || ''
                        });
                    }
                }
            } else if (node.tagName === 'DL') {
                const nested = parseDl(node);
                result.folders.push(...nested.folders);
                result.links.push(...nested.links);
            }
            node = node.nextElementSibling;
        }
        return result;
    }

    const rootDl = doc.querySelector('dl');
    const tree = parseDl(rootDl);
    const importedGroups = [];

    function makeLink(item) {
        return {
            id: nextId('l'),
            name: item.name,
            desc: '',
            url: item.url,
            localIcon: item.icon || '',
            isExternal: true,
            isRocket: false
        };
    }

    function makeSub(title, links) {
        return {
            id: nextId('s'),
            title: title,
            fold: false,
            links: links.map(makeLink)
        };
    }

    if (tree.links.length) {
        const gid = nextId('g');
        const sid = nextId('s');
        importedGroups.push({
            id: gid,
            title: '导入书签',
            desc: '从浏览器导入的书签',
            collapsed: false,
            activeSubId: sid,
            subGroups: [{
                id: sid,
                title: '未分类',
                fold: false,
                links: tree.links.map(makeLink)
            }],
            links: []
        });
    }

    tree.folders.forEach((folder) => {
        const subGroups = [];
        if (folder.links.length) {
            subGroups.push(makeSub('默认', folder.links));
        }
        folder.folders.forEach((subFolder) => {
            const links = [...subFolder.links];
            const flatten = (f) => {
                f.folders.forEach((nf) => {
                    links.push(...nf.links);
                    flatten(nf);
                });
            };
            flatten(subFolder);
            subGroups.push(makeSub(subFolder.title, links));
        });

        if (!subGroups.length) {
            subGroups.push(makeSub('默认', []));
        }

        importedGroups.push({
            id: nextId('g'),
            title: folder.title,
            desc: '',
            collapsed: false,
            activeSubId: subGroups[0].id,
            subGroups,
            links: []
        });
    });

    return importedGroups;
}

export async function importBookmarksFromFile(file) {
    if (!file) return;
    const text = await file.text();
    let imported;
    try {
        imported = parseBookmarkHtml(text);
    } catch (err) {
        console.error(err);
        await showAlert('书签文件解析失败，请确认是浏览器导出的 HTML 书签文件。');
        return;
    }
    if (!imported.length) {
        await showAlert('未在文件中找到可用书签。');
        return;
    }

    let linkCount = 0;
    imported.forEach(g => g.subGroups.forEach(s => { linkCount += s.links.length; }));

    const ok = await showConfirm(
        `将导入 ${imported.length} 个分类、共 ${linkCount} 条链接，添加到现有导航中。是否继续？`,
        '导入浏览器书签'
    );
    if (!ok) return;

    S.groups.push(...imported);
    if (!S.activeGroupId && S.groups.length) S.activeGroupId = S.groups[0].id;
    saveData();
    scheduleRender();
    await showAlert(`导入成功！新增 ${imported.length} 个分类、${linkCount} 条链接。`);
}

