# Writes the two module descriptors the tests use, with the hitop package's
# own write_module(), so the fixtures are what a researcher's descriptor looks
# like. Run from the repository root with the hitop package installed:
#
#   Rscript tests/fixtures/make-descriptors.R
#
# Both descriptors hold the same two-scale HiTOP-SR module. One carries an
# itemOrder (a shuffle drawn under set.seed(95)); the other carries none. The
# module's item count (21) is deliberately more than one page of 15 and not a
# multiple of 15, so the walk crosses a page break and ends on a partial page.

library(hitop)

m <- hitop_module("hitopsr", scales = c("Distress-Dysphoria", "Agoraphobia"))
stopifnot(length(m$items) > 15, length(m$items) %% 15 != 0)

write_module(m, file.path("tests", "fixtures", "module-plain.json"))

set.seed(95)
attr(m, "item_order") <- sample(m$items)
write_module(m, file.path("tests", "fixtures", "module-shuffled.json"))
