# Home-page screenshots

Files dropped here are served from the SWA at `/screenshots/<name>`.

## Required filenames

The home-page hero and walkthrough sections reference these by path. Just save the file at the path and the page picks it up — no code change needed.

| Path | Where it shows | Recommended size | Aspect |
|---|---|---|---|
| `public/screenshots/hero-dashboard.png` | Hero panel (right side) | 1600 × 1000 | **16:10 enforced** — other ratios crop from bottom-right |
| `public/screenshots/walkthrough-plan.png` | §01 · Plan it (Cx Plan generator) | 1600 × 1000 | 16:10 or 16:9 |
| `public/screenshots/walkthrough-build.png` | §02 · Build it (Equipment + Checklists + FPTs) | 1600 × 1000 or 1600 × 1200 | 16:10 or 4:3 |
| `public/screenshots/walkthrough-manage.png` | §03 · Manage it (Issues list) | 1600 × 900 | 16:9 or 16:10 |
| `public/screenshots/walkthrough-track.png` | §04 · Track it (Tasks + Gantt) | 1920 × 820 | 21:9 (Gantt is horizontal) or 16:9 |
| `public/screenshots/walkthrough-deliver.png` | §05 · Deliver it (Final Report) | 1600 × 1000 | 16:10 or 4:3 |

**Hard rule**: avoid anything **taller than 1:1**. In the 2-column walkthrough layout, portrait-tall screenshots dwarf the text column next to them and the section looks unbalanced. Square is the upper bound.

The walkthrough frames use `class="h-auto w-full"` so the screenshot's natural aspect ratio just renders — there's no enforced ratio. Pick whichever ratio above flatters that particular product surface.

## Capture tips

- Take screenshots in **dark mode** so they match the home-page hero's dark glass aesthetic.
- Use a project that has realistic data — empty-state screenshots look weak in marketing.
- Aim for ~150 KB per file. PNG is fine; consider WebP for smaller files.
- Crop tightly — no browser chrome, no OS taskbar. The home page already adds its own window dressing (the traffic-light dots).
- Hide any PII (real customer names, real emails). The placeholder fake-project in `BinaryNet Datacenter` or similar is fine.
