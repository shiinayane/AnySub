import { test } from 'node:test';
import assert from 'node:assert/strict';

// 站点适配器读全局 location/document;node 里默认没有,逐用例注入桩再导入模块。
// els: 选择器片段 → 元素文本(模拟 Prime 的 atvwebplayersdk-* 元素);ogTitle 走 meta。
function stub({ hostname, pathname, href, title, ogTitle, els }) {
  globalThis.location = { hostname, pathname, href };
  globalThis.document = {
    title,
    querySelector: (sel) => {
      if (ogTitle != null && sel.includes('og:title')) return { getAttribute: () => ogTitle };
      if (sel === '[class*="atvwebplayersdk-"]') return (els && Object.keys(els).length) ? { textContent: '' } : null; // isTarget 探针
      if (els) { // 取「最具体(最长)」匹配片段,避免 episode-info 命中 title 的桩
        let best = null, len = -1;
        for (const frag in els) if (sel.includes(frag) && frag.length > len) { best = els[frag]; len = frag.length; }
        if (best != null) return { textContent: best };
      }
      return null;
    },
  };
}

const { getSiteAdapter, detectShow, parsePrimeEpisode, cleanPrimeTitle } = await import('../src/site-adapters.js');

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

// ── Prime Video ──
test('Prime 播放页:剧集信息元素 → 番名 + 集数(用稳定的 atvwebplayersdk- 前缀,不依赖哈希类名)', () => {
  stub({
    hostname: 'www.amazon.co.jp', pathname: '/gp/video/detail/xxx',
    href: 'https://www.amazon.co.jp/gp/video/detail/xxx',
    title: 'Amazon.co.jp: 攻殻機動隊 STAND ALONE COMPLEXを観る | Prime Video',
    els: {
      'atvwebplayersdk-episode-info': 'S1 E1 第1話 公安9課　SECTION-9',
      'atvwebplayersdk-title-text': '攻殻機動隊　STAND ALONE COMPLEX',
    },
  });
  assert.equal(getSiteAdapter().name, 'prime');
  assert.deepEqual(detectShow(), { series: '攻殻機動隊　STAND ALONE COMPLEX', episode: '1' });
});

test('Prime 无稳定标题元素时回落清洗 <title>', () => {
  stub({
    hostname: 'www.primevideo.com', pathname: '/detail/xxx',
    href: 'https://www.primevideo.com/detail/xxx',
    title: 'Amazon.co.jp: 攻殻機動隊 STAND ALONE COMPLEXを観る | Prime Video',
    els: { 'atvwebplayersdk-episode-info': 'S2 E5 第5話 サブタイトル' },
  });
  assert.deepEqual(detectShow(), { series: '攻殻機動隊 STAND ALONE COMPLEX', episode: '5' });
});

test('Prime 电影(无剧集信息元素)→ 集数为空', () => {
  stub({
    hostname: 'www.amazon.co.jp', pathname: '/gp/video/detail/yyy',
    href: 'https://www.amazon.co.jp/gp/video/detail/yyy',
    title: 'Amazon.co.jp: GHOST IN THE SHELL/攻殻機動隊を観る | Prime Video',
    els: { 'atvwebplayersdk-title-text': 'GHOST IN THE SHELL/攻殻機動隊' },
  });
  assert.deepEqual(detectShow(), { series: 'GHOST IN THE SHELL/攻殻機動隊', episode: '' });
});

test('parsePrimeEpisode:优先 E 编号,回退 第X話', () => {
  assert.equal(parsePrimeEpisode('S1 E1 第1話 公安9課'), '1');
  assert.equal(parsePrimeEpisode('S2 E12 something'), '12');
  assert.equal(parsePrimeEpisode('第7話 タイトル'), '7');
  assert.equal(parsePrimeEpisode(''), '');
});

test('cleanPrimeTitle:去 Amazon 前缀 / を観る 后缀 / 站点名', () => {
  assert.equal(cleanPrimeTitle('Amazon.co.jp: 鬼滅の刃を観る | Prime Video'), '鬼滅の刃');
  assert.equal(cleanPrimeTitle('Amazon.com: Attack on Titanを観る | Prime Video'), 'Attack on Titan');
});

// ── 切集信号源:适配器可选提供 watchEl,否则回落 <title> ──
test('Prime 提供 watchEl(剧集信息元素);DMM 不提供 → 由 episode-signal 回落 <title>', () => {
  stub({
    hostname: 'www.amazon.co.jp', pathname: '/gp/video/detail/x',
    href: 'https://www.amazon.co.jp/gp/video/detail/x', title: 'x',
    els: { 'atvwebplayersdk-episode-info': 'S1 E1 第1話' },
  });
  const prime = getSiteAdapter();
  assert.equal(typeof prime.watchEl, 'function');
  assert.ok(prime.watchEl()); // 返回剧集信息元素(切集信号源)

  stub({
    hostname: 'tv.dmm.com', pathname: '/vod/playback/on-demand/',
    href: 'https://tv.dmm.com/vod/playback/on-demand/?season=S&content=C', title: 'x',
  });
  assert.equal(getSiteAdapter().watchEl, undefined); // DMM <title> 已带集数 → 无需 watchEl
});
