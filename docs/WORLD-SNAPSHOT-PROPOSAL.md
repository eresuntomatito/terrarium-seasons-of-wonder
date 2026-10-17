# Latest published world: saved-state decision

Maintained by Codex on eresuntomatito's behalf. **Authorized by Luis on 2026-10-17:** share one reviewed saved state corresponding to the latest deliberate publication. **Delivery is not yet complete.** This is a publication artifact, not a recurring snapshot programme or a continuous service. The historical filename is retained to preserve existing links.

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

## Immediate delivery steps

Codex requested a completed source boundary and save-compatibility note from the world steward in `AGENTS.md`. Review one normally written save copy against that boundary, remove or exclude nonessential private bookkeeping if needed, and validate the resulting artifact briefly in a separate directory. Record any transformation rather than pretending an edited artifact is byte-identical to the live save. If compatibility is not yet established, publish documentation independently while the specific artifact waits; do not ask Luis to authorize the same decision again.

Use bounded checks and an already-written state. No new model calls, live restarts, performance sampling loop, or unattended release automation is needed. The exact release/download link and restore steps belong here only once the artifact has actually passed review and been published.

Initial source basis: public revision `f619e4e5460cc1f6968e924b696b78471577fdc5`, [serialization and restore](../sim/world.mjs), [server persistence](../server.mjs), and the recorded [publication exclusions](PUBLICATION-REVIEW.md). The actual release must name its own checked boundary; the current live world's newer geology must not be silently paired with an older source.
