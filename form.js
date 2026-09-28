// The form page. index.html calls boot(); link.html imports encodeLink(),
// the link readers, the checks (checkParticipantParam(), consentTextFault()
// and checkQuestions() among them), readQuestionsCsv(), writeQuestionsCsv(),
// saveFile(), fetchExport(), planItems(), storeSql() and PROLIFIC_PARAMS.
//
// The page reads one study link, fetches one JSON export from the hitop
// package's site, renders the instrument (or the module the link names) 15
// items to a page, and at Finish either posts the responses as one JSON row
// to the store the link names or, with no store, saves them as one CSV to
// the participant's device. With no store, no answer is transmitted: the
// only network request after the page's own files is the export fetch,
// besides the move to a completion address when the link names one. With
// a store, the requests after Finish are the POST to its address, any
// redirect a webhook answers with, and the OPTIONS preflight the browser
// sends before a supabase insert; the CSV is saved only when that send is
// not confirmed. (The link's own contents, study, participant, module, store
// and consent text, are in the page's address, which the host serving the
// page sees.)
//
// A link's `consent` field holds the researcher's consent text, which the
// page shows on a screen of its own before the start screen, as plain text.
// "I agree" goes on to the start screen. "I do not agree" shows a closing
// screen and sends and saves nothing; `completeDeclined`, allowed only
// beside `consent`, is an https:// address that screen then goes to, such as
// a recruiting site's code for a participant who did not consent.
//
// A link's `questions` field holds the researcher's own questions, in a
// `before` list, an `after` list or both. The page asks the before list on
// a screen of its own ahead of the start screen, after any consent screen,
// and the after list on a screen of its own after the last item page. Each
// answer is a `q_<name>` column after the item columns, in the row, the file
// and the Supabase table.
//
// Three link fields fit a Prolific study. `prolific: true` takes the
// participant identifier from the PROLIFIC_PID parameter of the page's
// address and writes the STUDY_ID and SESSION_ID parameters into the row and
// the file. `complete` is an https:// address the page sends the participant
// to after a confirmed send, once the sent screen is drawn, and links to
// after a saved file. `completeSaved`, allowed only beside `complete`, is a
// second such address the saved-file screens link to in its place, for a
// study that gives a saved file its own completion code. The page itself
// makes one further request with `complete`, that navigation, and only
// after the store confirmed; the saved screens' link is followed by the
// participant or not at all.
//
// For another recruiting site, `participantParam` names the address
// parameter the site fills with the participant identifier (`id` for a SONA
// study URL ending in `id=%SURVEY_CODE%`, `participantId` for CloudResearch
// Connect), and no column is added. A `{participant}` in the query or
// fragment of `complete` or `completeSaved` is replaced by the identifier,
// whatever its source, for a completion address that carries each
// participant's code, as SONA's does.

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

function bytesToBase64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function utf8ToBase64url(s) {
  return bytesToBase64url(new TextEncoder().encode(s));
}

function base64urlToUtf8(s) {
  return new TextDecoder().decode(base64urlToBytes(s));
}

// Builds the `c` parameter of a study link from a config object.
export function encodeConfig(config) {
  return utf8ToBase64url(JSON.stringify(config));
}

export function decodeConfig(param) {
  return JSON.parse(base64urlToUtf8(param));
}

// A link that carries consent text or questions travels as `z` rather than
// `c`: the config's UTF-8 JSON compressed with deflate-raw, then written as
// base64url with no padding. Consent text and questions make a `c` link
// long, and the compressed form keeps it shorter. The page reads either
// parameter.
//
// The query of a study link, without its `?`: `z=…` for a config that carries
// `consent` or `questions`, and `c=…` as before for any other. link.html
// builds its links with it. It refuses a `z` config whose JSON is over
// MAX_LINK_BYTES, which the page would refuse to read.
export async function encodeLink(config) {
  const json = JSON.stringify(config);
  if (config.consent === undefined && config.questions === undefined) return `c=${utf8ToBase64url(json)}`;
  const bytes = new TextEncoder().encode(json).length;
  if (bytes > MAX_LINK_BYTES) {
    throw new Error(`This link's setup is ${bytes.toLocaleString('en-US')} bytes, more than the 100,000 bytes the form page reads. Shorten the consent text or the questions.`);
  }
  if (typeof CompressionStream !== 'function') {
    const parts = [config.consent === undefined ? null : 'consent text', config.questions === undefined ? null : 'questions'];
    throw new Error(`This browser cannot make a link with ${parts.filter((p) => p !== null).join(' and ')}, because it cannot compress the link. Use a current version of Chrome, Edge, Firefox or Safari.`);
  }
  const stream = new Blob([new TextEncoder().encode(json)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return `z=${bytesToBase64url(new Uint8Array(await new Response(stream).arrayBuffer()))}`;
}

// The most bytes a `z` parameter may decompress to. The page stops reading
// there, so a small link cannot make it inflate without end.
export const MAX_LINK_BYTES = 100_000;

// Whether this browser can read a `z` parameter.
export function canInflate() {
  return typeof DecompressionStream === 'function';
}

// A `z` parameter's config, or a throw through `bad` naming the fault: the
// value is not base64url, does not decompress (a truncated stream and bytes
// after its end included), decompresses to more than MAX_LINK_BYTES, or to
// bytes that are not UTF-8 or not JSON. The caller checks canInflate()
// first, and whether the result is an object. link.html reads a `z` it
// opens through the same function, with its own `bad`.
export async function inflateConfig(z, bad) {
  if (!/^[A-Za-z0-9_-]+$/.test(z) || z.length % 4 === 1) throw bad('is not base64url text');
  const reader = new Blob([base64urlToBytes(z)]).stream()
    .pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    let step;
    try {
      step = await reader.read();
    } catch {
      throw bad('does not decompress');
    }
    if (step.done) break;
    total += step.value.length;
    if (total > MAX_LINK_BYTES) {
      reader.cancel().catch(() => {});
      throw bad('decompresses to more than 100,000 bytes');
    }
    chunks.push(step.value);
  }
  const bytes = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.length;
  }
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw bad('is not UTF-8 text');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw bad('is not JSON');
  }
}

// Reads the link's `c` or `z` parameter into the object it encodes, or
// throws with a message the participant can pass on to the study team. A
// link with both is refused, since the two could hold different forms.
export async function decodeLink(search) {
  const params = new URLSearchParams(search);
  if (params.has('c') && params.has('z')) {
    throw new Error('The study link carries both a c and a z parameter, and a study link carries one. Ask the study team for a new link.');
  }
  const c = params.get('c');
  const z = params.get('z');
  let config;
  if (z) {
    if (!canInflate()) {
      throw new Error("This browser cannot read the study link, because it cannot decompress the link's z parameter. Open the link in a current version of Chrome, Edge, Firefox or Safari.");
    }
    config = await inflateConfig(z, (why) => new Error(`The study link could not be read: its z parameter ${why}. Ask the study team for a new link.`));
  } else if (c) {
    try {
      config = decodeConfig(c);
    } catch {
      throw new Error('The study link could not be read. Ask the study team for a new link.');
    }
  } else {
    throw new Error('This page needs a study link. The link you opened carries no form.');
  }
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('The study link could not be read: it does not hold a form.');
  }
  return config;
}

function isNonEmptyString(x) {
  return typeof x === 'string' && x.trim() !== '';
}

// The limits on a link's consent text and on its decline text, in
// characters as a JavaScript string counts them (UTF-16 code units).
export const CONSENT_TEXT_MAX = 20_000;
export const CONSENT_DECLINED_MAX = 2_000;

// A lone surrogate: half of a character written as two UTF-16 code units.
// Under the u flag a whole pair is one code point, which this does not match.
const LONE_SURROGATE = /[\uD800-\uDFFF]/u;

// The fault in a consent or decline text, as the end of a sentence, or null
// when there is none: text that is blank after trimming white space, longer
// than `max`, or holding a lone surrogate. link.html states the same faults
// for its two boxes.
export function consentTextFault(s, max) {
  if (s.trim() === '') return 'is empty or holds only white space';
  if (s.length > max) {
    return `has ${s.length.toLocaleString('en-US')} characters, more than the ${max.toLocaleString('en-US')} it may hold`;
  }
  if (LONE_SURROGATE.test(s)) return 'holds half of a character (a lone surrogate), which cannot be written';
  return null;
}

// A link's `consent` field: `{ text, declined }`, `declined` optional. The
// text shows on a screen of its own before the start screen, and `declined`
// on the screen after "I do not agree". Returns the field or throws naming
// the fault.
export function checkConsent(consent) {
  const bad = (why) => new Error(`The study link's consent field could not be used: ${why}`);
  if (consent === null || typeof consent !== 'object' || Array.isArray(consent)) throw bad('it is not an object.');
  const extra = Object.keys(consent).find((k) => k !== 'text' && k !== 'declined');
  if (extra !== undefined) {
    throw bad(`it has a field ${JSON.stringify(extra)}, and it takes only text and declined.`);
  }
  if (consent.text === undefined) throw bad('it has no text.');
  if (typeof consent.text !== 'string') throw bad('its text is not a string.');
  const textFault = consentTextFault(consent.text, CONSENT_TEXT_MAX);
  if (textFault !== null) throw bad(`its text ${textFault}.`);
  if (consent.declined !== undefined) {
    if (typeof consent.declined !== 'string') throw bad('its declined text is not a string.');
    const declinedFault = consentTextFault(consent.declined, CONSENT_DECLINED_MAX);
    if (declinedFault !== null) throw bad(`its declined text ${declinedFault}.`);
  }
  return consent;
}

// A consent or decline text as paragraphs, each an array of its lines. CR
// LF and a lone CR become LF; a run of blank lines (empty, or white space
// alone) ends a paragraph, and a single line break stays inside one.
export function textParagraphs(text) {
  const paragraphs = [];
  let lines = [];
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.trim() === '') {
      if (lines.length) paragraphs.push(lines);
      lines = [];
    } else {
      lines.push(line);
    }
  }
  if (lines.length) paragraphs.push(lines);
  return paragraphs;
}

// A link's `questions` field: `{ before, after }`, either list optional but
// not both, each a list of the researcher's own questions. The `before`
// questions show on a screen of their own before the start screen, the
// `after` questions on one after the last item page, and each answer is a
// `q_<name>` column after the item columns. The limits below count
// characters as a JavaScript string counts them (UTF-16 code units).
export const QUESTION_LISTS = ['before', 'after'];
export const QUESTION_TYPES = ['text', 'number', 'choice', 'multi'];
export const QUESTION_KEYS = ['name', 'text', 'type', 'required', 'options', 'min', 'max'];
export const QUESTIONS_MAX = 50;
export const QUESTION_TEXT_MAX = 1_000;
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 20;
export const OPTION_LABEL_MAX = 200;
// The largest `min` or `max`, the limit of a 32-bit signed whole number, and
// its negative for the smallest.
export const QUESTION_INT_MAX = 2_147_483_647;
export const QUESTION_NAME = /^[a-z][a-z0-9_]{0,29}$/;

// Unicode's mandatory line breaks: LF, vertical tab, form feed, CR, U+0085
// (next line), and the line and paragraph separators U+2028 and U+2029,
// built from their code points so the source holds no literal separator.
const LINE_BREAK = new RegExp(`[\\n\\v\\f\\r${String.fromCharCode(0x85, 0x2028, 0x2029)}]`);

// The fault in a question text or an option label, as the end of a
// sentence, or null when there is none.
function questionStringFault(s, max, what) {
  if (s.trim() === '') return 'is empty or holds only white space';
  if (s.length > max) {
    return `has ${s.length.toLocaleString('en-US')} characters, more than the ${max.toLocaleString('en-US')} it may hold`;
  }
  if (LINE_BREAK.test(s)) return `holds a line break, and ${what} is one line`;
  if (LONE_SURROGATE.test(s)) return 'holds half of a character (a lone surrogate), which cannot be written';
  return null;
}

// Returns a copy of the field, each question text and option label trimmed
// and the questions' other keys as given, or throws through `bad` naming the
// fault. A fault in one question names it by `where(list, index)`, the index
// counted from 0: "question 2 of the before list" on the form page. link.html
// runs the same check before it builds a link, with its own `bad` and a
// `where` that names the question as its editor numbers it. A fault in one
// field of a question is named by `field(at, key)`, `at` being what `where`
// returned; the default names the question alone, and readQuestionsCsv()
// adds the file's column.
export function checkQuestions(
  questions,
  {
    bad = (why) => new Error(`The study link's questions field could not be used: ${why}`),
    where = (list, i) => `question ${i + 1} of the ${list} list`,
    field = (at) => at,
  } = {},
) {
  if (questions === null || typeof questions !== 'object' || Array.isArray(questions)) throw bad('it is not an object.');
  const extra = Object.keys(questions).find((k) => !QUESTION_LISTS.includes(k));
  if (extra !== undefined) {
    throw bad(`it has a field ${JSON.stringify(extra)}, and it takes only before and after.`);
  }
  const lists = QUESTION_LISTS.filter((list) => questions[list] !== undefined);
  if (lists.length === 0) throw bad('it has neither a before nor an after list.');
  for (const list of lists) {
    if (!Array.isArray(questions[list])) throw bad(`its ${list} list is not a list.`);
    if (questions[list].length === 0) throw bad(`its ${list} list is empty, and a list holds 1 or more questions.`);
  }
  const total = lists.reduce((n, list) => n + questions[list].length, 0);
  if (total > QUESTIONS_MAX) {
    throw bad(`it has ${total} questions, more than the ${QUESTIONS_MAX} it may hold.`);
  }
  const seen = new Map();
  const out = {};
  for (const list of lists) {
    out[list] = questions[list].map((q, i) => {
      const at = where(list, i);
      const fault = (why, key) => bad(`${key === undefined ? at : field(at, key)}: ${why}`);
      if (q === null || typeof q !== 'object' || Array.isArray(q)) throw fault('it is not an object.');
      const key = Object.keys(q).find((k) => !QUESTION_KEYS.includes(k));
      if (key !== undefined) {
        throw fault(`it has a field ${JSON.stringify(key)}, and a question takes only name, text, type, required, options, min and max.`);
      }
      if (q.name === undefined) throw fault('it has no name.', 'name');
      if (typeof q.name !== 'string' || !QUESTION_NAME.test(q.name)) {
        throw fault(`its name is ${JSON.stringify(q.name)}, and a name starts with a lower-case letter and holds only lower-case letters, digits and "_", up to 30 characters.`, 'name');
      }
      if (seen.has(q.name)) throw fault(`its name ${JSON.stringify(q.name)} is also the name of ${seen.get(q.name)}.`, 'name');
      seen.set(q.name, at);
      if (q.text === undefined) throw fault('it has no text.', 'text');
      if (typeof q.text !== 'string') throw fault('its text is not a string.', 'text');
      const textFault = questionStringFault(q.text, QUESTION_TEXT_MAX, 'a question text');
      if (textFault !== null) throw fault(`its text ${textFault}.`, 'text');
      if (q.type === undefined) throw fault('it has no type.', 'type');
      if (!QUESTION_TYPES.includes(q.type)) {
        throw fault(`its type is ${JSON.stringify(q.type)}, and a type is "text", "number", "choice" or "multi".`, 'type');
      }
      if (q.required !== undefined && q.required !== true && q.required !== false) {
        throw fault(`its required field must be true or false, and it is ${JSON.stringify(q.required)}.`, 'required');
      }
      const copy = { ...q, text: q.text.trim() };
      if (q.type === 'choice' || q.type === 'multi') {
        if (q.options === undefined) throw fault(`it is a ${q.type} question and has no options.`, 'options');
        if (!Array.isArray(q.options)) throw fault('its options are not a list.', 'options');
        if (q.options.length < OPTIONS_MIN || q.options.length > OPTIONS_MAX) {
          throw fault(`it has ${q.options.length} ${q.options.length === 1 ? 'option' : 'options'}, and a question holds ${OPTIONS_MIN} to ${OPTIONS_MAX}.`, 'options');
        }
        const labels = new Map();
        copy.options = q.options.map((o, j) => {
          if (typeof o !== 'string') throw fault(`its option ${j + 1} is not a string.`, 'options');
          const optionFault = questionStringFault(o, OPTION_LABEL_MAX, 'an option label');
          if (optionFault !== null) throw fault(`its option ${j + 1} ${optionFault}.`, 'options');
          if (o.includes('|')) throw fault(`its option ${j + 1} holds "|", which an option label may not hold.`, 'options');
          const label = o.trim();
          if (labels.has(label)) {
            throw fault(`its options ${labels.get(label) + 1} and ${j + 1} are the same after trimming: ${JSON.stringify(label)}.`, 'options');
          }
          labels.set(label, j);
          return label;
        });
        for (const bound of ['min', 'max']) {
          if (q[bound] !== undefined) throw fault(`it is a ${q.type} question and cannot have a ${bound}.`, bound);
        }
      } else {
        if (q.options !== undefined) throw fault(`it is a ${q.type} question and cannot have options.`, 'options');
        if (q.type === 'text') {
          for (const bound of ['min', 'max']) {
            if (q[bound] !== undefined) throw fault(`it is a text question and cannot have a ${bound}.`, bound);
          }
        }
        for (const bound of ['min', 'max']) {
          const v = q[bound];
          if (v !== undefined && !(Number.isInteger(v) && Math.abs(v) <= QUESTION_INT_MAX)) {
            throw fault(`its ${bound} is not a whole number from -2,147,483,647 to 2,147,483,647, and it is ${JSON.stringify(v)}.`, bound);
          }
        }
        if (q.min !== undefined && q.max !== undefined && q.min > q.max) {
          throw fault(`its min ${q.min} is above its max ${q.max}.`, 'min');
        }
      }
      return copy;
    });
  }
  return out;
}

// The link builder's questions file: a CSV file as a spreadsheet saves it,
// in UTF-8. The first row names the columns, in lower case and in any order:
// list, name, text and type are required, and options, required, min and
// max are optional. Each further row is one question. `list` is before or
// after, `options` holds the option labels joined by "|", `required` is
// yes, no or blank (blank is no), and `min` and `max` are blank or whole
// numbers.
export const QUESTION_COLUMNS = ['list', 'name', 'text', 'type', 'options', 'required', 'min', 'max'];
const QUESTION_COLUMNS_REQUIRED = ['list', 'name', 'text', 'type'];

// Returns the questions a questions file holds, as checkQuestions() returns
// them, from its bytes (an ArrayBuffer or a typed array), or throws naming
// the fault. A fault in one field names its row and its column, or its
// field number in the header row or past the last column. Rows count the
// file's records, the header being row 1, so a quoted line break does not
// start a row. The file is read as RFC 4180 describes CSV, with LF also
// ending a line. Every field's value is trimmed once its quotes are read,
// and a row whose fields are all blank is skipped. Each list keeps the
// order of the file.
export function readQuestionsCsv(bytes) {
  const bad = (why) => new Error(`The file could not be used: ${why}`);
  const notUtf8 = () => bad('it is not UTF-8 text. In your spreadsheet, save it as "CSV UTF-8" and load that file.');
  let text;
  try {
    // The decoder drops a byte-order mark.
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw notUtf8();
  }
  // UTF-16 text with no byte-order mark can also be valid UTF-8, with a NUL
  // beside each ASCII character. A spreadsheet writes no NUL in a CSV file.
  if (text.includes('\u0000')) throw notUtf8();
  if (text.trim() === '') throw bad('it is empty.');
  // The columns, once the header row is read. Until then a field is named
  // by its position in the row.
  let header = null;
  const at = (row, k) => (header !== null && k < header.length ? `row ${row}, column ${header[k]}` : `row ${row}, field ${k + 1}`);
  const lineEnd = (i) => text[i] === '\n' || (text[i] === '\r' && text[i + 1] === '\n');
  const lists = { before: [], after: [] };
  const rows = { before: [], after: [] };
  let i = 0;
  let row = 0;
  while (i < text.length) {
    row += 1;
    const fields = [];
    for (;;) {
      const k = fields.length;
      let value = '';
      if (text[i] === '"') {
        i += 1;
        for (;;) {
          if (i >= text.length) throw bad(`${at(row, k)}: its opening quote is never closed.`);
          if (text[i] === '"') {
            if (text[i + 1] !== '"') break;
            value += '"';
            i += 2;
          } else {
            value += text[i];
            i += 1;
          }
        }
        i += 1;
        if (i < text.length && text[i] !== ',' && !lineEnd(i)) {
          throw bad(`${at(row, k)}: it has text after its closing quote. A quote inside a quoted field is written twice.`);
        }
      } else {
        while (i < text.length && text[i] !== ',' && !lineEnd(i)) {
          if (text[i] === '"') {
            throw bad(`${at(row, k)}: it holds a quote but does not start with one. A field that holds a quote is written in quotes, with each quote in it written twice.`);
          }
          value += text[i];
          i += 1;
        }
      }
      fields.push(value.trim());
      if (text[i] !== ',') break;
      i += 1;
    }
    // Past the line end: CR LF, LF, or the end of the file.
    i += text[i] === '\r' ? 2 : 1;
    if (header === null) {
      fields.forEach((name, k) => {
        if (!QUESTION_COLUMNS.includes(name)) {
          throw bad(`${at(1, k)}: its name is ${JSON.stringify(name)}, and a column is named list, name, text, type, options, required, min or max, in lower case.`);
        }
        const first = fields.indexOf(name);
        if (first !== k) throw bad(`${at(1, k)}: its name ${JSON.stringify(name)} is also the name of field ${first + 1}.`);
      });
      const missing = QUESTION_COLUMNS_REQUIRED.find((c) => !fields.includes(c));
      if (missing !== undefined) throw bad(`row 1: it has no column ${missing}, and the file needs list, name, text and type.`);
      header = fields;
      continue;
    }
    if (fields.every((v) => v === '')) continue;
    if (fields.length !== header.length) {
      const why = fields.length < header.length
        ? `so column ${header[fields.length]} has no field`
        : `so field ${header.length + 1} has no column`;
      throw bad(`row ${row}: it has ${fields.length} ${fields.length === 1 ? 'field' : 'fields'} and row 1 has ${header.length}, ${why}.`);
    }
    const cell = Object.fromEntries(header.map((name, k) => [name, fields[k]]));
    const column = (name) => `row ${row}, column ${name}`;
    if (cell.list !== 'before' && cell.list !== 'after') {
      throw bad(`${column('list')}: it is ${JSON.stringify(cell.list)}, and a list is before or after, in lower case.`);
    }
    // A blank field is left out of the question, so checkQuestions() names
    // a blank name, text or type as missing.
    const q = {};
    for (const key of ['name', 'text', 'type']) if (cell[key] !== '') q[key] = cell[key];
    if (cell.options !== undefined && cell.options !== '') q.options = cell.options.split('|').map((o) => o.trim());
    const required = (cell.required ?? '').toLowerCase();
    if (required === 'yes') {
      q.required = true;
    } else if (required !== 'no' && required !== '') {
      throw bad(`${column('required')}: it is ${JSON.stringify(cell.required)}, and required is yes, no or blank.`);
    }
    for (const bound of ['min', 'max']) {
      const v = cell[bound];
      if (v === undefined || v === '') continue;
      if (!/^-?[0-9]+$/.test(v)) {
        throw bad(`${column(bound)}: it is ${JSON.stringify(v)}, and a ${bound} is blank or a whole number, such as 18 or -5.`);
      }
      // A bound out of range is passed on as written, so the refusal quotes
      // the digits of the file.
      const n = Number(v);
      q[bound] = Math.abs(n) <= QUESTION_INT_MAX ? n : v;
    }
    lists[cell.list].push(q);
    rows[cell.list].push(row);
  }
  const questions = {};
  for (const list of QUESTION_LISTS) if (lists[list].length > 0) questions[list] = lists[list];
  if (Object.keys(questions).length === 0) throw bad('it has a header row and no question row.');
  return checkQuestions(questions, {
    bad,
    where: (list, k) => `row ${rows[list][k]}`,
    field: (where, key) => `${where}, column ${key}`,
  });
}

// The questions as a questions file: UTF-8 with a byte-order mark, which
// tells a spreadsheet the file is UTF-8, CR LF line ends, the columns in
// the order of QUESTION_COLUMNS, and one row per question, the before list
// first. `required` is written yes or no, and a missing field blank.
export function writeQuestionsCsv(questions) {
  const lines = [QUESTION_COLUMNS.join(',')];
  for (const list of QUESTION_LISTS) {
    for (const q of questions[list] ?? []) {
      const fields = [
        list, q.name, q.text, q.type, (q.options ?? []).join('|'), q.required === true ? 'yes' : 'no', q.min ?? '', q.max ?? '',
      ];
      lines.push(fields.map(csvField).join(','));
    }
  }
  return `﻿${lines.map((line) => `${line}\r\n`).join('')}`;
}

// An answer as a question screen holds it (see runForm()) counts as given
// when a `text` or `number` answer is not blank after trimming, a `choice`
// has a chosen option, or a `multi` has one or more.
function isAnswered(q, a) {
  if (a === undefined) return false;
  if (q.type === 'choice') return true;
  if (q.type === 'multi') return a.size > 0;
  return a.trim() !== '';
}

// A `number` answer after trimming: an optional minus sign and digits.
const WHOLE_NUMBER = /^-?\d+$/;

// A WHOLE_NUMBER answer in decimal digits with no leading zero and a minus
// sign only below zero, written from the typed digits, so no length is lost
// to a floating-point number: `007` is `7` and `-0` is `0`.
export function wholeNumber(typed) {
  const t = typed.trim();
  const negative = t.startsWith('-');
  const digits = (negative ? t.slice(1) : t).replace(/^0+(?=\d)/, '');
  return negative && digits !== '0' ? `-${digits}` : digits;
}

// The range a `number` question takes, as words: "a whole number from
// <min> to <max>", "a whole number of <min> or more" or "a whole number of
// <max> or less", or null when it has neither bound.
function rangeText(q) {
  if (q.min !== undefined && q.max !== undefined) return `a whole number from ${q.min} to ${q.max}`;
  if (q.min !== undefined) return `a whole number of ${q.min} or more`;
  if (q.max !== undefined) return `a whole number of ${q.max} or less`;
  return null;
}

// The fault in the answer to question `n` of a screen, as the sentence the
// screen shows, or null when there is none: a required question with no
// answer, a `number` answer that is not a WHOLE_NUMBER or is outside `min`
// to `max`, and a `text` answer holding a lone surrogate, which the file and
// the row cannot carry as typed.
function answerFault(q, a, n) {
  if (!isAnswered(q, a)) return q.required === true ? `Please answer question ${n} before continuing.` : null;
  if (q.type === 'text' && LONE_SURROGATE.test(a)) {
    return `Question ${n} holds a character this page cannot read. Please type it again.`;
  }
  if (q.type === 'number') {
    const t = a.trim();
    const v = WHOLE_NUMBER.test(t) ? BigInt(wholeNumber(t)) : null;
    if (v === null || (q.min !== undefined && v < BigInt(q.min)) || (q.max !== undefined && v > BigInt(q.max))) {
      return `Question ${n} needs ${rangeText(q) ?? 'a whole number'}.`;
    }
  }
  return null;
}

// The value a question writes into the row and the file, always a string:
// a `text` answer as typed, a `number` answer by wholeNumber(), the position
// of a `choice`, the positions of a `multi` in ascending order joined by
// single spaces, each position counted from 1, and the empty string for an
// unanswered question.
export function questionValue(q, a) {
  if (!isAnswered(q, a)) return '';
  if (q.type === 'text') return a;
  if (q.type === 'number') return wholeNumber(a);
  if (q.type === 'choice') return String(a);
  return [...a].sort((x, y) => x - y).join(' ');
}

// Reads the link's `c` or `z` parameter into a config, or throws with a
// message the participant can pass on to the study team.
export async function parseLink(search) {
  const config = await decodeLink(search);
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
  if (typeof config.participant === 'string' && !isWritableIdentifier(config.participant)) {
    throw new Error('The study link carries a participant identifier with a character that cannot be written.');
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
  // `prolific` takes the participant identifier from the address, so a link
  // that also names one is refused: the two would compete for the column.
  if (config.prolific !== undefined && config.prolific !== true && config.prolific !== false) {
    throw new Error(
      `The study link's prolific field must be true or false, and it is ${JSON.stringify(config.prolific)}.`,
    );
  }
  if (config.prolific === true && config.participant !== undefined) {
    throw new Error(
      "The study link names a participant and asks for the Prolific ID as well. Under prolific: true the participant identifier comes from the page's address, so the link must carry no participant.",
    );
  }
  // `participantParam` also takes the participant identifier from the
  // address, so a link that names one, or that asks for the Prolific ID,
  // is refused beside it: each would compete for the column.
  if (config.participantParam !== undefined) {
    const name = checkParticipantParam(config.participantParam);
    if (config.participant !== undefined) {
      throw new Error(
        `The study link names a participant and takes the identifier from the address parameter ${JSON.stringify(name)} as well. Under participantParam the participant identifier comes from the page's address, so the link must carry no participant.`,
      );
    }
    if (config.prolific === true) {
      throw new Error(
        `The study link carries prolific: true and takes the identifier from the address parameter ${JSON.stringify(name)} as well. Keep one: prolific: true for a Prolific study, participantParam for another site.`,
      );
    }
  }
  if (config.complete !== undefined) config.complete = checkCompleteUrl(config.complete);
  // `completeSaved` takes the same check under its own name, and means
  // nothing without a `complete` beside it: the saved screens link to it in
  // place of `complete`, and a confirmed send still goes to `complete`.
  if (config.completeSaved !== undefined) {
    const bad = (why) => new Error(`The study link's completeSaved field could not be used: ${why}`);
    if (config.complete === undefined) {
      throw bad(`it needs a complete field beside it, and the link carries none; it is ${JSON.stringify(config.completeSaved)}.`);
    }
    config.completeSaved = checkCompleteUrl(config.completeSaved, bad);
  }
  if (config.consent !== undefined) config.consent = checkConsent(config.consent);
  // `completeDeclined` takes the same check under its own name, and means
  // nothing without a `consent` beside it: only the consent screen's "I do
  // not agree" leads to it.
  if (config.completeDeclined !== undefined) {
    const bad = (why) => new Error(`The study link's completeDeclined field could not be used: ${why}`);
    if (config.consent === undefined) {
      throw bad(`it needs a consent field beside it, and the link carries none; it is ${JSON.stringify(config.completeDeclined)}.`);
    }
    config.completeDeclined = checkCompleteUrl(config.completeDeclined, bad);
  }
  if (config.questions !== undefined) config.questions = checkQuestions(config.questions);
  return config;
}

// The three parameters Prolific fills into a study URL through its
// placeholders. A parameter still holding a placeholder (`{{%STUDY_ID%}}`, as
// a preview or a hand-pasted link may carry) reads as absent, as does a
// missing or blank one: each comes back as the empty string. An address may
// carry a parameter twice, as when Prolific's own "URL parameters" option
// appends the three to a link that already ends in the builder's
// placeholders; each reads as its first value that is neither blank nor a
// placeholder, in whichever order the two arrived.
export const PROLIFIC_PARAMS = ['PROLIFIC_PID', 'STUDY_ID', 'SESSION_ID'];

export function readProlific(search) {
  const params = new URLSearchParams(search);
  const filled = (v) => v !== '' && !/^\{\{%.*%\}\}$/.test(v);
  const read = (name) => params.getAll(name).map((v) => v.trim()).find(filled) ?? '';
  const [pid, study, session] = PROLIFIC_PARAMS.map(read);
  return { pid, study, session };
}

// The name of the address parameter a link's `participantParam` field
// names, for a site that fills the participant's identifier into the study
// URL under a name of its own or the researcher's choosing (SONA's
// `%SURVEY_CODE%` placeholder, CloudResearch Connect's `participantId`). It
// is 1 to 64 of A-Z, a-z, 0-9, `_`, `.` and `-`. It must not be `c` or `z`,
// which carry the link itself, nor one of the three Prolific names, which
// `prolific: true` reads together with the two columns it writes. Returns
// the name or throws naming the fault with the value shown. link.html runs
// the same check on the builder's field, with `prolificAdvice` naming its
// Prolific choice in place of the link field.
export function checkParticipantParam(
  name,
  bad = (why) => new Error(`The study link's participantParam field could not be used: ${why}`),
  prolificAdvice = 'For a Prolific study use prolific: true',
) {
  if (typeof name !== 'string') throw bad(`it is not text, and it is ${JSON.stringify(name)}.`);
  if (name === '') throw bad('it is empty, and it is "".');
  if (name.length > 64) throw bad(`it is longer than 64 characters, and it is ${JSON.stringify(name)}.`);
  if (!/^[A-Za-z0-9_.-]+$/.test(name)) {
    throw bad(`it must hold only the letters A-Z and a-z, digits, "_", "." and "-", and it is ${JSON.stringify(name)}.`);
  }
  if (name === 'c') throw bad('it is "c", the parameter that carries the study link itself.');
  if (name === 'z') throw bad('it is "z", the parameter that carries a compressed study link.');
  if (PROLIFIC_PARAMS.includes(name)) {
    throw bad(`it is ${JSON.stringify(name)}, one of Prolific's parameters. ${prolificAdvice}, which also keeps STUDY_ID and SESSION_ID.`);
  }
  return name;
}

// The participant identifier a link's `participantParam` names, read from
// the page's address as its first value that is neither blank nor a
// placeholder: a value of the form `%…%` (SONA's `%SURVEY_CODE%`) or `{{…}}`
// (Prolific's placeholders) is a placeholder the site did not fill. Comes
// back as the empty string when there is no such value, and the start
// screen then asks.
export function readParticipantParam(search, name) {
  const params = new URLSearchParams(search);
  const filled = (v) => v !== '' && !/^%.*%$/.test(v) && !/^\{\{.*\}\}$/.test(v);
  return params.getAll(name).map((v) => v.trim()).find(filled) ?? '';
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
  const u = parseAddress(url, bad, 'its url');
  const loopback = u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
  if (u.protocol !== 'https:' && !loopback) {
    throw bad(
      `its url must start with https:// (http:// is accepted only for 127.0.0.1 or localhost), and it is ${JSON.stringify(url)}.`,
    );
  }
  refuseCredentials(u, url, bad, 'its url');
  return u.href;
}

// The address a link's `complete` field may name: `https:` to any host, and
// nothing else. The loopback exception above is for the tests' recording
// endpoint, which a completion address never is. link.html runs the same
// check on the builder's completion field.
//
// The address may hold the token `{participant}` in its query or fragment,
// which the page replaces with the participant identifier before it uses
// the address (fillParticipant()), for a site whose completion address
// carries each participant's own code, as SONA's `survey_code=` does. A
// URL keeps the braces there as typed. In the path it encodes them, and a
// token in the host would give a host the identifier cannot fill, so the
// token is refused in either, in its typed or its encoded form. Only the
// exact spelling is replaced, so another spelling after the ? or the # is
// refused too: another letter case, doubled braces, a space inside the
// braces, or a brace encoded as %7B or %7D, or twice as %257B or %257D.
// Left in place, it would reach the site unfilled, or with a brace around
// the identifier.
export const PARTICIPANT_TOKEN = '{participant}';

// A brace, typed or encoded once or twice, and the spellings between a
// brace and the word that the list above names.
const TOKEN_LIKE = /(?:\{|%7b|%257b)(?:\{|%7b|%257b|\s|%20|\+)*participant(?:\}|%7d|%257d|\s|%20|\+)*(?:\}|%7d|%257d)/i;

export function checkCompleteUrl(url, bad = (why) => new Error(`The study link's complete field could not be used: ${why}`)) {
  // A value that is not text is refused with the value shown, as every
  // other refusal of this field shows it.
  if (typeof url !== 'string') throw bad(`it is not text, and it is ${JSON.stringify(url)}.`);
  const u = parseAddress(url, bad, 'it');
  if (u.protocol !== 'https:') {
    throw bad(`it must start with https://, and it is ${JSON.stringify(url)}.`);
  }
  refuseCredentials(u, url, bad, 'it');
  if (TOKEN_LIKE.test(u.host) || TOKEN_LIKE.test(u.pathname)) {
    throw bad(`the ${PARTICIPANT_TOKEN} token must stand after the ? or the #, not in the host or the path, and it is ${JSON.stringify(url)}.`);
  }
  const variant = (u.search + u.hash).match(new RegExp(TOKEN_LIKE.source, 'gi'))?.find((m) => m !== PARTICIPANT_TOKEN);
  if (variant !== undefined) {
    throw bad(`the ${PARTICIPANT_TOKEN} token must be written exactly so, in lower case with one typed brace on each side and no space, and ${JSON.stringify(variant)} is another spelling of it. The address is ${JSON.stringify(url)}.`);
  }
  return u.href;
}

// A completion address with each `{participant}` replaced by the
// identifier, encoded as one query value. checkCompleteUrl() has kept the
// token out of the host and the path, so every token left is in the query
// or the fragment. An address without the token comes back unchanged.
export function fillParticipant(address, participant) {
  return address.split(PARTICIPANT_TOKEN).join(encodeURIComponent(participant));
}

// Whether an identifier can be written into a completion address.
// encodeURIComponent() throws on an unpaired surrogate (half of a character
// written as two UTF-16 code units), so an identifier holding one is refused
// where it enters, the link or the start screen, before anything is sent or
// saved. The address readers cannot deliver one: URLSearchParams decodes a
// broken sequence to one or more U+FFFD.
export function isWritableIdentifier(participant) {
  try {
    encodeURIComponent(participant);
    return true;
  } catch {
    return false;
  }
}

// The parse the two address checks share: text, then a URL. `what` names
// the address in the message ("its url", "it"). Each check then tests the
// scheme and, last, refuseCredentials(), so an address wrong on both counts
// is refused for its scheme, as the store check always was.
function parseAddress(url, bad, what) {
  if (typeof url !== 'string') throw bad(`${what} is not text.`);
  try {
    return new URL(url);
  } catch {
    throw bad(`${what} is not a web address: ${JSON.stringify(url)}.`);
  }
}

// fetch() refuses a URL that carries a user name or password, so such a
// store address would make every send unconfirmed, and a completion address
// with one would put a credential in a study link. Both are refused by name.
function refuseCredentials(u, url, bad, what) {
  if (u.username !== '' || u.password !== '') {
    throw bad(`${what} must not carry a user name or password, and it is ${JSON.stringify(url)}.`);
  }
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
  // The page keeps its columns in the order of `items` under a random order,
  // and when the descriptor has no `itemOrder`; the file and the reader
  // describe that order as the instrument's, so any other order would score
  // wrong by position. write_module() writes them ascending.
  if (m.items.some((v, i) => i > 0 && v < m.items[i - 1])) {
    throw bad('its items are not in ascending order.');
  }
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
// text, an `item_order` text column under `shuffle`, the two Prolific text
// columns under `prolific`, one integer column per item, one text column
// per question of `questions` (a link's `questions` field) in
// questionColumns() order, row-level security on, the project's default
// grants to the API roles revoked, and the anon role allowed to insert and
// nothing else. Shown by link.html; pasted by the researcher into the
// project's SQL editor.
export function storeSql(table, items, shuffle = false, prolific = false, questions = undefined) {
  const q = (name) => `"${String(name).replace(/"/g, '""')}"`;
  const t = q(table);
  const lead = leadColumns({ shuffle, prolific });
  const columns = [
    ...lead.map((c) => `  ${q(c)} text`),
    ...items.map((it) => `  ${q(it.name)} integer`),
    ...questionColumns({ questions }).map((c) => `  ${q(c)} text`),
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
// words at or above the largest multiple of the range that fits in 32 bits,
// so every position is equally likely. The input is not changed.
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

// The lead columns of the row, the file and the table, in order: the five
// study fields, `item_order` under `shuffle`, and the two Prolific columns
// under `prolific`, so that `item_order` stays sixth in a file that has it.
export function leadColumns({ shuffle = false, prolific = false } = {}) {
  return [
    'study', 'participant', 'instrument', 'form_build', 'submitted',
    ...(shuffle ? ['item_order'] : []),
    ...(prolific ? ['prolific_study', 'prolific_session'] : []),
  ];
}

// The lead values of one record, in leadColumns() order. `itemOrder`, when
// given, is the item numbers in the order shown, joined by single spaces.
// `prolific`, when given, is `{ study, session }` from the address, each
// written as it was read (the empty string when absent or a placeholder).
function leadValues({ study, participant, instrument, formBuild, submitted, itemOrder, prolific }) {
  return [
    study, participant, instrument, formBuild, submitted,
    ...(itemOrder !== undefined ? [itemOrder.join(' ')] : []),
    ...(prolific !== undefined ? [prolific.study, prolific.session] : []),
  ];
}

// The trailing columns of the row, the file and the table: `q_` plus each
// question's name, the `before` list first, each list in the link's order.
// None for a config with no `questions`.
export function questionColumns({ questions } = {}) {
  return QUESTION_LISTS.flatMap((list) => (questions?.[list] ?? []).map((q) => `q_${q.name}`));
}

// The trailing values of one record, in questionColumns() order: each
// question's string from `questionValues` (runForm()'s questionValue()).
function questionCells({ questions, questionValues }) {
  return QUESTION_LISTS.flatMap((list) => (questions?.[list] ?? []).map((q) => questionValues.get(q.name)));
}

// One header row and one data row. `answers` maps item number to the chosen
// option value. `items` is the column order; the lead columns are
// leadColumns()' for the record's `itemOrder` and `prolific`. Without either
// the file has five lead columns. The question columns follow the items.
export function buildCsv(record) {
  const { items, answers } = record;
  const header = leadColumns({ shuffle: record.itemOrder !== undefined, prolific: record.prolific !== undefined });
  const row = leadValues(record);
  header.push(...items.map((it) => it.name), ...questionColumns(record));
  row.push(...items.map((it) => answers.get(it.number)), ...questionCells(record));
  return `${header.map(csvField).join(',')}\r\n${row.map(csvField).join(',')}\r\n`;
}

export function fileName({ study, participant, instrument, submitted }) {
  const safe = (s) => String(s).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
  const stamp = submitted.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `${safe(instrument)}_${safe(study)}_${safe(participant)}_${stamp}.csv`;
}

// ---- The send -------------------------------------------------------------

export const SEND_TIMEOUT_MS = 30_000;

// One JSON object per finished form: the lead fields buildCsv() writes as
// columns, key for column and in the same order, then one key per item in
// `items` order, each value the chosen option's integer value, then one
// string per question, keyed and ordered as questionColumns().
export function buildRow(record) {
  const { items, answers } = record;
  const header = leadColumns({ shuffle: record.itemOrder !== undefined, prolific: record.prolific !== undefined });
  const values = leadValues(record);
  const row = Object.fromEntries(header.map((k, i) => [k, values[i]]));
  for (const it of items) row[it.name] = answers.get(it.number);
  const cells = questionCells(record);
  questionColumns(record).forEach((k, i) => { row[k] = cells[i]; });
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

export function saveFile(name, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Released after a minute rather than seconds: a save dialog the
  // participant holds open reads the URL when it closes.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
    config = await parseLink(search);
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
  // The three Prolific parameters are read from the address only under
  // `prolific: true`, and the parameter a `participantParam` names only
  // under that field; any other link ignores the address's parameters.
  runForm(
    root, config, exp, plan,
    config.prolific === true ? readProlific(search) : undefined,
    config.participantParam !== undefined ? readParticipantParam(search, config.participantParam) : '',
  );
}

// `plan.shown` is the order the pages render and the positions count in;
// `plan.items` the order the row and the file keep. `prolific`, under
// `prolific: true`, is the address's three parameters from readProlific():
// a PROLIFIC_PID that is not empty is the participant identifier, and the
// start screen then asks for none. `fromAddress`, under `participantParam`,
// is the identifier readParticipantParam() read, and likewise takes the
// place of the start screen's question when it is not empty.
function runForm(root, config, exp, plan, prolific, fromAddress) {
  const items = plan.shown;
  const title = INSTRUMENTS[config.instrument];
  const options = exp.instructions.options;
  const answers = new Map();
  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  let participant = prolific && prolific.pid !== ''
    ? prolific.pid
    : fromAddress !== '' ? fromAddress : config.participant;
  let page = 0;
  let finished = false;
  let sending = false;
  const store = config.store;
  const storeHost = store ? new URL(store.url).host : null;
  const before = config.questions?.before ?? [];
  const after = config.questions?.after ?? [];
  // The answers to the researcher's questions, by name, as the screens hold
  // them: the typed string for `text` and `number`, the chosen position for
  // `choice` and the set of chosen positions for `multi`, each counted from 1.
  const questionAnswers = new Map();

  // A reload or a back gesture would lose every answer, since they live only
  // in memory until Finish writes the file. The browser asks first.
  window.addEventListener('beforeunload', (ev) => {
    if (finished || (answers.size === 0 && ![...before, ...after].some((q) => isAnswered(q, questionAnswers.get(q.name))))) return;
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
        if (!isWritableIdentifier(v)) {
          alert.textContent = 'Your participant identifier holds a character this page cannot read. Please type it again.';
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

  // The researcher's text as paragraphs, each line a text node and a line
  // break a `br` between two, so no tag or entity in it is read as markup.
  function textNodes(text) {
    return textParagraphs(text).map((lines) =>
      el('p', {}, lines.flatMap((line, i) => (i === 0 ? [line] : [el('br'), line]))));
  }

  // The consent screen, before the start screen under a link with
  // `consent`. It holds the researcher's text and the two buttons, and no
  // item, option or instruction of the instrument.
  function showConsent() {
    root.replaceChildren(
      heading('Consent to take part'),
      el('div', { class: 'consent' }, textNodes(config.consent.text)),
      el('div', { class: 'nav' }, [
        el('button', { type: 'button', text: 'I agree', onclick: proceed }),
        el('button', { type: 'button', class: 'secondary', text: 'I do not agree', onclick: decline }),
      ]),
    );
    focusHeading(root);
  }

  // "I do not agree": the declined screen, with nothing sent or saved and no
  // way back to the form. Its text is the link's `declined`, or a fixed
  // sentence. With `completeDeclined` the screen links to that address, each
  // `{participant}` filled with the identifier the page holds (none yet
  // when the start screen would have asked, so the empty string), and the
  // page then goes there, the screen drawn first as the sent screen is.
  function decline() {
    finished = true;
    const address = config.completeDeclined === undefined
      ? undefined
      : fillParticipant(config.completeDeclined, participant ?? '');
    const text = config.consent.declined !== undefined
      ? textNodes(config.consent.declined)
      : [el('p', { text: address === undefined ? 'You chose not to take part. You can close this page.' : 'You chose not to take part.' })];
    root.replaceChildren(
      heading('Thank you'),
      el('div', { class: 'declined' }, text),
      ...(address === undefined
        ? []
        : [el('p', { class: 'complete' }, ['Continue to ', el('a', { href: address, text: new URL(address).host }), '.'])]),
    );
    focusHeading(root);
    if (address !== undefined) window.location.assign(address);
  }

  // A question on its screen, numbered `n` there: a fieldset of radio
  // buttons for `choice` and of check boxes for `multi`, and a label and one
  // text input for `text` and `number`. A `number` input is a text input
  // with a numeric keyboard, so the page reads what was typed, and a range
  // line under the question states its `min` and `max`. The question text
  // and the option labels are written as text, so no tag or entity in them
  // is read as markup. The answer the screen holds is kept across Back.
  function questionNode(q, n) {
    const id = `q-${q.name}`;
    const caption = [
      el('span', { class: 'pos', text: `${n}.` }),
      ' ',
      el('span', { class: 'text', text: q.text }),
      ...(q.required === true ? [el('span', { class: 'required', text: ' (required)' })] : []),
    ];
    const held = questionAnswers.get(q.name);
    if (q.type === 'choice' || q.type === 'multi') {
      const fs = el('fieldset', { class: 'question', 'data-name': q.name }, [el('legend', {}, caption)]);
      const group = el('div', { class: 'options' });
      q.options.forEach((label, j) => {
        const position = j + 1;
        const input = el('input', {
          type: q.type === 'choice' ? 'radio' : 'checkbox',
          name: id,
          value: String(position),
          onchange: () => {
            if (q.type === 'choice') {
              questionAnswers.set(q.name, position);
            } else {
              const chosen = questionAnswers.get(q.name) ?? new Set();
              if (input.checked) chosen.add(position);
              else chosen.delete(position);
              questionAnswers.set(q.name, chosen);
            }
            fs.classList.remove('unanswered');
          },
        });
        if (q.type === 'choice' ? held === position : held?.has(position)) input.checked = true;
        group.append(el('label', {}, [input, el('span', { class: 'label', text: label })]));
      });
      fs.append(group);
      return fs;
    }
    const range = q.type === 'number' ? rangeText(q) : null;
    const hint = range === null ? [] : [el('p', { class: 'range', id: `${id}-hint`, text: `${range[0].toUpperCase()}${range.slice(1)}.` })];
    const input = el('input', {
      type: 'text',
      id,
      name: id,
      autocomplete: 'off',
      // The numeric keypad of a phone can lack a minus sign, so a question
      // that takes a negative answer keeps the full keyboard.
      ...(q.type === 'number' && q.min >= 0 ? { inputmode: 'numeric' } : {}),
      ...(q.required === true ? { 'aria-required': 'true' } : {}),
      ...(range === null ? {} : { 'aria-describedby': `${id}-hint` }),
      oninput: () => {
        questionAnswers.set(q.name, input.value);
        wrap.classList.remove('unanswered');
      },
    });
    input.value = held ?? '';
    const wrap = el('div', { class: 'question', 'data-name': q.name }, [el('label', { for: id }, caption), ...hint, input]);
    return wrap;
  }

  // A screen of the researcher's questions: `before`, ahead of the start
  // screen, with Next and no Back, or `after`, behind the last item page,
  // with Back and Finish. It holds no item, option or instruction of the
  // instrument. Next and Finish check the answers in order and stop at the
  // first fault, named by the question's number on the screen, with focus
  // on that question's first input.
  function showQuestions(list) {
    const qs = list === 'before' ? before : after;
    const alert = el('p', { role: 'alert' });
    const nodes = qs.map((q, i) => questionNode(q, i + 1));
    const checked = () => {
      for (let i = 0; i < qs.length; i++) {
        const why = answerFault(qs[i], questionAnswers.get(qs[i].name), i + 1);
        if (why === null) continue;
        nodes.forEach((node, k) => node.classList.toggle('unanswered', k === i));
        alert.textContent = why;
        nodes[i].scrollIntoView({ block: 'center' });
        nodes[i].querySelector('input').focus({ preventScroll: true });
        return false;
      }
      return true;
    };
    const nav = list === 'before'
      ? el('div', { class: 'nav' }, [
          el('span', { class: 'spacer' }),
          el('button', { type: 'button', text: 'Next', onclick: () => { if (checked()) start(); } }),
        ])
      : el('div', { class: 'nav' }, [
          el('button', {
            type: 'button',
            class: 'secondary',
            text: 'Back',
            onclick: () => {
              if (sending) return;
              page = pageCount - 1;
              showPage();
            },
          }),
          el('span', { class: 'spacer' }),
          el('button', {
            type: 'button',
            text: 'Finish',
            onclick: () => {
              if (sending) return;
              if (checked()) finish(nav);
            },
          }),
        ]);
    root.replaceChildren(heading(list === 'before' ? 'Before you begin' : 'Before you finish'), ...nodes, alert, nav);
    window.scrollTo(0, 0);
    focusHeading(root);
  }

  // After consent, or at once without it: the before screen when the link
  // has one, then the start screen.
  function proceed() {
    if (before.length > 0) showQuestions('before');
    else start();
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
      if (last && after.length > 0) showQuestions('after');
      else if (last) finish(nav);
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
      el('button', { type: 'button', text: last && after.length === 0 ? 'Finish' : 'Next', onclick: advance }),
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
  // saves the file and shows the unconfirmed screen naming it. Each saved
  // screen carries a "Save the file" button that saves the same file again
  // from the participant's own click: the unconfirmed screen's download
  // starts only after the send's wait, which can outlast the click's user
  // activation, and a browser may block it; a download on either screen
  // can be dismissed.
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
      // Under `prolific: true` the two columns are always written, each
      // empty when the address gave nothing for it.
      prolific: prolific ? { study: prolific.study, session: prolific.session } : undefined,
      // A copy: the radios stay live during a send, and the file saved on an
      // unconfirmed send must hold the answers the row was posted with.
      answers: new Map(answers),
      // The researcher's questions and the value each writes, by name.
      questions: config.questions,
      questionValues: new Map([...before, ...after].map((q) => [q.name, questionValue(q, questionAnswers.get(q.name))])),
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
      const complete = config.complete === undefined ? undefined : fillParticipant(config.complete, participant);
      // The sent screen is drawn first either way. With a completion
      // address a link there takes the place of "You can close this
      // page.", and the page then navigates there, as Prolific recommends:
      // `finished` is already set, so the unload guard lets the navigation
      // through, and while the navigation is pending the participant sees
      // the sent screen rather than a disabled form.
      root.replaceChildren(
        heading('Thank you'),
        el('p', { class: 'done', text: 'Your responses were sent to the study team.' }),
        complete === undefined
          ? el('p', { text: 'You can close this page.' })
          : el('p', { class: 'complete' }, [
              'Continue to ',
              el('a', { href: complete, text: new URL(complete).host }),
              '.',
            ]),
        versionLine(exp),
      );
      focusHeading(root);
      if (complete !== undefined) window.location.assign(complete);
      return;
    }
    showSaved(
      saveCsv(record),
      `The send to the study team could not be confirmed (${outcome.why}). Your responses were saved instead as one file, in the folder your browser uses for downloads:`,
      'Please send that file to the study team the way they asked.',
    );
  }

  // Saves the file and returns its name and text, so the saved screen's
  // button can save the same bytes again.
  function saveCsv(record) {
    const name = fileName(record);
    const text = buildCsv(record);
    saveFile(name, text);
    return { name, text };
  }

  // A saved file must be seen before the participant leaves, so with a
  // completion address the saved screens offer it as a link after the file
  // name, labelled by its host, and navigate nowhere on their own. The
  // address is `completeSaved` when the link carries one, else `complete`,
  // each `{participant}` in it filled with the identifier.
  // The trail paragraph ends by naming the "Save the file" button below it,
  // which saves the file again with the name and text saved at Finish. A
  // status region under the button is rendered empty, so it exists before
  // the first press; each press rewrites it with the same sentence, and
  // `role="status"` marks the write for a screen reader to announce. Focus
  // is not moved, so after a keyboard press it stays on the button.
  function showSaved({ name, text }, lead, trail) {
    const given = config.completeSaved ?? config.complete;
    const address = given === undefined ? undefined : fillParticipant(given, participant);
    const complete = address === undefined
      ? []
      : [el('p', { class: 'complete' }, [
          'Then continue to ',
          el('a', { href: address, text: new URL(address).host }),
          '.',
        ])];
    const status = el('p', { class: 'saved-again', role: 'status' });
    const saveAgain = () => {
      saveFile(name, text);
      status.textContent = 'The file was saved again.';
    };
    root.replaceChildren(
      heading('Thank you'),
      el('p', { class: 'done', text: lead }),
      el('p', {}, [el('code', { class: 'filename', text: name })]),
      el('p', { text: `${trail} If the file did not appear, press Save the file.` }),
      el('button', { type: 'button', text: 'Save the file', onclick: saveAgain }),
      status,
      ...complete,
      versionLine(exp),
    );
    focusHeading(root);
  }

  if (config.consent !== undefined) showConsent();
  else proceed();
}
