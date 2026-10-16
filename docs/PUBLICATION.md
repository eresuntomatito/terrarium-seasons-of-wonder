# Publication record

Maintained by Codex on eresuntomatito's behalf.

## Redesign source update: 2026-10-17

The steward supplied two completed commits and confirmed the four-section rollout is live. The publication update reviews the five commits since the initial source boundary, including the intervening species events, across 20 changed paths.

| Local development revision | Corresponding public revision | Scope |
| --- | --- | --- |
| `a19479c368af8f5416b0abf713130b799973b4ab` | `141618ff221a22205232ad9ced1efbac282ac5c8` | Committed viewer redesign |
| `1d7ced1f118991d781c31d440594ac418da89eaa` | `f619e4e5460cc1f6968e924b696b78471577fdc5` | Four sections, apex rules, age fields, tools, and reports |

The same privacy filtering reproduces the initial source commit `b108b3b` exactly and retains all 2,570 source-history commits through the new boundary. That source history was fetched locally and merged into the existing publication branch, preserving the already-published documentation commits. No force-push or rewrite of public history is required. All 943 source files at the new boundary match the steward's committed tree, excluding `.claude` metadata. The existing public license and Codex documentation are additional files, not modifications to the steward's source.

The isolated startup and mechanism checks passed against `1d7ced1`. The live save independently recorded `rollout.sections = 1396` and crossing records. The new README photograph is from season 1400, around 44% through the ten-season rise. It shows the confirmed active transformation rather than implying the terrain has finished changing. See [verification](VERIFICATION.md) and [photograph provenance](assets/README.md).

Published in merge commit **`3ad21b6299d8b02c183ff54d9b002c27ffc10f76`**. Twelve unauthenticated HTTP checks matched the reviewed files, including the viewer, simulation, server, season-1396 report, README, and season-1400 photograph. Existing public history remains an ancestor of the update, and the public commit identities contain no personal email addresses. The community issue queue was empty at this verification pass.

## First release boundary

The first publication is available at [eresuntomatito/terrarium-seasons-of-wonder](https://github.com/eresuntomatito/terrarium-seasons-of-wonder), with MIT licensing and public credit to **eresuntomatito**. It includes the reviewed source and its species history, plus Codex's attributed documentation. It does not include the continuing world's save or other collaborators' unfinished working changes.

The species history was imported into a separate publication repository. All **2,565 commits** in the reviewed export were retained. Local `.claude` metadata was excluded, and author/committer email addresses were mapped to the account-ID-based GitHub no-reply identity. Explicit Claude co-author trailers in commit messages were preserved.

| Record | Revision |
| --- | --- |
| Original local source checked by Codex | `39359c940e0c4619a00a3d1ef02a7018e2d35d6b` |
| Corresponding imported public-source revision | `b108b3b3e8f20e0a30b870af8f08618c5b2883ec` |

The changed identifiers reflect the metadata/path filtering. The imported source tree is checked against the original source excluding `.claude`; the biological mechanisms were not edited for publication. The documentation and MIT license are added after this source revision.

The [verification record](VERIFICATION.md) and wiki use the original local revision to identify their test boundary. The table supplies its publication equivalent.

## Status

**Published and checked on 2026-10-16.** The public repository uses `main`, has issues enabled, and GitHub detects the MIT license. The first documentation-and-license commit is `3d8f468`, following the imported source revision above.

Unauthenticated HTTP checks fetched the README, license, running guide, wiki entrance, armour entry, and season-1328 image. Each response matched the corresponding publication-checkout file by SHA-256. Local documentation links were checked before pushing; source integrity and Git object checks passed. This verifies public content delivery, not browser rendering or every viewer interaction.

The first public issue-queue check at 2026-10-16 21:28 UTC found no open issues or pull requests. No community message was posted.

## Keeping the living world separate

The first photograph refresh used a direct season-1393 rain-spell capture, published in commit `2917cbb`. It showed the new artwork before the four-section rollout was active, while the public source still reflected the initial boundary. Luis clarified that the intended world transformation needed confirming too. The subsequent redesign update above includes the completed code and a new, readiness-checked season-1400 photograph; the [provenance](assets/README.md) retains that distinction.

The development checkout and its running processes are left in place. Its Git history, index, branch, and remotes are not rewritten by this publication. Future updates need a reviewed export or a deliberate synchronization strategy; publishing this copy does not automatically publish subsequent species events or code changes from the living world.

Use [Codex's agenda](CODEX.md) for follow-up work and the [publication review](PUBLICATION-REVIEW.md) for the contents and disclosure checks.
