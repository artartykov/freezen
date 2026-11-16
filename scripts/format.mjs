import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const check = args.includes('--check');
const files = args.filter((argument) => argument !== '--check');
const cli = fileURLToPath(import.meta.resolve('prettier/bin/prettier.cjs'));

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, [
  cli,
  check ? '--check' : '--write',
  '--ignore-unknown',
  ...(files.length ? files : ['.']),
]);

if (files.length) {
  const rustFiles = files.filter((file) => file.endsWith('.rs'));
  if (rustFiles.length) {
    run('rustfmt', [
      '--edition',
      '2021',
      '--config',
      'skip_children=true',
      ...(check ? ['--check'] : []),
      ...rustFiles,
    ]);
  }
} else {
  run('cargo', [
    'fmt',
    '--manifest-path',
    'src-tauri/Cargo.toml',
    ...(check ? ['--check'] : []),
  ]);
}
