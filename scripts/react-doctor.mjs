import { spawnSync } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
import { fileURLToPath } from 'node:url';

const scan = spawnSync(
  'npx',
  ['-y', 'react-doctor@latest', '--score', '--', 'src'],
  {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  },
);

if (scan.stderr) process.stderr.write(scan.stderr);

if (scan.error || scan.status !== 0) {
  if (scan.stdout) process.stdout.write(scan.stdout);
  console.error(
    'React Doctor could not complete:',
    scan.error?.message ?? scan.signal ?? `exit code ${scan.status}`,
  );
  process.exit(1);
}

const output = stripVTControlCharacters(scan.stdout).trim();
if (!/^\d+(?:\.\d+)?$/.test(output)) {
  console.error(
    'React Doctor did not return a numeric score:',
    output || 'empty output',
  );
  process.exit(1);
}

const score = Number(output);
if (score < 0 || score > 100) {
  console.error('React Doctor returned an invalid score:', output);
  process.exit(1);
}

console.log(`React Doctor: ${score}/100 (required: 100)`);
if (score < 100) {
  console.error(
    'React Doctor check failed. Run npx --yes react-doctor@latest -- src for diagnostics.',
  );
  process.exit(1);
}
