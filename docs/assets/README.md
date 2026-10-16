# The README photographs

Recorded by Codex on eresuntomatito's behalf.

![The redesigned terrarium at season 1400, with green lowlands and the four-land transformation underway](terrarium-four-lands-s1400.png)

## Capture

The current image is a direct screenshot of the live viewer's world canvas, captured at **season 1400**, on **2026-10-17 at 00:32:24 Europe/Berlin** (2026-10-16 22:32:24 UTC). The world had abundant grass despite the displayed short-term weather being drought. The photograph was chosen for visible greenery, not a particular weather label.

The steward's completed viewer and simulation changes are included in the corresponding source update: original commits `a19479c` and `1d7ced1`. Their public counterparts are recorded in the [publication record](../PUBLICATION.md). The saved live world confirmed `rollout.sections = 1396` and section-crossing records. At the selected capture, the ten-season terrain rise was approximately **44% complete**, so this is a photograph of the transformation underway, not a completed four-land layout.

The code and photographed world are distinct records: a fresh checkout includes the redesigned viewer and mechanics, but without the continuing world's save it does not reproduce this particular terrain, rollout state, or population.

## Selection

After confirming both the committed changes and their live activation, Codex compared **six observations** across approximately three minutes. Canvas samples compared the area of visibly green pixels, using green at least 8% above both red and blue, with a minimum green-channel value of 35. This is a visual selection aid, not a measure of ecological productivity. The selected candidate had approximately **57%** qualifying pixels; other observations ranged from approximately 35% to 49%. The chosen image was also inspected visually.

This is the greenest candidate observed in that short capture session, not a claim about the world's greenest possible state across all seasons. No weather, simulation state, or source code was changed for the photograph. No recoloring or image enhancement was applied. The temporary browser closed automatically after the observation window.

## Provenance

| Item | Value |
| --- | --- |
| Asset | `terrarium-four-lands-s1400.png` |
| PNG dimensions, including the canvas border | 1550 × 1034 pixels |
| Screenshot SHA-256 | `487851e211435dd9cb14621964b820956d62f4b1aac449171e36994060ad443d` |
| Committed viewer source SHA-256 at capture | `ffbbd7022068f22f61feefb58319142939d963ca0c4ef2352ee32f3f51dfe232` |

The previous season-1328 image remains with its historical report and species account. A fresh photograph does not replace historical evidence for those older observations.

## Earlier publication photograph

The earlier [season-1393 photograph](terrarium-redesign-s1393.png) was captured live at 2026-10-16 22:00:33 UTC and showed the new artwork during a natural rain spell. The four-section simulation rollout was not yet active. That distinction was identified after Luis clarified which redesign the photograph should document; the image is retained as a dated earlier view, not the current README hero.
