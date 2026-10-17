# Start a world of your own

Written and checked by Codex. Initial checks used revision `39359c9`; startup and persistence were checked again against the redesign at `1d7ced1`, on macOS with Node.js `v23.9.0`. These checks do not establish the minimum supported Node version or long-term ecological stability. See [verification](VERIFICATION.md).

The [publication record](PUBLICATION.md) maps those local test revisions to their corresponding revisions in the public history.

## What you need

Use a recent Node.js installation with built-in `fetch`, a browser, and a separate checkout of this repository. Git is used by the running server to record species events. `package.json` declares no dependencies or install scripts, so there is no `npm install` step.

```sh
git clone https://github.com/eresuntomatito/terrarium-seasons-of-wonder.git
cd terrarium-seasons-of-wonder
```

Run the commands below from your own checkout's root. The server uses port **8000**, which must be free. Use this world locally: the server exposes state-changing endpoints and binds without an explicit loopback host; these instructions do not configure public hosting.

## First start, without a language model

In a fresh checkout:

```sh
mkdir -p data
touch data/god-paused
node server.mjs
```

Open **http://localhost:8000**. The viewer receives live updates while the server runs. The reports link opens the historical reports bundled with the source; those reports describe Luis's world, not the new world you just started.

The pause file disables the model's queued work. It does **not** stop the simulation, inherited variation, species splitting, or the server's Git fossil-record callbacks. Species events can write files under `species/` and attempt local Git commits. These callbacks still run with the god paused. Nothing in them pushes to GitHub.

Press **Ctrl+C** to save and stop. The server also saves about every 30 seconds. Run `node server.mjs` again to resume `data/world.json`. Keep that save if you want the same world to continue; it is ignored by Git.

Do not use `--fresh` when you mean to resume. That flag starts over and subsequent saving replaces the current world's save.

## What a fresh world contains

To continue a particular published moment instead, follow [the optional saved-world guide](SAVED-WORLD.md). It pins its own compatible source and refuses to overwrite an existing save. It is a separate download, not the fresh initialization described below.

At both checked revisions, a fresh `World(null)` starts with **150 wanderers**. Other seed species are defined in `species/registry.json` but start with zero bodies. The progenitor that founded Luis's documented genesis era is not released by a fresh start.

Most later mechanics depend on saved rollout state. A fresh world initially schedules only `kin`, `home`, and `niche`; it does not automatically reproduce the live world's climate, mountain and river rollout, food changes, or descendants. The screenshots in this repository show a world with that accumulated history. This difference is part of the current implementation, not a setup error.

The updated source includes the four-section terrain, climbing, and apex mechanisms. Their presence in code does not automatically activate them in a fresh save. In the continuing world, the steward enabled the four-section rollout at season 1396 and it rises over ten seasons; the README's season-1445 photograph shows the fully risen terrain. Its live-world provenance is recorded separately from source verification.

The simulation targets 30 ticks per second. One simulated day is 1,800 ticks and one season 5,400 ticks: nominally one and three minutes. Actual wall time increases if the machine cannot keep up. Closing the browser does not stop the Node process; stopping the process or sleeping the computer pauses its progress.

## Optional local model

The model integration calls Ollama at `http://localhost:11434/api/generate`. Its default model identifier is `qwen2.5-coder:1.5b`; `GOD_MODEL` overrides it. Model installation and generation were not exercised in the startup checks.

To experiment with generation, set up Ollama and the selected model first, then remove `data/god-paused` in your own world. The server checks that file as it works, so a restart is not required merely to change the pause state. The separate `IMMIGRATION.paused` setting governs automatic releases and is not the same switch.

The code also contains a file-based Claude bridge. It is not a requirement for the model-free start and is not configured by these instructions. The miniature's prayer endpoint invokes mutation separately; do not assume the pause file disables every explicit generation endpoint.

## A short headless run

```sh
node sim/run.mjs 400
```

This constructs a fresh in-memory world and advances 400 ticks without starting the server or installing its model/Git callbacks. It does not resume or save `data/world.json`. Many other analysis tools expect a saved world; do not assume every tool operates on a fresh simulation.

## Implementation references

- [Server](../server.mjs): fixed port, save interval, signal handling, stream, and endpoints.
- [World](../sim/world.mjs): `seed`, `rolled`, `IMMIGRATION`, and simulated time constants.
- [Seed registry](../species/registry.json): initial populations.
- [Evolution integration](../god/evolution.mjs): pause handling and automatic Git recording.
- [Model integration](../god/mutate.mjs): Ollama and bridge behavior.

These links follow the checkout you are reading. The verification date and revision above identify the implementation actually checked.
