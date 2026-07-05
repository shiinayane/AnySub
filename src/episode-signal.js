// 切集信号(单一来源):集中一个 MutationObserver,观察「站点适配器指定的元素」(watchEl)
// 优先,否则回落 <title>;去抖后重读 detectShow(),仅当 series/episode 指纹变化才通知订阅者。
// 好处:切集监听「观察什么」交给站点规则(扩展新站只改适配器),订阅者(切集续播 / 自动提示)
// 共用同一信号且被指纹去重——无关的标题抖动不再触发多余工作。
import { detectShow, getSiteAdapter } from './site-adapters.js';

const subs = [];
let mo = null,
  debounce = 0,
  poll = 0,
  armed = null,
  lastSig = null;

// 订阅切集(回调收到最新 detectShow() 结果)
export function onEpisodeChange(fn) {
  subs.push(fn);
}

function sig(info) {
  return (info.series || '') + '#' + (info.episode || '');
}

// 观察目标:站点规则(适配器在目标页提供的 watchEl)优先,回落 <title>
function target() {
  const ad = getSiteAdapter();
  if (ad && ad.isTarget() && ad.watchEl) {
    const el = ad.watchEl();
    if (el) return el;
  }
  return document.querySelector('title');
}

function fire() {
  const info = detectShow();
  const s = sig(info);
  if (s === lastSig) return; // 指纹未变 → 不是切集,忽略
  lastSig = s;
  for (const fn of subs) {
    try {
      fn(info);
    } catch (_) {
      /* 单个订阅者出错不影响其余 */
    }
  }
}

function arm() {
  const node = target();
  if (!node || node === armed) return; // 目标未变则不重挂
  if (mo) mo.disconnect();
  armed = node;
  mo = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(fire, 500);
  });
  mo.observe(node, { childList: true, characterData: true, subtree: true });
}

export function initEpisodeSignal() {
  lastSig = sig(detectShow()); // 记录基线,首次不算切集
  arm();
  const ad = getSiteAdapter();
  // 纯 <title> 站点(含 DMM、普通站):目标稳定,arm 一次即可,零心跳 → 守空闲开销。
  if (!ad || !ad.watchEl) return;
  // 观察目标是动态元素(如 Prime,晚出现 / 被 SPA 替换)→ 轮询兜底:重挂观察器 + 主动重算指纹。
  // 关键:换集时 Prime 常「整体替换」剧集信息元素,挂在旧节点上的观察器会失灵、错过变更;
  // fire() 是指纹去重的,定期主动调用即可在 ≤1.5s 内补捉到切集,不依赖那次 mutation。
  // 若始终未进播放页(如 amazon 购物页),探测约 30s 无果即停,不长期占用。
  let n = 0;
  poll = setInterval(() => {
    arm();
    fire();
    if (ad.isTarget())
      n = 0; // 在播放页 → 重置计数(正常浏览一阵后不再永久停摆)
    else if (++n > 20) {
      clearInterval(poll);
      poll = 0;
    } // 仅「持续 ~30s 未进播放页」才停,守空闲
  }, 1500);
}
