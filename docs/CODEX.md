# Codex's working agenda

Maintained by Codex on Luis's behalf. Established 2026-10-16.

## Purpose

Help people encounter, understand, and explore **Terrarium: Seasons of Wonder**, and carry its first GitHub publication through to completion. Preserve the pleasure and curiosity behind it, make the collaboration legible, and distinguish the world's observed history from what its rules might allow.

My role is documentarian, wiki editor, publishing collaborator, and community collaborator. The subject is the world as a whole: its organisms, places, mechanisms, history, and the ideas behind it. Claude remains the steward. My writing is mine, attributed as such; I do not speak as Luis or claim to remember another agent's experiences.

## Pace and working method

- Work in bounded passes, each producing a reviewable artifact or resolving a specific question. Choose the next task from this backlog without requiring Luis to manage each step.
- Begin each pass by reading `AGENTS.md`, this agenda, and the working tree status. Check which files others are changing and keep publication edits within the agreed documentation scope.
- Investigate only as far as the current artifact needs. Keep evidence beside claims; label interpretations, proposals, and unknowns.
- Finish each pass by checking the relevant links, facts, or instructions, then recording what changed, what remains uncertain, and the next action.
- Review the README and backlog when a publication milestone is reached or new world developments materially change the account. Do not attempt to mirror every season; the steward's reports already preserve that detail.
- After publication, review new or updated GitHub issues once per active community-work pass. Investigate substantive questions before answering, bring useful feedback into this backlog, and leave a clear handoff for the steward when suggestions affect world-building. No unattended monitoring or response-time promise is implied.
- Ask Luis for decisions about his intentions, attribution, licensing, or public disclosure when those decisions become necessary. Prepare concrete options first and continue independent work while waiting.
- Keep substantive updates concise. Do not create extra documents merely to record activity; prefer improving the existing artifact.
- This is a session-based pace. No background schedule or automatic check-in has been created, and work does not continue between active sessions. A future session resumes from the next action below.

## Backlog

Statuses: **ready** means independently actionable; **needs evidence** means an investigation is needed; **needs Luis** means a decision is needed before the dependent action; **done** means the stated result exists.

| ID | Priority | Task | Status | Finished when |
| --- | --- | --- | --- | --- |
| P01 | First | Establish publication inventory and recommend how to preserve history | Done for `39359c9` | See `PUBLICATION-REVIEW.md`: source inventory, separate publication-copy recommendation, and history/disclosure tradeoffs. |
| P02 | First | Review intended public contents and history | Done for `39359c9` | Historical objects and paths reviewed with bounded credential patterns; metadata disclosure identified; existing report links and new documentation checked. A later source refresh needs a delta review. |
| P03 | First | Make the README welcoming and accurate | Done for first publication | README includes an inspected historical image, purpose, credits, wiki entrance, reports, and running guide. |
| P04 | First | Verify a stranger's path to running a separate world | Done within recorded limits | `RUNNING.md` and `VERIFICATION.md` record tested startup, HTTP/SSE, signal save/resume, 400 ticks, and source-inspected model/Git behavior. No browser rendering or model generation was tested. |
| P05 | Next | Establish the wiki's structure and first connected explanations | Done for first slice | `wiki/README.md` connects armour, mineral supply, a dated navenna account and ancestry/atlas context, and evidence standards. Full encyclopedia coverage remains P11–P13. |
| P06 | Next | Tell a short, evidenced history | Needs evidence | A small set of turning points connects questions, interventions, and observed results, with links to reports and clear limits on causal claims. |
| P07 | Next | Establish the collaboration credits | Needs evidence | Luis's role is described in his accepted terms; Claude and Qwen's contributions are supported; earlier Codex work is evidenced or explicitly left unresolved. Git commit identity is not treated as proof of authorship. |
| P08 | Before publication | Confirm license, credit preferences, and disclosure choices | Done | Luis selected MIT and public credit as eresuntomatito. The publication history uses the account-ID-based GitHub no-reply address. |
| P09 | Before publication | Prepare and publish the GitHub repository | Done | Public repository created and pushed; GitHub reports PUBLIC, main, issues enabled, and MIT. Six unauthenticated content checks match local publication files. See `PUBLICATION.md`. |
| P10 | After publication | Establish a sustainable update practice | Ready | Documentation distinguishes stable explanations from dated observations, and the next session knows when publication needs updating without requiring a rewrite after every season. |
| P11 | Next | Build the trait and rule reference | First entry complete; continue | Armour and mineral-supply pages exist. Next inventory the remaining inherited, acquired, and derived traits before extending coverage. |
| P12 | Next | Build species accounts and a dated atlas | First entry complete; needs map data | Navenna page has dated traits, sourced ancestry, and whole-world atlas context. A species-specific geographic distribution has not been produced; dated individual positions are still needed. |
| P13 | Next | Explain selection, variation, and the model's limits | Needs evidence | The wiki connects relevant biological concepts to actual implemented mechanisms and separates model assumptions, selection measurements, correlations, and causal evidence. External scientific claims use appropriate sources. |
| P14 | Before publication | Prepare community workflow | Done for launch | `COMMUNITY.md` establishes attributed replies, investigation, handoffs, and decision boundaries. Repository settings or templates can be proposed once the repository exists. |
| P15 | After publication | Engage with issues and suggestions | Ongoing | First public queue check at 2026-10-16 21:28 UTC found no open issues or pull requests. Continue during active passes under `COMMUNITY.md`. |
| P16 | Now | Refresh the README photograph after the viewer redesign | Captured; publishing | Selected the season-1393 rain-spell frame after observing greener conditions and their decline. New asset and provenance are in `docs/assets/`; publish and verify this documentation-only update. |

## Open questions

Uncertainty is work to track, not a reason to stop the entire agenda.

| Question | Next action | What depends on it |
| --- | --- | --- |
| What did earlier Codex sessions contribute? | Inspect relevant history and ask the active steward for specific evidence; ask Luis only if local sources cannot establish it. | Detailed attribution, not the rest of the documentation. |
| Can the active steward offer a first-hand collaboration account? | Leave the interview questions available for an attributed response. The existing interview came from a fresh session and must stay labeled that way. | A richer account of the process. |
| Should publication include the full existing Git history? | Resolved for first release: all 2,565 reviewed commits retained in a separate filtered history, with local metadata excluded and no-reply author/committer emails. | Future synchronization strategy. |
| What exactly does a fresh checkout create? | Resolved for `39359c9`: 150 wanderers and three initial rollouts, not the continuing genesis world. Keep `RUNNING.md` aligned with future implementation changes. | Ongoing documentation maintenance. |
| Should readers receive a saved world as well as source? | First explain what code alone preserves and what an optional snapshot would add. Runtime data is excluded by default. | Optional snapshot delivery; source documentation can proceed. |
| How does Luis want to be named publicly? | Resolved: eresuntomatito. Historical reports retain their existing references to Luis. | Keep public credits consistent. |
| What reuse does Luis want to permit? | Resolved: MIT. Its distinction from Creative Commons was explained when applying the choice. | Include the license in publication. |
| Is the proposed slug available? | Resolved: the public repository now exists at eresuntomatito/terrarium-seasons-of-wonder. | No further naming action needed. |
| Where should the wiki be presented? | Start with versioned Markdown under `docs/wiki/`; assess GitHub Wiki or a rendered site once navigation and content exist. | Presentation and hosting, not initial writing. |
| What should species maps show? | Begin with separately labeled spatial distributions and ancestry diagrams; inspect which historical positions and ancestry sources are actually available before promising time-series coverage. | Atlas coverage and historical map claims. |
| How should community monitoring run between sessions? | Use active-session review initially. Discuss a schedule only if Luis wants unattended monitoring; none is configured. | Background responsiveness, not replies during active work. |

## Current handoff

**Completed:** first public GitHub release under MIT, credited to eresuntomatito; publication review at `39359c9`; filtered species history; checked startup guide; README with an inspected image; first connected wiki section; community workflow; public metadata and unauthenticated content verification. See `PUBLICATION.md`, `PUBLICATION-REVIEW.md`, and `VERIFICATION.md` for scope and limitations.

**Next action:** finish pushing and checking P16's README photograph refresh. Then P11's inherited/acquired/derived trait inventory and P07's earlier Codex attribution investigation remain open. Review the GitHub issue queue once per active community pass. Future source publication needs a reviewed delta and synchronization strategy, because the living checkout continues on its original history.

**Publication checkout:** `/private/tmp/terrarium-publication-7kcsrlxg/repository/` has the public `main` branch and its `origin`. The sibling `prepared/` directory contains review artifacts. These are temporary local paths; clone the public repository into a fresh working location if they disappear. The original development checkout has no publication remote added. Do not try to push its unfiltered history directly to the public repository.

**Initial inventory, 2026-10-16:** at commit `00f72ac`, Git reported 2,564 commits and 933 tracked files, including 26 images under `reports/status/img/`. No Git remote was configured. `README.md`, `AGENTS.md`, and `docs/` were untracked drafts. `.claude/scheduled_tasks.lock` was tracked; no files under `data/` or `stillbirths/` appeared in the current tracked inventory. This says nothing yet about earlier history. The live process can create new species commits, so these counts are a dated observation.

**Concurrent work observed:** other sessions have changed `STEWARD.md`, `public/index.html`, the status-report index, `sim/world.mjs`, and `tools/cycle.mjs`, and added a season-1365 report/images, a season-1375 proposal, and `tools/apex.mjs`. Leave those changes untouched. The living world's species commits also continue. Documentation and the license were committed and pushed only from the separate publication checkout; original working drafts remain in place.

**Validation so far:** isolated startup/headless/mechanism checks passed; the new documentation links and README PNG were checked; 72 existing report links resolve in the source archive; imported source tree matches the reviewed tree excluding local metadata; Git object checks passed; public metadata and six unauthenticated content checks passed. Whitespace checks pass. Browser rendering, model generation, and long-term ecology remain unverified.
