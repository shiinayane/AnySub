# AnySub · 通用字幕挂载

给**任意网站**的 HTML5 视频挂载**本地字幕文件**。纯用户脚本,无需后端、不上传文件、不联网。

Chrome / Edge / Safari / Firefox 通用。

## 功能(v0.7.0)

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
- 🈶 自动**编码探测**:UTF-8 → GBK → Big5 回退,兼容中文字幕常见编码
- ⏱️ **时间轴偏移**:±0.1 / ±1 步进按钮,或**手动输入**任意秒数
- 🔎 **穿透 Shadow DOM** 定位视频;页面多个视频时可手动「选视频」
- 🔄 `MutationObserver` 监听,SPA 切换视频后自动重新挂载
- 🫧 **非侵入式 UI**:**仅在有视频的页面显示**胶囊(含 Shadow DOM、动态出现);吸附到最近边缘并半藏、可拖动
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
```

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
├── loader.js       载入流程 + 格式注册表(分派渲染器)
├── ui.js           面板 + 胶囊 + 拖拽吸附 + 选视频
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
- [ ] 跨域 iframe 内视频支持
- [ ] 更多格式(SUB/SBV/LRC/SMI/TTML)与在线字幕搜索
- [ ] ASS 自定义字体(内嵌 / 用户提供,改善冷门字体还原)

## 设计说明

**渲染层**用自绘覆盖层(在视频上叠一层 `div`,按 `timeupdate` 显示当前字幕):相比原生 `TextTrack` / `::cue`,能完全掌控背景/描边/颜色/位置,且字号按播放器高度等比缩放,跨浏览器(尤其 Safari)一致。渲染采用**事件驱动 + 120ms 定时兜底**而非 `requestAnimationFrame`——rAF 在后台标签会被暂停,事件驱动同时更省 CPU。全屏时把覆盖层重新挂到 `document.fullscreenElement` 上以避免被顶层遮挡。

所有本地文件通过标准 `<input type=file>` / 拖拽读取,不使用任何 `GM_*` 接口,以保证 Safari 完整兼容。

**ASS 高保真**采用「先保底、后升级」:打开 `.ass/.ssa` 时先用文本渲染器立即显示(离线可用),同时后台懒加载 libass-wasm——主脚本经 blob `<script>` 注入(避开 `eval`/CSP inline),worker 整段包进 blob 并预置 `Module.locateFile` 使 wasm/字体从 CDN(jsdelivr)加载(绕过跨域 worker 限制)。就绪后切换到 canvas 高保真渲染并撤下文本;若任一步被网络或站点 CSP(`worker-src`/`connect-src`/`script-src`)拦截,则**保留文本渲染**,字幕始终可见。libass-wasm 不含字体,故指定含 CJK 的 Noto Sans SC 作 fallback,避免渲染空白。

> 已知限制:若站点对**裸 `<video>` 元素**(而非其容器)请求全屏,DOM 覆盖层无法叠加其上;绝大多数站点全屏的是播放器容器,不受影响。
