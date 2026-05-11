# Repo Improvement Roadmap

This is the current practical backlog for making Digital Seed feel more polished and useful without turning it into a heavyweight platform.

## Highest leverage next steps

1. **Data room publishing path**
   - Current blocker: the public Google Drive data room still needs editor/upload permission for the publishing account.
   - Add a documented manual fallback: exact file list, Drive folder structure, and copy/paste release note.

2. **README conversion pass**
   - Tighten the top half of the README around one promise: "get useful personal AI context in 15 minutes."
   - Move deeper platform language below the quick-start path.
   - Add a short "who this is for / not for" block near the hero.

3. **First-run experience**
   - Make `bun run seed onboard` feel like the canonical path: intro visual, three steps, then one copyable first prompt.
   - Add a `--plain` flag if users want no animation and no ANSI color.
   - Keep all external integrations opt-in.

4. **Visual QA guardrail**
   - Add a lightweight script that checks hero GIF frame count, duration, loop flag, edge color, and seam difference.
   - This prevents future visual tweaks from reintroducing a hard edge or loop hiccup.

5. **Docs deduplication**
   - Several docs now overlap: getting started, first 15 minutes, setup wizard, free-first setup, AI agent install.
   - Consolidate into one beginner path plus targeted reference pages.

6. **Release packaging**
   - Add a small release checklist covering health, privacy scan, visual asset regeneration, data room sync, and README screenshots.
   - Consider a GitHub Release once the data room is updated.

## Later, not urgent

- Add short terminal recordings to docs once GitHub asset strategy is settled.
- Add a small examples gallery for different user profiles: student, founder, investor, researcher.
- Add optional templates for weekly planning and project review.
- Add CI for health/privacy scans if GitHub Actions is acceptable for the repo.

## Non-goals for now

- Do not turn the repo into a dashboard product.
- Do not require hosted vector databases or paid APIs for the first loop.
- Do not add messaging/email automation as a default setup step.
