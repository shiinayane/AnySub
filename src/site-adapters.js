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

const ADAPTERS = [DMM];

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
