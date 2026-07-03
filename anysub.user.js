// ==UserScript==
// @name         AnySub · 通用字幕挂载
// @name:en      AnySub · Universal Subtitle Loader
// @namespace    https://github.com/shiinayane/anysub
// @version      0.2.0
// @description  给任意网站的 HTML5 视频挂载本地字幕文件(SRT / VTT),自绘覆盖层渲染:样式可控、字号随播放器等比缩放、全屏跟随。Chrome / Edge / Safari / Firefox 通用。
// @description:en Load local subtitle files (SRT/VTT) onto any HTML5 video with a custom overlay renderer: full style control, player-relative font scaling, fullscreen following.
// @author       shiinayane
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

/*
 * 架构:
 *   locator  —— 穿透 Shadow DOM 收集 <video>,MutationObserver 监听动态插入
 *   detect   —— 编码探测(UTF-8 → GBK → Big5 回退)
 *   parse    —— SRT / VTT 解析为统一 cue 结构 {start,end,text}
 *   render   —— 自绘覆盖层(overlay):rAF 同步视频位置/尺寸,按播放器高度等比缩放字号,
 *               背景/描边/颜色/位置可控,全屏时把覆盖层与 UI 挂到全屏元素上
 *   ui       —— 非侵入式悬浮胶囊(默认半透明、可拖动)+ 面板
 *
 * 阶段二预留:ASS/SSA 高保真(libass-wasm)、跨域 iframe。
 */

(function () {
  'use strict';

  if (window.__ANYSUB_LOADED__) return;
  window.__ANYSUB_LOADED__ = true;

  // ────────────────────────────────────────────────────────────
  // 状态
  // ────────────────────────────────────────────────────────────
  const state = {
    video: null,
    cues: [],
    offset: 0,          // 秒,正 = 字幕延后
    fileName: '',
    active: false,      // 渲染循环是否运行
    style: {
      fontPct: 100,     // 字号百分比,100% = 视频高度的 4.5%
      bg: 'outline',    // 'outline' | 'translucent' | 'solid' | 'none'
      color: '#ffffff',
      bottomPct: 8,     // 距底部 = 视频高度的百分比
    },
  };
  const FONT_BASE = 0.045; // 100% 时字号占视频高度比例

  // ────────────────────────────────────────────────────────────
  // locator
  // ────────────────────────────────────────────────────────────
  function collectVideos(root, acc) {
    acc = acc || [];
    root = root || document;
    let list;
    try { list = root.querySelectorAll('video'); } catch (_) { list = []; }
    list.forEach((v) => acc.push(v));
    let all;
    try { all = root.querySelectorAll('*'); } catch (_) { all = []; }
    all.forEach((el) => { if (el.shadowRoot) collectVideos(el.shadowRoot, acc); });
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

  // ────────────────────────────────────────────────────────────
  // detect:读取 + 编码探测
  // ────────────────────────────────────────────────────────────
  function readSubtitleFile(file) {
    return file.arrayBuffer().then((buf) => decodeBuffer(new Uint8Array(buf)));
  }

  function decodeBuffer(bytes) {
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
      return new TextDecoder('utf-8').decode(bytes.subarray(3));
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe)
      return new TextDecoder('utf-16le').decode(bytes);
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff)
      return new TextDecoder('utf-16be').decode(bytes);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (_) {
      for (const enc of ['gbk', 'big5']) {
        try {
          const text = new TextDecoder(enc).decode(bytes);
          if (!text.includes('�')) return text;
        } catch (_) { /* 不支持该 legacy 编码 */ }
      }
      return new TextDecoder('utf-8').decode(bytes);
    }
  }

  // ────────────────────────────────────────────────────────────
  // parse
  // ────────────────────────────────────────────────────────────
  function parseSubtitle(text, fileName) {
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const isVtt = /^﻿?WEBVTT/.test(text) || /\.vtt$/i.test(fileName || '');
    return isVtt ? parseVtt(text) : parseSrt(text);
  }

  function timeToSeconds(t) {
    t = t.trim().replace(',', '.');
    const parts = t.split(':').map(parseFloat);
    let s = 0;
    for (const p of parts) s = s * 60 + p;
    return s;
  }

  function parseSrt(text) {
    const cues = [];
    const blocks = text.split(/\n{2,}/);
    const timeRe = /(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})/;
    for (const block of blocks) {
      const lines = block.split('\n');
      let idx = 0;
      if (idx < lines.length && /^\d+$/.test(lines[idx].trim())) idx++;
      if (idx >= lines.length) continue;
      const m = lines[idx].match(timeRe);
      if (!m) continue;
      idx++;
      const start = timeToSeconds(m[1]), end = timeToSeconds(m[2]);
      const body = lines.slice(idx).join('\n').trim();
      if (!body || end <= start) continue;
      cues.push({ start, end, text: sanitize(body) });
    }
    return cues;
  }

  function parseVtt(text) {
    const cues = [];
    const timeRe = /(\d{1,2}:\d{2}:\d{2}\.\d{1,3}|\d{1,2}:\d{2}\.\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{1,3}|\d{1,2}:\d{2}\.\d{1,3})/;
    const blocks = text.split(/\n{2,}/);
    for (const block of blocks) {
      if (/^WEBVTT/.test(block) || /^NOTE/.test(block) || /^STYLE/.test(block) || /^REGION/.test(block)) continue;
      const lines = block.split('\n');
      let idx = 0;
      if (idx < lines.length && !timeRe.test(lines[idx])) idx++;
      if (idx >= lines.length) continue;
      const m = lines[idx].match(timeRe);
      if (!m) continue;
      idx++;
      const start = timeToSeconds(m[1]), end = timeToSeconds(m[2]);
      const body = lines.slice(idx).join('\n').trim();
      if (!body || end <= start) continue;
      cues.push({ start, end, text: sanitize(body) });
    }
    return cues;
  }

  // 剥离危险内容,仅保留基础排版标签,换行转 <br>
  function sanitize(s) {
    s = s.replace(/\{\\[^}]*\}/g, '');       // ASS override {\...}
    s = s.replace(/\{[^}]*\}/g, '');          // SRT {...}
    s = s.replace(/<\/?font[^>]*>/gi, '');    // 去 font 标签保留内容
    s = s.replace(/<(?!\/?(i|b|u)\b)[^>]*>/gi, ''); // 只留 i/b/u
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  // ────────────────────────────────────────────────────────────
  // render:自绘覆盖层
  // ────────────────────────────────────────────────────────────
  let overlay, cueBox, uiRoot;
  let intervalId = 0, driversAttached = false;
  let lastHtml = '', lastRectKey = '';

  function fullscreenEl() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }
  // 覆盖层与 UI 的挂载宿主:全屏时挂到全屏元素(否则会被顶层遮挡)
  function getHost() {
    const fs = fullscreenEl();
    if (fs && fs.tagName !== 'VIDEO') return fs;
    return document.body;
  }

  function ensureMounted(el) {
    const host = getHost();
    if (el.parentNode !== host) host.appendChild(el);
  }

  // 事件驱动 + 定时兜底:不依赖 rAF(后台标签 rAF 会被暂停),更省 CPU
  function startRender() {
    state.active = true;
    if (!driversAttached) {
      driversAttached = true;
      // 滚动/缩放时即时跟随(capture 以捕获内层滚动容器)
      window.addEventListener('scroll', renderTick, true);
      window.addEventListener('resize', renderTick, true);
      ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) =>
        document.addEventListener(ev, () => { lastRectKey = ''; renderTick(); }));
    }
    if (!intervalId) intervalId = setInterval(renderTick, 120); // 兜底:字幕文本 + 布局位移
    renderTick();
  }

  function renderTick() {
    if (!state.active) return;
    const v = state.video;
    if (v && v.isConnected && state.cues.length) {
      ensureMounted(overlay);
      ensureMounted(uiRoot);
      positionOverlay(v);
      renderActiveCues(v);
    } else {
      overlay.style.display = 'none';
    }
  }

  function positionOverlay(v) {
    const r = v.getBoundingClientRect();
    const key = `${r.left}|${r.top}|${r.width}|${r.height}`;
    if (key === lastRectKey) return; // 位置未变则跳过写样式,避免抖动
    lastRectKey = key;
    overlay.style.display = 'block';
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    // 字号 / 底距随播放器高度等比缩放
    const fontPx = Math.max(10, r.height * FONT_BASE * (state.style.fontPct / 100));
    cueBox.style.fontSize = fontPx.toFixed(1) + 'px';
    cueBox.style.bottom = (r.height * state.style.bottomPct / 100) + 'px';
  }

  function renderActiveCues(v) {
    const t = v.currentTime - state.offset;
    const parts = [];
    for (const c of state.cues) {
      if (t >= c.start && t <= c.end) parts.push(c.text);
    }
    const html = parts.join('<br>');
    if (html === lastHtml) return;
    lastHtml = html;
    cueBox.innerHTML = html;
    cueBox.style.display = html ? 'inline-block' : 'none';
  }

  function applyStyle() {
    const s = state.style;
    cueBox.style.color = s.color;
    cueBox.style.textShadow = 'none';
    cueBox.style.background = 'transparent';
    cueBox.style.padding = '0';
    if (s.bg === 'outline') {
      cueBox.style.textShadow = outline('#000');
    } else if (s.bg === 'translucent') {
      cueBox.style.background = 'rgba(0,0,0,.55)';
      cueBox.style.padding = '.08em .4em';
      cueBox.style.textShadow = outline('rgba(0,0,0,.5)');
    } else if (s.bg === 'solid') {
      cueBox.style.background = 'rgba(0,0,0,.92)';
      cueBox.style.padding = '.08em .4em';
    }
  }
  function outline(c) {
    return `-2px -2px 1px ${c},2px -2px 1px ${c},-2px 2px 1px ${c},2px 2px 1px ${c},0 0 3px ${c}`;
  }

  // ────────────────────────────────────────────────────────────
  // 载入流程
  // ────────────────────────────────────────────────────────────
  function setVideo(v) {
    if (state.video && state.video !== v) {
      state.video.removeEventListener('timeupdate', renderTick);
      state.video.removeEventListener('seeking', renderTick);
    }
    state.video = v;
    lastRectKey = '';
    if (v) {
      v.addEventListener('timeupdate', renderTick);
      v.addEventListener('seeking', renderTick);
    }
    if (state.cues.length) startRender();
  }

  function loadFile(file) {
    if (!file) return;
    if (!state.video || !state.video.isConnected) {
      const v = pickBestVideo();
      if (v) setVideo(v);
    }
    if (!state.video) { toast('未在页面找到视频元素'); return; }
    readSubtitleFile(file)
      .then((text) => {
        const cues = parseSubtitle(text, file.name);
        if (!cues.length) { toast('未解析出字幕(格式不支持或文件为空)'); return; }
        state.cues = cues;
        state.fileName = file.name;
        lastRectKey = '';
        applyStyle();
        startRender();
        updateStatus();
        toast(`已挂载 ${cues.length} 条字幕`);
      })
      .catch((err) => { console.error('[AnySub]', err); toast('读取字幕失败:' + err.message); });
  }

  // ────────────────────────────────────────────────────────────
  // UI
  // ────────────────────────────────────────────────────────────
  let panel, statusEl, fileInput, fab;

  function buildUI() {
    uiRoot = document.createElement('div');
    uiRoot.id = 'anysub-root';

    overlay = document.createElement('div');
    overlay.id = 'anysub-overlay';
    overlay.style.display = 'none';
    cueBox = document.createElement('div');
    cueBox.id = 'anysub-cuebox';
    overlay.appendChild(cueBox);

    fab = document.createElement('div');
    fab.id = 'anysub-fab';
    fab.textContent = '字';
    fab.title = 'AnySub · 点击打开字幕面板(可拖动)';

    panel = document.createElement('div');
    panel.id = 'anysub-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="anysub-row anysub-head"><span>AnySub 字幕</span><span id="anysub-close">✕</span></div>
      <div class="anysub-row">
        <button id="anysub-choose">选择字幕文件</button>
        <button id="anysub-pickvid" title="页面多个视频时,点此再点视频画面指定">选视频</button>
      </div>
      <div class="anysub-row anysub-drop" id="anysub-drop">或将字幕文件拖到这里</div>
      <div class="anysub-row">
        <label>偏移</label>
        <button data-off="-1">−1s</button><button data-off="-0.5">−0.5</button>
        <span id="anysub-offset">0.0s</span>
        <button data-off="0.5">+0.5</button><button data-off="1">+1s</button>
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
          <button data-bg="outline" class="on">描边</button>
          <button data-bg="translucent">半透</button>
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

    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.srt,.vtt,.ass,.ssa,.sub,.sbv,text/plain';
    fileInput.style.display = 'none';

    uiRoot.appendChild(overlay);
    uiRoot.appendChild(fab);
    uiRoot.appendChild(panel);
    uiRoot.appendChild(fileInput);
    document.body.appendChild(uiRoot);

    statusEl = panel.querySelector('#anysub-status');

    // 打开/关闭(拖动时不触发)
    fab.addEventListener('click', () => {
      if (fab.__dragged) { fab.__dragged = false; return; }
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    panel.querySelector('#anysub-close').addEventListener('click', () => { panel.style.display = 'none'; });
    panel.querySelector('#anysub-choose').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); fileInput.value = ''; });
    panel.querySelector('#anysub-pickvid').addEventListener('click', startPickVideo);

    panel.querySelectorAll('[data-off]').forEach((b) => b.addEventListener('click', () => {
      state.offset = Math.round((state.offset + parseFloat(b.dataset.off)) * 10) / 10;
      panel.querySelector('#anysub-offset').textContent = state.offset.toFixed(1) + 's';
      renderTick();
    }));

    const fontR = panel.querySelector('#anysub-font');
    fontR.addEventListener('input', () => {
      state.style.fontPct = parseInt(fontR.value, 10);
      panel.querySelector('#anysub-fontval').textContent = state.style.fontPct + '%';
      lastRectKey = ''; renderTick();
    });
    const posR = panel.querySelector('#anysub-pos');
    posR.addEventListener('input', () => {
      state.style.bottomPct = parseInt(posR.value, 10);
      panel.querySelector('#anysub-posval').textContent = state.style.bottomPct + '%';
      lastRectKey = ''; renderTick();
    });

    setupSeg('#anysub-bg', 'bg', (val) => { state.style.bg = val; applyStyle(); });
    setupSeg('#anysub-color', 'color', (val) => { state.style.color = val; applyStyle(); });

    setupDrop(panel.querySelector('#anysub-drop'));
    setupDrop(document.body);
    makeDraggable(fab);
  }

  function setupSeg(sel, attr, cb) {
    const group = panel.querySelector(sel);
    group.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      group.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      cb(b.dataset[attr]);
    }));
  }

  function setupDrop(el) {
    el.addEventListener('dragover', (e) => { e.preventDefault(); });
    el.addEventListener('drop', (e) => {
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      const f = e.dataTransfer.files[0];
      if (/\.(srt|vtt|ass|ssa|sub|sbv|txt)$/i.test(f.name)) { e.preventDefault(); loadFile(f); }
    });
  }

  // 胶囊拖动(避免遮挡画面时可自由移动)
  function makeDraggable(el) {
    let sx, sy, ox, oy, moved;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; moved = false;
      el.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        el.style.left = Math.max(0, ox + dx) + 'px';
        el.style.top = Math.max(0, oy + dy) + 'px';
        el.style.right = 'auto'; el.style.bottom = 'auto';
      };
      const up = () => {
        el.__dragged = moved;
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    });
  }

  // 手动选视频
  let picking = false;
  function startPickVideo() {
    if (picking) return;
    const vids = collectVideos().filter(isVisible);
    if (!vids.length) { toast('未找到视频'); return; }
    picking = true;
    toast('点击要挂载字幕的视频画面');
    const overlays = vids.map((v) => {
      const r = v.getBoundingClientRect();
      const o = document.createElement('div');
      o.className = 'anysub-vidpick';
      o.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
      o.addEventListener('click', (e) => {
        e.stopPropagation(); e.preventDefault();
        setVideo(v); cleanup(); toast('已选定视频');
      });
      uiRoot.appendChild(o);
      return o;
    });
    function cleanup() { overlays.forEach((o) => o.remove()); picking = false; }
    const esc = (e) => { if (e.key === 'Escape') { cleanup(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
  }

  function updateStatus() {
    if (!statusEl) return;
    statusEl.textContent = state.cues.length
      ? `已加载:${state.fileName} · ${state.cues.length} 条`
      : '未加载字幕';
  }

  let toastTimer;
  function toast(msg) {
    let t = document.getElementById('anysub-toast');
    if (!t) { t = document.createElement('div'); t.id = 'anysub-toast'; uiRoot.appendChild(t); }
    t.textContent = msg; t.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 2500);
  }

  // ────────────────────────────────────────────────────────────
  // 样式
  // ────────────────────────────────────────────────────────────
  function injectStyle() {
    const css = `
      #anysub-overlay{position:fixed;z-index:2147483640;pointer-events:none;overflow:hidden;}
      #anysub-cuebox{position:absolute;left:50%;transform:translateX(-50%);
        max-width:92%;text-align:center;line-height:1.25;white-space:pre-wrap;word-break:break-word;
        font-family:-apple-system,'PingFang SC','Microsoft YaHei',system-ui,sans-serif;
        font-weight:600;border-radius:4px;box-sizing:border-box;}
      #anysub-fab{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:30px;height:30px;
        display:flex;align-items:center;justify-content:center;
        background:#2b6cff;color:#fff;border-radius:50%;
        font:14px/1 -apple-system,system-ui,sans-serif;cursor:grab;user-select:none;touch-action:none;
        box-shadow:0 2px 8px rgba(0,0,0,.3);opacity:.35;transition:opacity .25s;}
      #anysub-fab:hover{opacity:1;}
      #anysub-fab:active{cursor:grabbing;}
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
      #anysub-offset{min-width:44px;text-align:center;}
      #anysub-font,#anysub-pos{flex:1;}
      #anysub-panel .anysub-status{opacity:.6;font-size:12px;word-break:break-all;}
      .anysub-vidpick{position:fixed;z-index:2147483647;border:3px solid #2b6cff;background:rgba(43,108,255,.15);cursor:pointer;box-sizing:border-box;}
      #anysub-toast{position:fixed;left:50%;bottom:80px;transform:translateX(-50%);z-index:2147483647;
        background:rgba(0,0,0,.85);color:#fff;padding:8px 16px;border-radius:6px;
        font:13px -apple-system,system-ui,sans-serif;opacity:0;transition:opacity .3s;pointer-events:none;max-width:80vw;text-align:center;}
    `;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ────────────────────────────────────────────────────────────
  // 动态视频监听
  // ────────────────────────────────────────────────────────────
  function watchVideos() {
    const mo = new MutationObserver(() => {
      if (state.video && !state.video.isConnected && state.cues.length) {
        const nv = pickBestVideo();
        if (nv && nv !== state.video) setVideo(nv);
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ────────────────────────────────────────────────────────────
  // init
  // ────────────────────────────────────────────────────────────
  function init() {
    if (!document.body) { requestAnimationFrame(init); return; }
    injectStyle();
    buildUI();
    applyStyle();
    watchVideos();
  }

  init();
})();
