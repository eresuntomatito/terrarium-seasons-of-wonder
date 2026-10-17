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

### Published saved-state artifact

The season-1561 artifact uses public source `370995a` in pinned publication `3ae141f`. In an isolated archive it loaded at tick 8,427,282 with 236 living bodies, produced five 9,600-cell geology frame fields, advanced 20 steps, serialized/reloaded, and advanced once more with finite body values. No model or Git callbacks were installed. The process had a 256 MB JavaScript heap limit and ended after the short check. This is a compatibility smoke check, not a long-term outcome or performance claim.

Only 94 queued study requests were cleared before compression. Bounded patterns inspected 17,889 strings and found no credential/home-path matches; other saved-world summaries and behaviour are intentionally retained. Both released assets were fetched without authentication and matched the prepared SHA-256 hashes; decompression matched the reviewed JSON hash. The restore example succeeded in a separate fixture and refused an existing save on its second invocation. See `SAVED-WORLD.md` and the manifest for exact artifacts and limits.

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

## Local shared reader: 2026-10-17, ongoing foundation pass

Luis requested local reading before further content expansion. Codex adapted the existing report reader, added dependency-free shared renderer/link modules and a curated `docs/library.json`, and wrote a viewer guide from the active viewer session's checked feature account. A simpler-model Codex helper implemented the renderer; parent review identified and corrected inline-code, raw-URL escaping and heading-collision issues. The world steward owns and deployed the safe read-only docs route; the viewer session owns and added the main Wiki button. Codex did not edit the main viewer or server or restart the world.

- `node --test docs/scripts/reader-links.test.mjs docs/scripts/reader-markdown.test.mjs`: eleven passing tests, including catalog source existence, relative links/assets, URL rejection, escaping, inline code and unique heading IDs.
- Documentation checks at this point cover 41 Markdown files, 312 local links and 24 focused mechanism assertions.
- The in-app browser execution tool was unavailable after discovery, so checks used the existing standalone browser harness. Its first navigation to localhost timed out; a subsequent navigation in the same run succeeded. The full check then passed for 26 wiki pages in the catalog, wiki navigation, a real atlas image, mobile horizontal fit, legacy report links, report read-state transitions, browser back, unknown-page rejection and catalog failure. Wiki requests made zero writes. Reports and read-state POSTs were intercepted with fixtures, not sent to the living world's read-state store.
- Expected injected catalog failures produced HTTP 503 diagnostics. Aborted duplicate navigation requests were observed; the reader now deduplicates location events. A later blank-bootstrap attempt hit the first-local-navigation timeout before assertions, so this is not yet a clean final browser confirmation of the latest small changes. The check now bounds and retries that initial timeout once.
- The inspected desktop atlas rendering is legible. A subsequent mobile adjustment limits the navigation's height so the document is not buried below the complete reading list; final visual confirmation is still due.

The viewer guide attributes its live-feature claims to the owning session; this pass does not independently test every world-viewer interaction or certify keyboard/touch completeness. The local server/viewer handoffs were still uncommitted at this point, so they are not claimed as delivered to the public repository.

At the 12:46 UTC review, fresh bounded HTTP probes to both `localhost` and `127.0.0.1` served the reader with status 200 in under 0.2 seconds. A browser retry using a blank/data bootstrap still stalled on initial local navigation, rather than reporting a JavaScript error. The completed recovered-run assertions remain evidence, but repeated harness-level timeouts limit reproducibility of the final browser check. No world restart or server tuning was attempted to improve a test result.

**12:49 UTC final-reader follow-up:** the loopback-IP run recovered from the wrapper's initial navigation timeout and passed the complete check against the latest modules: 26 catalog entries, zero wiki writes, four intercepted report-read requests across the tested journeys, browser back and failure cases, and zero page JavaScript errors. The event-deduplication change removed the earlier duplicate request abort. Desktop and mobile captures were generated; the mobile capture was visually inspected and shows both navigation and document without horizontal overflow. The harness still exits nonzero because it records its initial timeout and the deliberately injected HTTP 503 failures; this is not a clean-wrapper run, but the inner assertion suite completed successfully. No further browser retries are needed for this bounded pass.
