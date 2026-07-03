# Skybound

Skybound is a dependency-free HTML5 Canvas arcade game with procedural graphics and Web Audio synthesis.

## Run

Because the source uses native ES modules, serve the folder over HTTP:

```powershell
cd outputs
python -m http.server 8080
```

Open `http://localhost:8080` in a modern browser.

## Controls

- Flap: touch, click, `Space`, or `Arrow Up`
- Pause/resume: `P`, `Escape`, or the pause button
- Fullscreen and audio controls are available in the in-game HUD

Progress, settings, unlocked skins, achievements, daily challenge state, and statistics are saved locally in the browser.
