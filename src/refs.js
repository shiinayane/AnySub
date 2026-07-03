// 共享的 DOM 元素引用(由 ui.js 创建并填充,其余模块只读)
// 注:cueBox 由文本渲染器(render-text.js)自行创建/销毁,不在此持有
export const refs = {
  uiRoot: null,
  overlay: null,
  fab: null,
  panel: null,
  statusEl: null,
  fileInput: null,
};
