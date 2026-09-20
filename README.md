# hitop-form

A static page that shows a HiTOP-SR or HiTOP-BR questionnaire in the browser.
It saves each participant's answers to their own device as one CSV file.
No answer is sent anywhere. It is built for studies that collect
responses without a survey platform, and it scores nothing: scoring is the
job of the [hitop](https://jmgirard.github.io/hitop/) R package.

Live page: <https://jmgirard.github.io/hitop-form/>
Make a study link: <https://jmgirard.github.io/hitop-form/link.html>

The page reads the instrument from the hitop package's JSON export
(`https://jmgirard.github.io/hitop/downloads/hitopsr.json` and
`hitopbr.json`). Item text, response options and instructions are the
package's, shown unchanged. The export's build date and package version are
printed on the page, and the build date is written into every saved file.

## Make a study link

Open [link.html](https://jmgirard.github.io/hitop-form/link.html) and fill in
the form:

1. Choose the instrument, HiTOP-SR (405 items) or HiTOP-BR (45 items).
2. Give the study a name. The name is written into every saved file.
3. Optionally give a participant identifier. Leave it empty for one link
   shared with many participants. The page then asks each participant for an
   identifier before the form starts.
4. Optionally paste a HiTOP-SR module descriptor: the JSON file that the hitop
   package's `write_module()` wrote, or that the
   [Module Builder](https://jmgirard.github.io/hitop-builder/) saved beside
   your form. The page then shows only the module's items. When the
   descriptor records a printed order, the items follow it.

Press "Make the link". The link carries the instrument, the study, the
participant and the module folded into its address, so it needs no server and
no account. Copy it and send it to the participant. A link with a module
descriptor is a few hundred characters long. If a mail client or a course
system truncates it, the page reports that the link cannot be read.

The page's host, GitHub Pages, sees the address when the page is requested.
So the study name, the participant identifier and the module composition
reach that host's request logs. The answers never do. If the identifier must
not reach any server, leave it out of the link. The participant then types it
on the start screen, and it is written only into the saved file.

## What the participant sees

The link opens a start screen with the instrument's instructions, the item
count, and a "Begin" button. When the link carries no participant
identifier, the start screen asks for one.

The items follow, 15 to a page, numbered 1, 2, 3 in the order they appear.
Each item has one set of response options. Every item on a page must be
answered before the next page opens. If one is blank, the page names it by
the number printed beside it and by its place on that page. The cursor moves
to that item, and the page waits.

The last page ends with "Finish". Pressing it saves the file and shows the
file name. No answer leaves the page. Until then the answers live only in
the open page. If the participant reloads or closes the page, the browser
asks first. A reload starts the form over.

## Where the file lands

The file is saved where the participant's browser puts downloads. Its name is
`<instrument>_<study>_<participant>_<timestamp>.csv`, for example
`hitopbr_Pilot-A_p001_20260920T211531Z.csv`. Ask each participant to send you
the file the way your study collects documents.

The file has two rows. The header is
`study,participant,instrument,form_build,submitted` followed by one column
per item, named as the package names the items (`hitopbr_01`,
`hitopsr_233`). The item columns follow the order the participant saw. The
data row holds the study fields, the export's build date and the time of
saving as an ISO-8601 timestamp in UTC. Then comes each answer's numeric
value. Three example files are under `tests/fixtures/`.

## Scoring

Read the files into R and score them with the hitop package. The package's
[Building HiTOP-SR Modules](https://jmgirard.github.io/hitop/articles/modules-hitopsr.html)
article describes the descriptor and scoring a module. The package's reader
for these files is under development. Until it ships, read a file with
`read.csv(path, fileEncoding = "UTF-8")` (the file is UTF-8 with no byte
order mark) and pass the item columns to `score_hitopsr()` or
`score_hitopbr()`.

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
| `tests/render.spec.js` | Item text, option labels and order match the export. A descriptor's items render in its order |
| `tests/walk.spec.js` | Pages of 15 and the refusal on a blank item |
| `tests/save.spec.js` | The saved CSV's header, values and file name, against the fixtures |
| `tests/guard.spec.js` | The version display and the refusals: an export whose `format` is not `"1.0"` or whose file fields are missing, a descriptor of another format, a blank participant identifier |
| `tests/network.spec.js` | No request leaves the page except its own files and the one export fetch |

`tests/fixtures/README.md` names the generator of every fixture. The Tests
workflow runs the suite on every pull request and every push to `main`,
against the checkout.
It runs every Monday against the deployed page, so a new package export that
breaks the page is noticed.

## License

GPL-3, as the hitop package. See `LICENSE.md`.
