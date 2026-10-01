# hitop-form

A static page that shows one of five questionnaires in the browser: the
HiTOP-SR, the HiTOP-BR, or the PID-5 in its full (PID-5), short (PID-5-SF) or
brief (PID-5-BF) form. A link can also give two or three of them, one after
another, in one session.
When a participant finishes, the page sends their answers as one JSON row to
where the study link says responses go: a web address, such as a Google Apps
Script web app that appends to a Google Sheet, or a table in a Supabase
project. When the link names neither, the page saves the answers to the
participant's own device as one CSV file, and no answer is sent anywhere. It is built for studies that collect responses
without a survey platform, and it scores nothing: scoring is the job of the
[hitop](https://jmgirard.github.io/hitop/) R package.

Live page: <https://jmgirard.github.io/hitop-form/>
Study Link Builder: <https://jmgirard.github.io/hitop-form/link.html>

The page reads each instrument from the hitop package's JSON export
(`https://jmgirard.github.io/hitop/downloads/hitopsr.json`, `hitopbr.json`,
`pid5.json`, `pid5sf.json` and `pid5bf.json`). Item text, response options and instructions are the
package's, shown unchanged. The export's build date and package version are
in the closed "Details for the study team" section at the foot of each
screen after the instrument files load. The build date is also written into every row and file.

## The Study Link Builder

Open the [Study Link Builder](https://jmgirard.github.io/hitop-form/link.html)
to make a study link: a link that opens the online form with your choices
built in. The page shows the required parts first: the instruments,
the study name and where responses go. Five optional sections follow, each
closed until you open it. A section's summary reads "Not used", or it lists
the labels of its fields that hold a value ("Question 1", "Question 2" and
so on in the questions section). Fill in what you need and press
"Make the link". When the builder refuses a field, it opens the field's
section and moves focus to the field. A refusal of the instruments list
moves focus to the instrument at fault: the second of a repeated
instrument, or the second PID-5 form. A refusal that names no one field
moves focus to the message.

### Required parts

1. Instruments. Choose HiTOP-SR (405 items), HiTOP-BR (45 items), PID-5
   (220 items), PID-5-SF (100 items) or PID-5-BF (25 items). To give two or
   three in one session, press "Add an instrument", as
   [Give more than one instrument](#give-more-than-one-instrument) describes.
2. Study name. The name is written into every row and file.
3. Where responses go, as the next section describes.

### Where responses go

"A file on the participant's device" is the default. The page saves a file
on the participant's device and sends nothing. "A web address" is the
`https://` address of a server that takes one JSON row per participant. The
web app in [Send responses to a Google Sheet](#send-responses-to-a-google-sheet)
is one. "A Supabase table" takes the project URL, its publishable key and a
table name, as [Send responses to Supabase](#send-responses-to-supabase)
describes. The builder refuses an address that is not `https://`, with one
exception for local testing: `http://` to `127.0.0.1` or `localhost`. A
table name must be lower-case letters, digits and underscores, up to 63 of
them, and its first character must not be a digit.

### Participants and recruiting site

The "Participant" field takes one participant's identifier. Leave it empty
for one link shared with many participants. The page then asks each
participant for an identifier before the form starts.

A recruiting site passes each participant's identifier in the study link's
address. Choose Prolific, SONA, CloudResearch Connect or another site in
the "Recruiting site" menu, and leave the participant field empty. SONA,
Connect and other sites are described in
[Recruit through SONA or CloudResearch Connect](#recruit-through-sona-or-cloudresearch-connect).

For Prolific: Prolific fills a participant's ID, the study's ID and the
submission's ID into a study URL through the placeholders
`{{%PROLIFIC_PID%}}`, `{{%STUDY_ID%}}` and `{{%SESSION_ID%}}`
([Prolific's API reference, the study object](https://docs.prolific.com/api-reference/studies/the-study-object)),
and asks that all three be saved
([What survey / experimental software is compatible with Prolific?](https://researcher-help.prolific.com/en/articles/445178-what-survey-experimental-software-is-compatible-with-prolific)).
With Prolific chosen, the printed link ends in those three placeholders.
Paste it as the study URL on Prolific. The page then takes the Prolific ID
from its address as the participant identifier and asks for none. Two more
lead columns, `prolific_study` and `prolific_session`, hold the other two,
after `submitted` (and after `item_order` under the random order). When the
address carries no Prolific ID, a blank one, or still the placeholder, the
page asks for the identifier as for a link without one. A preview on
Prolific passes a 24-character ID
([Previewing your study](https://researcher-help.prolific.com/en/articles/445131-previewing-your-study)),
so it walks the form as a participant would. Prolific's "I'll use URL
parameters" option appends the three parameters to the study URL itself
([the compatibility article](https://researcher-help.prolific.com/en/articles/445178-what-survey-experimental-software-is-compatible-with-prolific),
under "Recording participants' Prolific IDs"). So a pasted link with the
builder's placeholders carries each parameter once, unless that option adds
it again. Then the address holds the parameter twice, and the page reads the
first value that is neither blank nor a placeholder.

### Item order and HiTOP-SR module

The "Module file" field takes a HiTOP-SR module file: the JSON file that
the [Module Builder](https://jmgirard.github.io/hitop-builder/) or the
hitop package's `write_module()` saved. Paste its contents, or choose the
file with "Choose the module file", which puts its text in the field and
names the file under the control. The browser reads the file and sends it
nowhere. An edit to the field clears the line that names the file. With
several instruments, the module applies to the HiTOP-SR among them. The page
then shows only the module's items. When the module file records a printed
order, the items follow it, unless the random-order box is checked. The
module file's `items` must be in ascending order, as both writers list
them. The online form and the Study Link Builder refuse a module file whose
items are not, and name the fault.

Check "Show the items in a random order", and the page draws a new order
each time it opens, so each participant sees the items in a different
order. The row and the file still list the items in the instrument's order
under their item names, and a sixth lead column, `item_order`, records the
order that participant saw. A module's printed order is not followed.
[Where the file lands](#where-the-file-lands) describes the file.

### Consent

The "Consent text", "Declined text" and "Completion URL after a decline"
fields show your consent text before the form, as
[Show consent text before the form](#show-consent-text-before-the-form)
describes.

### When the participant finishes

The "Completion URL" field takes an `https://` address. When the responses
reach the web address or the Supabase table, the page shows the sent
screen, with a link to the address in place of "You can close this page.",
and then sends the participant there. After a saved file it shows the file
name and then a link to the address. For Prolific, use the completion URL
on the study's setup page, of the form
`https://app.prolific.com/submissions/complete?cc=…`, as
[the compatibility article](https://researcher-help.prolific.com/en/articles/445178-what-survey-experimental-software-is-compatible-with-prolific)
shows under "Returning Participants to Prolific". Redirecting the
participant there is the return Prolific recommends
([Data collection](https://researcher-help.prolific.com/en/articles/445127-data-collection)).

Only beside a completion URL, you can give a second `https://` address as
the "Completion URL after a saved file". The saved-file screens then link
to it in place of the completion URL, and a confirmed send still goes to
the completion URL. For Prolific, this is the study's completion code for
a saved file. A study can hold one completion code per outcome, each with
its own `?cc=` address
([Custom completion codes](https://researcher-help.prolific.com/en/articles/445170-custom-completion-codes);
the address shape is under `completion_codes` in
[the API reference](https://docs.prolific.com/api-reference/studies/the-study-object)).

Where a completion address must carry the participant's own identifier, as
SONA's does, write `{participant}` after its `?` or `#`. The page replaces
each `{participant}` with the identifier, encoded for an address, before it
sends the participant there or links to it. The builder refuses
`{participant}` in the host or the path. It also refuses another spelling
of the token that the page would not fill: another letter case, doubled
braces, a space inside the braces, or a brace written as `%7B`, `%7D`,
`%257B` or `%257D` (`{Participant}`, `{{participant}}`,
`%7Bparticipant%7D`).

### Your own questions

Questions of your own are asked before or after the form, as
[Ask your own questions](#ask-your-own-questions) describes. You can also
write them in a spreadsheet, as
[Write your questions in a spreadsheet](#write-your-questions-in-a-spreadsheet)
describes.

### Your study link

Press "Make the link". A region headed "Your study link" then shows the
link in a box that scrolls, with a "Copy the link" button beside it. Below
the box, one sentence names the next step for your choices. With a
recruiting site, it says to paste the link into your study's page on that
site. With a Supabase table, it says to run the SQL shown under the link
first. Otherwise it says to open the link once to test it, and then to give
it to each participant. "Open the link" opens it in a new tab, and the
number beside it is the link's length in characters. If a field changes
while the link is being made, no link is shown, and a message asks you to
press "Make the link" again.

The link carries the instruments, the study, the participant, the module,
the random-order choice, the recruiting site, the completion URLs, the
consent text, the questions and where responses go, all in its address. So
it needs no server and no account. A link with a module file is a few
hundred characters long. If a mail client or a course system truncates it,
the online form reports that the link cannot be read.

A link without consent text or questions carries its fields in one
address parameter, `c`: the fields as JSON, written as base64url. A link
with consent text or questions carries them in `z` in place of `c`. That is
the same JSON packed with deflate-raw, then written as base64url with no
padding, so a long consent text or many questions make a shorter link. The
online form reads either one and refuses a link that carries both. It also
refuses a `z` it cannot read, and names the fault. The faults are a
character outside base64url, data that does not unpack, and more than
100,000 bytes once unpacked. Text that is not UTF-8 or not JSON is refused
too. A browser without `DecompressionStream`, or without its `deflate-raw`
format, cannot read a `z` link, and the online form then names the browser
as the cause.

### Edit a study link

Open a study link on the Study Link Builder to edit it: put its `c=…` or
`z=…` after `link.html?`, as in `link.html?c=…` or `link.html?z=…`. The
builder fills its fields from the link, so the link can be edited and made
again. The instruments, the study, the participant, the module file, the
random-order box, the recruiting site, the completion URLs, the consent and
declined texts, the questions and where responses go are filled. A section
that holds a filled field opens, and the other sections stay closed. The
site is Prolific for a link with `prolific: true`, SONA for one whose
`participantParam` is `id`, CloudResearch Connect for `participantId`, and
another site, with its name in the "Address parameter" field, for any other
name. Another page can hand a module over the same way: a `c` that carries
only `instrument` and `module` fills those two fields and leaves the rest
for you. The builder refuses a link it cannot read, one that does not hold
a form, or one naming an instrument it does not offer, and fills no field
from it.

Anyone can send a link, so an opened link can fill in addresses you did not
choose. When it puts a non-empty address in the web address, the Supabase
project URL, the completion URL, the completion URL after a saved file or
the completion URL after a decline, a notice above the form lists each one
after its field's name. Check them before you make a link. The notice goes
when you press "Make the link". When the page opens, focus moves to the
refusal or to the notice, whichever is shown.

### What the page's host sees

The page's host, GitHub Pages, sees the address when the page is requested.
So the study name, the participant identifier, the module composition, the
consent text and where responses go, a Supabase key included, reach that
host's request logs. The answers never do. With a web address or a
Supabase table they go there and nowhere else, and without one they stay on
the participant's device. If the identifier must not reach any server,
leave it out of the link. The participant then types it on the start
screen, and it is written only into the row or the file. Under the Prolific
route the three Prolific parameters, the participant's Prolific ID among
them, reach the host with each page load as the rest of the address does.
Under a recruiting site's parameter, so does the identifier it carries.
Opening a link on the Study Link Builder to edit it (`link.html?c=…` or
`link.html?z=…`) sends the same setup to the host in that page's address.
The setup, a Supabase key included, then reaches the host's request logs
from that request too.

## Recruit through SONA or CloudResearch Connect

A recruiting site other than Prolific can pass each participant's
identifier to the page in the study link's address, under a parameter of
its own. Choose the site in the builder's "Recruiting site" menu and leave
the participant field empty. The link then carries `participantParam`, the parameter's name, and
the page takes the participant identifier from that parameter. When the
address carries no value for it, a blank value, or a placeholder the site
did not fill (a value of the form `%…%` or `{{…}}`), the page asks for the
identifier as for a link without one. The file and the table gain no
column: the identifier is the `participant` column.

**SONA.** SONA replaces the text `%SURVEY_CODE%` in a study's Study URL
with a number unique to the participant
([Using the SURVEY CODE Feature](https://www.sona-systems.com/researcher/using-the-survey-code-feature/)).
Its Qualtrics guide has the Study URL end in `?id=%SURVEY_CODE%`
([Qualtrics Help Page](https://www.sona-systems.com/help/qualtrics/)).
With SONA chosen, the builder sets `participantParam` to `id` and the
printed link ends in `&id=%SURVEY_CODE%`. Paste it as the Study URL in SONA.
SONA's client-side completion URL has the form
`https://yourschool.sona-systems.com/webstudy_credit.aspx?experiment_id=123&credit_token=…&survey_code=XXXX`,
and the external study must put the participant's survey code in place of
`XXXX`
([External Study Credit Granting](https://www.sona-systems.com/researcher/external-study-credit-granting/)).
Give that address as the completion URL with `{participant}` in place of
`XXXX`. After a confirmed send the page sends the participant there with
their code filled in, and SONA grants the credit. After a saved file it
links there, or to the completion URL after a saved file when you give one,
which takes `{participant}` the same way.

The client-side completion URL carries a key specific to the study, and
SONA says that a participant can read it, because their browser loads
the URL, and can use it to try other survey codes and so grant credit to
other participants
([Security Considerations](https://www.sona-systems.com/researcher/security-considerations/)).
In a hitop-form link the address sits inside the study link, so a
participant can read the key before they finish, not only at the end. SONA
names the server-side completion URL as the alternative. The external study
loads that URL from its own server, and this page has no server.
A participant does not need to read the key to try another code. If the
address carries no survey code, for example because the participant
removed `id` from it, the start screen asks for the identifier. The page
then puts whatever the participant types into the completion URL.

**CloudResearch Connect.** Connect asks studies to record each
participant's Connect ID from a variable named `participantId`, and to end
either with a completion code or with the completion redirect URL Connect
gives the study
([How to Integrate your Survey with Connect](https://connect-researcher-help.cloudresearch.com/hc/en-us/articles/21181529476500-How-to-Integrate-your-Survey-with-Connect)).
With Connect chosen, the builder sets `participantParam` to `participantId`
and adds nothing to the link. Give the link as the project URL in Connect,
and the completion redirect URL as the completion URL. Connect's two further
IDs, `assignmentId` and `projectId`, are not recorded.

**Another site.** Choose "Another site" and type the parameter's name into
the "Address parameter" field: letters `A-Z` and `a-z`, digits, `_`, `.`
and `-`, up to 64 of them. The names `c` and `z` are refused, because they
carry the link itself, and so are the three Prolific names, which the
Prolific choice reads. The builder also refuses `id` and `participantId`, the names the
SONA and Connect choices write, and names the choice to use instead. The
builder reads a link with either name back as SONA or Connect, so every
link it builds opens again under the choice that made it. The online form
itself accepts both names. The builder adds nothing to the
link, so put the site's own placeholder on the link's end by hand if the
site needs one.

## Show consent text before the form

The consent text is yours and your review board's. The page shows the text
you give and adds no consent wording of its own. Put the text your board
approved into the builder's "Consent text" box. The link then carries it as
its `consent` field, and the page shows it on a screen of its own, headed
"Consent to take part", before the start screen. Under the text are an "I
agree" and an "I do not agree" button. "I agree" opens the start screen,
and the form goes on as it does without consent text.

The page reads the text as plain text. A run of blank lines starts a new
paragraph, where a blank line is empty or holds only white space. A single
line break stays a line break. A tag or an entity in the text, such as
`<b>` or `&amp;`, shows as typed, so the text cannot carry formatting or
links. The text can hold up to 20,000 characters. The count is the length
JavaScript gives a string, so a character such as 😀 counts as two.
The builder and the page refuse a text that is blank or over the limit.
They also refuse a text that holds half of a two-part character.

"I do not agree" first asks "Are you sure you do not agree to take part?".
The consent text stays on screen, and "Yes, I do not agree" and "Go back"
take the place of the two buttons. "Go back" shows the consent screen
again. "Yes, I do not agree" shows a screen headed "Thank you". The page
sends no answer and saves no file, and the screen has no way back to the
form. The
page keeps no record of the choice, so a reload of the link shows the
consent screen again. The screen shows the text of the "Declined text" box,
split into paragraphs in the same way. That text can hold up to 2,000
characters. Without one, the screen shows "You chose not to take part. You
can close this page." With a completion URL after a decline, described
next, the fixed text ends at "You chose not to take part."

A recruiting site can give a study one completion address per outcome. For
example, a Prolific study can hold a completion code for participants who
do not consent
([Custom completion codes](https://researcher-help.prolific.com/en/articles/445170-custom-completion-codes)).
Give that address as the "Completion URL after a decline". The link then
carries it as `completeDeclined`, and the page accepts it only beside
`consent`. After "Yes, I do not agree", the page draws the declined screen
with a "Continue to the next step of the study" link to the address. It then sends the participant
there. A `{participant}` in the address is filled as in the completion URL,
with the identifier from the page's address or from the link. The start
screen has not asked for one yet, so without either the token becomes
nothing.

A link with consent text is a `z` link, as
[Your study link](#your-study-link) describes. The consent text reaches
the page's host in the address, as the rest of the link does.

## Ask your own questions

A link can carry questions of your own, such as age or how the participant
heard of the study. In the builder's "Your own questions" part, press "Add
a question" once for each question. For each question, choose whether it
is asked before or after the form, and give a name, the question and a
type. "Move up", "Move down" and "Remove" change the list. A link holds up
to 50 questions. The page reads at most 100,000 bytes of setup, so the
builder refuses a link whose setup is larger, and names its size. The link carries them as its `questions` field, with a
`before` list and an `after` list. Each list keeps the builder's order.

The page asks the before questions on a screen headed "Before you begin".
That screen comes ahead of the start screen, and after the consent screen
when the link has one. It has a "Next" button and no "Back". The page asks
the after questions on a screen headed "Before you finish", after the last
item page. That item page then carries "Next" in place of "Finish", and
the question screen carries "Back" and "Finish". The questions never share
a screen with the items. Each question is numbered on its screen, and a
required one ends in "(required)". The page shows the question text and the
option labels as plain text, as it shows consent text.

A question has one of four types. Each answer is written as text:

| Type | The participant | The answer's column holds |
|---|---|---|
| Text, one line | types one line | the answer as typed |
| Whole number | types a whole number | the number in digits, with no leading zero and a minus sign only below zero, so `007` is `7` and `-0` is `0` |
| One of several options | picks one option | the option's number, counted from 1 |
| Any of several options | picks any number of options | the numbers of the picked options in ascending order, separated by single spaces, such as `1 3` |

An unanswered question writes an empty cell. The hitop package's
`read_form_responses()` reads it as `NA`.

The options of a question are numbered by their order in the link, one per
line in the builder's "Options" box. If you change the order of the options
between two links of one study, the same number means different options in
the two sets of files. Keep the order the same in every link of a study.
A question holds 2 to 20 options. Each option is one line of up to 200
characters, without `|`. Two options of one question must not be the same
once the page removes spaces at their ends.

"Next" and "Finish" check the answers on their screen in order. A required
question with no answer stops the page, which then says "Please answer
question 2 before continuing." with that question's number. A text answer
of spaces alone counts as no answer. A whole-number answer must be an
optional minus sign and digits. Give a minimum, a maximum or both to limit
it. The page then shows the range under the question, such as "A whole
number from 18 to 99.", and refuses a number outside it: "Question 1 needs
a whole number from 18 to 99." The cursor moves to the refused question.

The name gives the answer's column: `q_` plus the name, such as `q_age`. A
name is a lower-case letter followed by lower-case letters, digits and
`_`, up to 30 characters in all. Two questions must not share a name. The
question columns come after the item columns in the file, the posted row
and the Supabase table. The before list comes first, and each list keeps
the link's order. A question text is one line of up to 1,000 characters.
The builder refuses a question that breaks one of these rules and names it
by its number in the builder. The page refuses such a link and shows no
form. Its message names the question by its list and its place there, such
as "question 2 of the before list".

The Supabase SQL from the builder adds one text column per question. A
table made before the questions were added has no column for them. The API
then refuses the row, and the page saves the file instead. The row's keys
come from the question names alone. If you add a question or change a
name, make a new table from the builder's SQL. A change to a question's
text, type, options or order keeps the same columns.

A link with questions is a `z` link, as
[Your study link](#your-study-link) describes.

To write the questions in a spreadsheet instead, see
[Write your questions in a spreadsheet](#write-your-questions-in-a-spreadsheet).

## Write your questions in a spreadsheet

The builder can read the questions from a CSV file, so you can write them
in a spreadsheet. Press "Download a template" to save
`questions-template.csv`. It holds the columns and one example question of
each type. Open it in your spreadsheet, change the rows, and save the file
as "CSV UTF-8". Then choose the file under "Load questions from a file".
The questions in the file take the place of the questions in the builder.
The builder reads the file in your browser and sends it nowhere.

"Download these questions" saves the builder's questions as
`questions.csv`, in the same form. Use it to edit questions you made in
the builder, or to keep them for another link. It first checks the
questions as "Make the link" does. If a question breaks a rule, it saves
nothing and names the fault, so every file it saves loads back. A saved
file is UTF-8 with a byte-order mark, a mark at its start that tells a
spreadsheet the file is UTF-8, and its lines end in CR LF.

The first row of the file names the columns, in lower case and in any
order. Each further row is one question:

| Column | Required | Holds |
|---|---|---|
| `list` | yes | `before` or `after`, in lower case: the page asks the question before the form or after it |
| `name` | yes | the question's name, which gives its column `q_` plus the name |
| `text` | yes | the question, one line |
| `type` | yes | `text`, `number`, `choice` or `multi`, in lower case: in the builder, "Text, one line", "Whole number", "One of several options" or "Any of several options" |
| `options` | no | for `choice` and `multi`, the options in one cell, separated by `\|`, such as `Phone\|Tablet\|Computer` |
| `required` | no | `yes` or `no`, in any mix of upper and lower case, and a blank cell is `no` |
| `min`, `max` | no | for `number`, a whole number such as `18` or `-5`, or a blank cell |

The builder first reads any quotes around a cell's value. It then removes
white space, such as spaces, tabs and line breaks, at both ends of the
value. A quoted cell must start with its quote and end with its closing
quote. A space before the opening quote or after the closing quote is a
fault.
The builder skips a row whose cells are all blank. Each list
keeps the order of the rows. A cell can hold a comma or a double quote. The
spreadsheet then writes the cell in quotes, and the builder reads it back.
Each question follows the rules of
[Ask your own questions](#ask-your-own-questions).

The builder refuses a file with a fault, names the fault, and keeps the
questions it held. A fault in one cell is named by its row and column,
such as "row 3, column type". A fault in a cell of the header row, or in a
cell past the last column, is named by its field number, such as "row 1,
field 2". The header is row 1, and a cell that holds a
line break stays in its row. A file that is not UTF-8 is refused with a
request to save it as "CSV UTF-8", and so is a file in UTF-16. The builder
also refuses an empty file
and a file with no question row. It refuses a missing, unknown or repeated
column name, and a row with more or fewer cells than the header. It
refuses a quote that breaks the CSV rules too.

## Give more than one instrument

A link can give two or three instruments, one after another, in one
session. In the builder's "Instruments" part, press "Add an instrument" to
add a row, up to three. Choose an instrument in each row. "Move up", "Move
down" and "Remove" change the order and the rows. The page gives the
instruments in the order of the rows. One row makes a link with an
`instrument` field, as before. Two or three rows make a link with an
`instruments` field, a list of the instruments' names in order, such as
`["hitopbr", "pid5bf"]`.

The builder and the page refuse a list that names one instrument twice, or
two forms of the PID-5 (`pid5`, `pid5sf` and `pid5bf`). The page also
refuses a link with both an `instrument` and an `instruments` field. It
refuses an `instruments` field that is not a list or holds fewer than 2 or
more than 3 names. It refuses an entry that is not the text of a name it
knows. A module file applies to the HiTOP-SR in the list. The
builder and the page refuse a module beside a list without `hitopsr`.

The page fetches the export of each instrument before it shows the first
screen. When an export cannot be used, the page names the instrument, such
as `PID-5-BF: The instrument could not be fetched from …`.

The screens come in this order:

1. With consent text in the link, the consent screen.
2. With questions before the form, the "Before you begin" screen.
3. For each instrument in turn, its start screen and then its item pages.
4. With questions after the form, the "Before you finish" screen.

Each start screen shows the instrument's name and its part, such as
"Part 2 of 3". Then come its instructions and its own item and
page counts. Only the first start screen says where the answers go. When
the page holds no participant identifier, only the first asks for one. The
item numbers and the page numbers start again at 1 for each instrument. The
first page of each instrument has no "Back". The last page of each
instrument but the last carries "Next", which opens the next start screen.
"Back" on the "Before you finish" screen goes to the last page of the last
instrument. Under the random order, each instrument's items are shuffled
among that instrument's items only.

The file and the row hold one group of item columns per instrument, in the
link's order. The `q_` columns follow the last group. The `instrument`
cell holds the instruments' names joined by single spaces, such as
`hitopbr pid5bf`. The `form_build` cell holds each export's build date in
the same order, joined by single spaces. Under the random order, the
`item_order` cell holds one group per instrument, joined by ` | `, such as
`3 1 2 | 2 1`. The file name starts with the names joined by `-`, such as
`hitopbr-pid5bf_Pilot-A_p001_20260920T211531Z.csv`. The builder's Supabase
SQL makes one column per item in the same groups. After the instrument
files load, the "Details for the study team" section of each screen holds
one version line per instrument.
Read the file with `read_form_responses()`.
Then score each instrument in its own call, with its columns chosen by name,
as [Scoring](#scoring) shows.

## What the participant sees

The link opens a start screen with the instrument's instructions, the item
count, and a "Begin" button. A link with several instruments gives each
its own start screen and pages, as
[Give more than one instrument](#give-more-than-one-instrument) describes.
A link with consent text shows its consent screen first, and the start
screen after "I agree". A link with questions before the form shows them
next, and the start screen after "Next". The start screen says where the
answers go. With a send address, it says they are sent to the study team.
If the page gets no confirmation that they arrived, they are saved as a
file on this device. It names
no address. Without one, it says the answers are saved to a file on this
device. When the link carries no participant identifier, the start screen
asks for one. A hint under the "Participant identifier" label asks for the
identifier exactly as the participant received it. It names no source, so
it fits an identifier from the study team or from a recruiting site. The
field asks a phone keyboard not to
capitalize, correct or spell-check it, and Enter in it works as "Begin"
does. Under the Prolific route the identifier is the Prolific ID in the
page's address, and the start screen asks only when the address carries
none.

An identifier must be text that can be written into an address. The
browser holds some characters, such as an emoji, as two halves, and the
page needs both. When a link's participant holds
a lone half, the page refuses the link and shows no form. When a typed
identifier holds one, the start screen asks for it again. The link
builder refuses one in its participant field, which only a loaded `c` can
fill that way. An identifier
read from the address never holds a lone half, because the browser
replaces each broken byte sequence there with one or more U+FFFD
replacement characters.

The items follow, 15 to a page, numbered 1, 2, 3 in the order they appear.
Under the random order, that order is drawn when the page opens, and a
reload draws another. Each item has one set of response options, and each
option's target is at least 44 px high. Each item page shows "Page 2 of 3"
above the items and again beside "Next" or "Finish". With more than one
instrument it also shows the part, such as "Part 1 of 2 · Page 2 of 3". A
closed "Instructions" section above the items holds the instrument's
instructions. Every item on a page must be answered before the next page
opens. If items are blank, the page marks each of them "Please answer this
item". A line directly above the first of them counts them, such as "3
items on this page have no answer yet." The page scrolls there, the cursor
moves to that item, and the page waits. Each answer to a marked item takes
its mark away and lowers the count, and the count goes with the last mark.
The count is an alert for screen readers. It is on the page, empty and
hidden, before any press. Its text changes only with a new number. An
answer that leaves the number is not read out again.

The last page ends with "Finish". Until it is pressed the answers live only
in the open page. If the participant reloads or closes the page, the browser
asks first. A reload starts the form over.

With a web address or a Supabase table, pressing Finish posts the answers
to it and waits up to
30 seconds for it to confirm. The button is disabled while it
waits, so a second press sends nothing. The screen with Finish has an
empty status line above the buttons. The press writes "Sending your
answers. Please keep this page open." into it, so the text changes in a
status region already on the screen. On a confirmed send the
page says that the answers were sent to the study team, and no file is
saved. Every other outcome is unconfirmed: an error status, an answer from
a web address that is not a confirmation, a lost connection, or no answer
within the limit. Then the page saves the CSV file described below, on a
screen headed "Your answers were not sent". The screen says that the page
got no confirmation that the answers reached the study team. It does not
say that they were lost, since the study team can still have the row.
It says that the file holds the participant's
answers, and names it, so the participant can send it by hand. The reason the send failed is only in the screen's closed
"Details for the study team" section.

When the page cannot show the form at all, it shows "This form cannot be
shown" and one sentence for the participant. When the fetch of an
instrument's file gets no answer, the sentence says to check the connection
and reload. When the site answers it with an error status, the sentence
says to contact the study team. When the
browser cannot unpack a `z` link, it says to open the link in another
browser. For any other fault, it says to contact the study team. The
fault itself is in the closed "Details for the study team" section.

Without a send address, pressing Finish saves the file and shows the file
name. No answer leaves the page.

Each screen that names a saved file ends its instructions with "If the
file did not appear, press Save the file." A "Save the file" button sits
under them. A press saves the same file again, with the same content,
offered under the same file name (the browser can add a number to keep
both copies). It also shows "The file was saved again." under the
button, in a `role="status"` region, which screen readers are meant to
announce. The page does not move focus, so after a keyboard press focus
stays on the button. A second press does so again and writes the
sentence afresh. The download after an
unconfirmed send starts only when the wait ends, up to 30 seconds after
Finish, and a participant can dismiss the download on either screen.

With a completion URL in the link, a confirmed send shows the sent screen
with a "Continue to the next step of the study" link to that address. The
link takes the place of "You can close this page.", and the page then takes
the participant there. Each screen that names a saved file shows a link with
the same words after the file name and the "Save the file" button. The page
goes there only when the participant follows it. No screen shows the
address's host. That link is to the
completion URL after a saved file when the link carries one, else to the
completion URL.

## Where the file lands

Without a send address, and with one when the send is not confirmed, the
file is saved where the participant's browser puts downloads. Its name is
`<instrument>_<study>_<participant>_<timestamp>.csv`, for example
`hitopbr_Pilot-A_p001_20260920T211531Z.csv` or
`pid5sf_Pilot-A_p001_20260920T211531Z.csv`. Under an `instruments` link,
the name starts with the instruments' names joined by `-`. Ask each
participant to send you the file the way your study collects documents.

The file has two rows. The header is
`study,participant,instrument,form_build,submitted` followed by one column
per item, named as the package names the items (`hitopbr_01`,
`hitopsr_233`, `pid5_001`, `pid5sf_100`, `pid5bf_25`). Without the random
order, the item columns follow the order the participant saw. With it, a
sixth lead column, `item_order`, follows `submitted`. It holds the item
numbers in the order that participant saw them, joined by single spaces
(`hitopbr_01` is 1). The item columns then follow the instrument's order (a
module's items in the order its module file lists them, which
`write_module()` writes ascending and the page requires ascending). Under
the Prolific route, two more lead
columns, `prolific_study` and `prolific_session`, follow `submitted`, or
`item_order` when the file has it. They hold the `STUDY_ID` and `SESSION_ID`
values from the page's address, and each is empty when the address carried
none or still carried the placeholder. The data row holds the study fields, the
export's build date and the time of finishing as an ISO-8601 timestamp in
UTC. Then comes each answer's numeric value: 1 to 4 on the HiTOP forms and 0
to 3 on the PID-5 forms, as the export's response options number them.
Under an `instruments` link, the item columns come in one group per
instrument, and the `instrument`, `form_build` and `item_order` cells hold
one entry per instrument, as
[Give more than one instrument](#give-more-than-one-instrument) describes.
Eleven example files are under `tests/fixtures/`. There is one per form,
one for a HiTOP-SR module, and one HiTOP-BR file under the random order.
Two are under the Prolific route, one HiTOP-BR file has questions, and one
is from a link with three instruments.

## Send responses to a Google Sheet

With a send address, the page posts one JSON object per participant. Its
keys are the file's columns in the same order: `study`, `participant`,
`instrument`, `form_build`, `submitted`, `item_order` under the random
order, `prolific_study` and `prolific_session` under the Prolific route,
then one key per item, in one group per instrument under an `instruments`
link. Its values
are the same as the file's, with each answer as a JSON integer. The request
is a POST with the body as `text/plain`, sent from the page's origin. The
server must answer with the JSON `{"ok":true}` and with an
`Access-Control-Allow-Origin` header that admits the page's origin, as an
Apps Script web app does. Any other answer makes the page save the file
instead. If the answer arrives after the page's 30-second limit, the page
reports the send as unconfirmed, but the row still reaches the server. The
file saved in that case duplicates a row the server kept. The `submitted` value
identifies the pair.

A Google Apps Script web app bound to a Google Sheet is one such server,
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
4. In the [Study Link Builder](https://jmgirard.github.io/hitop-form/link.html),
   set "Where responses go" to "A web address", paste that URL into the
   "Web address" field, and make the link.
5. When you change the code later, choose Deploy, then Manage deployments,
   edit the deployment and pick "New version". The `/exec` URL stays the same.

The script builds the sheet's header from the first row it receives. It
adds a key it has not seen to the end of the header. So start a new sheet
for a link with the random order. A sheet that already holds rows without
`item_order` puts that column after the item columns.
`read_form_responses()` reads it there too, but the download then lacks
the column order above.

Use one sheet for each link that lists several instruments. If two links
list the same instruments in a different order and post to one sheet, each
row's `instrument` cell lists them in its own order, and the columns keep
the first link's order. `read_form_responses()` then refuses the download
and names the first row that differs.

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
2. In the [Study Link Builder](https://jmgirard.github.io/hitop-form/link.html),
   choose the instrument (and choose or paste the module file, if any), set
   "Where responses go" to "A Supabase table", and fill in the three fields:
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
   `prolific_study` and `prolific_session` when the recruiting site is
   Prolific, one integer column per item, in the order the file keeps
   them, and one text column per question of your own after the items.
   It then turns on row-level
   security, revokes the project's default table privileges from the
   `anon` and `authenticated` roles, grants insert back to `anon`, and
   adds one policy that lets that role insert. With the publishable key,
   the API can then insert rows and nothing else. A select returns no
   rows, and an update or a delete changes none.
4. Send the link to the participants.

The table's columns are fixed by the SQL, so a link for a different
instrument or module, or a link with the random order or the Prolific
route sent to a table made without it, needs a table of its own. So does a
link with a question whose name the table has no column for. A row with a key the table
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

The table keeps every value as text or as an integer, so a participant
code such as `=1+1` is stored as those four characters. A spreadsheet
program can still read such a cell as a formula when you open the exported
CSV in it. Read the file in R as shown above, where every column stays
text, or open it in the spreadsheet as text.

## Scoring

Read the files into R and score them with the hitop package.
`read_form_responses()` reads a folder of files saved for one form into one
data frame, with `item_order`, `prolific_study` and `prolific_session` as
character columns that are `NA` for a file without them. The answers to
your own questions come after the item columns as character columns, with
`NA` for an unanswered question. Pass its item columns to the scoring function for the form:
`score_hitopsr()`, `score_hitopbr()` or `score_pid5()`. For a PID-5 file, set
`version` to `"FULL"`, `"SF"` or `"BF"` to match the form:

```r
library(hitop)
responses <- read_form_responses("path/to/pid5bf-files")
items <- grep("^pid5bf_", names(responses), value = TRUE)
score_pid5(responses, items, version = "BF")
```

A file of several instruments reads the same way. Score each instrument in
its own call:

```r
responses <- read_form_responses("path/to/hitopbr-pid5bf-files")
score_hitopbr(responses, grep("^hitopbr_", names(responses), value = TRUE), append = FALSE)
score_pid5(responses, grep("^pid5bf_", names(responses), value = TRUE), version = "BF", append = FALSE)
```

The package's
[Building HiTOP-SR Modules](https://jmgirard.github.io/hitop/articles/modules-hitopsr.html)
article describes the module file and scoring a module.

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
| `tests/render.spec.js` | For each of the five forms, the heading, item text, option labels and values, and order match the export. A module file's items render in its order. Under `shuffle: true`, the HiTOP-BR and the module render a rearrangement numbered 1 to n, and two loads differ; `shuffle: false` renders as no shuffle. The start screen's wording with and without a send address |
| `tests/link.spec.js` | The Study Link Builder offers the five forms, a link it builds opens each one, its module hint says HiTOP-SR only, it refuses a send address or a Supabase table the online form would refuse, a link built with an address posts at Finish, and the SQL it shows for a Supabase table equals the hand-written fixtures, with and without the random-order box. The box's label and hint, the link it builds, and the rearranged page that link opens. Prolific as the recruiting site: its hint, the placeholders on the link it prints, its refusal beside a filled participant field, the completion field and its refusal of an `http://` address, the saved-file completion field's hint, the `completeSaved` it puts in the link, its refusal of an `http://` address and of an empty completion field beside it, and the SQL under Prolific against the two Prolific fixtures. The "Recruiting site" menu's five choices in order, the one hint or field each shows, the link each builds (`participantParam` and the `&id=%SURVEY_CODE%` ending for SONA, `participantId` for Connect, the typed name for another site), the refusals of a bad address parameter, of `id` and `participantId` under another site, and of a site beside a participant, the refusal of a participant field a `c` filled with a lone surrogate half and the round trip of one holding a whole emoji, the site a `c` selects and its round trip with each site's ending, the SONA link opened unfilled asking for the identifier, the SQL under SONA equal to the SQL with no site, each completion field's refusal of the token in the host or the path and of another spelling of it, and the menu described by the chosen site's hint (none for None and another site). A pasted module file whose items are not in ascending order, reversed or with its last two swapped, is refused with the online form's message and no link is built. A study link's `c` opened on `link.html` fills every field and round-trips through "Make the link" for each choice of where responses go, fills only what it carries against a load with no `c`, and is refused by name over eight bad loads, two that throw past the page's checks among them (one after a completion URL is filled), with every field left as the no-`c` load leaves it, no address notice, and "Make the link" still handled by the page; the intro above the form, and the links to the Module Builder and the online-collection tutorial. A `c` that fills any of the four address fields lists each filled one in a notice between the intro and the form, after its field's name and as the field holds it. The cases are each field alone, both completion URLs with one web address or project URL once per kind, and a completion URL over two lines, listed as the field joins it. A load with no `c` shows no notice, and neither do seven shapes of `c` that fill no address, two of them an address that is only a line break. Markup and an entity in each address show as written, with no element added. "Make the link" empties and hides the notice, on a built link and on the refusal of an empty study. After load, focus is on the refusal for each bad load, on the notice in each of the seven cases listed above, and on no element for the load with no `c` and each of the seven shapes that fill no address. "Make the link" is disabled in the markup, with `autocomplete="off"`. While a `z` link unpacks, and while `form.js` loads, a forced press and Enter in the study name box change no address and start no navigation. A press after the wait builds the link. The button is enabled after a load with no link, a refused link and a filled one. The builder shows four `form.js` messages from its imports, and each names the online form. They cover an unknown instrument in an opened link and a new choice added to the menu of where responses go. They also cover a module file and an instrument export of another format. A `z` link opened on the builder is refused by name in a browser without `DecompressionStream`. It is also refused for text that is not base64url, more than 100,000 bytes unpacked, bytes that are not UTF-8, text that is not JSON, and JSON that holds no form. Each refusal leaves the form's fields, the instrument rows and the question list as a load with no link leaves them |
| `tests/link-sections.spec.js` | The Study Link Builder's layout: the required parts, then the five optional sections closed with "Not used", then "Make the link". Each section's summary lists the labels of its fields that hold a value. One refusal per section opens it and focuses the field. At 375 px and 1280 px with every section open, nothing is wider than the page. A study link setting one optional field opens only that field's section, CloudResearch Connect's `participantId` among them, and a link setting none leaves all closed. Move up, Move down and Remove states and names for 1, 2 and 3 instrument rows and question groups, after moves, removals, a prefill and a file load. With `disabled` removed, a press on the first Move up or the last Move down moves nothing and focuses the other move button. The "Your study link" region for each recruiting site and each choice of where responses go. Each next-step sentence is written out in full, and the page's sentence has one end, a semicolon counted as an end. At 375 px and 1280 px, a short link and a `z` link over 5,000 characters each sit in a box under 16rem high, with "Copy the link" to its right. Every hint at most 40 words, the intro at most 60, no retired term in the page's text, placeholders or accessible names, and every README link on the page naming a README heading, with lines in fenced code skipped. No request leaves the browser for an address other than the page's. The instrument exports come from copies in `tests/fixtures/exports/`. A test fails on a request to another address that no route answered. With "Another site" chosen and one question of each type, 50 characters go into each text field of the sections, typed where the field shows and sent as input events where the question's type hides it. They make no `cloneNode()` call, and each summary still lists its filled fields. The function that reads a field's label holds no method that copies. The earlier setup steps after the prefill show a site hint, the web address field, summaries and an open section. A throw in the last step then leaves the refusal and hides that hint and that field. Every summary then reads "Not used", every section is closed, and the page still builds a link. Every refusal call a search of the page finds is fired with every section closed. The message shows, and focus lands on the refused field with its section open, or on the message. The calls include the instrument row at fault at rows 2 and 3, the five question fields the page maps to a control (name, text, options, minimum and maximum), 51 questions and the four fields of where responses go. They also include a failed export fetch, a failed link encoding, and the four refusals of a build that a field changed during. The hints keep the facts a researcher acts on, each checked by a phrase. Among them are the logs that an opened study link reaches, the SONA survey code as the identifier, and the "Completion URL" field. Others are `{participant}` after the decline address's `?` or `#`, the two cases that save a file, and Prolific's completion URL. A module among several instruments and the key in GitHub Pages' logs are two more. When a field changes, a questions file loads, or an instrument row or a question group is added, moved or removed, a built link hides. A field changed while a Supabase build waits leaves the link hidden. The message says so and takes focus, and the next press builds from the new values |
| `tests/walk.spec.js` | Pages of 15 and the refusal on a blank item, on the HiTOP-BR and a HiTOP-SR module |
| `tests/screens.spec.js` | The participant's text on each screen. A search of `form.js` lists the three calls of `showError()`, and a refusal through each shows the heading, one sentence and the fault in a closed "Details for the study team" section: check the connection for a failed export fetch, another browser for a `z` link this browser cannot unpack, the study team otherwise. The cases that cannot unpack are a browser with no `DecompressionStream` and one whose `DecompressionStream` lacks `deflate-raw`. Three walks, to the saved-file screen, the sent screen and the saved-file screen after an HTTP 500, find no build date, package version, host, HTTP status or any of the five retired words the test lists in the page's own text, and the version lines in the closed section on every screen. The identifier hint, the input's attributes, and Enter beside Begin. An Enter that commits an input method's text starts nothing. At 375 px, the part and page lines, 44 px option targets and the marks for one and three missed items, on a HiTOP-BR link and a PID-5-BF plus HiTOP-BR link. The count's alert is on the page, empty, before any press. Each answer to a marked item takes its own mark away and lowers the count. An answer that leaves the number does not rewrite it. The closed "Instructions" section on the first and last page of each instrument. The question after "I do not agree", "Go back", and the sending line and the "Your answers were not sent" screen after an HTTP 500 and a failed connection. The sending line is drawn empty above Finish on the last item page and on "Before you finish". A link that sends nowhere has none |
| `tests/save.spec.js` | The saved CSV's header, values and file name, against the fixtures, for each of the five forms and a module. On a PID-5 form, a chosen 0 is written as `0`. Under `shuffle: true`, the HiTOP-BR and the module save `item_order` and the item columns in the instrument's order, each value checked at the position its item was shown at, and the committed shuffled capture agrees with its own `item_order`. Under `shuffle: false`, the HiTOP-BR saves the same file as with no shuffle field. Under `prolific: true` with the three parameters in the address, the identifier is the Prolific ID and the two Prolific columns follow `submitted` or `item_order`, against the by-rule fixture and the committed capture; a placeholder or absent parameter writes an empty cell; an absent, blank or placeholder ID shows the identifier field; the parameters without the field change nothing; a parameter carried twice reads as its filled value: in the walk, `PROLIFIC_PID` and `STUDY_ID` each filled and as a placeholder in either order, and in `readProlific()` itself for each of the three names, a blank before or after the filled value, two filled values giving the first, and a blank beside a placeholder giving empty. With a completion URL and no web address or table, the saved screen links to it and does not navigate; with a saved-file completion URL beside it, the link is to that address and neither is requested. On the HiTOP-BR walk's saved screen and on the saved screen with a completion URL, the instructions end by naming the "Save the file" button, the status region under it starts empty with `role="status"`, a first press from the keyboard and a second by click each save the file again with the same suggested name and the same bytes and write "The file was saved again." into the region (the second as a fresh write, seen by a mutation observer), focus stays on the button after the keyboard press, and the screen's order is the heading, the lead, the file name, the instructions, the button, the status region, the completion link when there is one, the closed study-team section |
| `tests/send.spec.js` | With a send address: one POST at Finish, its body against the fixture, the simple-request headers, a 302 to another origin followed, one POST on a double press, and the five unconfirmed outcomes that save the file, each under "Your answers were not sent" with its fault only in the closed study-team section. With a Supabase table: the insert's address, headers and body for both key shapes and a project URL ending in a slash or in `/rest/v1/`, one preflight per walk, a 401 or a refused connection saving the file, and the committed Supabase export against the fixture. Under `shuffle: true`, the row posted to a web address and to a Supabase table carries `item_order` and the instrument's order, and the Supabase row's keys equal the shuffle SQL fixture's columns. Under `prolific: true`, the row posted to a web address and to a Supabase table carries the two Prolific keys, with and without the random order, and the Supabase keys equal the Prolific SQL fixtures' columns. With a completion URL, a confirmed send draws the sent screen with its "Continue to" link and no nav button, read while the one navigation request is held, then navigates there; an unconfirmed send links to it and does not navigate. With a saved-file completion URL beside it, a confirmed send goes to the completion URL and requests nothing of the other, and an unconfirmed send links to the other. On the screen of each of the five unconfirmed outcomes with a send address, the instructions end by naming the "Save the file" button, the status region under it starts empty, and a first press from the keyboard and a second by click each save the file again with the same suggested name and the same bytes and write "The file was saved again." into the region, focus staying on the button after the keyboard press; with a completion URL the screen's order puts the button and the empty status region between the instructions and the link; the sent screen has no such button, read after it shows and at the held navigation request. Against a recording server the tests start themselves |
| `tests/guard.spec.js` | The version display and the refusals: an export whose `format` is not `"1.0"` or whose file fields are missing, a module file of another format, a blank participant identifier, a send address outside `https://` or the loopback exception the tests use, a Supabase table with a bad address, key or table name, a `shuffle` or `prolific` field that is not `true` or `false`, `prolific: true` beside a participant, a `complete` field that is not an `https://` address free of a user name and password, and a `completeSaved` field of the same faults or with no `complete` beside it. A `participantParam` that is not text, empty, over 64 characters, holding a character outside `A-Z a-z 0-9 _ . -`, `c`, or a Prolific name, or that stands beside a participant or `prolific: true`; a `{participant}` token in a completion address's host or path, typed or encoded, while the token after `?` or `#` is accepted; and another spelling of the token after `?` or `#` (another letter case, doubled braces, a space inside the braces, `%7B`, `%7D`, `%257B` or `%257D`), refused naming it. A module file whose items are not in ascending order, reversed or with its last two swapped, is refused naming the fault and no form starts. A participant holding a lone surrogate half (high or low, alone or at the start, middle or end, a low before a high, a high before a whole emoji) is refused and no form starts, with or without a completion URL, while a participant holding a whole emoji is accepted and fills the completion URL with its encoding |
| `tests/recruit.spec.js` | Under `participantParam`, the identifier taken from the named address parameter, and the start screen's question when the value is blank, absent, `%…%` or `{{…}}`; the first filled value of a doubled parameter; a name holding `.` and `-`; no address parameter read without the field. The saved file's header and the posted row's keys the same with and without the field, with and without the random order. The `{participant}` token filled in a SONA-shaped completion address in each place the page uses it (the navigation after a confirmed send, the sent screen's link, the saved screens' link under `complete` and under `completeSaved`), with the identifier from the address, the start screen, the link's participant and `PROLIFIC_PID`. An address without the token used as the link check parses it: in the navigation and the sent screen's link after a confirmed send, and in the link on the saved screen after a walk with no web address or table, under `complete` and `completeSaved`, two of the addresses given with an uppercase host the parse lowercases. The start screen's refusal of a typed identifier holding a lone surrogate half (high, low, or low before high), and an address value `%ED%A0%80` arriving as three U+FFFD characters and filled into the sent screen's link |
| `tests/consent.spec.js` | The refusals of a `consent` field that is not an object, has a key other than `text` and `declined`, has no text, or has a text or declined text that is not a string, blank, over its limit or holding a lone surrogate half, and of `completeDeclined` without `consent` or as an `http://` address; a text and a declined text at their limits accepted. The consent screen of a hand-made link with CR LF and a lone CR: each paragraph's text, a single line break kept, no `b` element from `<b>x</b>`, the two buttons, focus on the heading, and "I agree" leading to the start screen the link without consent shows. "I do not agree" and then "Yes, I do not agree" with no web address or table, a web address and a Supabase table, each with `complete`: the declined text or the fixed sentence, no button and no link, and for 2 seconds no request, no download and the same address. With `completeDeclined`, a Prolific-shaped and a SONA-shaped address, the latter with and without an identifier: the declined screen and its link at the moment of the navigation, then the address reached, with no request to the web address or table and no download. The saved file's header, the posted row's keys and the builder's Supabase SQL the same with and without consent, with and without the random order |
| `tests/zlink.spec.js` | A `z` link without consent opens the form, and one that unpacks to exactly 100,000 bytes is read. The refusal, naming the fault, of a `z` with a character outside base64url, a length base64 does not have, bytes that are no stream, a truncated stream, bytes after the end of the stream, 100,001 bytes unpacked, bytes that are not UTF-8, text that is not JSON, and JSON that is not an object; of a link with both `c` and `z`, in either order; of a `z` link in a browser without `DecompressionStream`, where a `c` link still opens; and of `participantParam` `"z"` |
| `tests/link-consent.spec.js` | A link built with consent text opens a consent screen with the text's paragraphs. Consent text with CR LF, blank lines, a tab and non-ASCII text makes a `z` link carrying the box's text, which the page writes back line for line. With the consent fields empty the builder writes a `c` link, and with consent text a `z` link. `link.html?z=…` fills the consent boxes and the decline address, lists the address in the notice, and round-trips. The builder's refusals: a Consent or Declined box of white space, a Declined box or decline address beside an empty Consent box, a box over its limit or holding a lone surrogate half, and an `http://` decline address, with boxes at their limits building a link. `"z"` refused under "Another site", and `link.html` opened with both `c` and `z` or with a `z` that does not unpack refused by name |
| `tests/questions.spec.js` | The refusal, naming the question's list and place, of each fault in a `questions` field: its shape, the 50-question limit, a question's keys, name, text, type and `required`, its options and their labels, and its `min` and `max`. The limits themselves are accepted |
| `tests/question-screens.spec.js` | The before and after screens on the PID-5-BF: headings, numbers, "(required)", the buttons each screen carries, the order after consent, Back keeping both screens' answers, question text and option labels written as text and trimmed, the refusal of each required type left unanswered, the whole-number probes and range lines, a text holding a lone surrogate half, the unload guard counting a question's answer, and the numeric keypad asked for only when a number question's `min` is 0 or more |
| `tests/question-columns.spec.js` | The `q_` columns after the items in the saved file and the posted row, with shuffle off and on and under Prolific: each type's value answered and unanswered, `007` and `-0` as `7` and `0`, a multi clicked 3 then 1 as `1 3`, and every value a JSON string. An unanswered walk's keys to a web address and a Supabase table against `supabase-hitopbr-questions.sql`. The capture of `responses-hitopbr-questions.csv` |
| `tests/link-questions.spec.js` | A link built with one question of each type keeps each list in the editor's order, and the page asks the questions. `link.html?z=…` fills the editor and round-trips. The Supabase SQL equals `supabase-hitopbr-questions.sql`. Each fault the editor can produce in one question is refused, naming the question by its number. The editor also refuses 51 questions, naming the count. Blank option lines are skipped, and hidden fields stay out of the link. A browser without `CompressionStream` refuses a link with questions, consent text, or both, and names what the link holds. A bound outside the range is quoted as typed, with any zeros in front. A setup over 100,000 bytes is refused with its size, and one of exactly 100,000 bytes is built and opens. The min and max boxes ask for no numeric keypad, and negative bounds are built. Move up, Move down and Remove reorder and renumber the questions |
| `tests/link-questions-file.spec.js` | "Load questions from a file" fills the editor from a file with a byte-order mark, CR LF, its columns in another order and each quoting form. It also fills it from a file with LF and only the required columns. A load takes the place of the editor's questions. Each fault in a file is refused with its message, naming the row and column where there is one, and the editor keeps its questions. A load makes no network request. "Download these questions" saves a file that loads back as the same questions, and "Download a template" one that loads as one question of each type. Both files have a byte-order mark and CR LF. An empty or faulty editor saves nothing and names the fault |
| `tests/link-module-file.spec.js` | "Choose the module file" puts the chosen file's text in the "Module file" field. "Make the link" then builds the same link as that text pasted in, with the file's module. The section's summary then lists "Module file", and the line under the control names the file. Emptied and chosen again, the same file fills the field again. When the field fills, a link made during the file read is hidden. An edit to the field clears the line that names the file. Of two files chosen in turn, the later one fills the field, and an earlier read that ends last changes nothing. An edit typed into the field while a file is read wins, and a read that fails shows "The module file could not be read." A chosen instrument export is refused with a message that names the Module Builder and `write_module()` and holds no "Paste" |
| `tests/instruments.spec.js` | The refusal, naming the field and the fault, of each fault in an `instruments` field: the field beside `instrument`, a value that is not a list, a list of 0, 1 or 4 names, an unknown name, an entry that is not text (a number, a list, null, an object), a repeated name, two PID-5 forms and all three. A module beside a list without `hitopsr` is refused. Beside a list with it, a module of another instrument, of another format or with items not in ascending order is refused by the module check. An `instrument` field that is present and not text (a list, a list of lists, null, a number, true, an object) is refused naming the field, before any export is requested |
| `tests/instruments-walk.spec.js` | Every export of a list fetched before the first screen, and a refused export named by its instrument. Walks of two and of three instruments: each start screen's name, the version lines in its study-team section, "Part n of N", instructions and counts, the identifier question and the notice of where the answers go on the first start screen only, positions and page labels counted within each instrument, and no "Back" on each first page. No radio checked on the PID-5-BF's first page after the HiTOP-BR. The screens in the order consent, before, each instrument, after, and "Back" from the after screen. The leave-page warning with an item answered, with none, and on the second instrument's first page with answers in the first only. No part line on a single-instrument link |
| `tests/instruments-row.spec.js` | The saved file and the webhook row of the HiTOP-BR then the PID-5-BF, each answered by its own pattern, with shuffle off and on, under Prolific and with questions: the space-joined `instrument` and `form_build` cells, one group of item columns per instrument in link order, each instrument's pages showing only its own items, one `item_order` group per instrument under shuffle, and the `q_` columns last. The same for three instruments under shuffle. The capture of `responses-multi-page-shuffled.csv` |
| `tests/instruments-supabase.spec.js` | The builder's Supabase SQL for two instruments, byte for byte, against `supabase-hitopbr-pid5bf.sql` and `supabase-pid5bf-hitopbr-prolific-shuffle-questions.sql`. The keys of the rows posted to a web address and to a Supabase table under those two links, against the fixtures' columns |
| `tests/link-instruments.spec.js` | The builder's instrument rows: one row at load, "Add an instrument" up to three rows, and Move up, Move down and Remove. One row writes `instrument`, and two or three write `instruments` in row order. The refusal of a repeated instrument, of two and of three PID-5 forms, and of a module against the list. Links of two and of three instruments built, opened at "Part 1 of N", and reloaded on the builder through `c` and `z` with the same rows. An opened link refused by name for each list fault the online form refuses, with the rows back at one HiTOP-SR row. Move up, Move down and Remove named from their visible text, and Remove disabled on a single row |
| `tests/network.spec.js` | Without a web address or table, no request leaves the page except its own files and one export fetch per instrument, on the HiTOP-BR, a HiTOP-SR module and a list of the HiTOP-BR and the PID-5-BF. With one, the further requests are the POST to it at Finish and any redirect it answers with, or the insert's address under a Supabase project URL, and with a completion URL the one navigation to it after the confirmed send, the sent screen already drawn when that request is made. `link.html` opened with a Supabase config in its `c` requests only `link.html` and `form.js` up to the first network idle |
| `tests/layout.spec.js` | On every page of the HiTOP-SR and the PID-5, at 320 px, 375 px and the default width, each item's text box lies inside its card's border on all four sides and does not overflow, the options start below it, no page scrolls sideways, and at least one wrapped item is measured. Each item on a first page is a group named by its position and text. A refused blank item's card has the error colour on all four borders |

`tests/fixtures/README.md` names the generator of every fixture. The Tests
workflow runs the suite on every pull request and every push to `main`,
against the checkout.
It runs every Monday against the deployed page, so a new package export that
breaks the page is noticed. `tests/link-sections.spec.js` is the exception:
it answers the page's export requests from the copies in
`tests/fixtures/exports/`, so it does not check a new export. On that run the send tests ask the browser for
permission to reach the local recording server from the public page. If
the browser refuses, they skip with the reason printed.

## License

GPL-3, as the hitop package. See `LICENSE.md`.
