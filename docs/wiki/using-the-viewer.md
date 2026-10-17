# Using the world viewer

Written by Codex on Luis's behalf, from the active viewer session's feature handoff on 17 October 2026, including its season-1650 follow-up received at 13:25 UTC. That session reports checking these features in live page loads. This describes the local interface at those checkpoints, not every interface in the published source history. Newer changes may differ; wrap-around panning and the expanded height view are newer than viewer commit `8c2d386`.

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

Following centres the camera on the selected body and zooms to at least 3×. The map bar says “following a … · esc”. It is a camera interaction, not a command to the creature.

Panning now continues around the world's wrapping edges rather than stopping at a map boundary. This is the same wrapping world, not newly generated land. **fit** recentres the whole world in its original framing.

With a mouse, hover a body to see its species and individual statistics. A **×N** badge means several bodies occupy a tight pile, not one giant creature. Its tooltip explains the mating pile: bodies can converge while waiting to breed, and the world has no body-to-body collision. See [behaviour and species](behaviour-and-species.md) for the distinction between a body's rules and what it does in context.

## Read the landscape and its inhabitants

The normal map draws relief as layered terraces with pixel texture. Bare slopes show rock strata; river mud is darker and greener. Water has surface-height tinting, rapids and falls. Reef looks coral- or cactus-like, while thicket merges into bushes. Rain, snow, frost, heat shimmer and quake cracks describe changing conditions.

Creature appearance reflects diet, way of life and size; it is not a one-to-one scientific diagram of every inherited trait. Young bodies are smaller and elders muted. Hunters have jaws, parasites look wormy or larval, and toxin appears as fluorescent markings. A ring marks a body ready to mate. The [traits guide](traits/README.md) explains the underlying quantities and exceptions.

### Look beneath the illustration: X-ray

Click **X-ray**, or press `x`. Choose **1 Height**, **2 Rock**, **3 Water**, or **4 Barriers** with the numbered chips or `1`–`4` keys. A legend accompanies the view; creatures become dots. The selected view is remembered in that browser.

The first X-ray paint can take a few seconds; ordinary ground remains visible until it is ready. With a mouse, hovering empty ground reveals height, rock, slope, water depth, river mud, climbing need and place. These are model quantities, not measurements of a real landscape. Start with [landforms and materials](concepts/land-and-material.md), [climate and water](environments/climate-and-water.md), or [four lands and barriers](environments/four-lands.md) to interpret them.

The season-1650 follow-up adds an expanded height range for the rising dome. The Height legend and hover readout accommodate heights beyond the older clipped view, and the displayed maximum can change as the land rises. A changing legend is not itself a change in the meaning of every historical elevation report.

## Find your way through the panel

### Header, clock and weather

The header contains **wiki**, **reports**, and a theme control for **auto / light / dark**. The clock line shows season, day, time to the next season and grass worth. A great divide appears there only when one is due.

The dotted-underlined weather sentence opens a climate dial on hover or tap; the viewer handoff also reports focus activation. Wet to dry runs horizontally, cold to hot vertically. A dot is the current condition; the line traces the last 30 seasons. This is a way to read conditions, not a weather-control panel.

### History: a population at a moment is not its whole story

The stacked chart shows population by species. Choose **3 seasons**, **30 seasons**, **300 seasons**, or **era** to change the range. Hover a band, or tap on touch, to identify its species, count and season; the chart and map highlight it.

Population size alone does not establish which trait caused success. The [evidence guide](evidence.md) and [selection and variation](selection-and-variation.md) explain those limits.

### Life: ways of living, places and families

The totals lead into a **niche grid**: ways of life against places, with dot size representing population. Places use the world's sections: the heights, north-west, north-east, south-west, south-east and river. A dim line lists ways of life nobody currently fills. Hovering a cell names and highlights its species on the map. An empty niche is an observation, not a promise that the world will fill it.

The lens chips change how you read the species list:

- **Way of life**, the default, groups species by role in the food chain.
- **Family** shows the tree of splits.
- **Place** and **Change** are disabled in this handoff: they are planned, not available controls.

Each species row combines portrait, name, count, trend, role, main food, a thin population bar and a short comparison with its kin. Hover a row to highlight that species on the map. Click to open its full card: diet, origin, kinship, traits, standout ▲ / ▼ comparisons, drift from the line's founder and its code.

Comparisons with kin and trend sentences are summaries, not explanations of causation. Named lineages also follow designed [splitting rules](behaviour-and-species.md); a branch on the family tree is not automatically evidence of biological reproductive isolation.

The extinct list shows the newest 12 names, then **+N more**. Hovering a name reveals its lineage code. For dated examples rather than today's census, see [species and their atlas](species/atlas.md).

### Chronicle: what just happened

The Chronicle lists world events newest first. Repeated events within a season are grouped, for example “born strange ×4”. For a longer narrative, open **reports**; for a reconstructed history, read [questions and turning points](history.md).

## Accessibility and known limits

Mouse hover supplies more information than touch in the current viewer. Touch equivalents are specifically reported for the weather dial and History, not for every tooltip or grid interaction. Full keyboard access is not available for the weather dial, History inspection or niche grid. The map's zoom, fit and X-ray shortcuts do not imply that the rest of the interface is keyboard-complete.

Place/Change lenses, history bands that follow a lens, an optional Strangeness lens and palette refinements remain roadmap items in this account. Disabled controls are not hidden instructions you need to discover. If an interaction differs from this guide, report what you tried, what happened and which local/published version you used; do not reset a world to match an illustration.
