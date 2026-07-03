// 读取字幕文件 + 编码探测(UTF-8 → GBK → Big5 回退)

export function readSubtitleFile(file) {
  return file.arrayBuffer().then((buf) => decodeBuffer(new Uint8Array(buf)));
}

export function decodeBuffer(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder('utf-16le').decode(bytes);
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff)
    return new TextDecoder('utf-16be').decode(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (_) {
    for (const enc of ['gbk', 'big5']) {
      try {
        const text = new TextDecoder(enc).decode(bytes);
        if (!text.includes('�')) return text;
      } catch (_) { /* 不支持该 legacy 编码 */ }
    }
    return new TextDecoder('utf-8').decode(bytes);
  }
}
