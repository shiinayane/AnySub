import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFeatureVideo } from '../src/auto-offer.js';

const rect = (w, h) => ({ getBoundingClientRect: () => ({ width: w, height: h }) });
const VW = 1280, VH = 800;

// 真实数据点(用户实测 Prime):正片在播放
test('Prime 播放页正片(dur1566 起播有声)→ 命中', () => {
  assert.equal(isFeatureVideo(
    { duration: 1566.28, paused: false, currentTime: 238.75, muted: false, volume: 1, ...rect(1280, 720) }, VW, VH), true);
});

// 真实数据点:首页预加载但暂停的长视频(dur9721 paused cur0 muted:false)→ 必须排除
test('首页预加载但暂停的视频 → 排除(paused/cur=0 是主闸门)', () => {
  assert.equal(isFeatureVideo(
    { duration: 9721.34, paused: true, currentTime: 0, muted: false, volume: 1, ...rect(1280, 400) }, VW, VH), false);
});

test('占位元素 dur:NaN → 排除', () => {
  assert.equal(isFeatureVideo({ duration: NaN, paused: true, currentTime: 0, muted: false, volume: 1, ...rect(0, 0) }, VW, VH), false);
});

test('静音自动播放的 hero 预览(小尺寸)→ 排除', () => {
  assert.equal(isFeatureVideo(
    { duration: 600, paused: false, currentTime: 5, muted: true, volume: 1, ...rect(600, 200) }, VW, VH), false);
});

test('静音但占大半视口(主播放器,静音观看)→ 命中(兜底)', () => {
  assert.equal(isFeatureVideo(
    { duration: 600, paused: false, currentTime: 5, muted: true, volume: 1, ...rect(1280, 720) }, VW, VH), true);
});

test('短视频(<120s)即使在播也不算正片', () => {
  assert.equal(isFeatureVideo(
    { duration: 45, paused: false, currentTime: 5, muted: false, volume: 1, ...rect(1280, 720) }, VW, VH), false);
});
