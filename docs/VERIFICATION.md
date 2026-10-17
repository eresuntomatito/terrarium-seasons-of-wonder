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

## Redesign update: 2026-10-17

### Later geology handoff

Local `d1ad73d` / public `370995aba5d21eb56b8544a5989056da59a1edd2` was checked in a separate archive with the same bounded startup/headless/persistence/mineral/armour procedure. All checks passed; fresh save tick 14 resumed to tick 24, 32 report entries were served, and fresh initialization remained 150 wanderers with three initial rollouts. All 970 exported source files match the original committed tree excluding `.claude`; 24 focused documentation formula assertions pass on the publication copy. Neither the live runtime nor unfinished builder changes were used as the executable test source. A continuing-world artifact still needs its own compatibility check.

The steward committed the viewer as `a19479c` and the simulation/report update as `1d7ced1`. A fresh archive of `1d7ced1` was tested separately from the running world. The startup, 400-tick headless run, HTTP/SSE checks, signal save, resume, initial population, initial rollouts, and controlled mineral/armour checks all passed again. The source reports list now contains 28 entries. Saving and resuming advanced the test from tick 13 to tick 23.

An additional frame check confirmed 14 values per creature, a correctly encoded age share of 0.8 for a controlled body, and agreement with the server's stride-14 advertisement and the viewer's extra-field handling. A controlled shell-cracking check used a full-grown size-8.5 hunter, gape 0.7, and size-5 prey with effective armour 1: capture was disallowed before `crush` and allowed after it was activated. This verifies the new modifier, not a long-term ecological result.

The live save independently confirmed the four-section rollout at season 1396 and recorded section crossings. A real browser loaded the live viewer successfully and captured six observations; there were no console errors or failed requests. Canvas readback produced one performance warning because the comparison reads pixels, not an application failure. The selected season-1400 photograph has separately recorded [provenance](assets/README.md).

The source delta contains five commits and 20 changed paths, including a deleted scratch `latest-world.png`. Credential-pattern checks found no matches in the updated text files. Two automatically generated species files have pre-existing extra blank lines at EOF; those source bytes were preserved rather than reformatted. Documentation checks are scoped separately from those generated-file warnings. See the [publication record](PUBLICATION.md) for the source mapping and merge method.
## Documentation and atlas checks: 2026-10-17

Codex's six-hour documentation pass adds a read-only atlas generator and linked mechanism explanations without changing simulation or viewer source. The checked mechanism boundary remains public `f619e4e5460cc1f6968e924b696b78471577fdc5`.

- Focused assertions check overlapping baseline feeding eligibility, partial acquired-gut inheritance and clamping, growth sizes, effective armour, reproductive growth floor/cooldown/broken state, gift-limited litter size, same-species compatibility, ordinary cruise speed, and thicket's sight reduction.
- The final documentation batch extends these to ordinary toxin stocks, unique/parasite toxin exceptions, and opposite coat-cost comparisons in controlled cold/hot conditions: 24 assertions in total. These comparisons hold the other supplied inputs fixed and do not run an ecological experiment.
- Atlas fixtures check wrapping at negative and boundary coordinates, exclusion of dead/other-species bodies, population/grid totals, omission of private input fields, overwrite refusal, invalid/absent species handling, and input preservation. SVG syntax and the real observation's aggregate total were checked.
- The mosali density SVG was rendered in a temporary browser and visually inspected. Initial navigation to the live server timed out during that static-render pass; the static SVG rendering itself succeeded. This is not a successful live-viewer load test.
- A separate successful live-viewer observation selected the season-1445 photograph after terrain settling. It reported no failed requests or console errors, with one Canvas readback performance warning. This does not test every interaction or long-term rendering performance.
- Relative documentation links and whitespace are checked before each batch. The published screenshot and aggregate atlas carry provenance; the private source save is not published.

These checks validate narrow formulas, data handling, and documentation delivery, not biological fidelity, evolutionary stability, or a causal explanation for a population trend. The giant-specific exceptions and every rollout combination are not exhaustively tested.
