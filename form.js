// The form page. index.html calls boot(); link.html imports encodeConfig().
//
// The page reads one study link, fetches one JSON export from the hitop
// package's site, renders the instrument (or the module the link names) 15
// items to a page, and at Finish either posts the responses as one JSON row
// to the store the link names or, with no store, saves them as one CSV to
// the participant's device. With no store, no answer is transmitted: the
// only network request after the page's own files is the export fetch. With
// a store, the requests after Finish are the POST to its address, any
// redirect a webhook answers with, and the OPTIONS preflight the browser
// sends before a supabase insert; the CSV is saved only when that send is
// not confirmed. (The link's own contents, study, participant, module and store,
// are in the page's address, which the host serving the page sees.)

export const EXPORT_BASE = 'https://jmgirard.github.io/hitop/downloads/';
export const EXPORT_FORMAT = '1.0';
export const MODULE_FORMAT = '1.0';
export const PAGE_SIZE = 15;
export const INSTRUMENTS = {
  hitopsr: 'HiTOP-SR',
  hitopbr: 'HiTOP-BR',
  pid5: 'PID-5',
  pid5sf: 'PID-5-SF',
  pid5bf: 'PID-5-BF',
};

// ---- The study link -------------------------------------------------------

function utf8ToBase64url(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToUtf8(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Builds the `c` parameter of a study link from a config object.
export function encodeConfig(config) {
  return utf8ToBase64url(JSON.stringify(config));
}

export function decodeConfig(param) {
  return JSON.parse(base64urlToUtf8(param));
}

function isNonEmptyString(x) {
  return typeof x === 'string' && x.trim() !== '';
}

// Reads the `?c=` parameter into a config, or throws with a message the
// participant can pass on to the study team.
export function parseLink(search) {
  const params = new URLSearchParams(search);
  const c = params.get('c');
  if (!c) {
    throw new Error('This page needs a study link. The link you opened carries no form.');
  }
  let config;
  try {
    config = decodeConfig(c);
  } catch {
    throw new Error('The study link could not be read. Ask the study team for a new link.');
  }
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('The study link could not be read: it does not hold a form.');
  }
  if (!Object.hasOwn(INSTRUMENTS, config.instrument)) {
    throw new Error(
      `The study link names an instrument this page does not know: ${JSON.stringify(config.instrument)}.`,
    );
  }
  if (!isNonEmptyString(config.study)) {
    throw new Error('The study link carries no study name.');
  }
  if (config.participant !== undefined && typeof config.participant !== 'string') {
    throw new Error('The study link carries a participant identifier that is not text.');
  }
  // A blank identifier is no identifier: the start screen asks for one.
  if (typeof config.participant === 'string' && config.participant.trim() === '') {
    delete config.participant;
  }
  if (config.module !== undefined) checkModule(config.module, config.instrument);
  if (config.store !== undefined) config.store = checkStore(config.store);
  // `shuffle` asks for a fresh random order on each load. Only the two
  // booleans are read; anything else, `null` and the string "true"
  // included, is refused by name rather than read as one of them.
  if (config.shuffle !== undefined && config.shuffle !== true && config.shuffle !== false) {
    throw new Error(
      `The study link's shuffle field must be true or false, and it is ${JSON.stringify(config.shuffle)}.`,
    );
  }
  return config;
}

// ---- The store ------------------------------------------------------------

// The store kinds this page can send to. A `webhook` is an HTTPS endpoint
// that accepts a POST of one JSON row and answers {"ok":true}. A `supabase`
// store is a table in a Supabase project, reached through the project's
// REST API with its publishable (or legacy anon) key.
export const STORE_KINDS = ['webhook', 'supabase'];

// A Postgres name the page puts in a URL path and the builder in
// double-quoted SQL: a lower-case letter or underscore, then up to 62
// lower-case letters, digits or underscores.
export const TABLE_NAME = /^[a-z_][a-z0-9_]{0,62}$/;

// A store as the link carries it: `{ kind, url }` for a webhook, or
// `{ kind, url, key, table }` for a supabase store. Returns a copy whose url
// is the parsed address's string form, or throws naming the fault. link.html
// runs the same check before it builds a link.
export function checkStore(store) {
  const bad = (why) => new Error(`The study link's store could not be used: ${why}`);
  if (store === null || typeof store !== 'object' || Array.isArray(store)) {
    throw bad('it is not an object.');
  }
  if (!STORE_KINDS.includes(store.kind)) {
    throw bad(
      `its kind is ${JSON.stringify(store.kind)}, and this page knows only ${STORE_KINDS.map((k) => JSON.stringify(k)).join(', ')}.`,
    );
  }
  let url = checkStoreUrl(store.url, bad);
  if (store.kind === 'webhook') return { kind: store.kind, url };
  // The project URL alone. The dashboard shows the REST URL ending in
  // /rest/v1, and a researcher pastes what they see, so that path is
  // dropped; anything else after the host (a table endpoint, a dashboard
  // page, a query or a fragment) would put the send on a wrong address, so
  // it is refused. The link then carries the origin, one spelling per
  // project.
  const u = new URL(url);
  const rest = u.pathname.replace(/\/rest\/v1\/*$/, '').replace(/\/+$/, '');
  if (rest !== '' || u.search !== '' || u.hash !== '') {
    throw bad(
      `its url must be the project URL alone, such as https://abcdefghijkl.supabase.co, and it is ${JSON.stringify(store.url)}.`,
    );
  }
  url = u.origin;
  if (store.key === undefined) throw bad('it names no key.');
  if (typeof store.key !== 'string') throw bad('its key is not text.');
  if (store.key.trim() === '') throw bad('its key is empty.');
  // The key goes into a request header: printable ASCII with no spaces, or
  // the browser refuses the request and the participant sees "the
  // connection failed".
  if (!/^[\x21-\x7e]+$/.test(store.key)) {
    throw bad('its key has a space or a character outside printable ASCII.');
  }
  // Only a key meant to be public may sit in a study link. A secret key
  // (sb_secret_…) and a legacy JWT for any role but anon (service_role)
  // would give every participant the whole database.
  if (store.key.startsWith('sb_secret_')) {
    throw bad('its key is a secret key (sb_secret_…), which must never be in a study link. Use the publishable key.');
  }
  if (isJwtShaped(store.key)) {
    const role = jwtRole(store.key);
    if (role !== 'anon') {
      throw bad(
        `its key is a JWT whose role is ${role === undefined ? 'unreadable' : JSON.stringify(role)}, not "anon", so it must never be in a study link. Use the anon or publishable key.`,
      );
    }
  }
  if (store.table === undefined) throw bad('it names no table.');
  if (typeof store.table !== 'string') throw bad('its table is not text.');
  if (!TABLE_NAME.test(store.table)) {
    throw bad(
      `its table must be a lower-case name of up to 63 letters, digits and underscores, not starting with a digit, and it is ${JSON.stringify(store.table)}.`,
    );
  }
  return { kind: store.kind, url, key: store.key, table: store.table };
}

// The address a store may name: `https:` to any host, or `http:` to this
// machine (host exactly 127.0.0.1 or localhost), which the tests' recording
// endpoint needs. Anything else is refused by name.
export function checkStoreUrl(url, bad = (why) => new Error(`The store address could not be used: ${why}`)) {
  if (url === undefined) throw bad('it names no url.');
  if (typeof url !== 'string') throw bad('its url is not text.');
  let u;
  try {
    u = new URL(url);
  } catch {
    throw bad(`its url is not a web address: ${JSON.stringify(url)}.`);
  }
  const loopback = u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
  if (u.protocol !== 'https:' && !loopback) {
    throw bad(
      `its url must start with https:// (http:// is accepted only for 127.0.0.1 or localhost), and it is ${JSON.stringify(url)}.`,
    );
  }
  // fetch() refuses a URL that carries a user name or password, so such an
  // address would make every send unconfirmed; refuse it here by name.
  if (u.username !== '' || u.password !== '') {
    throw bad(`its url must not carry a user name or password, and it is ${JSON.stringify(url)}.`);
  }
  return u.href;
}

// A module descriptor as write_module() writes it: `format` "1.0",
// `instrument`, `items` (instrument item numbers) and an optional `itemOrder`,
// a permutation of `items`. The other fields are for the reader and are not
// read here. link.html runs the same check on a pasted descriptor.
export function checkModule(m, instrument) {
  const bad = (why) => new Error(`The module descriptor could not be used: ${why}`);
  if (m === null || typeof m !== 'object' || Array.isArray(m)) throw bad('it is not an object.');
  // The instrument export has the same top-level shape (a `format`, an
  // `items` list) but names its instrument as `stem` and its items as
  // objects; a pasted export is named as such rather than as a bad descriptor.
  if (m.instrument === undefined && typeof m.stem === 'string' && Array.isArray(m.items)) {
    throw bad('it is the instrument export, not a module descriptor. Paste the JSON that write_module() wrote.');
  }
  if (m.format !== MODULE_FORMAT) {
    throw bad(`this page reads format "${MODULE_FORMAT}" and found ${m.format === undefined ? 'no format field' : `format ${JSON.stringify(m.format)}`}.`);
  }
  if (m.instrument !== instrument) {
    throw bad(
      `its instrument is ${JSON.stringify(m.instrument)} and the link's is ${JSON.stringify(instrument)}.`,
    );
  }
  if (!isIntegerArray(m.items) || m.items.length === 0) {
    throw bad('its items are not a list of item numbers.');
  }
  if (new Set(m.items).size !== m.items.length) throw bad('an item number repeats.');
  if (m.itemOrder !== undefined) {
    if (!isIntegerArray(m.itemOrder)) throw bad('its itemOrder is not a list of item numbers.');
    const a = [...m.items].sort((x, y) => x - y);
    const b = [...m.itemOrder].sort((x, y) => x - y);
    if (a.length !== b.length || a.some((v, i) => v !== b[i])) {
      throw bad('its itemOrder is not a rearrangement of its items.');
    }
  }
}

function isIntegerArray(x) {
  return Array.isArray(x) && x.every((v) => Number.isInteger(v));
}

// The SQL that makes the table a supabase store names, for `items` in the
// order the row keeps them (planItems().items): the five study fields as
// text, an `item_order` text column under `shuffle`, one integer column per
// item, row-level security on, the project's default grants to the API
// roles revoked, and the anon role allowed to insert and nothing else.
// Shown by link.html; pasted by the researcher into the project's SQL
// editor.
export function storeSql(table, items, shuffle = false) {
  const q = (name) => `"${String(name).replace(/"/g, '""')}"`;
  const t = q(table);
  const lead = ['study', 'participant', 'instrument', 'form_build', 'submitted', ...(shuffle ? ['item_order'] : [])];
  const columns = [
    ...lead.map((c) => `  ${q(c)} text`),
    ...items.map((it) => `  ${q(it.name)} integer`),
  ];
  return [
    `create table ${t} (`,
    columns.join(',\n'),
    ');',
    `alter table ${t} enable row level security;`,
    `revoke all on ${t} from anon, authenticated;`,
    `grant insert on ${t} to anon;`,
    `create policy "anon inserts" on ${t} for insert to anon with check (true);`,
    '',
  ].join('\n');
}

// ---- The export -----------------------------------------------------------

export function exportUrl(instrument) {
  return `${EXPORT_BASE}${instrument}.json`;
}

// Refuses an export whose `format` is not the string "1.0", naming what it
// found, and checks the shape the renderer reads and the fields the saved
// file carries. `instrument`, when given, must equal the export's `stem`.
export function checkExport(exp, instrument) {
  const found =
    exp === null || typeof exp !== 'object' || Array.isArray(exp)
      ? 'not an object'
      : !Object.hasOwn(exp, 'format')
        ? 'no format field'
        : typeof exp.format !== 'string'
          ? `a format that is not text (${JSON.stringify(exp.format)})`
          : exp.format !== EXPORT_FORMAT
            ? `format ${JSON.stringify(exp.format)}`
            : null;
  if (found !== null) {
    throw new Error(
      `This page reads format "${EXPORT_FORMAT}" of the instrument export and found ${found}.`,
    );
  }
  const shape = (why) => new Error(`The instrument export could not be used: ${why}`);
  if (!Array.isArray(exp.items) || exp.items.length === 0) throw shape('it has no items.');
  for (const it of exp.items) {
    if (!it || !Number.isInteger(it.number) || !isNonEmptyString(it.name) || typeof it.text !== 'string') {
      throw shape('an item lacks a number, a name or its text.');
    }
  }
  const opts = exp.instructions && exp.instructions.options;
  if (!Array.isArray(opts) || opts.length === 0) throw shape('it has no response options.');
  for (const o of opts) {
    if (!o || !Number.isInteger(o.value) || typeof o.label !== 'string') {
      throw shape('a response option lacks a value or a label.');
    }
  }
  if (typeof exp.instructions.start !== 'string') throw shape('it has no instructions.');
  // These four reach the screen, the file or its name; none may be missing.
  for (const field of ['stem', 'buildDate', 'packageVersion', 'package']) {
    if (!isNonEmptyString(exp[field])) throw shape(`its ${field} field is missing or not text.`);
  }
  if (instrument !== undefined && exp.stem !== instrument) {
    throw shape(`its stem is ${JSON.stringify(exp.stem)} and the link asked for ${JSON.stringify(instrument)}.`);
  }
  return exp;
}

export async function fetchExport(instrument) {
  const url = exportUrl(instrument);
  let res;
  try {
    res = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new Error(`The instrument could not be fetched from ${url}. Check the connection and reload.`);
  }
  if (!res.ok) {
    throw new Error(`The instrument could not be fetched from ${url} (HTTP ${res.status}).`);
  }
  let exp;
  try {
    exp = await res.json();
  } catch {
    throw new Error(`The file at ${url} is not JSON.`);
  }
  return checkExport(exp, instrument);
}

// The items the page will use, as two lists of the same item objects:
// `items`, the order the row and the file keep their item columns in, and
// `shown`, the order the page renders. Without `shuffle` the two are one
// order: the export's items as exported, or the module's items in
// `itemOrder` when present and otherwise in `items` order. With `shuffle`
// the columns keep the export's order (a module's `items` order, its
// `itemOrder` not followed) and the shown order is a fresh random
// rearrangement of them, drawn here on each load.
export function planItems(exp, module, shuffle = false) {
  const byNumber = new Map(exp.items.map((it) => [it.number, it]));
  const resolve = (order) =>
    order.map((n) => {
      const it = byNumber.get(n);
      if (!it) {
        throw new Error(
          `The study link's module names item ${n}, which the ${INSTRUMENTS[exp.stem] ?? exp.stem} export does not have.`,
        );
      }
      return it;
    });
  let items;
  if (!module) items = exp.items.slice();
  else if (shuffle) items = resolve(module.items);
  else items = resolve(module.itemOrder ?? module.items);
  return { items, shown: shuffle ? shuffleItems(items) : items.slice() };
}

// A random rearrangement of `items`: a Fisher–Yates shuffle whose draws come
// from crypto.getRandomValues. Each draw takes a 32-bit word and rejects the
// words above the largest multiple of the range, so every position is
// equally likely. The input is not changed.
export function shuffleItems(items) {
  const out = items.slice();
  const word = new Uint32Array(1);
  const draw = (range) => {
    const limit = Math.floor(2 ** 32 / range) * range;
    for (;;) {
      crypto.getRandomValues(word);
      if (word[0] < limit) return word[0] % range;
    }
  };
  for (let j = out.length - 1; j > 0; j--) {
    const i = draw(j + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---- The CSV --------------------------------------------------------------

function csvField(v) {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// One header row and one data row. `answers` maps item number to the chosen
// option value. `items` is the column order; `itemOrder`, when given, is the
// item numbers in the order shown, written as a sixth lead column after
// `submitted`, joined by single spaces. Without it the file has five lead
// columns.
export function buildCsv({ study, participant, instrument, formBuild, submitted, itemOrder, items, answers }) {
  const header = ['study', 'participant', 'instrument', 'form_build', 'submitted'];
  const row = [study, participant, instrument, formBuild, submitted];
  if (itemOrder !== undefined) {
    header.push('item_order');
    row.push(itemOrder.join(' '));
  }
  header.push(...items.map((it) => it.name));
  row.push(...items.map((it) => answers.get(it.number)));
  return `${header.map(csvField).join(',')}\r\n${row.map(csvField).join(',')}\r\n`;
}

export function fileName({ study, participant, instrument, submitted }) {
  const safe = (s) => String(s).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
  const stamp = submitted.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `${safe(instrument)}_${safe(study)}_${safe(participant)}_${stamp}.csv`;
}

// ---- The send -------------------------------------------------------------

export const SEND_TIMEOUT_MS = 30_000;

// One JSON object per finished form: the five study fields, `item_order`
// when the record carries one, then one key per item in `items` order, each
// value the chosen option's integer value. The same record buildCsv()
// writes, key for column.
export function buildRow({ study, participant, instrument, formBuild, submitted, itemOrder, items, answers }) {
  const row = { study, participant, instrument, form_build: formBuild, submitted };
  if (itemOrder !== undefined) row.item_order = itemOrder.join(' ');
  for (const it of items) row[it.name] = answers.get(it.number);
  return row;
}

// A key with the three dot-separated segments of a JWT: a legacy anon key.
// Supabase reads such a key from the Authorization header too, and refuses
// a publishable key there, since it is not a JWT.
export function isJwtShaped(key) {
  return /^[^.\s]+\.[^.\s]+\.[^.\s]+$/.test(key);
}

// The `role` claim of a JWT-shaped key, read from its middle segment
// without checking the signature (the key is public; only its role is
// asked). Undefined when the segment is not JSON.
export function jwtRole(key) {
  try {
    return JSON.parse(base64urlToUtf8(key.split('.')[1])).role;
  } catch {
    return undefined;
  }
}

// The request a store takes: its address and the page's own headers.
export function sendRequest(store) {
  if (store.kind === 'supabase') {
    const headers = { apikey: store.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
    if (isJwtShaped(store.key)) headers.Authorization = `Bearer ${store.key}`;
    return { url: `${store.url.replace(/\/+$/, '')}/rest/v1/${store.table}`, headers };
  }
  return { url: store.url, headers: { 'Content-Type': 'text/plain;charset=utf-8' } };
}

// Posts one row to the store and says whether the store confirmed it.
//
// To a webhook the request is a CORS simple request (POST, text/plain, no
// other header of the page's own), so an endpoint that answers no preflight,
// an Apps Script web app among them, still receives it; redirects are
// followed, as such an app answers through one. A send is confirmed only by
// a 2xx status whose body is JSON with `ok` equal to true: an Apps Script
// web app answers 200 with an HTML page when its doPost throws, and a 2xx
// alone would count that as stored.
//
// To a supabase store the request is an insert through the project's REST
// API, with the key in the headers, so the browser sends a preflight first,
// which the project answers. The insert asks for no row back, and a 2xx
// status alone confirms it: the API answers 201 with an empty body. A
// redirect is not followed (the POST would become a GET, and the 200 that
// followed would confirm a send that stored nothing); it is unconfirmed by
// name.
//
// Anything else, a lost connection and the time limit included, is
// unconfirmed, and the caller falls back to the device.
export async function sendResponses(store, row, { timeoutMs = SEND_TIMEOUT_MS, fetchFn = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const { url, headers } = sendRequest(store);
  try {
    let res;
    try {
      res = await fetchFn(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(row),
        redirect: store.kind === 'supabase' ? 'manual' : 'follow',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      });
    } catch (e) {
      return {
        confirmed: false,
        why: e && e.name === 'AbortError' ? `no answer within ${Math.round(timeoutMs / 1000)} seconds` : 'the connection failed',
      };
    }
    if (res.type === 'opaqueredirect') return { confirmed: false, why: 'the endpoint redirected the send' };
    if (!res.ok) return { confirmed: false, why: `the endpoint answered HTTP ${res.status}` };
    if (store.kind === 'supabase') return { confirmed: true };
    let ack;
    try {
      ack = await res.json();
    } catch {
      if (controller.signal.aborted) {
        return { confirmed: false, why: `no answer within ${Math.round(timeoutMs / 1000)} seconds` };
      }
      return { confirmed: false, why: 'the endpoint did not answer with JSON' };
    }
    if (ack === null || typeof ack !== 'object' || ack.ok !== true) {
      return { confirmed: false, why: 'the endpoint did not confirm the send' };
    }
    return { confirmed: true };
  } finally {
    clearTimeout(timer);
  }
}

function saveFile(name, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ---- Rendering ------------------------------------------------------------

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

function showError(root, message) {
  root.replaceChildren(
    el('h1', { text: 'This form cannot be shown' }),
    el('p', { role: 'alert', text: message }),
  );
}

// Every screen is a full replacement of `root`, which drops keyboard focus
// to the document. The heading takes it, so a keyboard or screen-reader
// participant starts each screen at its top rather than at the page bottom.
function heading(text) {
  return el('h1', { text, tabindex: '-1' });
}

function focusHeading(root) {
  const h = root.querySelector('h1');
  if (h) h.focus({ preventScroll: true });
}

function versionLine(exp) {
  return el('p', {
    class: 'version',
    text: `Form build ${exp.buildDate} · ${exp.package} ${exp.packageVersion}`,
  });
}

export async function boot(root, search) {
  let config;
  try {
    config = parseLink(search);
  } catch (e) {
    showError(root, e.message);
    return;
  }
  let exp;
  try {
    exp = await fetchExport(config.instrument);
  } catch (e) {
    showError(root, e.message);
    return;
  }
  let plan;
  try {
    plan = planItems(exp, config.module, config.shuffle === true);
  } catch (e) {
    showError(root, e.message);
    return;
  }
  runForm(root, config, exp, plan);
}

// `plan.shown` is the order the pages render and the positions count in;
// `plan.items` the order the row and the file keep.
function runForm(root, config, exp, plan) {
  const items = plan.shown;
  const title = INSTRUMENTS[config.instrument];
  const options = exp.instructions.options;
  const answers = new Map();
  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  let participant = config.participant;
  let page = 0;
  let finished = false;
  let sending = false;
  const store = config.store;
  const storeHost = store ? new URL(store.url).host : null;

  // A reload or a back gesture would lose every answer, since they live only
  // in memory until Finish writes the file. The browser asks first.
  window.addEventListener('beforeunload', (ev) => {
    if (finished || answers.size === 0) return;
    ev.preventDefault();
    ev.returnValue = '';
  });

  function start() {
    const alert = el('p', { role: 'alert' });
    const askParticipant = participant === undefined;
    const input = askParticipant
      ? el('input', { type: 'text', name: 'participant', autocomplete: 'off', required: '' })
      : null;
    const begin = () => {
      if (askParticipant) {
        const v = input.value.trim();
        if (v === '') {
          alert.textContent = 'Please enter your participant identifier before starting.';
          input.focus();
          return;
        }
        participant = v;
      }
      page = 0;
      showPage();
    };
    root.replaceChildren(
      heading(title),
      versionLine(exp),
      el('div', { class: 'instructions' }, [el('p', { class: 'start', text: exp.instructions.start })]),
      el('p', {
        class: 'muted',
        text: `${items.length} items over ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}. ${
          store
            ? `When you finish, your answers are sent to the study team at ${storeHost}. If the send cannot be confirmed, they are saved as one file in this browser's downloads folder instead.`
            : 'Your answers are saved to this device as one file when you finish. No answer is sent anywhere.'
        }`,
      }),
      ...(askParticipant
        ? [el('label', { class: 'field' }, ['Participant identifier', input])]
        : []),
      alert,
      el('div', { class: 'nav' }, [el('button', { type: 'button', text: 'Begin', onclick: begin })]),
    );
    if (input) input.focus();
    else focusHeading(root);
  }

  function itemNode(it, position) {
    const fs = el('fieldset', {
      class: 'item',
      'data-number': String(it.number),
      'data-position': String(position),
    });
    fs.append(
      // The space is a text node, so the fieldset's accessible name reads
      // "1. I felt…" rather than the two spans run together.
      el('legend', {}, [
        el('span', { class: 'pos', text: `${position}.` }),
        ' ',
        el('span', { class: 'text', text: it.text }),
      ]),
    );
    const group = el('div', { class: 'options' });
    for (const o of options) {
      const input = el('input', {
        type: 'radio',
        name: `item-${it.number}`,
        value: String(o.value),
        onchange: () => {
          answers.set(it.number, o.value);
          fs.classList.remove('unanswered');
        },
      });
      if (answers.get(it.number) === o.value) input.checked = true;
      group.append(el('label', {}, [input, el('span', { class: 'label', text: o.label })]));
    }
    fs.append(group);
    return fs;
  }

  function showPage() {
    const first = page * PAGE_SIZE;
    const slice = items.slice(first, first + PAGE_SIZE);
    const alert = el('p', { role: 'alert' });
    const nodes = slice.map((it, i) => itemNode(it, first + i + 1));
    const last = page === pageCount - 1;

    const advance = () => {
      if (sending) return;
      const missing = slice.findIndex((it) => !answers.has(it.number));
      if (missing >= 0) {
        nodes.forEach((n, i) => n.classList.toggle('unanswered', !answers.has(slice[i].number)));
        // Both numbers: the one printed beside the item, and its place on
        // this page.
        alert.textContent = `Please answer item ${first + missing + 1} (item ${missing + 1} on this page) before continuing.`;
        nodes[missing].scrollIntoView({ block: 'center' });
        nodes[missing].querySelector('input[type=radio]').focus({ preventScroll: true });
        return;
      }
      if (last) finish(nav);
      else {
        page += 1;
        showPage();
      }
    };
    const back = () => {
      if (sending) return;
      page -= 1;
      showPage();
    };
    const nav = el('div', { class: 'nav' }, [
      ...(page > 0 ? [el('button', { type: 'button', class: 'secondary', text: 'Back', onclick: back })] : []),
      el('span', { class: 'spacer' }),
      el('button', { type: 'button', text: last ? 'Finish' : 'Next', onclick: advance }),
    ]);

    root.replaceChildren(
      heading(title),
      el('p', { class: 'progress', text: `Page ${page + 1} of ${pageCount}` }),
      ...nodes,
      alert,
      nav,
    );
    window.scrollTo(0, 0);
    focusHeading(root);
  }

  // Finish is pressed. With no store: the file, then the saved screen. With
  // a store: the nav buttons are disabled from this first press until an
  // outcome screen shows, so a second press cannot send a second row; a
  // confirmed send shows the sent screen and saves nothing; anything else
  // saves the file and shows the unconfirmed screen naming it.
  async function finish(nav) {
    if (sending) return;
    // ISO-8601 in UTC, to the second: 2026-09-20T21:15:31Z.
    const submitted = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const record = {
      study: config.study,
      participant,
      instrument: exp.stem,
      formBuild: exp.buildDate,
      submitted,
      // The columns keep `plan.items`; under shuffle the shown order goes
      // into `item_order`, and without it the file is as it always was.
      items: plan.items,
      itemOrder: config.shuffle === true ? plan.shown.map((it) => it.number) : undefined,
      // A copy: the radios stay live during a send, and the file saved on an
      // unconfirmed send must hold the answers the row was posted with.
      answers: new Map(answers),
    };
    if (!store) {
      finished = true;
      showSaved(
        saveCsv(record),
        'Your responses were saved to this device as one file, in the folder your browser uses for downloads:',
        'Please send that file to the study team the way they asked. No answer was sent from this page.',
      );
      return;
    }
    sending = true;
    const finishButton = nav.querySelector('button:last-of-type');
    for (const b of nav.querySelectorAll('button')) b.disabled = true;
    finishButton.textContent = 'Sending…';
    const outcome = await sendResponses(store, buildRow(record));
    sending = false;
    finished = true;
    if (outcome.confirmed) {
      root.replaceChildren(
        heading('Thank you'),
        el('p', { class: 'done', text: 'Your responses were sent to the study team.' }),
        el('p', { text: 'You can close this page.' }),
        versionLine(exp),
      );
      focusHeading(root);
      return;
    }
    showSaved(
      saveCsv(record),
      `The send to the study team could not be confirmed (${outcome.why}). Your responses were saved instead as one file, in the folder your browser uses for downloads:`,
      'Please send that file to the study team the way they asked.',
    );
  }

  function saveCsv(record) {
    const name = fileName(record);
    saveFile(name, buildCsv(record));
    return name;
  }

  function showSaved(name, lead, trail) {
    root.replaceChildren(
      heading('Thank you'),
      el('p', { class: 'done', text: lead }),
      el('p', {}, [el('code', { class: 'filename', text: name })]),
      el('p', { text: trail }),
      versionLine(exp),
    );
    focusHeading(root);
  }

  start();
}
