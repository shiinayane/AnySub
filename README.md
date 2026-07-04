# AnySub · 通用字幕挂载

给**任意网站**的 HTML5 视频挂载**本地字幕文件**。纯用户脚本,无需后端、不上传文件、不联网。

Chrome / Edge / Safari / Firefox 通用。

## 功能(v0.9.0)

- 🔍 **在线字幕**([Jimaku](https://jimaku.cc)):`Alt+Shift+F` 搜番剧 → 选番剧 → 选文件 → 一键挂载(动画向)
  - 半自动、候选列表让你选,绝不静默加载错字幕;番剧名经 AniList 定位,ASS 优先
  - 搜索框从页面标题**智能预填**番剧名+集数(第X話/#X、汉数字含旧字体 第壱話→1)
  - 需 Jimaku API key(账号页生成,仅存本机);全程 `@grant none` 直连,不碰 GM 特权
- ⏭️ **切集自动接续**:SPA 换集(页面标题集数变化)→ 自动清除旧字幕 → **同源优先**
  自动加载下一集(跨集匹配同一字幕组/压制源);找不到同源才弹候选。追番零手工
- 📂 本地字幕文件挂载(选择 / 拖拽 / **清除**),**文件不出本机**(SRT/VTT 全程离线)
- 🎬 支持 **SRT / VTT / ASS / SSA**
- ✨ **ASS/SSA 高保真渲染**:懒加载 [libass-wasm](https://github.com/libass/JavascriptSubtitlesOctopus),
  还原斜体/粗体/描边/定位/特效/字体;**加载失败(无网/CSP)自动降级为纯文本**,字幕始终可见
- 🎨 **自绘覆盖层渲染**:样式完全可控且跨浏览器一致(不受 Safari `::cue` 限制)
  - 背景:描边 / **半透明(默认)** / 黑底 / 无
  - 颜色:白 / 黄 / 青 / 绿
  - **字号随播放器高度等比缩放**,窗口/全屏下观感一致
  - 位置(距底部)可调
- 🖥️ **全屏跟随**:进入全屏后覆盖层自动挂到全屏元素上
- 🈁 **日文注音(ruby)**:文本字幕里 `温厚（おんこう）`/`使徒《しと》` 显示为汉字上方假名。
  《》式始终转;括号启发式可在面板开关(仅文本路径,ASS 高保真受 libass 限制不支持)
  - **逐字对齐**:内置 KANJIDIC2 读音表(常用+人名用,~3000 字)+ 对齐算法,把读音精确落到各汉字并处理连浊/促音。
    `近接猟兵（りょうへい）` 只把 りょう/へい 注到 `猟兵`、`近接` 留白,不再铺满整串;熟字訓(`今日→きょう`)对不齐时回退整串注音。
    读音表随脚本本地内置、首次注音才 `JSON.parse`,零运行时网络
- 🎭 **语义排版**(动画字幕向,可开关):按日文 CC 常见约定重排,只排版不删字
  - **话者名** `（マオマオ)台词` → 名字淡化缩小,视线直达台词
  - **非语音** 独立 `（ドアが開く音)`/`（ざわざわ)`(音效·动作·心声)→ 斜体淡化
  - **画外音/心声** `〈…〉`/`＜…＞`(电话·旁白·内心)→ 斜体
  - **书面/引用** `《…》`(书信·念白·画面读字;与注音 `漢字《かな》` 消歧)→ 加底衬
  - **跨行/跨 cue 跨度**:`〈…` 开在一句、`…〉` 闭在几句之后,中间无括号的行也连续标记(书面 `《》`、歌曲 `♪…♪` 同理)。状态机跟踪未闭合跨度;跨 cue 仅在相邻不重叠时延续(重叠=多人同时/大间隔则重置)
  - **歌词** 行首 `♪` → 斜体
  - 两遍扫描消歧:先收集「行首名+台词」的话者名词表,独立 `（X)` 若 X 在表中记作话者名、否则记作音效(纯逻辑,有单测)
- 🧭 **位置与多人同时**:「字幕位置 底/顶」全局切换;**多人同时上下分置**——两位同时说话时,
  后开口的留主锚点、先说的移到对侧,不在底部堆高遮挡画面(可改回「底部叠放」)。ASS 的定位由 libass 按 `\an` 处理
- 🈶 自动**编码探测**:UTF-8 → GBK → Big5 →(日文)Shift-JIS / EUC-JP 回退
- ⏱️ **时间轴偏移**:±0.1 / ±1 步进按钮,或**手动输入**任意秒数
- 🔎 **穿透 Shadow DOM** 定位视频;页面多个视频时可手动「选视频」
- 🔄 `MutationObserver` 监听,SPA 切换视频后自动重新挂载
- ⌨️ **键盘快捷键**(`Ctrl+Shift` 或 `Alt+Shift` 皆可,几乎不与站点单键冲突):
  - `S` 打开/关闭面板 · `F` 在线找字幕 · `V` 显示/隐藏字幕 · `O` 打开本地文件
  - `←/→` 偏移 ∓0.1s
  - 🕒 **偏移记忆**:按「番剧 + 字幕源」记住偏移并持久化,同番剧同源(切集/重开)自动恢复,换番剧/换源各自独立
  - 输入框内不响应;capture 阶段只吞自己的组合、不破坏站点快捷键;**恒启用**(不设关闭开关,防止与「无悬浮球」叠加导致无法打开面板)
- 🫧 **极简 UI**:默认无常驻悬浮球、无任何弹窗打扰,快捷键唤出面板(可在面板里开启悬浮球)
- 🪶 **零空闲开销**:未加载字幕且未开悬浮球时不连接任何观察器/定时器,注入每个页面几乎无成本
- 💾 **设置持久化**:字号 / 位置 / 背景 / 颜色偏好自动记住(localStorage,按站点)
- ⚙️ 渲染**事件驱动 + 定时兜底**(不依赖 rAF),后台标签/PiP 也稳定

## 安装

> 安装的是构建产物 [`dist/anysub.user.js`](./dist/anysub.user.js)(源码在 `src/`,见下方「开发」)。

### Chrome / Edge / Firefox

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)
2. 打开 [`dist/anysub.user.js`](./dist/anysub.user.js) 原始文件,管理器会自动识别并提示安装
   - 或:Tampermonkey → 新建脚本 → 粘贴 `dist/anysub.user.js` 全部内容 → 保存

### Safari(macOS / iOS)

1. App Store 安装 [Userscripts](https://apps.apple.com/us/app/userscripts/id1463298887)(开源、免费)
2. Safari → 设置 → 扩展 → 启用 Userscripts,并在网站权限中允许
3. 点工具栏 Userscripts 图标 →「Open App」→ 把 `dist/anysub.user.js` 放入其脚本目录
   - 本脚本仅用标准 Web API(`@grant none`),不依赖 GM 特权接口,故 Safari 完整可用

## 使用

1. 打开任意带视频的网页
2. 点右下角 **「字幕」** 按钮
3. 「选择字幕文件」或把字幕文件**拖到面板**
4. 按需调节偏移 / 字号

## 开发

源码按功能拆分为 ES 模块(`src/`),用 [Vite](https://vitejs.dev) + [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) 打包成单个带 `==UserScript==` 头的 `dist/anysub.user.js`。

```bash
npm install       # 安装依赖
npm run build     # 构建 → dist/anysub.user.js
npm run dev       # 开发服务器:改代码自动重载 + 一键安装到脚本管理器
npm test          # 跑单元测试(Node 内置 node:test,零额外依赖)
```

### 测试

纯逻辑模块有单元回归测试(`test/`,用 `node --test`),覆盖历次踩坑点:
解析(XSS 转义、空行不截断、NaN/时间序)、ASS 解析、标题解析(旧字体集号)、
注音 ruby、**切集同源匹配**(EVA/薬屋 真实文件名)、编码探测。DOM/渲染/网络
部分靠 `demo.html` + 浏览器手动验证。

### 目录结构

```
src/
├── main.js         入口:init + 动态视频监听(MutationObserver)
├── state.js        全局状态 + 常量
├── refs.js         共享 DOM 引用(由 ui 填充,其余模块只读)
├── locator.js      穿透 Shadow DOM 定位 <video>
├── decode.js       读取文件 + 编码探测(UTF-8→GBK→Big5)
├── parse.js        SRT/VTT → 统一 cue 结构(XSS 安全、时间排序)
├── parse-ass.js    ASS/SSA → cue(文本保底用)
├── overlay.js      覆盖层定位 / 全屏跟随(格式无关)
├── render-text.js  文本渲染器(实现 renderer 接口)
├── render-ass.js   ASS 渲染器:文本保底 + libass 升级
├── octopus-loader.js  懒加载 libass-wasm(blob worker + CDN wasm/字体)
├── controller.js   渲染循环 + 视频生命周期 + 当前渲染器
├── loader.js       载入流程 + 格式注册表(本地/在线共用)
├── anilist.js      番剧名 → AniList 候选(无鉴权)
├── jimaku.js       Jimaku API 客户端(需 key)
├── online.js       在线编排:定位番剧 → 取文件 → 下载
├── match.js        跨集「同源」匹配(纯逻辑,有单测)
├── search-ui.js    在线搜索面板(候选列表)
├── title-parse.js  页面标题 → 番剧名 + 集数(含日文/旧字体)
├── ruby.js         日文注音(《》/｜/括号 → <ruby>,逐字对齐)
├── furigana-align.js  读音→逐字对齐(连浊/促音/后缀读音,纯逻辑有单测)
├── kanji-readings.js  内置汉字读音表(构建期由 scripts/build-readings.mjs 生成)
├── episode-watch.js 切集检测 + 同源自动接续
├── ui.js           设置面板 + 悬浮球 + 拖拽 + 选视频
├── shortcuts.js    键盘快捷键(Alt+Shift,capture 拦截)
├── watcher.js      DOM 观察器按需生命周期(空闲断开)
├── styles.js       注入 CSS
├── storage.js      设置持久化(localStorage)
└── notify.js       toast + 状态栏
```

**渲染层为可插拔架构**:`controller` 驱动循环并持有一个「渲染器」;渲染器实现统一接口 `{ mount, renderAt(video, rect, layoutChanged), applyStyle, destroy }`。`overlay` 负责与视频对齐的盒子(格式无关),渲染器渲染进这个盒子。`loader` 里的**格式注册表**按文件类型选渲染器。

加 ASS/SSA 高保真只需:新增 `render-ass.js`(libass-wasm 渲染到 canvas,实现同一接口),在注册表里加一条 `{ test: 匹配 .ass/.ssa, create: createAssRenderer }`——无需改动 controller / overlay / ui。

### 本地测试

```bash
npm run build && python3 -m http.server 8000
# 浏览器访问 http://localhost:8000/demo.html
```

`demo.html` 内联加载 `dist/anysub.user.js` + 一个联网示例视频,配 `sample.srt` 可完整走通流程。

## 路线图

- [x] ~~自绘覆盖层:样式可控、字号随播放器缩放、全屏跟随~~(v0.2.0)
- [x] ~~设置持久化(字号 / 位置 / 背景 / 颜色)~~(v0.4.0)
- [x] ~~ASS/SSA 高保真渲染(libass-wasm),失败降级纯文本~~(v0.7.0)
- [x] ~~在线字幕搜索(Jimaku,半自动候选)~~(v0.9.0)
- [x] ~~标题智能预填 + 切集自动接续(同源优先)~~(v0.10.0)
- [ ] 跨域 iframe 内视频支持
- [ ] 更多格式(SUB/SBV/LRC/SMI/TTML)
- [ ] ASS 自定义字体(内嵌 / 用户提供,改善冷门字体还原)
- [ ] 快捷键自定义重绑(撞键时可改;目前固定 Alt+Shift 组合)

## 设计说明

**渲染层**用自绘覆盖层(在视频上叠一层 `div`,按 `timeupdate` 显示当前字幕):相比原生 `TextTrack` / `::cue`,能完全掌控背景/描边/颜色/位置,且字号按播放器高度等比缩放,跨浏览器(尤其 Safari)一致。渲染采用**事件驱动 + 120ms 定时兜底**而非 `requestAnimationFrame`——rAF 在后台标签会被暂停,事件驱动同时更省 CPU。全屏时把覆盖层重新挂到 `document.fullscreenElement` 上以避免被顶层遮挡。

所有本地文件通过标准 `<input type=file>` / 拖拽读取,不使用任何 `GM_*` 接口,以保证 Safari 完整兼容。

**ASS 高保真**采用「先保底、后升级」:打开 `.ass/.ssa` 时先用文本渲染器立即显示(离线可用),同时后台懒加载 libass-wasm——主脚本经 blob `<script>` 注入(避开 `eval`/CSP inline),worker 整段包进 blob 并预置 `Module.locateFile` 使 wasm/字体从 CDN(jsdelivr)加载(绕过跨域 worker 限制)。就绪后切换到 canvas 高保真渲染并撤下文本;若任一步被网络或站点 CSP(`worker-src`/`connect-src`/`script-src`)拦截,则**保留文本渲染**,字幕始终可见。libass-wasm 不含字体,故指定含 CJK 的 Noto Sans SC 作 fallback,避免渲染空白。

> 已知限制:若站点对**裸 `<video>` 元素**(而非其容器)请求全屏,DOM 覆盖层无法叠加其上;绝大多数站点全屏的是播放器容器,不受影响。

**注音逐字对齐**不走通用分词器(kuromoji 那类需运行时加载数 MB 词典),而是内置一张从 [KANJIDIC2](https://www.edrdg.org/kanjidic/kanjidic2.xml.gz) 抽取的精简「汉字→读音」表(常用+人名用约 3000 字,平假名归一,gzip ~35KB),随脚本本地存储、首次注音才 `JSON.parse`。对齐用递归匹配:拿每个汉字的读音候选去消费括号里的假名串,动态生成连浊(は→ば)、促音(がく→がっ)变体;整串对不齐时从左逐字剥离取最长覆盖解(治「读音只覆盖后缀」),再对不齐则回退整串注音(熟字訓如 `今日→きょう`)。

> 词典数据 © [EDRDG](https://www.edrdg.org/) KANJIDIC2,依 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 使用。
