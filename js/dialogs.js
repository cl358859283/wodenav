/**
 * =============================================================================
 * dialogs.js - 通用模态弹窗（Alert / Confirm / Prompt）
 * =============================================================================
 *
 * 职责：
 *   - 提供 Promise 风格的 Alert / Confirm / Prompt，替代原生 window.alert 等
 *   - 统一处理键盘（Enter / Escape）、遮罩点击关闭、焦点管理
 *   - 与 index.html 中预置的 #alertModal / #confirmModal / #promptModal 配合
 *
 * 设计要点：
 *   - 每次打开都重新绑定事件，关闭时彻底清理，避免内存泄漏与重复触发
 *   - 使用 aria-hidden 提升无障碍
 *   - 不依赖任何业务数据，纯 UI 工具
 *
 * 使用示例：
 *   await showAlert('操作成功');
 *   const ok = await showConfirm('确定删除？');
 *   const name = await showPrompt('请输入名称', '默认值');
 */

/**
 * 打开指定 id 的模态框（display:flex + aria-hidden=false）
 * @param {string} id 模态框元素 id
 * @returns {HTMLElement|null}
 */
export function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return null;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    return modal;
}

/**
 * 关闭指定 id 的模态框
 * @param {string} id
 */
export function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
}

/**
 * 临时绑定全局 keydown，返回解绑函数
 * @param {(e: KeyboardEvent) => void} onKey
 * @returns {() => void}
 */
function bindModalKeys(onKey) {
    const handler = (e) => onKey(e);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
}

/**
 * 显示提示弹窗（仅确认）
 * @param {string} message 提示内容
 * @returns {Promise<void>}
 */
export function showAlert(message) {
    return new Promise(resolve => {
        const modal = openModal('alertModal');
        if (!modal) { resolve(); return; }
        const msgEl = document.getElementById('alertMessage');
        if (msgEl) msgEl.textContent = message;
        const okBtn = document.getElementById('alertOkBtn');
        let unbind = null;
        const done = () => {
            if (unbind) unbind();
            closeModal('alertModal');
            if (okBtn) okBtn.onclick = null;
            modal.onclick = null;
            resolve();
        };
        if (okBtn) okBtn.onclick = done;
        modal.onclick = (e) => { if (e.target === modal) done(); };
        unbind = bindModalKeys((e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                done();
            }
        });
        if (okBtn) setTimeout(() => okBtn.focus(), 30);
    });
}

/**
 * 显示确认弹窗（确定 / 取消）
 * @param {string} message 提示内容
 * @param {string} [title='确认操作'] 标题
 * @returns {Promise<boolean>} true=确定，false=取消
 */
export function showConfirm(message, title = '确认操作') {
    return new Promise(resolve => {
        const modal = openModal('confirmModal');
        if (!modal) { resolve(false); return; }
        const titleEl = document.getElementById('confirmTitle');
        const msgEl = document.getElementById('confirmMessage');
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        let unbind = null;
        const done = (result) => {
            if (unbind) unbind();
            closeModal('confirmModal');
            if (okBtn) okBtn.onclick = null;
            if (cancelBtn) cancelBtn.onclick = null;
            modal.onclick = null;
            resolve(result);
        };
        if (okBtn) okBtn.onclick = () => done(true);
        if (cancelBtn) cancelBtn.onclick = () => done(false);
        modal.onclick = (e) => { if (e.target === modal) done(false); };
        unbind = bindModalKeys((e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                done(false);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                done(true);
            }
        });
        if (okBtn) setTimeout(() => okBtn.focus(), 30);
    });
}

/**
 * 显示输入弹窗（Prompt）
 * @param {string} message 提示/说明文字
 * @param {string} [defaultValue=''] 输入框默认值
 * @param {string} [title='输入'] 标题
 * @returns {Promise<string|null>} 用户输入的字符串，取消则为 null
 */
export function showPrompt(message, defaultValue = '', title = '输入') {
    return new Promise(resolve => {
        const modal = openModal('promptModal');
        document.getElementById('promptTitle').textContent = title;
        document.getElementById('promptHint').textContent = message;
        const input = document.getElementById('promptInput');
        input.value = defaultValue || '';
        setTimeout(() => { input.focus(); input.select(); }, 50);
        const okBtn = document.getElementById('promptOkBtn');
        const cancelBtn = document.getElementById('promptCancelBtn');
        let unbind = null;
        const done = (result) => {
            if (unbind) unbind();
            closeModal('promptModal');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            input.onkeydown = null;
            modal.onclick = null;
            resolve(result);
        };
        okBtn.onclick = () => done(input.value);
        cancelBtn.onclick = () => done(null);
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                done(input.value);
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                done(null);
            }
        };
        unbind = bindModalKeys((e) => {
            // 输入框已处理 Enter/Esc；此处兜底（焦点不在 input 时）
            if (document.activeElement === input) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                done(null);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                done(input.value);
            }
        });
        modal.onclick = (e) => { if (e.target === modal) done(null); };
    });
}
