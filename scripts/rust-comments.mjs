import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const rawString = /^(?:b|c)?r(#*)"/;
const charLiteral =
  /^b?'(?:\\(?:x[0-9a-fA-F]{2}|u\{[0-9a-fA-F_]+\}|.)|[^\\'\n])'/u;

export function findComments(source) {
  const found = [];
  let line = 1;
  let index = 0;
  const advance = (count) => {
    const end = Math.min(index + count, source.length);
    for (; index < end; index++) {
      if (source[index] === '\n') line++;
    }
  };
  while (index < source.length) {
    const rest = source.slice(index);
    if (rest.startsWith('//')) {
      found.push(line);
      const end = source.indexOf('\n', index);
      advance((end === -1 ? source.length : end) - index);
      continue;
    }
    if (rest.startsWith('/*')) {
      found.push(line);
      let depth = 0;
      do {
        if (source.startsWith('/*', index)) {
          depth++;
          advance(2);
        } else if (source.startsWith('*/', index)) {
          depth--;
          advance(2);
        } else {
          advance(1);
        }
      } while (depth > 0 && index < source.length);
      continue;
    }
    const raw = rest.match(rawString);
    if (raw && !/[\p{ID_Continue}]/u.test(source[index - 1] ?? '')) {
      const closing = `"${raw[1]}`;
      const end = source.indexOf(closing, index + raw[0].length);
      advance((end === -1 ? source.length : end + closing.length) - index);
      continue;
    }
    if (rest[0] === '"' || rest.startsWith('b"') || rest.startsWith('c"')) {
      advance(rest[0] === '"' ? 1 : 2);
      while (index < source.length && source[index] !== '"') {
        advance(source[index] === '\\' ? 2 : 1);
      }
      advance(1);
      continue;
    }
    const character = rest.match(charLiteral);
    if (character) {
      advance(character[0].length);
      continue;
    }
    advance(1);
  }
  return found;
}

if (import.meta.main) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const files = execFileSync(
    'git',
    [
      'ls-files',
      '-z',
      '--cached',
      '--others',
      '--exclude-standard',
      '--',
      '*.rs',
    ],
    { cwd: root, encoding: 'utf8' },
  )
    .split('\0')
    .filter((file) => file && !file.startsWith('src-tauri/gen/'));
  let failed = false;
  for (const file of new Set(files)) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    for (const line of findComments(readFileSync(path, 'utf8'))) {
      console.error(`${file}:${line}: Comments are not allowed (ADR-0005)`);
      failed = true;
    }
  }
  process.exit(failed ? 1 : 0);
}
