// DMM TV 适配器。<title>/og:title 已含清晰的番名 + 第X話,parseVideoTitle 直接可用;
// URL 的 season/content 是稳定 ID —— content 每集不同(=切集信号)、season 同季不变(=同源键)。
import { parseVideoTitle } from '../title-parse.js';
import type { SiteAdapter } from '../../types.js';

// og:title 分隔符更干净(… | DMM TV…),优先用;回退 document.title
function ogTitle(): string {
  const m = document.querySelector('meta[property="og:title"]');
  return (m && m.getAttribute('content')) || document.title;
}
function urlParam(name: string): string {
  try {
    return new URL(location.href).searchParams.get(name) || '';
  } catch (_) {
    return '';
  }
}

export const dmm: SiteAdapter = {
  name: 'dmm',
  match: () => /(^|\.)tv\.dmm\.(com|co\.jp)$/.test(location.hostname),
  isTarget: () => location.pathname.includes('/vod/playback/'),
  detect() {
    const { series, episode } = parseVideoTitle(ogTitle());
    return { series, episode, showKey: urlParam('season'), epKey: urlParam('content') };
  },
};
