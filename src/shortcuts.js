// 键盘快捷键:统一 Alt+Shift + <键>,几乎不与站点单键冲突。
// capture 阶段拦截,仅吞我们占用的组合(preventDefault + stopImmediatePropagation),
// 不影响站点其它按键;输入框/可编辑区内不响应。按 event.code(物理键)判定,跨布局/Mac 稳定。
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
  // 快捷键恒启用(不提供关闭开关,避免与「无悬浮球」叠加造成无法打开面板的死锁)
  // 必须恰好是 Alt+Shift(排除再叠加 Ctrl/Meta 的组合,避免误吞系统快捷键)
  if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
  if (isTyping()) return;
  const run = MAP[e.code];
  if (!run) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  run();
}

// 非文本录入的 input 类型:焦点在这些上不算「正在输入」(播放器的音量/进度多为 range)
const NON_TEXT_INPUT = new Set([
  'range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image', 'color', 'hidden',
]);

function isTyping() {
  const el = document.activeElement;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !NON_TEXT_INPUT.has((el.type || 'text').toLowerCase());
  return false;
}
