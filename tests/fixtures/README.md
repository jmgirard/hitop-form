# Test fixtures

Every file here is generated. Regenerate a file with its generator rather than
editing it.

| File | Generator |
|---|---|
| `module-plain.json`, `module-shuffled.json` | `Rscript tests/fixtures/make-descriptors.R` from the repository root, with the hitop package installed. Both hold the same two-scale HiTOP-SR module (Distress-Dysphoria and Agoraphobia, 21 items). The shuffled one carries an `itemOrder` drawn under `set.seed(95)`. |
| `responses-hitopbr.csv`, `responses-hitopsr.csv`, `responses-module-shuffled.csv`, `responses-pid5.csv`, `responses-pid5sf.csv`, `responses-pid5bf.csv` | `WRITE_FIXTURES=1 npx playwright test tests/save.spec.js`. Add `-g <pattern>` to rewrite only the files of the cases whose names match it (`-g pid5` rewrites the three PID-5 files). Each is one form saved by the page for study `fixture` and participant `p001`. Every item is answered by the fixed pattern `chosenIndex()` in `tests/helpers.mjs`. The `form_build` and `submitted` columns carry the export's build date and the clock at capture. The test compares every other column. |
| `supabase-hitopbr.sql`, `supabase-module-shuffled.sql` | Hand-written on 2026-09-23, never captured from the builder. The shape follows the Supabase row-level-security guide (<https://supabase.com/docs/guides/database/postgres/row-level-security>): `alter table … enable row level security` and `create policy … for insert to <role> with check (…)`. The five text columns are the saved file's first five columns. The item columns are the hitop package's item names: `hitopbr_01` to `hitopbr_45` for the HiTOP-BR, and `hitopsr_` plus the three-digit item number for the module, in the `itemOrder` of `module-shuffled.json`. The names were typed out by a five-line Python loop over those two rules and the descriptor, not by the page. The test compares the builder's SQL with each file byte for byte. |
| `sheet-hitopbr.csv` | A hand run, not a script. On 2026-09-23 two HiTOP-BR walks were sent from the checkout to a Google Apps Script web app. The app was deployed from the `doPost` code in the top-level README. The walks used study `fixture`, participants `=1+1` and `007`, and answers by `chosenIndex()`. The deployment ran the code as the README shows it at this commit. That code writes every cell behind an apostrophe and refuses keys outside `a-z`, `0-9` and `_`. It was the third deployment of the day. The first stored `=1+1` as `2`, and a probe with an array body showed the second was running stale code. The sheet's `Responses` tab was then downloaded as CSV (File, Download, Comma Separated Values) and copied here unchanged. It equals the two posted bodies field for field, `submitted` included. Google writes CRLF row endings and no terminator after the last row. |

The hitop package's `read_form_responses()` reads the HiTOP-SR, HiTOP-BR and
module files in its own tests, from copies in its `tests/testthat/fixtures/`.
The package has no PID-5 reader tests yet. The three PID-5 files are the
samples for them.
`.gitattributes` keeps the CSV files' CRLF row endings as the page writes them.
