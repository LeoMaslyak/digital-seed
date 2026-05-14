# NotebookLM Intro Video

This page is the production plan for a short NotebookLM Video Overview that
explains Digital Seed as a DIY workshop in a box for building a personal AI
operating context.

## Do we still need the data room?

Yes, but it should be treated as optional.

- **GitHub is the source of truth.** The repo is where the code, docs, issues,
  releases, and validation history live.
- **The public data room is a workshop/share pack.** It is useful for people who
  do not want to start in GitHub, for lightweight public walkthroughs, and for
  NotebookLM source preparation.
- **Do not maintain two separate stories.** Data-room files should be short
  entry points or copies of repo docs, refreshed from the repo with
  `bun run seed drive publish-data-room`.

If maintaining the Drive folder starts creating drift, the safe fallback is to
keep GitHub canonical and use the data room only for assets, source packs, and
public workshop handouts.

## NotebookLM source set

Create a NotebookLM notebook named:

```text
Digital Seed — Intro Video Source
```

Upload or add these sources:

1. `docs/data-room/notebooklm-intro-source.md` — primary narrative source.
2. `README.md` — current public positioning and quick start.
3. `docs/first-15-minutes.md` — canonical beginner path.
4. `docs/phases.md` — personal OS growth model.
5. `docs/what-leaves-your-machine.md` — privacy and trust boundaries.
6. `docs/first-useful-outcomes.md` — examples of the first useful win.
7. Optional visual source: `docs/assets/digital-seed-growth-still.png`.

Keep the source set small. Too many sources make a three-minute video diffuse.

## Recommended NotebookLM settings

NotebookLM's official help says Video Overviews are generated from uploaded
sources in the Studio panel, can be customized before generation, may take more
than 30 minutes, and may contain AI inaccuracies or audio glitches. Cinematic
Video Overviews are listed as Ultra-only, 18+ users only, and English-only.

Recommended settings:

- **Format:** Cinematic, if your NotebookLM account has it. Otherwise use
  Explainer.
- **Length target:** Brief or the shortest available option that still supports
  a complete arc.
- **Language:** English.
- **Visual style:** Cinematic if available. If not, use a calm modern
  documentary / clean workshop style.
- **Audience:** curious non-technical AI users, founders, operators,
  researchers, students, and knowledge workers.

## Steering prompt

Paste this into NotebookLM's Video Overview customization prompt:

```text
Create a concise 3-minute cinematic introductory video for Digital Seed.

Position Digital Seed as a DIY workshop in a box for building your own personal
AI operating context / personal OS. The audience is curious but not deeply
technical. They may use AI chat tools already, but they do not know how to make
AI remember their goals, preferences, projects, files, and constraints across
sessions.

Tell a clear story:
1. The problem: every AI session starts too blank, so users keep re-explaining
   themselves.
2. The seed: Digital Seed is a small local repo of editable context files plus a
   CLI guide.
3. The first win: in 15 minutes, users edit USER, COMPASS, and GOALS, paste one
   prompt into an AI agent, and get one useful artifact such as a weekly plan,
   cleaner project list, searchable notes loop, or first draft.
4. The growth path: Phase 1 local context, Phase 2 local search, Phase 3 one
   integration, Phase 4 optional always-on agent.
5. The trust boundary: local-first, agent-neutral, privacy-aware, no day-one
   cloud database, no email/messaging automation until the local loop works.
6. The promise: not a finished hosted app, but a practical starter kit for
   assembling your own AI-assisted personal OS.

Tone: calm, cinematic, practical, trustworthy. Avoid hype. Do not imply the
project is 1.0 or externally validated. Say it is alpha software and that real
external tester walkthroughs are still the hard gate before calling it 1.0.

Visual direction: start with a blank AI chat and repeated context friction; move
to a small local folder and three core files; show a first useful artifact; show
a four-phase growth ladder; end on a workshop table where the user assembles
their own system from files, recipes, docs, and safe commands.
```

## Suggested spoken structure

NotebookLM will generate its own narration, but this is the intended arc:

```text
0:00-0:25 — The blank-session problem
Every AI session begins without enough context. The user repeats goals,
projects, preferences, constraints, and private boundaries.

0:25-0:55 — The seed
Digital Seed turns that repeated explanation into a local context folder the
user owns: USER, COMPASS, GOALS, DOMAINS, PREFERENCES, ANTI-GOALS, MEMORY.

0:55-1:30 — First 15 minutes
Clone the repo, install dependencies, run seed onboard, edit three files, run
seed first-prompt, paste it into an AI agent, and produce one useful artifact.

1:30-2:10 — Growth into a personal OS
Phase 1 is context. Phase 2 is local search. Phase 3 is one integration. Phase
4 is optional always-on behavior. The user earns each layer by making the
previous layer useful.

2:10-2:40 — Trust boundary
Digital Seed starts local. The user chooses the AI agent, chooses what files it
reads, runs privacy-scan before sharing, and keeps external actions
approval-gated.

2:40-3:00 — Close
Digital Seed is not another hosted platform. It is a starter kit and guide for
building your own AI-assisted personal OS, one useful loop at a time.
```

## After generation

1. Watch the whole video.
2. Reject it if it claims Digital Seed is production-grade, 1.0, fully
   externally validated, or a hosted app.
3. Reject it if it tells users to connect email, Slack, Drive, calendar,
   always-on agents, or cloud databases on day one.
4. Download the video file from NotebookLM if available.
5. Save the file outside git first and check size. Do not commit a huge binary
   without deciding that repo weight is acceptable.
6. Prefer one of these publishing paths:
   - Upload the video to the public data room and link it from README/docs.
   - Add the video to a GitHub Release asset and link it.
   - Commit only a small poster image or transcript to the repo.

## GitHub insertion plan

After the final video exists, update:

- `README.md` — add one short "Watch the 3-minute overview" link near the
  first 15-minute section.
- `docs/first-15-minutes.md` — add the same link near the top for people who
  want to watch before cloning.
- `docs/data-room-guide.md` — record where the video lives and how to refresh
  it.

Do not block the beginner path on watching the video. The canonical path remains
`bun install` + `bun run seed onboard`.

## Source

Primary NotebookLM source:

- [`docs/data-room/notebooklm-intro-source.md`](data-room/notebooklm-intro-source.md)

Official NotebookLM behavior referenced while preparing this plan:

- Google NotebookLM Help, "Generate Video Overviews in NotebookLM":
  <https://support.google.com/notebooklm/answer/16454555>
