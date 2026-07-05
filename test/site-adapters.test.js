import { test } from 'node:test';
import assert from 'node:assert/strict';

// 站点适配器读全局 location/document;node 里默认没有,逐用例注入桩再导入模块。
function stub({ hostname, pathname, href, title, ogTitle }) {
  globalThis.location = { hostname, pathname, href };
  globalThis.document = {
    title,
    querySelector: (sel) =>
      (ogTitle != null && sel.includes('og:title')) ? { getAttribute: () => ogTitle } : null,
  };
}

const { getSiteAdapter, detectShow } = await import('../src/site-adapters.js');

const DMM_TITLE = 'メイドインアビス　烈日の黄金郷 第2話 還らずの都 (アニメ/2022年)｜アニメ・ドラマの動画配信ならDMM TV';
const DMM_OG = 'メイドインアビス　烈日の黄金郷 第2話 還らずの都 (アニメ/2022年) | DMM TVで14日間無料体験';

test('DMM 播放页:识别番名/集数 + season/content ID', () => {
  stub({
    hostname: 'tv.dmm.com',
    pathname: '/vod/playback/on-demand/',
    href: 'https://tv.dmm.com/vod/playback/on-demand/?season=SEASONID&content=CONTENTID',
    title: DMM_TITLE, ogTitle: DMM_OG,
  });
  assert.equal(getSiteAdapter().name, 'dmm');
  assert.deepEqual(detectShow(), {
    series: 'メイドインアビス　烈日の黄金郷', episode: '2',
    showKey: 'SEASONID', epKey: 'CONTENTID',
  });
});

test('DMM 非播放页(如详情页):不当作目标,回落标题解析', () => {
  stub({
    hostname: 'tv.dmm.com', pathname: '/vod/detail/',
    href: 'https://tv.dmm.com/vod/detail/?season=S&content=C',
    title: DMM_TITLE, ogTitle: DMM_OG,
  });
  assert.equal(getSiteAdapter().name, 'dmm'); // 站点匹配
  const r = detectShow(); // 但非播放页 → 回落 parseVideoTitle,无 showKey/epKey
  assert.equal(r.series, 'メイドインアビス　烈日の黄金郷');
  assert.equal(r.episode, '2');
  assert.equal(r.showKey, undefined);
});

test('非已知站点:无适配器,detectShow 回落标题解析', () => {
  stub({
    hostname: 'example.com', pathname: '/watch',
    href: 'https://example.com/watch',
    title: '鬼滅の刃 第5話 (アニメ)｜Example',
  });
  assert.equal(getSiteAdapter(), null);
  assert.deepEqual(detectShow(), { series: '鬼滅の刃', episode: '5' });
});
