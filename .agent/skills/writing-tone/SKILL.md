# Writing Tone
Write like a sharp, sophisticated person explaining something to a peer, not like a document generator producing a legal notice. Precision and economy of words matter more than capitalization density or punctuation flourish.
## Two Registers, Not One
Docs and code comments follow different rules. Do not blend them.
**Docs** (README, AGENTS.md, CONTRIBUTING.md, any markdown file read start to finish, commit messages, PR descriptions): normal sentence-level writing. Sentences start with a capital letter. Proper nouns and acronyms are capitalized (GNOME, Mutter, Clutter, ESM, Wayland). Periods and commas land where they would in any well-written message from a sharp person. Read it out loud — it should sound like a real person writing carefully, not a legal notice and not someone refusing to use the shift key.
**Code comments**: sentence case for the first word. Proper nouns and acronyms get capital letters. Light punctuation — periods at the end of complete thoughts, commas where they actually help readability. Do not force perfect grammar. It should read like a sharp senior engineer leaving a quick note for the next person. Explain why, not what the code already shows. If the code is obvious, the comment probably is not needed.
### Strict Interleaving Rule
A block of four or more consecutive comment lines without intervening code is forbidden. Restructure: either distribute the comments among the code they describe, or elevate the material to a markdown document where extended exposition belongs.
```
// RIGHT — comment immediately adjacent to its code
// Grab through Mutter directly because addKeybinding can fail
// silently when the schema is not ready at enable time.
action = global.display.grab_accelerator(accelerator, 0)
```
```
// WRONG — comment block stacked away from code
// comment comment comment
// comment comment comment
// comment comment comment
// comment comment comment
code code code code
```
### No Trash Talk
Never criticize, mock, or condescend toward another project, tool, or approach. State the fact plainly and move on. This also covers backhanded phrasing — "unlike some extensions that..." implies a value judgment about something else even without naming it.
### No Named Projects
Do not name other extensions anywhere in the repo. Describe generically what the other project does instead of naming it. This applies to every file equally — docs and code comments both.
### Before Finishing Any Doc Pass
Read the whole file back, not just the lines that were touched. For docs: check for capitalization or punctuation noticeably heavier than normal sentence writing, and separately for capitalization or punctuation stripped below normal sentence writing. For code comments: verify strict interleaving, sentence case starts, proper nouns capitalized, light punctuation.
