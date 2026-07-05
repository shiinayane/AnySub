// 站点适配器:识别「这是哪部番·第几话」。每个适配器只管提取,拿不准回落 parseVideoTitle。
// 目前仅 DMM TV:其 <title>/og:title 已含清晰的番名+第X話,parseVideoTitle 直接可用;
// URL 的 season/content 是稳定 ID —— content 每集不同(切集信号)、season 同季不变(同源键)。
import { parseVideoTitle } from './title-parse.js';

// og:title 分隔符更干净(… | DMM TV…),优先用;回退 document.title
function ogTitle() {
  const m = document.querySelector('meta[property="og:title"]');
  return (m && m.getAttribute('content')) || document.title;
}
function urlParam(name) {
  try { return new URL(location.href).searchParams.get(name) || ''; } catch (_) { return ''; }
}

const DMM = {
  name: 'dmm',
  match: () => /(^|\.)tv\.dmm\.(com|co\.jp)$/.test(location.hostname),
  isTarget: () => location.pathname.includes('/vod/playback/'),
  detect() {
    const { series, episode } = parseVideoTitle(ogTitle());
    return { series, episode, showKey: urlParam('season'), epKey: urlParam('content') };
  },
};

// Prime Video:番名/集数取自播放器 SDK 元素。类名带哈希后缀(f6gi9c2/bFCPl8 会随构建变),
// 故用稳定的 atvwebplayersdk- 前缀做「包含」匹配,不依赖哈希。剧集信息形如「S1 E1 第1話 …」。
export function parsePrimeEpisode(text) {
  const s = String(text || '');
  const m = s.match(/\bE(\d+)/i) || s.match(/第\s*(\d+)\s*話/); // 优先 SDK 的 E 编号,回退 第X話
  return m ? String(parseInt(m[1], 10)) : '';
}
// 清洗 Prime 的 <title>:「Amazon.co.jp: 〈番名〉を観る | Prime Video」→ 番名
export function cleanPrimeTitle(raw) {
  return String(raw || '')
    .split(/[|｜]/)[0]                        // 去「| Prime Video」
    .replace(/^\s*Amazon\.[a-z.]+:\s*/i, '')  // 去「Amazon.co.jp: 」前缀
    .replace(/\s*(を観る|を視聴|を見る)\s*$/, '') // 去「を観る」后缀
    .trim();
}
const PRIME = {
  name: 'prime',
  match: () => /(^|\.)(primevideo\.com|amazon\.[a-z.]+)$/.test(location.hostname),
  // 播放器 SDK 元素存在即视为在播放页(比 URL 判定稳,Prime 播放路径各区域不一)
  isTarget: () => !!document.querySelector('[class*="atvwebplayersdk-"]'),
  // 切集信号源:Prime 的 <title> 换集常不变,改观察剧集信息元素的变化(集数就在它里面)
  watchEl: () => document.querySelector('[class*="atvwebplayersdk-episode-info"]'),
  detect() {
    const info = document.querySelector('[class*="atvwebplayersdk-episode-info"]');
    const episode = info ? parsePrimeEpisode(info.textContent) : ''; // 电影无此元素 → 空
    const titleEl = document.querySelector('[class*="atvwebplayersdk-title-text"]'); // 稳定类名(后缀 f52hj7o 等是哈希,忽略);比 -title 前缀更精确,避开 title-image 等兄弟元素
    const series = (titleEl && titleEl.textContent.trim()) || cleanPrimeTitle(document.title);
    return { series, episode };
  },
};

const ADAPTERS = [DMM, PRIME];

// 当前站点的适配器(无则 null)。用于:只在已知站点启用「自动提示」,避免在任意页面打扰。
export function getSiteAdapter() {
  return ADAPTERS.find((a) => a.match()) || null;
}

// 通用识别:命中适配器且在其目标页则用之,否则回落标题解析。返回 { series, episode, showKey?, epKey? }。
export function detectShow() {
  const ad = getSiteAdapter();
  if (ad && ad.isTarget()) {
    const info = ad.detect();
    if (info && info.series) return info;
  }
  return parseVideoTitle(document.title);
}
