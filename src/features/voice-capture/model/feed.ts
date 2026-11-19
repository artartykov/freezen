const unstableTail = 2;
const minBatch = 5;

export function wordsOf(text: string) {
  return text.split(/\s+/).filter(Boolean);
}

export function feedableUpTo(
  words: string[],
  fed: number,
  active: boolean,
  force = false,
) {
  const limit = force || !active ? words.length : words.length - unstableTail;
  if (limit <= fed) return fed;
  if (!force && limit - fed < minBatch && active) return fed;
  return limit;
}

export function lastWords(text: string, count = 8) {
  return wordsOf(text).slice(-count).join(' ');
}
