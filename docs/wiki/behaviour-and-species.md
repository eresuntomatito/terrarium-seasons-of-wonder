# A different way of behaving is not always a new species

Written by Codex on eresuntomatito's behalf. Checked at public source `370995aba5d21eb56b8544a5989056da59a1edd2`; newer live work is not silently included.

The terrarium has several sources of behavioural difference and several ways to assign a new name. These are designed computational mechanisms. Their relationship to biological variation is an analogy to inspect, not an automatic one-to-one identity.

## Three kinds of behavioural variation

1. **Personal genes:** each body carries four values that its behaviour may read. Their meaning depends on the program, not a universal four-gene biological genome.
2. **Behaviour parameters (`k`):** `genomeOf` extracts eligible numerical literals from source into an individual parameter vector. Inherited values can drift while the program's structure stays the same. Zeros and array indices are among the excluded literals; comments/strings are not turned into genes.
3. **Code slips and forms (`morph`):** a small structural edit can change a comparison, direction, logical relation, or another supported program feature. A checked slip can remain a hidden inherited form inside a species before a later splitting rule recognizes a group.

The compiler checks that behaviour returns finite steering output and applies execution timeouts. Its source explicitly says it is not a security boundary. Do not run untrusted submitted behaviour as though these crash/hang filters make it safe.

Model-generated candidate changes are another route, distinct from ordinary breeding and random slips. Pausing queued model work does not stop the latter mechanisms. Deliberately editing a world rule is yet another intervention—not a body evolving a new program.

## Different routes to names

| Route | What the checked rules look for | What a new name does not prove |
| --- | --- | --- |
| Hidden-form / drift split | Groups, relatedness/body differences, locality, and minimum sizes under the splitting checks | That every code slip immediately becomes reproductively isolated. |
| Niche split | A sufficiently large local group using a different recent feeding niche for the required repeated checks, with enough bodies left in the parent | That its members all have one permanent diet or that the same process defines a biological species. |
| Great divide | A common species over the designed abundance threshold; grouping by wrapped place and standardized body traits, with a minimum viable piece size | That this event arose without an explicit world-level diversification rule. |
| Model-generated variant | A candidate behaviour with lineage/compatibility bookkeeping | That merely naming/releasing it establishes a lasting species. Some variants still interbreed before graduation. |

At this boundary, ordinary split/niche checks use `splitMin = 15`, while the revised great divide requires pieces of at least **40**. Those are different thresholds for different mechanisms. Without a strong grouping seam, the revised divide can promote a faint one rather than use the older four-way median cut. It can also decline to divide when qualifying groups are absent.

## What Luis engaged with

The [active steward's account](../STEWARD-CONCEPTS.md) records Luis asking for a divide that accelerates emerging differences and promotes weaker variation without founding groups below 40, while retaining the smaller niche-split threshold. The same account records his preference for rules that could allow an apex rather than manually placing one. Those choices make both restrained intervention and deliberate diversity-promoting rules part of the story.

## How to read a lineage account

Ask which route produced a branch, its founders, active rules, date, and later survival. A species count can rise because the naming/splitting machinery changed, even without a newly complex food chain. An ancestry diagram shows recorded parentage; an atlas shows dated places; feeding records show what bodies ate. None substitutes for the others.

Sources: [behaviour compiler](../../sim/species.mjs), `genomeOf`, `compileBehavior`, `slip`; [world](../../sim/world.mjs), `breed`, `slipMind`, `interbreeds`, `isVariant`, `checkSplits`, `nicheOf`, `nicheSplit`, `vicariance`, and `divideByKind`. Continue with [selection and variation](selection-and-variation.md), [reproduction](traits/reproduction.md), and [the archive](archive.md).
