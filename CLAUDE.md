# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tennis rotation schedule generator (网球对战排表系统) — a Vue 3 SPA that lets users configure players, generate fair match rotations across multiple courts, and track scores. Targets multilingual support (Chinese / English / Japanese). State is persisted to `localStorage`.

## Commands

```bash
npm run dev       # dev server (Vite HMR)
npm run build     # production build → dist/
npm run preview   # preview production build locally
```

No test runner is configured yet.

## Tech Stack

- **Vue 3** with `<script setup>` SFCs
- **Pinia** for state management
- **vue-i18n v9** for i18n (zh / en / ja)
- **Vite 8** with `base: './'` (relative paths for GitHub Pages deployment)

## Architecture (planned, per `design.md`)

The app has not yet been built out — `src/` currently contains only the Vite scaffold (`main.js`, `App.vue`, `style.css`). Feature work follows the TODO list in `design.md`.

Key domain concepts to carry through the implementation:

| Concept | Notes |
|---|---|
| Players | Name, gender (M/F), team (Red/Blue/None), fixed-partner and forbidden-partner constraints |
| Courts | 1–10 courts; each court hosts one 2v2 match per round |
| Rounds | Each round assigns players to courts + a bench; assignment must balance play counts (diff ≤ 1) |
| Rotation algorithm | Scoring/penalty-based: penalise repeated partners, repeated opponents, consecutive bench |
| Modes | Mixed doubles (2M+2F per court), Red-Blue rivalry, combined mixed-doubles+Red-Blue |
| Statistics | Per-player counts + pairwise relationship matrix (partner/opponent history) |

## Deployment

Configured for GitHub Pages: `vite.config.js` sets `base: './'`. GitHub Actions (to be set up on `main`) should run `npm run build` and publish `dist/`.

## i18n

Use `vue-i18n` composable (`useI18n`) in every component. Message files should live in `src/locales/{zh,en,ja}.json`. Never hard-code display strings in components.
