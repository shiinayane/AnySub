// 键盘快捷键:统一 Alt+Shift + <键>,几乎不与站点单键冲突。
// capture 阶段拦截,仅吞我们占用的组合(preventDefault + stopImmediatePropagation),
// 不影响站点其它按键;输入框/可编辑区内不响应。按 event.code(物理键)判定,跨布局/Mac 稳定。
import { state } from './state.js';
import { togglePanel, openFilePicker, adjustOffset, openSearch } from './ui.js';
import { toggleSubtitles } from './controller.js';

// code → 动作。这是「默认键位」,展示在面板图例里。
export const SHORTCUTS = [
  { code: 'KeyS', label: 'Alt+Shift+S', desc: '打开/关闭面板', run: () => togglePanel() },
  { code: 'KeyF', label: 'Alt+Shift+F', desc: '在线找字幕', run: () => openSearch() },
  { code: 'KeyV', label: 'Alt+Shift+V', desc: '显示/隐藏字幕', run: () => toggleSubtitles() },
  { code: 'KeyO', label: 'Alt+Shift+O', desc: '打开本地文件', run: () => openFilePicker() },
  { code: 'ArrowLeft', label: 'Alt+Shift+←', desc: '偏移 −0.1s', run: () => adjustOffset(-0.1) },
  { code: 'ArrowRight', label: 'Alt+Shift+→', desc: '偏移 +0.1s', run: () => adjustOffset(0.1) },
];

const MAP = Object.fromEntries(SHORTCUTS.map((s) => [s.code, s.run]));

export function initShortcuts() {
  window.addEventListener('keydown', onKey, true); // capture:先于站点处理
}

function onKey(e) {
  if (!state.shortcutsEnabled) return;
  // 必须恰好是 Alt+Shift(排除再叠加 Ctrl/Meta 的组合,避免误吞系统快捷键)
  if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
  if (isTyping()) return;
  const run = MAP[e.code];
  if (!run) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  run();
}

function isTyping() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
