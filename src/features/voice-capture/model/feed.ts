const unstableTail = 1;

export function wordsOf(text: string) {
  return text.split(/\s+/).filter(Boolean);
}

export function feedableUpTo({
  stable,
  total,
  fed,
  settled,
}: {
  stable: number;
  total: number;
  fed: number;
  settled: boolean;
}) {
  const limit = settled ? total : Math.max(stable, total - unstableTail);
  return Math.max(fed, limit);
}

export function lastWords(text: string, count = 8) {
  return wordsOf(text).slice(-count).join(' ');
}
