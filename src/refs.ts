// Shared DOM element references (created and populated by ui.js, read-only for other modules)
// Note: cueBox is created/destroyed by the text renderer (render-text.js) itself and is not held here
import type { Refs } from './types.js';

export const refs: Refs = {
  uiRoot: null,
  overlay: null,
  fab: null,
  panel: null,
  statusEl: null,
  fileInput: null,
};
