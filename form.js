// The form page. index.html calls boot(); link.html imports encodeConfig().
//
// The page reads one study link, fetches one JSON export from the hitop
// package's site, renders the instrument (or the module the link names) 15
// items to a page, and saves one CSV to the participant's device. No answer
// is transmitted: the only network request after the page's own files is the
// export fetch. (The link's own contents, study, participant and module, are
// in the page's address, which the host serving the page sees.)

export const EXPORT_BASE = 'https://jmgirard.github.io/hitop/downloads/';
export const EXPORT_FORMAT = '1.0';
export const MODULE_FORMAT = '1.0';
export const PAGE_SIZE = 15;
export const INSTRUMENTS = { hitopsr: 'HiTOP-SR', hitopbr: 'HiTOP-BR' };

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
  return config;
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

// The items to render, in order: the export's items as exported, or the
// module's items in `itemOrder` when present and otherwise in `items` order.
export function planItems(exp, module) {
  if (!module) return exp.items.slice();
  const byNumber = new Map(exp.items.map((it) => [it.number, it]));
  const order = module.itemOrder ?? module.items;
  return order.map((n) => {
    const it = byNumber.get(n);
    if (!it) {
      throw new Error(
        `The study link's module names item ${n}, which the ${INSTRUMENTS[exp.stem] ?? exp.stem} export does not have.`,
      );
    }
    return it;
  });
}

// ---- The CSV --------------------------------------------------------------

function csvField(v) {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// One header row and one data row. `answers` maps item number to the chosen
// option value.
export function buildCsv({ study, participant, instrument, formBuild, submitted, items, answers }) {
  const header = ['study', 'participant', 'instrument', 'form_build', 'submitted', ...items.map((it) => it.name)];
  const row = [study, participant, instrument, formBuild, submitted, ...items.map((it) => answers.get(it.number))];
  return `${header.map(csvField).join(',')}\r\n${row.map(csvField).join(',')}\r\n`;
}

export function fileName({ study, participant, instrument, submitted }) {
  const safe = (s) => String(s).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
  const stamp = submitted.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `${safe(instrument)}_${safe(study)}_${safe(participant)}_${stamp}.csv`;
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
  let items;
  try {
    items = planItems(exp, config.module);
  } catch (e) {
    showError(root, e.message);
    return;
  }
  runForm(root, config, exp, items);
}

function runForm(root, config, exp, items) {
  const title = INSTRUMENTS[config.instrument];
  const options = exp.instructions.options;
  const answers = new Map();
  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  let participant = config.participant;
  let page = 0;
  let finished = false;

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
        text: `${items.length} items over ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}. Your answers are saved to this device as one file when you finish. No answer is sent anywhere.`,
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
      el('legend', {}, [
        el('span', { class: 'pos', text: `${position}.` }),
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
      if (last) finish();
      else {
        page += 1;
        showPage();
      }
    };
    const back = () => {
      page -= 1;
      showPage();
    };

    root.replaceChildren(
      heading(title),
      el('p', { class: 'progress', text: `Page ${page + 1} of ${pageCount}` }),
      ...nodes,
      alert,
      el('div', { class: 'nav' }, [
        ...(page > 0 ? [el('button', { type: 'button', class: 'secondary', text: 'Back', onclick: back })] : []),
        el('span', { class: 'spacer' }),
        el('button', { type: 'button', text: last ? 'Finish' : 'Next', onclick: advance }),
      ]),
    );
    window.scrollTo(0, 0);
    focusHeading(root);
  }

  function finish() {
    // ISO-8601 in UTC, to the second: 2026-09-20T21:15:31Z.
    const submitted = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const record = {
      study: config.study,
      participant,
      instrument: exp.stem,
      formBuild: exp.buildDate,
      submitted,
      items,
      answers,
    };
    const name = fileName(record);
    saveFile(name, buildCsv(record));
    finished = true;
    root.replaceChildren(
      heading('Thank you'),
      el('p', {
        class: 'done',
        text: 'Your responses were saved to this device as one file, in the folder your browser uses for downloads:',
      }),
      el('p', {}, [el('code', { class: 'filename', text: name })]),
      el('p', { text: 'Please send that file to the study team the way they asked. No answer was sent from this page.' }),
      versionLine(exp),
    );
    focusHeading(root);
  }

  start();
}
