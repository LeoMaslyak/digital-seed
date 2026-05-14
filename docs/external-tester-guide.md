# External Tester Guide

Thank you for testing Digital Seed. You do **not** need to be technical. The
most useful feedback is the exact moment where you felt confused, stuck, or
unsure what to do next.

## What you are testing

Digital Seed is supposed to help you get one useful personal AI result in about
15 minutes by editing a few local context files and pasting a prompt into an AI
agent.

You are not testing whether you are "good at terminals." If the instructions
make you feel lost, that is a Digital Seed problem worth reporting.

## Time needed

Plan for 30–45 minutes:

- 15–25 minutes to try the setup.
- 5–10 minutes to write what happened.
- Extra time only if you want to keep exploring.

## Privacy first

Use fake or low-stakes information if you prefer. Do not paste private emails,
financial details, passwords, API keys, private documents, or anything you do
not want an AI provider or project maintainer to see.

If you share feedback, remove:

- passwords, tokens, API keys, and private links,
- private notes, email text, documents, and calendar details,
- addresses, phone numbers, IDs, and financial data,
- local file paths you do not want public.

## What to do

Start from the README, not from this file:

<https://github.com/LeoMaslyak/digital-seed>

Then try this path:

```bash
git clone https://github.com/LeoMaslyak/digital-seed.git
cd digital-seed
bun install
bun run seed onboard
```

Follow what the terminal tells you. The goal is to reach one useful output from
an AI agent, such as a weekly plan, a cleaner project list, a searchable notes
folder, or a first draft.

If you get stuck, stop there. Do not struggle silently. The stuck point is the
feedback.

## What counts as useful feedback

All of these are useful:

- "I did not know what this word meant."
- "I did not know which button or command to use."
- "I was afraid this would upload private files."
- "The command worked, but I did not know what to do next."
- "I installed the wrong thing."
- "I got an error and did not know if it mattered."
- "The AI gave me something vague or useless."

## Easiest way to send feedback

If GitHub is comfortable, open this form:

<https://github.com/LeoMaslyak/digital-seed/issues/new?template=first_run_friction.yml>

If GitHub feels unfamiliar, copy the template below and send it to the person
who invited you to test.

```text
Digital Seed test feedback

1. What I was trying to do:

2. Where I got stuck or hesitated:

3. What I expected to happen:

4. What would have made it easier:

5. The page or command I was on, if I know:

6. My setup:
- Computer / OS: macOS / Linux / WSL2 / Windows / not sure
- AI agent used: Claude Code / Codex CLI / Gemini CLI / Cursor / Windsurf / Ollama / not sure
- Terminal comfort: new / okay following exact commands / technical

7. Privacy check:
- I removed private notes, passwords, tokens, emails, personal data, and private file paths.
```

Screenshots are helpful but optional. Plain language is enough.

## What not to do

- Do not spend hours debugging.
- Do not install every optional recipe.
- Do not connect email, Slack, calendar, Drive, or always-on automation during
  the first test.
- Do not polish every context file.
- Do not worry about writing a perfect report.

## Success criteria

The test is successful if one of these happens:

- You get one genuinely useful first output.
- You find a confusing step that should be fixed.
- You decide the project is not for you and can explain why in one sentence.

All three outcomes help improve Digital Seed.
