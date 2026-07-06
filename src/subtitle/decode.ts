// Read a subtitle file + detect its encoding (UTF-8 → GBK → Big5 fallback)

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
    // Not UTF-8: among common CJK encodings, pick the one with the fewest replacement characters (anime subtitles are often Shift-JIS / EUC-JP)
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
        /* This browser (e.g. Safari) does not support this legacy encoding */
      }
    }
    if (best !== null) return best;
    console.warn(
      '[AnySub] Could not auto-detect subtitle encoding; falling back to UTF-8, output may be garbled — converting the file to UTF-8 is recommended',
    );
    return new TextDecoder('utf-8').decode(bytes);
  }
}
