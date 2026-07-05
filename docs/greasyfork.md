# Greasyfork description copy

Paste-ready Markdown for the Greasyfork **Description** field. Greasyfork renders per-language
descriptions, so paste each block into its matching language tab.

Image URLs point at this repo's `docs/` on the `main` branch — they render once the repo is
pushed and public. Swap `shiinayane/anysub` / `main` if your repo path or default branch differs.

---

## 🇬🇧 English

```markdown
**Turn any website's video into a Japanese-immersion tool.** AnySub mounts subtitle files onto any HTML5 video and adds what immersion learners actually want — accurate per-kanji furigana, one-click Jimaku subtitles with auto next-episode, and semantic caption formatting.

Pure userscript: no backend, no upload, nothing leaves your machine. Chrome / Edge / Safari / Firefox. UI auto-detects English / 中文 / 日本語 and is switchable.

![AnySub rendering furigana and semantic layout](https://raw.githubusercontent.com/shiinayane/anysub/main/docs/hero.png)

### Why AnySub for learning Japanese

- **Accurate per-kanji furigana.** `近接猟兵（りょうへい）` puts りょう/へい over `猟兵` only — it aligns readings to the right characters instead of smearing them across the whole run. Ships a compact KANJIDIC2 table (jōyō + jinmeiyō, ~3000 kanji) with rendaku/gemination-aware alignment. No multi-MB tokenizer, no runtime network.
- **Semantic caption formatting** (toggleable): speaker name `（マオマオ）` dims; standalone SFX `（ドアが開く音）` goes italic; off-screen/inner voice `〈…〉` italic; written `《…》` switches to serif; lyrics `♪` italic. Cross-line and cross-cue spans are tracked.
- **One-click online subtitles (Jimaku):** `Alt+Shift+F` → search → pick → mounted. Candidates always shown, never a silent wrong load. Title + episode pre-filled from the page title.
- **Auto next-episode:** on episode change, auto-loads the next episode from the same source.

### Also a great general subtitle loader

SRT / VTT / ASS / SSA on any video. High-fidelity ASS via libass-wasm with automatic plain-text fallback. Custom overlay renderer (full style control, font scales with player height, fullscreen following). Encoding auto-detect. Timeline offset with per-source memory. Works through Shadow DOM. Zero idle cost. `@grant none` — standard Web APIs only, so Safari works fully.

### Usage

Press `Alt+Shift+S` (or `Ctrl+Shift+S`) to open the panel. Open a file or drag it in, or use `Alt+Shift+F` for online subtitles. Shortcuts: `S` panel · `F` online · `V` show/hide · `O` local · `←/→` offset.

Source & docs: https://github.com/shiinayane/anysub

Furigana dictionary © EDRDG KANJIDIC2, used under CC BY-SA 4.0.
```

---

## 🇨🇳 简体中文 (zh-CN)

```markdown
**把任意网站的视频变成日语沉浸学习工具。** AnySub 给任意 HTML5 视频挂载字幕文件,并加上沉浸学习者真正想要的东西——逐字精准注音、一键 Jimaku 在线字幕并自动接续下一集、话者/音效/心声语义排版。

纯用户脚本:无需后端、不上传文件、不联网。Chrome / Edge / Safari / Firefox 通用。界面自动识别 EN / 中文 / 日本語,可切换。

![AnySub 在视频上渲染注音与语义排版](https://raw.githubusercontent.com/shiinayane/anysub/main/docs/hero.png)

### 为什么用它学日语

- **逐字精准注音。** `近接猟兵（りょうへい）` 只把 りょう/へい 注到 `猟兵`,而不是铺满整串——把读音对齐到正确的汉字。内置精简 KANJIDIC2 读音表(常用+人名用,~3000 字)+ 连浊/促音感知对齐。无数 MB 分词器、零运行时网络。
- **语义排版**(可开关):话者名 `（マオマオ）` 淡化;独立音效 `（ドアが開く音）` 斜体;画外音/心声 `〈…〉` 斜体;书面 `《…》` 切衬线体;歌词 `♪` 斜体。跨行、跨 cue 的跨度都会追踪。
- **一键在线字幕(Jimaku):** `Alt+Shift+F` → 搜 → 选 → 挂载。始终列候选,绝不静默加载错字幕。番剧名+集数从页面标题智能预填。
- **切集自动接续:** 换集时,自动从同源加载下一集字幕。

### 也是称职的通用字幕挂载器

任意视频上挂 SRT / VTT / ASS / SSA。ASS 经 libass-wasm 高保真渲染,失败自动降级纯文本。自绘覆盖层(样式全可控、字号随播放器高度缩放、全屏跟随)。自动编码探测。时间偏移带按源记忆。穿透 Shadow DOM。零空闲开销。`@grant none` 仅用标准 Web API,Safari 完整可用。

### 使用

按 `Alt+Shift+S`(或 `Ctrl+Shift+S`)打开面板。选择文件或拖入,或按 `Alt+Shift+F` 用在线字幕。快捷键:`S` 面板 · `F` 在线 · `V` 显隐 · `O` 本地 · `←/→` 偏移。

源码与文档:https://github.com/shiinayane/anysub

注音词典 © EDRDG KANJIDIC2,依 CC BY-SA 4.0 使用。
```

---

## 🇯🇵 日本語 (ja)

```markdown
**どんなサイトの動画も日本語イマージョン学習ツールに。** AnySub はどんな HTML5 動画にも字幕ファイルをマウントし、学習者が本当に欲しい機能を加えます——漢字ごとに正確なふりがな、ワンクリックの Jimaku 字幕取得＋次話への自動継続、セマンティックな字幕整形。

純粋なユーザースクリプト:バックエンド不要・アップロードなし・データは端末外に出ません。Chrome / Edge / Safari / Firefox 対応。UI は英語 / 中国語 / 日本語を自動判定・切替可。

![動画上でふりがなとセマンティック整形を描画する AnySub](https://raw.githubusercontent.com/shiinayane/anysub/main/docs/hero.png)

### 日本語学習に使う理由

- **漢字ごとに正確なふりがな。** `近接猟兵（りょうへい）` では りょう/へい を `猟兵` にのみ振り、全体に塗りつぶしません——読みを正しい漢字に対応させます。コンパクトな KANJIDIC2 テーブル(常用＋人名用、約 3000 字)＋連濁・促音対応のアラインメントを同梱。数 MB のトークナイザーもランタイム通信も不要。
- **セマンティック字幕整形**(切替可):話者名 `（マオマオ）` を淡色化;単独の効果音 `（ドアが開く音）` を斜体;画外音・心の声 `〈…〉` を斜体;書面 `《…》` を明朝系に;歌詞 `♪` を斜体。行またぎ・cue またぎのスパンも追跡。
- **ワンクリック オンライン字幕(Jimaku):** `Alt+Shift+F` → 検索 → 選択 → マウント。常に候補を提示し、誤った字幕を黙って読み込みません。作品名＋話数をページタイトルから自動入力。
- **次話の自動継続:** 話数が変わると、同じ出典の次話字幕を自動読み込み。

### 汎用の字幕ローダーとしても優秀

任意の動画に SRT / VTT / ASS / SSA。ASS は libass-wasm で高精度描画、失敗時は自動でテキストへ降格。自前のオーバーレイ描画(スタイル完全制御・文字サイズがプレイヤー高さに比例・全画面追従)。エンコーディング自動判定。出典ごとに記憶するタイムオフセット。Shadow DOM 貫通。アイドル時コストゼロ。`@grant none` で標準 Web API のみ、Safari も完全動作。

### 使い方

`Alt+Shift+S`(または `Ctrl+Shift+S`)でパネルを開く。ファイルを開く/ドラッグ、または `Alt+Shift+F` でオンライン字幕。ショートカット:`S` パネル · `F` オンライン · `V` 表示切替 · `O` ローカル · `←/→` オフセット。

ソース＆ドキュメント:https://github.com/shiinayane/anysub

ふりがな辞書 © EDRDG KANJIDIC2、CC BY-SA 4.0 に基づき使用。
```
