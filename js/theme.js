/**
 * =============================================================================
 * theme.js - 主题模式 & 外观微调
 * =============================================================================
 *
 * 职责：
 *   - 主题模式：system / dark / light（跟随系统或强制）
 *   - 同步 <html> class、color-scheme、meta theme-color（利于 PWA / 移动端状态栏）
 *   - 外观滑块：遮罩暗化（overlay darkness）、卡片背景透明度
 *   - 持久化到 localStorage，页面加载时恢复
 *
 * 被依赖：app.js
 * 依赖：无业务模块（纯主题逻辑）
 *
 * 存储 key：
 *   nav_theme_mode          - 主题模式
 *   nav_appearance          - { overlayDarkness, cardOpacity }
 */
const THEME_ICONS = {
    system: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
    dark: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    light: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
};
const THEME_LABELS = { system: '跟随系统', dark: '深色', light: '浅色' };
let currentThemeMode = 'system';
let systemThemeMql = null;

function getSystemPrefersLight() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
}

export function applyThemeMode(mode) {
    const useLight = mode === 'light' || (mode === 'system' && getSystemPrefersLight());
    document.documentElement.classList.toggle('light-mode', useLight);
    // 让原生 select 下拉跟随主题，避免深色模式白底看不清字
    document.documentElement.style.colorScheme = useLight ? 'light' : 'dark';
    // 同步浏览器顶栏/状态栏颜色（PWA / 移动端更友好）
    const color = useLight ? '#f8fafc' : '#09090b';
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
        if (!m.media || (useLight && m.media.includes('light')) || (!useLight && m.media.includes('dark'))) {
            m.setAttribute('content', color);
        }
    });
    // 兜底：无 media 的 theme-color
    let plain = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!plain) {
        plain = document.createElement('meta');
        plain.name = 'theme-color';
        document.head.appendChild(plain);
    }
    plain.setAttribute('content', color);
}

export function updateThemeModeUI(mode) {
    const label = document.getElementById('themeModeLabel');
    const icon = document.getElementById('themeModeIcon');
    if (label) label.textContent = THEME_LABELS[mode] || THEME_LABELS.system;
    if (icon) icon.innerHTML = THEME_ICONS[mode] || THEME_ICONS.system;
    document.querySelectorAll('.theme-mode-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.value === mode);
    });
    // 同步侧边栏明暗开关（checked = 深色）
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const useLight = mode === 'light' || (mode === 'system' && getSystemPrefersLight());
        themeToggle.checked = !useLight;
    }
}

export function setThemeMode(mode) {
    if (!['system', 'dark', 'light'].includes(mode)) mode = 'system';
    currentThemeMode = mode;
    try { localStorage.setItem('nav_theme', mode); } catch (_) { /* ignore */ }
    applyThemeMode(mode);
    updateThemeModeUI(mode);
    // 主题切换后重新应用外观变量，避免被主题 CSS 回退值覆盖观感
    applyAppearanceSettings();
}

export function initTheme() {
    const saved = localStorage.getItem('nav_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
        currentThemeMode = saved;
    } else {
        currentThemeMode = 'system';
    }
    applyThemeMode(currentThemeMode);
    updateThemeModeUI(currentThemeMode);

    if (window.matchMedia) {
        systemThemeMql = window.matchMedia('(prefers-color-scheme: light)');
        const onChange = () => {
            if (currentThemeMode === 'system') {
                applyThemeMode('system');
                updateThemeModeUI('system');
            }
        };
        if (systemThemeMql.addEventListener) {
            systemThemeMql.addEventListener('change', onChange);
        } else if (systemThemeMql.addListener) {
            systemThemeMql.addListener(onChange);
        }
    }
}

export function toggleTheme() {
    const next = document.documentElement.classList.contains('light-mode') ? 'dark' : 'light';
    setThemeMode(next);
}

function closeThemeModeDropdown() {
    const trigger = document.getElementById('themeModeTrigger');
    const dropdown = document.getElementById('themeModeDropdown');
    if (!trigger || !dropdown) return;
    trigger.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    dropdown.hidden = true;
}

export function initThemeModeSelect() {
    const wrap = document.getElementById('themeModeSelectWrap');
    const trigger = document.getElementById('themeModeTrigger');
    const dropdown = document.getElementById('themeModeDropdown');
    if (!wrap || !trigger || !dropdown) return;

    trigger.onclick = (e) => {
        e.stopPropagation();
        const open = dropdown.hidden;
        if (open) {
            dropdown.hidden = false;
            trigger.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
        } else {
            closeThemeModeDropdown();
        }
    };

    dropdown.querySelectorAll('.theme-mode-option').forEach(opt => {
        opt.onclick = (e) => {
            e.stopPropagation();
            setThemeMode(opt.dataset.value);
            closeThemeModeDropdown();
        };
    });

    document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) closeThemeModeDropdown();
    });
}

// ========== 外观微调：遮罩暗化 / 卡片透明度 / 强调色 ==========
const APPEARANCE_STORAGE_KEY = 'nav_appearance';
const DEFAULT_MASK_DARKEN = 10;   // 0–100，对应遮罩 alpha
const DEFAULT_CARD_OPACITY = 60;  // 0–100，越低越透
const DEFAULT_ACCENT_COLOR = '#3b82f6';

/** 预设色板（与截图一致） */
const ACCENT_PRESETS = {
    blue: '#3b82f6',
    violet: '#8b5cf6',
    green: '#10b981',
    yellow: '#eab308',
    orange: '#f97316'
};

let appearanceState = {
    maskDarken: DEFAULT_MASK_DARKEN,
    cardOpacity: DEFAULT_CARD_OPACITY,
    accentColor: DEFAULT_ACCENT_COLOR
};

function normalizeHex(input) {
    let s = String(input || '').trim();
    if (!s) return null;
    if (s[0] !== '#') s = '#' + s;
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
        s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(s)) return null;
    return s.toLowerCase();
}

function hexToRgb(hex) {
    const h = normalizeHex(hex);
    if (!h) return null;
    return {
        r: parseInt(h.slice(1, 3), 16),
        g: parseInt(h.slice(3, 5), 16),
        b: parseInt(h.slice(5, 7), 16)
    };
}

function relativeLuminance({ r, g, b }) {
    const toLin = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const R = toLin(r);
    const G = toLin(g);
    const B = toLin(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hexA, hexB) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    if (!a || !b) return 0;
    const L1 = relativeLuminance(a);
    const L2 = relativeLuminance(b);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
}

/** 由主色推导 glow / secondary 等辅助色 */
function deriveAccentVars(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    const { r, g, b } = rgb;
    const glow = `rgba(${r}, ${g}, ${b}, 0.25)`;
    // secondary：略提亮
    const lighten = (c, amount) => Math.min(255, Math.round(c + (255 - c) * amount));
    const sr = lighten(r, 0.35);
    const sg = lighten(g, 0.35);
    const sb = lighten(b, 0.35);
    const secondary = `#${[sr, sg, sb].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
    // highlight：再亮一点
    const hr = lighten(r, 0.55);
    const hg = lighten(g, 0.55);
    const hb = lighten(b, 0.55);
    const highlight = `#${[hr, hg, hb].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
    // secondary-text：略压暗，用于浅色背景下的文字
    const darken = (c, amount) => Math.max(0, Math.round(c * (1 - amount)));
    const dr = darken(r, 0.45);
    const dg = darken(g, 0.45);
    const db = darken(b, 0.45);
    const secondaryText = `#${[dr, dg, db].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
    // on-primary：FAB / 主色按钮上的图标与文字颜色（按亮度自动选黑/白）
    const lum = relativeLuminance(rgb);
    const onPrimary = lum > 0.45 ? '#111111' : '#ffffff';
    return { primary: normalizeHex(hex), glow, secondary, highlight, secondaryText, onPrimary };
}

function loadAppearanceState() {
    try {
        const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                if (Number.isFinite(parsed.maskDarken)) {
                    appearanceState.maskDarken = Math.max(0, Math.min(100, Math.round(parsed.maskDarken)));
                }
                if (Number.isFinite(parsed.cardOpacity)) {
                    appearanceState.cardOpacity = Math.max(0, Math.min(100, Math.round(parsed.cardOpacity)));
                }
                // 新字段 accentColor；兼容旧 accent 预设名
                if (typeof parsed.accentColor === 'string') {
                    const hex = normalizeHex(parsed.accentColor);
                    if (hex) appearanceState.accentColor = hex;
                } else if (typeof parsed.accent === 'string' && ACCENT_PRESETS[parsed.accent]) {
                    appearanceState.accentColor = ACCENT_PRESETS[parsed.accent];
                }
            }
        }
    } catch (_) { /* ignore */ }
}

function saveAppearanceState() {
    try {
        localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({
            maskDarken: appearanceState.maskDarken,
            cardOpacity: appearanceState.cardOpacity,
            accentColor: appearanceState.accentColor
        }));
    } catch (_) { /* ignore */ }
}

function applyAccentColorHex(hex) {
    const normalized = normalizeHex(hex) || DEFAULT_ACCENT_COLOR;
    appearanceState.accentColor = normalized;
    const vars = deriveAccentVars(normalized);
    const root = document.documentElement;
    if (!vars) return;
    root.style.setProperty('--primary', vars.primary);
    root.style.setProperty('--primary-glow', vars.glow);
    root.style.setProperty('--secondary', vars.secondary);
    root.style.setProperty('--highlight', vars.highlight);
    root.style.setProperty('--secondary-text', vars.secondaryText);
    root.style.setProperty('--on-primary', vars.onPrimary);
    // 清除旧 data-accent，统一走 CSS 变量
    root.removeAttribute('data-accent');
}

function findPresetKeyByColor(hex) {
    const n = normalizeHex(hex);
    if (!n) return null;
    for (const [key, value] of Object.entries(ACCENT_PRESETS)) {
        if (normalizeHex(value) === n) return key;
    }
    return null;
}

function updateAccentUI() {
    const hex = appearanceState.accentColor;
    const presetKey = findPresetKeyByColor(hex);

    document.querySelectorAll('.accent-swatch').forEach((btn) => {
        const isActive = presetKey && btn.dataset.accent === presetKey;
        btn.classList.toggle('active', !!isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const picker = document.getElementById('accentColorPicker');
    const hexInput = document.getElementById('accentHexInput');
    const previewLight = document.getElementById('accentPreviewLight');
    const previewDark = document.getElementById('accentPreviewDark');
    const warnEl = document.getElementById('accentContrastWarn');
    const pickerWrap = document.querySelector('.accent-color-picker-wrap');

    if (picker) picker.value = hex;
    if (hexInput && document.activeElement !== hexInput) hexInput.value = hex;
    if (pickerWrap) pickerWrap.style.background = hex;

    if (previewLight) {
        previewLight.textContent = `${hex} 浅色背景`;
        previewLight.style.color = hex;
    }
    if (previewDark) {
        previewDark.textContent = `${hex} 深色背景`;
        previewDark.style.color = hex;
    }

    // WCAG AA 正文对比度 4.5:1（相对白色）
    if (warnEl) {
        const ratio = contrastRatio(hex, '#ffffff');
        if (ratio < 4.5) {
            warnEl.hidden = false;
            warnEl.textContent = `⚠ 对比度 ${ratio.toFixed(2)}:1 — 低于 WCAG AA 标准 4.5:1，建议选择更深的颜色`;
        } else {
            warnEl.hidden = true;
            warnEl.textContent = '';
        }
    }
}

function applyAppearanceSettings() {
    const maskAlpha = appearanceState.maskDarken / 100;
    const cardAlpha = appearanceState.cardOpacity / 100;
    const root = document.documentElement;
    const isLight = root.classList.contains('light-mode');
    root.style.setProperty('--wallpaper-mask-opacity', String(maskAlpha));
    root.style.setProperty('--card-bg-alpha', String(cardAlpha));
    // 搜索栏 / 二级目录：透明度不低于 0.55，避免字发虚
    const chromeAlpha = Math.max(cardAlpha, 0.55);
    // 搜索栏 / 二级目录卡片额外压暗量（随遮罩暗化联动，系数略低于全屏遮罩）
    const uiMask = Math.min(0.55, maskAlpha * 0.55);
    root.style.setProperty('--ui-mask-tint', `rgba(0, 0, 0, ${uiMask})`);
    // 同步搜索栏 / 链接卡片 / 二级目录等依赖的背景色（含 alpha）
    if (isLight) {
        root.style.setProperty('--card-glass-bg', `rgba(255, 255, 255, ${cardAlpha})`);
        root.style.setProperty('--card-solid-bg', `rgba(255, 255, 255, ${cardAlpha})`);
        root.style.setProperty('--input-bg', `rgba(255, 255, 255, ${cardAlpha})`);
        root.style.setProperty('--inner-bg', `rgba(241, 245, 249, ${cardAlpha})`);
        root.style.setProperty('--chrome-bg', `rgba(255, 255, 255, ${chromeAlpha})`);
    } else {
        root.style.setProperty('--card-glass-bg', `rgba(24, 24, 27, ${cardAlpha})`);
        root.style.setProperty('--card-solid-bg', `rgba(24, 24, 27, ${cardAlpha})`);
        root.style.setProperty('--input-bg', `rgba(24, 24, 27, ${cardAlpha})`);
        root.style.setProperty('--inner-bg', `rgba(18, 18, 21, ${cardAlpha})`);
        root.style.setProperty('--chrome-bg', `rgba(24, 24, 27, ${chromeAlpha})`);
    }
    applyAccentColorHex(appearanceState.accentColor);
}

function updateAppearanceSliderUI() {
    const maskSlider = document.getElementById('maskDarkenSlider');
    const maskValue = document.getElementById('maskDarkenValue');
    const cardSlider = document.getElementById('cardOpacitySlider');
    const cardValue = document.getElementById('cardOpacityValue');
    if (maskSlider) maskSlider.value = String(appearanceState.maskDarken);
    if (maskValue) maskValue.textContent = appearanceState.maskDarken + '%';
    if (cardSlider) cardSlider.value = String(appearanceState.cardOpacity);
    if (cardValue) cardValue.textContent = appearanceState.cardOpacity + '%';
    updateAccentUI();
}

function initAccentControls() {
    const row = document.getElementById('accentSwatchRow');
    if (row) {
        row.querySelectorAll('.accent-swatch').forEach((btn) => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color || ACCENT_PRESETS[btn.dataset.accent] || DEFAULT_ACCENT_COLOR;
                applyAccentColorHex(color);
                updateAccentUI();
                saveAppearanceState();
            });
        });
    }

    const picker = document.getElementById('accentColorPicker');
    const hexInput = document.getElementById('accentHexInput');
    let saveTimer = null;
    const scheduleSave = () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveAppearanceState, 280);
    };

    if (picker) {
        picker.addEventListener('input', () => {
            applyAccentColorHex(picker.value);
            updateAccentUI();
            scheduleSave();
        });
        picker.addEventListener('change', () => {
            clearTimeout(saveTimer);
            saveAppearanceState();
        });
    }

    if (hexInput) {
        hexInput.addEventListener('input', () => {
            const hex = normalizeHex(hexInput.value);
            if (!hex) return;
            applyAccentColorHex(hex);
            updateAccentUI();
            scheduleSave();
        });
        hexInput.addEventListener('change', () => {
            const hex = normalizeHex(hexInput.value) || appearanceState.accentColor;
            hexInput.value = hex;
            applyAccentColorHex(hex);
            updateAccentUI();
            clearTimeout(saveTimer);
            saveAppearanceState();
        });
        hexInput.addEventListener('blur', () => {
            hexInput.value = appearanceState.accentColor;
        });
    }
}

export function initAppearanceSliders() {
    loadAppearanceState();
    applyAppearanceSettings();
    updateAppearanceSliderUI();
    initAccentControls();

    const maskSlider = document.getElementById('maskDarkenSlider');
    const cardSlider = document.getElementById('cardOpacitySlider');
    let saveTimer = null;
    const scheduleSave = () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveAppearanceState, 280);
    };

    if (maskSlider) {
        maskSlider.addEventListener('input', () => {
            appearanceState.maskDarken = Math.max(0, Math.min(100, Number(maskSlider.value) || 0));
            const v = document.getElementById('maskDarkenValue');
            if (v) v.textContent = appearanceState.maskDarken + '%';
            applyAppearanceSettings();
            scheduleSave();
        });
        maskSlider.addEventListener('change', () => {
            clearTimeout(saveTimer);
            saveAppearanceState();
        });
    }

    if (cardSlider) {
        cardSlider.addEventListener('input', () => {
            appearanceState.cardOpacity = Math.max(0, Math.min(100, Number(cardSlider.value) || 0));
            const v = document.getElementById('cardOpacityValue');
            if (v) v.textContent = appearanceState.cardOpacity + '%';
            applyAppearanceSettings();
            scheduleSave();
        });
        cardSlider.addEventListener('change', () => {
            clearTimeout(saveTimer);
            saveAppearanceState();
        });
    }
}


export function getCurrentThemeMode() {
    return currentThemeMode;
}

/** 恢复外观默认：主题跟随系统 + 滑块默认值 + 默认蓝 */
export function resetAppearanceToDefaults() {
    setThemeMode('system');
    appearanceState.maskDarken = DEFAULT_MASK_DARKEN;
    appearanceState.cardOpacity = DEFAULT_CARD_OPACITY;
    appearanceState.accentColor = DEFAULT_ACCENT_COLOR;
    saveAppearanceState();
    applyAppearanceSettings();
    updateAppearanceSliderUI();
}

