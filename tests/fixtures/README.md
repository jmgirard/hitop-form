# Test fixtures

Every file here is generated. Regenerate a file with its generator rather than
editing it.

| File | Generator |
|---|---|
| `module-plain.json`, `module-shuffled.json` | `Rscript tests/fixtures/make-descriptors.R` from the repository root, with the hitop package installed. Both hold the same two-scale HiTOP-SR module (Distress-Dysphoria and Agoraphobia, 21 items). The shuffled one carries an `itemOrder` drawn under `set.seed(95)`. |
| `responses-hitopbr.csv`, `responses-hitopsr.csv`, `responses-module-shuffled.csv` | `WRITE_FIXTURES=1 npx playwright test tests/save.spec.js`. Each is one form saved by the page for study `fixture` and participant `p001`. Every item is answered by the fixed pattern `chosenIndex()` in `tests/helpers.mjs`. The `form_build` and `submitted` columns carry the export's build date and the clock at capture. The test compares every other column. |

The hitop package's reader for these files is still to be written. The three
CSV files are the samples it is meant to read in its own tests.
`.gitattributes` keeps their CRLF row endings as the page writes them.
