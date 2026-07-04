// ==UserScript==
// @name         AnySub · 通用字幕挂载
// @namespace    https://github.com/shiinayane/anysub
// @version      0.14.0
// @author       shiinayane
// @description  给任意网站的 HTML5 视频挂载本地字幕文件(SRT / VTT),自绘覆盖层渲染:样式可控、字号随播放器等比缩放、全屏跟随。Chrome / Edge / Safari / Firefox 通用。
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function() {
	"use strict";
	var state = {
		video: null,
		cues: [],
		offset: 0,
		offsets: {},
		offsetKey: "",
		fileName: "",
		active: false,
		hidden: false,
		showFab: false,
		rubyParen: true,
		jimakuKey: "",
		loadedSeries: "",
		loadedEpisode: "",
		lastOnline: null,
		style: {
			fontPct: 100,
			bg: "translucent",
			color: "#ffffff",
			bottomPct: 8
		}
	};
	var FONT_BASE = .045;
	var CSS = `
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
	function injectStyle() {
		const s = document.createElement("style");
		s.textContent = CSS;
		(document.head || document.documentElement).appendChild(s);
	}
	var refs = {
		uiRoot: null,
		overlay: null,
		fab: null,
		panel: null,
		statusEl: null,
		fileInput: null
	};
	var lastRectKey = "", lastRect = null;
	function invalidateLayout() {
		lastRectKey = "";
	}
	function fullscreenEl() {
		return document.fullscreenElement || document.webkitFullscreenElement || null;
	}
	function getHost() {
		const fs = fullscreenEl();
		if (fs && fs.tagName !== "VIDEO") return fs;
		return document.body;
	}
	function ensureMounted(el) {
		const host = getHost();
		if (el.parentNode !== host) host.appendChild(el);
	}
	function hideOverlay() {
		if (refs.overlay) refs.overlay.style.display = "none";
	}
	function positionOverlay(v) {
		const r = v.getBoundingClientRect();
		const key = `${r.left}|${r.top}|${r.width}|${r.height}`;
		if (key === lastRectKey) return {
			rect: lastRect,
			changed: false
		};
		lastRectKey = key;
		lastRect = r;
		const o = refs.overlay;
		o.style.display = "block";
		o.style.left = r.left + "px";
		o.style.top = r.top + "px";
		o.style.width = r.width + "px";
		o.style.height = r.height + "px";
		return {
			rect: r,
			changed: true
		};
	}
	var toastTimer;
	function toast(msg) {
		let t = document.getElementById("anysub-toast");
		if (!t) {
			t = document.createElement("div");
			t.id = "anysub-toast";
			(refs.uiRoot || document.body).appendChild(t);
		}
		t.textContent = msg;
		t.style.opacity = "1";
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => {
			t.style.opacity = "0";
		}, 2500);
	}
	function updateStatus() {
		if (!refs.statusEl) return;
		const loaded = state.cues.length > 0;
		refs.statusEl.textContent = loaded ? `${state.fileName} · ${state.cues.length} 条` : "未加载字幕";
		refs.statusEl.classList.toggle("as-loaded", loaded);
		refs.statusEl.title = loaded ? state.fileName : "";
	}
	var mo = null, timer$1 = 0, onReact = () => {};
	function setReactHandler(fn) {
		onReact = fn;
	}
	function updateWatcher() {
		const need = state.showFab || state.cues.length > 0;
		if (need && !mo) {
			mo = new MutationObserver(() => {
				clearTimeout(timer$1);
				timer$1 = setTimeout(() => onReact(), 300);
			});
			mo.observe(document.documentElement, {
				childList: true,
				subtree: true
			});
		} else if (!need && mo) {
			mo.disconnect();
			mo = null;
			clearTimeout(timer$1);
		}
	}
	var intervalId = 0, driversAttached = false;
	var renderer = null;
	var onScroll, onResize, onFs, onVis;
	function setRenderer(r) {
		if (renderer) renderer.destroy();
		renderer = r;
		if (renderer) {
			renderer.mount();
			if (renderer.setVisible) renderer.setVisible(!state.hidden);
		}
	}
	function applyStyle() {
		if (renderer && renderer.applyStyle) renderer.applyStyle();
	}
	function refresh() {
		renderTick();
	}
	function startRender() {
		state.active = true;
		attachDrivers();
		if (!intervalId) intervalId = setInterval(renderTick, 250);
		renderTick();
	}
	function stopRender() {
		state.active = false;
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = 0;
		}
		detachDrivers();
		hideOverlay();
	}
	function attachDrivers() {
		if (driversAttached) return;
		driversAttached = true;
		onScroll = () => renderTick();
		onResize = () => {
			invalidateLayout();
			renderTick();
		};
		onFs = () => {
			invalidateLayout();
			renderTick();
		};
		onVis = () => {
			if (!document.hidden) renderTick();
		};
		window.addEventListener("scroll", onScroll, {
			capture: true,
			passive: true
		});
		window.addEventListener("resize", onResize, { passive: true });
		document.addEventListener("fullscreenchange", onFs);
		document.addEventListener("webkitfullscreenchange", onFs);
		document.addEventListener("visibilitychange", onVis);
	}
	function detachDrivers() {
		if (!driversAttached) return;
		driversAttached = false;
		window.removeEventListener("scroll", onScroll, { capture: true });
		window.removeEventListener("resize", onResize);
		document.removeEventListener("fullscreenchange", onFs);
		document.removeEventListener("webkitfullscreenchange", onFs);
		document.removeEventListener("visibilitychange", onVis);
	}
	function renderTick() {
		if (!state.active || !renderer) return;
		const v = state.video;
		if (v && v.isConnected && state.cues.length) {
			ensureMounted(refs.overlay);
			ensureMounted(refs.uiRoot);
			const { rect, changed } = positionOverlay(v);
			renderer.renderAt(v, rect, changed);
		} else hideOverlay();
	}
	function setVideo(v) {
		if (state.video && state.video !== v) {
			state.video.removeEventListener("timeupdate", renderTick);
			state.video.removeEventListener("seeking", renderTick);
			state.video.removeEventListener("play", renderTick);
		}
		state.video = v;
		invalidateLayout();
		if (v) {
			v.addEventListener("timeupdate", renderTick);
			v.addEventListener("seeking", renderTick);
			v.addEventListener("play", renderTick);
		}
		if (state.cues.length) startRender();
	}
	function toggleSubtitles() {
		if (!state.cues.length) {
			toast("未加载字幕");
			return;
		}
		state.hidden = !state.hidden;
		if (renderer && renderer.setVisible) renderer.setVisible(!state.hidden);
		renderTick();
		toast(state.hidden ? "字幕已隐藏" : "字幕已显示");
		return state.hidden;
	}
	function clearSubtitle() {
		if (!state.cues.length) {
			toast("当前没有字幕");
			return;
		}
		state.cues = [];
		state.fileName = "";
		stopRender();
		if (renderer) {
			renderer.destroy();
			renderer = null;
		}
		updateStatus();
		updateWatcher();
		toast("已清除字幕");
	}
	function readSubtitleFile(file) {
		return file.arrayBuffer().then((buf) => decodeBuffer(new Uint8Array(buf)));
	}
	function decodeBuffer(bytes) {
		if (bytes.length >= 3 && bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191) return new TextDecoder("utf-8").decode(bytes.subarray(3));
		if (bytes.length >= 2 && bytes[0] === 255 && bytes[1] === 254) return new TextDecoder("utf-16le").decode(bytes);
		if (bytes.length >= 2 && bytes[0] === 254 && bytes[1] === 255) return new TextDecoder("utf-16be").decode(bytes);
		try {
			return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		} catch (_) {
			let best = null, bestScore = Infinity;
			for (const enc of [
				"shift_jis",
				"euc-jp",
				"gbk",
				"big5"
			]) try {
				const text = new TextDecoder(enc).decode(bytes);
				const score = (text.match(/�/g) || []).length;
				if (score < bestScore) {
					bestScore = score;
					best = text;
				}
			} catch (_) {}
			if (best !== null) return best;
			console.warn("[AnySub] 无法自动识别字幕编码,按 UTF-8 兜底,可能乱码;建议转成 UTF-8");
			return new TextDecoder("utf-8").decode(bytes);
		}
	}
	var TIME_RE = /(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})/;
	function parseSubtitle(text, fileName) {
		text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
		const cues = /^﻿?WEBVTT/.test(text) || /\.vtt$/i.test(fileName || "") ? parseVtt(text) : parseSrt(text);
		cues.sort((a, b) => a.start - b.start);
		return cues;
	}
	function timeToSeconds(t) {
		t = t.trim().replace(",", ".");
		const parts = t.split(":");
		if (parts.length > 3) return NaN;
		let s = 0;
		for (const p of parts) {
			const n = parseFloat(p);
			if (!isFinite(n)) return NaN;
			s = s * 60 + n;
		}
		return s;
	}
	function parseSrt(text) {
		const lines = text.split("\n");
		const cues = [];
		let i = 0;
		while (i < lines.length) {
			const m = lines[i].match(TIME_RE);
			if (!m) {
				i++;
				continue;
			}
			i++;
			const body = [];
			while (i < lines.length && !TIME_RE.test(lines[i])) {
				body.push(lines[i]);
				i++;
			}
			while (body.length && body[body.length - 1].trim() === "") body.pop();
			if (body.length && /^\d+$/.test(body[body.length - 1].trim())) body.pop();
			while (body.length && body[body.length - 1].trim() === "") body.pop();
			pushCue(cues, m, body);
		}
		return cues;
	}
	function parseVtt(text) {
		const lines = text.split("\n");
		const cues = [];
		let i = 0;
		while (i < lines.length) {
			const m = lines[i].match(TIME_RE);
			if (!m) {
				i++;
				continue;
			}
			i++;
			const body = [];
			while (i < lines.length && lines[i].trim() !== "" && !TIME_RE.test(lines[i])) {
				body.push(lines[i]);
				i++;
			}
			pushCue(cues, m, body);
		}
		return cues;
	}
	function pushCue(cues, m, bodyLines) {
		const start = timeToSeconds(m[1]);
		const end = timeToSeconds(m[2]);
		const body = bodyLines.join("\n").trim();
		if (!body || !isFinite(start) || !isFinite(end) || end <= start) return;
		cues.push({
			start,
			end,
			text: sanitize(body)
		});
	}
	function sanitize(s) {
		s = s.replace(/\{\\[^}]*\}/g, "");
		s = s.replace(/\{[^}]*\}/g, "");
		s = s.replace(/<\/?font[^>]*>/gi, "");
		s = escapeHtml(s);
		s = s.replace(/&lt;(\/?)(i|b|u)&gt;/gi, "<$1$2>");
		s = s.replace(/\n/g, "<br>");
		return s;
	}
	function escapeHtml(s) {
		return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}
	var KANJI = {
		"〇": 0,
		"零": 0,
		"一": 1,
		"二": 2,
		"三": 3,
		"四": 4,
		"五": 5,
		"六": 6,
		"七": 7,
		"八": 8,
		"九": 9,
		"壱": 1,
		"弐": 2,
		"参": 3,
		"肆": 4,
		"伍": 5,
		"陸": 6,
		"漆": 7,
		"捌": 8,
		"玖": 9
	};
	var UNITS = {
		"十": 10,
		"拾": 10,
		"百": 100,
		"千": 1e3
	};
	function toHalfDigits(s) {
		return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 65248));
	}
	function jpNumToInt(s) {
		if (/^[0-9０-９]+$/.test(s)) return parseInt(toHalfDigits(s), 10);
		let total = 0, cur = 0, seen = false;
		for (const ch of s) if (ch in KANJI) {
			cur = KANJI[ch];
			seen = true;
		} else if (ch in UNITS) {
			total += (cur || 1) * UNITS[ch];
			cur = 0;
			seen = true;
		}
		total += cur;
		return seen ? total : NaN;
	}
	function parseVideoTitle(raw) {
		let t = (raw || "").trim();
		t = t.split(/[|｜]/)[0].trim();
		t = t.replace(/\s*[(（【\[][^)）】\]]*[)）】\]]\s*$/g, "").trim();
		let episode = "";
		let m = t.match(/第\s*([0-9０-９〇零一二三四五六七八九十百千壱弐参肆伍陸漆捌玖拾]+)\s*[話话回]/);
		if (!m) m = t.match(/(?:#|＃|Ep\.?\s*|Episode\s*|EP\s*)([0-9０-９]+)/i);
		if (m) {
			const n = jpNumToInt(m[1]);
			if (isFinite(n)) episode = String(n);
			t = t.slice(0, m.index).trim();
		}
		t = t.replace(/[\s\-–—・:：~〜]+$/g, "").trim();
		return {
			series: t.slice(0, 60),
			episode
		};
	}
	var EP_TOK = /^(s\d{1,2}e\d{1,3}|e\d{1,3}|v\d+|\d{1,4}|[0-9a-f]{8})$/;
	function sourceTokens(name) {
		const out = new Set();
		for (const t of String(name || "").toLowerCase().split(/[^a-z0-9]+/)) if (t && !EP_TOK.test(t)) out.add(t);
		return out;
	}
	function fileTokens(name) {
		return String(name || "").toLowerCase().replace(/\.(ass|ssa|srt|vtt|sub|sbv)$/i, "").split(/[^a-z0-9぀-ヿ一-鿿]+/).filter((t) => t && !EP_TOK.test(t));
	}
	function pickSameSource(files, refName) {
		if (!refName) return null;
		const refSig = sourceTokens(refName);
		const useSig = refSig.size >= 1;
		const refFull = new Set(fileTokens(refName));
		let best = null, bestScore = -1, second = -1;
		for (const f of files) {
			const s = useSig ? jaccard(refSig, sourceTokens(f.name)) : jaccard(refFull, new Set(fileTokens(f.name)));
			if (s > bestScore) {
				second = bestScore;
				bestScore = s;
				best = f;
			} else if (s > second) second = s;
		}
		if (best && (bestScore >= (useSig ? .5 : .6) || bestScore >= .34 && bestScore - second >= .34)) return best;
		return null;
	}
	function jaccard(a, b) {
		let inter = 0;
		for (const t of a) if (b.has(t)) inter++;
		const uni = a.size + b.size - inter;
		return uni ? inter / uni : 0;
	}
	function collectVideos(root, acc) {
		acc = acc || [];
		root = root || document;
		let list;
		try {
			list = root.querySelectorAll("video");
		} catch (_) {
			list = [];
		}
		list.forEach((v) => acc.push(v));
		let all;
		try {
			all = root.querySelectorAll("*");
		} catch (_) {
			all = [];
		}
		all.forEach((el) => {
			if (el.shadowRoot) collectVideos(el.shadowRoot, acc);
		});
		return acc;
	}
	function isVisible(v) {
		const r = v.getBoundingClientRect();
		return r.width > 0 && r.height > 0;
	}
	function pickBestVideo() {
		const vids = collectVideos().filter(isVisible);
		if (!vids.length) return collectVideos()[0] || null;
		vids.sort((a, b) => {
			const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
			return rb.width * rb.height - ra.width * ra.height;
		});
		return vids[0];
	}
	var KANJI_READINGS_JSON = "{\"亜\":\"あ,つ,や,つぎ,つぐ\",\"娃\":\"あ,あい,わ,うつく,い\",\"阿\":\"あ,お,おもね,くま,ほとり,あず,あわ,おか,きた,な\",\"哀\":\"あい,あわ,かな\",\"愛\":\"あい,いと,かな,め,お,まな,あ,あし,え,なる,めぐ,めぐみ,よし,ちか\",\"挨\":\"あい,ひら\",\"逢\":\"ほう,あ,むか,あい,おう\",\"葵\":\"き,あおい,まもる,け\",\"茜\":\"せん,あかね\",\"悪\":\"あく,お,わる,あ,にく,ああ,いずくに,いずくんぞ\",\"握\":\"あく,にぎ\",\"渥\":\"あく,あつ,うるお,あつし\",\"旭\":\"きょく,あさひ,あきら,あき,てる,ひ\",\"葦\":\"い,あし,よし,しお,しな,しぼ,な\",\"芦\":\"ろ,あし,よし,あ\",\"梓\":\"し,あずさ\",\"圧\":\"あつ,えん,おう,お,へ,おさ\",\"斡\":\"あつ,かん,わつ,めぐ\",\"扱\":\"そう,きゅう,あつか,こ\",\"宛\":\"えん,あ,あて,づつ,あたか\",\"絢\":\"けん,じゅん,あや\",\"綾\":\"りん,あや,りょう\",\"鮎\":\"でん,ねん,あゆ,なまず,あい\",\"或\":\"わく,こく,いき,あ,あるい,あるいは\",\"粟\":\"ぞく,しょく,そく,あわ,もみ,あ,さっ,そう\",\"安\":\"あん,やす,あ,あす,あず,あっ,や\",\"庵\":\"あん,いおり,いお,あ,い,いほり\",\"按\":\"あん,おさ,しら\",\"暗\":\"あん,くら,くれ\",\"案\":\"あん,つくえ\",\"闇\":\"あん,おん,やみ,くら\",\"鞍\":\"あん,くら\",\"杏\":\"きょう,あん,こう,あんず,りょう\",\"以\":\"い,もっ,もち\",\"伊\":\"い,かれ,これ,ただ,よし,いと,だ\",\"位\":\"い,くらい,ぐらい,ぞき\",\"依\":\"い,え,よ,より\",\"偉\":\"い,えら,ひで\",\"囲\":\"い,かこ\",\"夷\":\"い,えびす,えみし,ころ,たい,し\",\"委\":\"い,ゆだ,まかせ\",\"威\":\"い,おど,いさ,たけ,たけし\",\"尉\":\"い,じょう\",\"惟\":\"い,ゆい,おも,これ,ただ,よし,のぶ\",\"意\":\"い,もと,よし\",\"慰\":\"い,なぐさ\",\"易\":\"えき,い,やさ,やす\",\"椅\":\"い\",\"為\":\"い,ため,な,す,たり,つく,なり,びい\",\"畏\":\"い,おそ,かしこま,かしこ\",\"異\":\"い,こと,け\",\"移\":\"い,うつ\",\"維\":\"い,これ,たもつ,つぐ,ゆい,ゆき\",\"緯\":\"い,よこいと,ぬき\",\"胃\":\"い\",\"萎\":\"い,な,しお,しな,しぼ\",\"衣\":\"い,え,ころも,きぬ,ぎ\",\"謂\":\"い,いい,おも,いわゆる\",\"違\":\"い,ちが,たが\",\"遺\":\"い,ゆい,のこ\",\"医\":\"い,くすし\",\"井\":\"せい,しょう,い,いの,さい,ひ\",\"亥\":\"がい,かい,い,り\",\"域\":\"いき\",\"育\":\"いく,そだ,はぐく,やす\",\"郁\":\"いく,あや,かおる,い,か,ふみ,ゆう\",\"磯\":\"き,いそ,し,そ\",\"一\":\"いち,いつ,ひと,かず,い,いっ,いる,かつ,かづ,てん,はじめ,ひ,ひとつ,まこと\",\"壱\":\"いち,いつ,ひとつ,い,かず\",\"溢\":\"いつ,こぼ,あふ,み\",\"逸\":\"いつ,そ,はぐ,いっ,はや,へん\",\"稲\":\"とう,て,いね,いな,いの,しね,せ,な\",\"茨\":\"し,じ,いばら,かや,くさぶき,あし,えばら,ばら,まつ,まん\",\"芋\":\"う,いも\",\"鰯\":\"いわし\",\"允\":\"いん,じょう,まこと,ゆるす,のぶ,まさ,みつ,すけ,よし,ちか,とも\",\"印\":\"いん,しるし,じるし,しる\",\"咽\":\"いん,えん,えつ,むせ,のど,の\",\"員\":\"いん,いな,かず\",\"因\":\"いん,よ,ちな,て\",\"姻\":\"いん\",\"引\":\"いん,ひ,いな,ひき,ひけ,びき\",\"飲\":\"いん,おん,の\",\"淫\":\"いん,ひた,ほしいまま,みだ,みだり\",\"胤\":\"いん,たね,つぎ,つぐ,かず\",\"蔭\":\"いん,おん,かげ\",\"院\":\"いん\",\"陰\":\"いん,かげ\",\"隠\":\"いん,おん,かく,よ,お,がくし\",\"韻\":\"いん\",\"右\":\"う,ゆう,みぎ,あき,すけ\",\"宇\":\"う,いえ,たか,ひろ,ひろし\",\"烏\":\"う,お,からす,いずくんぞ,なんぞ\",\"羽\":\"う,は,わ,はね,しゅう,ば\",\"迂\":\"う\",\"雨\":\"う,あめ,あま,さめ\",\"卯\":\"ぼう,もう,う,あきら,しげる,い\",\"鵜\":\"てい,だい,う\",\"窺\":\"き,うかが,のぞく\",\"丑\":\"ちゅう,うし,ひろ\",\"碓\":\"かく,たい,たし,う,うす\",\"臼\":\"きゅう,ぐ,うす,うすづ\",\"渦\":\"か,うず\",\"唄\":\"ばい,うた\",\"姥\":\"ぼ,も,うば\",\"厩\":\"きゅう,うまや,まや,まら\",\"浦\":\"ほ,うら\",\"瓜\":\"か,け,うり,う\",\"閏\":\"じゅん,うるう\",\"噂\":\"そん,うわさ\",\"云\":\"うん,い,ここに\",\"運\":\"うん,はこ\",\"雲\":\"うん,くも,ぐも,き,ずも,のめ\",\"餌\":\"じ,に,え,えば,えさ,もち\",\"叡\":\"えい,あき\",\"営\":\"えい,いとな\",\"影\":\"えい,かげ\",\"映\":\"えい,うつ,は,ば,あきら,え,てる\",\"曳\":\"えい,ひ,ひき,びき\",\"栄\":\"えい,よう,さか,は,ば,え,さかえ,しげ,てる,なが,ひで,よし\",\"永\":\"えい,なが,え,と,のり,ひさ,ひさし\",\"泳\":\"えい,およ\",\"瑛\":\"えい,よう,あき,あきら,てる,え\",\"英\":\"えい,はなぶさ,あ,あい,え,すぐる,はな,ひ,ひで,よし,ら\",\"衛\":\"えい,え,もり,い,まもる\",\"詠\":\"えい,よ,うた,え,ええ\",\"鋭\":\"えい,するど,とし\",\"液\":\"えき\",\"疫\":\"えき,やく\",\"益\":\"えき,やく,ま,まし,ます\",\"駅\":\"えき\",\"悦\":\"えつ,よろこ,や,よし\",\"謁\":\"えつ\",\"越\":\"えつ,おつ,こ,ご,えち,えっ,お,こえ,こし,ごえ,ごし,ごや\",\"閲\":\"えつ,けみ\",\"榎\":\"か,えのき,え,えの\",\"円\":\"えん,まる,まど,まろ,つぶら,のぶ,まどか,みつ\",\"園\":\"えん,その,おん,ぞの\",\"堰\":\"えん,せき,せ\",\"奄\":\"えん,おお,たちまち,あま\",\"宴\":\"えん,うたげ,うた,やす\",\"延\":\"えん,の,たか,のぶ,のべ\",\"怨\":\"えん,おん,うん,うら,うらみ\",\"援\":\"えん\",\"沿\":\"えん,そ,ぞ\",\"演\":\"えん\",\"炎\":\"えん,ほのお,ぬく\",\"煙\":\"えん,けむ,けむり,たば\",\"燕\":\"えん,つばめ,つばくら,つばくろ\",\"猿\":\"えん,さる,さ,さわ,ざる,まし\",\"縁\":\"えん,ねん,ふち,ゆかり,よすが,へり,えにし\",\"艶\":\"えん,つや,なま,あで,もろ,よし\",\"苑\":\"えん,おん,その,う,あや\",\"薗\":\"えん,おん,その,ぞの\",\"遠\":\"えん,おん,とお,お,おに,ど,どお\",\"鉛\":\"えん,なまり\",\"塩\":\"えん,しお\",\"於\":\"お,よ,おい,ああ,より\",\"汚\":\"お,けが,よご,きたな\",\"甥\":\"せい,そう,しょう,おい,むこ\",\"凹\":\"おう,くぼ,へこ,ぼこ\",\"央\":\"おう,あきら,え,お,さと,ちか,てる,なか,ひさ,ひろ,や\",\"奥\":\"おう,おく,くま,お,おお,おん,つ,のく\",\"往\":\"おう,い,いにしえ,さき,ゆ,みち\",\"応\":\"おう,よう,のう,あた,まさに,こた,お,たか,まさ\",\"押\":\"おう,お,おさ,おし,おす,おや\",\"旺\":\"おう,さかん\",\"横\":\"おう,よこ\",\"欧\":\"おう,うた,は,おお,ひろ\",\"殴\":\"おう,なぐ\",\"王\":\"おう,のう,おお,おおきみ,わ\",\"翁\":\"おう,おきな,お,おな\",\"襖\":\"おう,ふすま,あお\",\"黄\":\"こう,おう,き,こ,うい,れい\",\"岡\":\"こう,おか\",\"沖\":\"ちゅう,おき,おきつ,わく\",\"荻\":\"てき,おぎ\",\"億\":\"おく,お\",\"屋\":\"おく,や,た\",\"憶\":\"おく\",\"臆\":\"おく,よく,むね,おくする\",\"桶\":\"よう,とう,おけ\",\"牡\":\"ぼ,ぼう,おす,お,おん\",\"乙\":\"おつ,いつ,おと,きのと\",\"俺\":\"えん,おれ,われ\",\"卸\":\"しゃ,おろ,おろし\",\"恩\":\"おん,めぐみ\",\"温\":\"おん,あたた,ぬく,あつ,あつし,なお,はる,ゆ,ゆたか\",\"穏\":\"おん,おだ\",\"音\":\"おん,いん,のん,おと,ね,お,と\",\"下\":\"か,げ,した,しも,もと,さ,くだ,お,さか,しと\",\"化\":\"か,け,ば,ふ\",\"仮\":\"か,け,かり\",\"何\":\"か,なに,なん,あが\",\"伽\":\"か,が,きゃ,ぎゃ,とぎ\",\"価\":\"か,け,あたい\",\"佳\":\"か,けい,よし\",\"加\":\"か,くわ\",\"可\":\"か,こく,べ,よし\",\"嘉\":\"か,よみ,よい,ひろ,よし,よしみ,かず,よ\",\"夏\":\"か,が,げ,なつ\",\"嫁\":\"か,よめ,とつ,い,ゆ\",\"家\":\"か,け,いえ,や,うち,あり,え,く,つか,べ\",\"寡\":\"か\",\"科\":\"か,しな\",\"暇\":\"か,ひま,いとま\",\"果\":\"か,は,はた,み\",\"架\":\"か\",\"歌\":\"か,うた\",\"河\":\"か,かわ,かっ,こ,こう\",\"火\":\"か,ひ,び,ほ\",\"珂\":\"か,が\",\"禍\":\"か,わざわい\",\"禾\":\"か,いね\",\"稼\":\"か,かせ\",\"箇\":\"か,こ\",\"花\":\"か,け,はな,わ\",\"苛\":\"か,いじ,さいな,いらだ,からい,こまかい\",\"茄\":\"か,な,なす\",\"荷\":\"か,に,はす,り\",\"華\":\"か,け,はな,わ\",\"菓\":\"か\",\"蝦\":\"か,げ,えび,えみ\",\"課\":\"か\",\"嘩\":\"か,け,かまびす\",\"貨\":\"か,たから\",\"迦\":\"か,け\",\"過\":\"か,す,あやま,よぎ,よ\",\"霞\":\"か,げ,かすみ,かす\",\"蚊\":\"ぶん,か\",\"俄\":\"が,にわか\",\"峨\":\"が,けわ\",\"我\":\"が,われ,わ,わが,あ,あが,か\",\"牙\":\"が,げ,きば,は\",\"画\":\"が,かく,え,かい,えが,かぎ,はかりごと,はか\",\"臥\":\"が,ふせ,ふ\",\"芽\":\"が,め,じ,めぐ\",\"賀\":\"が,か,のり,よし,より\",\"雅\":\"が,みや,う,お,か,ただし,のり,まさ,まさし,よし\",\"餓\":\"が,う\",\"駕\":\"か,が,かご,しのぐ,のる\",\"介\":\"かい,すけ,ゆき\",\"会\":\"かい,え,あ,あつ,あい,い\",\"解\":\"かい,げ,と,ほど,ほぐ,わか,さと,さとる,とけ\",\"回\":\"かい,え,まわ,もとお,か\",\"塊\":\"かい,け,かたまり,つちくれ\",\"壊\":\"かい,え,こわ,やぶ\",\"廻\":\"かい,え,まわ,もとお,めぐ,ざこ,じゃく\",\"快\":\"かい,こころよ,よし\",\"怪\":\"かい,け,あや\",\"悔\":\"かい,く,くや\",\"恢\":\"かい,け,ひろ\",\"懐\":\"かい,え,ふところ,なつ,なず,いだ,おも,かね\",\"戒\":\"かい,いまし\",\"拐\":\"かい\",\"改\":\"かい,あらた\",\"魁\":\"かい,さきがけ,かしら\",\"晦\":\"かい,つごもり,くら,みそか,もり\",\"械\":\"かい,かせ\",\"海\":\"かい,うみ,あ,あま,うな,うん,え,か,た,ひろ,ひろし,ぶ,まち,まま,み,め,わたる\",\"灰\":\"かい,はい\",\"界\":\"かい\",\"皆\":\"かい,みな,みんな,むな\",\"絵\":\"かい,え\",\"芥\":\"かい,け,からし,ごみ,あくた\",\"蟹\":\"かい,かに\",\"開\":\"かい,ひら,びら,あ,はる,か,ひらき\",\"階\":\"かい,きざはし,しな,と,はし\",\"貝\":\"ばい,かい\",\"凱\":\"がい,かい,かちどき,やわらぐ\",\"劾\":\"がい\",\"外\":\"がい,げ,そと,ほか,はず,と,うい,け,ふか\",\"害\":\"がい\",\"崖\":\"がい,げ,ぎ,がけ,きし,はて\",\"慨\":\"がい,なげ\",\"概\":\"がい,おおむ\",\"涯\":\"がい,はて\",\"蓋\":\"がい,かい,こう,ふた,けだ,おお,かさ,かこう\",\"街\":\"がい,かい,まち,また\",\"該\":\"がい\",\"鎧\":\"かい,がい,よろ,よろい\",\"骸\":\"がい,かい,むくろ\",\"浬\":\"り,かいり,のっと\",\"馨\":\"けい,きょう,かお,かおり,か,かおる,きよ,よし,かほる\",\"垣\":\"えん,かき,がい\",\"柿\":\"し,かき\",\"嚇\":\"かく,おど\",\"各\":\"かく,おのおの,かか,かが\",\"拡\":\"かく,こう,ひろ\",\"格\":\"かく,こう,きゃく,ごう,いたる,のり\",\"核\":\"かく\",\"殻\":\"かく,こく,ばい,から,がら\",\"獲\":\"かく,え\",\"確\":\"かく,こう,たし\",\"穫\":\"かく\",\"覚\":\"かく,おぼ,さ,さと\",\"角\":\"かく,かど,つの,い,す,すみ,ずみ,ふさ\",\"較\":\"かく,こう,くら\",\"郭\":\"かく,くるわ,ひろ\",\"閣\":\"かく\",\"隔\":\"かく,へだ\",\"革\":\"かく,かわ\",\"学\":\"がく,まな,たか,のり\",\"岳\":\"がく,たけ,おか,たか,たけん\",\"楽\":\"がく,らく,ごう,たの,この,さ,た,やす,ら\",\"額\":\"がく,ひたい,ぬか\",\"顎\":\"がく,あご,あぎと\",\"掛\":\"かい,けい,か,が,かかり,がかり,かけ\",\"笠\":\"りゅう,かさ\",\"樫\":\"かし\",\"梶\":\"び,かじ,こずえ\",\"潟\":\"せき,かた,がた,がら\",\"割\":\"かつ,わ,わり,さ\",\"喝\":\"かつ\",\"恰\":\"こう,かっ,ちょう,きょう,あたか\",\"括\":\"かつ,くく\",\"活\":\"かつ,い\",\"渇\":\"かつ,かわ\",\"滑\":\"かつ,こつ,すべ,なめ,かり,なめり\",\"葛\":\"かつ,かち,つづら,くず,か,かず,かずら,かっ,かつら\",\"褐\":\"かつ\",\"轄\":\"かつ,くさび\",\"且\":\"しょ,そ,しょう,か,あき,かつ\",\"叶\":\"きょう,かな,かの,かのう\",\"椛\":\"かば,もみじ\",\"樺\":\"か,かば,かんば,から,かも,かん\",\"鞄\":\"はく,ほう,びょう,かばん\",\"株\":\"しゅ,かぶ\",\"兜\":\"とう,と,かぶと\",\"蒲\":\"ほ,ぼ,ふ,ぶ,がま,かば,かま\",\"釜\":\"ふ,かま\",\"鎌\":\"れん,けん,かま,かた,かね\",\"鴨\":\"おう,かも,あひる\",\"茅\":\"ぼう,みょう,かや,ちがや,ち,じ\",\"萱\":\"けん,かや,かんぞう,か\",\"粥\":\"いく,しゅく,じゅく,かゆ,かい,ひさ\",\"刈\":\"がい,かい,か,かっ,かり\",\"瓦\":\"が,かわら,ぐらむ\",\"乾\":\"かん,けん,かわ,ほ,ひ,いぬい\",\"侃\":\"かん,つよ,あきら,ただし\",\"冠\":\"かん,かんむり,か,かっぷ,まさる\",\"寒\":\"かん,さむ,さ,さん\",\"刊\":\"かん\",\"勘\":\"かん,か,さとる\",\"勧\":\"かん,けん,すす\",\"巻\":\"かん,けん,ま,まき\",\"喚\":\"かん,わめ\",\"堪\":\"かん,たん,た,たま,こら,こた\",\"完\":\"かん\",\"官\":\"かん\",\"寛\":\"かん,くつろ,ひろ,ゆる,とも,のぶ,のり,ひろし,ひろん,ゆた,ゆたか\",\"干\":\"かん,ほ,ぼ,ひ,ほし\",\"幹\":\"かん,みき,つよし,まさ,もと,えだ,き,くる,たかし,つね,とも,み,もとき,よし,より\",\"患\":\"かん,わずら,くろ\",\"感\":\"かん\",\"慣\":\"かん,な\",\"憾\":\"かん,うら\",\"換\":\"かん,か\",\"敢\":\"かん,あ\",\"柑\":\"こん,かん\",\"棺\":\"かん\",\"款\":\"かん,まさ\",\"歓\":\"かん,よろこ,ぶ\",\"汗\":\"かん,あせ\",\"漢\":\"かん,はん\",\"環\":\"かん,わ,たま,たまき\",\"甘\":\"かん,あま,うま,かも\",\"監\":\"かん,けん\",\"看\":\"かん,み\",\"竿\":\"かん,さお\",\"管\":\"かん,くだ,すが\",\"簡\":\"かん,けん,えら,ふだ\",\"緩\":\"かん,ゆる,ひろ\",\"缶\":\"かん,かま,ふ,べ\",\"肝\":\"かん,きも\",\"艦\":\"かん\",\"莞\":\"かん,い\",\"観\":\"かん,み,しめ\",\"貫\":\"かん,つらぬ,ぬ,ぬき,つら,ぬく\",\"還\":\"かん,かえ\",\"鑑\":\"かん,かんが,かがみ,あき,あきら\",\"間\":\"かん,けん,あいだ,ま,あい,ちか,は,はざ,はし\",\"閑\":\"かん,が,より\",\"関\":\"かん,せき,ぜき,かか,からくり,かんぬき\",\"陥\":\"かん,おちい,おとしい\",\"韓\":\"かん,から,いげた\",\"館\":\"かん,やかた,たて,たち\",\"丸\":\"がん,まる,ま,わ,わに\",\"含\":\"がん,ふく\",\"岸\":\"がん,きし,けし\",\"巌\":\"がん,いわ,いわお,けわ,よし\",\"玩\":\"がん,もちあそ,もてあそ\",\"眼\":\"がん,げん,まなこ,め\",\"岩\":\"がん,いわ\",\"雁\":\"がん,かり,かりがね\",\"頑\":\"がん,かたく\",\"顔\":\"がん,かお\",\"願\":\"がん,ねが,ねがい,ら\",\"企\":\"き,くわだ,たくら\",\"伎\":\"ぎ,き,わざ,わざおぎ\",\"危\":\"き,あぶ,あや\",\"喜\":\"き,よろこ,あき,きゅ,のぶ,ゆき,よし\",\"器\":\"き,うつわ\",\"基\":\"き,もと,もとい,きい,とも\",\"奇\":\"き,く,あや,くし,めずら\",\"嬉\":\"き,うれ,たの,うらし,うれし\",\"寄\":\"き,よ,よせ,より,よろ\",\"岐\":\"き,ぎ,たかし,また\",\"希\":\"き,け,まれ,こいねが,のぞ,のぞみ\",\"幾\":\"き,いく,い,く\",\"忌\":\"き,い,いまわ\",\"揮\":\"き,ふる\",\"机\":\"き,つくえ\",\"旗\":\"き,はた\",\"既\":\"き,すで\",\"期\":\"き,ご\",\"棋\":\"き,ご\",\"棄\":\"き,す\",\"機\":\"き,はた\",\"帰\":\"き,かえ,おく,とつ\",\"毅\":\"き,ぎ,つよ,つよし,こわし,たけし,たけ,はたす,あつし,とし,み\",\"気\":\"き,け,いき\",\"汽\":\"き\",\"畿\":\"き,みやこ\",\"祈\":\"き,いの,のり,れい\",\"季\":\"き,すえ,とし\",\"稀\":\"き,け,まれ,まばら\",\"紀\":\"き,おさむ,ただす,とし,とも,のり,もと\",\"徽\":\"き,しるし\",\"規\":\"き,すのり,ただし,のり,み\",\"記\":\"き,しる,のり\",\"貴\":\"き,たっと,とうと,きよ,ぎ,たか,たかし,よし\",\"起\":\"き,お,おこ,た\",\"軌\":\"き\",\"輝\":\"き,かがや,あき,あきら,さき,てる,ひ,ひかる\",\"飢\":\"き,う\",\"騎\":\"き\",\"鬼\":\"き,おに\",\"亀\":\"き,きゅう,きん,かめ,ひさ,ひさし\",\"偽\":\"ぎ,か,いつわ,にせ\",\"儀\":\"ぎ,のり,よし\",\"宜\":\"ぎ,よろ,き,たか,のぶ,のり,よし\",\"戯\":\"ぎ,げ,たわむ,ざ,じゃ\",\"技\":\"ぎ,わざ\",\"擬\":\"ぎ,まが,もど\",\"欺\":\"ぎ,あざむ\",\"犠\":\"ぎ,き,いけにえ\",\"疑\":\"ぎ,うたが\",\"祇\":\"ぎ,き,し,くにつかみ,ただ,まさに\",\"義\":\"ぎ,ただし,ちか,のり,よし\",\"誼\":\"ぎ,よしみ,よい\",\"議\":\"ぎ,かた,のり\",\"掬\":\"きく,こく,むす,すく,たなごころ\",\"菊\":\"きく\",\"鞠\":\"きく,きゅう,まり,まい\",\"吉\":\"きち,きつ,よし,え,き,きっ,きる,こし,と,よ\",\"喫\":\"きつ,の\",\"桔\":\"きつ,けつ,き\",\"橘\":\"きつ,たちばな,きっ\",\"詰\":\"きつ,きち,つ,づ,ずめ,づめ\",\"砧\":\"ちん,きぬた\",\"杵\":\"しょ,そ,きね,き\",\"却\":\"きゃく,かえ,しりぞ\",\"客\":\"きゃく,かく\",\"脚\":\"きゃく,きゃ,かく,あし,し\",\"虐\":\"ぎゃく,しいた\",\"逆\":\"ぎゃく,げき,さか\",\"丘\":\"きゅう,おか,たかし\",\"久\":\"きゅう,く,ひさ,きゅ,わ,なが,ひさし\",\"休\":\"きゅう,やす\",\"及\":\"きゅう,およ,および,おい,の\",\"吸\":\"きゅう,す\",\"宮\":\"きゅう,ぐう,く,くう,みや,ぐ,み\",\"弓\":\"きゅう,ゆみ,こ,ゆ\",\"急\":\"きゅう,いそ,せ\",\"救\":\"きゅう,すく\",\"朽\":\"きゅう,く,くつ\",\"求\":\"きゅう,ぐ,もと\",\"汲\":\"きゅう,く,くみ\",\"泣\":\"きゅう,な\",\"灸\":\"きゅう,く,やいと\",\"球\":\"きゅう,たま,く\",\"究\":\"きゅう,く,きわ,きゅ\",\"窮\":\"きゅう,きょう,きわ\",\"笈\":\"きゅう,おい\",\"級\":\"きゅう,しな\",\"糾\":\"きゅう,ただ\",\"給\":\"きゅう,たま,たも,きい\",\"旧\":\"きゅう,ふる,もと\",\"牛\":\"ぎゅう,うし,うじ,ご\",\"去\":\"きょ,こ,さ,い\",\"居\":\"きょ,こ,い,お,おき,ぐ,すえ\",\"巨\":\"きょ,おお,か,こ,なお\",\"拒\":\"きょ,ご,こば\",\"拠\":\"きょ,こ,よ\",\"挙\":\"きょ,あ,こぞ,たか\",\"虚\":\"きょ,こ,むな,うつ\",\"許\":\"きょ,ゆる,もと\",\"距\":\"きょ,へだ,けづめ\",\"鋸\":\"きょ,こ,のこ,のこぎり\",\"漁\":\"ぎょ,りょう,あさ\",\"魚\":\"ぎょ,うお,さかな,ざかな,い\",\"亨\":\"こう,きょう,ほう,とお,とうる,みち,ゆき,あきら,なが,あき,とおる,とおるふ\",\"享\":\"きょう,こう,う,たか,たかし,とおる,みち\",\"京\":\"きょう,けい,きん,みやこ,たか\",\"供\":\"きょう,く,くう,ぐ,そな,とも,ども\",\"競\":\"きょう,けい,きそ,せ,くら,かい,わたなべ\",\"共\":\"きょう,とも,ども\",\"凶\":\"きょう\",\"協\":\"きょう\",\"匡\":\"きょう,おう,すく,ただ,ただし,まさ,まさし,きよ,ひと,やす\",\"卿\":\"けい,きょう,きみ\",\"叫\":\"きょう,さけ\",\"喬\":\"きょう,たか,たかし\",\"境\":\"きょう,けい,さかい,さか,じき\",\"峡\":\"きょう,こう,はざま,き,ば\",\"強\":\"きょう,ごう,つよ,し,こわ,すね\",\"恐\":\"きょう,おそ,こわ\",\"恭\":\"きょう,うやうや,きよ,やす,やすし,ゆき,よし\",\"挟\":\"きょう,しょう,はさ,わきばさ,さしはさ\",\"教\":\"きょう,おし,おそ,のり,ひさ\",\"橋\":\"きょう,はし,ばせ\",\"況\":\"きょう,まし,いわ,おもむき\",\"狂\":\"きょう,くる,くるお\",\"狭\":\"きょう,こう,せま,せば,さ,はざ\",\"矯\":\"きょう,た\",\"胸\":\"きょう,むね,むな\",\"脅\":\"きょう,おびや,おど\",\"興\":\"こう,きょう,おこ,おき,おこっ,とも\",\"蕎\":\"きょう,そば\",\"郷\":\"きょう,ごう,さと,くに\",\"鏡\":\"きょう,けい,かがみ,あき,かが,かがん\",\"響\":\"きょう,ひび\",\"饗\":\"きょう,う,もてな,あい,あえ\",\"驚\":\"きょう,おどろ\",\"仰\":\"ぎょう,こう,あお,おお,お,おっしゃ\",\"凝\":\"ぎょう,こ,こご\",\"尭\":\"ぎょう,たか,たかし,のり,あき\",\"暁\":\"ぎょう,きょう,あかつき,さと,あき,あきら,あけ,さとる,てる\",\"業\":\"ぎょう,ごう,わざ,なり,のぶ\",\"局\":\"きょく,つぼね\",\"曲\":\"きょく,ま,くま,まがた\",\"極\":\"きょく,ごく,きわ,き,ぎ\",\"玉\":\"ぎょく,たま,だま,おう,だん\",\"桐\":\"とう,どう,きり,ひさ,き\",\"僅\":\"きん,ごん,わず\",\"勤\":\"きん,ごん,つと,づと,いそ\",\"均\":\"きん,なら,ひとし\",\"巾\":\"きん,ふく,おお,ちきり,きれ\",\"錦\":\"きん,にしき,かね,あや,にし\",\"斤\":\"きん\",\"欣\":\"きん,ごん,こん,よろこ,やすし,よし,し\",\"欽\":\"きん,こん,つつし,よし,ひとし\",\"琴\":\"きん,ごん,こと\",\"禁\":\"きん\",\"禽\":\"きん,とり,とりこ\",\"筋\":\"きん,すじ\",\"緊\":\"きん,し\",\"芹\":\"きん,せり,せい,よし\",\"菌\":\"きん\",\"衿\":\"きん,こん,えり\",\"襟\":\"きん,えり\",\"謹\":\"きん,つつし\",\"近\":\"きん,こん,ちか,おう,おお,この\",\"金\":\"きん,こん,ごん,かね,かな,がね,かん,きむ,こ,この,ん\",\"吟\":\"ぎん\",\"銀\":\"ぎん,しろがね,うん,かな,かね\",\"九\":\"きゅう,く,ここの,いちじく,いちのく,この,ひさし\",\"句\":\"く,すく\",\"区\":\"く,おう,こう\",\"玖\":\"きゅう,く,たま,き,ひさ\",\"矩\":\"く,かね,かねざし,さしがね,のり,つね,ただし\",\"苦\":\"く,くる,ぐる,にが\",\"駆\":\"く,か\",\"駈\":\"く,か\",\"駒\":\"く,こま\",\"具\":\"ぐ,そな,つぶさ,とも\",\"愚\":\"ぐ,おろ\",\"虞\":\"ぐ,おそれ,おもんぱか,はか,うれ,あざむ,あやま,のぞ,たの,すけ,もち,やす\",\"喰\":\"く,じき\",\"空\":\"くう,そら,あ,から,す,むな,うつ,き,く\",\"偶\":\"ぐう,たま\",\"寓\":\"ぐう,ぐ,どう,かこつ,よ,かりずまい\",\"遇\":\"ぐう,あ\",\"隅\":\"ぐう,すみ\",\"串\":\"かん,けん,せん,くし,つらぬ\",\"櫛\":\"しつ,くし,くしけず\",\"釧\":\"せん,くしろ,うでわ,くし\",\"屑\":\"せつ,くず,いさぎよ\",\"屈\":\"くつ,かが,くっ\",\"掘\":\"くつ,ほ,ぼり\",\"窟\":\"くつ,こつ,いわや,いはや,あな\",\"沓\":\"とう,くつ\",\"靴\":\"か,くつ\",\"窪\":\"わ,あ,くぼ\",\"熊\":\"ゆう,くま\",\"隈\":\"わい,え,くま,すみ\",\"栗\":\"りつ,り,くり,おののく,くる,りっ\",\"繰\":\"そう,く,くり\",\"桑\":\"そう,くわ,こ\",\"鍬\":\"しょう,しゅう,くわ,すき\",\"勲\":\"くん,いさお,いさむ\",\"君\":\"くん,きみ,ぎみ,み\",\"薫\":\"くん,かお,かおり,かおる,かほ,かほる,くに,しげ,にほ,のぶ,よし\",\"訓\":\"くん,きん,おし,よ,く,くに,くの,さとし,のり,ふみ\",\"群\":\"ぐん,む,むら,ぐり,ぐ,こお,こおり,ごうり\",\"軍\":\"ぐん,いくさ\",\"郡\":\"ぐん,こおり\",\"袈\":\"け,か\",\"祁\":\"き,け\",\"係\":\"けい,かか,かかり,がかり\",\"傾\":\"けい,かたむ,かたぶ,かた,かし\",\"刑\":\"けい,おさか,ぎょう\",\"兄\":\"けい,きょう,あに,え,せ,よし\",\"啓\":\"けい,ひら,さと,あき,あきら,さとし,はじめ,ひろ,よし\",\"圭\":\"けい,け,か,きよ,たま,よし,かど,きよし\",\"型\":\"けい,かた,がた\",\"契\":\"けい,ちぎ\",\"形\":\"けい,ぎょう,かた,がた,かたち,なり,ち\",\"径\":\"けい,みち,こみち,さしわたし,ただちに\",\"恵\":\"けい,え,めぐ,あや,け,さと,さとし,しげ,へい,み,やす\",\"慶\":\"けい,よろこ,き,きよん,け,みち,む,やす,よし\",\"慧\":\"けい,え,さとい,さと,さとし,さとる,あきら,とし\",\"憩\":\"けい,いこ\",\"掲\":\"けい,かか\",\"携\":\"けい,たずさ\",\"敬\":\"けい,きょう,うやま,け,たか,たかし,たけ,とし,のり,ひろ,ゆき,よし\",\"景\":\"けい,かげ\",\"桂\":\"けい,かつら,かつ,よし,か\",\"渓\":\"けい,たに,たにがわ\",\"稽\":\"けい,かんが,とど\",\"系\":\"けい\",\"経\":\"けい,きょう,きん,へ,た,たていと,はか,のり,つね,のぶ\",\"継\":\"けい,つ,まま\",\"茎\":\"けい,きょう,くき\",\"蛍\":\"けい,ほたる\",\"計\":\"けい,はか,え,かず,け\",\"詣\":\"けい,げい,まい,いた,もう\",\"警\":\"けい,いまし\",\"軽\":\"けい,きょう,きん,かる,かろ\",\"鶏\":\"けい,にわとり,とり\",\"芸\":\"げい,うん,う,のり,わざ,き,げ,なり\",\"迎\":\"げい,むか,むかえ\",\"鯨\":\"げい,くじら\",\"劇\":\"げき\",\"戟\":\"げき,ほこ\",\"撃\":\"げき,う\",\"激\":\"げき,はげ\",\"隙\":\"げき,きゃく,けき,すき,す,ひま\",\"桁\":\"こう,けた\",\"傑\":\"けつ,すぐ,たけ,まさ\",\"欠\":\"けつ,けん,か\",\"決\":\"けつ,き,ぎ,さ\",\"潔\":\"けつ,いさぎよ,きよ,きよし\",\"穴\":\"けつ,あな,けな,しし,な\",\"結\":\"けつ,けち,むす,ゆ,ゆい,ゆう\",\"血\":\"けつ,ち\",\"訣\":\"けつ,わかれ\",\"月\":\"げつ,がつ,つき,おと,がっ,す,ずき,もり\",\"件\":\"けん,くだん\",\"倹\":\"けん,つま,つづまやか\",\"倦\":\"けん,あき,あぐ,う,つか\",\"健\":\"けん,すこ,かつ,たけ,たけし,たて,とし,やす,やすし\",\"兼\":\"けん,か,かね\",\"券\":\"けん\",\"剣\":\"けん,つるぎ\",\"喧\":\"けん,やかま,かまびす\",\"圏\":\"けん,かこ\",\"堅\":\"けん,かた,がた,きん\",\"嫌\":\"けん,げん,きら,いや\",\"建\":\"けん,こん,た,だ,たけ,たつ,たて\",\"憲\":\"けん,かず,のり,よし\",\"懸\":\"けん,け,か\",\"拳\":\"けん,げん,こぶし\",\"捲\":\"けん,ま,まく,めく\",\"検\":\"けん,しら\",\"権\":\"けん,ごん,おもり,かり,はか\",\"牽\":\"けん,ひ\",\"犬\":\"けん,いぬ\",\"献\":\"けん,こん,たてまつ\",\"研\":\"けん,と,のり\",\"硯\":\"けん,げん,すずり\",\"絹\":\"けん,きぬ\",\"県\":\"けん,か,あがた,がた\",\"肩\":\"けん,かた\",\"見\":\"けん,み\",\"謙\":\"けん,へりくだ,かね,ゆずる\",\"賢\":\"けん,かしこ,かた,さか,さと,さとし,たか,たて,のり,まこと,まさ,まさる\",\"軒\":\"けん,のき\",\"遣\":\"けん,つか,づか,や\",\"鍵\":\"けん,かぎ\",\"険\":\"けん,けわ\",\"顕\":\"けん,あきらか,あらわ,あき,あきら\",\"験\":\"けん,げん,あかし,しるし,ため,ためし\",\"元\":\"げん,がん,もと,ちか,はじめ,はる,ゆき,よし\",\"原\":\"げん,はら,た,ばる,ら,わた,わら\",\"厳\":\"げん,ごん,おごそ,きび,いか,いつくし,いつ,いづ,きゅうら,とし\",\"幻\":\"げん,まぼろし\",\"弦\":\"げん,つる\",\"減\":\"げん,へ\",\"源\":\"げん,みなもと,はら,みな,もと\",\"玄\":\"げん,くろ,けん,はる,はるか\",\"現\":\"げん,あらわ,うつつ,うつ,あきら,きら\",\"絃\":\"げん,いと\",\"舷\":\"げん,ふなばた,ふなべり\",\"言\":\"げん,ごん,い,こと,とき\",\"諺\":\"げん,ことわざ\",\"限\":\"げん,かぎ\",\"乎\":\"こ,お,か,ああ,かな,や,よ,を\",\"個\":\"こ,か\",\"古\":\"こ,ふる,ふゆ\",\"呼\":\"こ,よ,よぶ\",\"固\":\"こ,かた\",\"孤\":\"こ\",\"己\":\"こ,き,おのれ,つちのと,な,し,み\",\"庫\":\"こ,く,くら\",\"弧\":\"こ\",\"戸\":\"こ,と,え,へ\",\"故\":\"こ,ゆえ,ふる,もと\",\"枯\":\"こ,か\",\"湖\":\"こ,みずうみ,うみ,み\",\"糊\":\"こ,ご,こつ,のり\",\"袴\":\"こ,く,はかま,ずぼん\",\"股\":\"こ,また,もも\",\"胡\":\"う,こ,ご,なんぞ,えびす,くる\",\"虎\":\"こ,とら,たけ\",\"誇\":\"こ,ほこ\",\"跨\":\"こ,か,また,またが\",\"雇\":\"こ,やと\",\"顧\":\"こ,かえり,たか,み\",\"鼓\":\"こ,つづみ\",\"五\":\"ご,いつ,い,さ,さつ,ち,ふ,み,め\",\"互\":\"ご,たが,かたみ\",\"伍\":\"ご,いつつ,くみ,あつむ\",\"午\":\"ご,うま\",\"呉\":\"ご,く,くれ,ぐ\",\"吾\":\"ご,われ,わが,あ,あが\",\"娯\":\"ご\",\"後\":\"ご,こう,のち,うし,うしろ,あと,おく,こし,し,しい,しり\",\"御\":\"ぎょ,ご,おん,お,み,う\",\"悟\":\"ご,さと\",\"梧\":\"ご,あおぎり\",\"檎\":\"きん,ごん,ご\",\"瑚\":\"こ,ご\",\"碁\":\"ご\",\"語\":\"ご,かた\",\"誤\":\"ご,あやま\",\"護\":\"ご,まも,もり\",\"醐\":\"ご,こ\",\"乞\":\"こつ,きつ,き,きけ,こち,こ\",\"鯉\":\"り,こい\",\"交\":\"こう,まじ,ま,か,かわ,こもごも,かた\",\"侯\":\"こう\",\"候\":\"こう,そうろう\",\"倖\":\"こう,しあわ,さいわ\",\"光\":\"こう,ひか,ひかり,あき,あきら,こお,てる,ひこ,み,みつ\",\"公\":\"こう,く,おおやけ,あきら,き,きみ,きん,たか,ただし,とも,ひろ,まさ\",\"功\":\"こう,く,いさお,いさ,かつ,くぬ,ぐう,こと,つとむ,とし,のり,よし\",\"効\":\"こう,き,ききめ,なら\",\"勾\":\"こう,く,かぎ,ま,まがり\",\"厚\":\"こう,あつ,あか,あ,あっ\",\"口\":\"こう,く,くち\",\"向\":\"こう,む,むこ,むか,こお,た,な,むかい,むこう\",\"后\":\"こう,ご,きさき\",\"喉\":\"こう,のど\",\"坑\":\"こう\",\"好\":\"こう,この,す,よ,い,こ,たか,とし,よし\",\"孔\":\"こう,く,あな,のり\",\"孝\":\"こう,きょう,たか,たかし,のり,よし\",\"宏\":\"こう,ひろ,あつ,ひろし\",\"工\":\"こう,く,ぐ,もく\",\"巧\":\"こう,たく,うま,かつ,たくみ,よし\",\"巷\":\"こう,ちまた\",\"幸\":\"こう,さいわ,さち,しあわ,こ,さき,さし,さっ,とも,ひろ,みゆき,ゆ,ゆき,よし\",\"広\":\"こう,ひろ\",\"庚\":\"こう,かのえ\",\"康\":\"こう,かん,こ,みち,やす,やすし\",\"弘\":\"こう,ぐ,ひろ,ひろし,ひろむ,みつ,お,こお\",\"恒\":\"こう,つね,つねに,のぶ,ひさ,ひさし\",\"慌\":\"こう,あわ\",\"抗\":\"こう,あらが\",\"拘\":\"こう,かか\",\"控\":\"こう,ひか\",\"攻\":\"こう,せ,おさむ\",\"昂\":\"こう,ごう,あ,たか,あき,あきら,たかし,のぼる\",\"晃\":\"こう,あきらか,あき,あきら,てる,ひかる,みつ\",\"更\":\"こう,さら,ふ\",\"杭\":\"こう,くい,わたる\",\"校\":\"こう,きょう,めん\",\"梗\":\"こう,きょう,ふさぐ,やまにれ,おおむね\",\"構\":\"こう,かま,とち\",\"江\":\"こう,え,くん,とうみ,み,りえ\",\"洪\":\"こう,ほん\",\"浩\":\"こう,おおき,ひろ,ひろし,ゆたか,こお\",\"港\":\"こう,みなと\",\"溝\":\"こう,みぞ,どぶ\",\"甲\":\"こう,かん,きのえ,かぶと,き,まさ,まさる\",\"皇\":\"こう,おう,おうじ,おお,み\",\"硬\":\"こう,かた\",\"稿\":\"こう,わら,したがき\",\"紅\":\"こう,く,べに,くれない,あか,くれ,もみ\",\"紘\":\"こう,おおづな,つな,つなぐ,ひろ,ひろし\",\"絞\":\"こう,しぼ,し\",\"綱\":\"こう,つな\",\"耕\":\"こう,たがや,こお\",\"考\":\"こう,かんが,たか\",\"肯\":\"こう,がえんじ\",\"腔\":\"こう\",\"膏\":\"こう,あぶら\",\"航\":\"こう,わたる\",\"荒\":\"こう,あ,あら,すさ,ら\",\"行\":\"こう,ぎょう,あん,い,ゆ,ゆき,いき,おこな,おこ,いく,なみ,なめ,みち,ゆく\",\"衡\":\"こう,ひら\",\"講\":\"こう\",\"貢\":\"こう,く,みつ\",\"購\":\"こう\",\"郊\":\"こう\",\"酵\":\"こう\",\"鉱\":\"こう,あらがね\",\"鋼\":\"こう,はがね\",\"閤\":\"こう,くぐりど\",\"降\":\"こう,ご,お,ふ,くだ,ふり,ふる\",\"項\":\"こう,うなじ\",\"香\":\"こう,きょう,か,かお,こ,こお,ひゃん,よし\",\"高\":\"こう,たか,だか,か,こ,じょい,た,はか\",\"鴻\":\"こう,ごう,おおとり,ひしくい,おおがり\",\"剛\":\"ごう,かた,こう,ご,たか,たけ,たけし,つよ,つよし,ひさ,まさ,よし\",\"劫\":\"こう,ごう,きょう,おびや\",\"号\":\"ごう,さけ,よびな\",\"合\":\"ごう,がっ,かっ,あ,あい,あう,あん,い,か,こう,ごお,に,ね,や,わい\",\"壕\":\"こう,ごう,ほり\",\"拷\":\"ごう\",\"豪\":\"ごう,えら,こう,ご,すぐる,たけ,たけし,ひで,まさる\",\"轟\":\"ごう,こう,とどろ\",\"克\":\"こく,か,かつ,まさる,よし\",\"刻\":\"こく,きざ\",\"告\":\"こく,つ,い\",\"国\":\"こく,くに,くな,こ\",\"穀\":\"こく,たけ\",\"酷\":\"こく,ひど\",\"黒\":\"こく,くろ\",\"獄\":\"ごく\",\"腰\":\"よう,こし,うすぐ\",\"忽\":\"こつ,たちま,ゆるが,ぬ\",\"惚\":\"こつ,ほけ,ぼ,ほ\",\"骨\":\"こつ,ほね\",\"込\":\"こ,こみ,ごめ\",\"此\":\"し,これ,この,ここ\",\"頃\":\"けい,きょう,ころ,ごろ,しばら,ころも\",\"今\":\"こん,きん,いま,な\",\"困\":\"こん,こま\",\"墾\":\"こん,は,ひら\",\"婚\":\"こん\",\"恨\":\"こん,うら\",\"懇\":\"こん,ねんご\",\"昏\":\"こん,くら,くれ\",\"昆\":\"こん\",\"根\":\"こん,ね\",\"混\":\"こん,ま,こ\",\"痕\":\"こん,あと\",\"紺\":\"こん\",\"魂\":\"こん,たましい,たま\",\"些\":\"さ,しゃ,ち,いささか\",\"佐\":\"さ,すけ\",\"叉\":\"さ,しゃ,さい,また\",\"唆\":\"さ,そそ,そそのか\",\"嵯\":\"さ,し\",\"左\":\"さ,しゃ,ひだり,そ\",\"差\":\"さ\",\"査\":\"さ\",\"沙\":\"さ,しゃ,すな,よなげる\",\"瑳\":\"さ,みが\",\"砂\":\"さ,しゃ,すな,いさ,ご\",\"詐\":\"さ,いつわ\",\"鎖\":\"さ,くさり,とざ\",\"裟\":\"さ,しゃ\",\"坐\":\"ざ,さ,すわ,おわす,そぞろに,まします\",\"座\":\"ざ,すわ\",\"挫\":\"ざ,さ,くじ\",\"債\":\"さい\",\"催\":\"さい,もよう,もよお\",\"再\":\"さい,さ,ふたた,ふた\",\"最\":\"さい,しゅ,もっと,つま,も\",\"哉\":\"さい,かな,や,か,すけ,とし,ちか,はじめ\",\"塞\":\"そく,さい,ふさ,とりで,み\",\"妻\":\"さい,つま,ずま,め\",\"宰\":\"さい,ただ\",\"彩\":\"さい,いろど,あや,さ,さえ,つや\",\"才\":\"さい\",\"採\":\"さい,と\",\"栽\":\"さい\",\"歳\":\"さい,せい,とし,とせ,よわい\",\"済\":\"さい,せい,す,ず,ずみ,すく,な,わたし,わた,すむ,なり,わたる\",\"災\":\"さい,わざわ\",\"采\":\"さい,と,いろどり\",\"犀\":\"さい,せい\",\"砕\":\"さい,くだ\",\"砦\":\"さい,とりで\",\"祭\":\"さい,まつ,まつり\",\"斎\":\"さい,とき,つつし,ものいみ,い,いわ,いつ,いつき,さえ,ひとし,きよ,ただ,よし\",\"細\":\"さい,ほそ,こま\",\"菜\":\"さい,な,よう\",\"裁\":\"さい,た,さば\",\"載\":\"さい,の,とし,のり\",\"際\":\"さい,きわ,ぎわ,わ\",\"剤\":\"ざい,すい,せい,かる,けず\",\"在\":\"ざい,あ,あり\",\"材\":\"ざい,き,さい\",\"罪\":\"ざい,つみ\",\"財\":\"ざい,さい,ぞく,たから\",\"冴\":\"ご,こ,さ,こお,ひ,さえ,さえる\",\"坂\":\"はん,さか,か,ざ\",\"阪\":\"はん,さか\",\"堺\":\"かい,さかい\",\"榊\":\"さかき\",\"肴\":\"こう,さかな\",\"咲\":\"しょう,さ,ざき,さき\",\"崎\":\"き,さき,さい,みさき\",\"埼\":\"き,さき,さい,みさき\",\"鷺\":\"ろ,さぎ\",\"作\":\"さく,さ,つく,づく,くり,さか,さっ,づくり,とも,なお,はぎ,まさか\",\"削\":\"さく,けず,はつ,そ,げ\",\"搾\":\"さく,しぼ\",\"昨\":\"さく\",\"朔\":\"さく,ついたち,たち\",\"柵\":\"さく,さん,しがら,しがらみ,とりで,やらい,ませ,やな\",\"窄\":\"さく,すぼ,つぼ,せま\",\"策\":\"さく\",\"索\":\"さく\",\"錯\":\"さく,しゃく\",\"桜\":\"おう,よう,さくら,さ,ろう\",\"笹\":\"ささ,さ,さき,しの,じね\",\"冊\":\"さつ,さく,ふみ\",\"刷\":\"さつ,す,ず,ずり,は\",\"察\":\"さつ\",\"拶\":\"さつ,せま\",\"撮\":\"さつ,と,つま,ど\",\"擦\":\"さつ,す,ず,こす\",\"札\":\"さつ,ふだ,さっ\",\"殺\":\"さつ,さい,せつ,ころ,ごろ,そ,あや\",\"薩\":\"さつ,さち,さっ\",\"雑\":\"ざつ,ぞう,まじ\",\"皐\":\"こう,さつき,たかし\",\"錆\":\"しょう,せい,さび,くわ\",\"皿\":\"べい,さら\",\"晒\":\"さい,し,さら,さらし\",\"三\":\"さん,ぞう,み,みっ,か,さ,さい,さえ,さぶ,ざ,ざえ,ざぶ,そう,ぞ,ただ,みつ,みん,も,や\",\"傘\":\"さん,かさ\",\"参\":\"さん,しん,まい,まじわる,みつ,み\",\"山\":\"さん,せん,やま,さ,やの,やん\",\"惨\":\"さん,ざん,みじ,いた,むご\",\"撒\":\"さん,さつ,ま\",\"散\":\"さん,ち,ばら,ちる\",\"桟\":\"さん,せん,かけはし,さ\",\"燦\":\"さん,あき,きらめ,きら\",\"珊\":\"さん,せんち,さんち\",\"産\":\"さん,う,うぶ,む,もと\",\"算\":\"さん,そろ\",\"纂\":\"さん,あつ\",\"蚕\":\"さん,てん,かいこ,こ\",\"讃\":\"さん,ほ,たた,さぬ\",\"賛\":\"さん,たす,たた\",\"酸\":\"さん,す\",\"斬\":\"ざん,さん,せん,ぜん,き\",\"暫\":\"ざん,しばら\",\"残\":\"ざん,さん,のこ,そこな\",\"仕\":\"し,じ,つか\",\"仔\":\"し,こ,た\",\"伺\":\"し,うかが\",\"使\":\"し,つか,づか\",\"刺\":\"し,さ,さし,とげ\",\"司\":\"し,つかさど,つ,つか,つかさ\",\"史\":\"し,あきら,あや,お,こ,ちか,とし,なか,のぶ,ひさ,ひと,ふみ\",\"嗣\":\"し,あき,つかさ,つぎ,つぐ,ひで\",\"四\":\"し,よ,よっ,よん,あ,つ,よつ\",\"士\":\"し,さむらい,お,ま\",\"始\":\"し,はじ,もと\",\"姉\":\"し,あね,はは\",\"姿\":\"し,すがた,しな\",\"子\":\"し,す,つ,こ,ね,い,き,ぎ,く,け,ねっ\",\"市\":\"し,いち,い,ち\",\"師\":\"し,いくさ,のし,のり,もろ,かず,つかさ,みつ,もと\",\"志\":\"し,しりんぐ,こころざ,こころざし,じん,べ,べし,ゆき\",\"思\":\"し,おも,おもえら,おぼ\",\"指\":\"し,ゆび,さ,い,いぶ,さし,さす\",\"支\":\"し,ささ,つか,か\",\"孜\":\"し,つと\",\"斯\":\"し,か,こう,この,これ,ここに\",\"施\":\"し,せ,ほどこ\",\"旨\":\"し,むね,うま\",\"枝\":\"し,えだ,え,ぐさ\",\"止\":\"し,と,ど,とど,や,よ,さ,どめ\",\"死\":\"し\",\"氏\":\"し,うじ\",\"獅\":\"し,しし\",\"祉\":\"し\",\"私\":\"し,わたくし,わたし\",\"糸\":\"し,いと\",\"紙\":\"し,かみ\",\"紫\":\"し,むらさき,さい,ゆかり\",\"肢\":\"し\",\"脂\":\"し,あぶら\",\"至\":\"し,いた,のぶ,のり,みち,よし\",\"視\":\"し,み,とも\",\"詞\":\"し,ことば\",\"詩\":\"し,うた\",\"試\":\"し,こころ,ため\",\"誌\":\"し\",\"諮\":\"し,はか\",\"資\":\"し,すけ,もと\",\"賜\":\"し,たまわ,たま,たも\",\"雌\":\"し,め,めす,めん\",\"飼\":\"し,か,かい\",\"歯\":\"し,よわい,は,よわ\",\"事\":\"じ,ず,こと,つか,ろ\",\"似\":\"じ,に,ひ,にた\",\"侍\":\"じ,し,さむらい,はべ,かみ\",\"児\":\"じ,に,げい,こ,っこ,る\",\"字\":\"じ,あざ,あざな,な\",\"寺\":\"じ,てら\",\"慈\":\"じ,いつく,しげ,ちか,めぐみ,よし\",\"持\":\"じ,も,もち,もつ\",\"時\":\"じ,とき,どき,と,とぎ\",\"次\":\"じ,し,つ,つぎ,き,すき,つぐ,よし\",\"滋\":\"じ,し,しげ,しげる\",\"治\":\"じ,ち,おさ,なお,し,ぢ,はり,はる,みち\",\"爾\":\"じ,に,なんじ,しかり,その,のみ,おれ,しか,ちか,み\",\"璽\":\"じ\",\"磁\":\"じ\",\"示\":\"じ,し,しめ\",\"而\":\"じ,に,しこ,しか,すなわち,なんじ,しかるに\",\"耳\":\"じ,みみ,がみ\",\"自\":\"じ,し,みずか,おの,より\",\"蒔\":\"し,じ,う,ま,まい,まか,まき\",\"辞\":\"じ,や,いな\",\"汐\":\"せき,しお,うしお,せい,いそ\",\"鹿\":\"ろく,しか,か,しし\",\"式\":\"しき,のり\",\"識\":\"しき,し,しる,さと,さとる\",\"竺\":\"じく,ちく,とく,あつし\",\"軸\":\"じく\",\"雫\":\"だ,しずく\",\"七\":\"しち,なな,なの,し,しっ,な,ひち\",\"執\":\"しつ,しゅう,と,し\",\"失\":\"しつ,うしな,う\",\"嫉\":\"しつ,そね,ねた,にく\",\"室\":\"しつ,むろ\",\"悉\":\"しつ,しち,つ,ことごと,つぶさ\",\"湿\":\"しつ,しゅう,しめ,うるお\",\"漆\":\"しつ,うるし,うる\",\"疾\":\"しつ,はや\",\"質\":\"しつ,しち,ち,たち,ただ,もと,わりふ\",\"実\":\"じつ,しつ,み,みの,まこと,みち,ぐみ,さね\",\"篠\":\"ぞう,しょう,しの,ささ,すず,の\",\"偲\":\"さい,し,しの\",\"柴\":\"さい,し,しば\",\"芝\":\"し,しば,こげ,しは\",\"縞\":\"こう,しま,しろぎぬ\",\"舎\":\"しゃ,せき,やど,さ,とり\",\"写\":\"しゃ,じゃ,うつ\",\"射\":\"しゃ,い,さ,う\",\"捨\":\"しゃ,す\",\"赦\":\"しゃ,ゆる\",\"斜\":\"しゃ,なな,はす\",\"煮\":\"しゃ,に\",\"社\":\"しゃ,やしろ,こそ\",\"紗\":\"さ,しゃ,うすぎぬ,たえ,すず\",\"者\":\"しゃ,もの\",\"謝\":\"しゃ,あやま,さ,ざ\",\"車\":\"しゃ,くるま,くら,くろま\",\"遮\":\"しゃ,さえぎ\",\"蛇\":\"じゃ,だ,い,や,へび,あぶ,み\",\"邪\":\"じゃ,よこし\",\"借\":\"しゃく,か\",\"勺\":\"しゃく\",\"尺\":\"しゃく,せき,さし\",\"灼\":\"しゃく,あらた,やく\",\"爵\":\"しゃく\",\"酌\":\"しゃく,く\",\"釈\":\"しゃく,せき,とく,す,ゆる,しゃ\",\"錫\":\"せき,しゃく,すず,たま\",\"若\":\"じゃく,にゃく,にゃ,わか,も,ごと,わく,わこ\",\"寂\":\"じゃく,せき,さび,さみ\",\"弱\":\"じゃく,よわ\",\"惹\":\"じゃく,じゃ,ひ\",\"主\":\"しゅ,す,しゅう,ぬし,おも,あるじ,かず,ず,もん\",\"取\":\"しゅ,と,とり,ど,どる\",\"守\":\"しゅ,す,まも,もり,かみ,う,し,も,て\",\"手\":\"しゅ,ず,て,た\",\"朱\":\"しゅ,あけ,あ,あか,あき,す\",\"殊\":\"しゅ,こと\",\"狩\":\"しゅ,か,が,かり\",\"珠\":\"しゅ,たま,す,とも,ま,み\",\"種\":\"しゅ,たね,ぐさ,おい,くさ,た,ほ\",\"腫\":\"しゅ,しょう,は,はれもの\",\"趣\":\"しゅ,おもむき,おもむ\",\"酒\":\"しゅ,さけ,さか,き,さ,し\",\"首\":\"しゅ,くび,おびと,こべ,す\",\"儒\":\"じゅ\",\"受\":\"じゅ,う,じょ\",\"呪\":\"じゅ,しゅ,しゅう,ず,まじな,のろ\",\"寿\":\"じゅ,す,しゅう,ことぶき,ことぶ,ことほ,かず,じ,じゅう,すっ,すみ,とし,としかつ,なが,のぶ,のり,ひさ,ひさし,やす\",\"授\":\"じゅ,さず\",\"樹\":\"じゅ,き,いつき,うえ,こ,しげ,じ,たちき,たつ,たつる,な\",\"需\":\"じゅ\",\"囚\":\"しゅう,とら\",\"収\":\"しゅう,おさ,のぶ\",\"周\":\"しゅう,まわ,あまね,しゅ,す,ちか,のり,ひろ,びび,まこと\",\"宗\":\"しゅう,そう,むね,かず,し,そ,そお,たか,とし,のり,ひろ,むな,もと,よし\",\"就\":\"しゅう,じゅ,つ,たか,なり\",\"州\":\"しゅう,す,くに\",\"修\":\"しゅう,しゅ,おさ,おき,なが,のぶ,おさむ\",\"愁\":\"しゅう,うれ\",\"拾\":\"しゅう,じゅう,ひろ\",\"洲\":\"しゅう,す,しま\",\"秀\":\"しゅう,ひい,しゅ,しょう,ひで,ひでし,ほ\",\"秋\":\"しゅう,あき,とき,あい\",\"終\":\"しゅう,お,おわ,つい,ばて\",\"習\":\"しゅう,じゅ,なら\",\"臭\":\"しゅう,くさ,にお\",\"舟\":\"しゅう,ふね,ふな,ぶね\",\"蒐\":\"しゅう,あかね,あつ\",\"衆\":\"しゅう,しゅ,おお\",\"襲\":\"しゅう,おそ,かさ,そい\",\"蹴\":\"しゅく,しゅう,け\",\"輯\":\"しゅう,あつ,やわ\",\"週\":\"しゅう\",\"酬\":\"しゅう,しゅ,とう,むく\",\"集\":\"しゅう,あつ,つど,あつまり,ず\",\"醜\":\"しゅう,みにく,しこ\",\"住\":\"じゅう,ぢゅう,ちゅう,す,ず,し,じゅ,すみ\",\"充\":\"じゅう,あ,み,あつ,のぶ,まさ,みち,みつ,よし\",\"十\":\"じゅう,じっ,じゅっ,とお,と,そ,い,か,ぎ,さ,し,そう,ち,とう,ね,ま,る,わ\",\"従\":\"じゅう,しょう,じゅ,したが,より\",\"柔\":\"じゅう,にゅう,やわ,とお\",\"汁\":\"じゅう,しる,つゆ\",\"渋\":\"じゅう,しゅう,しぶ\",\"獣\":\"じゅう,けもの,けだもの\",\"縦\":\"じゅう,たて\",\"重\":\"じゅう,ちょう,え,おも,かさ,さね,しげ,しげる\",\"銃\":\"じゅう,つつ\",\"叔\":\"しゅく,よし\",\"宿\":\"しゅく,やど,すく,ぶすき,やけ\",\"淑\":\"しゅく,しと,すく,とし,よし\",\"祝\":\"しゅく,しゅう,いわ,のり,ほぎ,ゆわい\",\"縮\":\"しゅく,ちぢ\",\"粛\":\"しゅく,すく,つつし\",\"塾\":\"じゅく\",\"熟\":\"じゅく,う\",\"出\":\"しゅつ,すい,で,だ,い,いず,いづ,いで,じ,すっ,すつ,てん\",\"術\":\"じゅつ,すべ\",\"述\":\"じゅつ,の\",\"俊\":\"しゅん,すぐる,とし\",\"峻\":\"しゅん,けわ,たか,たかし,ちか,とし,おか\",\"春\":\"しゅん,はる,あずま,かす,すの,ひ,わら\",\"瞬\":\"しゅん,またた,まじろ\",\"竣\":\"どう,しゅん,わらわ,わらべ,おわ\",\"舜\":\"しゅん,みつ\",\"駿\":\"しゅん,すん,すぐ,する,とし,はやし,はやお\",\"准\":\"じゅん\",\"循\":\"じゅん\",\"旬\":\"じゅん,しゅん\",\"楯\":\"じゅん,たて\",\"殉\":\"じゅん\",\"淳\":\"じゅん,しゅん,あつ,あつし,きよ,きよし,まこと,すなお\",\"準\":\"じゅん,なぞら,のり,ひと,みずもり\",\"潤\":\"じゅん,うるお,うる,めぐみ\",\"盾\":\"じゅん,たて\",\"純\":\"じゅん,あつ,すみ,み,やすし,よし\",\"巡\":\"じゅん,めぐ\",\"遵\":\"じゅん\",\"醇\":\"じゅん,しゅん,もっぱら,こい,あつい\",\"順\":\"じゅん,あや,あり,おき,おさむ,しげ,したがう,とし,なお,のぶ,のり,まさ,むね,もと,ゆき,よし,より\",\"処\":\"しょ,ところ,こ,お\",\"初\":\"しょ,はじ,はつ,うい,そ,ぞ,し,はっ\",\"所\":\"しょ,ところ,どころ,とこ,せ\",\"暑\":\"しょ,あつ\",\"曙\":\"しょ,あけぼの\",\"渚\":\"しょ,なぎさ,なぎ\",\"庶\":\"しょ\",\"緒\":\"しょ,ちょ,お,いとぐち,ほ\",\"署\":\"しょ\",\"書\":\"しょ,か,が,がき,かき\",\"諸\":\"しょ,もろ\",\"助\":\"じょ,たす,す,すけ\",\"叙\":\"じょ,つい,ついで\",\"女\":\"じょ,にょ,にょう,おんな,め,おな,た,つき,な\",\"序\":\"じょ,つい,ついで,つぐ\",\"徐\":\"じょ,おもむ\",\"恕\":\"じょ,しょ,ゆる\",\"除\":\"じょ,じ,のぞ,よ\",\"傷\":\"しょう,きず,いた\",\"償\":\"しょう,つぐな\",\"勝\":\"しょう,か,が,まさ,すぐ,かつ,かち,と,よし\",\"匠\":\"しょう,たくみ\",\"升\":\"しょう,ます,のぼる\",\"召\":\"しょう,め\",\"哨\":\"しょう,みはり\",\"商\":\"しょう,あきな,あき\",\"唱\":\"しょう,とな\",\"嘗\":\"しょう,じょう,かつ,こころ,な\",\"奨\":\"しょう,そう,すす,まさし\",\"宵\":\"しょう,よい\",\"将\":\"しょう,そう,まさ,はた,ひきい,もって,かつ,かつり,すすむ,たか,ゆき\",\"小\":\"しょう,ちい,こ,お,さ,いさら,こう,さざ,しゃお,ちいさ\",\"少\":\"しょう,すく,すこ\",\"尚\":\"しょう,なお,たか,たかし,ないし,なり,ひさ,ひさし\",\"庄\":\"しょう,そ,そう,ほう,まさ\",\"床\":\"しょう,とこ,ゆか\",\"彰\":\"しょう,あき,あきら\",\"承\":\"しょう,じょう,うけたまわ,う,つぐ,こと,すけ,つぎ,よし,うけ\",\"抄\":\"しょう,さ,り\",\"招\":\"しょう,まね\",\"掌\":\"しょう,てのひら,たなごころ\",\"捷\":\"しょう,そう,はや,かつ\",\"昇\":\"しょう,のぼ,しゅう,のり\",\"昌\":\"しょう,さかん,まさ,まさし,よし,あき,あきら,さかえ,あつ,すけ\",\"昭\":\"しょう,あき,あきら,かず,かずみ,てる\",\"晶\":\"しょう,あ,あき,あきら,ひかり,まさ\",\"松\":\"しょう,まつ,おお,しょ,ま,まっ\",\"梢\":\"しょう,こずえ,くすのき\",\"樟\":\"しょう,くす\",\"沼\":\"しょう,ぬま\",\"消\":\"しょう,き,け\",\"渉\":\"しょう,わた,えん\",\"湘\":\"しょう\",\"焼\":\"しょう,や,やい,やき\",\"焦\":\"しょう,こ,あせ,じ\",\"照\":\"しょう,て,あき,てる\",\"症\":\"しょう\",\"省\":\"せい,しょう,かえり,はぶ,さとし,み\",\"硝\":\"しょう\",\"礁\":\"しょう\",\"祥\":\"しょう,さいわ,きざ,よ,つまび,あき,さか,さち,ひろ,まさ,やす,ゆき,よし,あきら,さき,さむ,ただ,なか,なが\",\"称\":\"しょう,たた,とな,あ,かな,はか,ほめ,ね\",\"章\":\"しょう,あき,あきら,あや,ふみ\",\"笑\":\"しょう,わら,え,えみ\",\"粧\":\"しょう,さ\",\"紹\":\"しょう,つぐ\",\"肖\":\"しょう,あやか\",\"菖\":\"しょう\",\"蕉\":\"しょう\",\"衝\":\"しょう,つ\",\"裳\":\"しょう,も,もすそ\",\"訟\":\"しょう\",\"証\":\"しょう,あかし\",\"詔\":\"しょう,みことのり,さとし,のり\",\"詳\":\"しょう,くわ,つまび,よし\",\"象\":\"しょう,ぞう,かたど,きさ\",\"賞\":\"しょう,ほ\",\"鐘\":\"しょう,かね\",\"障\":\"しょう,さわ\",\"鞘\":\"しょう,そう,さや\",\"上\":\"じょう,しょう,しゃん,うえ,うわ,かみ,あ,のぼ,たてまつ,あおい,あげ,い,か,かき,かず,かん,こう,のぼり,ほつ\",\"丈\":\"じょう,たけ,だけ,とも,ますら\",\"丞\":\"じょう,しょう,すく,たす,すけ\",\"乗\":\"じょう,しょう,の,のり\",\"冗\":\"じょう\",\"剰\":\"じょう,あまつさえ,あま\",\"城\":\"じょう,せい,しろ,いく,がき,き,くに,ぐしく,ぐすく,しき,すく,ぜい,たち,なり\",\"場\":\"じょう,ちょう,ば\",\"壌\":\"じょう,つち\",\"嬢\":\"じょう,むすめ\",\"常\":\"じょう,つね,とこ,とき,のぶ,ひ,ひた\",\"情\":\"じょう,せい,なさ\",\"条\":\"じょう,ちょう,でき,えだ,すじ\",\"杖\":\"じょう,つえ\",\"浄\":\"じょう,せい,きよ\",\"状\":\"じょう\",\"畳\":\"じょう,ちょう,たた,たたみ,かさ\",\"穣\":\"じょう,わら,ゆたか,しげ,みのる\",\"蒸\":\"じょう,せい,む\",\"譲\":\"じょう,ゆず,ゆずり\",\"醸\":\"じょう,かも\",\"錠\":\"じょう\",\"嘱\":\"しょく,たの\",\"埴\":\"しょく,はに,へな\",\"飾\":\"しょく,かざ,しか\",\"拭\":\"しょく,しき,ぬぐ,ふ\",\"植\":\"しょく,う,うえ,え,げ\",\"殖\":\"しょく,ふ,うえ,え,げ\",\"燭\":\"そく,しょく,ともしび\",\"織\":\"しょく,しき,お,おり,こおり,こり,のり\",\"職\":\"しょく,そく,もと\",\"色\":\"しょく,しき,いろ,しか,しこ\",\"触\":\"しょく,ふ,さわ\",\"食\":\"しょく,じき,く,た,は,ぐい\",\"辱\":\"じょく,はずかし\",\"尻\":\"こう,しり,がみ\",\"伸\":\"しん,の,のぶ,よぼる\",\"信\":\"しん,し,しが,しな,しの,しぶ,とき,のび,のぶ,まこと\",\"侵\":\"しん,おか\",\"唇\":\"しん,くちびる\",\"娠\":\"しん\",\"寝\":\"しん,ね,い,みたまや,や\",\"審\":\"しん,つまび,つぶさ,あきら\",\"心\":\"しん,こころ,ごころ\",\"慎\":\"しん,つつし,つつ,ちか,のり,まこと,みつ\",\"振\":\"しん,ふ,ふり\",\"新\":\"しん,あたら,あら,にい,あせ,あたらし,し,に,にっ,につ,よし\",\"晋\":\"しん,すす,すすむ,ゆき,くに,すすみ,のぶ\",\"森\":\"しん,もり,もと\",\"榛\":\"しん,はん,はしばみ,はり,はい,はる\",\"浸\":\"しん,ひた,つ\",\"深\":\"しん,ふか,ぶか,み\",\"申\":\"しん,もう,さる\",\"真\":\"しん,ま,まこと,さな,さね,ただ,ただし,なお,のり,まあ,まこ,まさ,まっ,まど,まな,まゆ,みち,も\",\"神\":\"しん,じん,かみ,かん,こう,か,かぐ,かな,かも,くま,こ,こは,だま,み\",\"秦\":\"しん,はた,たい,はだ,やす\",\"紳\":\"しん,まこと\",\"臣\":\"しん,じん,おみ,たか,と,とみ,み\",\"芯\":\"しん\",\"薪\":\"しん,たきぎ,まき\",\"親\":\"しん,おや,した,ぎ,ちか,のり\",\"診\":\"しん,み\",\"身\":\"しん,み\",\"辛\":\"しん,から,つら,づら,かのと\",\"進\":\"しん,すす,のぶ\",\"針\":\"しん,はり,は\",\"震\":\"しん,ふる\",\"人\":\"じん,にん,ひと,り,と,じ,ね,ひこ,ふみ\",\"仁\":\"じん,に,にん,きみ,く,さと,しのぶ,じ,と,のり,ひと,ひとし,ひろ,まさ,まさし,やす,よし\",\"刃\":\"じん,にん,は,やいば,き,ち,と\",\"壬\":\"にん,じん,い,みずのえ\",\"尋\":\"じん,たず,ひろ,ず,つぐ\",\"甚\":\"じん,はなは,じ\",\"尽\":\"じん,さん,つ,づ,ず,ことごと\",\"腎\":\"じん\",\"訊\":\"じん,しゅん,しん,き,と,たず\",\"迅\":\"じん\",\"陣\":\"じん\",\"諏\":\"しゅ,す,そう,はか\",\"須\":\"す,しゅ,すべから,すべし,ひげ,まつ,もち,もと,もとむ,ぞ\",\"酢\":\"さく,す\",\"図\":\"ず,と,え,はか,づ\",\"厨\":\"しゅう,ず,ちゅ,ちゅう,くりや\",\"逗\":\"とう,ず,とど\",\"吹\":\"すい,ふ,ふき\",\"垂\":\"すい,た,なんなんと,たる,だれ\",\"帥\":\"すい\",\"推\":\"すい,お\",\"水\":\"すい,みず,うず,ずみ,つ,ど,み,みさ,みつ,みな,みん\",\"炊\":\"すい,た,だ,い\",\"睡\":\"すい,ねむ\",\"粋\":\"すい,いき\",\"翠\":\"すい,かわせみ,みどり,あきら\",\"衰\":\"すい,おとろ\",\"遂\":\"すい,と,つい\",\"酔\":\"すい,よ,よい\",\"錐\":\"すい,きり\",\"錘\":\"すい,つむ,おもり\",\"随\":\"ずい,まにま,したが\",\"瑞\":\"ずい,すい,みず,しるし,たま,ず,みつ\",\"髄\":\"ずい\",\"崇\":\"すう,あが,す,たか,たかし,たかむ\",\"嵩\":\"すう,しゅう,かさ,たか,たかし,たけ\",\"数\":\"すう,す,さく,そく,しゅ,かず,かぞ,しばしば,せ,わずらわ,じゅ\",\"枢\":\"すう,しゅ,とぼそ,からくり\",\"雛\":\"すう,す,じゅ,ひな,ひよこ\",\"据\":\"きょ,す\",\"杉\":\"さん,すぎ\",\"菅\":\"かん,けん,すげ,す,すが,すご\",\"頗\":\"は,すこぶ,かたよ\",\"雀\":\"じゃく,じゃん,さく,しゃく,すずめ,ざく\",\"裾\":\"きょ,こ,すそ\",\"澄\":\"ちょう,す,きよ,すす,すみ,み\",\"摺\":\"しょう,しゅう,ろう,す,ひだ,する,ずり\",\"寸\":\"すん,す,みき\",\"世\":\"せい,せ,そう,よ,とし,ゆ,ゆき\",\"瀬\":\"らい,せ,いわた,がせ,しげ,せい,せっ\",\"畝\":\"ぼう,ほ,も,む,せ,うね\",\"是\":\"ぜ,し,これ,この,ここ,すなお,ただし,つな,ゆき,よし\",\"凄\":\"せい,さい,さむ,すご,すさ\",\"制\":\"せい\",\"勢\":\"せい,ぜい,いきお,はずみ,せ\",\"姓\":\"せい,しょう\",\"征\":\"せい,いく,そ,ただ,まさ,ゆき\",\"性\":\"せい,しょう,さが\",\"成\":\"せい,じょう,な,あき,あきら,しげ,そん,たえ,なお,なり,なる,のり,ひら,まさ,よし,り\",\"政\":\"せい,しょう,まつりごと,まん,ただ,まさ\",\"整\":\"せい,ととの,ひとし\",\"星\":\"せい,しょう,ほし,ぼし\",\"晴\":\"せい,は,ば,はる,はれ\",\"棲\":\"せい,す,ずみ\",\"栖\":\"せい,す,すみ\",\"正\":\"せい,しょう,ただ,まさ,おお,くに,ま,まさし,ただし\",\"清\":\"せい,しょう,しん,きよ,あき,さや,し,すが,すみ,せ,ちん\",\"牲\":\"せい\",\"生\":\"せい,しょう,い,う,うま,うまれ,お,は,き,なま,な,む,あさ,いき,いく,いけ,うぶ,うまい,え,おい,ぎゅう,くるみ,ごせ,さ,じょう,すぎ,そ,そう,ちる,なば,にう,にゅう,ふ,み,もう,よい,りゅう\",\"盛\":\"せい,じょう,も,さか,もり\",\"精\":\"せい,しょう,しら,くわ,きよ\",\"聖\":\"せい,しょう,ひじり,きよ,さと,さとし,せ,たか,ただ,ひろ,まさ,み\",\"声\":\"せい,しょう,こえ,こわ\",\"製\":\"せい\",\"西\":\"せい,さい,す,にし,いり,ひし,むら\",\"誠\":\"せい,まこと,きよ,さと,しげ,とも,のぶ,ま,まこ,まさ\",\"誓\":\"せい,ちか\",\"請\":\"せい,しん,しょう,こ,う,うけ\",\"逝\":\"せい,ゆ,い\",\"醒\":\"せい,さ\",\"青\":\"せい,しょう,あお,お\",\"静\":\"せい,じょう,しず,しづ\",\"斉\":\"せい,さい,そろ,ひと,あたる,はやい,ただ,なり,ひとし\",\"税\":\"ぜい,さい\",\"隻\":\"せき\",\"席\":\"せき,むしろ\",\"惜\":\"せき,お\",\"戚\":\"そく,せき,いた,うれ,みうち\",\"斥\":\"せき,しりぞ\",\"昔\":\"せき,しゃく,むかし\",\"析\":\"せき\",\"石\":\"せき,しゃく,こく,いし,いさ,いす,いわ,し,せっく,と\",\"積\":\"せき,つ,づ,か,さか,しゃこ,ずみ,つみ\",\"籍\":\"せき\",\"績\":\"せき,み\",\"脊\":\"せき,せ,せい\",\"責\":\"せき,せ\",\"赤\":\"せき,しゃく,あか,あ,あこ,あま\",\"跡\":\"せき,あと\",\"蹟\":\"せき,しゃく,あと\",\"碩\":\"せき,おお\",\"切\":\"せつ,さい,き,ぎ,きつ,きり,ぎり\",\"拙\":\"せつ,つたな\",\"接\":\"せつ,しょう,つ\",\"摂\":\"せつ,しょう,おさ,かね,と,せっ\",\"折\":\"せつ,しゃく,お,おり,せき\",\"設\":\"せつ,もう,した\",\"窃\":\"せつ,ぬす,ひそ\",\"節\":\"せつ,せち,ふし,ぶし,のっと,たかし\",\"説\":\"せつ,ぜい,と,さとし,とき\",\"雪\":\"せつ,ゆき,せっ,ぶき\",\"絶\":\"ぜつ,た\",\"舌\":\"ぜつ,した\",\"仙\":\"せん,せんと,そま,のり\",\"先\":\"せん,さき,ま,ぽん\",\"千\":\"せん,ち,かず,ゆき\",\"占\":\"せん,し,うらな,うら,しむ,じめ\",\"宣\":\"せん,のたま,とおる,のぶ,のぼる,のり,ひさ,よし\",\"専\":\"せん,もっぱ\",\"尖\":\"せん,とが,さき,するど\",\"川\":\"せん,かわ,か,こ,さわ\",\"戦\":\"せん,いくさ,たたか,おのの,そよ,わなな,せ\",\"扇\":\"せん,おうぎ,おう,おおぎ\",\"撰\":\"さん,せん,えら\",\"栓\":\"せん\",\"泉\":\"せん,いずみ,いず,ずい,ずみ,ぜい,ぜん,の\",\"浅\":\"せん,あさ,あざ,さ\",\"洗\":\"せん,あら,あらい,らい\",\"染\":\"せん,そ,し,そめ\",\"潜\":\"せん,ひそ,もぐ,かく,くぐ\",\"煎\":\"せん,い,に,いり\",\"旋\":\"せん,め,いばり,せ,めぐり\",\"穿\":\"せん,うが,は\",\"線\":\"せん,すじ\",\"繊\":\"せん\",\"羨\":\"せん,えん,うらや,あまり\",\"腺\":\"せん\",\"船\":\"せん,ふね,ふな,ふ\",\"薦\":\"せん,すす,こも\",\"詮\":\"せん,かい,あき\",\"践\":\"せん,ふ\",\"選\":\"せん,えら,え,よ\",\"遷\":\"せん,うつ,みやこがえ\",\"銭\":\"せん,ぜん,ぜに,すき\",\"銑\":\"せん\",\"閃\":\"せん,ひらめ,うかが\",\"鮮\":\"せん,あざ\",\"前\":\"ぜん,まえ,さき,さと,まい\",\"善\":\"ぜん,よ,い,よし,たる\",\"漸\":\"ぜん,ようや,やや,ようよ,すす\",\"然\":\"ぜん,ねん,しか,さ\",\"全\":\"ぜん,まった,すべ,たけ,まさ\",\"禅\":\"ぜん,せん,しずか,ゆず\",\"繕\":\"ぜん,つくろ\",\"膳\":\"ぜん,せん,かしわ,すす,そな,ぜ,よし\",\"噌\":\"そう,しょう,そ,かまびす\",\"塑\":\"そ,でく\",\"措\":\"そ,お\",\"曾\":\"そう,そ,ぞう,かつ,か,すなわち\",\"曽\":\"そう,そ,ぞう,かつ,かつて,すなわち\",\"楚\":\"そ,しょ,いばら,しもと,すわえ\",\"狙\":\"そ,しょ,ねら\",\"疏\":\"そ,しょ,あら,うと,とお,まばら\",\"疎\":\"そ,しょ,うと,まば\",\"礎\":\"そ,いしずえ,もと\",\"祖\":\"そ,い\",\"租\":\"そ\",\"粗\":\"そ,あら\",\"素\":\"そ,す,もと\",\"組\":\"そ,く,くみ,ぐみ\",\"蘇\":\"そ,す,よみがえ\",\"訴\":\"そ,うった\",\"阻\":\"そ,はば\",\"遡\":\"そ,さく,さかのぼ\",\"僧\":\"そう\",\"創\":\"そう,しょう,つく,はじ,きず,けず,はじめ\",\"双\":\"そう,ふた,たぐい,ならぶ,ふたつ,ふ\",\"叢\":\"そう,す,くさむら,むら\",\"倉\":\"そう,くら\",\"喪\":\"そう,も\",\"壮\":\"そう,さかん,つよし\",\"奏\":\"そう,かな,すすむ\",\"爽\":\"そう,あき,さわ,たがう\",\"宋\":\"そう\",\"層\":\"そう\",\"惣\":\"そう,すべ,おさむ,あしむ,ふさ,そ,みち\",\"想\":\"そう,そ,おも\",\"捜\":\"そう,しゅ,しゅう,さが\",\"掃\":\"そう,しゅ,は,か\",\"挿\":\"そう,さ,はさ\",\"操\":\"そう,さん,みさお,あやつ,さお,みさ\",\"早\":\"そう,さっ,はや,さ,さか,さわ,そ,わ\",\"曹\":\"そう,ぞう\",\"巣\":\"そう,す\",\"槍\":\"そう,しょう,やり,うつ\",\"槽\":\"そう,ふね\",\"漕\":\"そう,こ,はこ\",\"燥\":\"そう,はしゃ\",\"争\":\"そう,あらそ,いか\",\"痩\":\"そう,ちゅう,しゅう,しゅ,や\",\"相\":\"そう,しょう,あい,あ,い,おう,さ,さが,すけ\",\"窓\":\"そう,す,まど,てんまど,けむだし\",\"総\":\"そう,す,すべ,ふさ,うさ,ずさ\",\"綜\":\"そう,おさ,す\",\"聡\":\"そう,さと,みみざと,さとし,さとる,あき,あきら,とし,さた,みのる\",\"草\":\"そう,くさ,ぐさ,そ,や\",\"荘\":\"そう,しょう,ちゃん,ほうき,おごそ,そ\",\"葬\":\"そう,ほうむ,はふり\",\"蒼\":\"そう,あお\",\"藻\":\"そう,も\",\"装\":\"そう,しょう,よそお\",\"走\":\"そう,はし,はしり\",\"送\":\"そう,おく\",\"遭\":\"そう,あ\",\"霜\":\"そう,しも\",\"騒\":\"そう,さわ,うれい\",\"像\":\"ぞう,かた\",\"増\":\"ぞう,ま,ふ,まし,ます\",\"憎\":\"ぞう,にく\",\"臓\":\"ぞう,はらわた\",\"蔵\":\"ぞう,そう,くら,おさ,かく,くらし,くらん,くろう,さし,ざ,ろう\",\"贈\":\"ぞう,そう,おく\",\"造\":\"ぞう,つく,づく,ずくり,づくり,み\",\"促\":\"そく,うなが\",\"側\":\"そく,かわ,がわ,そば\",\"則\":\"そく,のっと,のり,すなわち\",\"即\":\"そく,つ,すなわ\",\"息\":\"そく,いき\",\"捉\":\"そく,さく,とら\",\"束\":\"そく,たば,つか\",\"測\":\"そく,はか\",\"足\":\"そく,あし,た,あ,あす,おす,たらし\",\"速\":\"そく,はや,すみ,わ\",\"俗\":\"ぞく\",\"属\":\"ぞく,しょく,さかん,つく,やから,さっか,つき\",\"賊\":\"ぞく\",\"族\":\"ぞく,つぎ\",\"続\":\"ぞく,しょく,こう,きょう,つづ,つぐ\",\"卒\":\"そつ,しゅつ,そっ,お,ついに,にわか\",\"袖\":\"しゅう,そで\",\"其\":\"き,ぎ,ご,それ,その\",\"揃\":\"せん,そろ,き\",\"存\":\"そん,ぞん,ながら,あ,たも,と,あり,まさ\",\"孫\":\"そん,まご,ひ\",\"尊\":\"そん,たっと,とうと,さだ,たか,たけ,みこと\",\"損\":\"そん,そこ,そこな\",\"村\":\"そん,むら,え,むた,ら\",\"遜\":\"そん,したが,へりくだ,ゆず\",\"他\":\"た,ほか\",\"多\":\"た,おお,まさ\",\"太\":\"たい,た,ふと,おお,たか,ひろ\",\"汰\":\"た,たい,おご,にご,よな\",\"唾\":\"だ,た,つば,つばき\",\"堕\":\"だ,お,くず\",\"妥\":\"だ,やす\",\"惰\":\"だ\",\"打\":\"だ,だす,う,ぶ,うち\",\"舵\":\"だ,た,かじ\",\"楕\":\"だ,た\",\"陀\":\"た,だ,い,ち,じ,けわ,ななめ\",\"駄\":\"だ,た\",\"体\":\"たい,てい,からだ,かたち,なり\",\"堆\":\"たい,つい,うずたか\",\"対\":\"たい,つい,あいて,こた,そろ,つれあ,なら,むか,つし\",\"耐\":\"たい,た,たえ\",\"帯\":\"たい,お,おび,たて\",\"待\":\"たい,ま,まち,まつ\",\"怠\":\"たい,おこた,なま\",\"態\":\"たい,わざ\",\"戴\":\"たい,いただ\",\"替\":\"たい,か,かえ\",\"泰\":\"たい,た,はす,ひろ,や,やす,やすし,ゆたか,よし\",\"滞\":\"たい,てい,とどこお\",\"胎\":\"たい\",\"苔\":\"たい,こけ,こけら\",\"袋\":\"たい,だい,ふくろ,てい,ない,ぶく\",\"貸\":\"たい,か,かし\",\"退\":\"たい,しりぞ,ひ,の,ど\",\"逮\":\"たい\",\"隊\":\"たい\",\"黛\":\"たい,まゆずみ\",\"鯛\":\"ちょう,たい\",\"代\":\"だい,たい,か,かわ,がわ,が,よ,しろ,す\",\"台\":\"だい,たい,うてな,われ,つかさ\",\"大\":\"だい,たい,おお,うふ,お,おう,た,たかし,とも,はじめ,ひろ,ひろし,まさ,まさる,もと,わ\",\"第\":\"だい,てい\",\"醍\":\"だい,たい,てい\",\"題\":\"だい\",\"鷹\":\"よう,おう,たか\",\"滝\":\"ろう,そう,たき,らき\",\"瀧\":\"ろう,そう,たき\",\"卓\":\"たく,すぐる,たか,たかし\",\"啄\":\"たく,つく,とく,ついば,つつ,くち,はし,ばし\",\"宅\":\"たく,け,たか,たけ,や,やけ\",\"托\":\"たく,たの\",\"択\":\"たく,えら\",\"拓\":\"たく,ひら,つ,ひろ\",\"沢\":\"たく,さわ,うるお,つや,おも,さ,さわん,わさ\",\"濯\":\"たく,すす,ゆす\",\"琢\":\"たく,みが,あや,たか\",\"託\":\"たく,かこつ,かこ\",\"濁\":\"だく,じょく,にご,にごり\",\"諾\":\"だく\",\"茸\":\"じょう,にゅ,きのこ,たけ,しげ\",\"凧\":\"いかのぼり,たこ\",\"只\":\"し,ただ\",\"但\":\"たん,ただ,たじ\",\"達\":\"たつ,だ,たち,かつ,さと,て,てつ,とおる,みち\",\"辰\":\"しん,じん,たつ,とき,のぶ,のぶる\",\"奪\":\"だつ,うば\",\"脱\":\"だつ,ぬ\",\"巽\":\"そん,たつみ\",\"竪\":\"じゅ,たて,た,こども\",\"辿\":\"てん,たど,たどり\",\"棚\":\"ほう,たな,だな\",\"谷\":\"こく,たに,きわ,がい,がえ,がや,せ,たり,たん,や\",\"樽\":\"そん,たる\",\"誰\":\"すい,だれ,たれ,た\",\"丹\":\"たん,に,た,たみ,まこと\",\"単\":\"たん,ひとえ\",\"嘆\":\"たん,なげ\",\"坦\":\"たん,たいら,やす\",\"担\":\"たん,かつ,にな\",\"探\":\"たん,さぐ,さが\",\"旦\":\"たん,だん,あき,あきら,ただし,あさ,あした\",\"歎\":\"たん,なげ\",\"淡\":\"たん,あわ\",\"湛\":\"たん,ちん,じん,せん,しず,たた,かん,きよ,たたう,たたえ,やす\",\"炭\":\"たん,すみ\",\"短\":\"たん,みじか\",\"端\":\"たん,はし,は,はた,ばた,はな,ただし,みず\",\"綻\":\"たん,ほころ\",\"耽\":\"たん,ふけ\",\"胆\":\"たん,きも,い,まこと\",\"誕\":\"たん\",\"鍛\":\"たん,きた,か\",\"団\":\"だん,とん,かたまり,まる\",\"壇\":\"だん,たん\",\"弾\":\"だん,たん,ひ,はず,たま,はじ,ただ\",\"断\":\"だん,た,ことわ,さだ\",\"暖\":\"だん,のん,あたた\",\"檀\":\"だん,たん,まゆみ\",\"段\":\"だん,たん\",\"男\":\"だん,なん,おとこ,お,み\",\"談\":\"だん\",\"値\":\"ち,ね,あたい,じ\",\"知\":\"ち,し,さと,さとる,しり,しれ,とも,のり\",\"地\":\"ち,じ,どま\",\"弛\":\"ち,し,たる,たゆ,ゆる\",\"恥\":\"ち,は,はじ\",\"智\":\"ち,さと,さとし,さとる,さとい,とも,のり,とし,あきら,じ,とみ,ひと,もと,よも\",\"池\":\"ち,いけ\",\"痴\":\"ち,し,おろか\",\"稚\":\"ち,じ,いとけない,おさない,おくて,おでる,まさ,わか,わく,わっか\",\"置\":\"ち,お,おき,おけ,き\",\"致\":\"ち,いた\",\"遅\":\"ち,おく,おそ,じ\",\"馳\":\"ち,じ,は\",\"築\":\"ちく,きず,つい,つき,つく,づき\",\"畜\":\"ちく\",\"竹\":\"ちく,たけ,たか\",\"筑\":\"ちく,つく,づき\",\"蓄\":\"ちく,たくわ\",\"逐\":\"ちく\",\"秩\":\"ちつ,ちち,ちっ\",\"窒\":\"ちつ\",\"茶\":\"ちゃ,さ,ちや\",\"嫡\":\"ちゃく,てき\",\"着\":\"ちゃく,じゃく,き,つ\",\"中\":\"ちゅう,なか,うち,あた,あたる,かなえ\",\"仲\":\"ちゅう,なか,ちゅん,つづき,なかつ\",\"宙\":\"ちゅう,ひろ,ゆ\",\"忠\":\"ちゅう,きよし,たた,ただ,ただし,なお\",\"抽\":\"ちゅう,ひき\",\"昼\":\"ちゅう,ひる\",\"柱\":\"ちゅう,はしら\",\"注\":\"ちゅう,そそ,さ,つ\",\"虫\":\"ちゅう,き,むし,む\",\"衷\":\"ちゅう\",\"註\":\"ちゅう\",\"酎\":\"ちゅう,ちゅ,かも\",\"鋳\":\"ちゅう,い,しゅ,しゅう\",\"駐\":\"ちゅう\",\"猪\":\"ちょ,い,いのしし,いの\",\"著\":\"ちょ,ちゃく,あらわ,いちじる\",\"貯\":\"ちょ,た,たくわ\",\"丁\":\"ちょう,てい,ちん,とう,ち,ひのと\",\"兆\":\"ちょう,きざ\",\"喋\":\"ちょう,とう,しゃべ,ついば\",\"寵\":\"ちょう,めぐ\",\"帖\":\"ちょう,じょう,かきもの\",\"帳\":\"ちょう,とばり\",\"庁\":\"ちょう,てい,やくしょ\",\"弔\":\"ちょう,とむら,とぶら\",\"張\":\"ちょう,は,ば,はり,わり\",\"彫\":\"ちょう,ほ,ぼ\",\"徴\":\"ちょう,ち,しるし\",\"懲\":\"ちょう,こ\",\"挑\":\"ちょう,いど\",\"暢\":\"ちょう,のび,いたる,のぶ,のぶる,なが,とうる,とおる,のり,まさ,みつる,よう\",\"朝\":\"ちょう,あさ,あ,あそ,ささ,ちか,とも\",\"潮\":\"ちょう,しお,うしお,いた\",\"牒\":\"ちょう,じょう,ふだ\",\"町\":\"ちょう,まち\",\"眺\":\"ちょう,なが\",\"聴\":\"ちょう,てい,き,ゆる,きく\",\"脹\":\"ちょう,は,ふく\",\"腸\":\"ちょう,はらわた,わた\",\"蝶\":\"ちょう\",\"調\":\"ちょう,しら,ととの,ぎ,つぎ\",\"超\":\"ちょう,こ,まさる,わたる\",\"跳\":\"ちょう,は,と\",\"長\":\"ちょう,なが,おさ,お,おしゃ,たかし,たけ,な,は,ひさ\",\"頂\":\"ちょう,いただ,いただき\",\"鳥\":\"ちょう,とり,か,と,とっ\",\"勅\":\"ちょく,いまし,みことのり,て,のり\",\"捗\":\"ちょく,ほ,はかど\",\"直\":\"ちょく,じき,じか,ただ,なお,す,すぐ,のう,のお\",\"朕\":\"ちん\",\"沈\":\"ちん,じん,しず,しん\",\"珍\":\"ちん,めずら,たから,じん\",\"賃\":\"ちん,すけ\",\"鎮\":\"ちん,しず,おさえ,しげ,じん,ちか,しん\",\"陳\":\"ちん,ひ,のぶ\",\"津\":\"しん,つ,ず,ち,と\",\"墜\":\"つい,お\",\"椎\":\"つい,すい,つち,う,しい\",\"槌\":\"つい,つち\",\"追\":\"つい,お,おい\",\"痛\":\"つう,いた\",\"通\":\"つう,つ,とお,どお,かよ,とん,どうし,どおり,みち\",\"塚\":\"ちょう,つか,づか,ずか,つ\",\"槻\":\"き,つき\",\"佃\":\"てん,でん,つくだ\",\"漬\":\"し,つ,づ,づけ\",\"柘\":\"しゃ,じゃく,そ,つげ,やまぐわ,つ\",\"辻\":\"つじ\",\"蔦\":\"ちょう,つた,たつ\",\"綴\":\"てい,てつ,てち,げつ,と,つづ,つづり,すみ\",\"椿\":\"ちん,ちゅん,つばき,つば\",\"潰\":\"かい,え,つぶ,つい\",\"坪\":\"へい,つぼ\",\"紬\":\"ちゅう,つむぎ,つむ\",\"爪\":\"そう,つめ,つま\",\"釣\":\"ちょう,つ,つり\",\"鶴\":\"かく,つる,たず,ず,か,つ,づ\",\"亭\":\"てい,ちん\",\"低\":\"てい,ひく\",\"停\":\"てい,と\",\"偵\":\"てい\",\"貞\":\"てい,じょう,ただし,さだ,さざ,りょう\",\"呈\":\"てい\",\"堤\":\"てい,つつみ\",\"定\":\"てい,じょう,さだ,さた\",\"帝\":\"てい,みかど\",\"底\":\"てい,そこ\",\"庭\":\"てい,にわ,ば\",\"廷\":\"てい,たか\",\"弟\":\"てい,だい,で,おとうと,て\",\"悌\":\"てい,だい,とも,やす,やすし,よし,ちか\",\"抵\":\"てい\",\"挺\":\"ちょう,てい,ぬ\",\"提\":\"てい,ちょう,だい,さ\",\"梯\":\"てい,たい,はしご,だい\",\"汀\":\"てい,みぎわ,なぎさ,て\",\"禎\":\"てい,さいわ,さだ,ただし,よし,さち,とも,のり\",\"程\":\"てい,ほど,ほと\",\"締\":\"てい,し,じ\",\"艇\":\"てい\",\"訂\":\"てい,ただ\",\"諦\":\"てい,たい,あきら,つまびらか,まこと\",\"蹄\":\"てい,ひづめ\",\"逓\":\"てい,かわ,たがいに\",\"邸\":\"てい,やしき,むら\",\"鄭\":\"てい,じょう\",\"釘\":\"てい,ちょう,くぎ\",\"鼎\":\"てい,かなえ\",\"泥\":\"でい,ない,で,に,どろ,なず,ひじ\",\"摘\":\"てき,つ,つむ\",\"擢\":\"てき,たく,ぬ,ぬき\",\"敵\":\"てき,かたき,あだ,かな\",\"滴\":\"てき,しずく,したた\",\"的\":\"てき,まと,いくは,ゆくは\",\"笛\":\"てき,ふえ,う\",\"適\":\"てき,かな\",\"溺\":\"でき,じょう,にょう,いばり,おぼ\",\"哲\":\"てつ,さとい,あきらか,あき,あきら,さと,さとし,さとる,てっ,てつん,のり,よし\",\"徹\":\"てつ,あき,つ,てっ,とおる\",\"撤\":\"てつ\",\"迭\":\"てつ\",\"鉄\":\"てつ,くろがね,けん,てっ\",\"典\":\"てん,でん,ふみ,のり,すけ,つね,の\",\"天\":\"てん,あまつ,あめ,あま,あき,あも,た,たかし,て,なま\",\"展\":\"てん,のぶ,のり,ひろ,ゆき\",\"店\":\"てん,みせ,たな\",\"添\":\"てん,そ,そえ,ぞい\",\"纏\":\"てん,でん,まつ,まと\",\"貼\":\"てん,ちょう,は,つ\",\"転\":\"てん,ころ,まろ,うたた,うつ,くる\",\"点\":\"てん,つ,た,さ,とぼ,とも,ぼち\",\"伝\":\"でん,てん,つた,つだ,づた,つて,つたえ\",\"殿\":\"でん,てん,との,どの,て,どん\",\"田\":\"でん,た,いなか,おか,たん,で,とう,や\",\"電\":\"でん\",\"兎\":\"と,つ,うさぎ\",\"吐\":\"と,は,つ\",\"堵\":\"と,かき\",\"塗\":\"と,ぬ,まみ\",\"妬\":\"と,つ,ねた,そね,つも,ふさ\",\"徒\":\"と,いたずら,あだ,かち\",\"斗\":\"と,とう,ます\",\"杜\":\"と,とう,ず,もり,ふさ,やまなし\",\"渡\":\"と,わた,お,たり,わたな,わたら,わたり\",\"登\":\"とう,と,どう,しょう,ちょう,のぼ,あ,たか,のぼし,のぼり,のり\",\"賭\":\"と,か,かけ\",\"途\":\"と,みち\",\"都\":\"と,つ,みやこ,くに,ず,ち,づめ,みや\",\"砥\":\"し,てい,きい,ち,と,といし,みが\",\"努\":\"ど,つと\",\"度\":\"ど,と,たく,たび,た,のり\",\"土\":\"ど,と,つち,つく,は,ひじ\",\"奴\":\"ど,やつ,やっこ,ぬ\",\"怒\":\"ど,ぬ,いか,おこ\",\"倒\":\"とう,たお,だお,さかさま,さかさ,さかしま\",\"党\":\"とう,なかま,むら\",\"冬\":\"とう,ふゆ\",\"凍\":\"とう,こお,こご,い,し,こおり\",\"刀\":\"とう,かたな,そり,き,ち,と,わき\",\"唐\":\"とう,から,かろ,たん\",\"塔\":\"とう\",\"套\":\"とう,かさ\",\"宕\":\"とう,すぎる\",\"島\":\"とう,しま\",\"嶋\":\"とう,しま\",\"悼\":\"とう,いた\",\"投\":\"とう,な\",\"搭\":\"とう\",\"東\":\"とう,ひがし,あい,あがり,あずま,あづま,こち,さき,しの,とお,はる,ひが,もと\",\"桃\":\"とう,もも,み,もの\",\"棟\":\"とう,むね,むな\",\"盗\":\"とう,ぬす\",\"湯\":\"とう,ゆ\",\"灯\":\"とう,ひ,ほ,ともしび,とも,あかり\",\"燈\":\"とう,ひ,ほ,ともしび,とも,あかり\",\"当\":\"とう,あ,まさ,たい\",\"痘\":\"とう\",\"祷\":\"とう,いの,まつ\",\"等\":\"とう,ひと,など,ら,と,ひ\",\"答\":\"とう,こた,どう\",\"筒\":\"とう,つつ\",\"糖\":\"とう\",\"統\":\"とう,す,のり,むね\",\"到\":\"とう,いた\",\"董\":\"とう,ただ\",\"藤\":\"とう,どう,ふじ,ぞう,と,ふじゅ\",\"討\":\"とう,う\",\"謄\":\"とう\",\"豆\":\"とう,ず,まめ,ど,ま\",\"踏\":\"とう,ふ\",\"逃\":\"とう,に,のが\",\"透\":\"とう,す,とおる\",\"陶\":\"とう,すえ,す\",\"頭\":\"とう,ず,と,あたま,かしら,がしら,かぶり,かみ,がみ,ちゃん,つむり,づ\",\"騰\":\"とう,あが,のぼ\",\"闘\":\"とう,たたか,あらそ,と\",\"働\":\"どう,はたら\",\"動\":\"どう,うご,るぎ\",\"同\":\"どう,おな\",\"堂\":\"どう\",\"導\":\"どう,みちび,みち\",\"憧\":\"しょう,とう,どう,あこが\",\"撞\":\"どう,とう,しゅ,つ\",\"洞\":\"どう,ほら,とう\",\"瞳\":\"どう,とう,ひとみ,あきら\",\"童\":\"どう,わらべ,ぱ\",\"胴\":\"どう\",\"萄\":\"どう,とう\",\"道\":\"どう,とう,みち,いう,さ,じ,ど,みつ,おさむ\",\"銅\":\"どう,あかがね\",\"峠\":\"とうげ\",\"匿\":\"とく,かくま\",\"得\":\"とく,え,う,あつ,てろ\",\"徳\":\"とく,あつ,なる,のり,ゆき,よし\",\"特\":\"とく\",\"督\":\"とく,ただ,ただし\",\"篤\":\"とく,あつ\",\"毒\":\"どく\",\"独\":\"どく,とく,ひと,どいつ,どっ\",\"読\":\"どく,とく,とう,よ,よみ\",\"栃\":\"とち\",\"凸\":\"とつ,でこ\",\"突\":\"とつ,か,つ\",\"届\":\"かい,とど\",\"鳶\":\"えん,とび,とんび\",\"寅\":\"いん,とら,とも,のぶ\",\"酉\":\"ゆう,とり,なが,みのる\",\"屯\":\"とん,たむろ\",\"惇\":\"しゅん,じゅん,とん,あつ,あつし,まこと,とし,つとむ\",\"敦\":\"とん,たい,だん,ちょう,あつ,あつし,つる,のぶ,のり\",\"沌\":\"とん,くら\",\"豚\":\"とん,ぶた\",\"遁\":\"とん,しゅん,のが\",\"頓\":\"とん,とつ,にわか,つまず,とみ,ぬかずく\",\"曇\":\"どん,くも,ど,ずみ\",\"鈍\":\"どん,にぶ,なま,なまく\",\"奈\":\"な,ない,だい,いかん,からなし\",\"那\":\"な,だ,なに,なんぞ,いかん,とも,やす\",\"内\":\"ない,だい,うち,いと,ただ,ち,のち\",\"凪\":\"なぎ,な\",\"薙\":\"てい,ち,な,なぎ,か\",\"謎\":\"めい,べい,なぞ\",\"灘\":\"たん,だん,なだ,せ,だな,なん\",\"捺\":\"なつ,だつ,さ,お\",\"鍋\":\"か,なべ\",\"楢\":\"しゅう,ゆう,なら\",\"馴\":\"じゅん,しゅん,くん,な,したが\",\"縄\":\"じょう,なわ,ただ\",\"南\":\"なん,な,みなみ,なみ,は,みな,みまみ\",\"楠\":\"なん,だん,ぜん,ねん,くす,くすのき,くず,な\",\"軟\":\"なん,やわ\",\"難\":\"なん,かた,がた,むずか,むづか,むつか,にく,な,なに\",\"汝\":\"じょ,なんじ,なれ,い,うぬ,いまし,し,しゃ,な,なむち,まし,みまし\",\"二\":\"に,じ,ふた,ふたたび,おと,つぐ,つぎ,にい,は,ふ,ふたつ,ふだ,わ\",\"尼\":\"に,あま\",\"弐\":\"に,じ,ふた,そえ\",\"匂\":\"にお,おり,こう,さぎ\",\"賑\":\"しん,にぎ\",\"肉\":\"にく,しし\",\"虹\":\"こう,にじ\",\"廿\":\"じゅう,にゅう,にじゅう,はつ\",\"日\":\"にち,じつ,ひ,び,か,あ,あき,いる,く,くさ,こう,す,たち,に,にっ,につ,へ\",\"乳\":\"にゅう,ちち,ち\",\"入\":\"にゅう,じゅ,い,はい,いり,いる,に,の,りり\",\"如\":\"じょ,にょ,ごと,き,ね,ゆき,よし\",\"尿\":\"にょう,ゆばり,いばり,しと\",\"任\":\"にん,まか,さ,とう,ひで\",\"妊\":\"にん,じん,はら,みごも\",\"忍\":\"にん,しの,おし\",\"認\":\"にん,みと,したた\",\"濡\":\"じゅ,にゅ,ぬれ,ぬら,ぬ,うるお\",\"禰\":\"ね,でい,ない\",\"祢\":\"ね,でい,ない\",\"寧\":\"ねい,むし,あき,やす,やすし,よし\",\"猫\":\"びょう,ねこ\",\"熱\":\"ねつ,あつ,あた\",\"年\":\"ねん,とし,ね\",\"念\":\"ねん\",\"捻\":\"ねん,じょう,ね,ねじ,ひね\",\"燃\":\"ねん,も\",\"粘\":\"ねん,ねば\",\"乃\":\"ない,だい,の,あい,すなわ,なんじ,おさむ,お,のり\",\"之\":\"し,の,これ,ゆく,この,ゆき,いたる,あき,つな,ゆみ,くに,のぶ,ひさ,ひで\",\"埜\":\"や,しょ,の\",\"悩\":\"のう,なや,なやみ\",\"濃\":\"のう,こ,の\",\"納\":\"のう,なっ,な,なん,とう,おさ,の,ろ\",\"能\":\"のう,よ,あた,たか,の,のり,よし\",\"脳\":\"のう,どう,のうずる\",\"農\":\"のう,な,の,み\",\"巴\":\"は,ともえ,うずまき,とも\",\"把\":\"は,わ,たば\",\"播\":\"は,ばん,はん,ま,はり\",\"覇\":\"は,はく,はたがしら,はる\",\"杷\":\"は,つか,わ\",\"波\":\"は,なみ,ひら,みな,みなみ,わ\",\"派\":\"は\",\"琶\":\"は,べ,わ\",\"破\":\"は,やぶ,わ\",\"婆\":\"ば,ばば,ばあ\",\"罵\":\"ば,ののし\",\"芭\":\"ば,は\",\"馬\":\"ば,うま,ま,た,ばん,め,も\",\"俳\":\"はい\",\"廃\":\"はい,すた\",\"拝\":\"はい,おが,おろが\",\"排\":\"はい,おし\",\"敗\":\"はい,やぶ\",\"杯\":\"はい,さかずき\",\"盃\":\"はい,さかずき\",\"背\":\"はい,せ,せい,そむ\",\"肺\":\"はい\",\"輩\":\"はい,ばら,やから,やかい,ともがら\",\"配\":\"はい,くば\",\"倍\":\"ばい,べ,ます\",\"培\":\"ばい,つちか\",\"媒\":\"ばい,なこうど\",\"梅\":\"ばい,うめ\",\"煤\":\"ばい,まい,すす\",\"買\":\"ばい,か\",\"売\":\"ばい,う,うり,うる,め\",\"賠\":\"ばい\",\"陪\":\"ばい\",\"這\":\"しゃ,げん,は,むか,この\",\"秤\":\"しょう,ひん,びん,はかり\",\"萩\":\"しゅう,はぎ,は\",\"伯\":\"はく,いき,えき,か,き,は,ひろ\",\"博\":\"はく,ばく,ぐれ,と,はか,ひろ\",\"拍\":\"はく,ひょう\",\"柏\":\"はく,ひゃく,びゃく,かしわ,かい,かし\",\"泊\":\"はく,と,とまり,はつ\",\"白\":\"はく,びゃく,しろ,しら,あき,か,はっ\",\"箔\":\"はく,すだれ\",\"舶\":\"はく\",\"薄\":\"はく,うす,すすき\",\"迫\":\"はく,せま,さこ,せ,せこ,はさ,はさま,はざま\",\"曝\":\"ばく,ほく,ぼく,さら\",\"漠\":\"ばく\",\"爆\":\"ばく,は\",\"縛\":\"ばく,しば\",\"莫\":\"ばく,ぼ,まく,も,ない,くれ,なか,なし\",\"麦\":\"ばく,むぎ\",\"函\":\"かん,はこ,い\",\"箱\":\"そう,はこ\",\"箸\":\"ちょ,ちゃく,はし\",\"肇\":\"ちょう,じょう,とう,はじ,はじめ,とし,ただし,はつ\",\"筈\":\"かつ,はず,やはず\",\"幡\":\"まん,はん,ばん,ほん,はた,は,わた\",\"肌\":\"き,はだ\",\"畑\":\"はた,はたけ,ばたけ,かま,まま\",\"畠\":\"はたけ,はた,はな\",\"八\":\"はち,はつ,や,やっ,よう,な,は,はっ,やち,やつ\",\"鉢\":\"はち,はつ\",\"発\":\"はつ,ほつ,た,あば,おこ,つか,はな,ば,わ\",\"髪\":\"はつ,かみ,がた,ひげ\",\"伐\":\"ばつ,はつ,か,ぼち,き,そむ,う\",\"罰\":\"ばつ,ばち,はつ,ばっ\",\"抜\":\"ばつ,はつ,はい,ぬ,ぬき\",\"閥\":\"ばつ\",\"鳩\":\"きゅう,く,はと,あつ,やす\",\"塙\":\"かく,こう,はなわ,かた,はな\",\"隼\":\"しゅん,じゅん,はやぶさ,はや\",\"伴\":\"はん,ばん,ともな,とも\",\"判\":\"はん,ばん,わか\",\"半\":\"はん,なか,は\",\"反\":\"はん,ほん,たん,ほ,そ,かえ,そり,た\",\"帆\":\"はん,ほ\",\"搬\":\"はん\",\"斑\":\"はん,ふ,まだら,い\",\"板\":\"はん,ばん,いた\",\"氾\":\"はん,ひろ\",\"汎\":\"はん,ぶ,ふう,ほう,ほん,ただよ,ひろ,ひろし,みな\",\"版\":\"はん\",\"犯\":\"はん,ぼん,おか\",\"班\":\"はん\",\"畔\":\"はん,あぜ,くろ,ほとり,ぐろ\",\"繁\":\"はん,しげ\",\"般\":\"はん\",\"藩\":\"はん\",\"販\":\"はん\",\"範\":\"はん,のり\",\"煩\":\"はん,ぼん,わずら,うるさ\",\"頒\":\"はん,わ\",\"飯\":\"はん,めし,い,いい,いり,え\",\"挽\":\"ばん,ひ,ひき\",\"晩\":\"ばん\",\"番\":\"ばん,つが,は,ま\",\"盤\":\"ばん,ち,わ\",\"磐\":\"ばん,はん,いわ,いわお,わ\",\"蕃\":\"ばん,はん,しげ,しげる,ば\",\"蛮\":\"ばん,えびす\",\"卑\":\"ひ,いや\",\"否\":\"ひ,いな,いや\",\"妃\":\"ひ,きさき,き,ぴ,み\",\"庇\":\"ひ,ひさし,おお,かば\",\"彼\":\"ひ,かれ,かの,か,その\",\"悲\":\"ひ,かな\",\"扉\":\"ひ,とびら\",\"批\":\"ひ\",\"披\":\"ひ\",\"斐\":\"ひ,い,あや\",\"比\":\"ひ,くら,い,ぴっ\",\"泌\":\"ひつ,ひ\",\"疲\":\"ひ,つか,づか\",\"皮\":\"ひ,かわ\",\"碑\":\"ひ,いしぶみ\",\"秘\":\"ひ,ひそ,かく\",\"緋\":\"ひ,あけ,あか\",\"罷\":\"ひ,まか,や\",\"肥\":\"ひ,こ,こえ,ふと,い,こい,ひえ\",\"被\":\"ひ,こうむ,おお,かぶ,ぎぬ\",\"費\":\"ひ,つい\",\"避\":\"ひ,さ,よ\",\"非\":\"ひ,あら\",\"飛\":\"ひ,と,あす,とび\",\"樋\":\"とう,ひ,とい,て,と,とよ,とわ\",\"備\":\"び,そな,つぶさ,びっ,びん\",\"尾\":\"び,お\",\"微\":\"び,かす,み\",\"枇\":\"び,ひ\",\"毘\":\"ひ,び,たす\",\"琵\":\"び,ひ\",\"眉\":\"び,み,まゆ\",\"美\":\"び,み,うつく,はる,よし,よしみ,り\",\"鼻\":\"び,はな\",\"柊\":\"しゅ,しゅう,ひいらぎ\",\"匹\":\"ひつ,ひき\",\"疋\":\"ひき,しょ,そ,ひつ,あし\",\"彦\":\"げん,ひこ,よし,こ,ひろ,やす\",\"膝\":\"しつ,ひざ\",\"菱\":\"りょう,ひし\",\"肘\":\"ちゅう,ひじ\",\"必\":\"ひつ,かなら\",\"畢\":\"ひつ,おわ,あみ,ことごとく\",\"筆\":\"ひつ,ふで,はじめ\",\"桧\":\"かい,ひのき,ひ\",\"姫\":\"き,ひめ\",\"媛\":\"えん,ひめ\",\"紐\":\"ちゅう,じゅう,ひも\",\"百\":\"ひゃく,びゃく,もも,お,ど,どう,なり,ひゃっ,ひゅく,も,もんど,ゆう\",\"俵\":\"ひょう,たわら\",\"彪\":\"ひょう,ひゅう,あや,たけし,たけ,あきら,かおる,たけき,つよし,とら\",\"標\":\"ひょう,しるべ,しるし,しべ\",\"氷\":\"ひょう,こおり,ひ,こお,すい\",\"漂\":\"ひょう,ただよ\",\"瓢\":\"ひょう,ひさご,ふくべ\",\"票\":\"ひょう\",\"表\":\"ひょう,おもて,あらわ,あら\",\"評\":\"ひょう\",\"豹\":\"ひょう,ほう\",\"廟\":\"びょう,みょう,たまや,みたまや,やしろ\",\"描\":\"びょう,えが,か\",\"病\":\"びょう,へい,や,やまい\",\"秒\":\"びょう\",\"苗\":\"びょう,みょう,なえ,なわ,ねい,のら,みう,みつ\",\"品\":\"ひん,ほん,しな\",\"彬\":\"ひん,ふん,うるわ,あき,あきら,よし\",\"浜\":\"ひん,はま\",\"瀕\":\"ひん,ほとり\",\"貧\":\"ひん,びん,まず\",\"賓\":\"ひん,まろうど,したがう\",\"頻\":\"ひん,しき\",\"敏\":\"びん,さとい,さとし,ちょう,とし,び\",\"瓶\":\"びん,へい,かめ,べ,ぺ\",\"不\":\"ふ,ぶ\",\"付\":\"ふ,つ,づ,づけ,つき,づき,つけ\",\"夫\":\"ふ,ふう,ぶ,おっと,それ,お,と,ゆう,よ\",\"婦\":\"ふ,よめ,ね\",\"富\":\"ふ,ふう,と,とみ,とん,ふっ\",\"冨\":\"ふ,ふう,と,とみ\",\"布\":\"ふ,ほ,ぬの,し,きれ,う,の\",\"府\":\"ふ,い,う,お,はん\",\"怖\":\"ふ,ほ,こわ,お,おそ\",\"扶\":\"ふ,たす\",\"敷\":\"ふ,し,しき,にゅう\",\"斧\":\"ふ,おの\",\"普\":\"ふ,あまね,あまねし,しん,ひろ\",\"浮\":\"ふ,う,うき\",\"父\":\"ふ,ちち\",\"符\":\"ふ\",\"腐\":\"ふ,くさ\",\"膚\":\"ふ,はだ\",\"芙\":\"ふ,はす\",\"譜\":\"ふ\",\"負\":\"ふ,ま,お\",\"賦\":\"ふ,ぶ,うた\",\"赴\":\"ふ,おもむ\",\"阜\":\"ふ,ふう,おか\",\"附\":\"ふ,つ,ずき,づけ\",\"侮\":\"ぶ,あなど,あなず\",\"撫\":\"ぶ,ふ,な,なで,なでし,む\",\"武\":\"ぶ,む,たけ,う,お,たけし,たけん,ん\",\"舞\":\"ぶ,ま,まい\",\"葡\":\"ぶ,ほ\",\"蕪\":\"ぶ,む,かぶ,かぶら,あれる\",\"部\":\"ぶ,べ,とり,ふ,ぺ,ま\",\"封\":\"ふう,ほう\",\"楓\":\"ふう,かえで\",\"風\":\"ふう,ふ,かぜ,かざ,い,え\",\"葺\":\"しゅう,あし,ふ,ふき\",\"蕗\":\"ろ,る,ふき\",\"伏\":\"ふく,ふ,ふし,ふせ\",\"副\":\"ふく,そい,そえ\",\"復\":\"ふく,また\",\"幅\":\"ふく,はば\",\"服\":\"ふく,はっ,はつ,はら\",\"福\":\"ふく,とし,とみ,ふ,ふき,ふっ,ぼく,よし\",\"腹\":\"ふく,はら\",\"複\":\"ふく\",\"覆\":\"ふく,おお,くつがえ\",\"淵\":\"えん,かく,こう,ふち,かた,はなわ\",\"払\":\"ふつ,ひつ,ほつ,はら,ばら,はらい\",\"沸\":\"ふつ,わ\",\"仏\":\"ぶつ,ふつ,ほとけ\",\"物\":\"ぶつ,もつ,もの\",\"分\":\"ぶん,ふん,ぶ,わ,いた,わけ\",\"吻\":\"ふん,ぶん,くちわき,くちさき\",\"噴\":\"ふん,ふ\",\"墳\":\"ふん\",\"憤\":\"ふん,いきどお\",\"焚\":\"ふん,ほん,はん,た,や,やきがり\",\"奮\":\"ふん,ふる\",\"粉\":\"ふん,でしめとる,こ,こな\",\"紛\":\"ふん,まぎ\",\"雰\":\"ふん\",\"文\":\"ぶん,もん,ふみ,あや,かざり,ふ,も\",\"聞\":\"ぶん,もん,き\",\"丙\":\"へい,ひのえ\",\"併\":\"へい,あわ\",\"兵\":\"へい,ひょう,つわもの,へ\",\"塀\":\"へい,べい\",\"幣\":\"へい,ぬさ,しで\",\"平\":\"へい,びょう,ひょう,たい,ひら,たいら,たら,はち,ひ,ひとし,へ,へん\",\"弊\":\"へい\",\"柄\":\"へい,がら,え,つか,から,ら\",\"並\":\"へい,ほう,な,なみ,なら,なび\",\"蔽\":\"へい,へつ,ふつ,おお\",\"閉\":\"へい,と,し,た,へ\",\"陛\":\"へい\",\"米\":\"べい,まい,めえとる,こめ,よね,は,べ,まべ,め,よ,よな,よの,よま\",\"頁\":\"けつ,ぺえじ,おおがい,かしら\",\"壁\":\"へき,かべ\",\"癖\":\"へき,くせ\",\"碧\":\"へき,ひゃく,みどり,あお,たま\",\"別\":\"べつ,わか,わ,べっ\",\"瞥\":\"べつ,へつ\",\"蔑\":\"べつ,ないがしろ,なみ,くらい,さげす\",\"偏\":\"へん,かたよ\",\"変\":\"へん,か\",\"片\":\"へん,かた\",\"篇\":\"へん\",\"編\":\"へん,あ\",\"辺\":\"へん,あた,ほと,べ,なべ\",\"返\":\"へん,かえ\",\"遍\":\"へん,あまね\",\"便\":\"べん,びん,たよ\",\"勉\":\"べん,つと,ひこ,やつ\",\"娩\":\"べん\",\"弁\":\"べん,へん,かんむり,わきま,わ,はなびら,あらそ,べ\",\"鞭\":\"べん,へん,むち,むちうつ\",\"保\":\"ほ,ほう,たも,う,お,ぶ,もり,やす,やすし\",\"舗\":\"ほ,き\",\"圃\":\"ほ,ふ,はたけ,にわ\",\"捕\":\"ほ,と,とら,つか\",\"歩\":\"ほ,ぶ,ふ,ある,あゆ,あ,ゆき,ゆみ\",\"甫\":\"ほ,ふ,はじ,はじめ,とし,なみ,すけ,よし\",\"補\":\"ほ,おぎな\",\"輔\":\"ほ,ふ,たす,すけ,たすく,ゆう\",\"穂\":\"すい,ほ,お,こう,のり,ほい\",\"募\":\"ぼ,つの\",\"墓\":\"ぼ,はか\",\"慕\":\"ぼ,した\",\"戊\":\"ぼ,ぼう,つちのえ\",\"暮\":\"ぼ,く,ぐらし,ぐれ,ぽ\",\"母\":\"ぼ,はは,も\",\"簿\":\"ぼ\",\"菩\":\"ぼ\",\"倣\":\"ほう,なら\",\"俸\":\"ほう\",\"包\":\"ほう,つつ,くる,お,かね\",\"報\":\"ほう,むく\",\"奉\":\"ほう,ぶ,たてまつ,まつ,とも,やす\",\"宝\":\"ほう,たから,ほ\",\"峰\":\"ほう,みね,ね,ぶ,ほ\",\"峯\":\"ほう,みね,ね\",\"崩\":\"ほう,くず\",\"抱\":\"ほう,だ,いだ,かか,たば\",\"捧\":\"ほう,ささ\",\"放\":\"ほう,はな,っぱな,こ,はなれ\",\"方\":\"ほう,かた,がた,から,な,なた,ふさ,まさ,みち,も,わ\",\"朋\":\"ほう,とも\",\"法\":\"ほう,はっ,ほっ,ふらん,のり,ほ\",\"泡\":\"ほう,あわ\",\"砲\":\"ほう,づつ\",\"縫\":\"ほう,ぬ,ぬい\",\"胞\":\"ほう\",\"芳\":\"ほう,かんば,お,かおる,は,ほ,みち,やす,よし\",\"萌\":\"ほう,も,きざ,めばえ,もえ,きざし\",\"蓬\":\"ほう,ぶ,よもぎ\",\"蜂\":\"ほう,はち,ほ\",\"褒\":\"ほう,ほ\",\"訪\":\"ほう,おとず,たず,と,わ\",\"豊\":\"ほう,ぶ,ゆた,とよ,て,で,と,ひろし,ふう,ぶん,ほ,ゆたか\",\"邦\":\"ほう,くに\",\"鋒\":\"ほう,きっさき,とかり,ほこさき\",\"飽\":\"ほう,あ,あき,あく\",\"鳳\":\"ほう,ふう,おおとり,ふげ\",\"鵬\":\"ほう,おおとり\",\"乏\":\"ぼう,とぼ,とも\",\"亡\":\"ぼう,もう,な,ほろ\",\"傍\":\"ぼう,かたわ,わき,おか,はた,そば,び\",\"剖\":\"ぼう\",\"坊\":\"ぼう,ぼっ\",\"妨\":\"ぼう,さまた\",\"帽\":\"ぼう,もう,ずきん,おお\",\"忘\":\"ぼう,わす\",\"忙\":\"ぼう,もう,いそが,せわ,おそ,うれえるさま\",\"房\":\"ぼう,ふさ,お,のぶ,わ\",\"暴\":\"ぼう,ばく,あば\",\"望\":\"ぼう,もう,のぞ,もち,み,も\",\"某\":\"ぼう,それがし,なにがし\",\"棒\":\"ぼう\",\"冒\":\"ぼう,おか\",\"紡\":\"ぼう,つむ\",\"肪\":\"ぼう\",\"膨\":\"ぼう,ふく\",\"謀\":\"ぼう,む,はか,たばか,はかりごと\",\"貌\":\"ぼう,ばく,かたち,かたどる\",\"貿\":\"ぼう\",\"防\":\"ぼう,ふせ,あた,う,ほう\",\"北\":\"ほく,きた,きら,ほう,ほっ,ほつ\",\"僕\":\"ぼく,しもべ\",\"卜\":\"ぼく,うらな,うらない,うら\",\"墨\":\"ぼく,すみ,すの\",\"撲\":\"ぼく\",\"朴\":\"ぼく,ほう,ほお,えのき\",\"牧\":\"ぼく,まき,ま,まい,もく\",\"睦\":\"ぼく,もく,むつ,ちか,よし,あつ,む,むね\",\"勃\":\"ぼつ,ほつ,おこ,にわかに\",\"没\":\"ぼつ,もつ,おぼ,しず,ない\",\"殆\":\"たい,さい,ほとほと,ほとん,あやうい\",\"堀\":\"くつ,ほり,ほっ\",\"幌\":\"こう,ほろ,とばり\",\"奔\":\"ほん,はし\",\"本\":\"ほん,もと,まと,ごう\",\"翻\":\"ほん,はん,ひるがえ\",\"凡\":\"ぼん,はん,およ,おうよ,すべ,なみ,ひろ,みな\",\"盆\":\"ぼん\",\"摩\":\"ま,さす,す\",\"磨\":\"ま,みが,す,おさむ\",\"魔\":\"ま\",\"麻\":\"ま,まあ,あさ,あ,あざ,お\",\"埋\":\"まい,う,うず,い\",\"妹\":\"まい,いもうと,す,せ,も\",\"昧\":\"まい,ばい,くら,むさぼ\",\"枚\":\"まい,ばい,ひら\",\"毎\":\"まい,ごと,つね\",\"哩\":\"り,まいる\",\"槙\":\"てん,しん,まき,こずえ\",\"幕\":\"まく,ばく,とばり\",\"膜\":\"まく\",\"枕\":\"ちん,しん,まくら\",\"柾\":\"まさ,まさめ,まさき\",\"鱒\":\"そん,せん,ざん,ます\",\"亦\":\"えき,やく,また\",\"俣\":\"また,ばた\",\"又\":\"ゆう,また,やす\",\"抹\":\"まつ\",\"末\":\"まつ,ばつ,すえ,うら,うれ\",\"沫\":\"まつ,ばつ,あわ,しぶき,つばき\",\"迄\":\"きつ,まで,およ\",\"繭\":\"けん,まゆ,きぬ\",\"麿\":\"まろ,ま\",\"万\":\"まん,ばん,よろず,かず,ま,ゆる\",\"慢\":\"まん\",\"満\":\"まん,ばん,み,ま,みち,みつ,みつる\",\"漫\":\"まん,みだり,そぞ\",\"蔓\":\"まん,ばん,はびこ,つる\",\"味\":\"み,あじ\",\"未\":\"み,び,いま,ま,ひつじ\",\"魅\":\"み\",\"巳\":\"し,み\",\"箕\":\"き,み,みの\",\"岬\":\"こう,みさき,さき\",\"密\":\"みつ,ひそ\",\"蜜\":\"みつ,びつ\",\"湊\":\"そう,みなと,あつ\",\"蓑\":\"さ,さい,みの\",\"稔\":\"ねん,じん,にん,みの,みのり,とし,なる,なり,みのる,ね,み\",\"脈\":\"みゃく,すじ\",\"妙\":\"みょう,びょう,たえ\",\"民\":\"みん,たみ,ひと,み\",\"眠\":\"みん,ねむ,ね\",\"務\":\"む,つと,つかさ,み\",\"夢\":\"む,ぼう,ゆめ,くら\",\"無\":\"む,ぶ,な\",\"牟\":\"ぼう,む\",\"矛\":\"む,ぼう,ほこ\",\"霧\":\"む,ぼう,ぶ,きり\",\"椋\":\"りょう,むく,ぐら\",\"婿\":\"せい,むこ\",\"娘\":\"じょう,むすめ,こ\",\"冥\":\"めい,みょう,くら\",\"名\":\"めい,みょう,な,と\",\"命\":\"めい,みょう,いのち\",\"明\":\"めい,みょう,みん,あ,あか,あき,あきら,あけ,あす,きら,け,さや,さやか,とし,はる,み,め\",\"盟\":\"めい\",\"迷\":\"めい,まよ\",\"銘\":\"めい,たか,み,め\",\"鳴\":\"めい,な,なり,なる\",\"姪\":\"てつ,ちつ,じち,いつ,いち,めい,おい\",\"滅\":\"めつ,ほろ\",\"免\":\"めん,まぬか,まぬが,め\",\"綿\":\"めん,わた,う\",\"面\":\"めん,べん,おも,おもて,つら,お,ずら,ほおつき,も\",\"麺\":\"めん,べん,むぎこ\",\"模\":\"も,ぼ,がみ\",\"茂\":\"も,しげ,うむさ,き,し,つとむ,む,もて\",\"妄\":\"もう,ぼう,みだ\",\"孟\":\"もう,ぼう,みょう,かしら,たけし,たけ,はる,はじめ,つとむ,おさ,はい\",\"毛\":\"もう,け,めん,も\",\"猛\":\"もう,たけ,たけし,たける\",\"盲\":\"もう,めくら\",\"網\":\"もう,あみ,あ,ずな\",\"耗\":\"もう,こう\",\"蒙\":\"もう,ぼう,こうむ,おお,くら\",\"儲\":\"ちょ,もう,もうけ,たくわ\",\"木\":\"ぼく,もく,き,こ,ぐ,も,もと\",\"黙\":\"もく,ぼく,だま,もだ\",\"目\":\"もく,ぼく,め,ま,さかん,さがん,さっか,さつか\",\"勿\":\"もち,ぶつ,ぼつ,なか,なし\",\"餅\":\"へい,ひょう,もち,もちい\",\"尤\":\"ゆう,もっと,とが\",\"戻\":\"れい,もど\",\"籾\":\"もみ\",\"貰\":\"せい,しゃ,もら\",\"問\":\"もん,と,とん,はる\",\"紋\":\"もん,あや\",\"門\":\"もん,かど,と,じょう,も,ゆき\",\"匁\":\"もんめ,め\",\"也\":\"や,え,なり,か,また,し\",\"冶\":\"や,い,じ\",\"夜\":\"や,よ,よる\",\"耶\":\"や,じゃ,か\",\"野\":\"や,しょ,の,ずけ,つけ,ぬ\",\"弥\":\"み,び,や,いや,いよ,わた,わたる,みつ,ひろ,よ\",\"矢\":\"し,や\",\"厄\":\"やく\",\"役\":\"やく,えき,ちゃく\",\"約\":\"やく,つづ,つづま\",\"薬\":\"やく,くすり,み\",\"訳\":\"やく,わけ\",\"躍\":\"やく,おど,おどり\",\"靖\":\"せい,じょう,やす,のぶ,やすし,しず,おさむ,きよし\",\"柳\":\"りゅう,やなぎ,なぎ,や,やい,やぎ,やな,やない\",\"愉\":\"ゆ,たの,ゆう\",\"油\":\"ゆ,ゆう,あぶら\",\"癒\":\"ゆ,い,いや\",\"諭\":\"ゆ,さと,ゆう\",\"輸\":\"ゆ,しゅ\",\"唯\":\"ゆい,い,ただ,ゆ\",\"佑\":\"ゆう,う,たす,すけ,たすく,ゆ\",\"優\":\"ゆう,う,やさ,すぐ,まさ,ゆ,よし\",\"勇\":\"ゆう,いさ,お,はや\",\"友\":\"ゆう,とも,う,ど,ゆ\",\"宥\":\"ゆう,なだ,ゆる\",\"幽\":\"ゆう,ふか,かす,くら,しろ\",\"悠\":\"ゆう,ゆ\",\"憂\":\"ゆう,うれ,う,ゆ\",\"有\":\"ゆう,う,あ,あら,あり,ある,くに,なお,ゆ\",\"柚\":\"ゆ,ゆう,じく,ゆず\",\"湧\":\"ゆう,よう,ゆ,わ,わき,わく\",\"猶\":\"ゆう,ゆ,なお\",\"由\":\"ゆ,ゆう,ゆい,よし,よ\",\"祐\":\"ゆう,う,たす,すけ,さち,よし,たすく,ひろ,ひろし,まさ\",\"裕\":\"ゆう,すけ,のり,ひろ,ひろし,やす,ゆ,ゆたか\",\"誘\":\"ゆう,さそ,いざな\",\"遊\":\"ゆう,ゆ,あそ,あす,う\",\"邑\":\"ゆう,むら,お,おう,おお,くに,さと\",\"郵\":\"ゆう\",\"雄\":\"ゆう,お,おす,おん,かつ,たけ,つよし,ゆ,よう\",\"融\":\"ゆう,と,あきら\",\"夕\":\"せき,ゆう,ゆ\",\"予\":\"よ,しゃ,あらかじ\",\"余\":\"よ,あま,あんま,あまる\",\"与\":\"よ,あた,あずか,くみ,ともに,とも,ゆ\",\"誉\":\"よ,ほま,ほ,え,たか,たけ,ほまれ,ほめ,ほん\",\"輿\":\"よ,かご,こし\",\"預\":\"よ,あず\",\"傭\":\"よう,ちょう,やと,あた,ひと\",\"幼\":\"よう,おさな,うぶ,わか\",\"妖\":\"よう,あや,なま,わざわ\",\"容\":\"よう,い,かた,ひろ,まさ\",\"庸\":\"よう,つね,のぶ,やす\",\"揚\":\"よう,あ,あがり\",\"揺\":\"よう,ゆ,うご\",\"擁\":\"よう\",\"曜\":\"よう,てる\",\"楊\":\"よう,やなぎ,やな\",\"様\":\"よう,しょう,さま,さん\",\"洋\":\"よう,なだ,ひろ,ひろし,よ,よし\",\"溶\":\"よう,と\",\"用\":\"よう,もち,たから\",\"窯\":\"よう,かま\",\"羊\":\"よう,ひつじ,よ\",\"耀\":\"よう,かがや,ひかり,あかる\",\"葉\":\"よう,は,よ,わ\",\"蓉\":\"よう,はす,よ\",\"要\":\"よう,い,かなめ,とし\",\"謡\":\"よう,うた\",\"踊\":\"よう,おど\",\"遥\":\"よう,はる\",\"陽\":\"よう,ひ,あき,あきら,あけ,はる,ひろ,やん,よ\",\"養\":\"よう,りょう,やしな,や\",\"抑\":\"よく,おさ\",\"欲\":\"よく,ほっ,ほ\",\"沃\":\"よう,よく,おく,そそ\",\"浴\":\"よく,あ,えき,さこ\",\"翌\":\"よく\",\"翼\":\"よく,つばさ\",\"淀\":\"てん,でん,よど\",\"羅\":\"ら,うすもの\",\"螺\":\"ら,にし,にな\",\"裸\":\"ら,はだか\",\"来\":\"らい,たい,く,きた,き,こ,くり,くる,ごろ,さ\",\"頼\":\"らい,たの,たよ,よち,より\",\"雷\":\"らい,かみなり,いかずち,いかづち\",\"洛\":\"らく\",\"絡\":\"らく,から\",\"落\":\"らく,お,おち\",\"酪\":\"らく\",\"乱\":\"らん,ろん,みだ,おさ,わた,ら\",\"卵\":\"らん,たまご\",\"嵐\":\"らん,あらし,ぞれ\",\"欄\":\"らん,てすり\",\"濫\":\"らん,みだ\",\"藍\":\"らん,あい\",\"蘭\":\"らん,ら,か,あららぎ\",\"覧\":\"らん,み\",\"利\":\"り,き,かが,と,とし,のり,み,りい\",\"吏\":\"り,さと,し\",\"履\":\"り,は\",\"李\":\"り,すもも,もも,い\",\"梨\":\"り,なし,か\",\"理\":\"り,ことわり,あや,おさむ,さと,さとる,ただ,ただし,とおる,に,のり,ひ,まこと,まさ,まさし,まろ,みち,よし\",\"璃\":\"り,あき\",\"痢\":\"り\",\"裏\":\"り,うら\",\"裡\":\"り,うち,うら\",\"里\":\"り,さと,さ\",\"離\":\"り,はな\",\"陸\":\"りく,ろく,おか,くが,たち,みち,む,むつ\",\"律\":\"りつ,りち,れつ,たかし,のり\",\"率\":\"そつ,りつ,しゅつ,ひき\",\"立\":\"りつ,りゅう,りっとる,た,たて,だ,たち,たっ,たつ,だて,つい\",\"掠\":\"りゃく,りょう,かす,ぐら\",\"略\":\"りゃく,ほぼ,はぶ,おか,おさ,はかりごと,はか\",\"劉\":\"りゅう,る,ころ,らう,のぶ,みずち\",\"流\":\"りゅう,る,なが,な,ながれ,めぐる\",\"溜\":\"りゅう,た,たま,したた,たまり,ため\",\"琉\":\"りゅう,る\",\"留\":\"りゅう,る,と,とど,るうぶる,とめ\",\"硫\":\"りゅう\",\"粒\":\"りゅう,つぶ\",\"隆\":\"りゅう,お,たか,たかし\",\"竜\":\"りゅう,りょう,ろう,たつ,いせ,りう\",\"龍\":\"りゅう,りょう,ろう,たつ,りゅ\",\"侶\":\"りょ,ろ,とも\",\"慮\":\"りょ,おもんぱく,おもんぱか,ぜ\",\"旅\":\"りょ,たび\",\"虜\":\"りょ,ろ,とりこ,とりく\",\"了\":\"りょう,さとる\",\"亮\":\"りょう,あきらか,あき,すけ,まこと,あきら,よし,きょう,たすく,ふさ\",\"僚\":\"りょう\",\"両\":\"りょう,てる,ふたつ,もろ\",\"凌\":\"りょう,しの\",\"寮\":\"りょう\",\"料\":\"りょう\",\"梁\":\"りょう,はり,うつばり,うちばり,やな,はし\",\"涼\":\"りょう,すず,うす,ひや,まことに,りょ\",\"猟\":\"りょう,かり,か\",\"療\":\"りょう\",\"瞭\":\"りょう,あきらか\",\"稜\":\"りょう,ろう,いつ,かど\",\"糧\":\"りょう,ろう,かて\",\"良\":\"りょう,よ,い,じ,なが,まこと,よし,ら,りょ,ろう\",\"諒\":\"りょう,あきら,まことに,あき,まさ,まこと\",\"遼\":\"りょう,はるか\",\"量\":\"りょう,はか,かず\",\"陵\":\"りょう,みささぎ\",\"領\":\"りょう,えり,よう,よし\",\"力\":\"りょく,りき,りい,ちから,じから,つとむ\",\"緑\":\"りょく,ろく,みどり\",\"倫\":\"りん,とも,のり,ひとし,ひろ,みち\",\"厘\":\"りん\",\"林\":\"りん,はやし,し\",\"淋\":\"りん,さび,さみ\",\"琳\":\"りん\",\"臨\":\"りん,のぞ,み\",\"輪\":\"りん,わ,なわ,も\",\"隣\":\"りん,とな,となり,ちか\",\"鱗\":\"りん,うろこ,こけ,こけら\",\"麟\":\"りん\",\"瑠\":\"る,りゅう,るり\",\"塁\":\"るい,らい,すい,とりで,る\",\"涙\":\"るい,れい,なみだ\",\"累\":\"るい\",\"類\":\"るい,たぐ\",\"令\":\"れい,のり,りょう,れ\",\"伶\":\"れい,りょう,わざおぎ,れ\",\"例\":\"れい,たと\",\"冷\":\"れい,つめ,ひ,さ\",\"励\":\"れい,はげ\",\"嶺\":\"れい,りょう,みね,ね\",\"怜\":\"れい,れん,りょう,あわ,さと,さとし\",\"玲\":\"れい,たま,あきら,あき,りょう,れ\",\"礼\":\"れい,らい,あや,なり,のり,ひろし,れ\",\"鈴\":\"れい,りん,すず,ず\",\"隷\":\"れい,したが,しもべ\",\"零\":\"れい,ぜろ,こぼ\",\"霊\":\"れい,りょう,たま\",\"麗\":\"れい,うるわ,うら,ま,よし,り\",\"齢\":\"れい,よわい,とし\",\"暦\":\"れき,りゃく,こよみ\",\"歴\":\"れき,れっき\",\"列\":\"れつ,れ,れっ\",\"劣\":\"れつ,おと\",\"烈\":\"れつ,はげ,やす\",\"裂\":\"れつ,さ,ぎ\",\"廉\":\"れん,きよ\",\"恋\":\"れん,こ,こい\",\"憐\":\"れん,あわ\",\"漣\":\"れん,らん,さざなみ\",\"煉\":\"れん,ね\",\"簾\":\"れん,すだれ,す,みす\",\"練\":\"れん,ね,ねり\",\"蓮\":\"れん,はす,はちす\",\"連\":\"れん,つら,つ,づ,ずれ,つれ,むらじ,れ\",\"錬\":\"れん,ね\",\"呂\":\"ろ,りょ,せぼね,とも,なが\",\"魯\":\"ろ,おろか\",\"櫓\":\"ろ,やぐら,おおだて\",\"炉\":\"ろ,いろり\",\"賂\":\"ろ,まいな\",\"路\":\"ろ,る,じ,みち\",\"露\":\"ろ,ろう,つゆ,や,ゆ\",\"労\":\"ろう,いたわ,いた,ねぎら,つか\",\"廊\":\"ろう\",\"弄\":\"ろう,る,いじく,いじ,ひねく,たわむ,もてあそ\",\"朗\":\"ろう,ほが,あき,あきら,お,さえ,ろ\",\"楼\":\"ろう,たかどの\",\"浪\":\"ろう,なに,なみ\",\"漏\":\"ろう,も\",\"狼\":\"ろう,おおかみ\",\"老\":\"ろう,お,ふ,えび,おい,び\",\"郎\":\"ろう,りょう,おとこ,いら,お,とう,もん,ろ,ろお\",\"六\":\"ろく,りく,む,むっ,むい,く,むつ,ろっ,ろつ\",\"麓\":\"ろく,ふもと\",\"禄\":\"ろく,さいわ,ふち,とし,よし\",\"肋\":\"ろく,あばら\",\"録\":\"ろく,しる,と\",\"論\":\"ろん,あげつら\",\"倭\":\"わ,い,やまと,したが,まさ,やす\",\"和\":\"わ,お,か,やわ,なご,あ,あい,いず,かず,かつ,かつり,かづ,たけ,ち,とも,な,にぎ,まさ,やす,よし,より,わだこ,わっ\",\"話\":\"わ,はな,はなし\",\"賄\":\"わい,まかな\",\"脇\":\"きょう,わき,わけ\",\"惑\":\"わく,まど\",\"枠\":\"わく\",\"鷲\":\"しゅう,じゅ,わし,す,わ,わせ\",\"亙\":\"こう,かん,わた,もと,のぶ\",\"亘\":\"こう,かん,せん,わた,もと,のぶ,とうる,わたる,ひさし\",\"詫\":\"た,わび,かこつ,わ,たく\",\"藁\":\"こう,わら\",\"蕨\":\"けつ,わらび\",\"椀\":\"わん,はち\",\"湾\":\"わん,いりえ\",\"碗\":\"わん,こばち\",\"腕\":\"わん,うで\",\"丼\":\"とん,たん,しょう,せい,どんぶり\",\"乘\":\"じょう,の\",\"亞\":\"あ,つ\",\"佛\":\"ぶつ,ふつ,ほとけ,さらぎ\",\"侑\":\"ゆう,う,すす,たす,あつむ,すすむ,ゆき,ゆ\",\"來\":\"らい,たい,く,きた,き\",\"俐\":\"り,かしこ\",\"傲\":\"ごう,おご,あなど\",\"傳\":\"てん,でん,つた,つて\",\"僞\":\"ぎ,か,いつわ,にせ\",\"價\":\"か,け,あたい\",\"儉\":\"けん,つま,つづまやか\",\"兒\":\"じ,に,げい,こ,ちご\",\"凉\":\"りょう,すず,うす,ひや,まことに\",\"凛\":\"りん,きびし\",\"凰\":\"こう,おう,おおとり\",\"刹\":\"せち,せつ,さつ\",\"剩\":\"じょう,あまつさえ,あま\",\"劍\":\"けん,つるぎ\",\"勁\":\"けい,つよ\",\"勳\":\"くん,いさお,いさ\",\"卷\":\"かん,けん,ま,まき\",\"哺\":\"ほ,はぐく,ふく\",\"單\":\"たん,ひとえ\",\"喩\":\"ゆ,たと,さと\",\"嗅\":\"きゅう,か\",\"嘲\":\"ちょう,とう,あざけ\",\"嚴\":\"げん,ごん,おごそ,きび,いか,いつくし\",\"圈\":\"けん,かこ\",\"國\":\"こく,くに,こ\",\"圓\":\"えん,まる,まど,まろ,つぶら\",\"團\":\"だん,とん,かたまり,まる\",\"毀\":\"き,こぼ,こわ,そし,やぶ\",\"壞\":\"かい,え,こわ,やぶ\",\"壘\":\"るい,らい,すい,とりで\",\"壯\":\"そう,さかん,たけし\",\"壽\":\"じゅ,す,しゅう,ことぶき,ことぶ,ことほ,かず,じ,とし,ひさ,ひさし\",\"奎\":\"けい,き\",\"奧\":\"おう,おく,くま\",\"奬\":\"しょう,そう,すす\",\"孃\":\"じょう,むすめ\",\"實\":\"じつ,しつ,み,みの,まこと,みち,さな,さね,みつ\",\"寢\":\"しん,ね,い,みたまや,や\",\"將\":\"しょう,そう,まさ,はた,ひきい,もって,まさる\",\"專\":\"せん,もっぱ\",\"峽\":\"きょう,こう,はざま,かい\",\"崚\":\"りょう\",\"巖\":\"がん,いわ,いわお,けわ,よし\",\"巫\":\"ふ,みこ,かんなぎ\",\"已\":\"い,や,すで,のみ,はなはだ,み\",\"帶\":\"たい,お,おび\",\"廣\":\"こう,ひろ\",\"廳\":\"ちょう,てい,やくしょ\",\"彈\":\"だん,たん,ひ,はず,たま,はじ,ただ\",\"彌\":\"み,び,いや,や,あまねし,いよいよ,とおい,ひさし,ひさ,わた,ゆ\",\"彗\":\"すい,え,けい,せい,ほうき,とし\",\"彙\":\"い,はりねずみ\",\"從\":\"じゅう,しょう,じゅ,したが,より\",\"徠\":\"らい,きた,く\",\"恆\":\"こう,つね,わたる,ひさし\",\"恣\":\"し,ほしいまま\",\"惧\":\"く,ぐ,おそ\",\"惡\":\"あく,お,わる,あ,にく,ああ,いずくに,いずくんぞ\",\"惠\":\"けい,え,めぐ\",\"惺\":\"せい,さと\",\"愼\":\"しん,つつし\",\"慄\":\"りつ,ふる,おそ,おのの\",\"憬\":\"けい,あこが\",\"應\":\"おう,よう,あた,まさに,こた\",\"懷\":\"かい,え,ふところ,なつ,いだ,おも\",\"戰\":\"せん,いくさ,たたか,おのの,そよぐ\",\"戲\":\"ぎ,げ,たわむ\",\"拔\":\"ばつ,はい,ぬ\",\"拜\":\"はい,おが,おろが\",\"拂\":\"ひつ,ふつ,ほつ,はら\",\"拉\":\"らつ,ら,ろう,らっ,ひし,くだ\",\"搜\":\"そう,しゅ,しゅう,さが\",\"搖\":\"よう,ゆ,うご\",\"攝\":\"せつ,しょう,おさ,かね,と\",\"摯\":\"し,いた,つか,にえ\",\"收\":\"しゅう,おさ\",\"敍\":\"じょ,つい,ついで\",\"昊\":\"こう,そら\",\"昴\":\"こう,ぼう,すばる\",\"晏\":\"あん,おそ\",\"晄\":\"こう,あきらか\",\"晝\":\"ちゅう,ひる\",\"晨\":\"しん,あした,とき,あさ\",\"晟\":\"せい,じょう,あきらか\",\"暉\":\"き,かが,てる\",\"曉\":\"きょう,ぎょう,あかつき,さと,あき\",\"曖\":\"あい,くら\",\"檜\":\"かい,ひのき,ひ\",\"栞\":\"かん,しおり\",\"條\":\"じょう,ちょう,でき,えだ,すじ\",\"梛\":\"だ,な,なぎ\",\"楷\":\"かい\",\"椰\":\"や,やし\",\"榮\":\"えい,よう,さか,は,え\",\"樂\":\"がく,らく,ごう,たの,この\",\"樣\":\"よう,しょう,さま\",\"橙\":\"とう,だいだい\",\"檢\":\"けん,しら\",\"櫂\":\"とう,たく,かい,かじ\",\"櫻\":\"おう,よう,さくら\",\"鬱\":\"うつ,うっ,ふさ,しげ\",\"盜\":\"とう,ぬす\",\"毬\":\"きゅう,いが,まり\",\"氣\":\"き,け,いき\",\"洸\":\"こう,ひろ,ひろし,たけし,ひかり\",\"洵\":\"じゅん,しゅん,の,まこと\",\"淨\":\"じょう,せい,きよ\",\"渾\":\"こん,すべ,にご\",\"滉\":\"こう,ひろ\",\"漱\":\"そう,しゅう,す,くちすす,くちそそ,うがい,すす\",\"滯\":\"たい,てい,とどこお\",\"澁\":\"じゅう,しゅう,しぶ\",\"澪\":\"れい,みお\",\"濕\":\"しつ,しゅう,しめ,うるお\",\"煌\":\"こう,きらめ,きら,かがや\",\"燒\":\"しょう,や,やき\",\"燎\":\"りょう,かがりび\",\"燿\":\"よう,かがや,ひかり\",\"爭\":\"そう,あらそ,いか\",\"爲\":\"い,ため,な,す,たり,つく,なり\",\"狹\":\"きょう,こう,せま,せば,さ\",\"默\":\"ぼく,もく,だ,もだ\",\"獸\":\"じゅう,けもの,けだもの\",\"珈\":\"か,かみかざり\",\"珀\":\"はく\",\"琥\":\"こ\",\"瑶\":\"よう,たま\",\"璧\":\"へき,たま\",\"疊\":\"じょう,ちょう,たた,たたみ,かさ\",\"瘍\":\"よう,かさ\",\"皓\":\"こう,しろ,ひか,あきら,てる,あき,ひろ,ひろし\",\"盡\":\"じん,さん,つ,さかづき,ことごと,まま\",\"眞\":\"しん,ま,まこと,さな,ち,まこ,まさ,まつ\",\"眸\":\"ぼう,む,ひとみ\",\"碎\":\"さい,くだ\",\"祕\":\"ひ,かく\",\"祿\":\"ろく,さいわ,ふち\",\"禪\":\"ぜん,せん,しずか,ゆず\",\"禮\":\"れい,らい,ひろ,れ\",\"稟\":\"りん,ひん,こめぐら\",\"稻\":\"とう,て,いね,いな\",\"穗\":\"すい,ほ,お\",\"穰\":\"じょう,わら,ゆたか,みのる\",\"穹\":\"きゅう,きょう,あめ,そら\",\"笙\":\"しょう,そう,ふえ\",\"箋\":\"せん,ふだ\",\"籠\":\"ろう,る,かご,こ,こも,ごめ,もり\",\"粹\":\"すい,いき\",\"絆\":\"はん,きずな,ほだ,つな\",\"綺\":\"き,あや\",\"綸\":\"りん,かん,いと\",\"緻\":\"ち,こまか\",\"縣\":\"けん,か,あがた,がた\",\"縱\":\"じゅう,たて\",\"纖\":\"せん\",\"羞\":\"しゅう,はじ,すすめ,は\",\"羚\":\"れい,りょう,かもしか\",\"翔\":\"しょう,かけ,と,か\",\"飜\":\"はん,ほん,ひるがえ\",\"聽\":\"ちょう,き,ゆる\",\"脩\":\"しゅう,おさ,なが,ほじし,おさむ,のぶ,はる\",\"臟\":\"ぞう,はらわた\",\"與\":\"よ,あた,あずか,くみ,ともに\",\"苺\":\"ばい,まい,いちご\",\"茉\":\"まつ,ばつ,ま,み\",\"莊\":\"そう,しょう,ちゃん,ほうき,おごそ\",\"莉\":\"り,らい,れい\",\"菫\":\"きん,すみれ\",\"萠\":\"ほう,も,きざ,めばえ,めぐむ\",\"萬\":\"まん,ばん,よろず,かず,ま,ゆる,よし\",\"蕾\":\"らい,つぼみ\",\"藏\":\"ぞう,そう,くら,おさ,かく\",\"藝\":\"げい,うん,う,のり,わざ\",\"藥\":\"やく,くすり\",\"衞\":\"えい,え,まも,まもり,まもる\",\"裝\":\"そう,しょう,よそお\",\"覽\":\"らん,み\",\"訃\":\"ふ,しらせ\",\"詢\":\"じゅん,しゅん,はか,まこと\",\"諄\":\"しゅん,ひちくど,くど,くどくど,ねんご\",\"諧\":\"かい,かな,やわ\",\"謠\":\"よう,うた\",\"讓\":\"じょう,ゆず\",\"貪\":\"たん,どん,とん,むさぼ\",\"賣\":\"ばい,う\",\"赳\":\"きゅう,たけ,たけし\",\"踪\":\"そう,しょう,あと\",\"轉\":\"てん,ころ,まろ,うたた,うつ\",\"辣\":\"らつ,から\",\"迪\":\"てき,みち,みちび,すす,いた,すすむ,すすみ,いたる,ゆう\",\"逞\":\"てい,たくま\",\"醉\":\"すい,よ\",\"釀\":\"じょう,かも\",\"釉\":\"ゆう,うわぐすり\",\"錮\":\"こ,ふさ\",\"鎭\":\"ちん,しず,おさえ\",\"鑄\":\"ちゅう,しゅ,しゅう,い\",\"陷\":\"かん,おちい,おとしい\",\"險\":\"けん,けわ\",\"雜\":\"ざつ,ぞう,まじ,さい\",\"靜\":\"せい,じょう,しず,しずか\",\"頌\":\"しょう,じゅ,よう,かたち,たた,ほめ,つぐ,のぶ\",\"顯\":\"けん,あきらか,あらわ\",\"颯\":\"さつ,そう,さっ\",\"騷\":\"そう,さわ,うれい,さわが\",\"驍\":\"ぎょう,きょう,たけし,つよ,いさ,いさむ,すぐる\",\"驗\":\"けん,げん,あかし,しるし,ため,ためし\",\"髮\":\"はつ,かみ\",\"鷄\":\"けい,にわとり,とり\",\"麒\":\"き\",\"黎\":\"れい,り,くろ,れ\",\"齊\":\"せい,さい,そろ,ひと,あたる,はやい,ひとし\",\"堯\":\"ぎょう,たか\",\"槇\":\"てん,しん,まき,こずえ\",\"遙\":\"よう,はる\",\"凜\":\"りん,きびし\",\"熙\":\"き,たのし,ひか,ひろ,よろこ,かわ,あきらか\",\"俠\":\"きょう,きゃん,おとこだて\",\"塡\":\"てん,ちん,はま,うず,は,ふさ\",\"摑\":\"かく,つか\",\"擊\":\"げき,う\",\"焰\":\"えん,ほのお\",\"瘦\":\"そう,ちゅう,しゅう,ちゅ,やせ\",\"禱\":\"とう,いの,まつ\",\"繡\":\"しゅう,ぬいとり\",\"繫\":\"けい,つな,かか,か\",\"萊\":\"らい,り,あかざ,あれわ,こうがい\",\"蔣\":\"しょう,そう,まこも,はげ\",\"蠟\":\"ろう,みつろう,ろうそく\",\"醬\":\"しょう,ひしお\",\"頰\":\"きょう,ほお,ほほ\",\"顚\":\"てん,いただ,たお\",\"鷗\":\"おう,かもめ\",\"𠮟\":\"しつ,しち,か,しか\",\"俱\":\"く,ともに\",\"剝\":\"はく,ほく,へ,へず,む,は\",\"卽\":\"そく,しょく,つ,すなわ,もし\",\"吞\":\"どん,とん,てん,のむ\",\"增\":\"ぞう,そう,ます,ふえる,ふやす\",\"寬\":\"かん,ひろい,ゆるやか,くつろぐ\",\"巢\":\"そう,す\",\"徵\":\"ちょう,ち,しるし,めす\",\"德\":\"とく,おしえ\",\"揭\":\"けい,けつ,かかげる\",\"晚\":\"ばん,くれ,おそい\",\"曆\":\"れき,りゃく,こよみ\",\"橫\":\"おう,こう,よこ,よこたわる,よこたえる\",\"步\":\"ほ,ぶ,ふ,あるく,あゆむ,あゆみ\",\"每\":\"まい,ばい,つね\",\"涉\":\"しょう,わたる,かかわる\",\"淚\":\"るい,れい,なみだ\",\"渴\":\"かつ,かわ,かわき\",\"溫\":\"おん,うん,あたたか,あたためる\",\"瀨\":\"らい,せ\",\"狀\":\"じょう\",\"簞\":\"たん,はこ\",\"綠\":\"りょく,ろく,みどり\",\"緖\":\"しょ,ちょ,お,いとぐち\",\"緣\":\"えん,ふち,へり,よる\",\"薰\":\"くん,かおる,かおりぐさ,かおり\",\"虛\":\"きょ,こ,むなしい\",\"蟬\":\"せん,ぜん,せみ\",\"賴\":\"らい,たのむ,たよる,たより\",\"郞\":\"ろう,おとこ\",\"錄\":\"ろく,りょ,しるす\",\"鍊\":\"れん,ねる\",\"黃\":\"こう,おう,き\",\"黑\":\"こく,くろい,くろ\",\"朗\":\"ろう,ほが\",\"虜\":\"りょ,とりこ\",\"猪\":\"ちょ,いのしし,い\",\"神\":\"しん,じん,かみ,こう,たましい\",\"祥\":\"しょう,さいわい\",\"福\":\"ふく,さいわい,ひもろぎ\",\"諸\":\"しょ,もろ,これ\",\"都\":\"と,つ,みやこ\",\"侮\":\"ぶ,あなど\",\"僧\":\"そう\",\"勉\":\"べん\",\"勤\":\"きん,ごん,つと\",\"卑\":\"ひ,いや\",\"嘆\":\"たん,なげかわしい,なげく\",\"器\":\"き,うつわ\",\"墨\":\"ぼく,すみ\",\"層\":\"そう\",\"悔\":\"かい,く,くや\",\"憎\":\"ぞう,にくい,にくしみ,にくむ,にくらしい\",\"懲\":\"ちょう,こらしめる,こらす,こりる\",\"敏\":\"びん\",\"暑\":\"しょ,あつい\",\"梅\":\"ばい,うめ\",\"海\":\"かい,うみ\",\"渚\":\"しょ,なぎさ\",\"漢\":\"かん\",\"煮\":\"しゃ,に\",\"琢\":\"たく,みがく\",\"碑\":\"ひ,いしぶみ\",\"社\":\"しゃ,やしろ\",\"祉\":\"つ\",\"祈\":\"き,いのる\",\"祐\":\"ゆう,たすけ,たすける\",\"祖\":\"そ\",\"祝\":\"しゅう,しゅく,いわう\",\"禍\":\"か,まが,わざわい\",\"禎\":\"てい,さいわい\",\"穀\":\"こく\",\"突\":\"とつ,つく\",\"節\":\"せち,せつ,ふし\",\"練\":\"こう,れん,ね\",\"繁\":\"はん\",\"署\":\"しょ\",\"者\":\"しゃ,もの\",\"臭\":\"しゅう,くさ,にお\",\"著\":\"ちょ,あらわす,いちじるしい\",\"視\":\"し\",\"謁\":\"えつ\",\"謹\":\"きん,つつしむ\",\"賓\":\"ひん\",\"贈\":\"そう,ぞう,おく\",\"逸\":\"しんにょう\",\"難\":\"なん,かたい,むずかしい\",\"響\":\"きょう,ひび\"}";
	var MAX_KANJI = 24;
	var MAX_READING = 48;
	var READINGS = null;
	function readingsOf(kanji) {
		if (!READINGS) {
			READINGS = Object.create(null);
			try {
				const raw = JSON.parse(KANJI_READINGS_JSON);
				for (const k in raw) READINGS[k] = raw[k].split(",");
			} catch (_) {}
		}
		return READINGS[kanji];
	}
	function toHira(s) {
		let out = "";
		for (const ch of s) {
			const c = ch.codePointAt(0);
			if (c >= 12449 && c <= 12534) out += String.fromCodePoint(c - 96);
			else if (c >= 12353 && c <= 12438) out += ch;
			else if (c === 12540) out += "";
		}
		return out;
	}
	var VOICE = {
		"か": ["が"],
		"き": ["ぎ"],
		"く": ["ぐ"],
		"け": ["げ"],
		"こ": ["ご"],
		"さ": ["ざ"],
		"し": ["じ"],
		"す": ["ず"],
		"せ": ["ぜ"],
		"そ": ["ぞ"],
		"た": ["だ"],
		"ち": ["ぢ"],
		"つ": ["づ"],
		"て": ["で"],
		"と": ["ど"],
		"は": ["ば", "ぱ"],
		"ひ": ["び", "ぴ"],
		"ふ": ["ぶ", "ぷ"],
		"へ": ["べ", "ぺ"],
		"ほ": ["ぼ", "ぽ"]
	};
	function rendakuForms(s) {
		const v = VOICE[s[0]];
		if (!v) return [];
		return v.map((x) => x + s.slice(1));
	}
	var GEMINATE_LAST = new Set([
		"く",
		"き",
		"つ",
		"ち"
	]);
	function geminate(s) {
		return GEMINATE_LAST.has(s[s.length - 1]) ? s.slice(0, -1) + "っ" : null;
	}
	function* variants(base, index, isLast) {
		const firsts = [base];
		if (index > 0) for (const r of rendakuForms(base)) firsts.push(r);
		for (const f of firsts) {
			yield f;
			if (!isLast) {
				const g = geminate(f);
				if (g) yield g;
			}
		}
	}
	function alignRun(kanjis, reading) {
		const n = kanjis.length;
		const out = new Array(n);
		const stride = reading.length + 1;
		const failed = new Set();
		function dfs(i, pos) {
			if (i === n) return pos === reading.length;
			const memo = i * stride + pos;
			if (failed.has(memo)) return false;
			const cands = readingsOf(kanjis[i]);
			if (cands) {
				for (const base of cands) for (const cand of variants(base, i, i === n - 1)) if (cand && reading.startsWith(cand, pos)) {
					out[i] = cand;
					if (dfs(i + 1, pos + cand.length)) return true;
				}
			}
			failed.add(memo);
			return false;
		}
		return dfs(0, 0) ? out : null;
	}
	function alignFurigana(base, rawReading) {
		const reading = toHira(rawReading);
		if (!reading) return null;
		const kanjis = [...base];
		if (kanjis.length > MAX_KANJI || reading.length > MAX_READING) return null;
		for (let start = 0; start < kanjis.length; start++) {
			const suffix = kanjis.slice(start);
			const res = alignRun(suffix, reading);
			if (res) return {
				plain: kanjis.slice(0, start).join(""),
				pairs: suffix.map((k, i) => [k, res[i]])
			};
		}
		return null;
	}
	var RE_AOZORA_BAR = new RegExp("｜([^｜《》]+)《([\\u3041-\\u3096\\u30a1-\\u30fa\\u30fc]+)》", "g");
	var RE_AOZORA = new RegExp("([\\u4e00-\\u9fff\\u3400-\\u4dbf\\u3005]+)《([\\u3041-\\u3096\\u30a1-\\u30fa\\u30fc]+)》", "g");
	var RE_PAREN = new RegExp("([\\u4e00-\\u9fff\\u3400-\\u4dbf\\u3005]+)[（(]([\\u3041-\\u3096\\u30a1-\\u30fa\\u30fc]+)[）)]", "g");
	function applyRuby(text, allowParen) {
		if (!text) return text;
		if (!/[《｜]/.test(text) && !(allowParen && /[（(]/.test(text))) return text;
		text = text.replace(RE_AOZORA_BAR, (m, base, ruby) => tag(base, ruby));
		text = text.replace(RE_AOZORA, (m, base, ruby) => tag(base, ruby));
		if (allowParen) text = text.replace(RE_PAREN, (m, base, ruby) => tag(base, ruby));
		return text;
	}
	function tag(base, ruby) {
		const a = alignFurigana(base, ruby);
		if (!a) return group(base, ruby);
		let html = a.plain;
		html += "<ruby>";
		for (const [k, r] of a.pairs) html += k + "<rt>" + r + "</rt>";
		html += "</ruby>";
		return html;
	}
	function group(base, ruby) {
		return "<ruby>" + base + "<rt>" + ruby + "</rt></ruby>";
	}
	function createTextRenderer() {
		let cueBox = null;
		let lastKey = "";
		let visible = true;
		function outline(c) {
			return `-2px -2px 1px ${c},2px -2px 1px ${c},-2px 2px 1px ${c},2px 2px 1px ${c},0 0 3px ${c}`;
		}
		return {
			mount() {
				cueBox = document.createElement("div");
				cueBox.id = "anysub-cuebox";
				cueBox.style.display = "none";
				refs.overlay.appendChild(cueBox);
				lastKey = "";
				this.applyStyle();
			},
			setVisible(v) {
				visible = v;
				if (!cueBox) return;
				if (!v) cueBox.style.display = "none";
				else lastKey = "";
			},
			renderAt(v, rect, layoutChanged) {
				if (!cueBox) return;
				if (!visible) {
					cueBox.style.display = "none";
					return;
				}
				if (layoutChanged && rect) {
					const fontPx = Math.max(10, rect.height * FONT_BASE * (state.style.fontPct / 100));
					cueBox.style.fontSize = fontPx.toFixed(1) + "px";
					cueBox.style.bottom = rect.height * state.style.bottomPct / 100 + "px";
				}
				const t = v.currentTime - state.offset;
				const parts = [];
				for (const c of state.cues) {
					if (c.start > t) break;
					if (t < c.end) parts.push(c.text);
				}
				const key = (state.rubyParen ? "1" : "0") + "\0" + parts.join("\n");
				if (key === lastKey) return;
				lastKey = key;
				const html = parts.map((x) => applyRuby(x, state.rubyParen)).join("<br>");
				cueBox.innerHTML = html;
				cueBox.style.display = html ? "inline-block" : "none";
			},
			applyStyle() {
				if (!cueBox) return;
				const s = state.style;
				cueBox.style.color = s.color;
				cueBox.style.textShadow = "none";
				cueBox.style.background = "transparent";
				cueBox.style.padding = "0";
				if (s.bg === "outline") cueBox.style.textShadow = outline("#000");
				else if (s.bg === "translucent") {
					cueBox.style.background = "rgba(0,0,0,.55)";
					cueBox.style.padding = ".08em .4em";
					cueBox.style.textShadow = outline("rgba(0,0,0,.5)");
				} else if (s.bg === "solid") {
					cueBox.style.background = "rgba(0,0,0,.92)";
					cueBox.style.padding = ".08em .4em";
				}
			},
			destroy() {
				if (cueBox) cueBox.remove();
				cueBox = null;
				lastKey = "";
			}
		};
	}
	var CDN = `https://cdn.jsdelivr.net/npm/libass-wasm@4.1.0/dist/js/`;
	var FONT_JP = "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.5/files/noto-sans-jp-japanese-400-normal.woff2";
	var FONT_SC = "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.0.5/files/noto-sans-sc-chinese-simplified-400-normal.woff2";
	var loadPromise = null;
	function loadOctopus() {
		if (loadPromise) return loadPromise;
		loadPromise = doLoad().catch((err) => {
			loadPromise = null;
			throw err;
		});
		return loadPromise;
	}
	async function doLoad() {
		if (!window.SubtitlesOctopus) {
			await injectScript(await fetchText(CDN + "subtitles-octopus.js"));
			if (!window.SubtitlesOctopus) throw new Error("SubtitlesOctopus 未定义(可能被 CSP 拦截)");
		}
		const workerText = await fetchText(CDN + "subtitles-octopus-worker.js");
		const prefix = "var Module={locateFile:function(p){return " + JSON.stringify(CDN) + "+p;}};\n";
		const workerUrl = URL.createObjectURL(new Blob([prefix + workerText], { type: "text/javascript" }));
		return {
			Octopus: window.SubtitlesOctopus,
			workerUrl,
			fallbackFont: FONT_JP,
			fonts: [FONT_JP, FONT_SC]
		};
	}
	function fetchText(url) {
		return fetch(url, { credentials: "omit" }).then((r) => {
			if (!r.ok) throw new Error(`加载失败 ${r.status}: ${url}`);
			return r.text();
		});
	}
	function injectScript(text) {
		return new Promise((resolve, reject) => {
			const s = document.createElement("script");
			s.src = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
			s.onload = () => resolve();
			s.onerror = () => reject(new Error("主脚本注入失败(可能被 CSP 拦截)"));
			(document.head || document.documentElement).appendChild(s);
		});
	}
	function createAssRenderer(assText) {
		const textRenderer = createTextRenderer();
		let octopus = null;
		let assCanvas = null;
		let usingLibass = false;
		let disposed = false;
		let lastSizeKey = "";
		let lastDriveT = -1;
		function tryLibass() {
			loadOctopus().then(({ Octopus, workerUrl, fallbackFont, fonts }) => {
				if (disposed) return;
				assCanvas = document.createElement("canvas");
				assCanvas.id = "anysub-ass-canvas";
				assCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;";
				refs.overlay.appendChild(assCanvas);
				octopus = new Octopus({
					canvas: assCanvas,
					subContent: assText,
					workerUrl,
					fallbackFont,
					fonts,
					onReady: () => {
						if (disposed) {
							safeDispose();
							return;
						}
						usingLibass = true;
						textRenderer.destroy();
						lastSizeKey = "";
						sizeCanvas();
						drive();
						if (state.hidden) assCanvas.style.display = "none";
						toast("已启用 ASS 高保真渲染");
					},
					onError: (e) => {
						console.warn("[AnySub] libass 渲染出错,保留文本", e);
					}
				});
			}).catch((err) => {
				console.warn("[AnySub] 无法加载 libass,使用文本渲染:", err && err.message);
				toast("ASS 按文本显示(高保真渲染不可用)");
			});
		}
		function sizeCanvas() {
			if (!octopus || !assCanvas) return;
			const w = refs.overlay.clientWidth, h = refs.overlay.clientHeight;
			if (!w || !h) return;
			const dpr = window.devicePixelRatio || 1;
			const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
			const key = bw + "x" + bh;
			if (key === lastSizeKey) return;
			lastSizeKey = key;
			lastDriveT = -1;
			try {
				octopus.resize(bw, bh, 0, 0);
			} catch (_) {}
		}
		function drive() {
			if (!octopus || !state.video) return;
			const t = Math.max(0, state.video.currentTime - state.offset);
			if (t === lastDriveT) return;
			lastDriveT = t;
			try {
				octopus.setCurrentTime(t);
			} catch (_) {}
		}
		function safeDispose() {
			if (octopus) {
				try {
					octopus.dispose();
				} catch (_) {}
				octopus = null;
			}
			if (assCanvas) {
				assCanvas.remove();
				assCanvas = null;
			}
		}
		return {
			mount() {
				textRenderer.mount();
				tryLibass();
			},
			renderAt(v, rect, layoutChanged) {
				if (!usingLibass) {
					textRenderer.renderAt(v, rect, layoutChanged);
					return;
				}
				if (layoutChanged || lastSizeKey === "") sizeCanvas();
				drive();
			},
			setVisible(vis) {
				if (usingLibass) {
					if (assCanvas) assCanvas.style.display = vis ? "" : "none";
				} else textRenderer.setVisible(vis);
			},
			applyStyle() {
				if (!usingLibass) textRenderer.applyStyle();
			},
			destroy() {
				disposed = true;
				textRenderer.destroy();
				safeDispose();
			}
		};
	}
	function parseAss(text) {
		const lines = text.split(/\r?\n/);
		const cues = [];
		let inEvents = false;
		let idxStart = 1, idxEnd = 2, idxText = 9;
		for (const raw of lines) {
			const line = raw.trim();
			if (/^\[/.test(line)) {
				inEvents = /^\[events\]/i.test(line);
				continue;
			}
			if (!inEvents) continue;
			if (/^format\s*:/i.test(line)) {
				const cols = line.slice(line.indexOf(":") + 1).split(",").map((s) => s.trim().toLowerCase());
				const s = cols.indexOf("start"), e = cols.indexOf("end"), t = cols.indexOf("text");
				if (s >= 0) idxStart = s;
				if (e >= 0) idxEnd = e;
				if (t >= 0) idxText = t;
				continue;
			}
			if (/^dialogue\s*:/i.test(line)) {
				const fields = splitFields(line.slice(line.indexOf(":") + 1), idxText);
				const start = assTime(fields[idxStart]);
				const end = assTime(fields[idxEnd]);
				if (!isFinite(start) || !isFinite(end) || end <= start) continue;
				let body = (fields[idxText] || "").replace(/\\N/gi, "\n").replace(/\\h/gi, " ");
				body = sanitize(body);
				if (body) cues.push({
					start,
					end,
					text: body
				});
			}
		}
		cues.sort((a, b) => a.start - b.start);
		return cues;
	}
	function splitFields(rest, textIdx) {
		const out = [];
		let start = 0;
		for (let i = 0; i < textIdx; i++) {
			const c = rest.indexOf(",", start);
			if (c < 0) {
				out.push(rest.slice(start));
				return out;
			}
			out.push(rest.slice(start, c));
			start = c + 1;
		}
		out.push(rest.slice(start));
		return out;
	}
	function assTime(t) {
		if (!t) return NaN;
		const m = t.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/);
		if (!m) return NaN;
		return +m[1] * 3600 + +m[2] * 60 + +m[3] + parseFloat("0." + m[4]);
	}
	var FORMATS = [{
		test: (name) => /\.(ass|ssa)$/i.test(name || ""),
		parse: (text) => ({
			cues: parseAss(text),
			assText: text
		}),
		create: (parsed) => createAssRenderer(parsed.assText)
	}, {
		test: () => true,
		parse: (text, name) => ({ cues: parseSubtitle(text, name) }),
		create: () => createTextRenderer()
	}];
	function loadFile(file) {
		if (!file) return;
		readSubtitleFile(file).then((text) => loadFromText(text, file.name)).catch((err) => {
			console.error("[AnySub]", err);
			toast("读取字幕失败:" + err.message);
		});
	}
	function loadFromBuffer(buffer, name) {
		return loadFromText(decodeBuffer(new Uint8Array(buffer)), name);
	}
	function loadFromText(text, name) {
		if (!state.video || !state.video.isConnected) {
			const v = pickBestVideo();
			if (v) setVideo(v);
		}
		if (!state.video) {
			toast("未在页面找到视频元素");
			return false;
		}
		const fmt = FORMATS.find((f) => f.test(name, text)) || FORMATS[FORMATS.length - 1];
		const parsed = fmt.parse(text, name);
		if (!parsed.cues || !parsed.cues.length) {
			toast("未解析出字幕(格式不支持或文件为空)");
			return false;
		}
		state.cues = parsed.cues;
		state.fileName = name;
		const p = parseVideoTitle(document.title);
		state.loadedSeries = p.series;
		state.loadedEpisode = p.episode;
		state.lastOnline = null;
		state.offsetKey = (p.series || "") + "|" + [...sourceTokens(name)].sort().join(",");
		const remembered = state.offsets[state.offsetKey];
		state.offset = typeof remembered === "number" ? remembered : 0;
		invalidateLayout();
		setRenderer(fmt.create(parsed));
		applyStyle();
		startRender();
		updateWatcher();
		updateStatus();
		toast(`已挂载 ${parsed.cues.length} 条字幕`);
		return true;
	}
	var KEY = "anysub:settings:v1";
	function saveState() {
		const s = state.style;
		saveSettings({
			fontPct: s.fontPct,
			bottomPct: s.bottomPct,
			bg: s.bg,
			color: s.color,
			showFab: state.showFab,
			rubyParen: state.rubyParen,
			jimakuKey: state.jimakuKey,
			offsets: state.offsets
		});
	}
	function loadSettings() {
		try {
			return JSON.parse(localStorage.getItem(KEY)) || {};
		} catch (_) {
			return {};
		}
	}
	function saveSettings(obj) {
		try {
			localStorage.setItem(KEY, JSON.stringify(obj));
		} catch (_) {}
	}
	var ENDPOINT = "https://graphql.anilist.co";
	var QUERY = `query($s:String){Page(perPage:6){media(search:$s,type:ANIME){id title{romaji native english} episodes format startDate{year} coverImage{medium}}}}`;
	async function searchAnime(title) {
		const res = await fetch(ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json"
			},
			body: JSON.stringify({
				query: QUERY,
				variables: { s: title }
			})
		});
		if (res.status === 429) throw new Error("AniList 请求过于频繁,请稍后再试");
		if (!res.ok) throw new Error("AniList 查询失败 " + res.status);
		const data = await res.json();
		return (data && data.data && data.data.Page && data.data.Page.media || []).map((m) => ({
			anilistId: m.id,
			title: m.title.native || m.title.romaji || m.title.english || String(m.id),
			romaji: m.title.romaji || "",
			episodes: m.episodes || 0,
			format: m.format || "",
			year: m.startDate && m.startDate.year || "",
			cover: m.coverImage && m.coverImage.medium || ""
		}));
	}
	var BASE = "https://jimaku.cc/api";
	function auth() {
		const key = state.jimakuKey;
		if (!key) throw new Error("未设置 Jimaku API key");
		return { Authorization: key };
	}
	async function get(path) {
		const res = await fetch(BASE + path, { headers: auth() });
		if (res.status === 401) throw new Error("Jimaku API key 无效");
		if (res.status === 429) throw new Error("Jimaku 请求过于频繁,请稍后再试");
		if (!res.ok) throw new Error("Jimaku 请求失败 " + res.status);
		return res.json();
	}
	function searchByAnilist(anilistId) {
		return get("/entries/search?anilist_id=" + encodeURIComponent(anilistId));
	}
	function getFiles(entryId, episode) {
		let p = "/entries/" + encodeURIComponent(entryId) + "/files";
		if (episode != null && episode !== "") p += "?episode=" + encodeURIComponent(episode);
		return get(p);
	}
	var SUB_RE = /\.(ass|ssa|srt|vtt|sub|sbv)$/i;
	function animeCandidates(title) {
		return searchAnime(title);
	}
	async function subtitleFiles(anilistId, episode) {
		const entries = await searchByAnilist(anilistId);
		if (!entries.length) return [];
		const out = [];
		for (const e of entries) {
			const files = await getFiles(e.id, episode);
			for (const f of files) {
				if (!SUB_RE.test(f.name)) continue;
				out.push({
					name: f.name,
					url: f.url,
					size: f.size,
					entryName: e.japanese_name || e.name
				});
			}
		}
		out.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
		return out;
	}
	function rank(n) {
		if (/\.(ass|ssa)$/i.test(n)) return 0;
		if (/\.srt$/i.test(n)) return 1;
		return 2;
	}
	async function downloadAndLoad(url, name) {
		const res = await fetch(url);
		if (!res.ok) throw new Error("下载失败 " + res.status);
		return loadFromBuffer(await res.arrayBuffer(), name);
	}
	function markLoaded(anilistId, fileName) {
		const p = parseVideoTitle(document.title);
		state.loadedSeries = p.series;
		state.loadedEpisode = p.episode;
		state.lastOnline = anilistId != null ? {
			anilistId,
			name: fileName
		} : null;
	}
	var panel, titleInput, epInput, results;
	var currentAnime = null;
	var lastPrefillTitle = null;
	var keyEditing = false;
	var S = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
	var IC = {
		back: S("<path d=\"M19 12H5M11 6l-6 6 6 6\"/>"),
		search: S("<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.2-3.2\"/>"),
		check: S("<path d=\"M20 6 9 17l-5-5\"/>"),
		photo: S("<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"/><path d=\"m21 15-5-5L5 21\"/>"),
		chev: S("<path d=\"m9 6 6 6-6 6\"/>")
	};
	var HTML = `
  <div class="as-sc-head">
    <button id="anysub-sc-back" class="as-sc-back" title="返回主面板">${IC.back}<span>主面板</span></button>
    <button id="anysub-sc-close" class="as-x" title="关闭">✕</button>
  </div>
  <div class="as-sc-title"><span class="as-logo">字</span><span>在线字幕</span><span class="as-sc-tag">Jimaku</span></div>
  <div id="anysub-key-area"></div>
  <div class="as-sc-search">
    <input id="anysub-title" placeholder="番剧名(日文最准)">
    <input id="anysub-ep" class="as-sc-ep" placeholder="集" title="集数">
    <button id="anysub-do-search">${IC.search}<span>搜索</span></button>
  </div>
  <div id="anysub-results" class="as-sc-results"><div class="as-sc-empty">输入番剧名后点搜索</div></div>
`;
	function buildSearchUI() {
		panel = document.createElement("div");
		panel.id = "anysub-search";
		panel.style.display = "none";
		panel.innerHTML = HTML;
		refs.uiRoot.appendChild(panel);
		refs.searchPanel = panel;
		titleInput = panel.querySelector("#anysub-title");
		epInput = panel.querySelector("#anysub-ep");
		results = panel.querySelector("#anysub-results");
		panel.querySelector("#anysub-sc-back").addEventListener("click", backToPanel);
		panel.querySelector("#anysub-sc-close").addEventListener("click", close);
		panel.querySelector("#anysub-do-search").addEventListener("click", doSearch);
		titleInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") doSearch();
		});
		epInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") doSearch();
		});
		renderKeyArea();
	}
	function renderKeyArea() {
		const area = panel.querySelector("#anysub-key-area");
		if (state.jimakuKey && !keyEditing) {
			area.innerHTML = `<div class="as-sc-keyok">${IC.check}<span>已连接 Jimaku</span><span class="as-sc-change" id="anysub-key-change">更换 key</span></div>`;
			area.querySelector("#anysub-key-change").addEventListener("click", () => {
				keyEditing = true;
				renderKeyArea();
			});
		} else {
			area.innerHTML = `<div class="as-sc-keyrow"><input id="anysub-key" type="password" placeholder="Jimaku API key" autocomplete="off"><button id="anysub-key-save">保存</button></div>
      <div class="as-sc-hint">key 在 jimaku.cc 登录后账号页生成,仅存于本机</div>`;
			const ki = area.querySelector("#anysub-key");
			ki.value = state.jimakuKey || "";
			area.querySelector("#anysub-key-save").addEventListener("click", () => saveKey(ki.value));
			ki.addEventListener("keydown", (e) => {
				if (e.key === "Enter") saveKey(ki.value);
			});
		}
	}
	function openSearch() {
		if (refs.panel) refs.panel.style.display = "none";
		show();
		renderKeyArea();
		const curTitle = document.title;
		if (!titleInput.value && !epInput.value || curTitle !== lastPrefillTitle) {
			const { series, episode } = parseVideoTitle(curTitle);
			titleInput.value = series;
			epInput.value = episode || "";
			lastPrefillTitle = curTitle;
			setResults("<div class=\"as-sc-empty\">输入番剧名后点搜索</div>");
		}
		(state.jimakuKey ? titleInput : panel.querySelector("#anysub-key") || titleInput).focus();
	}
	function show() {
		panel.style.display = "block";
		panel.classList.remove("as-in");
		panel.offsetWidth;
		panel.classList.add("as-in");
	}
	function close() {
		panel.style.display = "none";
	}
	function backToPanel() {
		panel.style.display = "none";
		openPanel();
	}
	function saveKey(val) {
		state.jimakuKey = (val || "").trim();
		saveState();
		keyEditing = false;
		renderKeyArea();
		toast(state.jimakuKey ? "API key 已保存" : "API key 已清空");
		if (state.jimakuKey) titleInput.focus();
	}
	async function doSearch() {
		const title = titleInput.value.trim();
		if (!state.jimakuKey) {
			toast("请先填写并保存 Jimaku API key");
			keyEditing = true;
			renderKeyArea();
			return;
		}
		if (!title) {
			toast("请输入番剧名");
			return;
		}
		setResults("<div class=\"as-sc-empty\">搜索中…</div>");
		try {
			const list = await animeCandidates(title);
			if (!list.length) {
				setResults("<div class=\"as-sc-empty\">未找到番剧,换个写法试试</div>");
				return;
			}
			renderAnime(list);
		} catch (err) {
			setResults(`<div class="as-sc-empty">出错:${esc(err.message)}</div>`);
		}
	}
	function poster(url) {
		return `<span class="as-sc-poster">${IC.photo}${url ? `<img src="${escAttr(url)}" alt="">` : ""}</span>`;
	}
	function metaOf(a) {
		const bits = [];
		if (a.format) bits.push(esc(a.format));
		if (a.year) bits.push(String(a.year));
		if (a.episodes) bits.push(a.episodes + " 话");
		return bits.join(" · ");
	}
	function renderAnime(list) {
		results.innerHTML = "";
		results.appendChild(sec("选择番剧"));
		for (const a of list) {
			const row = document.createElement("div");
			row.className = "as-sc-anime";
			if (a.romaji) row.title = a.romaji;
			row.innerHTML = `${poster(a.cover)}
      <div class="as-sc-anime-main">
        <div class="as-sc-anime-t">${esc(a.title)}</div>
        <div class="as-sc-anime-s">${metaOf(a)}</div>
      </div>
      <span class="as-sc-chev">${IC.chev}</span>`;
			wirePoster(row);
			row.addEventListener("click", () => loadFilesFor(a));
			results.appendChild(row);
		}
	}
	async function loadFilesFor(anime) {
		setResults("<div class=\"as-sc-empty\">获取字幕文件中…</div>");
		try {
			const files = await subtitleFiles(anime.anilistId, epInput.value.trim());
			if (!files.length) {
				results.innerHTML = "";
				results.appendChild(backLink("← 返回番剧列表", doSearch));
				results.appendChild(empty(`${esc(anime.title)} 暂无字幕${epInput.value ? "(第 " + esc(epInput.value) + " 集)" : ""}`));
				return;
			}
			renderFiles(anime, files);
		} catch (err) {
			results.innerHTML = "";
			results.appendChild(backLink("← 返回番剧列表", doSearch));
			results.appendChild(empty("出错:" + esc(err.message)));
		}
	}
	function showCandidates(seriesTitle, files) {
		if (refs.panel) refs.panel.style.display = "none";
		show();
		renderKeyArea();
		if (seriesTitle) titleInput.value = seriesTitle;
		lastPrefillTitle = document.title;
		renderFiles({
			title: seriesTitle,
			anilistId: state.lastOnline && state.lastOnline.anilistId
		}, files);
	}
	function renderFiles(anime, files) {
		currentAnime = anime;
		results.innerHTML = "";
		results.appendChild(backLink("← 返回番剧列表", doSearch));
		results.appendChild(sec(`${esc(anime.title)} · 选择字幕(${files.length})`));
		for (const f of files) {
			const row = document.createElement("div");
			row.className = "as-sc-file";
			row.innerHTML = `<div class="as-sc-file-t">${esc(f.name)}</div>
      <div class="as-sc-file-s">${fmtSize(f.size)}${f.entryName ? " · " + esc(f.entryName) : ""}</div>`;
			row.addEventListener("click", () => pickFile(f, row));
			results.appendChild(row);
		}
	}
	async function pickFile(f, row) {
		row.classList.add("loading");
		try {
			if (await downloadAndLoad(f.url, f.name)) {
				markLoaded(currentAnime && currentAnime.anilistId, f.name);
				toast("已挂载:" + f.name);
				close();
			}
		} catch (err) {
			toast("下载失败:" + err.message);
		} finally {
			row.classList.remove("loading");
		}
	}
	function sec(text) {
		const d = document.createElement("div");
		d.className = "as-sc-sec";
		d.textContent = text;
		return d;
	}
	function empty(html) {
		const d = document.createElement("div");
		d.className = "as-sc-empty";
		d.innerHTML = html;
		return d;
	}
	function backLink(text, fn) {
		const d = document.createElement("div");
		d.className = "as-sc-back2";
		d.innerHTML = `${IC.back}<span></span>`;
		d.querySelector("span").textContent = text.replace(/^←\s*/, "");
		d.addEventListener("click", fn);
		return d;
	}
	function wirePoster(row) {
		const img = row.querySelector(".as-sc-poster img");
		if (img) img.addEventListener("error", () => img.remove());
	}
	function setResults(html) {
		results.innerHTML = html;
	}
	function fmtSize(n) {
		if (!n) return "";
		return n > 1e6 ? (n / 1e6).toFixed(1) + "MB" : Math.round(n / 1024) + "KB";
	}
	function esc(s) {
		return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}
	function escAttr(s) {
		return esc(s).replace(/"/g, "&quot;");
	}
	var persist = saveState;
	var SVG = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
	var ICON = {
		file: SVG("<path d=\"M14 3v4a1 1 0 0 0 1 1h4\"/><path d=\"M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z\"/>"),
		search: SVG("<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.2-3.2\"/>"),
		video: SVG("<rect x=\"3\" y=\"5\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8 21h8M12 17v4\"/>"),
		eye: SVG("<path d=\"M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>"),
		eyeOff: SVG("<path d=\"M10 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-2.2 2.9M6.5 6.5A15 15 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 3.5-.6\"/><path d=\"m3 3 18 18\"/>"),
		trash: SVG("<path d=\"M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3\"/>"),
		upload: SVG("<path d=\"M12 15V4M8 8l4-4 4 4M5 20h14\"/>")
	};
	var PANEL_HTML = `
  <div class="as-head">
    <div class="as-brand"><span class="as-logo">字</span><span>AnySub</span></div>
    <button id="anysub-close" class="as-x" title="关闭 (Ctrl/Alt+Shift+S)">✕</button>
  </div>

  <div class="as-actions">
    <button id="anysub-choose" class="as-btn as-btn-primary">${ICON.file}<span>选择文件</span></button>
    <button id="anysub-online" class="as-btn as-btn-primary">${ICON.search}<span>在线字幕</span></button>
  </div>
  <div class="as-drop" id="anysub-drop">${ICON.upload}<span>拖字幕文件到这里</span></div>

  <div class="as-status-row">
    <span class="as-status" id="anysub-status">未加载字幕</span>
    <div class="as-status-actions">
      <button id="anysub-pickvid" class="as-icon-btn" title="选视频(页面多视频时指定)">${ICON.video}</button>
      <button id="anysub-vis" class="as-icon-btn" title="隐藏字幕"><span class="as-eye">${ICON.eye}</span><span class="as-eye-off">${ICON.eyeOff}</span></button>
      <button id="anysub-clear" class="as-icon-btn" title="清除字幕">${ICON.trash}</button>
    </div>
  </div>

  <div class="as-divider"></div>

  <div class="as-field">
    <label class="as-label">时间偏移</label>
    <div class="as-offset">
      <button data-off="-1" class="as-step">−1</button>
      <button data-off="-0.1" class="as-step">−.1</button>
      <input type="number" id="anysub-offset" value="0.0" step="0.1" title="可手动输入,单位秒">
      <button data-off="0.1" class="as-step">+.1</button>
      <button data-off="1" class="as-step">+1</button>
    </div>
  </div>

  <div class="as-field">
    <label class="as-label">字号 <span class="as-val" id="anysub-fontval">100%</span></label>
    <input type="range" id="anysub-font" class="as-range" min="50" max="250" value="100" step="5">
  </div>

  <div class="as-field">
    <label class="as-label">位置 <span class="as-val" id="anysub-posval">8%</span></label>
    <input type="range" id="anysub-pos" class="as-range" min="2" max="40" value="8" step="1">
  </div>

  <div class="as-field">
    <label class="as-label">背景</label>
    <div class="as-seg" id="anysub-bg">
      <button data-bg="outline">描边</button>
      <button data-bg="translucent" class="on">半透</button>
      <button data-bg="solid">黑底</button>
      <button data-bg="none">无</button>
    </div>
  </div>

  <div class="as-field">
    <label class="as-label">颜色</label>
    <div class="as-swatches" id="anysub-color">
      <button data-color="#ffffff" class="on" style="--sw:#ffffff" title="白"></button>
      <button data-color="#ffe100" style="--sw:#ffe100" title="黄"></button>
      <button data-color="#00e5ff" style="--sw:#00e5ff" title="青"></button>
      <button data-color="#7CFC00" style="--sw:#7cfc00" title="绿"></button>
    </div>
  </div>

  <div class="as-divider"></div>

  <div class="as-switch-row">
    <span class="as-switch-label">日文注音</span>
    <button id="anysub-tg-ruby" class="as-switch" role="switch" title="将 温厚（おんこう) 显示为注音"><span class="as-knob"></span></button>
  </div>
  <div class="as-switch-row">
    <span class="as-switch-label">悬浮球</span>
    <button id="anysub-tg-fab" class="as-switch" role="switch" title="页面右侧常驻小球"><span class="as-knob"></span></button>
  </div>

  <div class="as-hints">
    <kbd>Ctrl/Alt</kbd>+<kbd>Shift</kbd> 加 <kbd>S</kbd> 面板 · <kbd>F</kbd> 在线 · <kbd>V</kbd> 显隐 · <kbd>O</kbd> 本地 · <kbd>←/→</kbd> 偏移
  </div>
`;
	function buildUI() {
		const uiRoot = document.createElement("div");
		uiRoot.id = "anysub-root";
		const overlay = document.createElement("div");
		overlay.id = "anysub-overlay";
		overlay.style.cssText = "display:none;position:fixed;z-index:2147483640;pointer-events:none;overflow:hidden;";
		const fab = document.createElement("div");
		fab.id = "anysub-fab";
		fab.className = "dock-right";
		fab.textContent = "字";
		fab.title = "AnySub · 点击打开字幕面板(可拖动)";
		fab.style.display = "none";
		const panel = document.createElement("div");
		panel.id = "anysub-panel";
		panel.style.display = "none";
		panel.innerHTML = PANEL_HTML;
		const fileInput = document.createElement("input");
		fileInput.type = "file";
		fileInput.accept = ".srt,.vtt,.ass,.ssa,.sub,.sbv,text/plain";
		fileInput.style.display = "none";
		uiRoot.appendChild(overlay);
		uiRoot.appendChild(fab);
		uiRoot.appendChild(panel);
		uiRoot.appendChild(fileInput);
		document.body.appendChild(uiRoot);
		refs.uiRoot = uiRoot;
		refs.overlay = overlay;
		refs.fab = fab;
		refs.panel = panel;
		refs.fileInput = fileInput;
		refs.statusEl = panel.querySelector("#anysub-status");
		buildSearchUI();
		wireEvents();
	}
	function togglePanel() {
		const p = refs.panel;
		if (p.style.display === "none" || !p.style.display) openPanel();
		else p.style.display = "none";
	}
	function openPanel() {
		const p = refs.panel;
		if (refs.searchPanel) refs.searchPanel.style.display = "none";
		p.style.display = "block";
		const inp = p.querySelector("#anysub-offset");
		if (inp) inp.value = state.offset.toFixed(1);
		syncVisBtn();
		positionPanel();
		p.classList.remove("as-in");
		p.offsetWidth;
		p.classList.add("as-in");
	}
	function openFilePicker() {
		refs.fileInput.click();
	}
	function adjustOffset(delta) {
		state.offset = Math.round((state.offset + delta) * 10) / 10;
		const inp = refs.panel && refs.panel.querySelector("#anysub-offset");
		if (inp) inp.value = state.offset.toFixed(1);
		refresh();
		rememberOffset();
		toast("偏移 " + state.offset.toFixed(1) + "s");
	}
	function setOffset(val) {
		state.offset = Math.round(val * 10) / 10;
		const inp = refs.panel && refs.panel.querySelector("#anysub-offset");
		if (inp) inp.value = state.offset.toFixed(1);
		refresh();
		rememberOffset();
	}
	function rememberOffset() {
		if (!state.offsetKey) return;
		state.offsets[state.offsetKey] = state.offset;
		const keys = Object.keys(state.offsets);
		if (keys.length > 200) delete state.offsets[keys[0]];
		persist();
	}
	function wireEvents() {
		const { fab, panel, fileInput } = refs;
		fab.addEventListener("click", () => {
			if (fab.__dragged) {
				fab.__dragged = false;
				return;
			}
			togglePanel();
		});
		panel.querySelector("#anysub-close").addEventListener("click", () => {
			panel.style.display = "none";
		});
		panel.querySelector("#anysub-choose").addEventListener("click", openFilePicker);
		panel.querySelector("#anysub-online").addEventListener("click", openSearch);
		fileInput.addEventListener("change", () => {
			if (fileInput.files[0]) loadFile(fileInput.files[0]);
			fileInput.value = "";
		});
		panel.querySelector("#anysub-pickvid").addEventListener("click", startPickVideo);
		panel.querySelector("#anysub-clear").addEventListener("click", () => {
			clearSubtitle();
			syncVisBtn();
		});
		panel.querySelector("#anysub-vis").addEventListener("click", () => {
			toggleSubtitles();
			syncVisBtn();
		});
		panel.querySelectorAll("[data-off]").forEach((b) => b.addEventListener("click", () => adjustOffset(parseFloat(b.dataset.off))));
		panel.querySelector("#anysub-offset").addEventListener("input", (e) => {
			const val = parseFloat(e.target.value);
			if (!isNaN(val)) {
				state.offset = val;
				refresh();
				rememberOffset();
			}
		});
		const fontR = panel.querySelector("#anysub-font");
		fontR.addEventListener("input", () => {
			state.style.fontPct = parseInt(fontR.value, 10);
			panel.querySelector("#anysub-fontval").textContent = state.style.fontPct + "%";
			invalidateLayout();
			refresh();
			persist();
		});
		const posR = panel.querySelector("#anysub-pos");
		posR.addEventListener("input", () => {
			state.style.bottomPct = parseInt(posR.value, 10);
			panel.querySelector("#anysub-posval").textContent = state.style.bottomPct + "%";
			invalidateLayout();
			refresh();
			persist();
		});
		setupSeg("#anysub-bg", "bg", (val) => {
			state.style.bg = val;
			applyStyle();
			persist();
		});
		setupSeg("#anysub-color", "color", (val) => {
			state.style.color = val;
			applyStyle();
			persist();
		});
		panel.querySelector("#anysub-tg-ruby").addEventListener("click", () => {
			state.rubyParen = !state.rubyParen;
			syncToggles();
			refresh();
			persist();
		});
		panel.querySelector("#anysub-tg-fab").addEventListener("click", () => {
			state.showFab = !state.showFab;
			syncToggles();
			updateFabVisibility();
			updateWatcher();
			persist();
		});
		setupDrop(panel.querySelector("#anysub-drop"));
		makeDraggable(fab);
		syncControls();
	}
	function updateFabVisibility() {
		if (!state.showFab) {
			refs.fab.style.display = "none";
			return;
		}
		const hasVideo = !!document.querySelector("video") || collectVideos().length > 0;
		refs.fab.style.display = hasVideo ? "" : "none";
	}
	function syncVisBtn() {
		const b = refs.panel.querySelector("#anysub-vis");
		if (!b) return;
		b.classList.toggle("off", state.hidden);
		b.title = state.hidden ? "显示字幕" : "隐藏字幕";
	}
	function syncToggles() {
		const rb = refs.panel.querySelector("#anysub-tg-ruby");
		const fb = refs.panel.querySelector("#anysub-tg-fab");
		rb.classList.toggle("on", state.rubyParen);
		rb.setAttribute("aria-checked", String(state.rubyParen));
		fb.classList.toggle("on", state.showFab);
		fb.setAttribute("aria-checked", String(state.showFab));
	}
	function syncControls() {
		const { panel } = refs;
		const s = state.style;
		panel.querySelector("#anysub-font").value = s.fontPct;
		panel.querySelector("#anysub-fontval").textContent = s.fontPct + "%";
		panel.querySelector("#anysub-pos").value = s.bottomPct;
		panel.querySelector("#anysub-posval").textContent = s.bottomPct + "%";
		setSegActive("#anysub-bg", "bg", s.bg);
		setSegActive("#anysub-color", "color", s.color);
		syncToggles();
		syncVisBtn();
	}
	function setSegActive(sel, attr, val) {
		refs.panel.querySelectorAll(`${sel} button`).forEach((b) => b.classList.toggle("on", b.dataset[attr] === val));
	}
	function setupSeg(sel, attr, cb) {
		const group = refs.panel.querySelector(sel);
		group.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
			group.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
			b.classList.add("on");
			cb(b.dataset[attr]);
		}));
	}
	function setupDrop(el) {
		const on = () => el.classList.add("as-dragover");
		const off = () => el.classList.remove("as-dragover");
		el.addEventListener("dragover", (e) => {
			e.preventDefault();
			on();
		});
		el.addEventListener("dragleave", off);
		el.addEventListener("drop", (e) => {
			off();
			if (!e.dataTransfer || !e.dataTransfer.files.length) return;
			const f = e.dataTransfer.files[0];
			if (/\.(srt|vtt|ass|ssa|sub|sbv|txt)$/i.test(f.name)) {
				e.preventDefault();
				loadFile(f);
			}
		});
	}
	function makeDraggable(el) {
		let sx, sy, ox, oy, moved;
		el.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			const r = el.getBoundingClientRect();
			sx = e.clientX;
			sy = e.clientY;
			ox = r.left;
			oy = r.top;
			moved = false;
			el.classList.add("dragging");
			el.classList.remove("dock-left", "dock-right");
			el.style.left = r.left + "px";
			el.style.top = r.top + "px";
			el.style.right = "auto";
			el.style.bottom = "auto";
			el.setPointerCapture(e.pointerId);
			const move = (ev) => {
				const dx = ev.clientX - sx, dy = ev.clientY - sy;
				if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
				el.style.left = Math.min(window.innerWidth - r.width, Math.max(0, ox + dx)) + "px";
				el.style.top = Math.min(window.innerHeight - r.height, Math.max(0, oy + dy)) + "px";
			};
			const up = () => {
				el.__dragged = moved;
				el.classList.remove("dragging");
				el.removeEventListener("pointermove", move);
				el.removeEventListener("pointerup", up);
				snapFab(el);
			};
			el.addEventListener("pointermove", move);
			el.addEventListener("pointerup", up);
		});
	}
	function snapFab(el) {
		const r = el.getBoundingClientRect();
		const W = window.innerWidth || document.documentElement.clientWidth || 1;
		const onRight = r.left + r.width / 2 >= W / 2;
		el.style.left = "";
		el.style.right = "";
		el.style.bottom = "auto";
		el.style.top = Math.min(window.innerHeight - r.height - 4, Math.max(4, r.top)) + "px";
		el.classList.add(onRight ? "dock-right" : "dock-left");
	}
	function positionPanel() {
		const { fab, panel } = refs;
		const W = window.innerWidth || document.documentElement.clientWidth || 1;
		const H = window.innerHeight || document.documentElement.clientHeight || 800;
		panel.style.left = "";
		panel.style.right = "";
		panel.style.top = "";
		panel.style.bottom = "auto";
		const ph = panel.offsetHeight || 500, pw = panel.offsetWidth || 300;
		if (state.showFab) {
			const fr = fab.getBoundingClientRect();
			if (fr.left + fr.width / 2 >= W / 2) panel.style.right = "12px";
			else panel.style.left = "12px";
			panel.style.top = Math.max(10, Math.min(H - ph - 10, fr.top - ph / 2)) + "px";
		} else {
			panel.style.left = Math.max(10, (W - pw) / 2) + "px";
			panel.style.top = Math.max(10, (H - ph) / 2) + "px";
		}
	}
	var picking = false;
	function startPickVideo() {
		if (picking) return;
		const vids = collectVideos().filter(isVisible);
		if (!vids.length) {
			toast("未找到视频");
			return;
		}
		picking = true;
		toast("点击要挂载字幕的视频画面");
		const overlays = vids.map((v) => {
			const r = v.getBoundingClientRect();
			const o = document.createElement("div");
			o.className = "anysub-vidpick";
			o.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
			o.addEventListener("click", (e) => {
				e.stopPropagation();
				e.preventDefault();
				setVideo(v);
				cleanup();
				toast("已选定视频");
			});
			refs.uiRoot.appendChild(o);
			return o;
		});
		function cleanup() {
			overlays.forEach((o) => o.remove());
			picking = false;
		}
		const esc = (e) => {
			if (e.key === "Escape") {
				cleanup();
				document.removeEventListener("keydown", esc);
			}
		};
		document.addEventListener("keydown", esc);
	}
	var MAP = Object.fromEntries([
		{
			code: "KeyS",
			label: "Alt+Shift+S",
			desc: "打开/关闭面板",
			run: () => togglePanel()
		},
		{
			code: "KeyF",
			label: "Alt+Shift+F",
			desc: "在线找字幕",
			run: () => openSearch()
		},
		{
			code: "KeyV",
			label: "Alt+Shift+V",
			desc: "显示/隐藏字幕",
			run: () => toggleSubtitles()
		},
		{
			code: "KeyO",
			label: "Alt+Shift+O",
			desc: "打开本地文件",
			run: () => openFilePicker()
		},
		{
			code: "ArrowLeft",
			label: "Alt+Shift+←",
			desc: "偏移 −0.1s",
			run: () => adjustOffset(-.1)
		},
		{
			code: "ArrowRight",
			label: "Alt+Shift+→",
			desc: "偏移 +0.1s",
			run: () => adjustOffset(.1)
		}
	].map((s) => [s.code, s.run]));
	function initShortcuts() {
		window.addEventListener("keydown", onKey, true);
	}
	function onKey(e) {
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
	var NON_TEXT_INPUT = new Set([
		"range",
		"checkbox",
		"radio",
		"button",
		"submit",
		"reset",
		"file",
		"image",
		"color",
		"hidden"
	]);
	function isTyping() {
		const el = document.activeElement;
		if (!el) return false;
		if (el.isContentEditable) return true;
		const tag = el.tagName;
		if (tag === "TEXTAREA" || tag === "SELECT") return true;
		if (tag === "INPUT") return !NON_TEXT_INPUT.has((el.type || "text").toLowerCase());
		return false;
	}
	var timer = 0;
	var busy = false;
	function initEpisodeWatch() {
		const titleEl = document.querySelector("title");
		if (!titleEl) return;
		new MutationObserver(() => {
			clearTimeout(timer);
			timer = setTimeout(onTitleChange, 500);
		}).observe(titleEl, {
			childList: true,
			characterData: true,
			subtree: true
		});
	}
	function onTitleChange() {
		if (busy || !state.cues.length) return;
		const { series, episode } = parseVideoTitle(document.title);
		if (episode === "") return;
		if (series === state.loadedSeries && String(episode) === String(state.loadedEpisode)) return;
		const sameShow = series === state.loadedSeries && state.lastOnline;
		clearSubtitle();
		if (sameShow) autoContinue(state.lastOnline, series, episode);
		else {
			state.loadedSeries = "";
			state.loadedEpisode = "";
			toast("已切集,已清除旧字幕");
		}
	}
	async function autoContinue(ctx, series, episode) {
		busy = true;
		const carryOffset = state.offset;
		toast(`检测到切集,正在找第 ${episode} 集字幕…`);
		try {
			const files = await subtitleFiles(ctx.anilistId, episode);
			if (!files.length) {
				toast(`第 ${episode} 集暂无字幕`);
				return;
			}
			const best = pickSameSource(files, ctx.name);
			if (best) {
				if (await downloadAndLoad(best.url, best.name)) {
					markLoaded(ctx.anilistId, best.name);
					if (carryOffset) setOffset(carryOffset);
					toast(`已自动加载第 ${episode} 集字幕`);
				}
			} else {
				toast("未找到同源字幕,请从候选中选择");
				showCandidates(series, files);
			}
		} catch (err) {
			toast("自动找字幕失败:" + (err && err.message));
		} finally {
			busy = false;
		}
	}
	if (!window.__ANYSUB_LOADED__) {
		window.__ANYSUB_LOADED__ = true;
		init();
	}
	function init() {
		if (!document.body) {
			requestAnimationFrame(init);
			return;
		}
		restoreSettings();
		injectStyle();
		buildUI();
		initShortcuts();
		initEpisodeWatch();
		setReactHandler(react);
		updateFabVisibility();
		updateWatcher();
	}
	function react() {
		if (state.cues.length && state.video && (!state.video.isConnected || !isVisible(state.video))) {
			const nv = pickBestVideo();
			if (nv && nv !== state.video) setVideo(nv);
		}
		updateFabVisibility();
	}
	function restoreSettings() {
		const saved = loadSettings();
		const s = state.style;
		if (typeof saved.fontPct === "number") s.fontPct = saved.fontPct;
		if (typeof saved.bottomPct === "number") s.bottomPct = saved.bottomPct;
		if (typeof saved.bg === "string") s.bg = saved.bg;
		if (typeof saved.color === "string") s.color = saved.color;
		if (typeof saved.showFab === "boolean") state.showFab = saved.showFab;
		if (typeof saved.rubyParen === "boolean") state.rubyParen = saved.rubyParen;
		if (typeof saved.jimakuKey === "string") state.jimakuKey = saved.jimakuKey;
		if (saved.offsets && typeof saved.offsets === "object" && !Array.isArray(saved.offsets)) {
			const clean = {};
			for (const k in saved.offsets) {
				const v = saved.offsets[k];
				if (typeof v === "number" && isFinite(v)) clean[k] = v;
			}
			state.offsets = clean;
		}
	}
})();
