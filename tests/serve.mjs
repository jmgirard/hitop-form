// Two servers for the tests.
//
// serveDir() is a static file server. It serves whichever directory it is
// pointed at: the repository itself, or a scratch directory holding a
// rewritten copy of the pages. Any request under /hang/ is held open without
// an answer, for a test that needs a fetch that never settles. Copied from
// jmgirard/hitop-builder's tests/serve.mjs.
//
// serveStore() is a recording endpoint standing in for a store: it records
// the method, headers and body of every request it receives and answers as
// the path asks. It listens on its own port, a second origin beside the page,
// and starts a third-origin twin as the target of its /redirect path.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// The Authorization header is not covered by a wildcard, so the headers a
// supabase send carries are listed by name. Max-Age 0: no browser caches
// the preflight, so every walk's OPTIONS reaches the log.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-allow-headers': 'apikey, authorization, content-type, prefer',
  'access-control-max-age': '0',
};

// The paths a store test can name, and their answers:
//   /record        200, application/json, {"ok":true}
//   /redirect      302 to /record on the third origin (the twin)
//   /html          200 with an HTML body, as an Apps Script web app answers
//                  when doPost throws
//   /status/<nnn>  that status with a text body
//   /hang/...      held open, never answered
//   /rest/v1/<table>  the Supabase REST insert: a POST is answered 201 with
//                  an empty body, as the API answers an insert with Prefer:
//                  return=minimal; a table named status_<nnn> answers that
//                  status with a {} body, and redirect_302 answers 302 to
//                  /record on the twin; any method but POST and OPTIONS
//                  is answered 405
// Every answer carries Access-Control-Allow-Origin: *, and OPTIONS is
// answered 204 with the CORS headers, so a preflight the browser sent
// succeeds and is recorded rather than failing the send for a second reason.
export async function serveStore() {
  const requests = [];
  const held = new Set();
  let targetOrigin;

  const handler = (server) => async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const chunks = [];
    for await (const c of req) chunks.push(c);
    requests.push({
      server,
      method: req.method,
      path: url.pathname,
      headers: { ...req.headers },
      body: Buffer.concat(chunks).toString('utf8'),
    });
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS).end();
      return;
    }
    if (url.pathname.startsWith('/hang/')) {
      held.add(res);
      return;
    }
    if (url.pathname === '/record') {
      res.writeHead(200, { ...CORS, 'content-type': 'application/json; charset=utf-8' }).end('{"ok":true}');
      return;
    }
    if (url.pathname === '/redirect') {
      res.writeHead(302, { ...CORS, location: `${targetOrigin}/record` }).end();
      return;
    }
    if (url.pathname === '/html') {
      res
        .writeHead(200, { ...CORS, 'content-type': 'text/html; charset=utf-8' })
        .end('<!doctype html><html><head><title>Error</title></head><body><p>Script function not found: doPost</p></body></html>');
      return;
    }
    const status = /^\/status\/(\d{3})$/.exec(url.pathname);
    if (status) {
      res.writeHead(Number(status[1]), { ...CORS, 'content-type': 'text/plain' }).end(`status ${status[1]}`);
      return;
    }
    const rest = /^\/rest\/v1\/([a-z_][a-z0-9_]*)$/.exec(url.pathname);
    if (rest) {
      if (req.method !== 'POST') {
        res.writeHead(405, { ...CORS, 'content-type': 'text/plain' }).end('method not allowed');
        return;
      }
      const named = /^status_(\d{3})$/.exec(rest[1]);
      if (named) res.writeHead(Number(named[1]), { ...CORS, 'content-type': 'application/json' }).end('{}');
      else if (rest[1] === 'redirect_302') res.writeHead(302, { ...CORS, location: `${targetOrigin}/record` }).end();
      else res.writeHead(201, CORS).end();
      return;
    }
    res.writeHead(404, { ...CORS, 'content-type': 'text/plain' }).end('not found');
  };

  const store = http.createServer(handler('store'));
  const target = http.createServer(handler('target'));
  await new Promise((resolve) => store.listen(0, '127.0.0.1', resolve));
  await new Promise((resolve) => target.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${store.address().port}`;
  targetOrigin = `http://127.0.0.1:${target.address().port}`;

  return {
    origin,
    targetOrigin,
    requests,
    url: (p) => `${origin}${p}`,
    async close() {
      for (const res of held) res.destroy();
      held.clear();
      for (const s of [store, target]) {
        s.closeAllConnections();
        await new Promise((resolve) => s.close(resolve));
      }
    },
  };
}

// A port nothing listens on: taken from the system and released again.
export async function unusedPort() {
  const s = http.createServer();
  await new Promise((resolve) => s.listen(0, '127.0.0.1', resolve));
  const { port } = s.address();
  await new Promise((resolve) => s.close(resolve));
  return port;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

export async function serveDir(dir) {
  const root = path.resolve(dir);
  // Held responses are kept so close() can destroy them: a request that is
  // never answered also never releases its socket, and the server would not
  // close with one still open.
  const held = new Set();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/hang/')) {
      held.add(res);
      return;
    }
    const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = path.resolve(root, rel);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403, { 'content-type': 'text/plain' }).end('forbidden');
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    origin: `http://127.0.0.1:${port}`,
    async close() {
      for (const res of held) res.destroy();
      held.clear();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
