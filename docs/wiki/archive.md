# Reading the terrarium's surviving layers

Written by Codex on eresuntomatito's behalf. Inventory checked against public source `779706d79ba07f16cd9d187eae79703f25d5bc0d` and its preserved history. Luis identifies the surviving project folder as the complete available archive; the task is to interpret it, not demand a missing perfect recording.

## What survives publicly

| Layer | Material | What it can establish—and what it cannot |
| --- | --- | --- |
| `fossils/era-1` | 9 behaviour files | Preserved programs and their annotations; not a complete organism census, geography, or record of every earlier variant. |
| `fossils/era-2` | 10 behaviour files | Another named archive layer, not necessarily a complete continuation of every file in era 1. The absence of `wanderer.js` here is not a population measurement. |
| `fossils/era-3` | 48 behaviour files | An archived behaviour collection; repeated extinction/return comments need interpretation rather than being concatenated into an unquestioned timeline. |
| Source commits | Initial implementation, mechanics changes, species events, and later handoffs | Committed software and recorded event messages. A commit boundary is not automatically the moment every code change first ran. Author identity does not establish who wrote the code. |
| Reports and images | Dated status accounts, tests, proposals, terrain views | What an account measured, depicted, or interpreted at a stated period. A whole-world photograph is not a species-only coordinate dataset. |
| Published saved state | A separate reviewed season-1561 artifact | Individual/body/terrain information for that preserved moment, not arbitrary past moments or a continuously refreshed archive. |

## A concrete comparison

The [era-1 wanderer](../../fossils/era-1/wanderer.js) seeks nearby food, wanders with a noise field, separates from neighbours, and returns a steering vector. The [era-3 wanderer](../../fossils/era-3/wanderer.js) visibly includes personal genes and a different behavioural interface. The text establishes differences between the preserved programs. It does not by itself establish a measured fitness improvement, a complete evolutionary transition, or the exact rules under which every archived organism lived.

The era-4 starting commit [describes an explicit archival/reset boundary](https://github.com/eresuntomatito/terrarium-seasons-of-wonder/commit/d412143): it says era-3 species files were archived, while its save/log remained untracked under `data/`. It records stage physics, body-held birth energy, a nutrient loop, lasting corpses, and stewardship tooling. Later [genesis/mechanics work](https://github.com/eresuntomatito/terrarium-seasons-of-wonder/commit/029a194) is another software layer, not proof that all those rules existed in eras 1–3.

These anchors make an incomplete but useful historical account possible without reconstructing nonexistent exact trajectories.

## Four labels for reconstruction

### Local checkpoints actually found

Read-only inspection on 2026-10-17 found more than fossil code. The local archive includes these saved checkpoints; the following is a derived inventory, **not publication of those private files**:

| Local artifact | Saved version / season / tick | Living bodies at that checkpoint |
| --- | --- | --- |
| `data/era-1.json` | v2 / 11 / 55,053 | 330 wanderers and 2 stalkers; all 332 rows have finite positions. |
| `data/era-2.json` | v2 / 19 / 98,516 | Zero creature rows. This supports an empty saved checkpoint, not a cause of extinction. |
| `data/era-3.json` | v3 / 128 / 689,792 | 479 beetles and 31 breathwalkers; all 510 rows have finite positions. |
| `data/world.before-progenitor.json` | v3 / 559 / 3,018,222 | One kraken with a finite position. |

These seasons belong to different saved worlds/eras and must not be merged into one continuous seasonal clock. Some historic coordinates **are** recoverable at these specific moments. A future map should first verify that era's coordinate bounds and units rather than assume the current atlas grid. Missing trajectories between checkpoints remain missing. Do not feed a v2 archive into the current loader and call a freshly seeded result a successful restoration: its version guard selects a fresh world for unsupported formats. These files were parsed as data, not executed or advanced.

History arrays also survive in these saves, but an array's presence does not prove it stores individual trajectories. A bounded reconstruction can use population histories after checking their schema. No recurring old-world release series is implied.

- **Observed artifact:** a file, image, field, or commit actually survives.
- **Recorded account:** the steward or report describes a question, intervention, or outcome. Preserve its date and attribution.
- **Reconstruction:** several surviving anchors support a limited sequence or broad region. State the method and unresolved alternatives.
- **Unrecoverable at this resolution:** no available artifact supports the requested precision. Use a broader representation or leave the gap visible; it is not a request for Luis to produce absent data.

Private local saves/logs may contain additional historical evidence. Their existence does not authorize publishing them wholesale; a derived account can cite a reviewed observation without exposing the raw runtime directory. The one [published state](../SAVED-WORLD.md) has its own explicit review and compatibility record.

## Questions that fit the archive

Which behaviour interfaces changed? Which rules were deliberate interventions? Which lineages are recorded before and after a boundary? Which hypotheses were tested and declined? Can a reported broad location be preserved without inventing a heatmap? These questions fit a historian's or archaeologist's method and the project's purpose of sharing what was explored.

Continue with [the short history](history.md), [the steward's conceptual account](../STEWARD-CONCEPTS.md), and [evidence standards](evidence.md). More detail is useful only when the surviving material supports it.
