import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { EventEmitter, once } from 'node:events';
import { mkdir, readFile, stat, unlink } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const idleMs = 30 * 60_000;
const timeoutMs = 60_000;
const shutdownMs = 2_000;
const methods = {
  def: 'textDocument/definition',
  refs: 'textDocument/references',
  hover: 'textDocument/hover',
  impl: 'textDocument/implementation',
};
const callMethods = {
  callers: 'callHierarchy/incomingCalls',
  callees: 'callHierarchy/outgoingCalls',
};

function withTimeout(promise, ms, operation) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(operation + ' timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function createLsp({ executable, args = [], cwd, shell }) {
  const child = spawn(executable, args, {
    cwd,
    shell,
    detached: process.platform !== 'win32',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const notifications = new EventEmitter();
  const pending = new Map();
  let nextId = 0;
  let buffer = Buffer.alloc(0);
  let stderr = '';
  let failure;
  let stopped = false;

  function fail(error) {
    if (failure) return;
    failure = error;
    for (const { reject } of pending.values()) reject(error);
    notifications.emit('failed', error);
  }

  function send(message) {
    const body = Buffer.from(JSON.stringify({ jsonrpc: '2.0', ...message }));
    child.stdin.write(
      Buffer.concat([
        Buffer.from('Content-Length: ' + body.length + '\r\n\r\n'),
        body,
      ]),
    );
  }

  function receive(message) {
    if (message.method) {
      if (message.id !== undefined) {
        const result =
          message.method === 'workspace/configuration'
            ? message.params.items.map(() => null)
            : null;
        send({ id: message.id, result });
      } else {
        notifications.emit(message.method, message.params);
      }
      return;
    }
    const request = pending.get(message.id);
    if (message.error) request?.reject(new Error(message.error.message));
    else request?.resolve(message.result);
  }

  child.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    try {
      for (;;) {
        const boundary = buffer.indexOf('\r\n\r\n');
        if (boundary === -1) return;
        const header = buffer.subarray(0, boundary).toString('ascii');
        const length = Number(header.match(/^Content-Length: (\d+)$/im)?.[1]);
        if (!Number.isSafeInteger(length))
          throw new Error('Invalid LSP header');
        const start = boundary + 4;
        if (buffer.length < start + length) return;
        const message = JSON.parse(
          buffer.toString('utf8', start, start + length),
        );
        buffer = buffer.subarray(start + length);
        receive(message);
      }
    } catch (error) {
      fail(error);
    }
  });
  child.stderr.setEncoding('utf8').on('data', (chunk) => {
    stderr = (stderr + chunk).slice(-4_096);
  });
  child.on('error', fail);
  child.stdin.on('error', fail);
  const exited = new Promise((resolve) => {
    child.once('close', (code, signal) => {
      stopped = true;
      fail(
        new Error(
          stderr.trim() || 'LSP server exited (' + (signal ?? code) + ')',
        ),
      );
      resolve();
    });
  });

  const notify = (method, params) => send({ method, params });

  function request(method, params, timeout = timeoutMs) {
    if (failure) return Promise.reject(failure);
    const id = ++nextId;
    const response = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      send({ id, method, params });
    });
    return withTimeout(response, timeout, method).finally(() =>
      pending.delete(id),
    );
  }

  function waitForNotification(method, predicate, timeout) {
    if (failure) return Promise.reject(failure);
    let onNotification;
    let onFailure;
    const response = new Promise((resolve, reject) => {
      onNotification = (params) => {
        if (predicate(params)) resolve(params);
      };
      onFailure = reject;
      notifications.on(method, onNotification);
      notifications.once('failed', onFailure);
    });
    return withTimeout(response, timeout, method).finally(() => {
      notifications.off(method, onNotification);
      notifications.off('failed', onFailure);
    });
  }

  async function stop() {
    if (stopped) return;
    try {
      await request('shutdown', null, shutdownMs);
      notify('exit');
      child.stdin.end();
      await withTimeout(exited, shutdownMs, 'LSP exit');
    } catch {
      if (stopped || !child.pid) return;
      if (process.platform === 'win32') child.kill();
      else {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch (error) {
          if (error.code !== 'ESRCH') throw error;
        }
      }
      await exited;
    }
  }

  return {
    notify,
    request,
    waitForNotification,
    stop,
    get failed() {
      return Boolean(failure);
    },
  };
}

async function createSession({ workspace, server, initialize, ready }) {
  const rootUri = pathToFileURL(workspace).href;
  const { capabilities, ...params } = initialize();
  const lsp = createLsp({ ...server, cwd: workspace });
  try {
    await lsp.request('initialize', {
      processId: process.pid,
      rootUri,
      workspaceFolders: [{ uri: rootUri, name: path.basename(workspace) }],
      ...params,
      capabilities: {
        ...capabilities,
        textDocument: {
          ...capabilities.textDocument,
          documentSymbol: { hierarchicalDocumentSymbolSupport: true },
        },
      },
    });
    lsp.notify('initialized', {});
    await ready?.(lsp);
    return lsp;
  } catch (error) {
    await lsp.stop();
    throw error;
  }
}

function coordinate(root, uri, { start: { line, character } }) {
  return (
    path.relative(root, fileURLToPath(uri)) +
    ':' +
    (line + 1) +
    ':' +
    (character + 1)
  );
}

async function location(root, { uri, range, targetUri, targetSelectionRange }) {
  const at = coordinate(root, uri ?? targetUri, range ?? targetSelectionRange);
  const file = fileURLToPath(uri ?? targetUri);
  const text = await readFile(file, 'utf8').catch(() => '');
  const { line } = (range ?? targetSelectionRange).start;
  return at + '  ' + (text.split('\n')[line]?.trim() ?? '');
}

function outlineLines(root, uri, symbols, indent = '') {
  return symbols.flatMap(
    ({ name, selectionRange, location, children = [] }) => [
      indent +
        name +
        '  ' +
        coordinate(
          root,
          location?.uri ?? uri,
          selectionRange ?? location.range,
        ),
      ...outlineLines(root, uri, children, indent + '  '),
    ],
  );
}

async function callHierarchy(root, lsp, command, params) {
  const items =
    (await lsp.request('textDocument/prepareCallHierarchy', params)) ?? [];
  if (!items.length) return 'no call hierarchy';
  const lines = [];
  for (const item of items) {
    lines.push(
      item.name + '  ' + coordinate(root, item.uri, item.selectionRange),
    );
    if (command === 'calls') continue;
    const edges = (await lsp.request(callMethods[command], { item })) ?? [];
    for (const { from, to, fromRanges } of edges) {
      const endpoint = from ?? to;
      const sites = fromRanges.map((range) =>
        coordinate(root, from?.uri ?? item.uri, range),
      );
      lines.push(
        '  ' +
          endpoint.name +
          '  ' +
          coordinate(root, endpoint.uri, endpoint.selectionRange),
      );
      for (const site of sites) lines.push('    ' + site);
    }
    lines.push(
      '  ' +
        edges.length +
        (command === 'callers' ? ' caller(s)' : ' callee(s)'),
    );
  }
  return lines.join('\n');
}

async function query(config, lsp, command, args) {
  const { root, symbolFile, symbolOptions, diagnostics, languageId } = config;
  const file = command === 'symbol' ? symbolFile : args[0];
  if (!file) return workspaceSymbols(root, lsp, args[0], symbolOptions);
  const uri = pathToFileURL(file).href;
  const text = await readFile(file, 'utf8');
  const textDocument = { uri };
  lsp.notify('textDocument/didOpen', {
    textDocument: { uri, languageId: languageId(file), version: 1, text },
  });
  try {
    if (command === 'diag')
      return await diagnostics(lsp, file, root, textDocument);
    if (command === 'symbol')
      return await workspaceSymbols(root, lsp, args[0], symbolOptions);
    if (command === 'outline') {
      const symbols =
        (await lsp.request('textDocument/documentSymbol', { textDocument })) ??
        [];
      const lines = outlineLines(root, uri, symbols);
      return [...lines, lines.length + ' symbol(s)'].join('\n');
    }
    const position = {
      line: Number(args[1]) - 1,
      character: Number(args[2]) - 1,
    };
    const params = { textDocument, position };
    if (command === 'calls' || Object.hasOwn(callMethods, command))
      return await callHierarchy(root, lsp, command, params);
    if (command === 'refs') params.context = { includeDeclaration: true };
    const result = await lsp.request(methods[command], params);
    if (command === 'hover') return result?.contents?.value ?? 'no info';
    const items = Array.isArray(result) ? result : result ? [result] : [];
    const lines = await Promise.all(items.map((item) => location(root, item)));
    if (command === 'refs') lines.push(items.length + ' reference(s)');
    if (command === 'impl') lines.push(items.length + ' implementation(s)');
    return lines.join('\n') || 'no definition';
  } finally {
    lsp.notify('textDocument/didClose', { textDocument });
  }
}

async function workspaceSymbols(root, lsp, query = '', options) {
  const items =
    (await lsp.request('workspace/symbol', { query, ...options })) ?? [];
  const lines = await Promise.all(
    items
      .slice(0, 100)
      .map(
        async ({ name, location: at }) =>
          name + '  ' + (await location(root, at)),
      ),
  );
  return [...lines, lines.length + ' symbol(s)'].join('\n');
}

async function readMessage(socket) {
  let buffer = '';
  for await (const chunk of socket.iterator({ destroyOnReturn: false })) {
    buffer += chunk;
    const end = buffer.indexOf('\n');
    if (end !== -1) return JSON.parse(buffer.slice(0, end));
  }
  throw new Error('Incomplete request');
}

function reportError(error) {
  console.error('error: ' + error.message);
  process.exitCode = 1;
}

export function runLspQuery(config) {
  const { entry, root, hookExtension, daemonTimeout = 3 * timeoutMs } = config;
  const name = path.basename(entry, '.mjs');
  const user = os.userInfo().uid;
  const socketName =
    name +
    '-' +
    createHash('sha256')
      .update(JSON.stringify([user, root]))
      .digest('hex')
      .slice(0, 20);
  const socketDirectory = path.join(os.tmpdir(), 'ts-query-' + user);
  const socketPath =
    process.platform === 'win32'
      ? '\\\\.\\pipe\\' + socketName
      : path.join(socketDirectory, socketName + '.sock');
  const usage = `usage: node scripts/${name}.mjs def|refs|hover|impl|calls|callers|callees <file> <line> <col> | outline|diag <file> | symbol <query> | stop`;
  const noDaemonVariable =
    name.toUpperCase().replaceAll('-', '_') + '_NO_DAEMON';

  async function scriptVersion() {
    const files = [entry, import.meta.filename];
    return (
      await Promise.all(files.map(async (file) => (await stat(file)).mtimeMs))
    ).join(':');
  }

  async function serve() {
    const version = await scriptVersion();
    let session;
    let idle;
    let stopping = false;
    let queue = Promise.resolve();
    const server = net.createServer((socket) => {
      socket.setEncoding('utf8');
      socket.setTimeout(timeoutMs, () => socket.destroy());
      socket.on('error', () => socket.destroy());
      void handle(socket);
    });

    async function shutdown() {
      if (stopping) return;
      stopping = true;
      clearTimeout(idle);
      server.close();
      await session?.stop();
    }

    function resetIdle() {
      clearTimeout(idle);
      idle = setTimeout(() => {
        queue = queue.then(shutdown).catch(reportError);
      }, idleMs);
    }

    async function handle(socket) {
      let request;
      try {
        request = await readMessage(socket);
        socket.setTimeout(0);
      } catch {
        socket.destroy();
        return;
      }
      queue = queue.then(async () => {
        try {
          if (stopping) throw new Error('Server is stopping');
          clearTimeout(idle);
          if (request.command === 'stop') {
            await shutdown();
            socket.end(JSON.stringify({ output: 'stopped' }));
          } else if (request.version !== version) {
            await shutdown();
            socket.end(JSON.stringify({ restart: true }));
          } else {
            validate(request.command, request.args);
            if (session?.failed) {
              await session.stop();
              session = undefined;
            }
            session ??= await createSession(config);
            socket.end(
              JSON.stringify({
                output: await query(
                  config,
                  session,
                  request.command,
                  request.args,
                ),
              }),
            );
          }
        } catch (error) {
          socket.end(JSON.stringify({ error: error.message }));
        } finally {
          if (!stopping) resetIdle();
        }
      });
    }

    if (process.platform !== 'win32') {
      await mkdir(socketDirectory, { mode: 0o700, recursive: true });
    }
    server.listen(socketPath);
    await once(server, 'listening');
    resetIdle();
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, () => {
        queue = queue.then(shutdown).catch(reportError);
      });
    }
  }

  async function connect(request) {
    const socket = net.createConnection(socketPath);
    socket.setEncoding('utf8');
    const response = new Promise((resolve, reject) => {
      let buffer = '';
      socket.on('connect', () => socket.write(JSON.stringify(request) + '\n'));
      socket.on('data', (chunk) => {
        buffer += chunk;
      });
      socket.on('end', () => {
        try {
          resolve(JSON.parse(buffer));
        } catch (error) {
          reject(error);
        }
      });
      socket.on('error', reject);
    });
    try {
      return await withTimeout(response, daemonTimeout, name + ' daemon');
    } finally {
      socket.destroy();
    }
  }

  async function askDaemon(command, args) {
    const version = await scriptVersion();
    let started = false;
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      try {
        const reply = await connect({ command, args, version });
        if (reply.error) throw new Error(reply.error);
        if (reply.restart) {
          started = false;
          continue;
        }
        return reply.output;
      } catch (error) {
        if (!['ECONNREFUSED', 'ENOENT'].includes(error.code)) throw error;
        if (command === 'stop') return 'not running';
        if (!started) {
          if (error.code === 'ECONNREFUSED' && process.platform !== 'win32') {
            await unlink(socketPath).catch((error) => {
              if (error.code !== 'ENOENT') throw error;
            });
          }
          const daemon = spawn(process.execPath, [entry, '--serve'], {
            cwd: root,
            detached: true,
            stdio: 'ignore',
          });
          daemon.on('error', reportError);
          daemon.unref();
          started = true;
        }
        if (Date.now() >= deadline)
          throw new Error(name + ' daemon did not start', { cause: error });
        await delay(50);
      }
    }
  }

  function validate(command, args) {
    if (command === 'stop' || command === 'symbol') return;
    if (!args[0]) throw new Error(usage);
    if (command === 'diag' || command === 'outline') return;
    if (
      command !== 'calls' &&
      !Object.hasOwn(methods, command) &&
      !Object.hasOwn(callMethods, command)
    ) {
      throw new Error(usage);
    }
    if (![args[1], args[2]].every((value) => /^[1-9]\d*$/.test(value))) {
      throw new Error('Line and column must be positive integers');
    }
  }

  async function run(command, args) {
    validate(command, args);
    if (command !== 'stop' && command !== 'symbol')
      args[0] = path.resolve(args[0]);
    if (process.env[noDaemonVariable] !== '1') return askDaemon(command, args);
    if (command === 'stop') return 'not running';
    const session = await createSession(config);
    try {
      return await query(config, session, command, args);
    } finally {
      await session.stop();
    }
  }

  async function hook() {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const file = JSON.parse(input || '{}').tool_input?.file_path;
    if (!file || !hookExtension.test(file)) return;
    const lines = (await run('diag', [file])).split('\n');
    const summary = lines.pop();
    if (!lines.length) return;
    const shown = lines.slice(0, 30);
    if (lines.length > shown.length)
      shown.push('... ' + (lines.length - shown.length) + ' more');
    const additionalContext = [
      'TypeScript diagnostics after this edit (' + summary + '):',
      ...shown,
    ].join('\n');
    console.log(
      JSON.stringify({
        hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext },
      }),
    );
  }

  const [command, ...args] = process.argv.slice(2);
  if (command === '--serve') {
    return serve().catch((error) => {
      if (error.code !== 'EADDRINUSE') reportError(error);
    });
  } else if (command === 'hook') {
    return hook().catch(() => undefined);
  } else if (!command) {
    console.error(usage);
    process.exitCode = 2;
  } else {
    return run(command, args).then(
      (output) => console.log(output),
      reportError,
    );
  }
}
