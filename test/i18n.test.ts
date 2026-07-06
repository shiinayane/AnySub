import { test } from 'vitest';
import assert from 'node:assert/strict';
import { t } from '../src/i18n.js';

// Regression: $&/$1/$$ inside interpolated values must not be treated as replacement patterns by String.replace (show names/file names/error messages are remote data)
test('t() 插值:值含 $ 序列原样保留', () => {
  const out = t('toast.mountedFile', { name: 'A$&B$1C$$D$`E' });
  assert.ok(out.includes('A$&B$1C$$D$`E'), '含 $ 的值应原样出现,实际: ' + out);
});

test('t() 缺 key 返回 key 本身', () => {
  assert.equal(t('no.such.key'), 'no.such.key');
});

test('t() 多占位符各自替换', () => {
  const out = t('offer.found', { title: 'X$1', ep: '2', n: 3 });
  assert.ok(out.includes('X$1') && out.includes('2') && out.includes('3'), out);
});
