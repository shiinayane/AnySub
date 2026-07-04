// 动画字幕语义排版:识别「话者名 / 非语音(音效·动作·心声) / 歌词」并分别标记。
// 纯逻辑(有单测)。只重排不删字;规则保守——仅处理「整行括号」或「行首括号+台词」,
// 普通台词一律不动。日文 CC 里话者名与音效都用 （　），靠两遍扫描消歧:
//   1) buildSpeakers:先把「行首（X）+台词」中的 X 收成话者名词表
//   2) classifyCueLine:独立（X）若 X 在词表 → 话者名,否则 → 非语音
const NAME = 16; // 括号内长度上限(话者名/短音效);过长不认,避免吞掉正文

// 行首「（名前）」+ 其后有台词 → 这里的 X 是确定的话者名
const RE_LEAD = new RegExp('^[（(]([^（()）]{1,' + NAME + '})[）)]\\s*(\\S[\\s\\S]*)$');
// 整行就是一个「（…）」
const RE_ALONE = new RegExp('^[（(]([^（()）]{1,' + NAME + '})[）)]$');

// 扫全部 cue,收集确定的话者名(仅取「行首（X）+台词」形态)。
// cue 内多行用 <br> 分隔(sanitize 把 \n 转成 <br>),故逐行扫描。
export function buildSpeakers(cues) {
  const set = new Set();
  for (const c of cues || []) {
    const raw = (c && c.text != null) ? String(c.text) : '';
    for (const line of raw.split('<br>')) {
      const m = RE_LEAD.exec(line.trim());
      if (m) set.add(m[1]);
    }
  }
  return set;
}

// 分类单行。返回 { type, name?, rest? }:
//   'dialogue' 行首话者名+台词(name=名, rest=台词)
//   'speaker'  独立成行的话者名(name=名)
//   'sfx'      独立括号的非语音(音效/动作/心声/旁白)
//   'voice'    画外音/心声/电话/旁白 〈…〉／＜…＞(带声、不在场)
//   'book'     书面/引用 《…》(书信/念白/画面读字;整行,不与注音 漢字《かな》冲突)
//   'lyric'    歌词(行首 ♪)
//   'plain'    普通台词(含 furigana,交给 ruby)
export function classifyCueLine(raw, speakers) {
  const t = (raw == null ? '' : String(raw)).trim();
  if (!t) return { type: 'plain' };
  if (/^[♪♫]/.test(t)) return { type: 'lyric' };
  // 整行被角括号包裹 → 画外音/心声;整行被双书名号包裹 → 书面引用。
  // 注音是「漢字《かな》」(汉字紧贴、非整行),整行 《…》 不会命中,故不冲突。
  if (/^[〈＜][\s\S]+[〉＞]$/.test(t)) return { type: 'voice' };
  if (/^《[\s\S]+》$/.test(t)) return { type: 'book' };

  let m = RE_ALONE.exec(t);
  if (m) {
    const inner = m[1];
    if (speakers && speakers.has(inner)) return { type: 'speaker', name: inner };
    return { type: 'sfx' };
  }
  m = RE_LEAD.exec(t);
  if (m) return { type: 'dialogue', name: m[1], rest: m[2] };

  return { type: 'plain' };
}
