# Publication verification

Recorded by Codex on 2026-10-16. This describes checks performed, including their limits, rather than a promise that every future revision behaves identically.

## Source boundary

Tests used a `git archive` of **`39359c940e0c4619a00a3d1ef02a7018e2d35d6b`**, extracted to a temporary directory. No live-world save was copied and no server, viewer, or simulation file in Luis's checkout was modified. Concurrent working changes and subsequently created species were outside this test boundary.

Environment: macOS, Node.js `v23.9.0`. No package installation was necessary.

## Startup and persistence

| Check | Result |
| --- | --- |
| `node sim/run.mjs 400` | Exit 0, no stderr. This checks a short fresh simulation, not evolutionary outcomes. |
| Fresh initialization | 150 wanderers; no other initial bodies. Rollouts initially contain `kin: 2`, `home: 3`, `niche: 4`. |
| Server without model generation | Started with a `data/god-paused` file and no Ollama calls needed. |
| HTTP | Viewer, report listing, a report body, and an existing PNG returned 200; 24 historical report entries were listed. |
| Live stream | `/stream` returned SSE metadata. |
| Graceful stop | SIGINT exited 0 and wrote version-3 world state at tick 13. |
| Resume | A second server start reported the saved tick and advanced to tick 23 before saving and exiting 0. |
| Server errors | No stderr in either successful server run. |

The source hardcodes port 8000, which belongs to the living world during development. A test-only preload intercepted the isolated process's `http.Server.listen` call and assigned temporary loopback ports instead. Production source was unchanged. These checks validate HTTP responses and stream availability; they are not a browser-rendering or interaction test. The initial sandbox attempt could not bind a socket; the successful run used approved access outside the sandbox.

The short server checks did not wait 30 seconds for the autosave interval. Autosave timing, the default port, Git event callbacks, and model paths were inspected in source. Only signal saving and resuming were exercised. No long-term run, model generation, public hosting, or other operating system was tested.

## Armour mechanism checks

These controlled checks use the same archived implementation. They are deliberately small interventions on an in-memory copy, not observations of natural selection in the living world.

Starting with inherited armour `1` and mineral stock `0.1`, call `eat` 2,000 times on a grazing body. Replenish the grass in its cell before every call, remove nearby reef and thicket, and compare soil mineral `0` with `0.25`. Neither the world's ecological update nor reproduction runs in this experiment.

| Condition | Inherited armour after | Mineral stock after | Effective armour after |
| --- | --- | --- | --- |
| No soil mineral | 1 | 0.081872 | 0.081872 |
| Soil mineral 0.25, held constant | 1 | 0.988259 | 0.988259 |

This confirms that mineral access changes effective armour while the inherited value remains fixed. It does not show how often real bodies find those resources or which lineage wins over generations.

A separate unassisted predation-threshold check used a full-grown size-7 hunter and size-5 prey with inherited armour `1`. `canOverpower` returned true at mineral stock `0` and false at stock `1`, with the fresh world's later hunting rollouts inactive. This matches the implemented base threshold of `1.2 × prey size × (1 + 0.6 × effective armour)`.

## Documentation checks

The README's season-1328 image and the tracked `latest-page.png` viewer capture were visually inspected. The README uses the existing dated report as caption evidence. All 72 local links in the archived reports resolve. The initial pass checked 54 local links across 14 new documentation files without missing targets; the final expanded documentation is rechecked before packaging. The README's image has a valid PNG signature. Existing report inconsistencies are recorded as limits in the wiki, not silently corrected in files owned by the steward.
