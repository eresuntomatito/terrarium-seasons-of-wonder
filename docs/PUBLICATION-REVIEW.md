# First publication: review and proposed contents

Prepared by Codex on 2026-10-16. This records the publication boundary and its review. The final publication status and commit mapping are recorded in `PUBLICATION.md` when the release is prepared.

## The version reviewed

The source boundary is **`39359c940e0c4619a00a3d1ef02a7018e2d35d6b`**, a committed snapshot captured before further work in the active sessions. It contains 2,565 commits and 933 tracked files. The documentation written for publication is added to that snapshot separately.

This boundary keeps the release review reproducible while the world continues. It deliberately excludes uncommitted changes by other collaborators and commits created after the captured revision. A later publication refresh requires a review of that delta; do not silently widen the boundary.

## Inventory

| Material | Reviewed snapshot | Publication treatment |
| --- | --- | --- |
| `species/` | 780 tracked files | Include the definitions and event annotations; preserve their history where possible. These are not a live-world save. |
| `fossils/` | 67 tracked files | Include earlier-era behavior files. |
| `reports/` | 51 tracked files, including 26 PNGs | Include the dated studies and visual record; link specific seasons rather than presenting them as current. |
| `sim/`, `god/`, `public/`, server, package, tools | Committed implementation | Include the reviewed source, with a guide explaining fresh-start limitations and automatic Git activity. |
| `STEWARD.md` | Committed rules and history | Include as a historical and operational source. The public explanation must not treat every old instruction as the current rule. |
| `.claude/scheduled_tasks.lock` | Tracked local session metadata | Exclude from the publication tree and exported history. |
| `data/`, `stillbirths/` | Ignored; no matching file paths found in the reviewed reachable history | Exclude by default. Do not package the live save, steward log, or private session records. |
| README, `AGENTS.md`, `docs/` | Publication drafts by Codex | Include after link, content, and disclosure review. The agent notes provide continuity and explicitly identify their authorship. |
| Other sessions' working changes and later commits | Outside the captured revision | Leave untouched and outside this first prepared payload. |

The source uses only Node built-ins and declares no package dependencies. No separate third-party license files or vendored libraries were found in the tracked inventory; that is an inventory observation, not a legal determination of authorship or rights.

## Review performed

All 10,412 objects reachable from the captured revision were inventoried, including **2,684 blobs**. Text blobs were scanned for common private-key headers, GitHub tokens, OpenAI/Anthropic-style keys, AWS access-key identifiers, credentials embedded in URLs, macOS home-directory paths, and email addresses. No matches were found in those text blobs. Binary blobs were not text-scanned. This is a bounded pattern check, not a guarantee that every possible secret format has been excluded.

All 995 distinct historical file paths were checked for runtime directories, session metadata, environment files, and common key-file extensions. The local `.claude` lock was the finding. The largest historical blob is **949,297 bytes**, an existing PNG; no reviewed blob exceeds 1 MB.

Commit metadata contains one distinct author/committer email, which is a personal address. It is not reproduced in these notes. Publishing the original history would publish that address even though no source file contains it.

Commit messages were also checked with those patterns. They contain ten Claude co-author trailers with an address at the model provider's domain, and no matches for the checked credential patterns, home-directory paths, or personal email addresses. Preserve those explicit collaboration credits; they are different from the personal author/committer email mapping proposed below.

## Recommendation: preserve history in a publication copy

The Git history records species births, splits, returns, and extinctions. Preserve that story rather than flattening it into one source snapshot. Prepare a separate export so that publication work does not change the live world's Git history, index, or remote.

For that public export, exclude `.claude` throughout and replace the personal commit email with an agreed public or GitHub no-reply address. Keep the original author names, dates, messages, source changes, and ancestry where path filtering permits. Filtering and email replacement necessarily change commit identifiers; code references in the wiki should retain an explicit mapping from the reviewed local revision to its published equivalent. Source descriptions must not imply that a filtered history retains identical hashes.

A source archive is also useful as a reviewable payload and fallback. It preserves the definitions, fossils, and reports at this moment, but not the commit-by-commit record. No history rewriting in Luis's working repository is proposed.

The history export was imported into a separate publication repository using the verified account-ID-based no-reply address. Its corresponding source revision and the successful public checks are recorded in [the publication record](PUBLICATION.md). The local original history remains the authoritative unfiltered record.

## Repository presentation

- Account: `eresuntomatito`.
- Proposed repository: `terrarium-seasons-of-wonder`.
- Display title: **Terrarium: Seasons of Wonder**.
- Proposed description: “A world for its own sake: evolving creatures, changing landscapes, and the joy of watching what happens.”
- Visibility: public, as requested by Luis.
- Issues: enabled for questions, observations, and suggestions. Use the attributed [community practice](COMMUNITY.md).
- Wiki content: versioned under `docs/wiki/` initially; separate hosting is not required for launch.

An authenticated GitHub lookup could not resolve a repository at the proposed account/name on 2026-10-16. That suggests it is available in this account, but creation itself is the definitive check. No remote is configured in the living checkout.

## Decisions made for the public write

1. **Reuse permissions.** Luis selected the [MIT license](https://opensource.org/license/mit). It is a software license, separate from Creative Commons. The repository now includes its license text. Public visibility alone would not grant the same general permissions; see [GitHub's explanation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).
2. **Public identity.** Luis selected **eresuntomatito** for public credit. The separate publication history uses a GitHub no-reply address instead of the personal author/committer email. Historical source reports retain their original wording, including his first name.

These decisions complete the requested release choices. They do not imply that the human creator personally wrote the source code; the collaboration credits describe the work separately.
