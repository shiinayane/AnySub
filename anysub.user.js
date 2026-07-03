// ==UserScript==
// @name         AnySub · 通用字幕挂载
// @name:en      AnySub · Universal Subtitle Loader
// @namespace    https://github.com/shiinayane/anysub
// @version      0.1.0
// @description  给任意网站的 HTML5 视频挂载本地字幕文件(SRT / VTT),支持编码探测与时间轴微调。Chrome / Edge / Safari / Firefox 通用。
// @description:en Load local subtitle files (SRT/VTT) onto any HTML5 video, with encoding detection and timing offset. Works on Chrome/Edge/Safari/Firefox.
// @author       shiinayane
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

/*
 * 架构(阶段一 MVP):
 *   locator  —— 穿透 Shadow DOM 收集 <video>,MutationObserver 监听动态插入
 *   detect   —— 编码探测(UTF-8 → GBK → Big5 回退)
 *   parse    —— SRT / VTT 解析为统一 cue 结构 {start,end,text}
 *   render   —— addTextTrack + VTTCue,支持偏移实时重算
 *   ui       —— 悬浮按钮 + 面板(选文件 / 拖拽 / 视频选择 / 偏移 / 字号)
 *
 * 后续阶段预留:ASS/SSA 高保真(libass-wasm)、跨域 iframe、自定义播放器全屏跟随。
 */

(function () {
  'use strict';

  // 避免在同一 window 重复注入
  if (window.__ANYSUB_LOADED__) return;
  window.__ANYSUB_LOADED__ = true;

  // ────────────────────────────────────────────────────────────
  // 状态
  // ────────────────────────────────────────────────────────────
  const state = {
    video: null,        // 当前挂载的 video 元素
    track: null,        // 当前 TextTrack
    cues: [],           // 原始 cue(未偏移){start,end,text}
    offset: 0,          // 时间偏移(秒),正=字幕延后
    fontSize: 100,      // 字号百分比
    fileName: '',
  };

  // ────────────────────────────────────────────────────────────
  // locator:穿透 Shadow DOM 收集所有 video
  // ────────────────────────────────────────────────────────────
  function collectVideos(root, acc) {
    acc = acc || [];
    root = root || document;
    let list;
    try {
      list = root.querySelectorAll('video');
    } catch (_) {
      list = [];
    }
    list.forEach((v) => acc.push(v));
    // 遍历所有元素找 shadowRoot 递归
    let all;
    try {
      all = root.querySelectorAll('*');
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

  // 默认选可见面积最大的 video
  function pickBestVideo() {
    const vids = collectVideos().filter(isVisible);
    if (!vids.length) return collectVideos()[0] || null;
    vids.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return rb.width * rb.height - ra.width * ra.height;
    });
    return vids[0];
  }

  // ────────────────────────────────────────────────────────────
  // detect:读取文件并做编码探测
  // ────────────────────────────────────────────────────────────
  function readSubtitleFile(file) {
    return file.arrayBuffer().then((buf) => decodeBuffer(new Uint8Array(buf)));
  }

  function decodeBuffer(bytes) {
    // BOM 检测
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return new TextDecoder('utf-8').decode(bytes.subarray(3));
    }
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
      return new TextDecoder('utf-16le').decode(bytes);
    }
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
      return new TextDecoder('utf-16be').decode(bytes);
    }
    // 先尝试严格 UTF-8;失败则回退 GBK → Big5
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (_) {
      for (const enc of ['gbk', 'big5']) {
        try {
          const text = new TextDecoder(enc).decode(bytes);
          if (!text.includes('�')) return text;
        } catch (_) { /* 该浏览器不支持此 legacy 编码,跳过 */ }
      }
      // 兜底:非严格 UTF-8
      return new TextDecoder('utf-8').decode(bytes);
    }
  }

  // ────────────────────────────────────────────────────────────
  // parse:统一解析
  // ────────────────────────────────────────────────────────────
  function parseSubtitle(text, fileName) {
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const isVtt = /^﻿?WEBVTT/.test(text) || /\.vtt$/i.test(fileName || '');
    return isVtt ? parseVtt(text) : parseSrt(text);
  }

  // "00:01:02,500" / "00:01:02.500" / "01:02.500" → 秒
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
      // 跳过纯数字序号行
      if (idx < lines.length && /^\d+$/.test(lines[idx].trim())) idx++;
      if (idx >= lines.length) continue;
      const m = lines[idx].match(timeRe);
      if (!m) continue;
      idx++;
      const start = timeToSeconds(m[1]);
      const end = timeToSeconds(m[2]);
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
      // 可选 cue 标识行(非时间行)
      if (idx < lines.length && !timeRe.test(lines[idx])) idx++;
      if (idx >= lines.length) continue;
      const m = lines[idx].match(timeRe);
      if (!m) continue;
      idx++;
      const start = timeToSeconds(m[1]);
      const end = timeToSeconds(m[2]);
      const body = lines.slice(idx).join('\n').trim();
      if (!body || end <= start) continue;
      cues.push({ start, end, text: sanitize(body) });
    }
    return cues;
  }

  // 只保留 VTTCue 能安全渲染的基础标签,其余剥离
  function sanitize(s) {
    // 去掉 ASS 风格 override {\...}
    s = s.replace(/\{\\[^}]*\}/g, '');
    // 去掉 SRT 的 {...} 定位/位图
    s = s.replace(/\{[^}]*\}/g, '');
    // 去掉 <font ...> 标签但保留内容;保留 i/b/u
    s = s.replace(/<\/?font[^>]*>/gi, '');
    s = s.replace(/<(?!\/?(i|b|u)\b)[^>]*>/gi, '');
    return s;
  }

  // ────────────────────────────────────────────────────────────
  // render:挂载到 video
  // ────────────────────────────────────────────────────────────
  function applyCues() {
    const v = state.video;
    if (!v) return;

    // 关闭旧 track(TextTrack 无法真正移除,只能禁用)
    if (v.textTracks) {
      for (const tt of v.textTracks) {
        if (tt.__anysub) tt.mode = 'disabled';
      }
    }

    const track = v.addTextTrack('subtitles', 'AnySub · ' + (state.fileName || 'local'), 'zh');
    track.__anysub = true;
    track.mode = 'showing';

    for (const c of state.cues) {
      let start = c.start + state.offset;
      let end = c.end + state.offset;
      if (end <= 0) continue;
      if (start < 0) start = 0;
      try {
        track.addCue(new VTTCue(start, end, c.text));
      } catch (_) { /* 个别 cue 时间非法,跳过 */ }
    }
    state.track = track;
    applyFontSize();
    updateStatus();
  }

  // 用 ::cue 样式控制字号(浏览器支持程度不一,尽力而为)
  function applyFontSize() {
    let styleEl = document.getElementById('anysub-cue-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'anysub-cue-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `video::cue{font-size:${state.fontSize}%;}`;
  }

  function reapplyOffset() {
    if (!state.track || !state.cues.length) return;
    // 清空现有 cue 后重建
    const track = state.track;
    if (track.cues) {
      const existing = Array.from(track.cues);
      for (const cue of existing) {
        try { track.removeCue(cue); } catch (_) {}
      }
    }
    for (const c of state.cues) {
      let start = c.start + state.offset;
      let end = c.end + state.offset;
      if (end <= 0) continue;
      if (start < 0) start = 0;
      try {
        track.addCue(new VTTCue(start, end, c.text));
      } catch (_) {}
    }
  }

  // ────────────────────────────────────────────────────────────
  // 载入流程
  // ────────────────────────────────────────────────────────────
  function loadFile(file) {
    if (!file) return;
    state.video = state.video && state.video.isConnected ? state.video : pickBestVideo();
    if (!state.video) {
      toast('未在页面找到视频元素');
      return;
    }
    readSubtitleFile(file)
      .then((text) => {
        const cues = parseSubtitle(text, file.name);
        if (!cues.length) {
          toast('未解析出字幕(格式不支持或文件为空)');
          return;
        }
        state.cues = cues;
        state.fileName = file.name;
        applyCues();
        toast(`已挂载 ${cues.length} 条字幕`);
      })
      .catch((err) => {
        console.error('[AnySub]', err);
        toast('读取字幕失败:' + err.message);
      });
  }

  // ────────────────────────────────────────────────────────────
  // UI
  // ────────────────────────────────────────────────────────────
  let panel, statusEl, fileInput;

  function buildUI() {
    const btn = document.createElement('div');
    btn.id = 'anysub-fab';
    btn.textContent = '字幕';
    btn.title = 'AnySub · 点击打开字幕面板';
    document.body.appendChild(btn);

    panel = document.createElement('div');
    panel.id = 'anysub-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="anysub-row anysub-head">
        <span>AnySub 字幕</span>
        <span id="anysub-close">✕</span>
      </div>
      <div class="anysub-row">
        <button id="anysub-choose">选择字幕文件</button>
        <button id="anysub-pickvid" title="页面有多个视频时,点此再点视频画面来指定">选视频</button>
      </div>
      <div class="anysub-row anysub-drop" id="anysub-drop">或将字幕文件拖到这里</div>
      <div class="anysub-row">
        <label>偏移</label>
        <button data-off="-1">−1s</button>
        <button data-off="-0.5">−0.5</button>
        <span id="anysub-offset">0.0s</span>
        <button data-off="0.5">+0.5</button>
        <button data-off="1">+1s</button>
      </div>
      <div class="anysub-row">
        <label>字号</label>
        <input type="range" id="anysub-font" min="50" max="250" value="100" step="10">
        <span id="anysub-fontval">100%</span>
      </div>
      <div class="anysub-row anysub-status" id="anysub-status">未加载字幕</div>
    `;
    document.body.appendChild(panel);

    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.srt,.vtt,.ass,.ssa,.sub,.sbv,text/plain';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    statusEl = panel.querySelector('#anysub-status');

    // 事件
    btn.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    panel.querySelector('#anysub-close').addEventListener('click', () => {
      panel.style.display = 'none';
    });
    panel.querySelector('#anysub-choose').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) loadFile(fileInput.files[0]);
      fileInput.value = '';
    });
    panel.querySelector('#anysub-pickvid').addEventListener('click', startPickVideo);

    // 偏移按钮
    panel.querySelectorAll('[data-off]').forEach((b) => {
      b.addEventListener('click', () => {
        state.offset = Math.round((state.offset + parseFloat(b.dataset.off)) * 10) / 10;
        panel.querySelector('#anysub-offset').textContent = state.offset.toFixed(1) + 's';
        reapplyOffset();
      });
    });

    // 字号
    const fontRange = panel.querySelector('#anysub-font');
    fontRange.addEventListener('input', () => {
      state.fontSize = parseInt(fontRange.value, 10);
      panel.querySelector('#anysub-fontval').textContent = state.fontSize + '%';
      applyFontSize();
    });

    // 拖拽
    setupDrop(panel.querySelector('#anysub-drop'));
    setupDrop(document.body);
  }

  function setupDrop(el) {
    el.addEventListener('dragover', (e) => { e.preventDefault(); });
    el.addEventListener('drop', (e) => {
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      const f = e.dataTransfer.files[0];
      if (/\.(srt|vtt|ass|ssa|sub|sbv|txt)$/i.test(f.name)) {
        e.preventDefault();
        loadFile(f);
      }
    });
  }

  // 手动选视频:高亮 + 点击选中
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
        e.stopPropagation();
        e.preventDefault();
        state.video = v;
        if (state.cues.length) applyCues();
        cleanup();
        toast('已选定视频');
      });
      document.body.appendChild(o);
      return o;
    });
    function cleanup() {
      overlays.forEach((o) => o.remove());
      picking = false;
    }
    // ESC 取消
    const esc = (e) => { if (e.key === 'Escape') { cleanup(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
  }

  function updateStatus() {
    if (!statusEl) return;
    statusEl.textContent = state.cues.length
      ? `已加载:${state.fileName} · ${state.cues.length} 条`
      : '未加载字幕';
  }

  // 轻量提示
  let toastTimer;
  function toast(msg) {
    let t = document.getElementById('anysub-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'anysub-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 2500);
  }

  // ────────────────────────────────────────────────────────────
  // 样式
  // ────────────────────────────────────────────────────────────
  function injectStyle() {
    const css = `
      #anysub-fab{position:fixed;right:16px;bottom:16px;z-index:2147483646;
        background:#2b6cff;color:#fff;padding:8px 12px;border-radius:20px;
        font:13px/1 -apple-system,system-ui,sans-serif;cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,.3);user-select:none;opacity:.85;}
      #anysub-fab:hover{opacity:1;}
      #anysub-panel{position:fixed;right:16px;bottom:56px;z-index:2147483647;
        width:280px;background:#1e1e1e;color:#eee;border-radius:10px;padding:10px;
        font:13px/1.4 -apple-system,system-ui,sans-serif;
        box-shadow:0 4px 20px rgba(0,0,0,.5);}
      #anysub-panel .anysub-row{display:flex;align-items:center;gap:6px;margin:8px 0;flex-wrap:wrap;}
      #anysub-panel .anysub-head{justify-content:space-between;font-weight:600;margin-top:0;}
      #anysub-close{cursor:pointer;opacity:.6;}
      #anysub-close:hover{opacity:1;}
      #anysub-panel button{background:#333;color:#eee;border:1px solid #555;
        border-radius:6px;padding:5px 8px;cursor:pointer;font-size:12px;}
      #anysub-panel button:hover{background:#444;}
      #anysub-panel label{opacity:.7;min-width:32px;}
      #anysub-panel .anysub-drop{justify-content:center;border:1px dashed #555;
        border-radius:6px;padding:10px;opacity:.6;font-size:12px;}
      #anysub-offset{min-width:44px;text-align:center;}
      #anysub-font{flex:1;}
      #anysub-panel .anysub-status{opacity:.6;font-size:12px;word-break:break-all;}
      .anysub-vidpick{position:fixed;z-index:2147483647;border:3px solid #2b6cff;
        background:rgba(43,108,255,.15);cursor:pointer;box-sizing:border-box;}
      #anysub-toast{position:fixed;left:50%;bottom:80px;transform:translateX(-50%);
        z-index:2147483647;background:rgba(0,0,0,.85);color:#fff;padding:8px 16px;
        border-radius:6px;font:13px -apple-system,system-ui,sans-serif;
        opacity:0;transition:opacity .3s;pointer-events:none;max-width:80vw;text-align:center;}
    `;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ────────────────────────────────────────────────────────────
  // 动态视频监听:video 被 SPA 替换时保持可用
  // ────────────────────────────────────────────────────────────
  function watchVideos() {
    const mo = new MutationObserver(() => {
      // 当前 video 已从 DOM 移除,且有字幕时,尝试重新挂载到新的 video
      if (state.video && !state.video.isConnected && state.cues.length) {
        const nv = pickBestVideo();
        if (nv && nv !== state.video) {
          state.video = nv;
          applyCues();
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ────────────────────────────────────────────────────────────
  // 初始化
  // ────────────────────────────────────────────────────────────
  function init() {
    if (!document.body) {
      requestAnimationFrame(init);
      return;
    }
    injectStyle();
    buildUI();
    watchVideos();
  }

  init();
})();
