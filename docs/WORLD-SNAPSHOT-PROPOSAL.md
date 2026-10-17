# Latest published world: saved-state decision

Maintained by Codex on eresuntomatito's behalf. **Authorized by Luis on 2026-10-17:** share one reviewed saved state corresponding to the latest deliberate publication. **Published and publicly verified:** [season-1561 release](https://github.com/eresuntomatito/terrarium-seasons-of-wonder/releases/tag/world-s1561), with [restore instructions](SAVED-WORLD.md). This is a publication artifact, not a recurring snapshot programme or a continuous service. The historical filename is retained to preserve existing links.

## The gap

The public repository preserves source, species history, reports, and photographs. A fresh start does not recreate the continuing world's creatures, accumulated terrain, supplies, active rollouts, or learned state. The [running guide](RUNNING.md) explains this distinction. A reader can start a world but cannot currently resume the one depicted in the README.

## Agreed scope

Keep one optional, reviewed state with a compatible published source revision and a small provenance/restore note. Update it only as part of a deliberate publication decision, not on a timer, after every season, or to maintain a live mirror. Do not create a historical series of automatic releases. Keep the source-only path usable.

Prefer a compressed release asset over committing repeated large saves into Git. Leave `data/` ignored and publish neither the whole runtime directory nor raw logs, bridge files, credentials, or session material. A static download creates no promise of support, uptime, freshness, or readership. Public live viewing is deferred separately.

## Review before release

- Select a completed source boundary and a save written by the normal save mechanism. Do not stop, restart, or reset the live world merely for publication.
- Inspect the entire intended artifact for private text, local paths, bridge material, logs, and unexpected fields. Do not publish `data/` wholesale. A simulation save includes registry and behaviour code as well as organisms and environmental state; “just a save” is not a substitute for content review.
- Record timestamp, season, source revision, save format, file hash, active rollouts, and a short description of what the reader is receiving. Hashes establish artifact identity, not safety or compatibility.
- Test loading, viewing, advancing, saving, and resuming **a separate copy** under that source revision. Use a paused model for this check and inspect what local species/Git callbacks can write.
- Explain that a continuation forks the world: it does not control Luis's running world, and future outcomes need not match. Do not promise deterministic replay or compatibility with arbitrary later source revisions.
- Provide installation instructions that begin with a separate checkout and backup any reader's existing save. Do not supply overwrite commands until the actual artifact and tested procedure exist.

## Delivery record

The prepared artifact is season **1561**, tick **8,427,282**, with **236 living bodies**, copied from an ordinary save before subsequent builder changes. It targets local source `d1ad73d` / public `370995a`, as confirmed by the steward. Only the 94 queued `pendingStudies` requests were cleared; the world state, code, registry, and historical summaries are retained. The 12.5 MB JSON compresses to approximately 1.30 MB, avoiding repeated large Git blobs. Bounded scans inspected 17,889 strings without credential/home-path pattern matches; this is not a guarantee of absence of every possible private detail.

On an isolated source archive, the reviewed JSON loaded at its saved tick/body count, produced the five geology viewer fields, advanced 20 steps, serialized/reloaded, and advanced once more with finite body values. No model or Git callbacks were installed. The process was limited to a 256 MB JavaScript heap and ended after the short check; it is not an ecological or performance study. The gzip and manifest were then uploaded and downloaded without authentication; both matched the prepared hashes. The documented restore path and existing-save refusal also passed on a separate fixture.

The world steward supplied the completed source boundary and compatibility note in `AGENTS.md`. This release records its one transformation instead of pretending the artifact is byte-identical to the original live save. For a later deliberate publication, apply the same bounded disclosure and compatibility gates; do not create an automatic update obligation or ask Luis to reauthorize an already resolved principle.

Use bounded checks and an already-written state. No new model calls, live restarts, performance sampling loop, or unattended release automation is needed. The exact download and tested restore steps are in [the saved-world guide](SAVED-WORLD.md).

Initial source basis: public revision `f619e4e5460cc1f6968e924b696b78471577fdc5`, [serialization and restore](../sim/world.mjs), [server persistence](../server.mjs), and the recorded [publication exclusions](PUBLICATION-REVIEW.md). The actual release must name its own checked boundary; the current live world's newer geology must not be silently paired with an older source.
