# Guitar Scales Analyzer

A lightweight web app that analyzes a chord progression and suggests:

- **Whole-song compatible scales** with fit scores and flavor notes.
- **Per-chord scale options** with concise musical flavor descriptions.
- **Fretboard visualizations** for quick practice and improvisation ideas.

## Project structure

- `index.html` — Main page with UI and script includes.
- `app.js` — Core logic: input parsing, scale calculation, and fretboard rendering.
- `styles.css` — Responsive styling with horizontal fretboard scrolling on small screens.
- `README.md` — Setup and usage instructions.
- `LICENSE` — MIT license.

## Setup

No build step required. Open `index.html` directly in a browser.

For best compatibility, you can also serve it locally:

```bash
python3 -m http.server 8000
```

Then visit: `http://localhost:8000`

## Usage

1. Enter chords in the textarea (for example: `Am F C G`).
2. Click **Analyze**.
3. Explore scale suggestions for:
   - the whole progression, and
   - each individual chord.

## Notes

- The app uses CDN-hosted dependencies:
  - Tonal (`@tonaljs/tonal`)
  - SVGuitar (`svguitar`)
- Some unusual scale names may not be recognized for every tonic.

## Contributing

Contributions are welcome. Please open an issue or PR with a clear description of the change.
