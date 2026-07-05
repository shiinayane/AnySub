// 注入样式(用 <style> 标签,保持 @grant none)
// 主题:chrome(面板/搜索/悬浮球)用 CSS 变量令牌,深色为默认,
// @media (prefers-color-scheme: light) 覆盖为浅色,随浏览器主题自动切换。
// 字幕覆盖层(#anysub-overlay/#anysub-cuebox)由用户自选颜色,不跟随主题。

const CSS = `
  #anysub-root{
    --as-grad-top:#20242c;--as-grad-bot:#171a20;
    --as-fg:#eaeef6;--as-fg2:#9aa3b2;--as-fg3:#727b8a;--as-fg-strong:#fff;--as-val:#cfd6e2;
    --as-border:rgba(255,255,255,.09);--as-line:rgba(255,255,255,.07);
    --as-btn-bg:rgba(255,255,255,.05);--as-btn-bd:rgba(255,255,255,.1);--as-btn-hover:rgba(255,255,255,.1);
    --as-hover-soft:rgba(255,255,255,.08);
    --as-inset:rgba(0,0,0,.28);--as-inset-focus:rgba(0,0,0,.4);--as-inset-bd:rgba(255,255,255,.12);
    --as-seg-bg:rgba(0,0,0,.25);--as-track:rgba(255,255,255,.13);
    --as-accent:#4c8dff;--as-accent2:#2b6cff;
    --as-accent-focus:rgba(90,150,255,.7);--as-accent-bd:rgba(90,150,255,.4);
    --as-accent-soft:rgba(76,141,255,.12);--as-accent-ring:rgba(76,141,255,.9);
    --as-primary-bg:linear-gradient(180deg,rgba(76,141,255,.24),rgba(43,108,255,.14));
    --as-primary-bg-hover:linear-gradient(180deg,rgba(76,141,255,.36),rgba(43,108,255,.24));
    --as-primary-bd:rgba(90,150,255,.42);--as-primary-bd-hover:rgba(120,170,255,.62);--as-primary-fg:#dce9ff;
    --as-seg-on:rgba(76,141,255,.92);
    --as-card:rgba(255,255,255,.04);--as-card-bd:rgba(255,255,255,.06);
    --as-success:#7fd18b;--as-link:#8fb6ff;
    --as-danger-bg:rgba(255,90,90,.16);--as-danger-bd:rgba(255,90,90,.4);--as-danger-fg:#ff9b9b;
    --as-poster-bg:#2a2f3a;--as-poster-fg:#555e6c;
    --as-kbd-bg:rgba(255,255,255,.08);--as-kbd-bd:rgba(255,255,255,.1);--as-kbd-fg:#c3cad6;
    --as-tag-bg:rgba(255,255,255,.06);--as-drop-bd:rgba(255,255,255,.18);
    --as-ring-gap:#20242c;--as-swatch-inset:rgba(0,0,0,.3);
    --as-shadow:0 12px 40px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05);
    --as-shadow-search:0 20px 60px rgba(0,0,0,.55),0 3px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.05);
    --as-fab-shadow:0 2px 8px rgba(0,0,0,.3);--as-thumb-shadow:0 1px 4px rgba(0,0,0,.5);
  }
  @media (prefers-color-scheme: light){
    #anysub-root{
      --as-grad-top:#ffffff;--as-grad-bot:#f1f4f9;
      --as-fg:#1b2431;--as-fg2:#5b657a;--as-fg3:#8a93a6;--as-fg-strong:#0d1420;--as-val:#333b49;
      --as-border:rgba(0,0,0,.1);--as-line:rgba(0,0,0,.08);
      --as-btn-bg:rgba(0,0,0,.03);--as-btn-bd:rgba(0,0,0,.12);--as-btn-hover:rgba(0,0,0,.06);
      --as-hover-soft:rgba(0,0,0,.06);
      --as-inset:#ffffff;--as-inset-focus:#ffffff;--as-inset-bd:rgba(0,0,0,.16);
      --as-seg-bg:rgba(0,0,0,.05);--as-track:rgba(0,0,0,.14);
      --as-accent:#2b6cff;--as-accent2:#1f5fe0;
      --as-accent-focus:rgba(43,108,255,.6);--as-accent-bd:rgba(43,108,255,.4);
      --as-accent-soft:rgba(43,108,255,.1);--as-accent-ring:rgba(43,108,255,.85);
      --as-primary-bg:linear-gradient(180deg,rgba(43,108,255,.12),rgba(43,108,255,.06));
      --as-primary-bg-hover:linear-gradient(180deg,rgba(43,108,255,.2),rgba(43,108,255,.12));
      --as-primary-bd:rgba(43,108,255,.32);--as-primary-bd-hover:rgba(43,108,255,.55);--as-primary-fg:#1f5fe0;
      --as-seg-on:#2b6cff;
      --as-card:rgba(0,0,0,.025);--as-card-bd:rgba(0,0,0,.08);
      --as-success:#1a9d54;--as-link:#2b6cff;
      --as-danger-bg:rgba(220,53,53,.1);--as-danger-bd:rgba(220,53,53,.4);--as-danger-fg:#cc3b3b;
      --as-poster-bg:#e6e9f0;--as-poster-fg:#a2abbd;
      --as-kbd-bg:#eef1f6;--as-kbd-bd:rgba(0,0,0,.14);--as-kbd-fg:#55607a;
      --as-tag-bg:rgba(0,0,0,.05);--as-drop-bd:rgba(0,0,0,.2);
      --as-ring-gap:#ffffff;--as-swatch-inset:rgba(0,0,0,.18);
      --as-shadow:0 12px 40px rgba(20,30,60,.16),0 2px 8px rgba(20,30,60,.1);
      --as-shadow-search:0 20px 60px rgba(20,30,60,.22),0 3px 10px rgba(20,30,60,.12);
      --as-fab-shadow:0 2px 10px rgba(20,30,60,.3);--as-thumb-shadow:0 1px 3px rgba(20,30,60,.35);
    }
  }

  #anysub-overlay{position:fixed;z-index:2147483640;pointer-events:none;overflow:hidden;}
  .anysub-cuebox{position:absolute;left:50%;transform:translateX(-50%);
    max-width:92%;text-align:center;line-height:1.25;white-space:pre-wrap;word-break:break-word;
    font-family:-apple-system,'PingFang SC','Microsoft YaHei',system-ui,sans-serif;
    font-weight:600;border-radius:4px;box-sizing:border-box;}
  .anysub-cuebox ruby{ruby-align:center;}
  .anysub-cuebox rt{font-size:.5em;font-weight:400;opacity:.9;line-height:1;}
  .anysub-cuebox .anysub-spk{font-size:.82em;font-weight:500;opacity:.66;margin-right:.15em;}
  .anysub-cuebox .anysub-sfx{font-style:italic;opacity:.68;}
  .anysub-cuebox .anysub-voice{font-style:italic;color:#c3d8ff;}
  .anysub-cuebox .anysub-book{font-family:'Hiragino Mincho ProN','Yu Mincho','Songti SC','Source Han Serif SC','SimSun',serif;letter-spacing:.04em;}
  .anysub-cuebox .anysub-lyric{font-style:italic;}
  #anysub-fab{position:fixed;bottom:28%;z-index:2147483646;width:30px;height:30px;
    display:flex;align-items:center;justify-content:center;
    background:var(--as-accent2);color:#fff;border-radius:50%;
    font:14px/1 -apple-system,system-ui,sans-serif;cursor:grab;user-select:none;touch-action:none;
    box-shadow:var(--as-fab-shadow);opacity:.35;transition:opacity .25s,transform .2s;}
  #anysub-fab:hover{opacity:1;}
  #anysub-fab:active{cursor:grabbing;}
  #anysub-fab.dock-right{right:0;}
  #anysub-fab.dock-left{left:0;}
  #anysub-fab.dock-right:not(.dragging){transform:translateX(32%);}
  #anysub-fab.dock-left:not(.dragging){transform:translateX(-32%);}
  #anysub-fab.dock-right:hover,#anysub-fab.dock-left:hover{transform:translateX(0);}
  #anysub-fab.dragging{transition:none;cursor:grabbing;}

  /* ── 设置面板(无 backdrop-filter 以免每帧重绘视频区) ── */
  #anysub-panel{position:fixed;right:16px;bottom:54px;z-index:2147483647;width:300px;box-sizing:border-box;
    color:var(--as-fg);font:13px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',system-ui,sans-serif;
    background:linear-gradient(180deg,var(--as-grad-top),var(--as-grad-bot));border:1px solid var(--as-border);border-radius:14px;padding:12px;
    box-shadow:var(--as-shadow);-webkit-font-smoothing:antialiased;}
  #anysub-panel *{box-sizing:border-box;}
  #anysub-panel.as-in{animation:as-pop .13s cubic-bezier(.2,.7,.3,1);}
  @keyframes as-pop{from{opacity:0;transform:translateY(5px) scale(.985);}to{opacity:1;transform:none;}}
  #anysub-panel button{font-family:inherit;color:var(--as-fg);cursor:pointer;border:1px solid var(--as-btn-bd);
    background:var(--as-btn-bg);border-radius:8px;transition:background .15s,border-color .15s,transform .05s;}
  #anysub-panel button:active{transform:translateY(.5px);}

  #anysub-panel .as-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px;}
  #anysub-panel .as-brand{display:flex;align-items:center;gap:8px;font-weight:650;letter-spacing:.01em;font-size:13.5px;}
  #anysub-panel .as-logo{width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,var(--as-accent),var(--as-accent2));color:#fff;font-size:13px;font-weight:700;box-shadow:0 2px 6px rgba(43,108,255,.4);}
  #anysub-panel .as-x{width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;
    color:var(--as-fg2);border-radius:7px;font-size:14px;line-height:1;transition:background .15s,color .15s;}
  #anysub-panel .as-x:hover{background:var(--as-hover-soft);color:var(--as-fg-strong);}

  #anysub-panel .as-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  #anysub-panel .as-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 8px;font-size:12.5px;font-weight:550;}
  #anysub-panel .as-btn svg{width:16px;height:16px;flex:none;opacity:.9;}
  #anysub-panel .as-btn-primary{background:var(--as-primary-bg);border-color:var(--as-primary-bd);color:var(--as-primary-fg);}
  #anysub-panel .as-btn-primary:hover{background:var(--as-primary-bg-hover);border-color:var(--as-primary-bd-hover);}

  #anysub-panel .as-drop{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px;
    border:1px dashed var(--as-drop-bd);border-radius:9px;padding:9px;color:var(--as-fg3);font-size:11.5px;
    transition:border-color .15s,color .15s,background .15s;}
  #anysub-panel .as-drop svg{width:15px;height:15px;opacity:.8;flex:none;}
  #anysub-panel .as-drop.as-dragover{border-color:var(--as-accent-focus);color:var(--as-accent);background:var(--as-accent-soft);}

  #anysub-panel .as-status-row{display:flex;align-items:center;gap:8px;margin-top:10px;}
  #anysub-panel .as-status{flex:1;min-width:0;color:var(--as-fg2);font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #anysub-panel .as-status.as-loaded{color:var(--as-success);}
  #anysub-panel .as-status-actions{display:flex;gap:4px;flex:none;}
  #anysub-panel .as-icon-btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;padding:0;}
  #anysub-panel .as-icon-btn svg{width:15px;height:15px;opacity:.85;}
  #anysub-panel .as-icon-btn:hover{background:var(--as-btn-hover);}
  #anysub-panel #anysub-vis.off{color:var(--as-fg3);}
  #anysub-panel #anysub-vis .as-eye-off{display:none;}
  #anysub-panel #anysub-vis.off .as-eye{display:none;}
  #anysub-panel #anysub-vis.off .as-eye-off{display:flex;}
  #anysub-panel #anysub-clear:hover{background:var(--as-danger-bg);border-color:var(--as-danger-bd);color:var(--as-danger-fg);}

  #anysub-panel .as-divider{height:1px;background:var(--as-line);margin:12px 0;}
  #anysub-panel .as-field{margin:10px 0;}
  #anysub-panel .as-label{display:flex;align-items:center;justify-content:space-between;color:var(--as-fg2);font-size:11.5px;font-weight:550;margin-bottom:7px;}
  #anysub-panel .as-val{color:var(--as-val);font-variant-numeric:tabular-nums;font-weight:600;}

  /* 语言选择:label 左、select 右,同一行紧凑排布 */
  #anysub-panel .as-field-lang{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0 8px;}
  #anysub-panel .as-field-lang .as-label{margin:0;}
  #anysub-panel .as-select{appearance:none;-webkit-appearance:none;background:var(--as-inset);color:var(--as-fg-strong);
    border:1px solid var(--as-inset-bd);border-radius:8px;padding:5px 26px 5px 9px;font-size:12px;font-weight:550;cursor:pointer;
    background-image:linear-gradient(45deg,transparent 50%,var(--as-fg2) 50%),linear-gradient(135deg,var(--as-fg2) 50%,transparent 50%);
    background-position:calc(100% - 13px) 50%,calc(100% - 8px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;}
  #anysub-panel .as-select:focus{outline:none;border-color:var(--as-accent-focus);background-color:var(--as-inset-focus);}

  #anysub-panel .as-offset{display:flex;align-items:center;gap:5px;}
  #anysub-panel .as-step{flex:1;padding:6px 0;font-size:12px;font-variant-numeric:tabular-nums;}
  #anysub-panel .as-step:hover{background:var(--as-btn-hover);}
  #anysub-offset{width:56px;flex:none;text-align:center;background:var(--as-inset);color:var(--as-fg-strong);font-weight:600;
    border:1px solid var(--as-inset-bd);border-radius:8px;padding:6px 2px;font-size:12.5px;-moz-appearance:textfield;font-variant-numeric:tabular-nums;}
  #anysub-offset:focus{outline:none;border-color:var(--as-accent-focus);background:var(--as-inset-focus);}
  #anysub-offset::-webkit-outer-spin-button,#anysub-offset::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}

  #anysub-panel .as-range{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:3px;background:var(--as-track);outline:none;cursor:pointer;}
  #anysub-panel .as-range::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:#fff;border:0;
    box-shadow:var(--as-thumb-shadow),0 0 0 3px var(--as-accent-ring);cursor:grab;margin-top:-5px;}
  #anysub-panel .as-range::-webkit-slider-thumb:active{cursor:grabbing;}
  #anysub-panel .as-range::-moz-range-thumb{width:15px;height:15px;border-radius:50%;background:#fff;border:0;box-shadow:0 0 0 3px var(--as-accent-ring);cursor:grab;}
  #anysub-panel .as-range::-moz-range-track{height:5px;border-radius:3px;background:var(--as-track);}

  #anysub-panel .as-seg{display:flex;gap:3px;background:var(--as-seg-bg);border:1px solid var(--as-line);border-radius:9px;padding:3px;}
  #anysub-panel .as-seg button{flex:1;border:0;background:transparent;color:var(--as-fg2);padding:6px 4px;border-radius:6px;font-size:12px;}
  #anysub-panel .as-seg button:hover{background:var(--as-hover-soft);color:var(--as-fg);}
  #anysub-panel .as-seg button.on{background:var(--as-seg-on);color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);}

  #anysub-panel .as-swatches{display:flex;gap:12px;align-items:center;padding:2px 0;}
  #anysub-panel .as-swatches button{width:24px;height:24px;padding:0;border:0;border-radius:50%;background:var(--sw);
    box-shadow:inset 0 0 0 1px var(--as-swatch-inset);transition:transform .1s,box-shadow .12s;}
  #anysub-panel .as-swatches button:hover{transform:scale(1.14);}
  #anysub-panel .as-swatches button.on{box-shadow:0 0 0 2px var(--as-ring-gap),0 0 0 4px var(--as-accent-ring),inset 0 0 0 1px var(--as-swatch-inset);}

  #anysub-panel .as-switch-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0;}
  #anysub-panel .as-switch-label{color:var(--as-fg);font-size:12.5px;}
  #anysub-panel .as-switch{width:38px;height:22px;padding:0;border-radius:999px;flex:none;position:relative;
    background:var(--as-track);border:1px solid var(--as-line);transition:background .18s;}
  #anysub-panel .as-switch .as-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;
    box-shadow:0 1px 3px rgba(0,0,0,.4);transition:transform .18s;}
  #anysub-panel .as-switch.on{background:linear-gradient(180deg,var(--as-accent),var(--as-accent2));border-color:transparent;}
  #anysub-panel .as-switch.on .as-knob{transform:translateX(16px);}

  #anysub-panel .as-hints{margin-top:11px;color:var(--as-fg3);font-size:10.5px;line-height:1.9;}
  #anysub-panel .as-hints kbd{display:inline-block;background:var(--as-kbd-bg);border:1px solid var(--as-kbd-bd);
    border-bottom-width:2px;border-radius:4px;padding:0 4px;margin:0 1px;font:600 10px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--as-kbd-fg);}

  /* ── 在线搜索面板(独立居中模态,与主面板同一视觉语言) ── */
  #anysub-search{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;
    width:400px;max-width:92vw;max-height:82vh;display:flex;flex-direction:column;box-sizing:border-box;color:var(--as-fg);
    font:13px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',system-ui,sans-serif;
    background:linear-gradient(180deg,var(--as-grad-top),var(--as-grad-bot));border:1px solid var(--as-border);border-radius:14px;padding:14px;
    box-shadow:var(--as-shadow-search);}
  #anysub-search *{box-sizing:border-box;}
  #anysub-search.as-in{animation:as-pop-c .14s cubic-bezier(.2,.7,.3,1);}
  @keyframes as-pop-c{from{opacity:0;transform:translate(-50%,-48%) scale(.985);}to{opacity:1;transform:translate(-50%,-50%);}}
  #anysub-search button{font-family:inherit;color:var(--as-fg);cursor:pointer;border:1px solid var(--as-btn-bd);
    background:var(--as-btn-bg);border-radius:8px;transition:background .15s,border-color .15s,transform .05s;}
  #anysub-search button:active{transform:translateY(.5px);}
  #anysub-search input{width:100%;background:var(--as-inset);color:var(--as-fg);border:1px solid var(--as-inset-bd);border-radius:8px;
    padding:8px 10px;font-size:12.5px;font-family:inherit;min-width:0;}
  #anysub-search input:focus{outline:none;border-color:var(--as-accent-focus);background:var(--as-inset-focus);}
  #anysub-search input::placeholder{color:var(--as-fg3);}

  #anysub-search .as-sc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
  #anysub-search .as-sc-back{display:flex;align-items:center;gap:5px;padding:5px 10px 5px 7px;font-size:12px;color:var(--as-fg2);}
  #anysub-search .as-sc-back svg{width:15px;height:15px;}
  #anysub-search .as-sc-back:hover{background:var(--as-btn-hover);border-color:var(--as-btn-bd);color:var(--as-fg-strong);}
  #anysub-search .as-x{width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;color:var(--as-fg2);border-radius:7px;font-size:14px;transition:background .15s,color .15s;}
  #anysub-search .as-x:hover{background:var(--as-hover-soft);color:var(--as-fg-strong);}

  #anysub-search .as-sc-title{display:flex;align-items:center;gap:8px;font-weight:650;font-size:14px;margin-bottom:12px;}
  #anysub-search .as-sc-title .as-logo{width:22px;height:22px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--as-accent),var(--as-accent2));color:#fff;font-size:12px;box-shadow:0 2px 6px rgba(43,108,255,.4);}
  #anysub-search .as-sc-tag{font-weight:400;font-size:11px;color:var(--as-fg3);background:var(--as-tag-bg);border:1px solid var(--as-border);border-radius:20px;padding:1px 8px;}

  #anysub-search .as-sc-keyrow{display:flex;gap:7px;margin-bottom:6px;}
  #anysub-search .as-sc-keyrow button{flex:none;padding:0 14px;font-size:12px;}
  #anysub-search .as-sc-keyok{display:flex;align-items:center;gap:6px;color:var(--as-success);font-size:11.5px;margin-bottom:10px;}
  #anysub-search .as-sc-keyok svg{width:14px;height:14px;flex:none;}
  #anysub-search .as-sc-change{margin-left:auto;color:var(--as-link);cursor:pointer;font-size:11px;}
  #anysub-search .as-sc-change:hover{text-decoration:underline;}
  #anysub-search .as-sc-hint{font-size:10.5px;color:var(--as-fg3);margin:0 2px 10px;}

  #anysub-search .as-sc-search{display:flex;gap:7px;margin-bottom:12px;}
  #anysub-search .as-sc-search .as-sc-ep{flex:0 0 52px;text-align:center;}
  #anysub-search .as-sc-search button{flex:none;padding:0 14px;font-size:12.5px;display:flex;align-items:center;gap:6px;
    background:var(--as-primary-bg);border-color:var(--as-primary-bd);color:var(--as-primary-fg);}
  #anysub-search .as-sc-search button:hover{background:var(--as-primary-bg-hover);border-color:var(--as-primary-bd-hover);}
  #anysub-search .as-sc-search button svg{width:15px;height:15px;}

  #anysub-search .as-sc-results{overflow-y:auto;margin:0 -4px;padding:0 4px;flex:1;min-height:64px;}
  #anysub-search .as-sc-sec{font-size:11px;color:var(--as-fg2);margin:6px 2px 7px;}
  #anysub-search .as-sc-empty{color:var(--as-fg3);font-size:12px;padding:22px 8px;text-align:center;}
  #anysub-search .as-sc-back2{display:inline-flex;align-items:center;gap:5px;color:var(--as-link);cursor:pointer;font-size:12px;margin:2px 2px 9px;}
  #anysub-search .as-sc-back2 svg{width:14px;height:14px;}
  #anysub-search .as-sc-back2:hover{text-decoration:underline;}

  #anysub-search .as-sc-anime{display:flex;gap:11px;align-items:center;padding:8px;margin-bottom:7px;border-radius:10px;cursor:pointer;
    background:var(--as-card);border:1px solid var(--as-card-bd);transition:background .15s,border-color .15s;}
  #anysub-search .as-sc-anime:hover{background:var(--as-accent-soft);border-color:var(--as-accent-bd);}
  #anysub-search .as-sc-poster{position:relative;width:42px;height:58px;flex:none;border-radius:6px;background:var(--as-poster-bg);
    display:flex;align-items:center;justify-content:center;color:var(--as-poster-fg);overflow:hidden;}
  #anysub-search .as-sc-poster svg{width:20px;height:20px;}
  #anysub-search .as-sc-poster img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
  #anysub-search .as-sc-anime-main{flex:1;min-width:0;}
  #anysub-search .as-sc-anime-t{color:var(--as-fg);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #anysub-search .as-sc-anime-s{color:var(--as-fg3);font-size:11px;margin-top:3px;}
  #anysub-search .as-sc-chev{color:var(--as-fg3);flex:none;display:flex;}
  #anysub-search .as-sc-chev svg{width:16px;height:16px;}

  #anysub-search .as-sc-file{padding:8px 10px;margin-bottom:6px;border-radius:9px;cursor:pointer;
    background:var(--as-card);border:1px solid var(--as-card-bd);transition:background .15s,border-color .15s;}
  #anysub-search .as-sc-file:hover{background:var(--as-accent-soft);border-color:var(--as-accent-bd);}
  #anysub-search .as-sc-file.loading{opacity:.5;pointer-events:none;}
  #anysub-search .as-sc-file-t{color:var(--as-fg);font-size:12px;word-break:break-all;line-height:1.4;}
  #anysub-search .as-sc-file-s{color:var(--as-fg3);font-size:10.5px;margin-top:3px;}

  .anysub-vidpick{position:fixed;z-index:2147483647;border:3px solid var(--as-accent2);background:rgba(43,108,255,.15);cursor:pointer;box-sizing:border-box;}
  #anysub-toast{position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:2147483647;
    background:rgba(0,0,0,.85);color:#fff;padding:8px 16px;border-radius:6px;
    font:13px -apple-system,system-ui,sans-serif;opacity:0;transition:opacity .3s;pointer-events:none;max-width:80vw;text-align:center;}

  /* 可点「发现字幕」提示:带主操作按钮 + 关闭 */
  #anysub-offer{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:2147483647;
    display:flex;align-items:center;gap:10px;max-width:88vw;box-sizing:border-box;pointer-events:auto;
    color:var(--as-fg);font:13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',system-ui,sans-serif;
    background:linear-gradient(180deg,var(--as-grad-top),var(--as-grad-bot));border:1px solid var(--as-border);
    border-radius:12px;padding:9px 10px 9px 14px;box-shadow:var(--as-shadow);animation:as-pop .14s cubic-bezier(.2,.7,.3,1);}
  #anysub-offer .as-offer-msg{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw;}
  #anysub-offer button{font-family:inherit;cursor:pointer;border-radius:8px;transition:background .15s,border-color .15s;}
  #anysub-offer .as-offer-act{flex:none;padding:6px 14px;font-size:12.5px;font-weight:550;
    background:var(--as-primary-bg);border:1px solid var(--as-primary-bd);color:var(--as-primary-fg);}
  #anysub-offer .as-offer-act:hover{background:var(--as-primary-bg-hover);border-color:var(--as-primary-bd-hover);}
  #anysub-offer .as-offer-x{flex:none;width:24px;height:24px;display:flex;align-items:center;justify-content:center;
    padding:0;border:0;background:transparent;color:var(--as-fg2);font-size:13px;}
  #anysub-offer .as-offer-x:hover{background:var(--as-hover-soft);color:var(--as-fg-strong);}
`;

export function injectStyle() {
  const s = document.createElement('style');
  s.textContent = CSS;
  // document.head 在 XML/SVG/极简文档下可能为 null,回退到 documentElement
  (document.head || document.documentElement).appendChild(s);
}
