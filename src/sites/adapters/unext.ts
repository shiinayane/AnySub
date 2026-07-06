// U-NEXT 适配器。番名/集数在播放器标题块(styled-components):sc-6lwken 是组件哈希、dWSOjb/eIsrMu
// 是生成类(每次构建变);故用稳定的 displayName 段 styles__TitleContainer- 做包含匹配,再取其中
// h2(番名)/ h3(集标题,形如「#1 …」)。用「容器+h2/h3」比单独 styles__Title(太泛,全站皆有)更稳。
import type { SiteAdapter } from '../../types.js';

export function parseUnextEpisode(text: string | null | undefined): string {
  const s = String(text || '');
  const m = s.match(/#\s*(\d+)/) || s.match(/第\s*(\d+)\s*話/) || s.match(/\bE(\d+)/i);
  return m ? String(parseInt(m[1], 10)) : '';
}

function unextBox(): Element | null {
  const boxes = document.querySelectorAll('[class*="styles__TitleContainer-"]');
  for (const b of boxes) if (b.querySelector('h2')) return b; // 取含番名 h2 的那个(排除同名泛用容器)
  return null;
}

export const unext: SiteAdapter = {
  name: 'unext',
  match: () => /(^|\.)unext\.jp$/.test(location.hostname),
  isTarget: () => !!unextBox(),
  watchEl: () => unextBox(), // 切集时标题块内容变(h3 集标题)
  detect() {
    const box = unextBox();
    const h2 = box && box.querySelector('h2');
    const h3 = box && box.querySelector('h3');
    return {
      series: h2 ? (h2.textContent || '').trim() : '',
      episode: parseUnextEpisode(h3 ? h3.textContent : ''),
    };
  },
};
