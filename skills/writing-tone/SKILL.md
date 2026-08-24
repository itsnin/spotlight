---
name: writing-tone
description: How to write any prose document (README, AGENTS.md, CONTRIBUTING.md, commit messages, PR descriptions, comments to the user) so it reads like a real, sharp person wrote it instead of an AI. Use this whenever producing markdown docs, project documentation, or long-form written explanation for this user - not just on request, every time. Keeps docs and code comments in two separate registers rather than blending them, and applies to any project.
---
# writing tone

this exists because the same mistake kept happening in both directions: docs that read
like a robotic lawyer from the 1800s (over-punctuated, over-capitalized, formal to the
point of sounding automated), and the overcorrection from that (stripped of normal
capitalization and punctuation until it reads broken instead of human). neither one is
the goal. the fix is specific, checkable rules aimed at the actual target: normal,
sharp, human writing - not a swing to either extreme.

## the core rule

write like a sharp, sophisticated person explaining something to a peer, not like a
document generator producing a legal notice. sophistication comes from being precise and
economical with words, not from capitalization or punctuation density. a smart person
texting a colleague about a real bug is the right register - not a chatbot, not a legal
disclaimer, not a corporate wiki page.

## docs and code comments are two different rules, not one rule applied loosely

this is the most important thing in this file and the thing that's gone wrong twice
already: docs and code comments are NOT the same register with comments being slightly
more relaxed. they are two separate, different targets. don't blend them, don't average
them, don't describe comments as "docs but a bit looser."

**docs** (README, AGENTS.md, CONTRIBUTING.md, any markdown file meant to be read start to
finish, commit messages, PR descriptions): normal sentence-level writing. sentences start
with a capital letter. proper nouns and acronyms are capitalized. periods and commas land
where they'd land in any well-written message from a sharp person. this is a
middle-ground target - not stiff and formal, not stripped down to lowercase-only. read it
out loud: it should sound like a real person writing carefully, not a legal notice and not
someone refusing to use the shift key.

**code comments**: lowercase by default, including at the start of the comment. minimal
punctuation - most lines don't need a period at all. capitalize or punctuate only when
leaving it lowercase/unpunctuated would change or obscure the actual meaning: a
case-sensitive api or class name, a real command or flag, a word that needs emphasis
because the lowercase version reads as a typo instead of a deliberate word (`REMOVED` vs
`removed` when the point is contrast with "deprecated"). this is not "less strict than
docs" - it's a different, terser register on purpose, because comments sit next to code
and get read in short bursts, not start to finish. picture a sharp senior engineer
leaving a quick note for the next person reading the same line - not a formal writeup, not
a diary entry, just the minimum needed to know why this line exists.

### the interleaving rule for code comments - ABSOLUTELY FORBIDDEN pattern

the following pattern is categorically prohibited. under no circumstances may a
contributor produce it, and any reviewer who encounters it must reject the change until
it is corrected:

```
// comment comment comment comment
// comment comment comment comment
// comment comment comment comment
// comment comment comment comment
code code code code code
code code code code code
code code code code code
```

paragraph-like blocks of comments stacked together, then blocks of code stacked
together, constitute an anti-pattern that defeats the entire purpose of inline
annotation. a comment separated from the code it describes by several intervening lines
or by other comments loses its referential clarity and becomes indistinguishable from
general exposition, which belongs in documentation, not in source.

the correct and required pattern is strict interleaving:

```
// comment explaining the next line
code line one

// comment explaining the next block
code line two
code line three

// comment explaining the next line
code line four
```

each comment or small group of comments (maximum three consecutive lines) must sit
immediately adjacent to the exact code it describes. when a different concept begins, a
blank line separates it, and the next comment precedes its corresponding code. this
maintains the invariant that a reader scanning downward always encounters the rationale
for a construct immediately before encountering the construct itself.

enforcement: any block of four or more consecutive comment lines without an intervening
line of code constitutes a violation of this rule, regardless of how well-written the
individual comments may be. the remedy is not to delete the information but to
restructure it: either distribute the comments among the code they describe, or elevate
the material to a markdown document where extended exposition belongs.

if in doubt which register applies: is this text in a `.md` file, a commit message, or a
PR description → docs rule. is this text a `//` or `#` comment inside a source file →
code comment rule. the file type decides it, not how the sentence "feels."

## no trash talk, anywhere, about anything

never criticize, mock, or condescend toward another project, tool, or approach - not the
thing being replaced, not a competing tool, not even implicitly through a line like "that
leniency is earned by a track record" when describing why someone else's project got away
with something. state the fact plainly and move on. this rule doesn't relax based on how
obviously flawed something is - the trash talk itself is the problem, independent of
whether the criticism would be technically accurate.

this also covers backhanded phrasing that sounds neutral but isn't - "unlike some
extensions that..." or "a real, working way to do X, not a hardcoded guess" implies a
value judgment about something else even without naming it. if a sentence's only purpose
is to make something else look worse by comparison, cut that half of the sentence.

## never name a specific project, if this project has that rule

some projects have a standing instruction not to name other software projects by name
anywhere in the repo - check whether that's true for the current project before applying
this section; don't assume it by default. if it is true, treat it as absolute: no
exceptions and no expiry, not in a "prior art" section, not in a lint-explanation comment,
not in a footnote, not as a link with the project name visible in the link text. describe
what the other project does generically ("an established project with a large install
base," "a reference implementation read during research") instead of naming it. this
applies to every file in the repo equally - docs and code comments both, no exception for
one being "just a comment."

before finishing any doc or comment pass on a project with this rule, grep the actual
project name(s) that are off-limits, across every file just touched, and confirm zero
hits. don't assume a find-and-replace caught everything - re-read the section after
editing it.

## incomplete sentences and broken grammar are worse than a slightly formal one

a rushed edit that leaves a sentence half-fixed ("a real component - reviewed , got it
wrong and got rejected") is a bigger failure than a sentence that's merely a bit stiff.
when revising a doc, read every edited sentence back in full before moving on - not just
the phrase that was changed. if a fix leaves a stray comma, a missing word, or a sentence
that doesn't parse, that's not something to catch "next pass" - it gets caught now.

## how to know if something needs this treatment

any file meant to be read as prose from top to bottom gets the docs rule above: README.md,
AGENTS.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md (though standard licenses like the
Contributor Covenant should be left verbatim, not rewritten), commit messages, PR
descriptions, and any explanation given directly to the user in conversation.

any `//` or `#` comment inside a source file gets the code comments rule above - its own
separate target, not a looser version of the docs rule.

verbatim legal or license text (an actual GPL, MIT, etc license file) is never touched by
this skill - those have fixed, official wording for a reason and rewriting them for tone
would be a real mistake, not a style choice.

## before finishing any doc pass

read the whole file back, not just the lines that were touched. check against the correct
target for that file type - docs vs code comments are different baselines, so check each
file against its own rule, not a shared middle ground:

for docs: check for capitalization or punctuation that's noticeably heavier than normal
sentence writing (title case where it doesn't belong, stacked em-dashes, semicolons
standing in for periods), and separately for capitalization or punctuation that's been
stripped below normal sentence writing (missing capitals at sentence starts or on proper
nouns, punctuation dropped to the point sentences run together).

for code comments: check for capitalization or punctuation that's crept in beyond what
correctness requires - a capitalized sentence start, a period on a line that didn't need
one, a proper-sounding tone that doesn't match the terse, lowercase-first target
described above. verify strict interleaving: no block of four or more consecutive comment
lines without intervening code.

for both: check for any sentence that implicitly or explicitly puts down another project
or approach, any named project that should have been described generically instead if
this project has that rule, and any sentence that doesn't fully parse - read it out loud
in your head.

this is a re-read step, not a find-and-replace step. skimming for keywords misses the
things that actually matter here, which are about how sentences are built, not which
words appear in them.
