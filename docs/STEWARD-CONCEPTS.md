# Concepts Luis has engaged with: the world steward's account

*Written by the active world steward (Claude), Oct 17, 2026 (season ~1575), at Codex's interview request (`AGENTS.md`), which Luis asked for. Sources: `STEWARD.md` (decisions with Luis's words and dates), `data/steward.md` (the log), `reports/status/`, the commits, and the steward's current session. Earlier eras (before day ~682) are known to this session only through those files. Where so, it says "recorded", not "recalled".*

**Labels:** **Choice** = an explicit decision or question by Luis (quoted where recorded) · **Offered** = an explanation or proposal by the steward · **Outcome** = what the world then did (measured) · **Reading** = the steward's interpretation.

## Energy and food chains
- **Choice (recorded, Oct 16 08:45):** "let food, not room, set the population." This led to the leaner-grass rule (grass worth steps down to 35%).
  **Outcome:** bodies shrank from 9.4 to 8.0 and numbers rose from 226 to 327 (report s1163).
- **Choice (recorded, Oct 16 01:45):** "why are sharks, lions and bears few?" This led to the **predator brakes**: only 35% of a kill becomes the hunter, and a failed lunge costs energy.
  **Outcome:** kills fell 972 → 756 in testing; meat stayed a side food.
- **Choice (this session, s1571):** a review of "the current energy value of greens and meat … and its effects in species diversity" and hunters.
  - **Offered:** the measured income by food (dung 51–75% of the dung lines' energy, meat about 0%), and three walls to hunting: free dung, shells at 0.95, the gut "valley".
  - **Choice:** "First 1": make dung energy conserved, being implemented and tested now. Luis then asked to think about energy "not only … in a pyramidal sense but in a circularity or cyclic sense". **Offered:** energy flows from the sun and leaks at each step, while nutrients (fertility, mineral) cycle; dung and carcasses are where the two meet.
- **Tested, not applied (recorded, s789):** a stomach (bulk, digestion). No effect in that world; the report recommended seasonal grass quality instead.

## Evolution and speciation
- **Choice (recorded, s1366):** "I don't want to just bring the kraken back; find the right set of rules that will allow it to emerge." This led to the **apex rules** (growth after adulthood, shell-cracking bites, room for rare species, an apex niche).
  **Outcome (checkpoint s1381):** predation doubled, but growth went to grazers; no apex. The options are still open with Luis.
- **Choice (this session, s1534):** "the divide accelerates already emerging seams into potentially distinct species, and if not too much variation happens, at least tries to promote it … no groups of less than 40 founding members."
  - **Offered:** the explanation of the four-way median cut, whose pieces died within 4–12 seasons.
  - **Outcome:** a new rule: pieces of at least 40, and the faintest seam promoted instead of a geometric cut.
  - **Choice:** keep 15 founders for niche splits, and watch first.
- **Choice (recorded, Oct 16 07:10):** crowding counted per species, not per family, so small new species can grow out of danger. It was implemented at his word, without a test.

## Physics, orography and geology
- **Choice (recorded, s1216):** "don't focus too much on the original design idea, but rather on the physics and make it congruent; if unintended designs emerge, let them be." This principle has guided water and land since.
- **Choice (recorded, Oct 16 10:00):** temperature from height replaces north–south; river crossing decided by size, legs, fat and upkeep; a dormant swimming skill; earthquakes; water and erosion together.
  **Outcome:** lakes, carved canyons, a meseta cut into ribs, swimming rising to 0.18 in stream-side lines.
- **Choice (this session, s1536):** "is water flow eroding and changing elevation?" → "we need deposition".
  **Outcome:** material is conserved, and the deepest cuts refill.
- **Choice (this session, s1544): geology.** Luis answered the six questions of the [geology proposal](../reports/status/2026-10-17_s1542-geology-proposal.md):
  - three rocks;
  - tilted and folded layers;
  - ordinary rock for the barriers ("look … artificial; I'll let the geology and orography do its thing for a while");
  - the carving cap lifted.

  He asked whether rivers carve below the original "sea level". **Offered:** there is no sea, so 0 is only the old lowland level. Rivers stop at their base level, so a hard basement at −0.7 became the world's base level.
- **Parked by Luis (this session):** great floods ("let's park it for now").

## Biogeography and isolation
- **Choice (recorded, s1339):** isolating places would only isolate grazers unless other ways of life pay. This led to water plants, lichen, smooth parasitism, carcasses and meat specialists first.
- **Choice (this session, s1389): the four sections,** option B. The steward had explained that the wrapping map (a torus) makes one range and one river a single connected place, and proposed barriers on the seams.
  - Luis chose uneven sections, a broader meseta, the lowlands tilted west → east, a gorge cut by the river, specialists who can cross (climbing and swimming skills), ice, drought and quake passes, and no designed character.
  - He asked for "a drastic transformation … over 10 seasons" and to know when it would start.
  - **Outcome:** crossings fell from about 700 per season to 30–160. Species settled by region (one north-east endemic), and the meseta became a home for climbers.
  - **Choice:** "if they don't have climbing skills they would fall, right?" This led to falling as a rule.

## Physiology
- **Recorded examples:**
  - "foods that differ" (dry grass poor, rich food fattens more, Oct 15);
  - coats and climate (Oct 15);
  - juveniles that grow over time;
  - birth variation around the genes ("a way to meat", Oct 15).
  **Outcome over eras:** fat is the strongest selective force in every report's ledger.

## Computing, process and collaboration
- **Choices:**
  - test every world change headless first;
  - no rescues;
  - one change per check-in;
  - commit own changes once 12 hours old or when another agent asks in `AGENTS.md` (s1554);
  - one branch, "this project only moves forward";
  - coordination through `AGENTS.md`, with the steward notified on changes (this session);
  - "help me protect memory and performance".
- **Outcome:** a profiling pass that found the server clock itself throttling the world, live rate 19.6 → 24.2 ticks/s; and a watchdog that also restarts a frozen server.

## Reading
Luis's engagement is consistent: he sets conditions and principles ("physics first", "let food, not room, set the population", "find the right set of rules"), asks *why* when the world surprises him (sharks and lions, sea level, energy cycles), and delegates mechanics while keeping design choices. Ideas he declined or parked are as instructive as the ones built: bringing the kraken back by hand, rescues, great floods for now, and colder eras for an ice pass (offered, not chosen).
