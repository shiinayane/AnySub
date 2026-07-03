// ==UserScript==
// @name         AnySub · 通用字幕挂载
// @namespace    https://github.com/shiinayane/anysub
// @version      0.4.0
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
		fileName: "",
		active: false,
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
  #anysub-panel .anysub-status{opacity:.6;font-size:12px;word-break:break-all;}
  .anysub-vidpick{position:fixed;z-index:2147483647;border:3px solid #2b6cff;background:rgba(43,108,255,.15);cursor:pointer;box-sizing:border-box;}
  #anysub-toast{position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:2147483647;
    background:rgba(0,0,0,.85);color:#fff;padding:8px 16px;border-radius:6px;
    font:13px -apple-system,system-ui,sans-serif;opacity:0;transition:opacity .3s;pointer-events:none;max-width:80vw;text-align:center;}
`;
	function injectStyle() {
		const s = document.createElement("style");
		s.textContent = CSS;
		document.head.appendChild(s);
	}
	var refs = {
		uiRoot: null,
		overlay: null,
		cueBox: null,
		fab: null,
		panel: null,
		statusEl: null,
		fileInput: null
	};
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
		refs.statusEl.textContent = state.cues.length ? `已加载:${state.fileName} · ${state.cues.length} 条` : "未加载字幕";
	}
	var intervalId = 0, driversAttached = false;
	var lastHtml = "", lastRectKey = "";
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
	function startRender() {
		state.active = true;
		if (!driversAttached) {
			driversAttached = true;
			window.addEventListener("scroll", renderTick, true);
			window.addEventListener("resize", renderTick, true);
			["fullscreenchange", "webkitfullscreenchange"].forEach((ev) => document.addEventListener(ev, () => {
				lastRectKey = "";
				renderTick();
			}));
		}
		if (!intervalId) intervalId = setInterval(renderTick, 120);
		renderTick();
	}
	function renderTick() {
		if (!state.active) return;
		const v = state.video;
		if (v && v.isConnected && state.cues.length) {
			ensureMounted(refs.overlay);
			ensureMounted(refs.uiRoot);
			positionOverlay(v);
			renderActiveCues(v);
		} else refs.overlay.style.display = "none";
	}
	function positionOverlay(v) {
		const r = v.getBoundingClientRect();
		const key = `${r.left}|${r.top}|${r.width}|${r.height}`;
		if (key === lastRectKey) return;
		lastRectKey = key;
		const { overlay, cueBox } = refs;
		overlay.style.display = "block";
		overlay.style.left = r.left + "px";
		overlay.style.top = r.top + "px";
		overlay.style.width = r.width + "px";
		overlay.style.height = r.height + "px";
		const fontPx = Math.max(10, r.height * FONT_BASE * (state.style.fontPct / 100));
		cueBox.style.fontSize = fontPx.toFixed(1) + "px";
		cueBox.style.bottom = r.height * state.style.bottomPct / 100 + "px";
	}
	function renderActiveCues(v) {
		const t = v.currentTime - state.offset;
		const parts = [];
		for (const c of state.cues) if (t >= c.start && t <= c.end) parts.push(c.text);
		const html = parts.join("<br>");
		if (html === lastHtml) return;
		lastHtml = html;
		refs.cueBox.innerHTML = html;
		refs.cueBox.style.display = html ? "inline-block" : "none";
	}
	function applyStyle() {
		const s = state.style;
		const cueBox = refs.cueBox;
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
	}
	function outline(c) {
		return `-2px -2px 1px ${c},2px -2px 1px ${c},-2px 2px 1px ${c},2px 2px 1px ${c},0 0 3px ${c}`;
	}
	function setVideo(v) {
		if (state.video && state.video !== v) {
			state.video.removeEventListener("timeupdate", renderTick);
			state.video.removeEventListener("seeking", renderTick);
		}
		state.video = v;
		lastRectKey = "";
		if (v) {
			v.addEventListener("timeupdate", renderTick);
			v.addEventListener("seeking", renderTick);
		}
		if (state.cues.length) startRender();
	}
	function clearSubtitle() {
		if (!state.cues.length) {
			toast("当前没有字幕");
			return;
		}
		state.cues = [];
		state.fileName = "";
		state.active = false;
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = 0;
		}
		if (refs.overlay) refs.overlay.style.display = "none";
		if (refs.cueBox) refs.cueBox.innerHTML = "";
		lastHtml = "";
		updateStatus();
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
			for (const enc of ["gbk", "big5"]) try {
				const text = new TextDecoder(enc).decode(bytes);
				if (!text.includes("�")) return text;
			} catch (_) {}
			return new TextDecoder("utf-8").decode(bytes);
		}
	}
	function parseSubtitle(text, fileName) {
		text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
		return /^﻿?WEBVTT/.test(text) || /\.vtt$/i.test(fileName || "") ? parseVtt(text) : parseSrt(text);
	}
	function timeToSeconds(t) {
		t = t.trim().replace(",", ".");
		const parts = t.split(":").map(parseFloat);
		let s = 0;
		for (const p of parts) s = s * 60 + p;
		return s;
	}
	function parseSrt(text) {
		const cues = [];
		const blocks = text.split(/\n{2,}/);
		const timeRe = /(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})/;
		for (const block of blocks) {
			const lines = block.split("\n");
			let idx = 0;
			if (idx < lines.length && /^\d+$/.test(lines[idx].trim())) idx++;
			if (idx >= lines.length) continue;
			const m = lines[idx].match(timeRe);
			if (!m) continue;
			idx++;
			const start = timeToSeconds(m[1]), end = timeToSeconds(m[2]);
			const body = lines.slice(idx).join("\n").trim();
			if (!body || end <= start) continue;
			cues.push({
				start,
				end,
				text: sanitize(body)
			});
		}
		return cues;
	}
	function parseVtt(text) {
		const cues = [];
		const timeRe = /(\d{1,2}:\d{2}:\d{2}\.\d{1,3}|\d{1,2}:\d{2}\.\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{1,3}|\d{1,2}:\d{2}\.\d{1,3})/;
		const blocks = text.split(/\n{2,}/);
		for (const block of blocks) {
			if (/^WEBVTT/.test(block) || /^NOTE/.test(block) || /^STYLE/.test(block) || /^REGION/.test(block)) continue;
			const lines = block.split("\n");
			let idx = 0;
			if (idx < lines.length && !timeRe.test(lines[idx])) idx++;
			if (idx >= lines.length) continue;
			const m = lines[idx].match(timeRe);
			if (!m) continue;
			idx++;
			const start = timeToSeconds(m[1]), end = timeToSeconds(m[2]);
			const body = lines.slice(idx).join("\n").trim();
			if (!body || end <= start) continue;
			cues.push({
				start,
				end,
				text: sanitize(body)
			});
		}
		return cues;
	}
	function sanitize(s) {
		s = s.replace(/\{\\[^}]*\}/g, "");
		s = s.replace(/\{[^}]*\}/g, "");
		s = s.replace(/<\/?font[^>]*>/gi, "");
		s = s.replace(/<(?!\/?(i|b|u)\b)[^>]*>/gi, "");
		s = s.replace(/\n/g, "<br>");
		return s;
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
	function loadFile(file) {
		if (!file) return;
		if (!state.video || !state.video.isConnected) {
			const v = pickBestVideo();
			if (v) setVideo(v);
		}
		if (!state.video) {
			toast("未在页面找到视频元素");
			return;
		}
		readSubtitleFile(file).then((text) => {
			const cues = parseSubtitle(text, file.name);
			if (!cues.length) {
				toast("未解析出字幕(格式不支持或文件为空)");
				return;
			}
			state.cues = cues;
			state.fileName = file.name;
			invalidateLayout();
			applyStyle();
			startRender();
			updateStatus();
			toast(`已挂载 ${cues.length} 条字幕`);
		}).catch((err) => {
			console.error("[AnySub]", err);
			toast("读取字幕失败:" + err.message);
		});
	}
	var KEY = "anysub:settings:v1";
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
	function persist() {
		const s = state.style;
		saveSettings({
			fontPct: s.fontPct,
			bottomPct: s.bottomPct,
			bg: s.bg,
			color: s.color
		});
	}
	var PANEL_HTML = `
  <div class="anysub-row anysub-head"><span>AnySub 字幕</span><span id="anysub-close">✕</span></div>
  <div class="anysub-row">
    <button id="anysub-choose">选择字幕文件</button>
    <button id="anysub-pickvid" title="页面多个视频时,点此再点视频画面指定">选视频</button>
    <button id="anysub-clear">清除</button>
  </div>
  <div class="anysub-row anysub-drop" id="anysub-drop">或将字幕文件拖到这里</div>
  <div class="anysub-row">
    <label>偏移</label>
    <button data-off="-1">−1</button><button data-off="-0.1">−0.1</button>
    <input type="number" id="anysub-offset" value="0.0" step="0.1" title="可手动输入,单位秒">
    <span class="anysub-unit">s</span>
    <button data-off="0.1">+0.1</button><button data-off="1">+1</button>
  </div>
  <div class="anysub-row">
    <label>字号</label>
    <input type="range" id="anysub-font" min="50" max="250" value="100" step="5">
    <span id="anysub-fontval">100%</span>
  </div>
  <div class="anysub-row">
    <label>位置</label>
    <input type="range" id="anysub-pos" min="2" max="40" value="8" step="1">
    <span id="anysub-posval">8%</span>
  </div>
  <div class="anysub-row">
    <label>背景</label>
    <div class="anysub-seg" id="anysub-bg">
      <button data-bg="outline">描边</button>
      <button data-bg="translucent" class="on">半透</button>
      <button data-bg="solid">黑底</button>
      <button data-bg="none">无</button>
    </div>
  </div>
  <div class="anysub-row">
    <label>颜色</label>
    <div class="anysub-seg" id="anysub-color">
      <button data-color="#ffffff" class="on" style="color:#fff">白</button>
      <button data-color="#ffe100" style="color:#ffe100">黄</button>
      <button data-color="#00e5ff" style="color:#00e5ff">青</button>
      <button data-color="#7CFC00" style="color:#7CFC00">绿</button>
    </div>
  </div>
  <div class="anysub-row anysub-status" id="anysub-status">未加载字幕</div>
`;
	function buildUI() {
		const uiRoot = document.createElement("div");
		uiRoot.id = "anysub-root";
		const overlay = document.createElement("div");
		overlay.id = "anysub-overlay";
		overlay.style.display = "none";
		const cueBox = document.createElement("div");
		cueBox.id = "anysub-cuebox";
		overlay.appendChild(cueBox);
		const fab = document.createElement("div");
		fab.id = "anysub-fab";
		fab.className = "dock-right";
		fab.textContent = "字";
		fab.title = "AnySub · 点击打开字幕面板(可拖动,松手吸附到最近边缘)";
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
		refs.cueBox = cueBox;
		refs.fab = fab;
		refs.panel = panel;
		refs.fileInput = fileInput;
		refs.statusEl = panel.querySelector("#anysub-status");
		wireEvents();
		applyStyle();
	}
	function wireEvents() {
		const { fab, panel, fileInput } = refs;
		fab.addEventListener("click", () => {
			if (fab.__dragged) {
				fab.__dragged = false;
				return;
			}
			const show = panel.style.display === "none";
			panel.style.display = show ? "block" : "none";
			if (show) positionPanel();
		});
		panel.querySelector("#anysub-close").addEventListener("click", () => {
			panel.style.display = "none";
		});
		panel.querySelector("#anysub-choose").addEventListener("click", () => fileInput.click());
		fileInput.addEventListener("change", () => {
			if (fileInput.files[0]) loadFile(fileInput.files[0]);
			fileInput.value = "";
		});
		panel.querySelector("#anysub-pickvid").addEventListener("click", startPickVideo);
		panel.querySelector("#anysub-clear").addEventListener("click", clearSubtitle);
		const offInput = panel.querySelector("#anysub-offset");
		panel.querySelectorAll("[data-off]").forEach((b) => b.addEventListener("click", () => {
			state.offset = Math.round((state.offset + parseFloat(b.dataset.off)) * 10) / 10;
			offInput.value = state.offset.toFixed(1);
			renderTick();
		}));
		offInput.addEventListener("input", () => {
			const val = parseFloat(offInput.value);
			if (!isNaN(val)) {
				state.offset = val;
				renderTick();
			}
		});
		const fontR = panel.querySelector("#anysub-font");
		fontR.addEventListener("input", () => {
			state.style.fontPct = parseInt(fontR.value, 10);
			panel.querySelector("#anysub-fontval").textContent = state.style.fontPct + "%";
			invalidateLayout();
			renderTick();
			persist();
		});
		const posR = panel.querySelector("#anysub-pos");
		posR.addEventListener("input", () => {
			state.style.bottomPct = parseInt(posR.value, 10);
			panel.querySelector("#anysub-posval").textContent = state.style.bottomPct + "%";
			invalidateLayout();
			renderTick();
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
		setupDrop(panel.querySelector("#anysub-drop"));
		setupDrop(document.body);
		makeDraggable(fab);
		syncControls();
	}
	function syncControls() {
		const { panel } = refs;
		const s = state.style;
		const fontR = panel.querySelector("#anysub-font");
		fontR.value = s.fontPct;
		panel.querySelector("#anysub-fontval").textContent = s.fontPct + "%";
		const posR = panel.querySelector("#anysub-pos");
		posR.value = s.bottomPct;
		panel.querySelector("#anysub-posval").textContent = s.bottomPct + "%";
		setSegActive("#anysub-bg", "bg", s.bg);
		setSegActive("#anysub-color", "color", s.color);
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
		el.addEventListener("dragover", (e) => {
			e.preventDefault();
		});
		el.addEventListener("drop", (e) => {
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
		const fr = fab.getBoundingClientRect();
		const W = window.innerWidth || document.documentElement.clientWidth || 1;
		const onRight = fr.left + fr.width / 2 >= W / 2;
		panel.style.left = "";
		panel.style.right = "";
		panel.style.top = "";
		panel.style.bottom = "";
		if (onRight) panel.style.right = "12px";
		else panel.style.left = "12px";
		const H = window.innerHeight || document.documentElement.clientHeight || 800;
		const ph = panel.offsetHeight || 380;
		panel.style.top = Math.max(10, Math.min(H - ph - 10, fr.top - ph / 2)) + "px";
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
		watchVideos();
	}
	function restoreSettings() {
		const saved = loadSettings();
		const s = state.style;
		if (typeof saved.fontPct === "number") s.fontPct = saved.fontPct;
		if (typeof saved.bottomPct === "number") s.bottomPct = saved.bottomPct;
		if (typeof saved.bg === "string") s.bg = saved.bg;
		if (typeof saved.color === "string") s.color = saved.color;
	}
	function watchVideos() {
		new MutationObserver(() => {
			if (state.video && !state.video.isConnected && state.cues.length) {
				const nv = pickBestVideo();
				if (nv && nv !== state.video) setVideo(nv);
			}
		}).observe(document.documentElement, {
			childList: true,
			subtree: true
		});
	}
})();
