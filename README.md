# D2 Survivors Save Viewer

A static page for reading a Diablo II Survivors share code. Paste or upload the code and the page shows gold, each class’s equipped gear, inventory, and stash. Item names use the usual rarity colors (white, blue, yellow, gold) and mods are written out as readable item lines.

Nothing is uploaded. There is no backend and no analytics. The code is decoded in your browser. A share link stores it in the URL hash (`#code=…`), which the browser does not send to the server.

The look is original CSS: a dark stone background, gold and bronze frames, and tooltip-style item cards. Headings use [Cinzel](https://fonts.google.com/specimen/Cinzel) (Natanael Gama, SIL Open Font License). No Blizzard art, sprites, logos, or game fonts are included. Inflation uses vendored [pako](https://github.com/nodeca/pako) 2.1.0.

## Run locally

Any static file server works. From the repo root:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. Use **Try an example** for a small made-up save, or paste a real `D2S1:` code.

## Tests

Node’s built-in test runner is enough. No install step.

```bash
npm test
```

The tests decode the synthetic fixture in `fixtures/example-save.json` and check stat lines such as charges, procs, and skill tabs. Real save codes are not stored in this repo.

## Code format

A code is the prefix `D2S1:` plus URL-safe base64 (no padding) of zlib-compressed JSON. The page restores padding, decodes the base64, inflates it, and parses the JSON.

## Deployment

Pushes to `main` run `.github/workflows/pages.yml`, which publishes the static files with GitHub Actions.

In the repository settings, open **Pages** and set the source to **GitHub Actions**. The workflow cannot turn that setting on by itself. After it is enabled, the site is served from the Pages URL for this repo.
