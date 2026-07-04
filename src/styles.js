// 注入样式(用 <style> 标签,保持 @grant none)

const CSS = `
  #anysub-overlay{position:fixed;z-index:2147483640;pointer-events:none;overflow:hidden;}
  #anysub-cuebox{position:absolute;left:50%;transform:translateX(-50%);
    max-width:92%;text-align:center;line-height:1.25;white-space:pre-wrap;word-break:break-word;
    font-family:-apple-system,'PingFang SC','Microsoft YaHei',system-ui,sans-serif;
    font-weight:600;border-radius:4px;box-sizing:border-box;}
  #anysub-fab{position:fixed;bottom:28%;z-index:2147483646;width:30px;height:30px;
    display:flex;align-items:center;justify-content:center;
    background:#2b6cff;color:#fff;border-radius:50%;
    font:14px/1 -apple-system,system-ui,sans-serif;cursor:grab;user-select:none;touch-action:none;
    box-shadow:0 2px 8px rgba(0,0,0,.3);opacity:.35;transition:opacity .25s,transform .2s;}
  #anysub-fab:hover{opacity:1;}
  #anysub-fab:active{cursor:grabbing;}
  #anysub-fab.dock-right{right:0;}
  #anysub-fab.dock-left{left:0;}
  #anysub-fab.dock-right:not(.dragging){transform:translateX(32%);}
  #anysub-fab.dock-left:not(.dragging){transform:translateX(-32%);}
  #anysub-fab.dock-right:hover,#anysub-fab.dock-left:hover{transform:translateX(0);}
  #anysub-fab.dragging{transition:none;cursor:grabbing;}
  #anysub-panel{position:fixed;right:16px;bottom:54px;z-index:2147483647;width:270px;
    background:#1e1e1e;color:#eee;border-radius:10px;padding:10px;
    font:13px/1.4 -apple-system,system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.5);}
  #anysub-panel .anysub-row{display:flex;align-items:center;gap:6px;margin:8px 0;flex-wrap:wrap;}
  #anysub-panel .anysub-head{justify-content:space-between;font-weight:600;margin-top:0;}
  #anysub-close{cursor:pointer;opacity:.6;}#anysub-close:hover{opacity:1;}
  #anysub-panel button{background:#333;color:#eee;border:1px solid #555;border-radius:6px;
    padding:5px 8px;cursor:pointer;font-size:12px;}
  #anysub-panel button:hover{background:#444;}
  #anysub-panel button.on{background:#2b6cff;border-color:#2b6cff;color:#fff;}
  #anysub-panel label{opacity:.7;min-width:32px;}
  #anysub-panel .anysub-seg{display:flex;gap:4px;flex:1;flex-wrap:wrap;}
  #anysub-panel .anysub-seg button{flex:1;min-width:40px;}
  #anysub-panel .anysub-drop{justify-content:center;border:1px dashed #555;border-radius:6px;padding:10px;opacity:.6;font-size:12px;}
  #anysub-offset{width:48px;text-align:center;background:#2a2a2a;color:#eee;
    border:1px solid #555;border-radius:6px;padding:4px 2px;font-size:12px;-moz-appearance:textfield;}
  #anysub-offset::-webkit-outer-spin-button,#anysub-offset::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
  #anysub-panel .anysub-unit{opacity:.6;font-size:12px;margin-left:-2px;}
  #anysub-font,#anysub-pos{flex:1;}
  #anysub-panel .anysub-toggles{gap:6px;}
  #anysub-panel .anysub-toggle{flex:1;}
  #anysub-panel .anysub-legend{margin:6px 0 2px;padding:6px 8px;background:#262626;border-radius:6px;
    font-size:11px;line-height:1.6;opacity:.7;}
  #anysub-panel .anysub-status{opacity:.6;font-size:12px;word-break:break-all;}
  .anysub-vidpick{position:fixed;z-index:2147483647;border:3px solid #2b6cff;background:rgba(43,108,255,.15);cursor:pointer;box-sizing:border-box;}
  #anysub-toast{position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:2147483647;
    background:rgba(0,0,0,.85);color:#fff;padding:8px 16px;border-radius:6px;
    font:13px -apple-system,system-ui,sans-serif;opacity:0;transition:opacity .3s;pointer-events:none;max-width:80vw;text-align:center;}
`;

export function injectStyle() {
  const s = document.createElement('style');
  s.textContent = CSS;
  // document.head 在 XML/SVG/极简文档下可能为 null,回退到 documentElement
  (document.head || document.documentElement).appendChild(s);
}
