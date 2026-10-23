# Using the world viewer

**AI-written by Codex (GPT-6), publishing collaborator, on Luis's behalf.** Updated 23 October 2026 from committed local viewer `7fa618c`, following the viewer session's earlier checked handoffs. This is a source review, not a new browser verification. That viewer has not yet been imported into public source, which remains at the older boundary recorded in [the publication record](../PUBLICATION.md). Uncommitted viewer changes are outside this guide.

## A first visit

1. Watch the map and the season/weather line for a moment. The landscape, weather and creatures change; this is not a static illustration.
2. Use **fit** to see the whole world, then zoom into a place that interests you.
3. Click a creature to follow it, or hover a species row to find its bodies on the map.
4. Open a species row for its fuller account. Use **History** to put today's population in context.
5. Use **X-ray** to inspect the landscape beneath the illustration.

The **wiki** button opens explanations at your own pace. **reports** opens the steward's dated accounts; its badge counts unread reports. Reading the wiki does not mark reports read, and wiki changes do not have an urgency badge.

## Move around the map

| What you want | Mouse / controls | Touch / keys |
| --- | --- | --- |
| Zoom into a place | Wheel toward the pointer; double-click for ×2; **+** and **−** in the map bar | Pinch; `+` / `=` and `-` keys |
| Pan | Drag the map | One-finger drag |
| See the whole world again | **fit** in the map bar | `0` |
| Follow one body | Click a body | Tap a body |
| Stop following | Drag, **fit**, or `Esc` | Drag or **fit** |

Following centres the camera on the selected body and zooms to at least **8×**. Maximum map zoom is **16×**. The map bar says “following a … · esc”. It is a camera interaction, not a command to the creature.

Panning now continues around the world's wrapping edges rather than stopping at a map boundary. This is the same wrapping world, not newly generated land. **fit** recentres the whole world in its original framing.

With a mouse, hover a body to see its species and individual statistics. A **×N** badge means several bodies occupy a tight pile, not one giant creature. Its tooltip explains the mating pile: bodies can converge while waiting to breed, and the world has no body-to-body collision. See [behaviour and species](behaviour-and-species.md) for the distinction between a body's rules and what it does in context.

## Read the landscape and its inhabitants

The normal map draws relief as layered terraces with pixel texture. Bare slopes show rock strata; river mud is darker and greener. Water has surface-height tinting, rapids and falls. Reef looks coral- or cactus-like, while thicket merges into bushes. Rain, snow, frost, heat shimmer and quake cracks describe changing conditions. Ground detail repaints at higher resolution when zoomed in; a repaint may lag behind a camera move.

Mature tree cells draw as stands of overlapping crowns, with smaller saplings. Fruit, nuts and cones, drought yellowing, snow and wet foliage reflect supplied tree state. Fire is animated; scorched ground fades in the viewer's memory. Flowers and insect specks come from supplied bloom and insect fields. These conventions help you read the world; they do not turn each painted crown or speck into a separately counted organism.

Creature appearance reflects diet, way of life and size; it is not a one-to-one scientific diagram of every inherited trait. Young bodies are smaller and elders muted. Hunters have jaws, parasites look wormy or larval, and toxin appears as fluorescent markings. A ring marks a body ready to mate. The [traits guide](traits/README.md) explains the underlying quantities and exceptions.

At small map scales, creatures use pixel-art micro-sprites at least 7 screen pixels long, with species colour and way-of-life shapes. They blend into the full artwork from 18 pixels. The full artwork uses a drawn length of `0.45 × size`; the minimum screen size exaggerates distant bodies for legibility. A body in the overview is therefore not a ruler for its simulated footprint. Mating rings fade at micro size.

### Magnifier and movement Flow

Click the **magnifier** button or press `l`, then click a place on the map. Clicking a body places a lens that follows it. Dragging the lens moves its inspected place and stops its body-following mode. Close it with **×**, `Esc`, or the magnifier toggle. The lens paints a local patch with full creature art; it is unavailable while X-ray is active. This is separate from following a body with the main camera.

Click **Flow**, or press `f`, to show traffic glow and arrows for the prevailing direction of movement. It accumulates the frames this tab observes and fades over time. It is not a complete historical trail or a measurement recovered from seasons before the tab opened.

### Look beneath the illustration: X-ray

Click **X-ray**, or press `x`. Choose **1 Height**, **2 Rock**, **3 Water**, or **4 Barriers** with the numbered chips or `1`–`4` keys. A legend accompanies the view; creatures become dots. The selected view is remembered in that browser.

The first X-ray paint can take a few seconds; ordinary ground remains visible until it is ready. With a mouse, hovering empty ground reveals height, rock, slope, water depth, river mud, climbing need and place. These are model quantities, not measurements of a real landscape. Start with [landforms and materials](concepts/land-and-material.md), [climate and water](environments/climate-and-water.md), or [four lands and barriers](environments/four-lands.md) to interpret them.

The season-1650 follow-up adds an expanded height range for the rising dome. The Height legend and hover readout accommodate heights beyond the older clipped view, and the displayed maximum can change as the land rises. A changing legend is not itself a change in the meaning of every historical elevation report.

## Find your way through the panel

### Header, clock and weather

The header contains **wiki**, **reports**, and a theme control for **auto / light / dark**. The clock line shows season, day, time to the next season and grass worth. Additional clock notices depend on the frame supplied by that world; a historical great-divide label does not establish that the latest splitting rules use that mechanism.

The dotted-underlined weather sentence opens a climate dial on hover or tap; the viewer handoff also reports focus activation. Wet to dry runs horizontally, cold to hot vertically. A dot is the current condition; the line traces the last 30 seasons. This is a way to read conditions, not a weather-control panel.

### History: a population at a moment is not its whole story

The stacked chart shows population by species. Choose **3 seasons**, **30 seasons**, **300 seasons**, or **era** to change the range. Hover a band, or tap on touch, to identify its species, count and season; the chart and map highlight it. Family, Way of life and Place lenses also affect chart ordering/group labels. Place grouping uses current membership, so an old band shown under a place is not proof that the species lived there at that past time. Change leaves the ordinary species grouping in this checked implementation.

Population size alone does not establish which trait caused success. The [evidence guide](evidence.md) and [selection and variation](selection-and-variation.md) explain those limits.

### Life: ways of living, places and families

The totals lead into a **niche grid**: ways of life against places, with dot size representing population. Places use the world's sections: the heights, north-west, north-east, south-west, south-east and river. A dim line lists ways of life nobody currently fills. Hovering a cell names and highlights its species on the map. An empty niche is an observation, not a promise that the world will fill it.

The lens chips change how you read the species list:

- **Way of life**, the default, groups species by role in the food chain.
- **Family** shows the tree of splits.
- **Place** groups species by section, with population shares and endemic tags.
- **Change** groups new, rising, falling and steady species and gives comparison reasons. Trait-change summaries depend on the history this viewer has observed.

Each species row combines portrait, name, count, trend, role, main food, a thin population bar and a short comparison with its kin. Hover a row to highlight that species on the map. Click to open its full card: diet, origin, kinship, traits, standout ▲ / ▼ comparisons, drift from the line's founder and its code.

Comparisons with kin and trend sentences are summaries, not explanations of causation. Named lineages also follow designed [splitting rules](behaviour-and-species.md); a branch on the family tree is not automatically evidence of biological reproductive isolation.

The extinct list shows the newest 12 names, then **+N more**. Hovering a name reveals its lineage code. For dated examples rather than today's census, see [species and their atlas](species/atlas.md).

### Bands within a species and group framing

Where band data is supplied, expand **inside the …** beneath a species. Band rows show how many bodies are together (**⌂**) and their difference relative to a split threshold (**≠**). These are separate gates; a readiness percentage alone is not a forecast of a split.

Click a band row to pin its highlight; click **⌖** to frame it on the map. Species target buttons also frame a group, and niche-grid buttons pin and frame a way of life in a place. Group framing adjusts as its selected group moves, until you move the view by hand, choose **fit**, or press `Esc`. For a widely scattered group, the camera may frame its densest gathering rather than every body.

At this committed boundary, the three summary cards show **Up the food chain**, **Real diversity**, and **Cost**. The current local viewer has since changed the second card to **Distinct species**; that ongoing definition is described in the [current-world account](current-world.md). Runtime speed is not an ecological outcome.

### Chronicle: what just happened

The Chronicle lists world events newest first. Repeated events within a season are grouped, for example “born strange ×4”. For a longer narrative, open **reports**; for a reconstructed history, read [questions and turning points](history.md).

## Accessibility and known limits

Mouse hover supplies more information than touch. Touch equivalents were reported for the weather dial and History; not every tooltip has one. The niche grid now uses labelled buttons, but that does not establish complete keyboard access to its hover information. History inspection and the whole interface have not received a new accessibility or touch audit in this pass.

Place and Change are available controls in the checked version. An optional Strangeness lens is not among its four Life lenses. If an interaction differs from this guide, report what you tried, what happened and which local/published version you used.

Source: committed `public/index.html` at local `7fa618c`, especially `zoomTo`, `releasePointer`, `toggleLens`, `flowAdd`, `lensChips`, `historyGeometry`, `bandsHtml` and `fitBand`. Earlier owner handoffs supplied visual and interaction checks; no world was restarted or altered for this revision. Main-viewer code remains the steward's responsibility.
