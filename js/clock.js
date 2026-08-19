/**
 * =============================================================================
 * clock.js - 时钟显示（极简 HH:MM + 完整日期）
 * =============================================================================
 */
import { S } from './state.js';

function pad2(n) {
    return String(n).padStart(2, '0');
}

export function updateTime() {
    const now = new Date();
    const hEl = document.getElementById('clockH');
    const mEl = document.getElementById('clockM');
    const sEl = document.getElementById('clockSec');
    const dateMainEl = document.getElementById('dateMain');
    const dateWeekdayEl = document.getElementById('dateWeekday');

    if (hEl) hEl.textContent = pad2(now.getHours());
    if (mEl) mEl.textContent = pad2(now.getMinutes());
    if (sEl) sEl.textContent = '';

    if (dateMainEl) {
        const y = now.getFullYear();
        const mo = now.getMonth() + 1;
        const d = now.getDate();
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        dateMainEl.textContent = `${y}年${mo}月${d}日${weekdays[now.getDay()]}`;
    }
    if (dateWeekdayEl) {
        dateWeekdayEl.textContent = '';
    }
}

export function startClock() {
    if (S.clockTimer) return;
    updateTime();
    S.clockTimer = setInterval(updateTime, 1000);
}
export function stopClock() {
    if (!S.clockTimer) return;
    clearInterval(S.clockTimer);
    S.clockTimer = null;
}
export function bindClockVisibility() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopClock();
        else startClock();
    });
}
