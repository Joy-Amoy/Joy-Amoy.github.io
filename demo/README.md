# Office demo

The looping 3D office on the home page: ten agents work at their desks, walk
over to a colleague, talk, and walk back, forever.

Everything the demo needs lives in this folder — the site does not depend on any
other checkout.

## Files

| Path | Purpose |
| --- | --- |
| `minicorp-demo.js` | Built bundle the page loads. **Committed** — GitHub Pages serves it as-is, no build on deploy. |
| `office-bg.webp` | The office artwork the 3D scene is calibrated against. Do not crop or resize it. |
| `src/embed.ts` | Entry point: scene setup, the work/walk/talk loop, speech bubbles. |
| `src/office-calibration.ts` | Camera calibrated to the artwork, desk landmarks, walkable routing. |
| `src/office-models.ts` | The office props and the ten robot meshes. |
| `src/workers.ts` | Names, roles and colours of the ten agents. |

## Rebuilding

Only needed when you change something in `src/`.

```bash
cd demo
npm install
npm run build
```

That rewrites `minicorp-demo.js`. Commit the result alongside the source change.

## How it is loaded

`index.html` renders `office-bg.webp` and starts the demo on its own — there is
no play button. The bundle (~150 KB gzipped) is fetched once the section comes
within 400 px of the viewport rather than on first paint, so it never blocks the
landing page. The canvas is overlaid exactly on the artwork, and the animation
pauses whenever the section scrolls out of view.

## Calibration warning

`src/office-calibration.ts` measures landmarks in pixels against the original
1672 × 941 artwork. Replacing `office-bg.webp` with a different crop or aspect
ratio will put the robots in the wrong places; the landmark tables have to be
re-measured for any new image.
