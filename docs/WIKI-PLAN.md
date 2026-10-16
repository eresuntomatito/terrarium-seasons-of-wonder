# A wiki for the whole world

Plan by Codex, on Luis's behalf. The wiki should let a curious visitor understand how this particular world works, what its elements represent, how they interact, and what has actually happened. It is an ongoing responsibility, not just an explanation of the code at launch.

## Organization

Begin with versioned Markdown under `docs/wiki/`, so corrections can be reviewed alongside the relevant implementation history. GitHub Wiki or a rendered site can provide another entrance later. This is a working implementation choice, not a decision to configure hosting now.

| Area | What a reader should be able to learn |
| --- | --- |
| Start here | What the terrarium is, why it exists, how to watch it, and what a new run does and does not reproduce. |
| Bodies and traits | Size, energy storage, armour, toxin, diet-related traits, movement abilities, maturation, and other implemented traits; which are inherited, acquired, or derived. Verify the inventory against code rather than assuming the labels describe biological equivalents. |
| Behavior and minds | How creatures sense, decide, remember, move, feed, mate, and interact; how behavior code and generated variants relate to inherited numerical traits. |
| Land and climate | Terrain, water, snow, temperature, grass, thickets, reef, soil, and disturbances: what each represents, how it changes, and how organisms encounter it. |
| Rules and interactions | Feeding, digestion, reproduction, mutation, mortality, crowding, predation, defence, and species formation, including explicit artificial constraints and interventions. |
| Species and lineages | Founders, descendants, extinct lines, body and behavior differences, ecological roles, and the evidence behind those descriptions. |
| Atlas | Dated spatial distributions, terrain context, and separately identified ancestry diagrams. A lineage diagram is not a geographic distribution map. |
| Selection and variation | The biological ideas used, their simplified implementation, sources of variation, different splitting mechanisms, and what observations can establish about selection. |
| History and studies | Eras, interventions, unexpected developments, experiments, contradictory results, and things that have not worked or have not yet been measured. |
| Collaboration | Luis's choices, Claude's stewardship, model contributions, Codex's documentation and community work, and unresolved attribution. |

## What an entry owes the reader

Each substantive entry should answer the relevant questions below in readable prose. Do not force empty headings onto short entries.

1. **Meaning:** what does this element represent, and where does the analogy stop?
2. **Mechanism:** what does the current code actually do? Identify the source revision, functions, parameters, units, and thresholds that matter without requiring the reader to read code first.
3. **Variation:** is the value inherited, mutated, learned, supplied by diet, imposed by the environment, or calculated from something else?
4. **Connections:** what does it affect and what affects it? Include costs, counteracting effects, and relevant environments or life stages.
5. **Observation:** what has been seen in named species or documented periods? Link the evidence and state the season or era.
6. **Limits:** is the effect demonstrated, plausible but untested, too small to measure, absent under tested conditions, or disabled in the relevant version?
7. **Further exploration:** link related traits, rules, species, maps, reports, and open questions.

An implemented benefit does not establish an observed evolutionary advantage. A trait can be available without any living species using it; an ability can be costly without paying off under current conditions. Record these distinctions explicitly.

## Species and atlas standards

- Separate species code or founder definitions from measured traits in living descendants. A seed file is not a census of the current population.
- Identify the kind of species split rather than treating every new name as evidence of naturally evolved reproductive isolation.
- Date population, distribution, diet, and trait statements. Use “at season …” rather than undated “currently.”
- Distinguish individual observations, species summaries, family aggregates, and historical interpretation.
- Every map needs its world or snapshot, season, legend, coordinate and wrap conventions, and source. Missing historical locations mean a missing map, not permission to reconstruct one without evidence.
- Use existing reviewed images first. New analysis or visualization must use read-only inputs or an isolated copy and must not run or alter the live world. Coordinate new tooling with the steward under the existing file boundaries.

## Scientific care

Explain selection and variation using appropriate scientific sources when making external claims. Then state precisely which parts this simulation implements, simplifies, or replaces with designed mechanisms. Do not borrow the authority of biological terminology for an unverified simulation result.

Distinguish a rule's intended effect, a measured association, an experiment on a copy, and a causal conclusion. Include null findings and competing explanations. Short tests can validate behavior without establishing long-term evolutionary outcomes.

## First useful slice

Build a connected example before attempting exhaustive coverage: one verified trait entry, the environmental condition that changes its consequences, and a dated species observation. Armour, food-derived mineral stores, and the reported shelled browser lineages are a candidate to investigate, not a causal conclusion already established.

Use this slice to test navigation and evidence standards. Add the trait inventory and atlas progressively. Actionable priorities and unknowns remain in `CODEX.md`.
