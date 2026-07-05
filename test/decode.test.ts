import { test } from 'vitest';
import assert from 'node:assert/strict';
import { decodeBuffer } from '../src/decode.js';

const enc = (s: string) => new TextEncoder().encode(s); // UTF-8

test('UTF-8 直通', () => {
  assert.equal(decodeBuffer(enc('你好 world 日本語')), '你好 world 日本語');
});

test('去除 UTF-8 BOM', () => {
  const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...enc('あいう')]);
  assert.equal(decodeBuffer(bom), 'あいう');
});

test('UTF-16 LE / BE BOM', () => {
  const le = new Uint8Array([0xff, 0xfe, 0x42, 0x00]); // "B"
  assert.equal(decodeBuffer(le), 'B');
  const be = new Uint8Array([0xfe, 0xff, 0x00, 0x42]);
  assert.equal(decodeBuffer(be), 'B');
});

test('非法 UTF-8 走 CJK 回退且不抛错', () => {
  // 0x82 0xA0 是 Shift-JIS 的「あ」,不是合法 UTF-8
  const out = decodeBuffer(new Uint8Array([0x82, 0xa0]));
  assert.equal(typeof out, 'string');
  assert.ok(out.length >= 1);
});
