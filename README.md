# hitop-form

A static page that shows one of five questionnaires in the browser: the
HiTOP-SR, the HiTOP-BR, or the PID-5 in its full (PID-5), short (PID-5-SF) or
brief (PID-5-BF) form.
When a participant finishes, the page sends their answers as one JSON row to
an address the study link names. A Google Apps Script web app that appends
to a Google Sheet is one such address. When the link names no address, the
page saves the answers to the participant's own device as one CSV file, and
no answer is sent anywhere. It is built for studies that collect responses
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
   descriptor records a printed order, the items follow it.
5. Optionally give an address to send responses to. It is the `https://`
   address of an endpoint that accepts one JSON row per participant. The web
   app in [Send responses to a Google Sheet](#send-responses-to-a-google-sheet)
   below is one. The builder refuses an address that is not `https://`, with
   one exception for local testing: `http://` to `127.0.0.1` or `localhost`.
   Leave it empty and the page saves a file instead.

Press "Make the link". The link carries the instrument, the study, the
participant, the module and the address folded into its address, so it needs
no server and no account. Copy it and send it to the participant. A link with
a module descriptor is a few hundred characters long. If a mail client or a
course system truncates it, the page reports that the link cannot be read.

The page's host, GitHub Pages, sees the address when the page is requested.
So the study name, the participant identifier, the module composition and
the send address reach that host's request logs. The answers never do: with
a send address they go to that address and nowhere else, and without one
they stay on the participant's device. If the identifier must not reach any
server, leave it out of the link. The participant then types it on the start
screen, and it is written only into the row or the file.

## What the participant sees

The link opens a start screen with the instrument's instructions, the item
count, and a "Begin" button. The start screen says where the answers go.
With a send address, it names the address's host. Without one, it says the
answers are saved to a file on this device. When the link carries no participant identifier, the start
screen asks for one.

The items follow, 15 to a page, numbered 1, 2, 3 in the order they appear.
Each item has one set of response options. Every item on a page must be
answered before the next page opens. If one is blank, the page names it by
the number printed beside it and by its place on that page. The cursor moves
to that item, and the page waits.

The last page ends with "Finish". Until it is pressed the answers live only
in the open page. If the participant reloads or closes the page, the browser
asks first. A reload starts the form over.

With a send address, pressing Finish posts the answers to it and waits up to
30 seconds for the endpoint to confirm. The button is disabled while it
waits, so a second press sends nothing. On a confirmed send the page says
that the responses were sent to the study team, and no file is saved. Every
other outcome is unconfirmed: an error status, an answer that is not a
confirmation, a lost connection, or no answer within the limit. Then the
page saves the CSV file described below and says that the send could not be
confirmed. It names the file, so the participant can send it by hand.

Without a send address, pressing Finish saves the file and shows the file
name. No answer leaves the page.

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
`hitopsr_233`, `pid5_001`, `pid5sf_100`, `pid5bf_25`). The item columns follow
the order the participant saw. The data row holds the study fields, the
export's build date and the time of finishing as an ISO-8601 timestamp in
UTC. Then comes each answer's numeric value: 1 to 4 on the HiTOP forms and 0
to 3 on the PID-5 forms, as the export's response options number them. Six
example files are under `tests/fixtures/`, one per form and one for a
HiTOP-SR module.

## Send responses to a Google Sheet

With a send address, the page posts one JSON object per participant. Its
keys are the file's columns in the same order: `study`, `participant`,
`instrument`, `form_build`, `submitted`, then one key per item. Its values
are the same as the file's, with each answer as a JSON integer. The request
is a POST with the body as `text/plain`, sent from the page's origin. The
endpoint must answer with the JSON `{"ok":true}`. Any other answer makes the
page save the file instead.

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
   // header's order, and a key the header lacks is added to it. Every cell is
   // formatted as text before it is written, so "007" keeps its zeros. A value
   // that starts with "=" is written behind a leading apostrophe, the sheet's
   // mark for text, so "=1+1" stays the text =1+1 rather than a formula (the
   // text format alone does not stop the formula). Answers {"ok":true}.
   const SHEET_NAME = 'Responses';
   const asText = (v) => (v.startsWith('=') ? "'" + v : v);

   function doPost(e) {
     const row = JSON.parse(e.postData.contents);
     const lock = LockService.getScriptLock();
     lock.waitLock(30000);
     try {
       const book = SpreadsheetApp.getActiveSpreadsheet();
       const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
       let header = sheet.getLastRow() === 0
         ? []
         : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
       const missing = Object.keys(row).filter((k) => !header.includes(k));
       if (missing.length) {
         header = header.concat(missing);
         sheet.getRange(1, 1, 1, header.length).setNumberFormat('@').setValues([header]);
       }
       const values = header.map((k) => (k in row ? asText(String(row[k])) : ''));
       const at = sheet.getLastRow() + 1;
       sheet.getRange(at, 1, 1, values.length).setNumberFormat('@').setValues([values]);
     } finally {
       lock.releaseLock();
     }
     return ContentService.createTextOutput(JSON.stringify({ ok: true }))
       .setMimeType(ContentService.MimeType.JSON);
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

Anyone with the URL can post a row to the sheet, and only you can read it.
The page never reads the sheet.

To download the responses, open the sheet's `Responses` tab and choose File,
then Download, then Comma Separated Values (.csv). The file has one header
row and one row per participant, in the column order above. Read it in R
with `read.csv(file, colClasses = "character")` or
`readr::read_csv(file, col_types = readr::cols(.default = "c"))`. Either
call keeps a participant code such as `007` as text. Then score the item
columns as the next section describes. The file
`tests/fixtures/sheet-hitopbr.csv` is one such download, from two HiTOP-BR
walks against a web app deployed from the code above.

## Scoring

Read the files into R and score them with the hitop package.
`read_form_responses()` reads a folder of files saved for one form into one
data frame. Pass its item columns to the scoring function for the form:
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
| `tests/render.spec.js` | For each of the five forms, the heading, item text, option labels and values, and order match the export. A descriptor's items render in its order. The start screen's wording with and without a send address |
| `tests/link.spec.js` | The link builder offers the five forms, a link it builds opens each one, its module hint says HiTOP-SR only, it refuses a send address the page would refuse, and a link built with one posts at Finish |
| `tests/walk.spec.js` | Pages of 15 and the refusal on a blank item, on the HiTOP-BR and a HiTOP-SR module |
| `tests/save.spec.js` | The saved CSV's header, values and file name, against the fixtures, for each of the five forms and a module. On a PID-5 form, a chosen 0 is written as `0` |
| `tests/send.spec.js` | With a send address: one POST at Finish, its body against the fixture, the simple-request headers, a 302 to another origin followed, one POST on a double press, and the five unconfirmed outcomes that save the file. Against a recording endpoint the tests start themselves |
| `tests/guard.spec.js` | The version display and the refusals: an export whose `format` is not `"1.0"` or whose file fields are missing, a descriptor of another format, a blank participant identifier, and a send address outside `https://` or the loopback exception the tests use |
| `tests/network.spec.js` | Without a send address, no request leaves the page except its own files and the one export fetch, on the HiTOP-BR and a HiTOP-SR module. With one, the further requests are the POST to it at Finish and any redirect it answers with |

`tests/fixtures/README.md` names the generator of every fixture. The Tests
workflow runs the suite on every pull request and every push to `main`,
against the checkout.
It runs every Monday against the deployed page, so a new package export that
breaks the page is noticed. On that run the send tests ask the browser for
permission to reach the local recording endpoint from the public page. If
the browser refuses, they skip with the reason printed.

## License

GPL-3, as the hitop package. See `LICENSE.md`.
