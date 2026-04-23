# hddn Brand Guide

## Core Idea

hddn is a privacy-first document redaction tool. The product should feel calm, exact, and trustworthy. It is not a one-click AI magic trick. It is a careful review workflow with local processing and safe export.

## Brand Principles

- Calm: low-noise surfaces, generous spacing, deliberate motion, no dashboard clutter.
- Exact: crisp typography, structured metadata, clear status language, visible process.
- Review-first: every screen should reinforce that humans approve the final result.
- Privacy-forward: local processing, no uploads, safe export, plain-language caveats.

## Color System

- `ink`: `#0f1211`
- `bone`: `#f5f1e8`
- `mist`: `#ebe5d8`
- `surface`: `#fffdf8`
- `sage`: `#6f7d73`
- `signal`: `#c9f25d`
- `signal-strong`: `#a9da1d`
- Use semantic success, warning, and danger colors only for stateful review feedback.
- Backgrounds should stay warm and quiet. Bright color belongs in CTAs, focus states, and selective highlights.

## Typography

- Display: `Space Grotesk`
- UI and body: `Plus Jakarta Sans`
- Data and labels: `IBM Plex Mono`

Type intent:

- Display copy should feel editorial and compact, not whimsical.
- Body copy should stay short, plain, and readable.
- Metadata should use mono, uppercase, and wider tracking for rhythm.

## Spacing, Radius, Shadow

- Marketing cards: `28px` to `32px` radius
- App panels: `18px` to `22px` radius
- Controls: `14px` to `16px` radius
- Pills: fully rounded
- Shadows: soft layered depth; stronger on marketing demos, lighter in the app shell

## Motion

- Landing motion: staged reveal, float-in panels, subtle gradient glow
- App motion: restrained hover, focus, and expand transitions only
- Always honor `prefers-reduced-motion`

## Component Rules

- Buttons: bold contrast for primary actions, soft surface treatment for secondary actions, no glossy effects.
- Chips and badges: mono labels, light borders, compact padding, clear semantic states.
- Panels and cards: warm surfaces, soft borders, layered shadows, enough white space to feel premium.
- Navigation: concise links, anchored sections, one primary CTA.
- Forms: strong focus rings, clear labels, quiet placeholders, no decorative noise.

## Copy Rules

- Avoid: `instant`, `perfect`, `magic`, `one-click`, `autonomous`
- Prefer: `local`, `review`, `approve`, `safe`, `export`, `processing in your browser`
- State limitations plainly. Never imply flawless detection.
- When AI is mentioned, frame it as assistive support, never authority.

## Imagery Direction

- Abstract document stacks
- Interface closeups
- Editorial gradients and warm light
- Layered crops of pages, redaction boxes, metadata labels
- No people
- No smiling stock-office scenes
- No robot mascots
- No sci-fi neon overload

## AI Prompt Recipes

### Editorial product backdrop

`Create a warm editorial product backdrop for a privacy-focused PDF redaction app. Use layered paper textures, subtle green signal accents, soft bone surfaces, clean shadows, and precise interface framing. No people, no laptops on desks, no stock photography look.`

### Interface hero illustration

`Design a premium abstract hero visual for hddn, a browser-based PDF redaction tool. Show stacked document panels, muted metadata labels, redaction highlights, and a calm signal-green accent. Editorial SaaS style, refined spacing, warm neutrals, soft gradients, zero hype.`

### Marketing copy seed

`Write concise landing-page copy for hddn, a privacy-first PDF redaction app. Tone: calm, exact, trustworthy. Emphasize local processing, human review, safe export, and clear limitations. Avoid hype, magic, and perfection claims.`

## UX Guardrails

- Manual review must remain visible in both copy and interface.
- Redaction overlays must stay legible above brand styling.
- Privacy claims must match actual runtime behavior.
- Any future network dependency change must be reflected in product copy and docs.
