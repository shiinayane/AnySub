# AnySub · 通用字幕挂载

给**任意网站**的 HTML5 视频挂载**本地字幕文件**。纯用户脚本,无需后端、不上传文件、不联网。

Chrome / Edge / Safari / Firefox 通用。

## 功能(v0.1.0 — 阶段一 MVP)

- 📂 本地字幕文件挂载(选择 / 拖拽),**文件不出本机**
- 🎬 支持 **SRT / VTT**(ASS/SSA 会降级为纯文本;高保真渲染在后续版本)
- 🈶 自动**编码探测**:UTF-8 → GBK → Big5 回退,兼容中文字幕常见编码
- ⏱️ **时间轴偏移**微调(±0.5s / ±1s),解决字幕与画面时间差
- 🔤 **字号**实时调节
- 🔎 **穿透 Shadow DOM** 定位视频;页面多个视频时可手动「选视频」
- 🔄 `MutationObserver` 监听,SPA 切换视频后自动重新挂载

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

- [ ] **阶段二**:ASS/SSA 高保真渲染(懒加载 [libass-wasm](https://github.com/libass/JavascriptSubtitlesOctopus))
- [ ] 自定义播放器全屏跟随(canvas 覆盖层)
- [ ] 跨域 iframe 内视频支持
- [ ] 更多格式(SUB/SBV/LRC/SMI/TTML)与在线字幕搜索
- [ ] 设置持久化(记住字号 / 偏移偏好)

## 设计说明

阶段一刻意只用**原生 `TextTrack` API**(`addTextTrack` + `VTTCue`):零依赖、体积小、浏览器原生渲染、自动跟随全屏。代价是丢失 ASS 特效——这部分留给阶段二的 libass-wasm 模块。所有本地文件通过标准 `<input type=file>` / 拖拽读取,不使用任何 `GM_*` 接口,以保证 Safari 完整兼容。
