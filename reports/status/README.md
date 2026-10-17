# World status reports

One file per report, named `YYYY-MM-DD_sSEASON.md` (status) or `YYYY-MM-DD_sSEASON-topic.md` (a test or study), newest last. Each covers the last 30 seasons:

0. The world at the moment of the report (a screenshot of the viewer, `img/<report>-world.png`, taken with `tools/snapshot.mjs`)
0b. The land (orography "X-ray", Luis s1235): the land alone — elevation colours with hill shading and contour lines, steep ground in red, water depth with flow arrows, snow, the frost line, recent quake faults (`node tools/orography.mjs`, then the browser skill with `tools/orography-shot.mjs` → `img/<report>-orography.png`), with a few lines on the river's course, canyon depth, lakes, snow and quakes in the window
1. In one paragraph
2. Then and now (population, species, kraken, grass; family body averages)
   2b. Species alive at the report (each with its body, kills, distance from the founder and standing)
3. What happened in the world (divides, splits, extinctions, droughts, kraken)
4. What we changed (rules and parameters, with the season they took effect)
5. How it shows in the creatures (changes linked to causes)
6. Backlog (worth doing now / pending)
7. Risks (collapse, mass extinction, the kraken line, the server)
8. Next to watch
8b. Diversity (Luis, s1339): species alive, new species and extinctions per 30 seasons, how species were born (kind, founding size) and died (cause, lifetime), predation/starvation/old-age shares, and the era's founding-size → lifetime table — `node tools/diversity.mjs <previous report season> <this season>`, pasted as is
9. What shapes the species (selection by cause from the ledger — traits of breeders and of each cause of death vs the living — and which rules and conditions drove the changes; data from data/cycles.jsonl and world.ledger)

Read them formatted at http://localhost:8000/reports.html (linked as "reports" in the world viewer).

Sources: `data/world.json`, `data/server.log` (the chronicle), `data/steward.md` (the steward log), `STEWARD.md` (rules).

| Report | Season | Headline |
|---|---|---|
| [2026-10-15_s761](2026-10-15_s761.md) | 761 | One grass-eating family of near-twins; juvenile hunting is the first step toward meat; niche route out of reach |
| [2026-10-15_s767](2026-10-15_s767.md) | 767 | Down to three grass-specialist species; home ranges pull them into regions; shell creeping up against juvenile hunting; mass-extinction risk elevated |
| [2026-10-15_s789-stomach-test](2026-10-15_s789-stomach-test.md) | 789 | Test: a stomach (bulk, digestion, rich food fattens) — no effect in today's world; recommend grass quality by season instead; not applied |
| [2026-10-15_s797](2026-10-15_s797.md) | 797 | A drought era: back to seven regional species through divides; all still grass specialists; omorushes (the meat line) gone; browse stirring; kraken gen 40 |
| [2026-10-15_s814](2026-10-15_s814.md) | 814 | Monitoring run: 7 → 4 species after a drought; bodies bigger and fatter; fat is the strongest force; new decomposer/parasite abilities selected against so far |
| [2026-10-15_s835-way-out-of-grass-test](2026-10-15_s835-way-out-of-grass-test.md) | 835 | Test: gut plateau + carrion stepping stone + protein — carrion opens the door (omnivores, scavengers), plateau moves guts up; rolling out 1 → 3 → 2 |
| [2026-10-15_s844](2026-10-15_s844.md) | 844 | A dry era: deep drought prunes eyes, size and shell; plateau + carrion live; first omnivores; new abilities no longer selected against |
| [2026-10-15_s874](2026-10-15_s874.md) | 874 | All rule steps live (protein, smooth, weak prey, climate, packs) with no crash; decomposers take off (25 animals); three mind splits, ommooms lead; climate not yet regional |
| [2026-10-15_s911](2026-10-15_s911.md) | 911 | Eight species after two divides and a mind split; guts and browsing rise, shells return; first climate mark: thicker coats in the cold north |
| [2026-10-15_s948](2026-10-15_s948.md) | 948 | Turnover: five extinctions, the dronathu family takes over (quitybels, modrolis, kekequis); old kraken dies, gen 42 hatches; decomposers now help survive hunger |
| [2026-10-15_s991](2026-10-15_s991.md) | 991 | The decomposer window: three niche splits (ushradros, galushors, belliushs), 78 dung-eaters; dronathu family and browsing gone; kraken gen 42 full-grown; no hunter yet |
| [2026-10-16_s998-hunter-roadmap-test](2026-10-16_s998-hunter-roadmap-test.md) | 998 | Test: five walls to hunting lowered (valley, skill, packkin, sizevar, massroom) — kills ×25 with the valley, ×45 with skill, half of them adults; no harm; released s1000–s1016 |
| [2026-10-16_s1021](2026-10-16_s1021.md) | 1021 | Hunting begins: valley switch ×5 predation, the saomors (a dung split) become the hunters; six species eaten out incl. the kraken hatchling; brakes, laxer pause, room 360 |
| [2026-10-16_s1052](2026-10-16_s1052.md) | 1052 | The roadmap in full: predation doubled (7,161 eaten), one prey line + one hunter family, ~17 species eaten out; size splits by role (prey 5.0, hunters 7.6–8.4); hunters are dung-eaters too |
| [2026-10-16_s1090](2026-10-16_s1090.md) | 1090 | After the hunt: the last prey line (tytyvens) dies out, predation falls ¾, everyone grazes; giants under room by mass, then the kethus shrink and multiply; waiting on Luis about room by mass |
| [2026-10-16_s1128](2026-10-16_s1128.md) | 1128 | A world of giants: size 9.4, heads down to 226 under room by mass; tysadros hunt young; crowding switched to species (s1126) |
| [2026-10-16_s1163](2026-10-16_s1163.md) | 1163 | Food starts to count: leaner grass (66%) starves the giants (tysadros, kethus), bodies 9.4 → 8.0, heads 226 → 327; evolving grass begins to sort (hardier north) |
| [2026-10-16_s1172-orography-proposal](2026-10-16_s1172-orography-proposal.md) | 1172 | Proposal (+ decisions, progress and visuals, s1186): a mountain range (peak west, meseta east) across the map at 35% from the bottom, a wrapping river at 32% from the left, cold from height, slopes, river crossings, erosion, earthquakes — 5 phases, 6 decisions for Luis |
| [2026-10-16_s1194](2026-10-16_s1194.md) | 1194 | Leaner grass at its 35% floor, room by mass still binds; the family turns to dung (decomposer 0.37 → 0.52, 254 dung-eaters); the relief begins to rise |
| [2026-10-16_s1224](2026-10-16_s1224.md) | 1224 | The orography arrives: full relief, water (a lake, streams, a carved canyon, snow), wading/swimming, quakes armed; speed fix; legs rise, swimming stirs; tyormos (mother line, 105 seasons) gone |
| [2026-10-16_s1260](2026-10-16_s1260.md) | 1260 | A smaller, shell-bearing world: room cut 40%, armour 0.35 → 0.54, the galushty family ends; the great quake (s1236) and a branching drainage; first orography X-ray |
| [2026-10-16_s1298](2026-10-16_s1298.md) | 1298 | Two body plans: small shelled browsers (navennas, armour 0.78) vs bigger hunters; swimming doubles; lakes and deep carving on the range, two small quakes drawn in the X-ray |
| [2026-10-16_s1326-whitepaper-what-shapes-species](2026-10-16_s1326-whitepaper-what-shapes-species.md) | 1326 | Whitepaper: what shapes species, diversity and food-chain complexity across the genesis era — fat and predation shape traits; species count stable (5–7) while turnover varies; predation drives complexity (r = +0.60); tried vs untried, 10 ideas ranked |
| [2026-10-16_s1328](2026-10-16_s1328.md) | 1328 | The oldest lines end (quilitys, 153 seasons); 4 species, shelled browsers win (armour 0.71, navennas 0.85); hunters thin; the meseta carved into ribs; a quake crosses the peak |
| [2026-10-16_s1365](2026-10-16_s1365.md) | 1365 | New ways of life start working: swimming ×3 in stream-side lines (liralis 0.15), lichen fills the heights (92 on the range, thicker coats there); great quake across the peak (s1336); navennas’ shells 0.98 |
| [2026-10-16_s1375-four-sections-proposal](2026-10-16_s1375-four-sections-proposal.md) | 1375 | Proposal: four isolated sections — why the torus (wrapping map) defeats them today; options A/B/C (recommended B: barriers on the seams); barrier strength, passes; 4 questions for Luis |
| [2026-10-16_s1381-apex-checkpoint](2026-10-16_s1381-apex-checkpoint.md) | 1381 | Checkpoint: apex rules after 10 seasons — predation doubled (shell-cracking works), growth went to well-fed grazers (inherited size fell), no apex or meat specialist yet; options: growth fed by meat, richer meat from meat-eaters, slower big lives, more time |
| [2026-10-17_s1396](2026-10-17_s1396.md) | 1396 | The family turns to dung (135 decomposers, two dung splits; mosalis lead); apex rules grew grazers, not hunters; sabelushs gone; a great quake (s1391); the four sections begin to rise (s1396 → s1406) |
| [2026-10-17_s1474](2026-10-17_s1474.md) | 1474 | The sections work: species settle by region (NW dung-and-shell lines, NE swimmers and grazers; tyzuors only NE), the south empties; crossings ~700 → 30–160/season; navennas (245 seasons) and thuzulis (176) gone; scavenger giants (drobelvens, 15.6) rise and are eaten down; guts double, still no hunter. (48 seasons late) |
| [2026-10-17_s1509](2026-10-17_s1509.md) | 1509 | The mosalis (119 seasons) broken by three divides in three seasons: nanasas thrive (116), four small pieces die (incl. the median cut in four); drobelvens gone; species stay regional (ushdrogals NW only, tyzuors/ushtyras NE only); great quake s1491 |
| [2026-10-17_s1542-geology-proposal](2026-10-17_s1542-geology-proposal.md) | 1542 | Proposal: a bit of geology on top of deposition (live s1542) — rock hardness and layers, soils and minerals (regional shells, rich floodplains), slopes that fail, slow uplift; recommended 1 + 2 first; 6 questions for Luis |
| [2026-10-17_s1544](2026-10-17_s1544.md) | 1544 | Dung lines hold the north-west (venthutys 105, dung 0.83), the liralis take the meseta (27 of 46, best climbers); tyzuors (131) and ushdrogals (163) gone; the divide rethought (s1534) and deposition live (s1542) |
