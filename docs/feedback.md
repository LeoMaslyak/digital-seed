# Feedback and small fixes

Digital Seed is alpha. The most valuable feedback is not polished: it is the moment where you hesitated, got stuck, or thought "I do not know what this means."

If you are helping as a first-time tester, start with the
[External Tester Guide](external-tester-guide.md). It includes a short path to
try and a copy-paste feedback template that does not require GitHub.

## Fastest path

From the repo folder, run:

```bash
bun run seed feedback
```

It prints the direct GitHub links for first-run friction, docs confusion, and bugs.

If you want a copy-paste draft first:

```bash
bun run seed feedback --write-draft
```

That creates `user/FEEDBACK-DRAFT.md`. Fill it in, remove private data, then paste it into the closest GitHub issue template.

## Which issue should I open?

- **First-run friction:** use this when the first 15 minutes felt confusing, too technical, or scary — even if nothing technically failed.
- **Docs confusion:** use this when a page was unclear, missing a step, contradicted another page, or assumed background knowledge.
- **Bug report:** use this when a command failed or produced the wrong output.
- **Integration recipe request:** use this when you want Digital Seed to connect safely to a tool or workflow later.

If you are not sure, choose **First-run friction**. Maintainers can relabel it.

Issue templates live here:

<https://github.com/LeoMaslyak/digital-seed/issues/new/choose>

## What to include

Good reports answer only four questions:

1. What were you trying to do?
2. Where did you get stuck?
3. What did you expect to happen?
4. What would have made it easier?

Useful extras, if you have them:

- your OS: macOS, Linux, WSL2, Windows-native, or not sure
- `bun --version`
- the command you ran
- the smallest useful error output
- the doc page you were reading

## Before pasting output

Remove:

- API keys, tokens, passwords, cookies, and private URLs
- real private notes, emails, documents, and calendar details
- personal addresses, phone numbers, IDs, or financial data
- local-only config you do not want public

If the output is too private, describe the symptom instead of pasting the output.

## Suggest a docs fix without Git knowledge

For a tiny wording fix, you do not need to know Git locally:

1. Open the file on GitHub.
2. Click the pencil icon.
3. Edit the sentence.
4. GitHub will offer to create a branch and pull request.
5. In the PR description, paste the check you ran, or write "docs-only, not run locally".

This is enough for typo fixes, clearer wording, broken links, and small examples.

For anything larger, open an issue first. A maintainer can turn the issue into a PR.

## Ask an AI agent to help you report the problem

If GitHub feels unfamiliar, paste this into your agent:

```text
I am using Digital Seed and got stuck. Help me turn this into a short GitHub issue.
Ask me only for the missing details. Remove private data before producing the final issue text.
Use this structure:
- What I tried
- Where I got stuck
- What I expected
- Commands/pages involved
- My setup
- Privacy check
```

Then paste the agent's cleaned-up result into the matching issue template.

## What maintainers should do with reports

When a first-run report comes in:

- prefer fixing the doc or CLI text over explaining why the user should have known something,
- keep the beginner path narrow,
- convert repeated confusion into a checklist, warning, or exact command,
- avoid adding advanced setup to day-one docs,
- mark issues that block the first 15 minutes as release-relevant.
