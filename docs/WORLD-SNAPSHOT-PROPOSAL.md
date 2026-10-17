# Proposal: a world readers could continue

Prepared by Codex on eresuntomatito's behalf. **Proposal only: no continuing-world save has been published or approved for publication.**

## The gap

The public repository preserves source, species history, reports, and photographs. A fresh start does not recreate the continuing world's creatures, accumulated terrain, supplies, active rollouts, or learned state. The [running guide](RUNNING.md) explains this distinction. A reader can start a world but cannot currently resume the one depicted in the README.

## Three useful choices

| Choice | What readers receive | Tradeoff |
| --- | --- | --- |
| Keep source and reports only | The current publication, with clearer explanations and dated imagery | Least disclosure and maintenance; no continuation of the pictured world. |
| Publish one reviewed milestone snapshot | An optional save tied to a named source revision and season | Closest way to explore an existing moment; requires compatibility testing and an explicit disclosure decision. |
| Offer periodic snapshots | Several dated starting points | More preservation and comparison possibilities, but recurring review, storage, and maintenance. Not recommended as an initial commitment. |

**Codex's recommendation:** consider one optional milestone snapshot after documentation has made the source/save distinction clear. Keep the source-only path fully usable. A snapshot should be a separate, explicitly reviewed release asset rather than removing `data/` from `.gitignore` or committing a live directory.

## Review before release

- Select a completed source boundary and a save written by the normal save mechanism. Do not stop, restart, or reset the live world merely for publication.
- Inspect the entire intended artifact for private text, local paths, bridge material, logs, and unexpected fields. Do not publish `data/` wholesale. A simulation save includes registry and behaviour code as well as organisms and environmental state; “just a save” is not a substitute for content review.
- Record timestamp, season, source revision, save format, file hash, active rollouts, and a short description of what the reader is receiving. Hashes establish artifact identity, not safety or compatibility.
- Test loading, viewing, advancing, saving, and resuming **a separate copy** under that source revision. Use a paused model for this check and inspect what local species/Git callbacks can write.
- Explain that a continuation forks the world: it does not control Luis's running world, and future outcomes need not match. Do not promise deterministic replay or compatibility with arbitrary later source revisions.
- Provide installation instructions that begin with a separate checkout and backup any reader's existing save. Do not supply overwrite commands until the actual artifact and tested procedure exist.

## What needs a decision

Does eresuntomatito want readers to **continue a copy of a particular world moment**, or is starting their own world sufficient? If a copy is wanted, choose a milestone and authorize review of that specific save for public release. No need to decide periodic distribution, hosting, or a maintenance promise now.

Source basis: public revision `f619e4e5460cc1f6968e924b696b78471577fdc5`, [serialization and restore](../sim/world.mjs), [server persistence](../server.mjs), and the recorded [publication exclusions](PUBLICATION-REVIEW.md). The full release review and compatibility test remain undone.
