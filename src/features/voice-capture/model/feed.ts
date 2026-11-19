export function wordsOf(text: string) {
  return text.split(/\s+/).filter(Boolean);
}
