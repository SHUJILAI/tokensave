export function estimateTokens(s: string): number {
  let cjk = 0, ascii = 0;
  for (const c of s) {
    c.charCodeAt(0) > 0x2E7F ? cjk++ : ascii++;
  }
  return Math.ceil(cjk * 1.5 + ascii * 0.25);
}
