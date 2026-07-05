// 读取字幕文件 + 编码探测(UTF-8 → GBK → Big5 回退)

export function readSubtitleFile(file: File): Promise<string> {
  return file.arrayBuffer().then((buf) => decodeBuffer(new Uint8Array(buf)));
}

export function decodeBuffer(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder('utf-16le').decode(bytes);
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff)
    return new TextDecoder('utf-16be').decode(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (_) {
    // 非 UTF-8:在常见 CJK 编码中选「替换字符最少」者(动画字幕常见 Shift-JIS / EUC-JP)
    let best: string | null = null,
      bestScore = Infinity;
    for (const enc of ['shift_jis', 'euc-jp', 'gbk', 'big5']) {
      try {
        const text = new TextDecoder(enc).decode(bytes);
        const score = (text.match(/�/g) || []).length;
        if (score < bestScore) {
          bestScore = score;
          best = text;
        }
      } catch (_) {
        /* 该浏览器(如 Safari)不支持此 legacy 编码 */
      }
    }
    if (best !== null) return best;
    console.warn('[AnySub] 无法自动识别字幕编码,按 UTF-8 兜底,可能乱码;建议转成 UTF-8');
    return new TextDecoder('utf-8').decode(bytes);
  }
}
