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
  /* ── 在线搜索面板(A 方案:独立居中模态,与主面板同一视觉语言) ── */
  #anysub-search{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;
    width:400px;max-width:92vw;max-height:82vh;display:flex;flex-direction:column;box-sizing:border-box;color:#eaeef6;
    font:13px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',system-ui,sans-serif;
    background:linear-gradient(180deg,#20242c,#171a20);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:14px;
    box-shadow:0 20px 60px rgba(0,0,0,.55),0 3px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.05);}
  #anysub-search *{box-sizing:border-box;}
  #anysub-search.as-in{animation:as-pop-c .14s cubic-bezier(.2,.7,.3,1);}
  @keyframes as-pop-c{from{opacity:0;transform:translate(-50%,-48%) scale(.985);}to{opacity:1;transform:translate(-50%,-50%);}}
  #anysub-search button{font-family:inherit;color:#eaeef6;cursor:pointer;border:1px solid rgba(255,255,255,.1);
    background:rgba(255,255,255,.05);border-radius:8px;transition:background .15s,border-color .15s,transform .05s;}
  #anysub-search button:active{transform:translateY(.5px);}
  #anysub-search input{width:100%;background:rgba(0,0,0,.28);color:#eaeef6;border:1px solid rgba(255,255,255,.12);border-radius:8px;
    padding:8px 10px;font-size:12.5px;font-family:inherit;min-width:0;}
  #anysub-search input:focus{outline:none;border-color:rgba(90,150,255,.7);background:rgba(0,0,0,.4);}
  #anysub-search input::placeholder{color:#6b7382;}

  #anysub-search .as-sc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
  #anysub-search .as-sc-back{display:flex;align-items:center;gap:5px;padding:5px 10px 5px 7px;font-size:12px;color:#c3cad6;}
  #anysub-search .as-sc-back svg{width:15px;height:15px;}
  #anysub-search .as-sc-back:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.16);color:#fff;}
  #anysub-search .as-x{width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;color:#9aa3b2;border-radius:7px;font-size:14px;transition:background .15s,color .15s;}
  #anysub-search .as-x:hover{background:rgba(255,255,255,.08);color:#fff;}

  #anysub-search .as-sc-title{display:flex;align-items:center;gap:8px;font-weight:650;font-size:14px;margin-bottom:12px;}
  #anysub-search .as-sc-title .as-logo{width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#4c8dff,#2b6cff);color:#fff;font-size:12px;box-shadow:0 2px 6px rgba(43,108,255,.45);}
  #anysub-search .as-sc-tag{font-weight:400;font-size:11px;color:#8b93a3;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:1px 8px;}

  #anysub-search .as-sc-keyrow{display:flex;gap:7px;margin-bottom:6px;}
  #anysub-search .as-sc-keyrow button{flex:none;padding:0 14px;font-size:12px;}
  #anysub-search .as-sc-keyok{display:flex;align-items:center;gap:6px;color:#7fd18b;font-size:11.5px;margin-bottom:10px;}
  #anysub-search .as-sc-keyok svg{width:14px;height:14px;flex:none;}
  #anysub-search .as-sc-change{margin-left:auto;color:#8fb6ff;cursor:pointer;font-size:11px;}
  #anysub-search .as-sc-change:hover{text-decoration:underline;}
  #anysub-search .as-sc-hint{font-size:10.5px;color:#6b7382;margin:0 2px 10px;}

  #anysub-search .as-sc-search{display:flex;gap:7px;margin-bottom:12px;}
  #anysub-search .as-sc-search .as-sc-ep{flex:0 0 52px;text-align:center;}
  #anysub-search .as-sc-search button{flex:none;padding:0 14px;font-size:12.5px;display:flex;align-items:center;gap:6px;
    background:linear-gradient(180deg,rgba(76,141,255,.28),rgba(43,108,255,.18));border-color:rgba(90,150,255,.45);color:#dce9ff;}
  #anysub-search .as-sc-search button:hover{background:linear-gradient(180deg,rgba(76,141,255,.4),rgba(43,108,255,.28));}
  #anysub-search .as-sc-search button svg{width:15px;height:15px;}

  #anysub-search .as-sc-results{overflow-y:auto;margin:0 -4px;padding:0 4px;flex:1;min-height:64px;}
  #anysub-search .as-sc-sec{font-size:11px;color:#8b93a3;margin:6px 2px 7px;}
  #anysub-search .as-sc-empty{color:#727b8a;font-size:12px;padding:22px 8px;text-align:center;}
  #anysub-search .as-sc-back2{display:inline-flex;align-items:center;gap:5px;color:#8fb6ff;cursor:pointer;font-size:12px;margin:2px 2px 9px;}
  #anysub-search .as-sc-back2 svg{width:14px;height:14px;}
  #anysub-search .as-sc-back2:hover{text-decoration:underline;}

  #anysub-search .as-sc-anime{display:flex;gap:11px;align-items:center;padding:8px;margin-bottom:7px;border-radius:10px;cursor:pointer;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);transition:background .15s,border-color .15s;}
  #anysub-search .as-sc-anime:hover{background:rgba(76,141,255,.12);border-color:rgba(90,150,255,.4);}
  #anysub-search .as-sc-poster{position:relative;width:42px;height:58px;flex:none;border-radius:6px;background:#2a2f3a;
    display:flex;align-items:center;justify-content:center;color:#555e6c;overflow:hidden;}
  #anysub-search .as-sc-poster svg{width:20px;height:20px;}
  #anysub-search .as-sc-poster img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
  #anysub-search .as-sc-anime-main{flex:1;min-width:0;}
  #anysub-search .as-sc-anime-t{color:#eaeef6;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #anysub-search .as-sc-anime-s{color:#727b8a;font-size:11px;margin-top:3px;}
  #anysub-search .as-sc-chev{color:#5a6373;flex:none;display:flex;}
  #anysub-search .as-sc-chev svg{width:16px;height:16px;}

  #anysub-search .as-sc-file{padding:8px 10px;margin-bottom:6px;border-radius:9px;cursor:pointer;
    background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);transition:background .15s,border-color .15s;}
  #anysub-search .as-sc-file:hover{background:rgba(76,141,255,.12);border-color:rgba(90,150,255,.4);}
  #anysub-search .as-sc-file.loading{opacity:.5;pointer-events:none;}
  #anysub-search .as-sc-file-t{color:#e8ecf3;font-size:12px;word-break:break-all;line-height:1.4;}
  #anysub-search .as-sc-file-s{color:#727b8a;font-size:10.5px;margin-top:3px;}
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
