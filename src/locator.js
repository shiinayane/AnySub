// 视频定位:穿透 Shadow DOM 收集 <video>

export function collectVideos(root, acc) {
  acc = acc || [];
  root = root || document;
  let list;
  try {
    list = root.querySelectorAll('video');
  } catch (_) {
    list = [];
  }
  list.forEach((v) => acc.push(v));
  let all;
  try {
    all = root.querySelectorAll('*');
  } catch (_) {
    all = [];
  }
  all.forEach((el) => {
    if (el.shadowRoot) collectVideos(el.shadowRoot, acc);
  });
  return acc;
}

export function isVisible(v) {
  const r = v.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

// 默认选可见面积最大的 video
export function pickBestVideo() {
  const vids = collectVideos().filter(isVisible);
  if (!vids.length) return collectVideos()[0] || null;
  vids.sort((a, b) => {
    const ra = a.getBoundingClientRect(),
      rb = b.getBoundingClientRect();
    return rb.width * rb.height - ra.width * ra.height;
  });
  return vids[0];
}
