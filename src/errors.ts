// Safely extract a human-readable message from any throwable / promise rejection (for use in toasts).
// Covers: Error, as well as objects carrying a string message (e.g. DOMException — in the browser it is not
// an Error instance, but usually carries a useful message); everything else falls back to String().
export function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return String(e);
}
