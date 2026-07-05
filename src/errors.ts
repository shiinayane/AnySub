// 从任意 throwable / promise rejection 里安全取一句人类可读消息(用于 toast)。
// 覆盖:Error、以及带 string message 的对象(如 DOMException —— 浏览器里它并非 Error 实例,
// 但通常带有用的 message);其余回退 String()。
export function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return String(e);
}
