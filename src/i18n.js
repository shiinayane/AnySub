// 轻量 i18n(零依赖):en / zh / ja 三语,en 为兜底。
// 语言优先级:用户手动选择(state.lang,持久化)> 浏览器语言 > en。
// t(key, params) 取当前语言字符串;{name}/{n}/{ep}/{msg}/{v} 等占位符用 params 插值。
// 语言可运行时切换(面板语言选择器)→ setLang() 后各处重建 DOM 即刷新。
import { state } from './state.js';

const SUPPORTED = ['en', 'zh', 'ja'];

// 检测当前语言:手选优先,否则按 navigator.language 归一到三语之一,再兜底 en
export function getLocale() {
  if (state.lang && SUPPORTED.includes(state.lang)) return state.lang;
  const l = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  if (l.startsWith('zh')) return 'zh';
  if (l.startsWith('ja')) return 'ja';
  return 'en';
}

export function setLang(lang) {
  state.lang = SUPPORTED.includes(lang) ? lang : null; // null = 跟随浏览器
}

// 语言选择器用:选项列表(value 为 lang code 或 '' 表示自动)
export const LANG_OPTIONS = [
  { value: '', label: 'Auto' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
];

// key → { en, zh, ja }。缺某语言时回落 en。
const DICT = {
  // ── 主面板 ──
  'panel.close': {
    en: 'Close (Ctrl/Alt+Shift+S)',
    zh: '关闭 (Ctrl/Alt+Shift+S)',
    ja: '閉じる (Ctrl/Alt+Shift+S)',
  },
  'panel.chooseFile': { en: 'Open file', zh: '选择文件', ja: 'ファイルを開く' },
  'panel.online': { en: 'Online subs', zh: '在线字幕', ja: 'オンライン字幕' },
  'panel.dropHint': {
    en: 'Drop a subtitle file here',
    zh: '拖字幕文件到这里',
    ja: '字幕ファイルをドロップ',
  },
  'panel.statusEmpty': { en: 'No subtitles loaded', zh: '未加载字幕', ja: '字幕未読み込み' },
  'panel.statusLoaded': { en: '{name} · {n} cues', zh: '{name} · {n} 条', ja: '{name} · {n} 件' },
  'panel.pickVideo': {
    en: 'Pick video (when the page has several)',
    zh: '选视频(页面多视频时指定)',
    ja: '動画を選ぶ(複数ある場合)',
  },
  'panel.hide': { en: 'Hide subtitles', zh: '隐藏字幕', ja: '字幕を隠す' },
  'panel.show': { en: 'Show subtitles', zh: '显示字幕', ja: '字幕を表示' },
  'panel.clear': { en: 'Clear subtitles', zh: '清除字幕', ja: '字幕をクリア' },
  'panel.offset': { en: 'Time offset', zh: '时间偏移', ja: 'タイムオフセット' },
  'panel.offsetTitle': {
    en: 'Type a value in seconds',
    zh: '可手动输入,单位秒',
    ja: '手入力可・単位は秒',
  },
  'panel.fontSize': { en: 'Font size', zh: '字号', ja: '文字サイズ' },
  'panel.margin': { en: 'Margin', zh: '边距', ja: '余白' },
  'panel.speakerPos': { en: 'Speech position', zh: '说话位置', ja: 'セリフの位置' },
  'panel.posBottom': { en: 'Bottom', zh: '底部', ja: '下' },
  'panel.posTop': { en: 'Top', zh: '顶部', ja: '上' },
  'panel.background': { en: 'Background', zh: '背景', ja: '背景' },
  'panel.bgOutline': { en: 'Outline', zh: '描边', ja: '縁取り' },
  'panel.bgTranslucent': { en: 'Dim', zh: '半透', ja: '半透明' },
  'panel.bgSolid': { en: 'Solid', zh: '黑底', ja: '黒地' },
  'panel.bgNone': { en: 'None', zh: '无', ja: 'なし' },
  'panel.color': { en: 'Color', zh: '颜色', ja: '色' },
  'panel.colWhite': { en: 'White', zh: '白', ja: '白' },
  'panel.colYellow': { en: 'Yellow', zh: '黄', ja: '黄' },
  'panel.colCyan': { en: 'Cyan', zh: '青', ja: 'シアン' },
  'panel.colGreen': { en: 'Green', zh: '绿', ja: '緑' },
  'panel.ruby': { en: 'Furigana', zh: '日文注音', ja: 'ふりがな' },
  'panel.rubyTitle': {
    en: 'Show 温厚（おんこう） as ruby readings over kanji',
    zh: '将 温厚（おんこう） 显示为注音',
    ja: '温厚（おんこう） を漢字上のルビで表示',
  },
  'panel.enhance': { en: 'Speaker · SFX tags', zh: '话者·音效标记', ja: '話者・効果音タグ' },
  'panel.enhanceTitle': {
    en: '（Name）dims to a speaker tag; standalone （…） SFX/action and ♪ lyrics go italic',
    zh: '（人名)淡化为话者名、独立（…)音效/动作斜体、♪ 歌词斜体',
    ja: '（人名）を話者名として淡色化、単独（…）効果音/動作を斜体、♪ 歌詞を斜体',
  },
  'panel.fab': { en: 'Floating button', zh: '悬浮球', ja: 'フローティングボタン' },
  'panel.fabTitle': {
    en: 'A small ball docked at the page edge',
    zh: '页面右侧常驻小球',
    ja: 'ページ端に常駐する小さなボタン',
  },
  'panel.language': { en: 'Language', zh: '语言', ja: '言語' },
  'panel.fabTip': {
    en: 'AnySub · click to open the subtitle panel (draggable)',
    zh: 'AnySub · 点击打开字幕面板(可拖动)',
    ja: 'AnySub · クリックで字幕パネルを開く(ドラッグ可)',
  },
  // 快捷键提示(词条,由 JS 拼装 <kbd>)
  'hint.then': { en: 'then', zh: '加', ja: '＋' },
  'hint.panel': { en: 'panel', zh: '面板', ja: 'パネル' },
  'hint.online': { en: 'online', zh: '在线', ja: 'オンライン' },
  'hint.toggle': { en: 'toggle', zh: '显隐', ja: '表示' },
  'hint.local': { en: 'local', zh: '本地', ja: 'ローカル' },
  'hint.offset': { en: 'offset', zh: '偏移', ja: 'オフセット' },

  // ── Toast ──
  'toast.offset': { en: 'Offset {v}s', zh: '偏移 {v}s', ja: 'オフセット {v}s' },
  'toast.noVideo': { en: 'No video found', zh: '未找到视频', ja: '動画が見つかりません' },
  'toast.clickVideo': {
    en: 'Click the video to attach subtitles to',
    zh: '点击要挂载字幕的视频画面',
    ja: '字幕を付ける動画をクリック',
  },
  'toast.videoSelected': { en: 'Video selected', zh: '已选定视频', ja: '動画を選択しました' },
  'toast.readFailed': {
    en: 'Failed to read subtitles: {msg}',
    zh: '读取字幕失败:{msg}',
    ja: '字幕の読み込みに失敗: {msg}',
  },
  'toast.noVideoOnPage': {
    en: 'No video element found on the page',
    zh: '未在页面找到视频元素',
    ja: 'ページに動画要素が見つかりません',
  },
  'toast.noCues': {
    en: 'No subtitles parsed (unsupported format or empty file)',
    zh: '未解析出字幕(格式不支持或文件为空)',
    ja: '字幕を解析できません(非対応形式か空ファイル)',
  },
  'toast.mounted': {
    en: 'Mounted {n} subtitle cues',
    zh: '已挂载 {n} 条字幕',
    ja: '{n} 件の字幕を読み込みました',
  },
  'toast.noSubs': { en: 'No subtitles loaded', zh: '未加载字幕', ja: '字幕が読み込まれていません' },
  'toast.hidden': { en: 'Subtitles hidden', zh: '字幕已隐藏', ja: '字幕を隠しました' },
  'toast.shown': { en: 'Subtitles shown', zh: '字幕已显示', ja: '字幕を表示しました' },
  'toast.noSubsNow': {
    en: 'No subtitles right now',
    zh: '当前没有字幕',
    ja: '現在字幕はありません',
  },
  'toast.cleared': { en: 'Subtitles cleared', zh: '已清除字幕', ja: '字幕をクリアしました' },
  'toast.epCleared': {
    en: 'Episode changed — old subtitles cleared',
    zh: '已切集,已清除旧字幕',
    ja: 'エピソード変更 — 古い字幕をクリア',
  },
  'toast.epFinding': {
    en: 'Episode changed — looking for episode {ep} subtitles…',
    zh: '检测到切集,正在找第 {ep} 集字幕…',
    ja: 'エピソード変更 — 第 {ep} 話の字幕を検索中…',
  },
  'toast.epNone': {
    en: 'No subtitles for episode {ep} yet',
    zh: '第 {ep} 集暂无字幕',
    ja: '第 {ep} 話の字幕はまだありません',
  },
  'toast.epAuto': {
    en: 'Auto-loaded episode {ep} subtitles',
    zh: '已自动加载第 {ep} 集字幕',
    ja: '第 {ep} 話の字幕を自動読み込み',
  },
  'toast.epNoSame': {
    en: 'No same-source subtitles — pick one from the list',
    zh: '未找到同源字幕,请从候选中选择',
    ja: '同じ出典の字幕なし — 候補から選択してください',
  },
  'toast.epFailed': {
    en: 'Auto subtitle search failed: {msg}',
    zh: '自动找字幕失败:{msg}',
    ja: '字幕の自動検索に失敗: {msg}',
  },
  'toast.keySaved': { en: 'API key saved', zh: 'API key 已保存', ja: 'API キーを保存しました' },
  'toast.keyCleared': {
    en: 'API key cleared',
    zh: 'API key 已清空',
    ja: 'API キーをクリアしました',
  },
  'toast.keyNeeded': {
    en: 'Enter and save your Jimaku API key first',
    zh: '请先填写并保存 Jimaku API key',
    ja: '先に Jimaku API キーを入力・保存してください',
  },
  'toast.titleNeeded': {
    en: 'Enter an anime title',
    zh: '请输入番剧名',
    ja: 'アニメ名を入力してください',
  },
  'toast.mountedFile': { en: 'Mounted: {name}', zh: '已挂载:{name}', ja: '読み込み: {name}' },
  'toast.downloadFailed': {
    en: 'Download failed: {msg}',
    zh: '下载失败:{msg}',
    ja: 'ダウンロード失敗: {msg}',
  },
  'toast.assHiFi': {
    en: 'ASS high-fidelity rendering enabled',
    zh: '已启用 ASS 高保真渲染',
    ja: 'ASS 高精度レンダリングを有効化',
  },
  'toast.assText': {
    en: 'ASS shown as plain text (high-fidelity rendering unavailable)',
    zh: 'ASS 按文本显示(高保真渲染不可用)',
    ja: 'ASS をテキスト表示(高精度レンダリング不可)',
  },

  // ── 自动提示(站点适配) ──
  'offer.found': {
    en: '{n} subtitles for {title} ep {ep}',
    zh: '《{title}》第 {ep} 集找到 {n} 份字幕',
    ja: '{title} 第{ep}話の字幕 {n} 件',
  },
  'offer.foundMovie': {
    en: '{n} subtitles for {title}',
    zh: '《{title}》找到 {n} 份字幕',
    ja: '{title} の字幕 {n} 件',
  },
  'offer.load': { en: 'Choose', zh: '选择', ja: '選ぶ' },

  // ── 搜索面板 ──
  'sc.back': { en: 'Panel', zh: '主面板', ja: 'パネル' },
  'sc.backTitle': { en: 'Back to main panel', zh: '返回主面板', ja: 'メインパネルへ戻る' },
  'sc.close': { en: 'Close', zh: '关闭', ja: '閉じる' },
  'sc.title': { en: 'Online subtitles', zh: '在线字幕', ja: 'オンライン字幕' },
  'sc.keyOk': { en: 'Connected to Jimaku', zh: '已连接 Jimaku', ja: 'Jimaku に接続済み' },
  'sc.changeKey': { en: 'change key', zh: '更换 key', ja: 'キーを変更' },
  'sc.keyPlaceholder': { en: 'Jimaku API key', zh: 'Jimaku API key', ja: 'Jimaku API キー' },
  'sc.keySave': { en: 'Save', zh: '保存', ja: '保存' },
  'sc.keyHint': {
    en: 'Generate a key on your jimaku.cc account page. Stored only on this device.',
    zh: 'key 在 jimaku.cc 登录后账号页生成,仅存于本机',
    ja: 'jimaku.cc のアカウントページでキーを生成。この端末にのみ保存。',
  },
  'sc.titlePlaceholder': {
    en: 'Anime title (Japanese is most accurate)',
    zh: '番剧名(日文最准)',
    ja: 'アニメ名(日本語が最も正確)',
  },
  'sc.epPlaceholder': { en: 'Ep', zh: '集', ja: '話' },
  'sc.epTitle': { en: 'Episode number', zh: '集数', ja: '話数' },
  'sc.search': { en: 'Search', zh: '搜索', ja: '検索' },
  'sc.prompt': {
    en: 'Enter a title and hit search',
    zh: '输入番剧名后点搜索',
    ja: 'アニメ名を入力して検索',
  },
  'sc.searching': { en: 'Searching…', zh: '搜索中…', ja: '検索中…' },
  'sc.notFound': {
    en: 'No anime found — try another spelling',
    zh: '未找到番剧,换个写法试试',
    ja: 'アニメが見つかりません — 別の表記でお試しを',
  },
  'sc.error': { en: 'Error: {msg}', zh: '出错:{msg}', ja: 'エラー: {msg}' },
  'sc.selectAnime': { en: 'Select anime', zh: '选择番剧', ja: 'アニメを選択' },
  'sc.episodes': { en: '{n} eps', zh: '{n} 话', ja: '{n} 話' },
  'sc.fetchingFiles': {
    en: 'Fetching subtitle files…',
    zh: '获取字幕文件中…',
    ja: '字幕ファイルを取得中…',
  },
  'sc.backToAnime': { en: 'Back to anime list', zh: '返回番剧列表', ja: 'アニメ一覧へ戻る' },
  'sc.noSubsFor': {
    en: 'No subtitles for {title}{ep}',
    zh: '{title} 暂无字幕{ep}',
    ja: '{title} の字幕なし{ep}',
  },
  'sc.epSuffix': { en: ' (episode {ep})', zh: '(第 {ep} 集)', ja: '(第 {ep} 話)' },
  'sc.selectSub': {
    en: '{title} · select subtitle ({n})',
    zh: '{title} · 选择字幕({n})',
    ja: '{title} · 字幕を選択({n})',
  },
};

// 取译文并插值。缺 key → 返回 key 本身(便于开发期发现漏译);缺当前语言 → 回落 en。
export function t(key, params) {
  const entry = DICT[key];
  if (!entry) return key;
  const loc = getLocale();
  let s = entry[loc] != null ? entry[loc] : entry.en;
  if (params) {
    // 函数式替换:避免值(番名/文件名/报错等远程数据)里的 $&/$1/$$ 被 String.replace 当替换模式
    for (const k in params) s = s.replace('{' + k + '}', () => params[k]);
  }
  return s;
}
