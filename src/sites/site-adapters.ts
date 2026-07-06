// 站点识别机制(与具体站点解耦):按注册表挑当前站点的适配器,做「命中即用、否则回落标题解析」。
// 各站点的提取逻辑在 ./adapters/*.ts(一站一文件),注册表在 ./adapters/index.ts;
// 新增站点见 README「Adding a site adapter」。
import { parseVideoTitle } from './title-parse.js';
import { ADAPTERS } from './adapters/index.js';
import type { DetectInfo, SiteAdapter } from '../types.js';

// 当前站点的适配器(无则 null)。用于:只在已知站点启用「自动提示」,避免在任意页面打扰。
export function getSiteAdapter(): SiteAdapter | null {
  return ADAPTERS.find((a) => a.match()) || null;
}

// 通用识别:命中适配器且在其目标页则用之,否则回落标题解析。返回 { series, episode, showKey?, epKey? }。
export function detectShow(): DetectInfo {
  const ad = getSiteAdapter();
  if (ad && ad.isTarget()) {
    const info = ad.detect();
    if (info && info.series) return info;
  }
  return parseVideoTitle(document.title);
}
