# Conduital Site — Claude Instructions

## Project Overview
Marketing site for Conduital (conduital.com) — built with Astro 5.x, deployed to Vercel. Static site, no SSR.

## Tech Stack
- **Framework:** Astro 5.x
- **Styling:** Scoped CSS + global styles in `src/styles/global.css`
- **JS:** Vanilla JS (no external JS dependencies)
- **Deploy:** Vercel (static)
- **Main page:** `src/pages/index.astro`

## Planning with Files
This project uses file-based planning for complex tasks. Before starting multi-step work:

1. Create/update `task_plan.md` — phases, progress, decisions
2. Create/update `findings.md` — research, discoveries
3. Create/update `progress.md` — session log, test results
4. Always end sessions by writing `next-prompt.md` with the prompt to start the next session

### Rules
- **Create plan first** — never start complex work without `task_plan.md`
- **2-Action Rule** — after every 2 search/browse operations, save findings to disk
- **Read before decide** — re-read the plan before major decisions
- **Update after act** — mark phase status after completing each phase
- **Log ALL errors** — every error goes in the plan file
- **3-Strike Protocol** — attempt 1: diagnose & fix, attempt 2: alternative approach, attempt 3: broader rethink, after 3: escalate to user

### Session Handoff
Always end each session by creating `next-prompt.md` containing the full prompt needed to resume work in a fresh conversation.

## Build & Test
```bash
npm run build    # Build the site
npm run dev      # Dev server
```
