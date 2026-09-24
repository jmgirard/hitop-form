# hitop-form

A static page that shows one of five questionnaires in the browser: the
HiTOP-SR, the HiTOP-BR, or the PID-5 in its full (PID-5), short (PID-5-SF) or
brief (PID-5-BF) form.
When a participant finishes, the page sends their answers as one JSON row to
the store the study link names: a web address, such as a Google Apps Script
web app that appends to a Google Sheet, or a table in a Supabase project.
When the link names no store, the page saves the answers to the
participant's own device as one CSV file, and no answer is sent anywhere. It is built for studies that collect responses
without a survey platform, and it scores nothing: scoring is the job of the
[hitop](https://jmgirard.github.io/hitop/) R package.

Live page: <https://jmgirard.github.io/hitop-form/>
Make a study link: <https://jmgirard.github.io/hitop-form/link.html>

The page reads the instrument from the hitop package's JSON export
(`https://jmgirard.github.io/hitop/downloads/hitopsr.json`, `hitopbr.json`,
`pid5.json`, `pid5sf.json` and `pid5bf.json`). Item text, response options and instructions are the
package's, shown unchanged. The export's build date and package version are
printed on the page, and the build date is written into every row and file.

## Make a study link

Open [link.html](https://jmgirard.github.io/hitop-form/link.html) and fill in
the form:

1. Choose the instrument: HiTOP-SR (405 items), HiTOP-BR (45 items),
   PID-5 (220 items), PID-5-SF (100 items) or PID-5-BF (25 items).
2. Give the study a name. The name is written into every row and file.
3. Optionally give a participant identifier. Leave it empty for one link
   shared with many participants. The page then asks each participant for an
   identifier before the form starts.
4. Optionally paste a HiTOP-SR module descriptor: the JSON file that the hitop
   package's `write_module()` wrote, or that the
   [Module Builder](https://jmgirard.github.io/hitop-builder/) saved beside
   your form. The page then shows only the module's items. When the
   descriptor records a printed order, the items follow it, unless the next
   box is checked.
5. Optionally check "Show the items in a random order". The page then draws
   a new order each time it opens, so each participant sees the items in a
   different order. The row and the file still list the items in the
   instrument's order under their item names, and a sixth lead column,
   `item_order`, records the order that participant saw. A module
   descriptor's printed order is not followed. The next section describes
   the file.
6. Optionally check "Recruit through Prolific", and leave the participant
   field empty. Prolific fills a participant's ID, the study's ID and the
   submission's ID into a study URL through the placeholders
   `{{%PROLIFIC_PID%}}`, `{{%STUDY_ID%}}` and `{{%SESSION_ID%}}`
   ([Prolific's API reference, the study object](https://docs.prolific.com/api-reference/studies/the-study-object)),
   and asks that all three be saved
   ([What survey / experimental software is compatible with Prolific?](https://researcher-help.prolific.com/en/articles/445178-what-survey-experimental-software-is-compatible-with-prolific)).
   With the box checked, the printed link ends in those three placeholders.
   Paste it as the study URL on Prolific. The page then takes the Prolific
   ID from its address as the participant identifier and asks for none, and
   two more lead columns, `prolific_study` and `prolific_session`, hold the
   other two. When the address carries no Prolific ID, a blank one, or
   still the placeholder, the page asks for the identifier as for a link
   without one.
   A preview on Prolific passes a 24-character ID
   ([Previewing your study](https://researcher-help.prolific.com/en/articles/445131-previewing-your-study)),
   so it walks the form as a participant would.
7. Optionally give a completion URL: an `https://` address. After a
   confirmed send the page sends the participant there in place of the sent
   screen. After a saved file it shows the file name and then a link to the
   address. For Prolific, use the completion URL on the study's setup page,
   of the form `https://app.prolific.com/submissions/complete?cc=…`, as
   [the compatibility article](https://researcher-help.prolific.com/en/articles/445178-what-survey-experimental-software-is-compatible-with-prolific)
   shows under "Returning Participants to Prolific". Redirecting the
   participant there is the return Prolific recommends
   ([Data collection](https://researcher-help.prolific.com/en/articles/445127-data-collection)).
8. Choose where responses go. "A file on the participant's device" is the
   default: the page saves a file and sends nothing. "A web address" is the
   `https://` address of an endpoint that accepts one JSON row per
   participant. The web app in
   [Send responses to a Google Sheet](#send-responses-to-a-google-sheet)
   below is one. "A Supabase table" takes the project URL, its publishable
   key and a table name, as
   [Send responses to Supabase](#send-responses-to-supabase) describes. The
   builder refuses an address that is not `https://`, with one exception
   for local testing: `http://` to `127.0.0.1` or `localhost`. A table
   name must be lower-case letters, digits and underscores, up to 63 of
   them, and its first character must not be a digit.

Press "Make the link". The link carries the instrument, the study, the
participant, the module, the random-order choice, the Prolific choice, the
completion URL and the store folded into its address, so it needs
no server and no account. Copy it and send it to the participant. A link with
a module descriptor is a few hundred characters long. If a mail client or a
course system truncates it, the page reports that the link cannot be read.

The page's host, GitHub Pages, sees the address when the page is requested.
So the study name, the participant identifier, the module composition and
the store, a Supabase key included, reach that host's request logs. The
answers never do: with a store they go to that store and nowhere else, and
without one they stay on the participant's device. If the identifier must not reach any
server, leave it out of the link. The participant then types it on the start
screen, and it is written only into the row or the file. Under the Prolific
route the three Prolific parameters, the participant's Prolific ID among
them, reach the host with each page load as the rest of the address does.

## What the participant sees

The link opens a start screen with the instrument's instructions, the item
count, and a "Begin" button. The start screen says where the answers go.
With a send address, it names the address's host. Without one, it says the
answers are saved to a file on this device. When the link carries no
participant identifier, the start screen asks for one. Under the Prolific
route the identifier is the Prolific ID in the page's address, and the
start screen asks only when the address carries none.

The items follow, 15 to a page, numbered 1, 2, 3 in the order they appear.
Under the random order, that order is drawn when the page opens, and a
reload draws another. Each item has one set of response options. Every item on a page must be
answered before the next page opens. If one is blank, the page names it by
the number printed beside it and by its place on that page. The cursor moves
to that item, and the page waits.

The last page ends with "Finish". Until it is pressed the answers live only
in the open page. If the participant reloads or closes the page, the browser
asks first. A reload starts the form over.

With a store, pressing Finish posts the answers to it and waits up to
30 seconds for it to confirm. The button is disabled while it
waits, so a second press sends nothing. On a confirmed send the page says
that the responses were sent to the study team, and no file is saved. Every
other outcome is unconfirmed: an error status, an answer from a web address
that is not a confirmation, a lost connection, or no answer within the
limit. Then the
page saves the CSV file described below and says that the send could not be
confirmed. It names the file, so the participant can send it by hand.

Without a send address, pressing Finish saves the file and shows the file
name. No answer leaves the page.

With a completion URL in the link, a confirmed send takes the participant
to that address instead of showing the sent screen. Each screen that names
a saved file shows, after the file name, a link to the address labelled by
its host, and goes there only when the participant follows it.

## Where the file lands

Without a send address, and with one when the send is not confirmed, the
file is saved where the participant's browser puts downloads. Its name is
`<instrument>_<study>_<participant>_<timestamp>.csv`, for example
`hitopbr_Pilot-A_p001_20260920T211531Z.csv` or
`pid5sf_Pilot-A_p001_20260920T211531Z.csv`. Ask each participant to send you
the file the way your study collects documents.

The file has two rows. The header is
`study,participant,instrument,form_build,submitted` followed by one column
per item, named as the package names the items (`hitopbr_01`,
`hitopsr_233`, `pid5_001`, `pid5sf_100`, `pid5bf_25`). Without the random
order, the item columns follow the order the participant saw. With it, a
sixth lead column, `item_order`, follows `submitted`. It holds the item
numbers in the order that participant saw them, joined by single spaces
(`hitopbr_01` is 1). The item columns then follow the instrument's order (a
module's items in the order its descriptor lists them, which
`write_module()` writes ascending). Under the Prolific route, two more lead
columns, `prolific_study` and `prolific_session`, follow `submitted`, or
`item_order` when the file has it. They hold the `STUDY_ID` and `SESSION_ID`
values from the page's address, and each is empty when the address carried
none or still carried the placeholder. The data row holds the study fields, the
export's build date and the time of finishing as an ISO-8601 timestamp in
UTC. Then comes each answer's numeric value: 1 to 4 on the HiTOP forms and 0
to 3 on the PID-5 forms, as the export's response options number them. Nine
example files are under `tests/fixtures/`, one per form, one for a
HiTOP-SR module, one HiTOP-BR file under the random order and two under the
Prolific route.

## Send responses to a Google Sheet

With a send address, the page posts one JSON object per participant. Its
keys are the file's columns in the same order: `study`, `participant`,
`instrument`, `form_build`, `submitted`, `item_order` under the random
order, `prolific_study` and `prolific_session` under the Prolific route,
then one key per item. Its values
are the same as the file's, with each answer as a JSON integer. The request
is a POST with the body as `text/plain`, sent from the page's origin. The
endpoint must answer with the JSON `{"ok":true}` and with an
`Access-Control-Allow-Origin` header that admits the page's origin, as an
Apps Script web app does. Any other answer makes the page save the file
instead. If the answer arrives after the page's 30-second limit, the page
reports the send as unconfirmed, but the row still reaches the endpoint. The
file saved in that case duplicates a stored row. The `submitted` value
identifies the pair.

A Google Apps Script web app bound to a Google Sheet is one such endpoint,
and it needs only a Google account. Each row lands in the sheet as text. So
an identifier such as `007` keeps its zeros, and a value that starts with
`=` is never read as a formula.

1. Create a new Google Sheet. In its menu choose Extensions, then Apps Script.
2. Replace the contents of `Code.gs` with the code below and save the
   project.

   ```js
   // Appends one row per POST to the sheet named below, creating it on the
   // first row. The first row's keys become the header. Later rows follow the
   // header's order, and a key the header lacks is added to it. A body that
   // is not an object, has more than MAX_KEYS keys, or has a key outside
   // a-z, 0-9 and _ is refused, so no one can grow the header without limit
   // or put a formula in it. Every cell is written behind a leading
   // apostrophe, the sheet's mark for text, and formatted as text, so "007"
   // keeps its zeros and "=1+1" stays the text =1+1 rather than a formula
   // (the text format alone does not stop the formula). Answers {"ok":true},
   // or {"ok":false} with the reason when the body is refused.
   const SHEET_NAME = 'Responses';
   const MAX_KEYS = 1000;
   const asText = (v) => "'" + String(v);
   const answer = (body) => ContentService.createTextOutput(JSON.stringify(body))
     .setMimeType(ContentService.MimeType.JSON);

   function doPost(e) {
     const row = JSON.parse(e.postData.contents);
     if (row === null || typeof row !== 'object' || Array.isArray(row)) {
       return answer({ ok: false, why: 'the body is not an object' });
     }
     const keys = Object.keys(row);
     if (keys.length > MAX_KEYS) return answer({ ok: false, why: 'too many keys' });
     const badKey = keys.find((k) => !/^[a-z0-9_]+$/.test(k));
     if (badKey !== undefined) return answer({ ok: false, why: 'a key is not a column name' });
     const lock = LockService.getScriptLock();
     lock.waitLock(10000);
     try {
       const book = SpreadsheetApp.getActiveSpreadsheet();
       const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
       let header = sheet.getLastRow() === 0
         ? []
         : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
       const missing = keys.filter((k) => !header.includes(k));
       if (missing.length) {
         header = header.concat(missing);
         sheet.getRange(1, 1, 1, header.length).setNumberFormat('@').setValues([header.map(asText)]);
       }
       const values = header.map((k) => (k in row ? asText(row[k]) : ''));
       const at = sheet.getLastRow() + 1;
       sheet.getRange(at, 1, 1, values.length).setNumberFormat('@').setValues([values]);
     } finally {
       lock.releaseLock();
     }
     return answer({ ok: true });
   }
   ```

3. Choose Deploy, then New deployment. Set the type to Web app, "Execute
   as" to Me, and "Who has access" to Anyone. Press Deploy and authorize the
   script when asked. Copy the web app URL, which ends in `/exec`.
4. Paste that URL into the "Send responses to" field of
   [link.html](https://jmgirard.github.io/hitop-form/link.html) and make the
   link.
5. When you change the code later, choose Deploy, then Manage deployments,
   edit the deployment and pick "New version". The `/exec` URL stays the same.

The script builds the sheet's header from the first row it receives. It
adds a key it has not seen to the end of the header. So start a new sheet
for a link with the random order. A sheet that already holds rows without
`item_order` puts that column after the item columns.
`read_form_responses()` reads it there too, but the download then lacks
the column order above.

Anyone with the URL can post a row to the sheet, and only you can read it.
The URL sits inside every study link you send out. So a participant, or
anyone who sees a link, can post rows the page never made. If that matters
for your study, compare `row.study` with your study name in `doPost` and
refuse a mismatch. Screen the sheet before scoring. The page never reads
the sheet.

To download the responses, open the sheet's `Responses` tab and choose File,
then Download, then Comma Separated Values (.csv). The file has one header
row and one row per participant, in the column order above. Read it in R
with `read.csv(file, colClasses = "character")` or
`readr::read_csv(file, col_types = readr::cols(.default = "c"))`. Either
call keeps a participant code such as `007` as text. Then score the item
columns as the next section describes. The file
`tests/fixtures/sheet-hitopbr.csv` is one such download, from two HiTOP-BR
walks against a web app deployed from the code above.

## Send responses to Supabase

A Supabase project holds a Postgres database behind a REST API, and a free
project needs only an account. The page inserts each participant's
responses as one row of a table you create, with one column per item. The
request goes to `<project URL>/rest/v1/<table>` with the project's key in
the `apikey` header and the row as JSON, and asks for no row back. A 2xx
answer confirms the send. Anything else, an answer that redirects
included, makes the page save the file instead.

1. Create a project at <https://supabase.com/dashboard>. Pick a region
   where your study's data is allowed to be stored.
2. In [link.html](https://jmgirard.github.io/hitop-form/link.html), choose
   the instrument (and paste the module descriptor, if any), set "Send
   responses to" to "A Supabase table", and fill in the three fields:
   - Project URL: in the dashboard, open Project Settings, then Data API.
     It looks like `https://abcdefghijkl.supabase.co`.
   - Publishable key: Project Settings, then API Keys. It starts with
     `sb_publishable_`. A project made before the new keys shows a legacy
     `anon` key instead, a long token with two dots. The page accepts
     either. Never put a secret or service-role key in a study link. The
     link is public to everyone who receives it.
   - Table name: a lower-case name such as `responses`.
3. Press "Make the link". The SQL for the table appears under the link.
   Copy it, open the dashboard's SQL Editor, paste it in and run it. The
   SQL creates the table with the five study columns, a text column
   `item_order` when the random-order box is checked, the text columns
   `prolific_study` and `prolific_session` when the Prolific box is
   checked, and one integer column per item, in the order the file keeps
   them. It then turns on row-level
   security, revokes the project's default table privileges from the
   `anon` and `authenticated` roles, grants insert back to `anon`, and
   adds one policy that lets that role insert. With the publishable key,
   the API can then insert rows and nothing else. A select returns no
   rows, and an update or a delete changes none.
4. Send the link to the participants.

The table's columns are fixed by the SQL, so a link for a different
instrument or module, or a link with the random order or the Prolific
route sent to a table made without it, needs a table of its own. A row with a key the table
has no column for is refused by the API, and the page then saves the file.
A row that lacks some of the table's columns is stored with those columns
empty, because the SQL puts no constraint on any column.

A free project is paused after a week without activity. A paused project
refuses every send, so each participant's page saves the file instead.
Open the dashboard and restore the project before a study starts, and look
at it during a slow study. Or move the project to a paid plan for the
study's duration.

To download the responses, open the Table Editor, choose the table, and
use its export to CSV. The file has one header row in the SQL's column order
and one row per participant. Read it in R as the previous section shows,
with every column kept as text. Then score the item columns as the next
section describes. The file `tests/fixtures/supabase-hitopbr.csv` is one
such export, from two HiTOP-BR walks against a table made from the
builder's SQL, one with the publishable key and one with a legacy anon key.
The Table Editor warns that the table has no primary key when you export
it. The SQL adds none on purpose, so the export has exactly the posted
columns. The warning is about speed on very large tables and can be
ignored.

Anyone with the link can insert rows: the key and the table name sit inside
every study link. Screen the table before scoring, as with a sheet. The page
never reads the table.

The table stores every value as text or as an integer, so a participant
code such as `=1+1` is stored as those four characters. A spreadsheet
program can still read such a cell as a formula when you open the exported
CSV in it. Read the file in R as shown above, where every column stays
text, or open it in the spreadsheet as text.

## Scoring

Read the files into R and score them with the hitop package.
`read_form_responses()` reads a folder of files saved for one form into one
data frame, with `item_order`, `prolific_study` and `prolific_session` as
character columns that are `NA` for a file without them. Pass its item columns to the scoring function for the form:
`score_hitopsr()`, `score_hitopbr()` or `score_pid5()`. For a PID-5 file, set
`version` to `"FULL"`, `"SF"` or `"BF"` to match the form:

```r
library(hitop)
responses <- read_form_responses("path/to/pid5bf-files")
items <- grep("^pid5bf_", names(responses), value = TRUE)
score_pid5(responses, items, version = "BF")
```

The package's
[Building HiTOP-SR Modules](https://jmgirard.github.io/hitop/articles/modules-hitopsr.html)
article describes the descriptor and scoring a module.

## Development

There is no build step: `index.html`, `link.html` and `form.js` are the site.
The Pages workflow publishes those three files with `LICENSE.md` and this
README, and nothing else in the repository.

The tests drive the page in a headless browser with Playwright:

```bash
npm ci
npx playwright install chromium
npx playwright test
```

| Spec | What it checks |
|---|---|
| `tests/render.spec.js` | For each of the five forms, the heading, item text, option labels and values, and order match the export. A descriptor's items render in its order. Under `shuffle: true`, the HiTOP-BR and the module render a rearrangement numbered 1 to n, and two loads differ; `shuffle: false` renders as no shuffle. The start screen's wording with and without a send address |
| `tests/link.spec.js` | The link builder offers the five forms, a link it builds opens each one, its module hint says HiTOP-SR only, it refuses a send address or a Supabase store the page would refuse, a link built with an address posts at Finish, and the SQL it shows for a Supabase table equals the hand-written fixtures, with and without the random-order box. The box's label and hint, the link it builds, and the rearranged page that link opens. The Prolific box's label and hint, the placeholders on the link it prints, its refusal beside a filled participant field, the completion field and its refusal of an `http://` address, and the SQL under the Prolific box against the two Prolific fixtures |
| `tests/walk.spec.js` | Pages of 15 and the refusal on a blank item, on the HiTOP-BR and a HiTOP-SR module |
| `tests/save.spec.js` | The saved CSV's header, values and file name, against the fixtures, for each of the five forms and a module. On a PID-5 form, a chosen 0 is written as `0`. Under `shuffle: true`, the HiTOP-BR and the module save `item_order` and the item columns in the instrument's order, each value checked at the position its item was shown at, and the committed shuffled capture agrees with its own `item_order`. Under `shuffle: false`, the HiTOP-BR saves the same file as with no shuffle field. Under `prolific: true` with the three parameters in the address, the identifier is the Prolific ID and the two Prolific columns follow `submitted` or `item_order`, against the by-rule fixture and the committed capture; a placeholder or absent parameter writes an empty cell; an absent, blank or placeholder ID shows the identifier field; the parameters without the field change nothing. With a completion URL and no store, the saved screen links to it and does not navigate |
| `tests/send.spec.js` | With a send address: one POST at Finish, its body against the fixture, the simple-request headers, a 302 to another origin followed, one POST on a double press, and the five unconfirmed outcomes that save the file. With a Supabase table: the insert's address, headers and body for both key shapes and a project URL ending in a slash or in `/rest/v1/`, one preflight per walk, a 401 or a refused connection saving the file, and the committed Supabase export against the fixture. Under `shuffle: true`, the row posted to a web address and to a Supabase table carries `item_order` and the instrument's order, and the Supabase row's keys equal the shuffle SQL fixture's columns. Under `prolific: true`, the row posted to a web address and to a Supabase table carries the two Prolific keys, with and without the random order, and the Supabase keys equal the Prolific SQL fixtures' columns. With a completion URL, a confirmed send navigates there once with no sent screen drawn first, and an unconfirmed send links to it and does not navigate. Against a recording endpoint the tests start themselves |
| `tests/guard.spec.js` | The version display and the refusals: an export whose `format` is not `"1.0"` or whose file fields are missing, a descriptor of another format, a blank participant identifier, a send address outside `https://` or the loopback exception the tests use, a Supabase store with a bad address, key or table name, a `shuffle` or `prolific` field that is not `true` or `false`, `prolific: true` beside a participant, and a `complete` field that is not an `https://` address free of a user name and password |
| `tests/network.spec.js` | Without a store, no request leaves the page except its own files and the one export fetch, on the HiTOP-BR and a HiTOP-SR module. With one, the further requests are the POST to it at Finish and any redirect it answers with, or the insert's address under a Supabase project URL, and with a completion URL the one navigation to it after the confirmed send |
| `tests/layout.spec.js` | On every page of the HiTOP-SR and the PID-5, at 320 px, 375 px and the default width, each item's text box lies inside its card's border on all four sides and does not overflow, the options start below it, no page scrolls sideways, and at least one wrapped item is measured. Each item on a first page is a group named by its position and text. A refused blank item's card has the error colour on all four borders |

`tests/fixtures/README.md` names the generator of every fixture. The Tests
workflow runs the suite on every pull request and every push to `main`,
against the checkout.
It runs every Monday against the deployed page, so a new package export that
breaks the page is noticed. On that run the send tests ask the browser for
permission to reach the local recording endpoint from the public page. If
the browser refuses, they skip with the reason printed.

## License

GPL-3, as the hitop package. See `LICENSE.md`.
