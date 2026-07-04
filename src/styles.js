// 注入样式(用 <style> 标签,保持 @grant none)

const CSS = `
  #anysub-overlay{position:fixed;z-index:2147483640;pointer-events:none;overflow:hidden;}
  #anysub-cuebox{position:absolute;left:50%;transform:translateX(-50%);
    max-width:92%;text-align:center;line-height:1.25;white-space:pre-wrap;word-break:break-word;
    font-family:-apple-system,'PingFang SC','Microsoft YaHei',system-ui,sans-serif;
    font-weight:600;border-radius:4px;box-sizing:border-box;}
  #anysub-cuebox ruby{ruby-align:center;}
  #anysub-cuebox rt{font-size:.5em;font-weight:400;opacity:.9;line-height:1;}
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
  /* ── 设置面板(重构:实心深色,无 backdrop-filter 以免每帧重绘视频区) ── */
  #anysub-panel{position:fixed;right:16px;bottom:54px;z-index:2147483647;width:300px;box-sizing:border-box;
    color:#eaeef6;font:13px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',system-ui,sans-serif;
    background:linear-gradient(180deg,#20242c,#171a20);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:12px;
    box-shadow:0 12px 40px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05);
    -webkit-font-smoothing:antialiased;}
  #anysub-panel *{box-sizing:border-box;}
  #anysub-panel.as-in{animation:as-pop .13s cubic-bezier(.2,.7,.3,1);}
  @keyframes as-pop{from{opacity:0;transform:translateY(5px) scale(.985);}to{opacity:1;transform:none;}}
  #anysub-panel button{font-family:inherit;color:#eaeef6;cursor:pointer;border:1px solid rgba(255,255,255,.1);
    background:rgba(255,255,255,.05);border-radius:8px;transition:background .15s,border-color .15s,transform .05s;}
  #anysub-panel button:active{transform:translateY(.5px);}

  #anysub-panel .as-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;}
  #anysub-panel .as-brand{display:flex;align-items:center;gap:8px;font-weight:650;letter-spacing:.01em;font-size:13.5px;}
  #anysub-panel .as-logo{width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#4c8dff,#2b6cff);color:#fff;font-size:13px;font-weight:700;box-shadow:0 2px 6px rgba(43,108,255,.45);}
  #anysub-panel .as-x{width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;
    color:#9aa3b2;border-radius:7px;font-size:14px;line-height:1;transition:background .15s,color .15s;}
  #anysub-panel .as-x:hover{background:rgba(255,255,255,.08);color:#fff;}

  #anysub-panel .as-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  #anysub-panel .as-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 8px;font-size:12.5px;font-weight:550;}
  #anysub-panel .as-btn svg{width:16px;height:16px;flex:none;opacity:.9;}
  #anysub-panel .as-btn-primary{background:linear-gradient(180deg,rgba(76,141,255,.24),rgba(43,108,255,.14));
    border-color:rgba(90,150,255,.42);color:#dce9ff;}
  #anysub-panel .as-btn-primary:hover{background:linear-gradient(180deg,rgba(76,141,255,.36),rgba(43,108,255,.24));border-color:rgba(120,170,255,.62);}

  #anysub-panel .as-drop{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px;
    border:1px dashed rgba(255,255,255,.18);border-radius:9px;padding:9px;color:#8b93a3;font-size:11.5px;
    transition:border-color .15s,color .15s,background .15s;}
  #anysub-panel .as-drop svg{width:15px;height:15px;opacity:.8;flex:none;}
  #anysub-panel .as-drop.as-dragover{border-color:rgba(90,150,255,.7);color:#cfe0ff;background:rgba(76,141,255,.1);}

  #anysub-panel .as-status-row{display:flex;align-items:center;gap:8px;margin-top:10px;}
  #anysub-panel .as-status{flex:1;min-width:0;color:#98a0b0;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #anysub-panel .as-status.as-loaded{color:#7fd18b;}
  #anysub-panel .as-status-actions{display:flex;gap:4px;flex:none;}
  #anysub-panel .as-icon-btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;padding:0;}
  #anysub-panel .as-icon-btn svg{width:15px;height:15px;opacity:.85;}
  #anysub-panel .as-icon-btn:hover{background:rgba(255,255,255,.1);}
  #anysub-panel #anysub-vis.off{color:#8b93a3;}
  #anysub-panel #anysub-vis .as-eye-off{display:none;}
  #anysub-panel #anysub-vis.off .as-eye{display:none;}
  #anysub-panel #anysub-vis.off .as-eye-off{display:flex;}
  #anysub-panel #anysub-clear:hover{background:rgba(255,90,90,.16);border-color:rgba(255,90,90,.4);color:#ff9b9b;}

  #anysub-panel .as-divider{height:1px;background:rgba(255,255,255,.07);margin:12px 0;}
  #anysub-panel .as-field{margin:10px 0;}
  #anysub-panel .as-label{display:flex;align-items:center;justify-content:space-between;color:#9aa3b2;font-size:11.5px;font-weight:550;margin-bottom:7px;}
  #anysub-panel .as-val{color:#cfd6e2;font-variant-numeric:tabular-nums;font-weight:600;}

  #anysub-panel .as-offset{display:flex;align-items:center;gap:5px;}
  #anysub-panel .as-step{flex:1;padding:6px 0;font-size:12px;font-variant-numeric:tabular-nums;}
  #anysub-panel .as-step:hover{background:rgba(255,255,255,.1);}
  #anysub-offset{width:56px;flex:none;text-align:center;background:rgba(0,0,0,.28);color:#fff;font-weight:600;
    border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 2px;font-size:12.5px;-moz-appearance:textfield;font-variant-numeric:tabular-nums;}
  #anysub-offset:focus{outline:none;border-color:rgba(90,150,255,.7);background:rgba(0,0,0,.4);}
  #anysub-offset::-webkit-outer-spin-button,#anysub-offset::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}

  #anysub-panel .as-range{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:3px;background:rgba(255,255,255,.13);outline:none;cursor:pointer;}
  #anysub-panel .as-range::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:#fff;border:0;
    box-shadow:0 1px 4px rgba(0,0,0,.5),0 0 0 3px rgba(76,141,255,.9);cursor:grab;margin-top:-5px;}
  #anysub-panel .as-range::-webkit-slider-thumb:active{cursor:grabbing;}
  #anysub-panel .as-range::-moz-range-thumb{width:15px;height:15px;border-radius:50%;background:#fff;border:0;box-shadow:0 0 0 3px rgba(76,141,255,.9);cursor:grab;}
  #anysub-panel .as-range::-moz-range-track{height:5px;border-radius:3px;background:rgba(255,255,255,.13);}

  #anysub-panel .as-seg{display:flex;gap:3px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.07);border-radius:9px;padding:3px;}
  #anysub-panel .as-seg button{flex:1;border:0;background:transparent;color:#aab2c0;padding:6px 4px;border-radius:6px;font-size:12px;}
  #anysub-panel .as-seg button:hover{background:rgba(255,255,255,.06);color:#e7ebf3;}
  #anysub-panel .as-seg button.on{background:rgba(76,141,255,.92);color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);}

  #anysub-panel .as-swatches{display:flex;gap:12px;align-items:center;padding:2px 0;}
  #anysub-panel .as-swatches button{width:24px;height:24px;padding:0;border:0;border-radius:50%;background:var(--sw);
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.3);transition:transform .1s,box-shadow .12s;}
  #anysub-panel .as-swatches button:hover{transform:scale(1.14);}
  #anysub-panel .as-swatches button.on{box-shadow:0 0 0 2px #20242c,0 0 0 4px rgba(76,141,255,.95),inset 0 0 0 1px rgba(0,0,0,.3);}

  #anysub-panel .as-switch-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0;}
  #anysub-panel .as-switch-label{color:#d3d9e3;font-size:12.5px;}
  #anysub-panel .as-switch{width:38px;height:22px;padding:0;border-radius:999px;flex:none;position:relative;
    background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.08);transition:background .18s;}
  #anysub-panel .as-switch .as-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;
    box-shadow:0 1px 3px rgba(0,0,0,.4);transition:transform .18s;}
  #anysub-panel .as-switch.on{background:linear-gradient(180deg,#4c8dff,#2b6cff);border-color:transparent;}
  #anysub-panel .as-switch.on .as-knob{transform:translateX(16px);}

  #anysub-panel .as-hints{margin-top:11px;color:#7b8394;font-size:10.5px;line-height:1.9;}
  #anysub-panel .as-hints kbd{display:inline-block;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);
    border-bottom-width:2px;border-radius:4px;padding:0 4px;margin:0 1px;font:600 10px ui-monospace,SFMono-Regular,Menlo,monospace;color:#c3cad6;}
  #anysub-search{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;
    width:340px;max-width:92vw;max-height:80vh;overflow:auto;background:#1e1e1e;color:#eee;border-radius:10px;
    padding:10px;font:13px/1.4 -apple-system,system-ui,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,.6);}
  #anysub-search .anysub-row{display:flex;align-items:center;gap:6px;margin:8px 0;}
  #anysub-search .anysub-head{justify-content:space-between;font-weight:600;}
  #anysub-search input{flex:1;background:#2a2a2a;color:#eee;border:1px solid #555;border-radius:6px;padding:6px 8px;font-size:12px;min-width:0;}
  #anysub-search #anysub-ep{flex:0 0 44px;text-align:center;}
  #anysub-search button{background:#333;color:#eee;border:1px solid #555;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;white-space:nowrap;}
  #anysub-search button:hover{background:#444;}
  #anysub-sc-close{cursor:pointer;opacity:.6;}#anysub-sc-close:hover{opacity:1;}
  #anysub-search .anysub-key-hint{font-size:11px;opacity:.5;margin:-4px 0 4px;}
  .anysub-results{margin-top:6px;}
  .anysub-results .anysub-sec{font-size:12px;opacity:.6;margin:6px 2px;}
  .anysub-results .anysub-empty{opacity:.5;font-size:12px;padding:14px;text-align:center;}
  .anysub-results .anysub-item{padding:7px 9px;border-radius:6px;cursor:pointer;background:#262626;margin:5px 0;}
  .anysub-results .anysub-item:hover{background:#333;}
  .anysub-results .anysub-item.loading{opacity:.5;pointer-events:none;}
  .anysub-results .anysub-item-t{font-size:12.5px;word-break:break-all;}
  .anysub-results .anysub-item-s{font-size:11px;opacity:.55;margin-top:2px;}
  .anysub-results .anysub-back{color:#2b6cff;cursor:pointer;font-size:12px;margin:6px 2px;}
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
