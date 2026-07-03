# AnySub · 通用字幕挂载

给**任意网站**的 HTML5 视频挂载**本地字幕文件**。纯用户脚本,无需后端、不上传文件、不联网。

Chrome / Edge / Safari / Firefox 通用。

## 功能(v0.3.0)

- 📂 本地字幕文件挂载(选择 / 拖拽 / **清除**),**文件不出本机、不联网**
- 🎬 支持 **SRT / VTT**(ASS/SSA 降级为纯文本;高保真渲染在后续版本)
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
- 🫧 **非侵入式 UI**:小胶囊**吸附到最近边缘**并半藏、可拖动,不遮挡观看
- ⚙️ 渲染**事件驱动 + 定时兜底**(不依赖 rAF),后台标签/PiP 也稳定

## 安装

### Chrome / Edge / Firefox

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)
2. 打开 [`anysub.user.js`](./anysub.user.js) 原始文件,管理器会自动识别并提示安装
   - 或:Tampermonkey → 新建脚本 → 粘贴 `anysub.user.js` 全部内容 → 保存

### Safari(macOS / iOS)

1. App Store 安装 [Userscripts](https://apps.apple.com/us/app/userscripts/id1463298887)(开源、免费)
2. Safari → 设置 → 扩展 → 启用 Userscripts,并在网站权限中允许
3. 点工具栏 Userscripts 图标 →「Open App」→ 把 `anysub.user.js` 放入其脚本目录
   - 本脚本仅用标准 Web API(`@grant none`),不依赖 GM 特权接口,故 Safari 完整可用

## 使用

1. 打开任意带视频的网页
2. 点右下角 **「字幕」** 按钮
3. 「选择字幕文件」或把字幕文件**拖到面板**
4. 按需调节偏移 / 字号

## 本地测试(开发者)

```bash
# 用任意静态服务器打开 demo.html(直接双击也可,但联网视频需 http 环境更稳)
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000/demo.html
```

`demo.html` 内联加载脚本 + 一个联网示例视频,配 `sample.srt` 可完整走通流程。

## 路线图

- [x] ~~自绘覆盖层:样式可控、字号随播放器缩放、全屏跟随~~(v0.2.0)
- [ ] **阶段二**:ASS/SSA 高保真渲染(懒加载 [libass-wasm](https://github.com/libass/JavascriptSubtitlesOctopus))
- [ ] 跨域 iframe 内视频支持
- [ ] 更多格式(SUB/SBV/LRC/SMI/TTML)与在线字幕搜索
- [ ] 设置持久化(记住字号 / 偏移 / 样式偏好)

## 设计说明

**渲染层**用自绘覆盖层(在视频上叠一层 `div`,按 `timeupdate` 显示当前字幕):相比原生 `TextTrack` / `::cue`,能完全掌控背景/描边/颜色/位置,且字号按播放器高度等比缩放,跨浏览器(尤其 Safari)一致。渲染采用**事件驱动 + 120ms 定时兜底**而非 `requestAnimationFrame`——rAF 在后台标签会被暂停,事件驱动同时更省 CPU。全屏时把覆盖层重新挂到 `document.fullscreenElement` 上以避免被顶层遮挡。

所有本地文件通过标准 `<input type=file>` / 拖拽读取,不使用任何 `GM_*` 接口,以保证 Safari 完整兼容。ASS 特效渲染留给阶段二的 libass-wasm 模块。

> 已知限制:若站点对**裸 `<video>` 元素**(而非其容器)请求全屏,DOM 覆盖层无法叠加其上;绝大多数站点全屏的是播放器容器,不受影响。
