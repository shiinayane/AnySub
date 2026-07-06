# AnySub · どんな動画にも字幕を(日本語学習向け)

[English](./README.md) · [中文](./README.zh-CN.md) · **日本語**

[![Greasyfork でインストール](https://img.shields.io/greasyfork/v/585665?label=Greasyfork&color=8b0000)](https://greasyfork.org/ja/scripts/585665-anysub-japanese-immersion-subtitles-for-any-video) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**どんな**ウェブサイトの HTML5 動画も日本語イマージョン学習ツールに変えます。AnySub は動画に字幕ファイルをマウントし、学習者が本当に欲しい機能を加えます——**漢字ごとに正確なふりがな**、**ワンクリックの [Jimaku](https://jimaku.cc) 字幕取得＋次話への自動継続**、**話者名・効果音・心の声を一目で区別できるセマンティック整形**。

純粋なユーザースクリプトで、バックエンド不要・アップロードなし・データは端末外に出ません。Chrome / Edge / Safari / Firefox 対応。UI は **英語 / 中国語 / 日本語**(自動判定・切替可)。

![動画上でふりがなとセマンティック整形を描画する AnySub](./docs/hero.gif)

> 汎用の字幕ローダーとしても優秀です:任意の SRT / VTT / ASS / SSA をどんな動画にもドロップして、スタイルを整えるだけ。日本語向け機能はすべて任意で、邪魔になりません。

## 日本語学習に AnySub を使う理由

- 🈁 **漢字ごとに正確なふりがな。** テキスト字幕の `温厚（おんこう）`/`使徒《しと》` を漢字上のかなとして表示。素朴なツールと違い、AnySub は**読みを正しい漢字に対応させます**:`近接猟兵（りょうへい）` では りょう/へい を `猟兵` にのみ振り、`近接` は空白のまま——読みを全体に塗りつぶしません。コンパクトな KANJIDIC2 読みテーブル(常用＋人名用、約 3000 字)と連濁・促音対応のアラインメント処理を同梱——**数 MB のトークナイザーもランタイム通信も不要**。
- 🎭 **セマンティック字幕整形**(アニメ向け・切替可)。日本語 CC は約物に意味を込めます。AnySub はそれを再整形します(整形のみ、文字は削りません):
  - **話者名** `（マオマオ)セリフ` → 名前を淡色・縮小し、視線が直接セリフへ。
  - **非音声** 単独の `（ドアが開く音)`/`（ざわざわ)`(効果音・動作)→ 斜体・淡色。
  - **画外音／心の声** `〈…〉`/`＜…＞`(電話・ナレーション・内心)→ 斜体。
  - **書面／引用** `《…》`(手紙・画面の文字・読み上げ;ルビの `漢字《かな》` とは区別)→ 明朝系に切替、「書かれた文字」らしく。
  - **歌詞** 行頭 `♪` → 斜体。
  - **行またぎ／cue またぎのスパン**:`〈…` がある行で開き `…〉` が数行後で閉じる場合、間の行もすべてマーク(`《》`・`♪…♪` も同様)。
- 🔍 **ワンクリック オンライン字幕([Jimaku](https://jimaku.cc))。** `Alt+Shift+F` → アニメ検索 → 作品選択 → ファイル選択 → マウント完了。半自動:常に候補を提示し、誤った字幕を黙って読み込みません。作品名は AniList で解決、ASS を優先。検索欄はページタイトルから**作品名＋話数を自動入力**。
- ⏭️ **次話の自動継続。** SPA で話数が変わる(ページタイトルの話数変化)と、古い字幕を消して**同じ出典**の次話を自動読み込み(同じ字幕グループ／リリース)。同源が見つからないときだけ候補を提示。手作業ゼロで一気見。

## その他の機能

- 📂 ローカル字幕ファイル(選択 / ドラッグ&ドロップ / **クリア**)——**ファイルは端末外に出ません**(SRT/VTT は完全オフライン)。
- 🎬 **SRT / VTT / ASS / SSA** に対応。
- ✨ **ASS/SSA 高精度描画**:遅延読み込みの [libass-wasm](https://github.com/libass/JavascriptSubtitlesOctopus) で斜体/太字/縁取り/位置/エフェクト/フォントを再現。読み込み失敗(オフライン/CSP)時は**自動的にテキスト表示へ降格**し、字幕は常に見えます。
- 🎨 **自前のオーバーレイ描画**:スタイルを完全に制御でき、ブラウザ間で一貫(Safari の `::cue` 制限を受けません)。
  - 背景:縁取り / **半透明(既定)** / 黒地 / なし;色:白 / 黄 / シアン / 緑。
  - **文字サイズはプレイヤー高さに比例**し、ウィンドウでも全画面でも見え方が一定;余白は調整可。
- 🧭 **セリフは下、非音声は上**(一貫したメンタルモデル):下/上トグルでセリフのアンカーを設定(既定は下)。セリフ・話者名・画外音・歌詞はそこに、複数話者は積み重ねて名前で区別;**真の効果音**(単独 `（…)`)だけが反対側に。
- 🖥️ **全画面追従**:オーバーレイが全画面要素へ自動的に再アタッチ。
- 🈶 自動**エンコーディング判定**:UTF-8 → GBK → Big5 →(日本語)Shift-JIS / EUC-JP フォールバック。
- ⏱️ **タイムオフセット**:±0.1 / ±1 のステップボタン、または任意の秒数を手入力。**オフセット記憶**:「作品＋字幕出典」ごとに記憶・永続化し、話またぎ/再オープンで自動復元。
- 🌐 **サイト対応:DMM TV / Prime Video / U-NEXT**:現在の作品 + 話数をプレイヤーから直接読み取り(`<title>` 頼みではない)、話切替でタイトルが変わらない SPA でも検索の事前入力と次話の自動継続が安定。その他のサイトはページタイトルの解析にフォールバック。[サイトの追加](#adding-a-site-adapter)は小さく自己完結した変更です。
- 🔎 **Shadow DOM を貫通**して動画を検出;ページに複数動画があるときは「動画を選ぶ」ボタン。
- ⌨️ **キーボードショートカット**(`Ctrl+Shift` でも `Alt+Shift` でも可):`S` パネル · `F` オンライン · `V` 表示切替 · `O` ローカル · `←/→` オフセット ∓0.1s。入力中は反応しません。
- 🫧 **ミニマルな UI**:既定でフローティングボタンなし・ポップアップなし。ショートカットでパネルを呼び出し(ボタンは任意で有効化)。
- 🪶 **アイドル時のコストゼロ**:字幕未読み込み＆ボタン無効なら、オブザーバーやタイマーを一切接続せず、全ページへの注入はほぼ無コスト。
- 💾 **設定の永続化**:文字サイズ / 位置 / 背景 / 色 / 言語をサイトごとに記憶(localStorage)。
- ⚙️ 描画は**イベント駆動＋インターバルのフォールバック**(rAF 非依存)で、バックグラウンドタブ/PiP でも安定。

## スクリーンショット

| 設定パネル | オンライン検索(Jimaku) |
| --- | --- |
| ![設定パネル](./docs/panel.png) | ![オンライン字幕検索](./docs/results.png) |

## インストール

**推奨 —— [Greasyfork からインストール](https://greasyfork.org/ja/scripts/585665-anysub-japanese-immersion-subtitles-for-any-video)**(Tampermonkey / Violentmonkey などのユーザースクリプトマネージャーが必要;自動更新)。

または、ビルド成果物 [`dist/anysub.user.js`](./dist/anysub.user.js) を手動でインストール(ソースは `src/`、下の「開発」を参照):

### Chrome / Edge / Firefox

1. [Tampermonkey](https://www.tampermonkey.net/) または [Violentmonkey](https://violentmonkey.github.io/) をインストール。
2. [`dist/anysub.user.js`](./dist/anysub.user.js) の raw ファイルを開くと、マネージャーが検出してインストールを提案します。
   - または:Tampermonkey → 新規スクリプト → `dist/anysub.user.js` の全内容を貼り付け → 保存。

### Safari(macOS / iOS)

1. App Store から [Userscripts](https://apps.apple.com/us/app/userscripts/id1463298887)(オープンソース・無料)をインストール。
2. Safari → 設定 → 機能拡張 → Userscripts を有効化し、サイトでの実行を許可。
3. ツールバーの Userscripts アイコン →「Open App」→ `dist/anysub.user.js` をスクリプトフォルダに追加。
   - 本スクリプトは標準 Web API に加え `GM_getValue`/`GM_setValue` のみ使用(Jimaku API キーを全サイト共通にするため);どちらも Userscripts が対応するため Safari でも完全に動作します。

## 使い方

1. 動画のあるページを開く。
2. **`Alt+Shift+S`**(または `Ctrl+Shift+S`)でパネルを開く——あるいはパネルでフローティングボタンを有効化。
3. 「ファイルを開く」/ 字幕をパネルにドラッグ——または「オンライン字幕」(`Alt+Shift+F`)で Jimaku から取得。
4. 必要に応じてオフセット / 文字サイズを調整。**ふりがな** と **話者・効果音タグ** をオンにして日本語向け機能を利用。

## 開発

ソースは **TypeScript**(ES モジュール、`src/`)で、strict な `tsc` で型チェックし、[Vite](https://vitejs.dev) + [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) で `==UserScript==` ヘッダー付きの単一ファイル `dist/anysub.user.js` にバンドルします。**ランタイム依存ゼロ**——バンドルは自己完結(libass-wasm は ASS/SSA を開いたときだけ CDN から遅延読み込み)。

```bash
npm install        # 開発依存をインストール
npm run dev        # 開発サーバー:ホットリロード + マネージャーへワンクリック導入
npm run build      # ビルド → dist/anysub.user.js
npm test           # 単体テスト(Vitest)
npm run typecheck  # tsc --noEmit(strict)
npm run lint       # ESLint
npm run format     # Prettier --write
```

純ロジックのモジュールには単体回帰テスト(`test/`、[Vitest](https://vitest.dev))があり、過去の落とし穴を網羅:パース(XSS エスケープ・空行・NaN/時系列)、ASS パース、タイトル解析(旧字体の話数)、ふりがなルビと漢字アラインメント、セマンティック分類、**話またぎの同源マッチング**、エンコーディング判定、サイト判定(DMM / Prime Video / U-NEXT)、自動オファーの「本編再生中」判定。DOM/描画/ネットワークは `demo.html` をブラウザで手動検証。**CI**(GitHub Actions)は push/PR ごとに format → lint → typecheck → test → build を実行。`vX.Y.Z` タグを push すると自動でビルドして GitHub Release を公開します。

### 構成

機能レイヤーで分割。import 指定子は `.js` 拡張子のまま(bundler が `.ts` に解決)。

```
src/
├── main.ts              エントリ:init + 動的な <video> 監視(MutationObserver)
├── types.ts             モジュール横断の共有型
├── state.ts             グローバル状態シングルトン + 定数
├── refs.ts              共有 DOM 参照
├── i18n.ts              UI ローカライズ(en / zh / ja、ブラウザ判定 + 切替可)
├── subtitle/            パース & テキスト処理(純ロジック・テスト有)
│   ├── decode.ts           ファイル読み込み + エンコーディング判定
│   ├── parse.ts            SRT/VTT → 統一 cue 構造(XSS 安全・時系列ソート)
│   ├── parse-ass.ts        ASS/SSA → cue(テキストフォールバック用)
│   ├── cue-format.ts       セマンティック分類
│   ├── furigana-align.ts   読み → 漢字アラインメント(連濁/促音)
│   ├── ruby.ts             ふりがな(《》/｜/括弧 → <ruby>、漢字ごと)
│   └── kanji-readings.ts   同梱の漢字読みテーブル(ビルド時に生成)
├── render/              オーバーレイ・レンダラー・動画・読み込みパイプライン
│   ├── overlay.ts          オーバーレイ配置 / 全画面追従(形式非依存)
│   ├── render-text.ts      テキストレンダラー(renderer インターフェース実装)
│   ├── render-ass.ts       ASS レンダラー:テキストフォールバック + libass 昇格
│   ├── octopus-loader.ts   libass-wasm の遅延読み込み(blob worker + CDN wasm/フォント)
│   ├── controller.ts       描画ループ + 動画ライフサイクル + 現在のレンダラー
│   ├── locator.ts          Shadow DOM を貫通して <video> を検出
│   ├── styles.ts           注入 CSS(ライト/ダークトークン)
│   ├── loader.ts           読み込みフロー + 形式レジストリ(ローカル/オンライン共通)
│   └── watcher.ts          DOM オブザーバーのオンデマンド ライフサイクル(アイドルで切断)
├── online/              リモート API + 解決 + 永続化
│   ├── anilist.ts          作品名 → AniList 候補(認証不要)
│   ├── jimaku.ts           Jimaku API クライアント(key 必要)
│   ├── online.ts           編成:resolveSubtitles(作品特定 → ファイル → ダウンロード)
│   ├── match.ts            同源マッチング + 完全一致選択(純ロジック・テスト有)
│   └── storage.ts          設定(localStorage)+ サイト横断 Jimaku key(GM ストレージ)
├── sites/               サイト判定 + 話数の自動化
│   ├── adapters/           サイトごとに 1 ファイル(単一責任)
│   │   ├── dmm.ts             DMM TV
│   │   ├── prime.ts          Prime Video
│   │   ├── unext.ts          U-NEXT
│   │   └── index.ts          レジストリ —— ADAPTERS 配列(新サイトはここに登録)
│   ├── site-adapters.ts    getSiteAdapter() + detectShow()(サイト非依存;タイトルにフォールバック)
│   ├── title-parse.ts      ページタイトル → 作品名 + 話数(日本語/旧字体対応)
│   ├── episode-signal.ts   共有の話変更シグナル(単一オブザーバー・重複排除)
│   ├── episode-watch.ts    話変更時に同源で自動継続
│   └── auto-offer.ts       本編再生中に「字幕あり」を提案
└── ui/                  パネル・トースト・ショートカット
    ├── ui.ts               設定パネル + フローティングボタン + ドラッグ + 動画選択
    ├── search-ui.ts        オンライン検索モーダル(候補リスト)
    ├── notify.ts           トースト + ステータスバー
    └── shortcuts.ts        キーボードショートカット(Alt+Shift、capture 段階)
```

**描画層はプラガブル**:`controller` がループを駆動し、`{ mount, renderAt(video, rect, layoutChanged), applyStyle, destroy }` を実装する「レンダラー」を 1 つ保持します。`overlay` が動画に整列したボックス(形式非依存)を担い、レンダラーはそこに描画します。`loader` の**形式レジストリ**がファイル種別でレンダラーを選びます。

<a id="adding-a-site-adapter"></a>

### サイトアダプターの追加(Adding a site adapter)

**サイトアダプター**は、ストリーミングのプレイヤーから**現在の作品 + 話数**を直接読み取る術を AnySub に教えます——検索の事前入力・次話の自動継続・「字幕あり」提案の根拠になり、ページ `<title>` にその情報がなくても機能します。無くても動きますが、その場合は `<title>` の解析(`sites/title-parse.ts`)にフォールバックします。

各サイトは `src/sites/adapters/` 下の**1 ファイル**(単一責任)。レジストリは `adapters/index.ts`、サイト非依存の判定(`getSiteAdapter` / `detectShow`、`<title>` フォールバック込み)は `site-adapters.ts`。アダプターは `SiteAdapter`(`src/types.ts`)を実装します:

```ts
interface SiteAdapter {
  name: string;
  match(): boolean;           // このサイトか?(location.hostname で判定)
  isTarget(): boolean;        // 再生ページか?(URL パス or プレイヤー要素)
  detect(): DetectInfo;       // → { series, episode, showKey?, epKey? }
  watchEl?(): Element | null; // 任意:話変更を監視する要素
}
```

サイトを追加するには:

1. 既存ファイル(例:`adapters/dmm.ts`)を `adapters/<name>.ts` にコピーして `SiteAdapter` をエクスポートし、`adapters/index.ts` に登録(`ADAPTERS` 配列に追加)。1 サイトのロジックはその 1 ファイルに収まる。
2. `match()` は `location.hostname`、`isTarget()` は URL パス or 安定したプレイヤー要素で判定。
3. `detect()` で `series`(作品名)と `episode`(話数)を返す。**安定したクラス名プレフィックス / styled-components の `displayName` を基準にし、ビルドハッシュは使わない**——例:Prime の `atvwebplayersdk-*` は安定、`f6gi9c2` はビルド毎に変わるハッシュ;U-NEXT の `styles__TitleContainer-` は安定、`dWSOjb` は生成クラス。
4. 話切替で `<title>` が変わらない場合(SPA は DOM ノードを差し替えることが多い)、変化する要素を `watchEl()` から返して共有の `episode-signal` に監視させる;省略すると `<title>` 監視にフォールバック。
5. `test/site-adapters.test.ts` にケースを追加——`location`/`document` をスタブするのでブラウザ不要。

判定は**保守的**に:自信がなければ空の `series`/`episode` を返し、タイトル解析のフォールバックに任せる(誤った自動読み込みは、読み込まないより悪い)。

### 設計メモ

**描画**は自前のオーバーレイ(動画上に `div` を重ね、`timeupdate` で現在字幕を表示)を使用:ネイティブの `TextTrack` / `::cue` に比べ、背景/縁取り/色/位置を完全に制御でき、文字サイズをプレイヤー高さに比例させ、ブラウザ間(特に Safari)で一貫します。`requestAnimationFrame` ではなく**イベント駆動＋インターバルのフォールバック**——rAF はバックグラウンドタブで停止し、イベント駆動の方が CPU も軽い。全画面時はオーバーレイを `document.fullscreenElement` に再アタッチします。ローカルファイルはすべて標準の `<input type=file>` / ドラッグ&ドロップで読み(GM のファイル/ダウンロード API は不使用);使用する GM はクロスサイトの Jimaku キー保存用の `GM_getValue`/`GM_setValue` のみです。

**ASS 高精度**は「まずフォールバック、後で昇格」:`.ass/.ssa` を開くとまずテキストレンダラーで即表示(オフライン可)しつつ、バックグラウンドで libass-wasm を遅延読み込み。準備が整えば canvas 高精度描画へ切替、いずれかがネットワークやサイト CSP に阻まれた場合は**テキスト描画を維持**し、字幕は常に表示されます。

**ふりがなの漢字アラインメント**は汎用トークナイザー(kuromoji のようにランタイムで数 MB の辞書を読み込むもの)を使わず、[KANJIDIC2](https://www.edrdg.org/kanjidic/kanjidic2.xml.gz) から抽出したコンパクトな「漢字→読み」テーブル(常用＋人名用 約 3000 字、ひらがな正規化、gzip 約 35KB)を同梱し、初回のみ `JSON.parse`。アラインメントはメモ化した再帰探索:各漢字の読み候補で括弧内のかな列を消費し、連濁(は→ば)や促音(がく→がっ)の変種を動的生成。全体が合わないときは左から漢字を剥がして最長被覆解を探し(「読みが後半だけを覆う」場合に対応)、それでも合わなければ全体ルビへフォールバック(熟字訓、例:`今日→きょう`)。

> 辞書データ © [EDRDG](https://www.edrdg.org/) KANJIDIC2、[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) に基づき使用。

## ロードマップ

- [x] ~~自前オーバーレイ描画(スタイル制御・プレイヤー比例スケール・全画面追従)~~(v0.2.0)
- [x] ~~設定の永続化~~(v0.4.0)
- [x] ~~ASS/SSA 高精度描画(libass-wasm)、テキストフォールバック~~(v0.7.0)
- [x] ~~オンライン字幕検索(Jimaku、半自動候補)~~(v0.9.0)
- [x] ~~タイトル自動入力 + 次話の自動継続(同源優先)~~(v0.10.0)
- [x] ~~漢字ごとのふりがなアラインメント(KANJIDIC2)~~(v0.13.0)
- [x] ~~セマンティック整形 + セリフ/非音声の配置~~(v0.14.0)
- [x] ~~UI の i18n(English / 中文 / 日本語)~~(v0.15.0)
- [ ] クロスオリジン iframe 内の動画対応
- [ ] 対応形式の追加(SUB/SBV/LRC/SMI/TTML)
- [ ] ASS カスタムフォント(埋め込み / ユーザー提供)
- [ ] キーボードショートカットの再割り当て

## ライセンス

コード:[MIT](./LICENSE)。同梱の KANJIDIC2 漢字読みデータ(`src/subtitle/kanji-readings.ts`)は © [EDRDG](https://www.edrdg.org/)、[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) に基づき使用。
