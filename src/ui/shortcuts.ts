// Keyboard shortcuts: uniformly Alt+Shift + <key>, which almost never conflicts with a site's single-key shortcuts.
// Intercepted in the capture phase, swallowing only the combos we occupy (preventDefault + stopImmediatePropagation),
// leaving the site's other keys unaffected; does not respond inside input fields / editable areas. Keyed off event.code (physical key), stable across layouts / on Mac.
import { togglePanel, openFilePicker, adjustOffset, openSearch } from './ui.js';
import { toggleSubtitles } from '../render/controller.js';

interface Shortcut {
  code: string;
  label: string;
  desc: string;
  run: () => void;
}

// code → action. These are the "default key bindings", shown in the panel's legend.
export const SHORTCUTS: Shortcut[] = [
  { code: 'KeyS', label: 'Alt+Shift+S', desc: '打开/关闭面板', run: () => togglePanel() },
  { code: 'KeyF', label: 'Alt+Shift+F', desc: '在线找字幕', run: () => openSearch() },
  { code: 'KeyV', label: 'Alt+Shift+V', desc: '显示/隐藏字幕', run: () => toggleSubtitles() },
  { code: 'KeyO', label: 'Alt+Shift+O', desc: '打开本地文件', run: () => openFilePicker() },
  { code: 'ArrowLeft', label: 'Alt+Shift+←', desc: '偏移 −0.1s', run: () => adjustOffset(-0.1) },
  { code: 'ArrowRight', label: 'Alt+Shift+→', desc: '偏移 +0.1s', run: () => adjustOffset(0.1) },
];

const MAP: Record<string, () => void> = Object.fromEntries(
  SHORTCUTS.map((s) => [s.code, s.run] as [string, () => void]),
);

export function initShortcuts(): void {
  window.addEventListener('keydown', onKey, true); // capture: handle before the site does
}

function onKey(e: KeyboardEvent): void {
  // Shortcuts are always enabled (no toggle to disable them, to avoid a deadlock where combining "no floating ball" with disabled shortcuts leaves no way to open the panel)
  // The prefix accepts both Alt+Shift and Ctrl+Shift (either works); excludes cases where yet another modifier / Meta is also held
  const alt = e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey;
  const ctrl = e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey;
  if (!alt && !ctrl) return;
  if (isTyping()) return;
  const run = MAP[e.code];
  if (!run) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  run();
}

// Non-text-entry input types: focus on these does not count as "typing" (player volume/progress are usually range)
const NON_TEXT_INPUT = new Set([
  'range',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'file',
  'image',
  'color',
  'hidden',
]);

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT')
    return !NON_TEXT_INPUT.has(((el as HTMLInputElement).type || 'text').toLowerCase());
  return false;
}
