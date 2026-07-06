// Video location: pierce Shadow DOM to collect <video> elements

export function collectVideos(
  root?: ParentNode | null,
  acc?: HTMLVideoElement[],
): HTMLVideoElement[] {
  acc = acc || [];
  root = root || document;
  let list: NodeListOf<HTMLVideoElement> | never[];
  try {
    list = root.querySelectorAll('video');
  } catch (_) {
    list = [];
  }
  list.forEach((v) => acc!.push(v));
  let all: NodeListOf<Element> | never[];
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

export function isVisible(v: Element): boolean {
  const r = v.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

// By default, pick the video with the largest visible area
export function pickBestVideo(): HTMLVideoElement | null {
  const vids = collectVideos().filter(isVisible);
  if (!vids.length) return collectVideos()[0] || null;
  vids.sort((a, b) => {
    const ra = a.getBoundingClientRect(),
      rb = b.getBoundingClientRect();
    return rb.width * rb.height - ra.width * ra.height;
  });
  return vids[0];
}
