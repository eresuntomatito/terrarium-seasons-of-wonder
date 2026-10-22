// The terrarium: plants on a grid, creatures steered by their species' behavior code, weather over everything.
// Species are not fixed: the god branches new ones off living ones, and the world decides which last.
// Nothing says who eats whom: bodies (size, gut) are inherited and drift, anything can eat what it can overpower,
// and roles (grazer, omnivore, hunter, apex) are read off what each species actually ate.
import { noise3 } from './noise.mjs';
import { loadSeed, readCode, compileBehavior, genomeOf, fillTemplate, slip } from './species.mjs';

export const W = 960, H = 640, CELL = 8, GW = W / CELL, GH = H / CELL;
export const TICKS_PER_DAY = 1800; // one minute at 30 ticks/s
export const SEASON_TICKS = TICKS_PER_DAY * 3;
export const GENERATIONS_PER_MUTATION = 20; // a species earns a new branch by breeding this many generations
const PLANT_EVERY = 4, HISTORY_EVERY = 30, HISTORY_MAX = 2000, EVENTS_MAX = 300;
// Cell offsets within reach of a sense radius (a little generous; the exact distance is checked per cell).
const cellsWithinCache = new Map();
const cellsWithin = r => {
  if (!cellsWithinCache.has(r)) {
    const n = Math.ceil(r / CELL) + 1, list = [];
    for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) if ((Math.abs(dx) - 1) ** 2 + (Math.abs(dy) - 1) ** 2 <= (r / CELL) ** 2) list.push([dx, dy, Math.hypot(dx, dy)]);
    list.sort((a, b) => a[2] - b[2]); // nearest first, so a scan can stop once its nearest few are certain
    cellsWithinCache.set(r, list);
  }
  return cellsWithinCache.get(r);
};
// What you see is the species' colour tinted by what the body eats: green for plant-eaters, amber in between,
// red for flesh-eaters. A species whose diet drifts changes colour with it.
const DIET_TINT = 0.45;
const dietHue = gut => 120 - 120 * Math.min(1, Math.max(0, gut)) ** 0.8;
const shownHue = c => tint(wrap(c.hue + (c.hueShift ?? 0), 360), c.gut);
const hueApart = (a, b) => Math.abs(wrap(a - b + 180, 360) - 180);
const tint = (hue, gut) => { const d = wrap(dietHue(gut) - hue + 180, 360) - 180; return Math.round(wrap(hue + d * DIET_TINT, 360)); };
const ATTENTION = 20, KIN_ATTENTION = 10, THINK_EVERY = 3; // (THINK_EVERY 2 → 3 for speed, Luis s1232) // the most neighbours, and the most patches of plants, a creature notices at once
const MAX_CREATURES = 1500, CORPSE_TICKS = 900, BUCKET = 64, BW = W / BUCKET, BH = H / BUCKET;
const GENES = 4, GENE_DRIFT = 0.04;

// Bodies. Size scales cost, storage and clumsiness; gut sets what a creature can digest (0 plants … 1 flesh).
export const PHYSICS = {
  sizeDrift: 0.05, gutDrift: 0.04, minSize: 2.5, maxSize: 20,
  overpower: 1.2,        // anything this much smaller can be eaten on contact
  jaws: 0.25,            // guts above this can eat flesh; guts below 1 - this can eat plants
  plantEnergy: 0.55,     // energy per unit of plant, times (1 - gut)²
  bodyEnergy: 1.0,       // energy locked in a body of mass 1, on top of what it was carrying …
  bornBody: 0,           // … but a body born in the world holds only this share of it: its parents never paid for the rest
  tissueBirth: 0.4, tissueRate: 0.01, tissueRamp: 10, // step 4 (tissue): paid newborn stores and energy built into tissue per tick
  bodyShare: 0.2,          // share of a child's gift locked into its body: it cannot spend it, but its corpse holds it
  fleshEfficiency: 0.9,  // share of a kill's energy that survives digestion, times gut ** fleshPower
  fleshPower: 1,
  killerShare: 0.5,      // share of a kill the killer eats before the rest is shared out
  handling: 240,         // ticks to digest a kill as big as yourself
  cover: 0.6,            // plants this dense are tall grass: whatever stands in them is hidden …
  hideRange: 20,         // … from anyone further away than this
  shareRange: 40,        // every jaw this close to a kill grabs a share of it (scavenging, crowding)
  growTicks: 1200,       // newborns start at 40% of adult size and grow to full size over this many ticks (0 = born grown; 1200 since Luis, 09:35 Oct 15)
  // Birth variation (Luis): every newborn's body varies by chance around its genes, and only the genes pass on.
  birthSize: 0.08,       // body size × (1 ± this, normal spread)
  birthGut: 0.04,        // gut ± this: a few of a grazing line are born with jaws, a few of a hunting line without
  birthGape: 0.05,       // mouth size ± this
  cannibalHunger: 0.3,   // nobody eats its own kind unless its energy is below this share of its maximum
  mateReach: 8,          // the least distance at which two willing bodies can mate
  longingRelax: 150,     // choosiness relaxes as a willing body waits: ×(1 + ticks waited / this) …
  anyMate: 400,          // … after this many ticks any partner of its kind will do …
  budWait: 600,          // … and after this many with no partner at all, a well-fed body buds alone
  budLoss: 0.7,          // share of the gift lost when budding alone (mating loses nothing)
  roots: 0.15,           // what grazing always leaves of a plant, so it can regrow
  // Grass that answers to the grazers (Luis, 01:00 Oct 15): a meadow bitten down to its roots again and again loses
  // root health and regrows slower (at 0 it dies to bare ground); rest heals it. Grazers carry what they eat as dung
  // and drop it where they go, and carry seeds that sprout on bare ground they walk over.
  rootWear: 0.004,       // root health lost each time a cell is bitten to within 0.05 of its roots
  rootHeal: 0.0015,      // root health regained per plant update (every 4 ticks), × moisture
  dungShare: 0.4,        // share of each grass bite carried in the gut as fertility …
  dungDrop: 0.01,        // … and the share of that load dropped on the ground each tick, wherever the body is
  seedCarry: 0.995,      // seeds on a body fade by this each tick after its last grass bite …
  seedDrop: 0.003,       // … and sprout on a bare cell it crosses with this chance per tick, × seeds × moisture
  seedBank: 0.0003,      // chance a bare cell sprouts on its own, times moisture and (0.1 + fertility): deserts recover
  scraps: 0.15,          // share of a kill left on the ground as carrion
  carrionBite: 0.1,      // energy a mouth can tear from a corpse per tick
  carrionEfficiency: 0.7,// share of carrion energy digested, times gut …
  carrionPeak: 0.6,        // … or, when set, best at this gut and falling to nothing carrionWidth away (a scavenger's niche)
  carrionWidth: 0.55,    // (0.4 → 0.55 with carrionGut, Luis 09:35: a slightly meat-leaning gut gets a little from a carcass)
  carrionGut: 0.1,       // any gut above this can tear at a corpse (hunting jaws stay at P.jaws)
  rot: 0.0005,            // share of a corpse's energy that rots into the soil every few ticks
  rotToSoil: 0.2,        // fertility made from each unit of rotting energy
  dung: 0.25,            // fertility a creature returns to the soil for each unit of energy it digests
  corpseLife: 12,         // corpses vanish after this many × 900 ticks, whatever is left of them lost
  husk: 0.05,           // a corpse holding no more than this is an empty husk (nobody can eat it) and crumbles away
  crumble: 0,           // fertility made from each unit of energy left in a corpse when it finally crumbles away
  carrionDung: 1,        // fertility returned for each unit of carrion torn from a corpse (eaten bodies feed the soil fast)
  smother: 0.3,            // nothing grows under a corpse holding more than this energy (0 = off)
  soilNeed: 0.05,           // nutrient loop (0 = off): plants grow at f / (f + this), and their growth uses up the soil …
  uptake: 0.5,           // … this much fertility per unit of growth, given back when plants wither or rot
  weathering: 0.003,    // … while rain slowly frees a little new fertility everywhere
  leach: 0.005,          // share of the soil's fertility washed away at every plant update
  legs: 0.04,            // legs drift by up to this share at each birth: they set a body's cruising speed (× the species' maxSpeed) …
  minLegs: 0.6, maxLegs: 1.6,
  legUpkeep: 0.5,        // … and cost upkeep: metabolism × (1 + this × (legs − 1)); running costs speed² on top
  wind: 0.05,            // wind (stamina) drifts by up to this at each birth; 0 = no sprint at all
  maxWind: 2, windUpkeep: 0.2, // metabolism × (1 + this × (wind − 0.5))
  windTicks: 90,         // ticks of sprint per unit of wind
  sprintBoost: 1.6,      // a sprint lifts the speed limit by this much, and turning force by sprintForce …
  sprintForce: 1.3,
  recover: 0.25,         // … and burns one tick of stamina per tick; resting wins back this much per tick
  speedCap: 5,           // nothing ever moves faster than this (px per tick), so the world stays readable
  fatAbove: 0.6,         // fat: above this share of its maximum energy, a creature stores part of each meal as fat …
  fatShare: 0.5,         // … this share of it (and everything beyond its maximum)
  fatEfficiency: 0.85,   // … losing a little each way, in and out
  maxFat: 0.8,           // … up to this much per unit of body mass
  fatBurn: 0.01,         // … burning this much per tick back into energy when below 30% of its maximum
  fatDrag: 0.6,          // … and carrying it costs: move cost × (1 + this × fat / mass). Fat is meat for whoever eats it.
  fatUpkeep: 0.5,        // fat is living tissue: resting metabolism × (1 + this × load) …
  fatClumsy: 0.25,       // … and it makes a body clumsy: turning × (1 − this × load); sprints drain faster, wind returns slower.
  obeseAt: 0.7,          // load = fat / its most fat, plus double whatever lies beyond this share (obesity bites harder)
  thriftDrift: 0.05,     // thrift (inherited, 0..1, starts at 0.5) sets how early, how much and how far a body stores fat
  weakAt: 0.3,           // below this share of its maximum energy a body weakens: slower, and slower to get its wind back …
  weakest: 0.6,          // … down to this share of its speed when empty
  fatSlows: 0.25,        // a full load of fat lowers top speed by this share
  scent: 0.05,           // scent a body of mass 1 leaves on the ground each tick (plant-eaters and flesh-eaters smell different) …
  scentFade: 0.985,      // … what is left of it after each plant update (every 4 ticks), while it spreads to the cells around
  scentSpread: 0.4,
  // Reef: the dead build the land. Part of what rots becomes mineral grains that wander and stick to reef they touch
  // (diffusion-limited aggregation, the way coral branches), or now and then found a reef of their own where many died.
  // A slow climate wears it away again, thin tips first, back into the soil. Solid reef blocks movement.
  reefShare: 1.0,        // share of rotting corpse energy that becomes mineral (on top of what goes to the soil)
  reefGrain: 0.15,       // mineral carried by one grain
  reefGrains: 1500,      // grains wandering at once, at most
  reefSteps: 200,        // a grain that finds no reef in this many steps dissolves into the soil
  reefSeed: 0.01,        // chance a new grain founds a reef where it lies
  reefStick: 0.3,        // chance a grain touching only faint reef sticks (thickening a young reef) …
  reefTip: 0.95,         // … extending a branch (one solid neighbour) …
  reefFill: 0.05,        // … filling in a solid mass (two or more) …
  reefGap: 3,            // … and none where other solid reef lies within this many cells ahead (corridors stay open)
  reefCrumble: 0,        // share of a corpse's last remains that becomes mineral rather than soil
  reefBuild: 0.35,       // reef density a stuck grain adds to its cell
  reefSolid: 0.6,        // a cell this dense is solid: nothing can enter it
  reefMax: 0.18,         // solid reef may cover at most this share of the land (start low)
  reefErode: 0,          // density worn away per reef update at the wettest; thin tips three times faster
  reefEvery: 20,         // ticks between reef updates
  climateSeasons: 9,     // one wet-and-dry climate cycle lasts this many seasons
  reefRestless: 6,
  // Shaping the reef into roads and mazes: traffic wears paths, quiet ground fills in, thick masses hollow, dust clears.
  trample: 0.004,        // reef (below solid) worn away per reef update on a busy cell …
  trailSize: 8,          // … only bodies at least this big wear trails (by their mass) …
  busy: 100,             // … traffic at which a cell counts as fully busy (traffic: recent bodies on the cell, decaying)
  trafficFade: 0.95,     // … traffic kept per reef update
  quietBoost: 1,         // grains stick up to (1 + this) times as readily on quiet ground, and hardly at all on busy ground
  hollow: 0.002,         // a solid cell walled in on all eight sides wears this much per update (thick masses become rings and walls)
  dustErode: 0.0005,     // faint reef (below 0.3) wears this much per update: the haze clears, ridges stay
  boneCost: 0.2,         // carcass energy that each cell of a giant's bone-reef takes
  eggTicks: 5400,        // an egg hatches this long after it is laid (one season)
  gatherRadius: 2,       // cells around a slender giant where it brushes lone reef toward denser reef …
  gatherCost: 0.01,      // … paying this much energy per unit of reef moved
  reefShove: 0.15, shoveEvery: 20, // energy per unit of reef a desperate giant heaves aside, and the rest it needs between heaves
       // energy a desperate giant pays per unit of reef density it shoves out of its way
  reefPush: 0.05,        // reef density a slender body shoves aside per tick from the cell it moves through
  reefSqueeze: 0.02,     // energy a slender body pays per tick for each unit of reef density it pushes through
  reefBig: 8,            // bodies bigger than this are stopped by thinner reef (solid × reefBig / size)       // a body that keeps bumping into reef (this many recent bumps) strikes off in a new direction
  capSize: 6,            // energy capacity is the species' store for a body this size …
  capRange: [0.85, 2],   // … scaled by (mass ratio)^¼ within these bounds
  // Thicket: a slow thorny hedge that grows only beside solid reef. Grass inside it cannot be grazed (a refuge and a
  // seed bank for the meadow), small bodies hide in it, and it slows bodies down, big ones most. It dies where its reef
  // is gone or in drought, giving its nutrients back to the soil, and heavy traffic wears paths through it.
  thicketGrow: 0.004,    // growth per reef update toward its most, scaled by soil and moisture …
  thicketMax: 0.8,       // … up to this density …
  thicketUptake: 0.3,    // … drawing this much soil per unit grown (returned when it dies)
  thicketDie: 0.002,     // wear per update where its reef is gone or in severe drought …
  thicketHardy: 0.12,    // … below this moisture (above it, in ordinary dryness, it just holds on)
  thicketShade: 0.4,     // grass inside thicket grows this much slower at full density …
  thicketRoots: 0.15,    // … but never falls below this where the thicket is dense (grazers cannot reach it)
  thicketDrag: 0.6,      // top speed × (1 − this × density × min(1, body / thicketBig)): big bodies are slowed most
  thicketBig: 10,
  thicketHide: 7,        // bodies smaller than this are hidden in dense thicket beyond close range
  // SHRUBLAND (Codex, AI-written; steward's s2058 spec): runners on moist soil, below the reef edge's density.
  shrubSeed: 0.3, shrubWet: 0.35, shrubSoil: 0.3, shrubGrow: 0.0015, shrubMax: 0.6,
  callRange: 120, callPull: 0.4, guardRange: 20, guardEach: 0.15, guardMax: 6, // (calls, guard) mate calls; safety in numbers
  // FOOD VALUES (Luis, s2448; rollout.foodvalues): what a food is worth follows what it is, in this world's terms. Fibre (grass, browse) is
  // plentiful but poor and needs a fermenting gut; sugar (fruit) is rich and easy for any gut, and fattens fast; oil (nuts, cones) is the
  // densest; build (insects, fish, carrion, flesh: the world's protein) is rich and provisions the young. Tree foods no longer shrink with
  // the grass's worth (they are not grass). Insects and fish fit a wide range of guts (a grazer gets most of their worth).
  foodValue: { fruit: 2.0, nut: 3.0, cone: 1.5 }, foodFit: { insect: [0.30, 0.15, 0.50], fish: [0.40, 0.15, 0.50] }, foodSnapEff: 0.9, foodRich: { fruit: 1.3 },
  // FOLLOW (Luis, s2448; rollout.follow): a young body keeps near its mother until it matures, so it eats where she eats and is guarded by her.
  followNear: 12, followRange: 160, followPull: 0.35,
  // NICHE FOOD (Luis, s2568, option 1a; rollout.nichefood): each way of life has food of its own that the grass's worth does not touch.
  // Lichen on the heights is for climbers (access rises from climb nicheClimb0 to full at +nicheClimbSpan) and richer; water plants
  // feed waders and swimmers richer. Neither shrinks with grass cuts (they are not grass).
  nicheLichen: 1.6, nicheClimb0: 0.35, nicheClimbSpan: 0.35, nicheAqua: 1.5,
  founderRange: 50, graceFlock: 3, graceReach: 2, // (founders, Luis s2444: a split must be a real group) founders within founderRange of each other; through grace, flock and calls pull graceFlock× harder and reach graceReach× farther, and the parent never eats them
  flockSize: 6, flockNear: 30, flockRange: 100, flockPull: 0.3, flockRare: 40, flockBase: 0.1, // (flock) kin seek kin up to a group of flockSize
  geneBandZ: 1, geneFounders: 15, geneGap: 0, splitCooldown: 0, // splitCooldown (ticks): after a gene-band split, the same band from the same parent waits this long (0 = off)
  // geneGap: gene bands' split bar above random (0 = speciateGap)
  habitGain: 0.5,        // (habits, Luis s2383: option B) side-food intake × (1 + habitGain × that food's share of the recent diet); newborns inherit a faded copy of the parent's recent diet
  habitBirth: 0.5,       // … the imprint's size (the 'ate' total a newborn starts with, fading as it eats)
 // (genebands) a gene band: ≥ this many SDs from the mean; founders needed together
  nicheFounders: 0,      // (s2315) founders a niche split needs together (0 = speciateMin)
  lifeDiffNiche: false, // (lifediff) also weigh ways of life in niche splits (circular: off until Luis decides)
  skillCost: 0.03, skillRamp: 10, // (s2235, skillcost) breadth cost: a typical body today (S ≈ 1.8) pays ~10% more upkeep at full ramp, a one-skill specialist (S ≈ 0.8) ~2%
  lapseCold: 0.45, bergmann: 1.0, // (D, s2261, rollout.coldheights) the heights colder in every era (lapse 0.3 → 0.45) and climate cost ∝ size^∓1 (was ^∓0.5)
  // (C, s2261, rollout.climbweight) climbing speed follows power-to-weight (strength ÷ mass ratio), so light bodies climb faster
  saplingBase: 0.08, nurseThicket: 0.5, // (trees2, s2261) saplings grow from a real base; thicket this dense fully shelters a sapling from browsers
  shrubFloor: 0.15,      // (s2093, rollout.shrubbrowse) away from reef, browsers eat scrub down to this, not browseFloor
  shrubHold: 0.35,       // (s2085) away from reef, scrub holds on only at this moisture; drier, it wears back (it ran past 9% of the map at 0.12)
  waves: 3, waveShare: 0.4, // returns come in this many waves, each this share of the species' seed base
  dungRange: 20,         // a beetle this close to a grazer finds its droppings …
  dungFeed: 0.018,       // energy a beetle near a grazer gets from its dung each pass (10 ticks), and soil it buries
  // HONEST DUNG (rollout.honestdung; Luis asked, s1571): dung was a free gift, paid every pass wherever a grazer stood near, and nothing
  // was used up (65% of all body income). Now the plant a grazer eats but does not digest is carried in its gut (c.dungE, energy) and
  // dropped on the ground (world.dungMap); a decomposer or beetle eats from the cells around it, and it is gone. What nobody eats
  // breaks down into fertility, faster in the warmth. The old free gift fades linearly to nothing over honestFade seasons from the
  // rollout season, so the world can adapt. (The fertility dung of dungShare/dungDrop is unchanged.)
  dungEff: 0.8,          // share of the dung's energy a decomposer gets (the rest is lost as heat)
  dungTake: 0.2,         // most dung energy a body of full decomp ability can lift per pass (10 ticks), from the 3×3 cells around it
  dungBury: 0.3,         // share of the dung it eats that goes back to the soil at once
  dungDecay: 0.0004,     // share of the dung on a cell that breaks down to fertility each tick (× 0.6 + 0.8 × warmth)
  honestFade: 10,        // seasons over which the old free dung gift fades to zero (10, s1619: 5 crashed the test world to 100 bodies; 10 held it at 240)
  beetleSoil: 1,         // beetles return this much extra fertility per unit of carrion they break down
  infestWeak: 0.3,       // a grazer below this share of its energy capacity can be infested …
  crowdRange: 40, crowdCount: 6, // … if at least this many of its kind are this close …
  infestCatch: 0.3,      // … with this chance per beetle contact (each 10 ticks)
  infestDrain: 0.0008,   // energy an infestation drains per tick, × its strength
  infestHeal: 0.004,     // a host above 60% capacity clears this much per tick
  infestSpread: 0.15,    // chance per 10 ticks that an infested host passes it to a touching, weak, crowded kin
  foulShed: 0.1,         // an infested host fouls the ground it walks on with this much (× strength) per 10 ticks …
  foulFade: 0.96,        // … fouling kept per 10 ticks …
  foulCatch: 0.02,       // … and a weak grazer of any kind standing on fully fouled ground catches it with this chance per 10 ticks
  stealth: 45,           // the unique giants are only noticed within this distance
  gulp: 8,               // a filter-feeder takes at most this many creatures a tick …
  gulpReach: 1.0,        // … within (its size + theirs) × this (jaws reach 0.6) …
  growRate: 0.01,        // … and, well fed, turns at most this much energy a tick into body …
  growEfficiency: 0.5,   // … keeping this share of it as body
  splitRange: 150,       // a split takes only the cluster's members within this distance of its densest spot
  // REAL SPECIES (Luis, s1837: "fewer species is not bad in itself; we want species that are practically different, not just renamed"; rollout.speciate2):
  // the great divide is cancelled (a probe: its pieces differed by 0.20 SD in body, random halves by 0.19, only in place). Every other split (niche, drift, mind)
  // needs founders whose BODY traits (the 11 the divide used, in the parent's SDs) differ from the rest of the parent by speciateGap more than random founders
  // of the same number would; speciateMin to speciateMax founders gathered in one place (the niche floor falls 30 → 15); a new species has graceTicks in which
  // it may still mate with its parent and sisters, and is not hunted by them; if it ends that season under speciateMin bodies it blends back into its parent.
  speciateMin: 15, speciateMax: 40, speciateGap: 0.5, speciateNull: 20, graceTicks: SEASON_TICKS,
  // TREES (Luis, s1803; roadmap step 3a; rollout.trees; proposal reports/status/2026-10-17_s1794-trees-insects-proposal.md): woody
  // plants that stand on soil, not on reef. world.trees is a canopy (0…1), world.treeKind says which (1 fruit on soft rock 1 and
  // sediment 3, warm and moist; 2 nut on soluble rock 2, mild; 3 conifer on hard rock 0, or any rock in the cold heights down
  // to the treeline). None on basement, deep water, or crags and cliffs. Updated with the thicket, every reefEvery ticks.
  // Seeds only by succession: thicket above treeFromThicket turns to saplings, mature trees (≥ treeMature) seed their
  // neighbours, and bodies that eat fruit drop its seeds. Growth is logistic (canopy ~0.5 after ~20 seasons), faster on fertile,
  // moist ground. Cover = canopy, and acts as thicket does (hiding, sight, drag); grass beneath grows × (1 − treeShade × canopy).
  treeGrow: 0.0012, treeMax: 0.9, treeMature: 0.3, treeSapling: 0.3, treeSeed: 0.02, treeUptake: 0.25, treeLitter: 0.0004,
  treeFromThicket: 0.3, treeEstab: 0.0003, treeSpread: 0.0006, treeSeedDrop: 0.004, treeShade: 0.5, rootHold: 0.6,
  treeDie: 0.0008, treeDrought: 0.12, treeFrost: 0.2, treeDeep: 0.05, treeFlood: 0.05, treeBreak: 0.4, // death: drought (moisture), frost (T), deep water, flow above treeFlood breaks canopy × the excess
  treeBrowse: 0.003,     // a browser takes this (× √mass, × browse) of a sapling's canopy per bite, and eats it …
  treeBrowseEnergy: 2,   // … at this energy per unit
  // Fire (Luis, s1803): lightning in the worst drought. Dense wood (≥ fireDense, ≥ 3 dense neighbours) in moisture below fireDry
  // catches with chance fireChance per update; it spreads to dry wooded neighbours (canopy ≥ fireWood), at most fireSpreadMax
  // cells an update. Burnt canopy goes to 0, fireAsh of it returns as fertility; thicket burns too; grass is not harmed.
  fireChance: 0.00002, fireDry: 0.15, fireDense: 0.5, fireWood: 0.3, fireSpreadMax: 60, fireAsh: 0.5,
  // A burning cell burns for fireTime updates (× reefEvery ticks, ~300). A body standing in it loses fireBurn × its energy store a tick
  // (the young twice that), dying 'burnt'; bodies within fireSmoke cells of flames are pushed away (fireFlee × their top force).
  fireTime: 15, fireBurn: 0.03, fireSmoke: 3, fireFlee: 2,
  // Foods. Stores per cell grow ∝ canopy × the season's warmth (fruit) or cold (nuts, cones) and spoil at a rate each update:
  // fruit fast (into fertility), nuts slowly, cones slowest. Eaten under the plant gut fit; energy per unit × plantEnergy.
  fruitMake: 0.012, nutMake: 0.0025, coneMake: 0.0015, fruitRot: 0.01, nutRot: 0.0005, coneRot: 0.0002, treeStoreMax: 1, rotAsh: 0.5,
  fruitEnergy: 1.2,      // quick sugar, but it rots
  nutEnergy: 1.6,        // rich: the most per unit, and the fattest (stomachRich)
  coneEnergy: 0.9,       // moderate; it keeps the longest, a winter food
  fruitReach: 4, fruitFall: 0.3, // fruit on the tree is reached by size beyond fruitReach (full at +4) or by climbing; this share has fallen and is open to anyone
  biteDrift: 0.02, biteUpkeep: 0.05, // BITE, a new inherited skill (dormant at 0, like climbing): the hard mouth that opens nuts and cones. Access = 0.9 × bite + a little from size and gape
  // INSECTS (Luis, s1803/s1930; roadmap step 3b; rollout.insects; proposal reports/status/2026-10-17_s1794-trees-insects-proposal.md, 2C-2E): ONE field,
  // world.insects (0…1 a cell, saved like dungMap), updated every insEvery ticks (like water). A density of 1 holds insScale energy. They are BORN only
  // from stores that really shrink (what is eaten goes insEff to the insects, insSoil back to the soil, the rest is heat): bloom (nectar, paid from the grass
  // of a meadow, or from the soil under a fruit tree), rotting fruit, dung, carcasses, leaves (a little from grass and canopy). They live short (insDecay a pass, more in the cold;
  // the dead fall back to the soil, insDie of them), and FLY: each pass insSpread of a cell goes to its 4 neighbours (wrap-around), more toward the
  // warmer, flowering ones (insDrift). They ACT: chew leaves in outbreaks (above insOutbreak; grass, and canopy a tenth as much), speed the
  // breakdown of dung, and pollinate: a fruit tree's fruit × (insPollMin + (1 − insPollMin) × (1 − e^(−insPollK × density))).
  // BLOOM (world.bloom, 0…1): opens in the warm, moist part of the climate on mature fruit trees (canopy ≥ treeMature) and wet meadows, and fades.
  insEvery: 10, insScale: 0.1, insEff: 0.5, insSoil: 0.3, insDie: 0.6, insDecay: 0.04, insSeen: 5, insCold: 3, insSpread: 0.2, insDrift: 4, insMax: 1, // insSeen: the density bodies, flowers and the viewer respond to is min(1, insSeen × density) (the field holds little energy, so its densities stay low)
  insNectar: 0.0007, insNectarTree: 0.0004, insFruit: 0.004, insDung: 0.012, insCarcass: 0.01, insGrassChew: 0.0004, insCanopyChew: 0.00002, insLeafBase: 0.0001, insOutbreak: 0.4, insLeafE: 8,
  bloomUp: 0.04, bloomDown: 0.03, bloomWarm: 0.4, bloomMeadow: 0.65, insPollK: 6, insPollMin: 0.3,
  // Carcasses (energy roadmap 3): a body with decomp ≥ openMin and ≥ openDiet of its recent diet dung or carrion OPENS a carcass: it may feed on one
  // even with a plant gut (below carrionGut), tears off (1 + openBite × decomp) times the bite, and the carcass it feeds on rots × openRot for openHold
  // ticks. Insects also take insCarcass of a carcass a pass (× their density + insArrive, flies come first; no more than the swarm can hold); its own rot is unchanged.
  openMin: 0.15, openDiet: 0.25, openBite: 1, openRot: 0.4, openHold: 100, insArrive: 0.3,
  // SNAP (insect-eating), a new inherited skill, dormant at 0 like bite and climb: a body takes snapBite × snap × √size of the insects on its cell
  // a tick; insects (tl ~2.5, fed at level 3) are digested best by a middle gut: efficiency snapEff × e^(−((gut − snapGut)/snapWidth)²).
  snapBase: 0,           // (s2307, food-loop directive) every body snaps insects as if its snap were at least this (0 = off)
  snapDrift: 0.02, snapUpkeep: 0.05, snapBite: 0.15, snapEff: 0.8, snapGut: 0.4, snapWidth: 0.25,
  // Browse (Phase 2): thicket shoots as a second plant food, reachable only by big bodies with a browsing gut.
  gapeMin: 0.15, gapeMax: 0.9, gapeDrift: 0.03, gapeWidth: 0.2, gapeFloor: 0.35, // Phase 3a: jaws suit prey near gape × own size
  browseSize: 4.0,       // bodies at least this big reach the shoots … (4.5 → 4.0 for the progenitors, Phase II, 00:45 Oct 15)
  browseFloor: 0.45,     // … which are eaten down to this density, no lower (dense hedge stays a refuge) …
  browseBite: 0.04, browseEnergy: 4, // … at this bite (× √mass, × browse) and energy per unit
  browseCost: 0.5,       // a gut fully given to browse digests grass this much worse
  browseDrift: 0.03,
  browseMin: 0.1,        // a gut needs at least this much browse to eat shoots at all
  matureDrift: 0.05, matureMin: 0.4, matureMax: 2.5, // maturity multiplier: drift per birth and bounds …
  matureStore: 0.3,      // … each unit above 1 adds this share to the energy store (and below 1 takes it away) …
  matureLife: 0.4,       // … and this share to the lifespan
  resistStart: 0.3,      // toxin resistance a body starts with when nothing is inherited
  resistDrift: 0.04,     // a giant's toxin resistance drifts this much from parent to egg
  tolerate: 0.08,        // a filter-feeding giant swallows prey up to this much more toxic than its resistance …
  tolerateHarm: 0.2,     // … losing this × the excess in energy per such meal …
  tolerateRate: 0.002,   // … and gaining this × the excess in resistance (acquired tolerance)
  // Defences are made from food: the toxin gene and the armour gene set the most a body can carry (and their upkeep),
  // but it holds only what its diet supplies. Toxin comes from plants grown in thicket (browsed shoots count double),
  // shell from minerals (solid reef nearby, mineral in the soil). Each store fades without supply.
  toxinGain: 0.002,      // toxin store gained per grazing tick, × thicket density (shoots × 2)
  mineralGain: 0.0005,   // shell store gained per grazing tick, × mineral to hand (reef share of the 8 neighbours + soil mineral)
  storeFade: 0.0001,     // share of each store lost per tick
  storeBirth: 0.6,       // a newborn starts with this share of its parents' stores
  divideShare: 0.6, divideRest: TICKS_PER_DAY, divideMin: 40, divideGeo: 5, divideMaxK: 2, divideSeam: 0.15, // (s1329, Luis: bigger pieces ≥ 30 (was 15), at most 2 (was 4), place weighs 5 (was 2) — regional halves that live; s1527, Luis: pieces ≥ 40, and no median cut — with no clear seam the faintest is promoted) // the great divide: whenever a species holds over divideShare of all life it is divided (checked every 30 ticks), then rests divideRest ticks; groups under divideMin join their neighbours
  // Sight (Luis, 01:30 Oct 15): how far a body sees = species perception × size factor × age curve × (0.5 + eyes), shortened
  // inside thicket; every body also sees the reef, as rays: the distance to solid reef in 8 directions (0…1 of its sight).
  eyesStart: 0.5, eyesDrift: 0.04, // the inherited eyes trait (0…1) a body starts with when nothing is inherited, and its drift
  eyesUpkeep: 0.15,      // keen eyes cost upkeep: × (1 + this × (eyes − 0.5)); poor eyes save a little
  sightThicket: 0.6,     // sight inside dense thicket is cut to this share
  // The kraken's mind (Luis): a coarse map of where it got stuck and where it fed, learned in its own life, steering it,
  // and passed to its egg (Lamarckian). Today's reflexes (wall-following, shove, rage) stay underneath.
  mindW: 24, mindH: 16,  // the map's cells (40 × 40 px each)
  mindTrap: 0.05,        // per 10 ticks stuck (bumps above 2): trap value += this × (1 − trap)
  mindFeed: 0.08,        // per meal: food value += this × (1 − food)
  mindForget: 0.9995,    // both fade by this every 10 ticks, so old lessons give way to new ground
  mindPull: 0.8,         // how strongly the map turns its steering
  mindKeep: 0.8,         // the egg inherits the map blurred and at this strength
  resistUpkeep: 0.2,     // toxin resistance (0..1) costs upkeep: a liver that breaks poison down burns energy all the time
  rageRadius: 4, rageCost: 2, rageCooldown: TICKS_PER_DAY, // the giant's rage: cells heaved aside, energy, and rest between …
  rageBumps: 4, rageHunger: 3.5, // … and it also rages when trapped (bumps above rageBumps) and hungry (energy below rageHunger; it still needs rageCost + 0.5 to spend)
  // The kraken, reconsidered (Luis, 02:30 Oct 15): it rises only one season in every krakenEvery, and sleeps the rest
  // (life paused, unseen); while awake it eats only up to krakenAppetite of its satiation, and has no targeted hunger.
  krakenEvery: 10, krakenAppetite: 0.75, targetedHunger: false,
  dormantBelow: 0.30, wakeAt: 0.5, // a dormant giant sleeps while the world holds less than this share of its room, wakes at this
  crowdStart: 0.7,       // births start slowing when the world is this full (of its room) …
  capTarget: 1000,       // the creature cap shrinks 10% a season until it falls below this
  smallShare: 0.2,       // at the creature cap, species smaller than this share of it may still breed …
  capCeiling: 1.1,       // … until the world holds this many times the cap
  maturity: 600,         // ticks before a newborn can breed …
  refractory: 300,       // … ticks of rest after each birth …
  minChild: 0.3,         // … and the least energy a child must start with, or there is no birth
  // Diet plasticity: a grazer starving in a crowd on bare ground may, by chance, start turning its gut toward meat.
  starving: 0.25,        // below this share of its maximum energy it counts as starving …
  hungerTicks: 300,      // … for at least this long,
  bareGround: 2,         // with no more than this many patches of plants in sight,
  crowd: 6,              // and at least this many of its own kind in sight.
  convertRate: 0.0028,   // Then each tick it starts turning with chance plasticity × this (plasticity is inherited, 0..1).
  shiftRate: 0.001,      // Its gut rises this much per tick while it stays hungry …
  maxShift: 0.3,         // … up to this much in its life.
  shiftInherited: 0.5,   // Its children inherit this share of the shift on top of the gut it was born with.
  plasticDrift: 0.05,    // Plasticity drifts by up to this at each birth.
  armorGuard: 0.6,       // armour (inherited 0..1): a hunter must be overpower × (1 + this × armour) times bigger to take you …
  armorSlow: 0.2,        // … but armour slows you (top speed × (1 − this × armour)) …
  armorUpkeep: 0.2,      // … and costs upkeep (metabolism × (1 + this × armour))
  armorDrift: 0.03,
  toxinUpkeep: 0.3,      // toxin (inherited 0..1) costs upkeep to make; whoever eats you gets (1 − toxin) of the meal …
  toxinHarm: 0.5,        // … and loses this × toxin energy besides, and learns to shun prey of your colour (taste aversion)
  toxinDrift: 0.03,
  warnRange: 60,         // kin this close to a creature sickened by toxic prey learn to shun its colour too
  aversionRange: 25,     // hues within this many degrees of a remembered sickness are shunned …
  aversionFade: 0.9995,  // … the memory fading by this much each tick, until it is too weak (below 0.3) to matter
  choosiness: 0.08,      // mating chance falls as exp(−difference / this): similar partners pair, subgroups pull apart …
  hueChoice: 1,          // … colour counts: a colour gap of 180° weighs like a whole unit of difference
  hueDrift: 4,           // a body's own colour shift (inherited, up to ±hueRange degrees from its species' colour) drifts this much
  hueRange: 60,
  litterDrift: 0.15,     // litter (inherited 1..maxLitter): how many children share one birth's gift
  maxLitter: 4,
  mindSlip: 0.002,       // chance a child is born with one random slip in its behaviour code; if it runs, it founds its own species
  jumpChance: 0.002,     // big jumps: at a birth, each body trait has this chance to leap by up to ±jumpSize instead of drifting
  jumpSize: 0.3,
  // The rate of living: every body gets about the same budget of heartbeats (its lifespan, counted in beats).
  // Hearts beat at mass^-¼ (small bodies race, big ones plod) and faster with effort, so lifespan follows mass^¼,
  // and growing up and resting between births run on the same clock.
  heartPower: 0.25,
  heartSize: 4,          // a body of this size, cruising, beats once per tick
  idleHeart: 0.5,        // a resting heart beats at this share; cruising at full speed adds runHeart → 1
  runHeart: 0.5,
  sprintHeart: 1.5,      // a sprint multiplies the heart rate by this
  codeDrift: 0.04,       // every number in a creature's code drifts by up to this share at each birth
  isolation: 0.2,
  gutIsolation: 1,       // bodies count too: |gut difference| × this, plus |log size ratio| × sizeIsolation, adds to the gap
  sizeIsolation: 0.5,        // mates whose code numbers differ by more than this (mean |log ratio|) cannot breed
  nicheMin: 30, nicheRange: 200, // niche splits (Luis, s1692): a band living differently needs 30 founders gathered within 200 px, and 30 left behind (mind and drift splits keep splitMin)
  splitMin: 15,          // a species splits in two when a group this big can no longer breed with the rest (10 → 15, Luis 10:10 Oct 15: groups under 10 never lasted, 15–24 lasted twice as long as 10–14)
  morphChoice: 0.1,
  // EXPERIMENT (Luis, 12:15 Oct 15; OFF in the live world): a stomach. Food fills it by its raw amount (grass is bulky
  // and poor, meat dense and rich), so how much energy a full stomach holds depends on the food and on how well the gut
  // suits it; a full stomach cannot eat until it empties. Rich food also becomes fat more readily. Unique giants exempt.
  stomach: 0,            // strength 0 (off) … 1 (full)
  // M3 (Codex, AI-written): separate per-kind pools; capacity is raw bulk per mass(5).
  // digCap ≈ 0.60 × today's 0.00739 size-5.5 raw grass bite × 600 / 1.21 = 2.20 (ample grass).
  digCap: 2.2,
  digBulk: { plant: 1, browse: 1.5, cone: 0.8, nut: 0.6, fruit: 1, insect: 0.5, carrion: 0.4, flesh: 0.3, fish: 0.4 },
  digTime: { plant: 600, browse: 400, cone: 300, nut: 200, fruit: 120, insect: 80, carrion: 100, flesh: 150, fish: 120 },
  // FISH (Luis, s2419; rollout.fish): world.fish, a density per wet cell (0…fishMax; a density of 1 holds fishScale energy), updated
  // every fishEvery ticks. Fish graze water plants (aqua) and are paid by them: what they eat leaves the plants, fishEff of its energy
  // becomes fish, fishSoil goes to the riverbed's fertility, the rest is heat. Warmth speeds them; they spread to neighbouring water,
  // drift downstream, die off slowly (fishDie), fast where the cell runs dry (fishDry) or freezes; the dead return to the soil.
  // Bodies catch them in water: wading 0.2 × swim, swim-deep 1 × swim (× habits); digested as meat by a middle gut (peak 0.45).
  // A one-time seed (fishSeed in swim-deep cells) starts them when the key rolls out.
  fishEvery: 20, fishScale: 0.2, fishMax: 1, fishGraze: 0.02, fishEff: 0.3, fishSoil: 0.3, fishDie: 0.004, fishDry: 0.3, fishSpread: 0.05, fishDrift: 0.05,
  fishSeen: 4,           // (s2428) a fish density this many times as tempting as a grass patch, × swim (bodies see fish as food)
  fishDepth: 0.02, fishSeed: 0.02, fishBite: 0.1, fishWade: 0.2,
  // FOODS THAT DIFFER (Luis, 13:00 Oct 15 — the stomach test's recommendations, applied):
  grassQuality: [0.6, 1.3], // grass energy × (0.5 + moisture of its cell), held within these bounds: dry-season grass is poor, wet-season rich
  shootQuality: [0.8, 1.4], // thicket shoots × (1.5 − moisture): the hedge holds its water, so in dry spells its shoots are the richer food
  fatRich: 1,
  // A WAY OUT OF GRASS (Luis, 14:30 Oct 15), each switched on by the rollout schedule (world.rollout.plateau / protein / carrion):
  gutPlateau: 0.15,      // (1) plateau: a gut keeps all of grass's value up to this, then slides to nothing at gut 1 (was (1 − gut)²)
  proteinBonus: 0.5,     // (2) protein: a mother whose recent diet is ≥ proteinShare meat gives her young up to this much more (× her gift)
  proteinShare: 0.2,
  carrionPeak2: 0.3, carrionBite2: 0.15, // (3) carrion: digested best by a gut near this (was 0.6), torn off faster
  // DECOMPOSERS AND PARASITES for everyone (Luis, 13:20 Oct 15): two inherited abilities (0…1), starting low and drifting.
  decompStart: 0.03, decompMin: 0.15, decompUpkeep: 0.3, decompGrass: 0.3, // past decompMin a body feeds on the droppings around other grazers and digests carrion better; costs upkeep and grass
  parasiteStart: 0.03, parasiteMin: 0.25, parasiteUpkeep: 0.3, parasiteGrass: 0.4, // past parasiteMin it feeds on infested bodies of other kinds it touches and can infest weak, crowded ones
  abilityDrift: 0.03,
  // CLIMATE (Luis, 16:45 Oct 15; rollout.climate). Two axes: wet ↔ dry (the rain, as before) and hot ↔ cold (new).
  // Temperature = a gentle north (cold) → south (warm) gradient + slow warm/cold eras (a cycle of tempSeasons seasons,
  // out of step with the 9-season wet/dry cycle, so all four corners occur) + a small yearly swing.
  tempNorth: 0.38, tempSouth: 0.62, tempEra: 0.15, tempSeasons: 14, tempSwing: 0.05,
  // How food answers the temperature …
  coldGrowth: 0.8,       // grass grows × (1 − coldGrowth × max(0, 0.5 − T)) … and × (1 + 0.5 × max(0, T − 0.5)) when warm …
  frostAt: 0.18,         // … and not at all below this (frost)
  heatWither: 1.0,       // dry grass withers × (1 + this × max(0, T − 0.5) × 2) in heat
  winterBuds: 0.8,       // thicket shoots × (1 + this × max(0, 0.5 − T) × 2): the hedge's buds are the cold season's food
  rotHeat: 1.0,          // carcasses rot (and age) × (0.5 + rotHeat × T): the cold keeps them, heat spoils them
  // … and how bodies answer it (coat and water thrift: inherited 0…1)
  coatStart: 0.3, coatDrift: 0.03, coatUpkeep: 0.05,
  coldCost: 0.6,         // upkeep × (1 + coldCost × 2·max(0, 0.5 − T) × (1 − insulation) × sizeCold) …
  heatCost: 0.6,         // … × (1 + heatCost × 2·max(0, T − 0.5) × insulation × sizeHeat); insulation = 0.7 × coat + 0.3 × fat load
  waterStart: 0.2, waterDrift: 0.03,
  dryCost: 0.3,          // water thrift (option 2): on dry ground (moisture < 0.3) upkeep × (1 + dryCost × dryness × (1 − water)) …
  waterSlow: 0.3,        // … and thrifty bodies mature later: × (1 + waterSlow × water)
  // A PATH TO PREDATORS (Luis, 16:30 Oct 15), rolled out in order (world.rollout.weak, then .pack):
  weakStarving: 0.3, weakOld: 0.15, weakInfested: 0.15, weakMax: 0.4, // (weak) prey count this much smaller to a hunter: starving (energy < 30% of capacity, scaled), old (last 15% of life), infested; at most weakMax
  // HUNTER ROADMAP (Luis, 00:10 Oct 16): every wall to hunting lowered, one switch each, released over an hour:
  // (valley) meat digests as gut ** valleyPower and jaws come at valleyJaws, so half-way guts are not bad at both foods;
  // (skill) a hunter's gape and legs count: the size it needs falls by up to skillHelp for the best-built;
  // (packkin) jawed kin of the hunter's branch (same parent line), not only its species, hunt together;
  // (sizevar) bodies vary more from their parents (sizeDriftWide instead of sizeDrift), so small kinds can arise;
  // (massroom) room is counted by body mass, (size/5)², not heads: budget massPerSlot × the cap; heads stop at massHeads × the cap.
  // PREDATOR BRAKES (Luis, 01:30 Oct 16: why are sharks, lions and bears few?): (pyramid) only pyramidFlesh of a kill's
  // energy becomes the hunter (nature keeps ~10%; was fleshEfficiency 0.9), so meat-eaters need much more prey than they
  // weigh; (lunge) a hunter whose prey slips out of its jaws pays lungeCost — failed attacks are not free.
  pyramidFlesh: 0.35, lungeCost: 0.03,
  // NEW WAYS OF LIFE, each paying from the first step (Luis, s1339; rollout.waterfood, .highfood, .parasitesmooth, .carcass, .meatspec):
  // (waterfood) water plants grow in standing and slow water (world.aqua); a body in water grazes them — waders at the edge
  // (deep ≤ legs: 0.4 + 0.6 × swim), deeper only by swimming (access = 2 × swim) — so swimming has something to win;
  // (highfood) a slow, cold-hardy lichen grows on high ground (elevation > lichenAbove), best in the cold, untouched by frost
  // (world.lichen); worth more to a thick coat (× (0.5 + coat)) — the heights get a way of life of their own;
  // (parasitesmooth) any parasite ability can infest a weak, crowded host of another kind, with a chance growing with the
  // ability from zero (it needed 0.25 before); (carcass) carcasses keep longer (rot and age × carcassKeep) and feed more
  // (× carcassRich); (meatspec) meat keeps pyramidFlesh for a half-way gut but up to fleshEfficiency for a meat gut (0.5 → 0.9).
  aquaGrow: 0.01, aquaBite: 0.06, aquaEnergy: 1, lichenAbove: 0.35, lichenGrow: 0.002, lichenBite: 0.03, lichenEnergy: 0.8,
  infestSmooth: 0.15, carcassKeep: 0.6, carcassRich: 1.3,
  // THE CARCASS, MADE HONEST (Luis, s1757; energy roadmap 1b, 1c, 2; rollout.carcass2): (1b) carrion never yields more than the bite taken
  // from the carcass (the multiplier digest × (1 + decomp) × carcassRich is capped at 1); (1c) a body's toxin stock no longer fills just
  // from standing in thicket, only from thicket shoots it eats (toxinShoot per unit of shoots; calibrated on a copy of the world:
  // 0.12 let browsers' stock sink from 0.7 to 0.25 in 12000 ticks, 1 gave 0.68, 3 gave 0.79, 10 gave 0.82 and 30 no more, since
  // newborns start at storeBirth of their parents' stock; 4 matches the 0.72-0.75 browsers held before); (2) a diner takes at most
  // a meal of raw meat, mealSize × mass(its size) / mass(7) (1 for a body of size 7, against prey holding ~1.5-4), and whatever no diner
  // takes is added to the carcass the kill leaves, for scavengers and carrion-eaters.
  toxinShoot: 4, mealSize: 1,
  // ROOM FOR AN APEX TO EMERGE (Luis, s1366: not placing one, but rules that let one arise; rollout.growon, .crush, .rareroom,
  // .apexniche): (growon) a well-fed adult keeps growing slowly (c.grown, up to growOnMax × its inherited size; upkeep grows
  // with it; hunger stops it; the young do not inherit it); (crush) a shell protects less against a bigger or wider-mouthed
  // attacker (its weight × (1 − crushSize × (size ratio − 1) − crushGape × (gape − 0.7))); (rareroom) a species holding less
  // than rareMass of the family's mass may breed past the mass ceiling (heads still capped); (apexniche) a body whose recent
  // meat comes mostly from other meat-eaters (prey of trophic level ≥ apexPrey) is an 'apex' by niche, and a local group of
  // them can split off like any niche.
  growOnRate: 0.00002, growOnMax: 1.5, growOnFed: 0.75, crushSize: 0.8, crushGape: 0.5, rareMass: 0.1, apexPrey: 2.25,
  // GRASS THAT EVOLVES (Luis, 08:10 Oct 16; rollout.grassvar): each grass cell carries a strain — hardiness and sweetness,
  // 0…1 — passed to a bare cell that sprouts from a lush neighbour (copied from one of them), from a grazer's seed (the
  // strain it last ate) or from the seed bank (the strain that last grew there), mutating by ±grassMut each time.
  // Hardy grass withers up to hardyWither slower in drought but grows hardyGrow slower and gives hardyEnergy less;
  // sweet grass gives up to sweetEnergy more but withers sweetWither faster and its roots wear sweetRoots faster.
  // LEANER GRASS (Luis, 08:40 Oct 16; rollout.leaner): let food, not room, set the population. Every leanEvery seasons
  // (≈ 3 generations) grass is worth leanStep less (× 0.9), never below leanFloor; it stops for good once leanQuiet seasons
  // pass without the room ceiling being touched (food is in charge), and waits while the family is under leanPause.
  // RELIEF (Luis, 10:00 Oct 16; rollout.relief, step 1 of the orography): a mountain range rises over reliefSeasons
  // seasons along a ridge line ridgeY of the map's height from the top (35% from the bottom): a pointy PEAK west of the
  // river line (riverX of the width), a flat MESETA east of it (± mesetaHalf of the height around the ridge), a low saddle
  // joining them, cut by the river's canyon; lowlands above and below at river level. Temperature comes from height
  // (lowlands tempLow, − lapse × elevation, + the eras), replacing north–south. Slopes: climbing costs climbCost × rise
  // × body mass (÷ a size-7 body) × fat drag × leg factor, and steep ground slows up to slopeSlow (long legs help).
  reliefSeasons: 30, ridgeY: 0.65, riverX: 0.32, peakX: 0.14, peakR: 150, peakH: 1, mesetaH: 0.6, mesetaHalf: 0.15,
  mesetaEdge: 24, saddleH: 0.35, saddleW: 40, canyonHalf: 22, tempLow: 0.62, lapse: 0.3,
  climbCost: 0.3, slopeSlow: 0.4, steepRef: 0.02,
  // FOUR SECTIONS (Luis, s1389; option B of reports/status/2026-10-16_s1375-four-sections-proposal.md; rollout.sections):
  // the map's frame becomes the border. Over sectionsSeasons the land reshapes toward a second relief: a mountain WALL
  // along the top/bottom seam (crest wallH, ±wallCore, faces wallFace px), a SEAM RIVER along the left/right seam
  // (seamX px), a SPINE along the ridge line wherever the meseta is not (spineH, closing the saddle and the gap at the
  // seam), the meseta broader to the north (mesetaNorth px, still flat), and the lowlands TILTED down west → east
  // (tiltBase + tiltWest at the west edge, 0 + tiltBase at the east), so water runs left to right into two deep
  // channels (chanHalf px, chanDepth below the banks) that drain south and cut narrow water-filled gorges through the
  // spine and the wall (the canyon's dry floor is filled in). Crossing takes skill: a cell asks a CLIMBING need from its
  // height above cragAt (crags: up to cragNeed at 1.0) or its steepness above cliffAt (cliffs: up to cliffNeed), and deep
  // water a SWIMMING need from how far it is over the legs (deep − 1) / swimSpan; a body moving to a harder cell than its
  // own needs that skill (soft margin skillMargin), else it stays on its side. Needs scale with the transformation.
  // c.climb is a new inherited skill (dormant at 0, like swimming). Quakes break cliffs along the fault into scree.
  sectionsSeasons: 10, wallH: 1, wallCore: 10, wallFace: 22, seamX: 952, spineH: 0.9, spineCore: 8, spineFace: 18,
  mesetaNorth: 32, tiltBase: 0.12, tiltWest: 0.24, valleyHalf: 80, valleyDepth: 0.08, chanHalf: 10, chanDepth: 0.14,
  cragAt: 0.78, cragNeed: 0.7, cliffAt: 0.014, cliffSpan: 0.02, cliffNeed: 0.6, swimSpan: 1.5, skillMargin: 0.1,
  climbDrift: 0.02, climbUpkeep: 0.04, screeWidth: 16, wallMemory: 90, needFloor: 0.15, fallCost: 0.05,
  // WATER, EROSION AND SWIMMING (Luis, 10:20 Oct 16; step 2 of the orography; rollout.water, then rollout.wading).
  // Water per cell (world.water) is routed every waterEvery ticks to the lowest of the 8 neighbours by surface (relief -
  // carving + water), with a tilt toward the bottom of the map (the river flows top to bottom and, the map wrapping,
  // comes back at the top). Rain on the heights runs off into it; below snowAt it falls as snow (world.snow) and melts back
  // when warm (spring floods); below freezeAt the water freezes (no flow; walkable). Water evaporates with heat. Flowing
  // water carves its bed (world.carve, up to carveMax), wears reef (reefWash) into fertile soil downstream, and wets its
  // banks; grass drowns under deep water. Reef and the relief (Luis, s1203): grains roll downhill, frost cracks reef on
  // the heights. Creatures (rollout.wading): water deeper than the legs are long slows and tires them (heavier and fatter
  // bodies most) and sweeps the small downstream; a SWIMMING skill (c.swim, dormant at 0, inherited) eases all of it.
  // tilt per row (Luis, s1225): tiltTop at the top edge, easing to tiltHalf by halfway down, tiltHalf below
  waterEvery: 8, waterTilt: 0.006, tiltTop: 0.15, tiltHalf: 0.01, valleyTilt: 0, seep: 0.01, flowMax: 0.08, precip: 0.00003, snowAt: 0.3, meltRate: 0.004, freezeAt: 0.2, evap: 0.0004,
  carveRate: 0.004, carveMax: 0.3,
  // DEPOSITION (Luis, s1536): water carries what it cuts (world.sed, a load per cell, in elevation units). A stream holds
  // up to sedCap × flow × min(1, drop / sedDropRef) — fast water carries more; it carves only into spare capacity, and
  // drops depRate of any excess where it slows, and its whole load where it ponds or dries, raising the ground
  // (carve goes negative: fill above the old ground, down to −fillMax). Material is conserved.
  sedCap: 0.05, sedDropRef: 0.02, depRate: 0.2, pondDrop: 0.05, fillMax: 0.3,
  // GEOLOGY (Luis, s1544; reports/status/2026-10-17_s1542-geology-proposal.md, pieces 1 + 2; rollout.geology): three
  // rocks lie in layers geoLayer thick by height, tilted west → east (geoTilt over the width) and folded under the range
  // (geoFold, a wave geoFoldLen px long fading geoFoldWidth px from the ridge line), over a hard BASEMENT below geoBase:
  // the exposed rock is the layer at the land's surface; where deposition has filled above the old ground, loose
  // SEDIMENT. Each erodes at rockErode × (0 hard, 1 soft, 2 soluble, 3 sediment, 4 basement), so the carving cap is
  // lifted (carveMax) and the basement is the natural base level. Soils follow the rock: grass grows × rockGrow and the
  // ground holds rockWet more moisture; fresh deposits build ALLUVIUM (world.alluv, 0…1: + alluvGain × deposit, fading
  // alluvFade per water update), rich (+ alluvGrow growth) and moist (+ alluvWet). Shells find rockMineral to hand.
  // THE UPHEAVAL (Luis, s1640: "as if a colossal mass came from below the ground, a dormant volcano we may see one day but
  // not today"; rollout.upheaval): over upheavalSeasons a dome rises under the peak (centre upheavalAt, +upheavalAmp there so
  // the summit reaches ~1.8, an irregular radius upheavalR, and a faint tail upheavalTail reaching the whole map). Half of
  // it creeps up a little every 135 ticks; the other half comes in earthquakes every 0.6–2 seasons (upheavalBigChance of
  // them great), each lifting an irregular patch by part of what is still missing there — imperfectly (± upheavalNoise) —
  // and opening a narrow CRACK (the stretched surface) 0.03–0.12 deep, radial or along the rings. A last settling at the
  // end lays down whatever is left. Everything rides on the land (tectonic); water, erosion, climate, lichen and the
  // barriers then answer by their own rules.
  sloppySeasons: 48, seamBand: 180, seamRamp: 12, seamEase: 0.02, // SLOPPY (rollout.sloppy, s1694): the land drifts over sloppySeasons from the sections' frame to its sloppy version (buildRelief(2))
  upheavalSeasons: 48, upheavalAt: [134, 360], upheavalAmp: 0.9, upheavalR: 260, upheavalTail: 0.12, upheavalTailR: 450,
  upheavalCreep: 0.5, upheavalEvery: [0.6, 2], upheavalBigChance: 0.35, upheavalNoise: 0.3, crackDepth: [0.03, 0.12], crackWidth: 6,
  geoLayer: 0.15, geoTilt: 0.12, geoFold: 0.1, geoFoldLen: 260, geoFoldWidth: 140, geoBase: -0.7, geoCarveMax: 2,
  rockErode: [0.3, 1.6, 1, 2, 0.05], rockGrow: [0.85, 1.05, 1, 1.1, 0.85], rockWet: [-0.06, 0.08, -0.03, 0.05, -0.06], rockMineral: [0.05, 0.1, 0.5, 0.1, 0.05],
  alluvGain: 200, alluvFade: 0.9995, alluvGrow: 0.5, alluvWet: 0.12, reefWash: 0.02, bankWet: 0.75, drownAt: 0.04, grooveDepth: 0.04,
  frostCrack: 0.0015, grainDownhill: 0.6,
  // THE BIG RIVER (Luis, s1837: "a river [that] crosses top to bottom more widely and 'forces' species to explore more swimming when
  // full most of the time, to the extent that even during droughts there would be some water availability"; rollout.bigriver): over
  // bigriverSeasons the SEAM river is widened and deepened: a main channel bigChanHalf px each side of its (meandering) line, cut
  // bigChanDepth below the banks (swim-deep when it runs full), inside a floodplain bigFloodHalf px each side that lies
  // bigFloodDepth below the banks (wadeable). Where the wall or the dome stand above bigGorgeAt it cuts a gorge, not a plain.
  // Perennial water: bigSprings points along its course (down to bigSpringReach of the map's height) feed springFlow of
  // water into the lowest cell of their row every water update (not while frozen), so the channel never runs dry in a drought.
  bigriverSeasons: 10, bigChanHalf: 20, bigChanDepth: 0.3, bigFloodHalf: 46, bigFloodDepth: 0.04, bigGorgeAt: 0.45, bigMeander: 30,
  bigSprings: 16, bigSpringReach: 0.95, springFlow: 0.025,
  // EARTHQUAKES (Luis, s1216; step 3 of the orography; rollout.quakes): small ones every quakeEvery seasons (a random
  // 15–30), and at least one big one in every quakeBigWithin seasons. A quake breaks the ground along a fault (length by
  // strength): one side rises, the other drops, fading with distance (world.tectonic, added to the land); reef along the
  // break shatters into grains that roll downhill; the water finds its way over the new ground by itself (it may pond, or
  // move the river). Bodies near the epicentre lose energy to the fright.
  quakeEvery: [15, 30], quakeBigWithin: 100, quakeBigChance: 0.15, quakeSmall: [0.03, 0.08], quakeBig: [0.15, 0.3],
  quakeLenSmall: [100, 220], quakeLenBig: [300, 600], quakeWidth: 40, quakeShatter: 0.8, quakeFright: 0.3,
  // PHYSICS IN METRES (M2, rollout.physics): 100 m per height, 0.65 m per unit and seconds per tick.
  // Muscle follows cross-section; steep ascents take time, descents can fall, deep swimming needs strength.
  heightMetres: 100, unitMetres: 0.65, tickSeconds: 0.65, toblerRate: 3.5, toblerDown: 0.05, slopeFloor: 0.25,
  climbUp: 0.4, climbMinRise: 2, climbMaxTicks: 240, climbSpeed: 0.15, climbHold: 0.002, downFall: 0.01,
  swimBase: 0.2, swimSkill: 0.5,
  depthPx: 60, wadeSlow: 0.7, wadeCost: 0.004, sweep: 0.6, swimDrift: 0.02, swimUpkeep: 0.04,
  leanEvery: 5, leanStep: 0.9, leanFloor: 0.35, leanQuiet: 9, leanPause: 100,
  grassStart: 0.1, grassMut: 0.05, hardyWither: 0.8, hardyGrow: 0.4, hardyEnergy: 0.3, sweetEnergy: 0.4, sweetWither: 0.5, sweetRoots: 0.5,
  valleyPower: 0.5, valleyJaws: 0.15, skillHelp: 0.3, sizeDriftWide: 0.1, massPerSlot: 1.9, massHeads: 1.1, nicheRare: 0.1, nicheExtra: 0, // (nicheroom, s1930) a way of life under nicheRare of all bodies may breed up to nicheExtra past the head ceiling (0, s1934: extra room let 3% of bodies parent most births — newborns start as grazers, so the rare stay rare)
  packHelp: 0.1, packMax: 3, packRange: 40, // (pack) each jawed kin of the hunter within packRange of the prey lowers the size it needs by packHelp, up to packMax kin
  // (rollout.smooth, Luis 16:00 Oct 15) the benefits grow from zero: any decomposer ability feeds a little on droppings, any
  // parasite ability feeds a little on bodies of other kinds already infested; infesting new hosts stays past parasiteMin.            // rich food fattens more, on its own (the stomach's 'rich' half): surplus becomes fat × stomachRich[kind] at this strength
  stomachHold: 40,       // capacity: this many ticks of full-size bites …
  stomachEmpty: 0.8,     // … emptying by this share of a full-size bite each tick (a pure grazer can graze ~80% of the time)
  stomachBulk: { plant: 1, browse: 1.5, flesh: 0.3, carrion: 0.4, fruit: 1, nut: 0.6, cone: 0.8, insect: 0.5 }, // bulk per unit of raw food
  stomachRich: { plant: 0.7, browse: 1.0, flesh: 1.3, carrion: 1.1, fruit: 0.9, nut: 1.4, cone: 1.0, insect: 1.1 }, // how readily a surplus from it becomes fat (× fat share)
  // Rollout (Luis, 10:25 Oct 15), one per season: (1) kin — relatedness over the whole creature; (4) home — the
  // descendants keep a home range; (3) niche — a local group living differently splits off. world.rollout holds the seasons.
  kinCode: 0.5,          // (1) code numbers count at half weight (most drift neutrally) …
  kinBody: 1,            // … the 12 body traits from the genes (scaled as in the ancestry measure) at full weight …
  kinGenes: 0.3,         // … and the 4 personal genes at this weight
  // Home ranges and spatial footprint (homerange, Luis s2012; proposal s2008 M1).
  homeR: 140, homeMin: 60, homeMax: 300, homeInner: 0.6, homePull: 0.25,
  homeHunger: 0.3, homeHungryPull: 0.2, homeShift: TICKS_PER_DAY, dispersal: 3, homeTries: 8, homeOppose: 0.5,
  grassRampCut: 0.3, grassRampSeasons: 6, grassRampFloor: 160, grassRampStarve: 0.6, // (grassramp, Luis s2013) grass alone −30% over 6 seasons; freezes below 160 bodies or > 60% of deaths by hunger
  footprint: 0.5, mateFloor: 4, // (footprint, Luis s2012 decision 9; split from homerange s2018) contact, mating and crowding distances × footprint to match the drawn body
  homeRange: 120,        // (4) beyond this distance from its birthplace a body is pulled home …
  oldHomePull: 1.0,         // … harder the further it strays (up to 1.5 × this)
  niche: { apex: 0.3, hunter: 0.6, scavenger: 0.3, omnivore: 0.2, browser: 0.5, mixed: 0.2, decomposer: 0.25, parasite: 0.25, insectivore: 0.3 }, // (3) recent-diet bars for each way of life (Luis, 11:45 Oct 15) …
  nicheHold: { scavenger: 3 }, // … daily checks in a row a group must hold before splitting (default nicheDays + 1; scavengers longer: carcass feasts after a drought pass)
  nicheDays: 1,
  habEvery: 10, habRecent: TICKS_PER_DAY, habAquatic: 0.4, habHigh: 0.6, habHeight: 0.5, // (habitat, Luis s1694 / roadmap v2)
  nicheRecent: TICKS_PER_DAY, // (3) the niche reads the RECENT diet (Luis, 10:55 Oct 15): meals fade with this time constant, so a lifetime of grazing does not hide a body that now lives on meat          // … and a local group of splitMin such bodies, held this many days, splits off      // a different mind (a hidden slip) counts this much against a pairing: like prefers like
};
const P = PHYSICS;
const mass = size => (size / 5) ** 2;
// The god reintroduces life: plant-eaters a day after the last one dies; flesh-eaters only once
// plant-eaters have settled (this many, for a full day) and a day after the last flesh-eater died, and never while
// the god is still studying the last collapse.
// It brings back the most recent species of that diet, with its last code and body.
export const IMMIGRATION = { delay: TICKS_PER_DAY, settledPopulation: 100, huntersAt: 150, hunters: 6, huntersGap: TICKS_PER_DAY / 4, freshPrey: 50, scavengerFlock: true, grazers: false, huntersPack: true, hunterGut: 0, reinforceAt: 500, packApart: 300, rescueBelow: 3, rescueAt: 300, paused: true }; // paused (Luis, 23:30 Oct 14): the god sends nothing — no packs, no scavengers, no waves
const ROLES = [[2.3, 'grazer'], [2.7, 'omnivore'], [3.4, 'hunter'], [Infinity, 'apex']];
export const roleOf = tl => ROLES.find(([max]) => tl < max)[1];

const wrap = (v, m) => ((v % m) + m) % m;
const delta = (from, to, m) => { let d = to - from; if (d > m / 2) d -= m; else if (d < -m / 2) d += m; return d; };
const cellAt = (x, y) => wrap(Math.floor(y / CELL), GH) * GW + wrap(Math.floor(x / CELL), GW);
const clamp01 = v => Math.min(1, Math.max(0, v));
const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;
const plural = n => n + 's';
const drift = g => clamp01(g + (Math.random() - 0.5) * 2 * GENE_DRIFT);
// Most births drift a trait a little; now and then one leaps (a 'sport'), and the world takes note.
let sports = 0;
const leap = () => (Math.random() < P.jumpChance ? (sports++, (Math.random() < 0.5 ? -1 : 1) * P.jumpSize * (0.5 + Math.random() * 0.5)) : 0);
const wobble = d => (Math.random() - 0.5) * 2 * d;
const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random()); };
const driftSize = (s, d = P.sizeDrift) => Math.min(P.maxSize, Math.max(P.minSize, s * (1 + wobble(d) + leap())));
const driftGut = g => clamp01(g + wobble(P.gutDrift) + leap());
const driftLegs = l => Math.min(P.maxLegs, Math.max(P.minLegs, (l ?? 1) * (1 + wobble(P.legs) + leap())));
const driftThrift = v => clamp01((v ?? 0.5) + wobble(P.thriftDrift) + leap());
const driftPlastic = v => clamp01((v ?? 0.2) + wobble(P.plasticDrift) + leap());
const driftWind = w => Math.min(P.maxWind, Math.max(0, (w ?? 0.5) + wobble(P.wind) + leap()));
const driftArmor = a => clamp01((a ?? 0) + wobble(P.armorDrift) + leap());
const driftToxin = t => clamp01((t ?? 0) + wobble(P.toxinDrift) + leap());
// Maturity (life history): how many beats, as a multiple of P.maturity, before a body can breed. Late maturers live
// longer and store more; early maturers breed sooner. Inherited, drifting, with rare leaps.
const driftMature = m => Math.min(P.matureMax, Math.max(P.matureMin, (m ?? 1) + wobble(P.matureDrift) + leap() * 0.5));
// Browse (Phase 2): how well a gut handles thicket shoots (0 … 1); grass is digested worse the more of it a body has.
const driftBrowse = v => Math.min(1, Math.max(0, (v ?? 0.05) + wobble(P.browseDrift) + leap() * 0.3));
// Gape (Phase 3a): the prey size a hunter's jaws suit best, as a ratio of its own size. Inherited, drifting, rare leaps.
const driftGape = g => Math.min(P.gapeMax, Math.max(P.gapeMin, (g ?? 0.5) + wobble(P.gapeDrift) + leap() * 0.3));
// Toxin resistance: how much toxin an eater shrugs off. Inherited, drifting, rare leaps (the predators' side of the arms race).
// The body a line's founders start with, trait by trait, and how a difference is scaled (share of the trait's range, or
// log ratio for size): used to measure how far a species has come from its founder.
const BODY = [[c => c.size, r => r.size, 'log'], [c => c.gut, r => r.gut, 1], [c => c.legs ?? 1, () => 1, 1], [c => c.wind ?? 0.5, () => 0.5, 1],
  [c => c.armor ?? 0, () => 0, 1], [c => c.toxin ?? 0, () => 0, 1], [c => c.litter ?? 1, () => 1, 2], [c => c.mature ?? 1, () => 1, 2],
  [c => c.browse ?? 0.05, () => 0.05, 1], [c => c.gape ?? 0.5, () => 0.5, 1], [c => c.resist ?? 0.3, () => 0.3, 1], [c => c.eyes ?? 0.5, () => 0.5, 1]];
// Relatedness over the whole creature (rollout 1): body traits from the genes (not the luck of birth), and personal genes.
const geneOf = (c, k) => k === 'size' ? c.sizeGene ?? c.size : k === 'gut' ? c.bornGut ?? c.gut : k === 'gape' ? c.gapeGene ?? c.gape ?? 0.5 : c[k];
const KIN_BODY = [['size', 'log'], ['gut', 1], ['legs', 1, 1], ['wind', 1, 0.5], ['armor', 1, 0], ['toxin', 1, 0], ['litter', 2, 1], ['mature', 2, 1],
  ['browse', 1, 0.05], ['gape', 1, 0.5], ['resist', 1, 0.3], ['eyes', 1, 0.5]];
const kinBody = (a, b) => KIN_BODY.reduce((s, [k, sc, d]) => { const x = geneOf(a, k) ?? d, y = geneOf(b, k) ?? d; return s + (sc === 'log' ? Math.abs(Math.log(x / y)) : Math.abs(x - y) / sc); }, 0) / KIN_BODY.length;
// (likemates, Luis s2244) the skills join the body gap for mating: climbers prefer climbers. Same scale (a mean over all traits).
const KIN_SKILLS = [['swim', 1, 0], ['climb', 1, 0], ['bite', 1, 0], ['snap', 1, 0], ['coat', 1, 0.3]];
const kinBodySkills = (a, b) => (kinBody(a, b) * KIN_BODY.length + KIN_SKILLS.reduce((s, [k, sc, d]) => s + Math.abs((a[k] ?? d) - (b[k] ?? d)) / sc, 0)) / (KIN_BODY.length + KIN_SKILLS.length);
const kinGenes = (a, b) => a.genes.reduce((s, g, i) => s + Math.abs(g - (b.genes[i] ?? g)), 0) / a.genes.length;
// The traits the selection ledger follows.
export const LEDGER = [['size', c => c.sizeGene ?? c.size], ['gut', c => c.bornGut ?? c.gut], ['litter', c => c.litter ?? 1], ['legs', c => c.legs ?? 1],
  ['swim', c => c.swim ?? 0], ['climb', c => c.climb ?? 0],
  ['wind', c => c.wind ?? 0.5], ['armor', c => c.armor ?? 0], ['mature', c => c.mature ?? 1], ['browse', c => c.browse ?? 0], ['eyes', c => c.eyes ?? 0.5],
  ['gape', c => c.gapeGene ?? c.gape ?? 0.5], ['resist', c => c.resist ?? 0.3], ['decomp', c => c.decomp ?? 0.03], ['parasitism', c => c.parasitism ?? 0.03], ['fright', c => c.genes?.[1] ?? 0.5], ['fat', c => c.fat ?? 0], ['toxin', c => c.toxin ?? 0]]; // (toxin added s1694, Luis: does selection pull it down now predation is low?)
const driftAbility = (v, start) => clamp01((v ?? start) + wobble(P.abilityDrift) + leap() * 0.3);
const driftCoat = v => clamp01((v ?? P.coatStart) + wobble(P.coatDrift) + leap() * 0.3);
const driftWater = v => clamp01((v ?? P.waterStart) + wobble(P.waterDrift) + leap() * 0.3);
const driftSwim = v => clamp01((v ?? 0) + wobble(P.swimDrift) + leap() * 0.3); // dormant at 0; drifts, and selection may lift it
const driftSnap = v => clamp01((v ?? 0) + wobble(P.snapDrift) + leap() * 0.3); // snap (insect-eating): dormant at 0, like bite
const driftBite = v => clamp01((v ?? 0) + wobble(P.biteDrift) + leap() * 0.3); // bite strength (nuts, cones): the same, from 0
const driftClimb = v => clamp01((v ?? 0) + wobble(P.climbDrift) + leap() * 0.3); // climbing: the same, from 0
const driftEyes = e => clamp01((e ?? P.eyesStart) + wobble(P.eyesDrift) + leap() * 0.3);
const driftResist = r => Math.min(1, Math.max(0, (r ?? P.resistStart) + wobble(P.resistDrift) + leap() * 0.3));
const driftLitter = l => Math.min(P.maxLitter, Math.max(1, (l ?? 1) + wobble(P.litterDrift) + leap() * 3));
const driftHue = h => Math.min(P.hueRange, Math.max(-P.hueRange, (h ?? 0) + wobble(P.hueDrift) + leap() * 100));
const pickOf = (a, b) => (Math.random() < 0.5 ? a : b);
const driftK = v => v * (1 + (Math.random() - 0.5) * 2 * P.codeDrift);
const SYLLABLES = ['mo', 'ra', 'ke', 'li', 'thu', 'ven', 'sa', 'or', 'qui', 'bel', 'dro', 'na', 'zu', 'fi', 'gal', 'om', 'ty', 'ush'];
const inventName = () => Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)]).join('');

// Looks: every species gets the hue, shape and mark farthest from all living species.
// Plant-eaters are born with rounded bodies, flesh-eaters with spiky ones.
const SHAPES = { soft: ['triangle', 'blob', 'teardrop', 'crescent', 'ring'], sharp: ['dart', 'star', 'spindle', 'fang'] };
const MARKS = ['none', 'glow', 'trail', 'pulse'], HUE_SWAY = 20;
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
const lookDistance = (a, b) => hueGap(a.hue, b.hue) / 60 + (a.shape !== b.shape) * 1.5 + (a.mark !== b.mark);

// Whatever a behavior stores in me.memory must survive JSON, and stay small.
function safeMemory(m) {
  try {
    const s = JSON.stringify(m);
    return s && s.length < 4000 ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

export class World {
  constructor(saved) {
    this.moisture = new Float32Array(GW * GH);
    this.prev = new Float32Array(GW * GH);
    this.scentPrey = new Float32Array(GW * GH); // left by plant-eaters; fades and spreads, never saved
    this.scentHunt = new Float32Array(GW * GH); // left by flesh-eaters
    this.scentTmp = new Float32Array(GW * GH);
    this.behaviors = {};
    this.genome = {};
    this.onEvent = this.onHistory = this.onSeason = this.onSpecies = this.onExtinct = this.onRevive = this.onEarned = this.onCollapse = this.onSplit = null;
    if (saved?.version === 3) this.restore(saved); else this.seed();
    // Two roots sharing a letter (an older world): the later one takes two letters.
    const seen = new Set();
    for (const [n, r] of Object.entries(this.registry)) if (r.parent === null) { if (seen.has(r.lineage)) r.lineage = this.rootLineage(n); seen.add(r.lineage); }
    this.reef ??= new Float32Array(GW * GH);
    this.mineral ??= new Float32Array(GW * GH);
    this.grains ??= [];
    this.satiation ??= 0.9;
    this.maxCreatures ??= MAX_CREATURES;
    this.thicket ??= new Float32Array(GW * GH);
    if (!this.rootHealth) this.rootHealth = new Float32Array(GW * GH).fill(1);
    if (!this.grassHardy) this.grassHardy = new Float32Array(GW * GH).fill(P.grassStart);
    if (!this.grassSweet) this.grassSweet = new Float32Array(GW * GH).fill(P.grassStart);
    this.water ??= new Float32Array(GW * GH); this.carve ??= new Float32Array(GW * GH); this.sed ??= new Float32Array(GW * GH); this.alluv ??= new Float32Array(GW * GH); this.dungMap ??= new Float32Array(GW * GH); this.snow ??= new Float32Array(GW * GH); this.tectonic ??= new Float32Array(GW * GH); this.aqua ??= new Float32Array(GW * GH); this.lichen ??= new Float32Array(GW * GH); this.insects ??= new Float32Array(GW * GH); this.bloom ??= new Float32Array(GW * GH);
    this.trees ??= new Float32Array(GW * GH); this.treeKind ??= new Uint8Array(GW * GH); this.fruit ??= new Float32Array(GW * GH); this.nuts ??= new Float32Array(GW * GH); this.cones ??= new Float32Array(GW * GH);
    this.flow = new Float32Array(GW * GH); this.flowDir = new Int8Array(GW * GH * 2); this.bank = new Float32Array(GW * GH);
    this.traffic = new Float32Array(GW * GH);
    this.foul = new Float32Array(GW * GH); // ground soiled by infested hosts; fades, never saved
    for (const name of this.living()) { this.compile(name); this.compileMorphs(name); }
    this.ensureGenomes();
    this.rollout ??= { kin: this.season + 1, home: this.season + 2, niche: this.season + 3 }; // one change a season
    for (const c of this.creatures) { c.gutLoad ??= 0; c.gutE ??= 0; c.gutPools ??= {}; }
    if (this.newSeeds?.some(n => this.registry[n].scavenger)) this.reintroduceScavengers();
    // A seed designed to be set down at once (the steward's new hunters) arrives as a pack.
    for (const n of this.newSeeds ?? []) if (this.registry[n].releaseOnArrival && (this.registry[n].avgGut ?? this.registry[n].gut) >= 0.5) this.reintroduce(true, n);
    this.updatePlants();
  }

  get speciesNames() { return Object.keys(this.registry); }
  // The living species, cached per tick and per registry version (the registry holds every species ever, ~2,200; s1562).
  // touchRegistry() marks a birth, death, revival or release of a species, so a change within a tick is seen at once.
  living() {
    if (this._livT === this.tick && this._livV === (this._regVer ?? 0)) return this._liv;
    this._livT = this.tick; this._livV = this._regVer ?? 0;
    return (this._liv = this.speciesNames.filter(n => this.registry[n].extinct === null && !this.registry[n].waiting));
  }
  touchRegistry() { this._regVer = (this._regVer ?? 0) + 1; }

  seed() {
    this.tick = 0;
    this.season = 1;
    this.nextId = 1;
    this.registry = {};
    this.code = {};
    for (const [name, sp] of Object.entries(loadSeed())) {
      this.touchRegistry(); this.registry[name] = { ...sp, mark: 'none', parent: null, born: 0, extinct: null, lastBranchGen: 0,
        lineage: name[0].toUpperCase(), branches: 0, role: roleOf(sp.tl) };
      this.code[name] = readCode(name);
    }
    this.plants = new Float32Array(GW * GH);
    this.fertility = new Float32Array(GW * GH);
    for (let gy = 0; gy < GH; gy++)
      for (let gx = 0; gx < GW; gx++)
        if (noise3(gx * 0.12, gy * 0.12, 7) > 0.6) this.plants[gy * GW + gx] = 0.6;
    this.creatures = [];
    this.corpses = [];
    this.history = [];
    this.events = [];
    this.stats = {};
    this.records = {};
    this.diet = {};
    this.lastCounts = {};
    this.since = { plantsGone: null, fleshGone: 0, settled: null };
    this.lessons = [];
    this.pendingStudies = [];
    this.ensureBooks();
    for (const name of this.speciesNames) this.compile(name);
    for (const name of this.speciesNames)
      for (let i = 0; i < this.registry[name].initial; i++)
        this.creatures.push(this.spawn(name, Math.random() * W, Math.random() * H));
    this.log(`The terrarium is sealed with ${this.speciesNames.filter(n => this.registry[n].initial).map(n => `${this.registry[n].initial} ${plural(n)}`).join(' and ')}.`);
  }

  // A species' code compiles once as a template; each creature runs it with its own numbers.
  compile(name) {
    const g = this.genome[name] = genomeOf(this.code[name]);
    this.behaviors[name] = compileBehavior(name, g.template, g.consts);
  }

  // A creature's own code numbers: the species' latest average (or the numbers it was written with), varied a little.
  jitterK(name) {
    const g = this.genome[name], latest = this.registry[name].meanK;
    if (!g) return [];
    // When code grows new numbers at its end (a rule change), the old ones keep their evolved values.
    const base = latest?.length === g.consts.length ? latest
      : latest?.length < g.consts.length ? [...latest, ...g.consts.slice(latest.length)] : g.consts;
    return base.map(v => v * (1 + (Math.random() - 0.5) * 0.1));
  }

  // A species' hidden minds (slips carried within it, Luis 10:10 Oct 15): each compiled as species#id.
  compileMorphs(name) {
    for (const [id, m] of Object.entries(this.registry[name]?.morphs ?? {})) {
      const key = `${name}#${id}`, g = this.genome[key] = genomeOf(m.code);
      this.behaviors[key] = compileBehavior(key, g.template, g.consts);
    }
  }
  mindKey(c) { return c.morph && this.behaviors[`${c.species}#${c.morph}`] ? `${c.species}#${c.morph}` : c.species; }
  ensureGenomes() {
    for (const c of this.creatures) {
      if (c.morph && !this.genome[`${c.species}#${c.morph}`]) c.morph = 0; // a mind that no longer exists
      if (c.morph) continue; // a hidden mind keeps its own numbers
      const n = this.genome[c.species]?.consts.length ?? 0;
      if (this.freshK?.has(c.species)) c.k = this.jitterK(c.species);
      else if (Array.isArray(c.k) && c.k.length < n) c.k = [...c.k, ...this.jitterK(c.species).slice(c.k.length)];
      else if (!Array.isArray(c.k) || c.k.length !== n) c.k = this.jitterK(c.species);
      c.legs ??= 1; c.wind ??= 0.5; c.stamina ??= 0; // bodies from before legs and wind were inherited
      c.armor ??= 0; c.toxin ??= 0; c.litter ??= 1; c.hueShift ??= 0; c.toxStock ??= 1; c.minStock ??= 1; // bodies from before defences were made from food
    }
  }

  // A line born of a slip can still mate with the species it came from (and with other slips from it):
  // a mind's mutation spreads through a population the way mutations do, half the children at a time.
  interbreeds(a, b) {
    if (a === b) return true;
    const ra = this.registry[a], rb = this.registry[b];
    const mixes = r => (r.slip || r.variant) && !r.graduated;
    if (this.rolled('speciate2') && ((ra.parent === b && this.graceOn(ra)) || (rb.parent === a && this.graceOn(rb)) || (ra.parent && ra.parent === rb.parent && (this.graceOn(ra) || this.graceOn(rb))))) return true; // (speciate2) a new species may still mate with its parent and sisters through its first season
    return !!((mixes(ra) && ra.parent === b) || (mixes(rb) && rb.parent === a) || (mixes(ra) && mixes(rb) && ra.parent === rb.parent));
  }
  // (Luis, s2244; rollout.graceheir) "a little help": a cross between a new species in its grace season and its parent or a
  // sister belongs to the newer species (the later-born), not to a coin-flip parent. Other crosses (slips, variants) unchanged.
  graceHeir(a, b) {
    if (!this.rolled('graceheir') || a.species === b.species) return null;
    const ra = this.registry[a.species], rb = this.registry[b.species];
    if (!(this.graceOn(ra) || this.graceOn(rb))) return null;
    return (ra.bornAt ?? -1) >= (rb.bornAt ?? -1) ? a : b;
  }
  graceOn(r) { return r.bornAt !== undefined && this.tick - r.bornAt < P.graceTicks; }

  // A line born of a slip or a god's edit is a variant of its parent species, not a species of its own,
  // until it cannot breed with them any more (bodies too different) or they are gone.
  isVariant(name) {
    const r = this.registry[name];
    return !!(r && (r.slip || r.variant) && !r.graduated);
  }

  // How related two creatures are: their code numbers' gap plus how different their bodies have become.
  // Across a slip the code numbers no longer line up, so only bodies count.
  relatedGap(a, b) {
    const code = a.species === b.species && (a.morph ?? 0) === (b.morph ?? 0) ? this.genomeGap(a.k, b.k) : 0;
    if (this.rolled('kin')) return P.kinCode * code + P.kinBody * (this.rolled('likemates') ? kinBodySkills(a, b) : kinBody(a, b)) + P.kinGenes * kinGenes(a, b);
    return code + P.gutIsolation * Math.abs(a.gut - b.gut) + P.sizeIsolation * Math.abs(Math.log(a.size / b.size));
  }
  rolled(key) { return this.season >= (this.rollout?.[key] ?? Infinity); }
  // The world's temperature (0 cold … 1 hot): today's era offset, and a cell's temperature (north cold, south warm).
  tempEra(t = this.tick) { return P.tempEra * Math.sin(t / (SEASON_TICKS * P.tempSeasons) * Math.PI * 2 + 1.3) + P.tempSwing * Math.sin(t / (TICKS_PER_DAY * 7) * Math.PI * 2); }
  tempAt(y, era = this.tempEra(), x) {
    if (!this.rolled('climate')) return 0.5;
    const ns = P.tempNorth + (P.tempSouth - P.tempNorth) * (wrap(y, H) / H) + era, r = this.reliefRise();
    if (!r || x === undefined) return clamp01(ns);
    // relief: temperature from height replaces north–south, blending in as the land rises
    return clamp01(ns * (1 - r) + (P.tempLow + era - this.lapseNow() * this.elevAt(x, y) / Math.max(r, 1e-9) * r) * r);
  }
  // (D, s2261, rollout.coldheights) the heights are colder in every era: a steeper lapse rate.
  lapseNow() { return this.rolled('coldheights') ? P.lapseCold : P.lapse; }
  // How far the relief has risen (0 flat … 1 full), smoothly by tick from rollout.relief over reliefSeasons.
  reliefRise() { const s0 = this.rollout?.relief; if (s0 === undefined || this.tick < s0 * SEASON_TICKS) return 0; return Math.min(1, (this.tick - s0 * SEASON_TICKS) / (P.reliefSeasons * SEASON_TICKS)); }
  // The relief (0…1 per cell; the land today is this × reliefRise()): the orography's own, blended toward the four
  // sections' frame as rollout.sections runs (sectionsRise 0 → 1). Both are computed once; the blend is cached in steps.
  sloppyRise() { const s0 = this.rollout?.sloppy, t0 = (s0 - 1) * SEASON_TICKS; if (s0 === undefined || this.tick < t0) return 0; return Math.min(1, (this.tick - t0) / (P.sloppySeasons * SEASON_TICKS)); } // the potter's work, 0 → 1
  sectionsRise() { const s0 = this.rollout?.sections, t0 = (s0 - 1) * SEASON_TICKS; if (s0 === undefined || this.tick < t0) return 0; return Math.min(1, (this.tick - t0) / (P.sectionsSeasons * SEASON_TICKS)); } // season s runs from tick (s − 1) × SEASON_TICKS
  riverRise() { const s0 = this.rollout?.bigriver, t0 = (s0 - 1) * SEASON_TICKS; if (s0 === undefined || this.tick < t0) return 0; return Math.min(1, (this.tick - t0) / (P.bigriverSeasons * SEASON_TICKS)); } // the big river's cut, 0 → 1
  bandHalf() { return this.rolled('bigriver') ? P.bigChanHalf + 20 : P.chanHalf + 8; } // the river section's half-width (the big river is wider)
  reliefMap() {
    const s = this.sectionsRise(), s2 = this.sloppyRise(), s3 = this.riverRise(), key = Math.round(s * 400) + 1000 * Math.round(s2 * 400) + 1e6 * Math.round(s3 * 400);
    if (this._relief && this._reliefStep === key) return this._relief;
    const E0 = (this._relief0 ??= this.buildRelief(false));
    if (!key) { this._reliefStep = key; this._needKey = null; return (this._relief = E0); }
    const E1 = (this._relief1 ??= this.buildRelief(true)), k = Math.round(s * 400) / 400, k2 = Math.round(s2 * 400) / 400, k3 = Math.round(s3 * 400) / 400, E = new Float32Array(E0.length), E2 = k2 > 0 || k3 > 0 ? (this._relief2 ??= this.buildRelief(2)) : null, E3 = k3 > 0 ? (this._relief3 ??= this.buildRelief(3)) : null;
    for (let i = 0; i < E.length; i++) E[i] = E0[i] + (E1[i] - E0[i]) * k + (E2 ? (E2[i] - E1[i]) * k2 : 0) + (E3 ? (E3[i] - E2[i]) * k3 : 0);
    this._reliefStep = key; this._needKey = null;
    return (this._relief = E);
  }
  // How much climbing skill each cell asks (crags by height, cliffs by steepness), growing with the sections' rise.
  climbNeed() {
    const nk = `${this._reliefStep}:${Math.floor(this.tick / 2700)}`; // refreshed as the land rises, after quakes, and every half season (carving)
    if (this._need && this._needKey === nk) return this._need;
    const s = this.sectionsRise(), N = (this._need ??= new Float32Array(GW * GH)), E = new Float32Array(GW * GH), r = this.reliefRise(), R = this.reliefMap();
    for (let i = 0; i < E.length; i++) E[i] = R[i] * r + (this.tectonic?.[i] ?? 0); // the land's shape and its quakes (erosion gullies are not cliffs)
    const at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW);
    for (let i = 0; i < E.length; i++) {
      const gx = i % GW, gy = (i / GW) | 0, steep = Math.max(0, E[i] - Math.min(E[at(gx + 1, gy)], E[at(gx - 1, gy)], E[at(gx, gy + 1)], E[at(gx, gy - 1)])) / CELL; // a cliff is ground that DROPS away (s1637): a gorge floor between walls is not one (bodies fell there endlessly)
      N[i] = s * Math.max(P.cragNeed * clamp01((E[i] - P.cragAt) / (1 - P.cragAt)), P.cliffNeed * clamp01((steep - P.cliffAt) / P.cliffSpan));
    }
    this._needKey = nk;
    return N;
  }
  // The relief builder: the orography's land (frame false) or the four sections' (frame true).
  buildRelief(frame) {
    // Natural outlines (Luis, s1194): positions are warped by layered noise, the ridge line wanders, the peak grows spurs
    // and the meseta's escarpments get bays and headlands. Computed once (erosion and quakes will edit it later).
    const fbm = (x, y, z) => { let v = 0, a = 0.5, f = 1; for (let o = 0; o < 4; o++) { v += a * (noise3(x * f, y * f, z + o * 3.1) - 0.5); a *= 0.5; f *= 2; } return v; }; // −0.5…0.5
    const E = new Float32Array(GW * GH), rx = P.riverX * W, px = P.peakX * W, half = P.mesetaHalf * H;
    const mx0 = rx + P.canyonHalf * 2.2, mx1 = W - 30, dx = (a, b) => { const d = Math.abs(a - b) % W; return Math.min(d, W - d); };
    const step = (v, w) => Math.min(1, Math.max(0, v / w)), smooth = t => t * t * (3 - 2 * t);
    const sloppy = frame >= 2, big = frame === 3; // (s1837) frame 3 is the sloppy land with the big river cut; (s1694) the potter's hands: the frame's straight lines wander, swell, sag and wear through
    const cell = (x0, y0) => { const gx = x0 / CELL - 0.5, gy = y0 / CELL - 0.5;
      const x = x0 + 130 * fbm(x0 * 0.004, y0 * 0.004, 11), y = y0 + 90 * fbm(x0 * 0.004, y0 * 0.004, 23); // warped position
      const ry = P.ridgeY * H + 30 * fbm(x0 * 0.003, 0.5, 31), dyR = Math.abs(y - ry); // the ridge line wanders
      const ang = Math.atan2(y - ry, dx(x, px) * Math.sign(x - px || 1)), spur = 1 + 0.35 * Math.sin(ang * 5 + 1.7) * (0.6 + fbm(gx * 0.1, gy * 0.1, 41));
      const pd = Math.hypot(dx(x, px), dyR) / (P.peakR * spur), ridged = 0.18 * (0.5 - Math.abs(fbm(x * 0.012, y * 0.012, 53))) * 2;
      const peak = pd < 1 ? P.peakH * Math.pow(1 - pd, 1.4) * (0.85 + ridged) : 0; // a peak with spurs and ridges
      const wob = 90 * fbm(x0 * 0.009, y0 * 0.009, 61); // bays and headlands along the escarpments
      const inX = x >= mx0 && x <= mx1 ? smooth(step(Math.min(x - mx0, mx1 - x) + wob, frame ? P.mesetaEdge * 0.5 : P.mesetaEdge)) : 0; // the sections sharpen the escarpments
      const halfY = half + (frame && y < ry ? P.mesetaNorth : 0); // the sections' meseta reaches further north
      const edge = frame ? P.mesetaEdge * 0.5 : P.mesetaEdge, inY = smooth(step(halfY - dyR + wob, edge)), crown = 0.08 * Math.max(0, 1 - dyR / halfY);
      const meseta = (P.mesetaH + crown + 0.05 * fbm(x * 0.02, y * 0.02, 71)) * inX * inY; // a rough table, its crown on the ridge line
      const saddle = P.saddleH * Math.exp(-((dyR / (P.saddleW * (1 + 0.5 * fbm(x0 * 0.01, 0.3, 83)))) ** 2)) * (0.8 + 0.4 * (fbm(x0 * 0.02, 0.7, 89) + 0.5));
      const crx = rx + 22 * Math.sin(y0 / 70) + 18 * fbm(0.2, y0 * 0.006, 97); // the canyon meanders
      const canyon = frame ? 1 : smooth(step(dx(x0, crx) - P.canyonHalf * 0.5, P.canyonHalf)); // the sections fill the canyon's dry floor (the channel cuts a narrow gorge instead)
      const top = Math.max(peak, meseta, saddle), n = 0.04 * fbm(gx * 0.2, gy * 0.2, 7.7);
      let e = Math.max(0, top * canyon + (top > 0.05 ? n : 0));
      if (frame) {
        const wx = sloppy ? x0 + 45 * fbm(x0 * 0.003, y0 * 0.003, 161) : x0, wy = sloppy ? y0 + 45 * fbm(x0 * 0.003, y0 * 0.003, 167) : y0; // the smear
        const crx2 = sloppy ? crx + 34 * fbm(1.3, y0 * 0.004, 153) : crx, seamX = sloppy ? P.seamX + 6 * Math.sin(y0 / 50) + 48 * fbm(0.7, y0 * 0.005, 147) : P.seamX + 6 * Math.sin(y0 / 50);
        const vd = Math.min(dx(wx, crx2), dx(wx, seamX)); // and fall gently into a valley along each channel, so runoff gathers into rivers
        const L = P.tiltBase + P.tiltWest * (1 - Math.min(W, Math.max(0, wx)) / W) - P.valleyDepth * Math.max(0, 1 - vd / P.valleyHalf); // the lowlands lean down from west to east (the meseta keeps its flat top)
        e = Math.max(e, L);
        const ryS = P.ridgeY * H + 30 * fbm(x0 * 0.003, 0.5, 31), dS = Math.abs(y0 - ryS), mes = inX * inY;
        e = Math.max(e, P.spineH * smooth(step(P.spineCore + P.spineFace - dS, P.spineFace)) * (1 - mes)); // a spine of crags along the ridge where the meseta is not
        const wallY = sloppy ? 60 * fbm(x0 * 0.005, 3.3, 141) : 0, dW = Math.min(Math.abs(((wy - wallY) % H + H) % H), H - Math.abs(((wy - wallY) % H + H) % H));
        const wallH = sloppy ? P.wallH * Math.max(0.2, Math.min(1.15, 0.35 + 1.3 * (fbm(x0 * 0.006, 1.1, 143) + 0.5))) : P.wallH, face = sloppy ? P.wallFace * (0.7 + 1.2 * (fbm(x0 * 0.01, 2.2, 149) + 0.5)) : P.wallFace; // it swells, sags and wears through
        e = Math.max(e, wallH * smooth(step(P.wallCore + face - dW, face)) * (1 + 0.06 * fbm(x0 * 0.03, 0.2, 17))); // the wall along the top/bottom seam
        for (const [lx, bank] of [[crx2, P.tiltBase + P.tiltWest * (1 - crx2 / W)], [seamX, P.tiltBase]]) { // the two channels: narrow, deep, cut through everything
          const dc = dx(wx, lx), ch = sloppy ? P.chanHalf * (0.7 + 0.8 * (fbm(x0 * 0.01, y0 * 0.01, 159) + 0.5)) : P.chanHalf; if (dc >= ch) continue;
          const floor = bank - P.valleyDepth - P.chanDepth; // below the valley floor (the seam river may dip under 0)
          e = Math.min(e, floor + (e - floor) * smooth(step(dc - ch * 0.5, ch * 0.5)));
        }
        if (big) { // the big river: the seam channel's line wanders further, with a broad floodplain and a deep main channel
          const bl = seamX + P.bigMeander * Math.sin(y0 / 95 + 1.1) * (0.6 + fbm(0.4, y0 * 0.006, 171)), bank = P.tiltBase, dB = dx(wx, bl);
          const fl = P.bigFloodHalf * (0.8 + 0.5 * (fbm(x0 * 0.01, y0 * 0.01, 173) + 0.5)), ch = P.bigChanHalf * (0.75 + 0.6 * (fbm(x0 * 0.01, y0 * 0.01, 175) + 0.5));
          const lowland = 1 - smooth(step(e - P.bigGorgeAt, 0.3)); // the floodplain spreads over low ground only: the wall and the dome keep their gorge
          if (dB < fl && lowland > 0) { const fo = bank - P.bigFloodDepth; e = Math.min(e, e + (Math.min(e, fo) - e) * lowland * smooth(step(fl - dB, fl * 0.5))); }
          if (dB < ch) { const floor = bank - P.valleyDepth - P.bigChanDepth; e = Math.min(e, floor + (e - floor) * smooth(step(dB - ch * 0.4, ch * 0.6))); }
        }
      }
      return e;
    };
    // SLOPPY (s1694, Luis: "not like an iron, more like a pottery artist with very sloppy old hands"): within seamBand of each
    // map edge the land is blended with the land that wraps in from the other side, equal at the seam, so nothing jumps.
    const B = P.seamBand, mixA = u => u < B ? 0.5 * (1 - u / B) : u > W - B ? 0.5 * (1 - (W - u) / B) : 0, mixB = v => v < B ? 0.5 * (1 - v / B) : v > H - B ? 0.5 * (1 - (H - v) / B) : 0;
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      const x0 = (gx + 0.5) * CELL, y0 = (gy + 0.5) * CELL;
      if (!sloppy) { E[gy * GW + gx] = cell(x0, y0); continue; }
      const a = mixA(x0), b = mixB(y0), xo = x0 < W / 2 ? x0 + W : x0 - W, yo = y0 < H / 2 ? y0 + H : y0 - H;
      E[gy * GW + gx] = (1 - a) * (1 - b) * cell(x0, y0) + a * (1 - b) * cell(xo, y0) + (1 - a) * b * cell(x0, yo) + a * b * cell(xo, yo);
    }
    return E;
  }
  // GEOLOGY: the rock exposed at cell i — 0 hard, 1 soft, 2 soluble, 3 sediment (filled above the old ground), 4 basement.
  rockOf(i) {
    if (!this.rolled('geology')) return 1;
    if (this._rock && this._rockT > this.tick - P.waterEvery) return this._rock[i]; // cached: the rock only changes as water carves and lays down
    if (this._rockBuilding) return this.rockAt(i);
    this._rockBuilding = true; const R = (this._rock ??= new Uint8Array(GW * GH)); for (let k = 0; k < GW * GH; k++) R[k] = this.rockAt(k); this._rockT = this.tick; this._rockBuilding = false;
    return R[i];
  }
  rockAt(i) {
    if ((this.carve?.[i] ?? 0) < -0.005) return 3;
    const z = this.reliefMap()[i] * this.reliefRise() + (this.tectonic?.[i] ?? 0) - (this.carve?.[i] ?? 0);
    if (z < P.geoBase) return 4;
    if (!this._fold) { // the folds and the tilt, fixed per cell
      this._fold = new Float32Array(GW * GH);
      for (let k = 0; k < GW * GH; k++) { const x = (k % GW + 0.5) * CELL, y = ((k / GW | 0) + 0.5) * CELL, dy = Math.abs(((y - P.ridgeY * H) % H + H * 1.5) % H - H / 2);
        this._fold[k] = P.geoTilt * (x / W - 0.5) + P.geoFold * Math.exp(-((dy / P.geoFoldWidth) ** 2)) * Math.sin(2 * Math.PI * x / P.geoFoldLen) + 0.02 * (noise3(x * 0.01, y * 0.01, 5.5) - 0.5); }
    }
    return [1, 2, 0][((Math.floor((z - P.geoBase + this._fold[i]) / P.geoLayer) % 3) + 3) % 3]; // soft, soluble, hard, from the basement up
  }
  // THE UPHEAVAL: the dome's full uplift per cell (fixed once: irregular radius by angle, a faint tail everywhere).
  upheavalTarget() {
    if (this._upT) return this._upT;
    const T = new Float32Array(GW * GH), [cx, cy] = P.upheavalAt, d = (a, b, m) => { let v = Math.abs(a - b) % m; return Math.min(v, m - v); };
    for (let i = 0; i < T.length; i++) {
      const x = (i % GW + 0.5) * CELL, y = ((i / GW | 0) + 0.5) * CELL, dx = d(x, cx, W), dy = d(y, cy, H), r = Math.hypot(dx, dy), sd = (a, b, m) => { let v = (a - b) % m; if (v > m / 2) v -= m; if (v < -m / 2) v += m; return v; }, ang = Math.atan2(sd(y, cy, H), sd(x, cx, W)); // (s1720: wrapped — unwrapped, it made the dome jump across the top/bottom edge)
      const R = P.upheavalR * (1 + 0.3 * (noise3(Math.cos(ang) * 1.5 + 3, Math.sin(ang) * 1.5 + 3, 4.2) - 0.5) * 2) * (1 + 0.08 * (noise3(x * 0.02, y * 0.02, 9.1) - 0.5));
      T[i] = P.upheavalAmp * Math.exp(-((r / R) ** 2)) + P.upheavalTail * Math.exp(-r / P.upheavalTailR);
    }
    return (this._upT = T);
  }
  upheavalStep() {
    const s0 = this.rollout.upheaval, t0 = (s0 - 1) * SEASON_TICKS, n = GW * GH;
    if (this.tick < t0) return;
    const T = this.upheavalTarget(), U = (this.upheaval ??= { applied: new Float32Array(n), byQuake: new Float32Array(n), next: s0 + 0.3 });
    if (!U.applied?.length) U.applied = new Float32Array(n); if (!U.byQuake?.length) U.byQuake = new Float32Array(n);
    const steps = P.upheavalSeasons * SEASON_TICKS / 135, now = this.season - 1 + (this.tick % SEASON_TICKS) / SEASON_TICKS, end = s0 - 1 + P.upheavalSeasons;
    if (now >= end) { // the last settling: whatever is still missing is laid down
      for (let i = 0; i < n; i++) { const left = T[i] - U.applied[i]; if (left > 0) { this.tectonic[i] += left; U.applied[i] += left; } }
      U.done = true; this.landChanged(); this._needKey = null; this._rock = null;
      this.log('The ground settles at last. The mass below has stopped rising; the peak stands far above the plateau, cold and white, and the land around it lies folded and cracked.');
      return;
    }
    for (let i = 0; i < n; i++) { const c = T[i] * P.upheavalCreep / steps; this.tectonic[i] += c; U.applied[i] += c; } // the slow rise
    if (now >= U.next) { this.upheavalQuake(); U.next = now + P.upheavalEvery[0] + Math.random() * (P.upheavalEvery[1] - P.upheavalEvery[0]); }
    this.landChanged(); this._needKey = null;
  }
  upheavalQuake() {
    const T = this.upheavalTarget(), U = this.upheaval, n = GW * GH, big = Math.random() < P.upheavalBigChance, [cx, cy] = P.upheavalAt;
    const owed = i => Math.max(0, T[i] * (1 - P.upheavalCreep) - U.byQuake[i]); // what the quakes still owe this cell
    let tot = 0; for (let i = 0; i < n; i++) tot += owed(i);
    if (tot <= 1e-6) return;
    let r = Math.random() * tot, e = 0; for (; e < n - 1; e++) { r -= owed(e); if (r <= 0) break; } // the epicentre: where most is owed
    const x0 = (e % GW + 0.5) * CELL, y0 = ((e / GW | 0) + 0.5) * CELL, R = big ? 200 + Math.random() * 140 : 90 + Math.random() * 70, share = big ? 0.4 + Math.random() * 0.25 : 0.12 + Math.random() * 0.15;
    const d = (a, b, m) => { let v = (a - b) % m; if (v > m / 2) v -= m; if (v < -m / 2) v += m; return v; };
    let lifted = 0;
    for (let i = 0; i < n; i++) {
      const x = (i % GW + 0.5) * CELL, y = ((i / GW | 0) + 0.5) * CELL, rr = Math.hypot(d(x, x0, W), d(y, y0, H)) / (R * (0.8 + 0.4 * noise3(x * 0.015, y * 0.015, this.tick * 0.001)));
      if (rr >= 1) continue;
      const w = (1 - rr * rr) ** 2, add = owed(i) * share * w * (1 + P.upheavalNoise * (Math.random() * 2 - 1)); // imperfect: a little more here, a little less there
      this.tectonic[i] += add; U.byQuake[i] += add; U.applied[i] += add; lifted += add;
    }
    // The stretched surface cracks: a narrow trough through the epicentre, radial to the dome or along its rings.
    const radial = Math.random() < 0.5, toC = Math.atan2(d(cy, y0, H), d(cx, x0, W)), ang = (radial ? toC : toC + Math.PI / 2) + (Math.random() - 0.5) * 0.6;
    const len = big ? 220 + Math.random() * 200 : 100 + Math.random() * 100, depth = P.crackDepth[0] + Math.random() * (P.crackDepth[1] - P.crackDepth[0]) * (big ? 1 : 0.6), ux = Math.cos(ang), uy = Math.sin(ang);
    for (let i = 0; i < n; i++) {
      const x = (i % GW + 0.5) * CELL, y = ((i / GW | 0) + 0.5) * CELL, dx = d(x, x0, W), dy = d(y, y0, H), along = dx * ux + dy * uy, across = -dx * uy + dy * ux;
      if (Math.abs(along) > len / 2) continue;
      this.tectonic[i] -= depth * Math.exp(-((across / P.crackWidth) ** 2)) * Math.min(1, (len / 2 - Math.abs(along)) / 30); // tapering at its ends
    }
    this.near(x0, y0, big ? 200 : 100, c => { if (!c.dead && !this.registry[c.species].unique) c.energy -= P.quakeFright * (big ? 1 : 0.4); });
    this.quakeNow = { x: Math.round(x0), y: Math.round(y0), ang: +ang.toFixed(3), len: Math.round(len), mag: +(lifted / 50).toFixed(3), big, until: this.tick + 300 };
    (this.quakeLog ??= []).push({ season: this.season, x: this.quakeNow.x, y: this.quakeNow.y, ang: this.quakeNow.ang, len: this.quakeNow.len, mag: this.quakeNow.mag, big, upheaval: true }); if (this.quakeLog.length > 50) this.quakeLog.shift();
    this._reliefKey = null; this._needKey = null; this._rock = null; this.landChanged();
    const where = Math.hypot(d(x0, cx, W), d(y0, cy, H)) < P.upheavalR ? 'under the peak' : 'on the rising land';
    this.log(`${big ? 'The ground heaves' : 'The ground lurches'} ${where}: the mass below pushes up, and the stretched surface cracks ${radial ? 'outward from the peak' : 'along the rising slopes'}.`);
  }
  // SLOPPY (s1720): the tectonic layer's step across each map edge is eased a little every 135 ticks, onto a ramp seamRamp
  // cells wide: features (quake scarps, the dome) keep their shape, only the jump at the edge melts.
  easeSeams() {
    const T = this.tectonic, K = P.seamRamp, k = P.seamEase;
    for (let gx = 0; gx < GW; gx++) { const J = T[gx] - T[(GH - 1) * GW + gx]; for (let r = 0; r < K; r++) { const w = 0.5 * k * J * (1 - r / K); T[r * GW + gx] -= w; T[(GH - 1 - r) * GW + gx] += w; } } // top/bottom
    for (let gy = 0; gy < GH; gy++) { const J = T[gy * GW] - T[gy * GW + GW - 1]; for (let c = 0; c < K; c++) { const w = 0.5 * k * J * (1 - c / K); T[gy * GW + c] -= w; T[gy * GW + GW - 1 - c] += w; } } // left/right
    this.landChanged(); this._needKey = null; this._rock = null;
  }
  // The land per cell, cached (s1562): rebuilt when water has carved or laid down (each water update), after a quake, and
  // whenever the relief or its rise steps — keyed on all three, so it is never stale.
  elevMap() {
    const r = this.reliefRise(), lv = this._landVer ?? 0;
    if (this._elev && this._eR === r && this._eL === lv && this._eS === this._reliefStep) return this._elev; // plain comparisons: this runs thousands of times a tick
    const R = r ? this.reliefMap() : null, E = (this._elev ??= new Float32Array(GW * GH)), T = this.tectonic, D = this.carve;
    for (let i = 0; i < E.length; i++) E[i] = (R ? R[i] * r : 0) + (T?.[i] ?? 0) - (D?.[i] ?? 0);
    this._eR = r; this._eL = lv; this._eS = this._reliefStep; return E;
  }
  landChanged() { this._landVer = (this._landVer ?? 0) + 1; }
  elevAt(x, y) { return this.elevMap()[cellAt(x, y)]; } // the land, moved by quakes, less what water has carved
  // Steepness of a cell (elevation change per pixel), for slowing bodies on slopes.
  steepAt(x, y) {
    if (!this.reliefRise()) return 0;
    const e = (dx, dy) => this.elevAt(x + dx * CELL, y + dy * CELL); // the land as it is: relief, quakes, carving
    return Math.hypot(e(1, 0) - e(-1, 0), e(0, 1) - e(0, -1)) / (2 * CELL);
  }
  // The extra upkeep a body pays for the temperature where it stands, and for dry ground.
  climateCost(c) {
    if (!this.rolled('climate') || this.registry[c.species].unique) return 1;
    const T = this.tempAt(c.y, undefined, c.x), ins = 0.7 * (c.coat ?? P.coatStart) + 0.3 * Math.min(1, this.fatLoad(c)), size = this.bodySize(c) / 7;
    const sf = this.rolled('coldheights') ? Math.max(0.3, size) ** P.bergmann : Math.sqrt(Math.max(0.3, size)); // (D) Bergmann by place: cold ∝ 1/size once the heights are colder
    const cold = P.coldCost * 2 * Math.max(0, 0.5 - T) * (1 - ins) / sf;
    const heat = P.heatCost * 2 * Math.max(0, T - 0.5) * ins * sf;
    const m = this.moisture[cellAt(c.x, c.y)], dry = m < 0.3 ? P.dryCost * (0.3 - m) / 0.3 * (1 - (c.water ?? P.waterStart)) : 0;
    return (1 + cold + heat + dry) * (1 + P.coatUpkeep * (c.coat ?? P.coatStart));
  }
  // How much of grass's value a gut keeps: (1 − gut)², or with the plateau rolled out, all of it up to gutPlateau, then
  // the same curve squeezed onto what is left — so the first steps toward meat cost nothing.
  // M4 (Codex): Gaussian shoulders begin at the flat top's edge, so fits stay continuous.
  gutFit(g, kind) {
    const ff = this.rolled('foodvalues') && P.foodFit[kind]; if (ff) return Math.exp(-((Math.max(0, Math.abs(g - ff[0]) - ff[1]) / ff[2]) ** 2)); // (foodvalues) insects and fish suit most guts
    const [peak, top, width] = kind === 'plant' ? [0.05, 0.10, 0.35]
      : kind === 'browse' ? [0.25, 0.10, 0.35]
      : kind === 'insect' ? [0.40, 0.05, 0.30]
      : kind === 'carrion' ? [0.55, 0.10, 0.30]
      : kind === 'flesh' ? [0.80, 0.15, 0.35] : kind === 'fish' ? [0.45, 0.10, 0.35] : [0.20, 0.10, 0.40]; // fruit, nut, cone (fish: a middle gut, s2419)
    return Math.exp(-((Math.max(0, Math.abs(g - peak) - top) / width) ** 2));
  }
  gutCurves(c) { return this.rolled('gutcurves') && (!c || !this.registry[c.species].unique); }
  browseGut(c) { return this.gutCurves(c) ? this.gutFit(c.gut, 'browse') : 1 - c.gut; }
  treeGut(c) { return this.gutCurves(c) ? this.gutFit(c.gut, 'fruit') : this.grassGut(c.gut, c); }
  grassGut(g, c) { if (this.gutCurves(c)) return this.gutFit(g, 'plant'); if (!this.rolled('plateau')) return (1 - g) ** 2; const p = P.gutPlateau; return g <= p ? 1 : ((1 - g) / (1 - p)) ** 2; }

  // How different two creatures' code numbers are: mean |log ratio|. Too different, and they cannot breed.
  // A line's founder (the species at the root of its lineage) and what it started as: its written code numbers and
  // the body its founders were given.
  rootRef(name) {
    const head = (this.registry[name]?.lineage ?? '').split('.')[0];
    const root = Object.keys(this.registry).find(n => this.registry[n].lineage === head && !this.registry[n].parent);
    if (!root || !this.code[root]) return null;
    this.rootCache ??= {};
    return this.rootCache[root] ??= { name: root, consts: genomeOf(this.code[root].replace(/^\/\/ [†↺].*\n/gm, '')).consts, size: this.registry[root].size, gut: this.registry[root].gut };
  }

  genomeGap(a, b) {
    if (!a?.length || a.length !== b?.length) return a?.length === b?.length ? 0 : Infinity;
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += Math.abs(Math.log(a[i] / b[i]));
    return sum / a.length;
  }

  // The code as the species now runs it: its template filled with the population's average numbers.
  evolvedCode(name) {
    const g = this.genome[name] ?? genomeOf(this.code[name]), k = this.registry[name].meanK;
    return k?.length === g.consts.length ? fillTemplate(g.template, k) : this.code[name];
  }

  ensureBooks() {
    for (const name of this.speciesNames) {
      this.stats[name] ??= { born: 0, mated: 0, budded: 0, starved: 0, old: 0, eaten: 0, kills: 0, broken: 0, seizures: 0 };
      this.records[name] ??= { oldest: 0, generation: 0, peak: 0 };
      this.diet[name] ??= { energy: 0, levels: 0 };
    }
  }

  // Newcomers get the species' body with a little individual variation.
  spawn(name, x, y, gen = 0, genes = Array.from({ length: GENES }, () => Math.random()),
    size = this.registry[name].size * (0.9 + Math.random() * 0.2), gut = clamp01(this.registry[name].gut + (Math.random() - 0.5) * 0.1)) {
    const sp = this.registry[name];
    return {
      id: this.nextId++, species: name, x: wrap(x, W), y: wrap(y, H), vx: 0, vy: 0,
      energy: 1, age: 0, lifespan: Math.round(sp.lifespan * (0.7 + Math.random() * 0.6)), mature: driftMature(sp.avgMature ?? 1), browse: driftBrowse(sp.avgBrowse ?? 0.05), gape: driftGape(sp.avgGape ?? 0.5), resist: driftResist(sp.avgResist ?? P.resistStart), eyes: driftEyes(sp.avgEyes ?? P.eyesStart), decomp: driftAbility(sp.avgDecomp, P.decompStart), parasitism: driftAbility(sp.avgParasitism, P.parasiteStart), coat: driftCoat(sp.avgCoat), swim: driftSwim(sp.avgSwim), climb: driftClimb(sp.avgClimb), bite: driftBite(sp.avgBite), ...(this.rolled('insects') ? { snap: driftSnap(sp.avgSnap) } : {}), water: driftWater(sp.avgWater),
      gen, genes, size, gut, hue: sp.hue, memory: {}, broken: false,
      willing: false, give: 0.45, signal: 0, cooldown: 0, eats: true, k: this.jitterK(name),
      body: mass(size) * P.bodyEnergy * (gen > 0 ? P.bornBody : 1), // the god's newcomers arrive with full bodies
      gutLoad: 0, gutE: 0, gutPools: {},
      legs: driftLegs(sp.avgLegs ?? 1), wind: driftWind(sp.avgWind ?? 0.5), stamina: 0, sprinting: false,
      plastic: driftPlastic(sp.avgPlastic ?? 0.2), bornGut: gut, shift: 0, hunger: 0, thrift: driftThrift(sp.avgThrift ?? 0.5),
      armor: driftArmor(sp.avgArmor ?? 0), toxin: driftToxin(sp.avgToxin ?? 0), litter: driftLitter(sp.avgLitter ?? 1), hueShift: driftHue(sp.avgHueShift ?? 0),
    };
  }

  // Room to breed. The creature cap is a limit of the machine, not of the land, so it must not protect whoever filled it
  // first: when the world is full only the crowded species stop breeding; a small one (under a fifth of the cap)
  // may still breed, up to a hard ceiling a little above the cap.
  room(name, total, c) {
    // Gradual crowding (Luis): births grow less likely as the world fills past crowdStart of its room, and most for the
    // commonest families, so rare lines keep a foothold and no family can monopolise it. A hard ceiling stays for the machine.
    const cap = this.maxCreatures ?? MAX_CREATURES;
    // ROOM BY NICHE (Luis, s1930; rollout.nicheroom): a way of life is crowded by its own numbers, measured live: a rare way of
    // life (under nicheRare of all bodies) may breed past the head ceiling, up to nicheExtra more of the cap, and every birth
    // is throttled by the rarer of its species' and its way of life's share. No fixed quota per niche: the shares regulate it.
    const byNiche = c && this.rolled('nicheroom');
    let nShare = 1;
    if (byNiche) {
      if (!this.nicheTick || this.tick - this.nicheTick >= 30) { // ways of life counted every 30 ticks
        this.nicheTick = this.tick; this.nicheCount = {}; this.nicheOfBody = new Map();
        for (const o of this.creatures) if (!o.dead && !this.registry[o.species].unique) { const n = this.nicheOf(o); this.nicheOfBody.set(o, n); this.nicheCount[n] = (this.nicheCount[n] ?? 0) + 1; }
      }
      const n = this.nicheOfBody.get(c) ?? this.nicheOf(c);
      nShare = (this.nicheCount[n] ?? 0) / Math.max(1, total);
    }
    const rareNiche = byNiche && nShare < P.nicheRare && total < cap * (P.massHeads + P.nicheExtra);
    let crowd;
    if (this.rolled('massroom')) { // room by body mass (the giant apart): small bodies take less room, big ones more
      if (total >= cap * P.massHeads && !rareNiche) { this.ceilingAt = this.tick; return false; } // the machine's limit, in heads
      if (this.massTick !== this.tick) { this.massTick = this.tick; this.massNow = 0; this.massBy = {}; for (const c of this.creatures) if (!c.dead && !this.registry[c.species].unique) { const m = mass(this.bodySize(c)); this.massNow += m; this.massBy[c.species] = (this.massBy[c.species] ?? 0) + m; } }
      const budget = cap * P.massPerSlot;
      const rare = this.rolled('rareroom') && (this.massBy?.[name] ?? 0) < P.rareMass * this.massNow; // a rare species may breed past the mass ceiling (heads still capped)
      if (this.massNow >= budget * P.capCeiling && !rare && !rareNiche) { this.ceilingAt = this.tick; return false; }
      crowd = Math.max(0, (this.massNow / budget - P.crowdStart) / (P.capCeiling - P.crowdStart));
    } else {
      if (total >= cap * P.capCeiling) { this.ceilingAt = this.tick; return false; }
      crowd = Math.max(0, (total / cap - P.crowdStart) / (P.capCeiling - P.crowdStart));
    }
    if (!crowd) return true;
    // Counted by species (Luis, 07:10 Oct 16): every species now shares one root line, so counting the root family throttled a
    // species of 15 as hard as one of 200 — small and new species could not grow out of danger and aged out.
    if (this.familyTick !== this.tick) { // species counts, once per tick
      this.familyTick = this.tick; this.families = {};
      for (const c of this.creatures) if (!c.dead) this.families[c.species] = (this.families[c.species] ?? 0) + 1;
    }
    const share = Math.min((this.families[name] ?? 0) / Math.max(1, total), nShare);
    return Math.random() < 1 - Math.min(1, crowd) * (0.3 + 0.7 * share);
  }


  // A seed species' lineage letter: its initial, or its first two letters when another root already has that initial.
  rootLineage(name) {
    const taken = new Set(Object.entries(this.registry).filter(([n, r]) => n !== name && r.parent === null).map(([, r]) => r.lineage));
    const one = name[0].toUpperCase();
    return taken.has(one) ? one + name[1] : one;
  }

  // How a body's size scales its running costs and clumsiness: k = 1 at the species' reference size.
  // Energy storage and breeding thresholds stay per species, since behaviors are written in absolute energies.
  scale(c) {
    return mass(c.size) / mass(this.registry[c.species].size);
  }

  log(text) {
    const e = { t: this.tick, text };
    this.events.push(e);
    if (this.events.length > EVENTS_MAX) this.events.shift();
    this.onEvent?.(e);
  }

  // --- species come and go ---

  // A new species branches off a living one: a quarter of the parent's population takes the new code.
  // Its looks are chosen to stand apart from every living species; its lineage code extends the parent's.
  // A variant (one edited line) is a mutation, not a species yet: a few carriers, still breeding with their parents' kind.
  addSpecies(name, parent, code, variant = false) {
    const p = this.registry[parent];
    p.branches = (p.branches ?? 0) + 1;
    this.touchRegistry(); this.registry[name] = { ...p, ...this.distinctLook(p.tl >= 2.5), parent, born: this.season, extinct: null, lastBranchGen: 0,
      lineage: `${p.lineage}.${p.branches}`, branches: 0, meanK: undefined, drift: 0, variant, slip: undefined, graduated: undefined };
    this.code[name] = code;
    this.compile(name);
    this.ensureBooks();
    const pool = this.creatures.filter(c => c.species === parent);
    // A quarter of the parent's population, but never fewer than half of a small one (up to 8).
    const count = variant ? Math.min(pool.length, Math.max(8, Math.ceil(pool.length / 20)))
      : Math.max(Math.ceil(pool.length / 4), Math.min(Math.floor(pool.length / 2), 8));
    // The god takes the best-fed members, so a new design gets a fair start instead of a starving one. A variant's
    // carriers are a local group around one well-fed member (a founder population), so they meet each other first
    // instead of being mixed back into the herd at once.
    let founders = pool.sort((a, b) => b.energy - a.energy).slice(0, count);
    if (variant) {
      const centre = pool[Math.floor(Math.random() * Math.max(1, Math.ceil(pool.length / 4)))];
      const far = c => Math.hypot(delta(centre.x, c.x, W), delta(centre.y, c.y, H));
      founders = pool.filter(c => c.energy > 0.3 * p.maxEnergy).sort((a, b) => far(a) - far(b)).slice(0, count);
      if (!founders.length) founders = [centre];
    }
    // Founders start over: new minds, generation zero. They keep their own genes and bodies.
    for (const c of founders) Object.assign(c, { species: name, hue: this.registry[name].hue, memory: {}, broken: false, gen: 0, cooldown: 0,
      lifespan: c.age + Math.round(p.lifespan * (0.7 + Math.random() * 0.6)), k: this.jitterK(name) });
    // The species' reference body is its founders' average, so physiology scales from where they actually are.
    this.registry[name].size = r2(founders.reduce((a, c) => a + c.size, 0) / founders.length);
    for (const c of founders) c.energy = Math.min(c.energy, this.registry[name].maxEnergy);
    this.lastCounts[name] = founders.length;
    this.lastCounts[parent] -= founders.length;
    Object.assign(this.registry[name], { releasedAt: this.tick, statsAtRelease: { ...this.stats[name] } });
    this.log(variant
      ? `${founders.length} ${plural(parent)} wake up with a new habit. They are ${plural(name)} (${this.registry[name].lineage}), and can still breed with ${plural(parent)}.`
      : `${founders.length} ${plural(parent)} wake up changed. They are ${plural(name)} (${this.registry[name].lineage}) now.`);
    this.onSpecies?.();
  }

  // A species the god finished after its parents were gone: registered, but held until the meadow is empty
  // of its kind. It takes the latest bodies of its parent species.
  holdSpecies(name, parent, code, message) {
    const p = this.registry[parent];
    p.branches = (p.branches ?? 0) + 1;
    this.touchRegistry(); this.registry[name] = { ...p, ...this.distinctLook((p.avgGut ?? p.gut) >= 0.5), parent, born: this.season, extinct: null, waiting: true,
      lastBranchGen: 0, lineage: `${p.lineage}.${p.branches}`, branches: 0, size: p.avgSize ?? p.size, gut: p.avgGut ?? p.gut, meanK: undefined, drift: 0 };
    this.code[name] = code;
    this.ensureBooks();
    this.log(message?.(this.registry[name].lineage) ?? `The god finished the ${plural(name)} (${this.registry[name].lineage}), but the ${plural(parent)} were gone. It holds them in its hand.`);
    this.onSpecies?.();
  }

  distinctLook(sharp, others = this.living().map(n => this.registry[n])) {
    let best = null, bestScore = -1;
    for (let hue = 0; hue < 360; hue += 15) if (hue < 210 || hue > 270) // blues and violets vanish on wet soil
      for (const shape of SHAPES[sharp ? 'sharp' : 'soft'])
        for (const mark of MARKS) {
          const look = { hue, shape, mark };
          const score = others.length ? Math.min(...others.map(o => lookDistance(look, o))) + Math.random() * 0.01 : Math.random();
          if (score > bestScore) { bestScore = score; best = look; }
        }
    return best;
  }

  markExtinct(name) {
    const sp = this.registry[name];
    sp.extinct = this.season; this.touchRegistry();
    delete this.behaviors[name];
    delete this.lastCounts[name];
    const how = { starved: 'starving', old: 'of old age', eaten: 'in someone\'s jaws', burnt: 'in a fire' }[this.lastDeath?.cause] ?? '';
    const lived = this.season - sp.born;
    const span = sp.parent ? ` They lasted ${lived <= 0 ? 'less than a season' : lived === 1 ? 'one season' : lived + ' seasons'}.` : '';
    this.log(this.isVariant(name)
      ? `The last ${name} dies ${how}. The ${plural(name)}, a variant of the ${plural(sp.parent)}, fade out.${span}`
      : `The last ${name} dies ${how}. ${plural(name)[0].toUpperCase() + plural(name).slice(1)} (${sp.lineage}) are extinct.${span}`);
    this.onExtinct?.(name);
    this.onSpecies?.();
    // When a hunting species dies out, the world writes down what happened to it, for the god to study.
    if ((sp.avgGut ?? sp.gut) >= 0.5 && !this.scavenging(name)) {
      const st = this.stats[name], before = sp.statsAtRelease ?? {};
      const delta = k => (st[k] ?? 0) - (before[k] ?? 0);
      const lesson = {
        name, lineage: sp.lineage, days: r1((this.tick - (sp.releasedAt ?? 0)) / TICKS_PER_DAY), peak: this.records[name].peak,
        kills: delta('kills'), starved: delta('starved'), eaten: delta('eaten'), old: delta('old'), belief: sp.study,
        preyLeft: this.creatures.filter(c => !c.dead && this.dietOf(c) === 'plant').length,
      };
      this.lessons = [...(this.lessons ?? []), lesson].slice(-8);
      this.pendingStudies = [...new Set([...(this.pendingStudies ?? []), name])]; // survives restarts until studied
      this.onCollapse?.(name, lesson);
    }
  }

  // The latest species of a diet: one the god is holding, else the established one that died most recently,
  // else a seed ancestor.
  latest(fleshEater) {
    const diet = n => !this.registry[n].unique && !this.scavenging(n) && ((this.registry[n].avgGut ?? this.registry[n].gut) >= 0.5) === fleshEater;
    const held = this.speciesNames.filter(n => diet(n) && this.registry[n].waiting);
    if (held.length) return held[held.length - 1];
    // Only species that established themselves (a full season alive after release) come back; failed experiments stay fossils.
    const dead = this.speciesNames.filter(n => diet(n) && this.registry[n].extinct !== null && (this.registry[n].established || !this.registry[n].parent));
    const order = n => this.speciesNames.indexOf(n);
    // Hunters: the most recent. Grazers: the most successful herd there has been (its peak), so a line that only
    // drifted into grazing does not keep getting picked over real grazers.
    const peak = n => this.records[n]?.peak ?? 0;
    dead.sort((a, b) => (fleshEater ? 0 : peak(b) - peak(a)) || this.registry[b].extinct - this.registry[a].extinct || order(b) - order(a));
    return dead[0] ?? this.speciesNames.find(n => diet(n) && this.registry[n].parent === null);
  }

  // The god sets a species back down, as it last was: its code, and bodies like its last ones.
  // The scavengers come back as their latest established species, scattered among the dead.
  reintroduceScavengers(count) {
    const names = this.speciesNames.filter(n => this.registry[n].scavenger);
    // The seed scavenger comes back, not the last line to die: a line that died out may have died of its own broken mind.
    const name = names.find(n => !this.registry[n].parent && this.registry[n].extinct !== null) ?? names.filter(n => this.registry[n].extinct !== null)[0];
    if (!name) return;
    const sp = this.registry[name];
    Object.assign(sp, { extinct: null, waiting: false, lastBranchGen: 0, releasedAt: this.tick, statsAtRelease: { ...this.stats[name] } }); this.touchRegistry();
    this.compile(name);
    // They are sent to eat the dead: if their line has lost its jaws, they come with the gut they were first given.
    const gut = (sp.avgGut ?? sp.gut) > P.jaws + 0.1 ? sp.avgGut ?? sp.gut : sp.gut;
    // As a flock, they land together where the dead lie thickest, so they can find each other to breed.
    let flock = null;
    if (IMMIGRATION.scavengerFlock && this.corpses.length) {
      let best = -1;
      for (let tries = 0; tries < 40; tries++) {
        const k = this.corpses[Math.floor(Math.random() * this.corpses.length)];
        const held = this.corpses.reduce((a, o) => a + (Math.hypot(delta(k.x, o.x, W), delta(k.y, o.y, H)) < 100 ? o.energy : 0), 0);
        if (held > best) { best = held; flock = k; }
      }
    }
    for (let i = 0; i < (count ?? sp.immigrants); i++) {
      const near = flock ?? (this.corpses.length ? this.corpses[Math.floor(Math.random() * this.corpses.length)] : { x: Math.random() * W, y: Math.random() * H });
      this.creatures.push(this.spawn(name, near.x + (Math.random() - 0.5) * (flock ? 60 : 30), near.y + (Math.random() - 0.5) * (flock ? 60 : 30), 0, undefined,
        (sp.avgSize ?? sp.size) * (0.9 + Math.random() * 0.2), clamp01(gut + (Math.random() - 0.5) * 0.1)));
    }
    this.lastCounts[name] = sp.immigrants;
    this.log(`The god scatters ${sp.immigrants} ${plural(name)} (${sp.lineage}) among the dead.`);
    this.onSpecies?.();
  }

  // The hunter species introduced most recently (or held, waiting for its first release), dead or alive.
  lastReleasedHunter() {
    const flesh = n => !this.registry[n].unique && !this.scavenging(n) && (this.registry[n].avgGut ?? this.registry[n].gut) >= 0.5; // one-of-a-kind giants are never sent as packs
    const held = this.speciesNames.filter(n => flesh(n) && this.registry[n].waiting);
    if (held.length) return held.at(-1);
    // Only a proven line (one that has bred on its own: 20 births or more) is sent, unless nothing else has ever hunted.
    const proven = n => flesh(n) && !this.isVariant(n) && (this.stats[n]?.born ?? 0) >= 20 && !this.scavenging(n);
    const released = this.speciesNames.filter(n => (this.speciesNames.some(proven) ? proven(n) : flesh(n)) && this.registry[n].releasedAt !== undefined);
    const last = released.sort((a, b) => this.registry[b].releasedAt - this.registry[a].releasedAt)[0] ?? this.latest(true);
    // A line that has collapsed within a day three times running is set aside: the god goes back to the seed hunter.
    const runs = (this.lessons ?? []).filter(l => l.name === last).slice(-3);
    if (runs.length === 3 && runs.every(l => l.days < 1)) return this.speciesNames.find(n => !this.registry[n].parent && flesh(n)) ?? last;
    return last;
  }

  reintroduce(fleshEater, name = this.latest(fleshEater), count, traits = null, steward = false) { // traits: the steward's hand-shaped body for every member
    if (!name) return;
    const sp = this.registry[name];
    const returning = sp.extinct !== null, held = !!sp.waiting, reinforcing = !returning && !held;
    if (!reinforcing) {
      Object.assign(sp, { extinct: null, waiting: false, lastBranchGen: 0, releasedAt: this.tick, statsAtRelease: { ...this.stats[name] } }); this.touchRegistry();
      this.records[name].peak = 0;
      this.records[name].generation = 0;
      this.compile(name);
    }
    // Hunters are shaped to the prey they will meet: bodies about 1.5 times the plant-eaters' average size.
    const prey = this.creatures.filter(c => !c.dead && this.dietOf(c) === 'plant'), preySize = prey.length ? prey.reduce((a, c) => a + c.size, 0) / prey.length : 0;
    // … big enough to overpower them through their armour too (with a margin), or they would starve beside their food.
    const preyToxin = prey.length ? prey.reduce((a, c) => a + this.toxinOf(c), 0) / prey.length : 0;
    const preyArmor = prey.length ? prey.reduce((a, c) => a + this.armorOf(c), 0) / prey.length : 0;
    const shaped = fleshEater && preySize && !sp.fixedSize ? Math.max(P.minSize, preySize * 1.5, preySize * P.overpower * (1 + P.armorGuard * preyArmor) * 1.1) : null; // a seed may keep the body it was designed with
    // A herd is set down somewhere green and as far as possible from anything that eats flesh.
    const hunters = this.creatures.filter(c => !c.dead && c.gut >= 0.5 && !this.registry[c.species].scavenger);
    let x = Math.random() * W, y = Math.random() * H;
    if (!fleshEater) {
      let bestScore = -Infinity;
      for (let tries = 0; tries < 40; tries++) {
        const px = Math.random() * W, py = Math.random() * H;
        const far = Math.min(400, ...hunters.map(h => Math.hypot(delta(px, h.x, W), delta(py, h.y, H))));
        const score = far + 200 * this.plants[cellAt(px, py)];
        if (score > bestScore) { bestScore = score; x = px; y = py; }
      }
    }
    // Hunters are sent to hunt: a line whose gut drifted toward carrion comes back with a hunter's gut.
    const size = shaped ?? sp.avgSize ?? sp.size, gut = fleshEater ? Math.max(IMMIGRATION.hunterGut, (sp.avgGut ?? sp.gut) >= 0.5 ? sp.avgGut ?? sp.gut : sp.gut) : sp.avgGut ?? sp.gut;
    // (A hunter line whose living members have turned to grass sends hunters with the gut it was founded with.)
    count ??= fleshEater ? sp.immigrants : Math.max(20, sp.immigrants); // a herd needs numbers to take hold
    // Grazers arrive as a herd. Hunters arrive as a pack (or, with huntersPack off, spread out near prey).
    const placed = [];
    // A pack lands together beside the thickest herd, so its members can find each other to breed.
    // With hunters already out, the new pack goes to a herd well away from them, so packs start apart.
    let den = null;
    if (fleshEater && IMMIGRATION.huntersPack && prey.length) {
      let most = -1;
      for (let tries = 0; tries < 40; tries++) {
        const p = prey[Math.floor(Math.random() * prey.length)];
        const n = prey.reduce((a, o) => a + (Math.hypot(delta(p.x, o.x, W), delta(p.y, o.y, H)) < 120 ? 1 : 0), 0);
        const apart = Math.min(Infinity, ...hunters.map(h => Math.hypot(delta(p.x, h.x, W), delta(p.y, h.y, H))));
        const score = n * (apart >= IMMIGRATION.packApart ? 1 : 0.05 + apart / IMMIGRATION.packApart * 0.5);
        if (score > most) { most = score; den = p; }
      }
    }
    const spot = () => {
      if (!fleshEater) return [x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60];
      if (den) return [wrap(den.x + 60 + (Math.random() - 0.5) * 40, W), wrap(den.y + (Math.random() - 0.5) * 40, H)];
      let best = null, bestGap = -1;
      for (let tries = 0; tries < 30; tries++) {
        const near = prey.length ? prey[Math.floor(Math.random() * prey.length)] : { x: Math.random() * W, y: Math.random() * H };
        const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 40;
        const px = wrap(near.x + Math.cos(a) * r, W), py = wrap(near.y + Math.sin(a) * r, H);
        const gap = Math.min(Infinity, ...placed.map(([qx, qy]) => Math.hypot(delta(px, qx, W), delta(py, qy, H))));
        if (gap > bestGap) { best = [px, py]; bestGap = gap; }
        if (gap >= 120) break;
      }
      placed.push(best);
      return best;
    };
    for (let i = 0; i < count; i++) {
      const [px, py] = spot();
      const c = this.spawn(name, px, py, 0, undefined, size * (0.9 + Math.random() * 0.2), clamp01(gut + (Math.random() - 0.5) * 0.1));
      // The god feeds hunters before it lets them go: full, with fat to live on while they learn the ground.
      // Hunters arrive hungry enough to hunt at once (a full one would only lie still), with fat to live on while they learn the ground.
      if (fleshEater) { c.energy = 0.55 * sp.maxEnergy; c.fat = 0.5 * P.maxFat * mass(c.size); c.stamina = c.wind * P.windTicks; c.resist = Math.max(c.resist ?? 0, preyToxin + 0.1); } // and able to stomach their poison
      // Grazers the god sets down are fresh stock: at least the legs and wind their line was born with.
      else { c.legs = Math.max(c.legs, 1); c.wind = Math.max(c.wind, 0.5); c.stamina = c.wind * P.windTicks; }
      if (traits) { for (const [k, v] of Object.entries(traits)) c[k] = k === 'size' ? v * (0.95 + Math.random() * 0.1) : v; c.stamina = c.wind * P.windTicks; if (fleshEater) c.fat = 0.5 * P.maxFat * mass(c.size); }
      this.creatures.push(c);
    }
    this.lastCounts[name] = count;
    if (returning) this.onRevive?.(name);
    const who = `${count} ${plural(name)} (${sp.lineage})`, hand = held ? 'opens its hand and ' : '';
    this.log(steward
      ? `The steward sets ${who} down${fleshEater && den ? ' beside the thickest herd' : ' in the meadow'}.`
      : fleshEater
      ? `${this.freshFromStudy ? 'Fresh from its study, the' : `The plant-eaters number ${prey.length}. The`} god ${hand}releases ${who}${den ? ' as a pack beside the thickest herd' : ''}${shaped ? `, shaped to their prey (size ${r1(shaped)})` : ''}.`
      : `Nothing eats plants any more. The god ${hand}sets ${who} down in the meadow.`);
    this.onSpecies?.();
  }

  // Plant-eaters come back a day after the last one dies. Flesh-eaters only once plant-eaters
  // have settled, and a day after the last flesh-eater died. Never both at the same time.
  // Scavengers are neither: they eat the dead and plants, and nobody is released to hunt them.
  diets() {
    let plantEaters = 0, fleshEaters = 0;
    for (const c of this.creatures) { if (c.dead || this.registry[c.species].unique) continue; const d = this.dietOf(c); if (d === 'flesh') fleshEaters++; else if (d === 'plant') plantEaters++; }
    return { plantEaters, fleshEaters };
  }

  immigration() {
    if (IMMIGRATION.paused) return; // the god's hand is held: whatever dies out stays out
    const t = this.tick, since = this.since;
    const { plantEaters, fleshEaters } = this.diets();
    // Scavengers: the god scatters them among the dead whenever none are left and carrion lies about.
    // The beetles come back (in waves) whenever none of their line is left and there are dead to feed on — whoever else eats carrion.
    if (t % TICKS_PER_DAY === 0 && !(this.waves ?? []).some(v => v.scavengers) && !this.creatures.some(c => !c.dead && this.registry[c.species].scavenger) && this.corpses.length >= 20) this.scheduleWaves(null, true);
    // Grazers come back when no grazer bodies are left (gut below 0.5), even if hunters have taken to grazing.
    const grazers = this.creatures.filter(c => !c.dead && c.gut < 0.5 && !this.registry[c.species].scavenger).length;
    if (grazers) since.plantsGone = null; else since.plantsGone ??= t;
    if (fleshEaters) since.fleshGone = null; else since.fleshGone ??= t;
    if (plantEaters >= IMMIGRATION.settledPopulation) since.settled ??= t; else since.settled = null;
    if (IMMIGRATION.grazers && !grazers && t - since.plantsGone >= IMMIGRATION.delay) return this.reintroduce(false);
    // Rescue: when hunters dwindle below a few while there are plenty of plant-eaters, a fresh pack comes at once
    // (at most once per huntersGap), rather than waiting for the last hunter to die.
    const pack = c => !c.dead && c.gut >= 0.5 && !this.registry[c.species].scavenger && !this.registry[c.species].unique;
    const flesh = this.creatures.filter(pack).length;
    if (flesh > 0 && flesh < IMMIGRATION.rescueBelow && plantEaters >= IMMIGRATION.rescueAt && t - (since.rescue ?? -Infinity) >= IMMIGRATION.huntersGap) {
      since.rescue = t;
      this.log(`The last hunters are failing. The god sends another pack.`);
      const out = {};
      for (const c of this.creatures) if (pack(c)) out[c.species] = (out[c.species] ?? 0) + 1;
      return this.reintroduce(true, Object.keys(out)[0] ?? this.lastReleasedHunter(), IMMIGRATION.hunters);
    }
    // Reinforcements: every season, while plant-eaters number 500 or more, a fresh pack of the current hunters
    // is set down beside a herd far from the packs already out.
    if (t % SEASON_TICKS === 0 && plantEaters >= IMMIGRATION.reinforceAt) { // (the creature cap limits births, not the god's packs)
      this.log(`The herds have grown too many. The god sends another pack.`);
      // Reinforce the hunters that are out there now (the most numerous), else the next in line.
      const out = {};
      for (const c of this.creatures) if (pack(c)) out[c.species] = (out[c.species] ?? 0) + 1;
      const strongest = Object.entries(out).sort((a, b) => b[1] - a[1])[0]?.[0];
      return this.reintroduce(true, strongest ?? this.lastReleasedHunter(), IMMIGRATION.hunters);
    }
    // Hunters: as soon as the plant-eaters number 150, a batch of the most recently written hunters comes back,
    // even while the god is still writing their next generation (which is released the moment it is ready).
    // Any flesh-bodied kind alive (hunting or living off carrion) holds the hunters back; only the seed scavengers do not.
    const meatEaters = fleshEaters + this.creatures.filter(c => !c.dead && c.gut >= 0.5 && this.dietOf(c) === 'carrion' && !this.registry[c.species].scavenger).length;
    if (!meatEaters && plantEaters >= IMMIGRATION.huntersAt && t - since.fleshGone >= IMMIGRATION.huntersGap) {
      since.fleshGone = t; // whatever happens, not again before huntersGap: a release must never repeat tick after tick
      this.reintroduce(true, this.lastReleasedHunter(), IMMIGRATION.hunters);
    }
  }

  // --- weather and plants ---

  // Global rainfall: a wet/dry cycle every five days, roughened by noise.
  rain() {
    const t = this.tick;
    // The weather of the day, leaning a little wetter or drier with the slow climate.
    return clamp01(0.5 + 0.3 * Math.sin(t / (TICKS_PER_DAY * 5) * Math.PI * 2) + 0.5 * (noise3(t / 3000, 0.5, 3.3) - 0.5) + 0.15 * (this.climate() - 0.5));
  }

  // The slow climate: 0 at the driest, 1 at the wettest, one cycle every climateSeasons seasons.
  climate() {
    return 0.5 + 0.5 * Math.sin(this.tick / (SEASON_TICKS * P.climateSeasons) * Math.PI * 2);
  }

  // Reef grows by grains that wander and stick (branching like coral) and wears away with the climate.
  updateReef() {
    const reef = this.reef, n = GW * GH, at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW);
    let solid = 0;
    for (let i = 0; i < n; i++) if (reef[i] >= P.reefSolid) solid++;
    const room = solid < n * P.reefMax;
    // Mineral gathers where things rot; enough of it sets a grain loose.
    for (let i = 0; i < n; i++) {
      while (this.mineral[i] >= P.reefGrain) {
        this.mineral[i] -= P.reefGrain;
        if (this.grains.length >= P.reefGrains) { this.fertility[i] = Math.min(2, this.fertility[i] + P.reefGrain); continue; }
        const x = i % GW, y = (i / GW) | 0;
        if (room && Math.random() < P.reefSeed) reef[i] = Math.min(1, reef[i] + P.reefBuild * 2); // a new reef starts here
        else this.grains.push({ x, y, steps: 0 });
      }
    }
    // Grains wander a few steps; touching reef, they stick (where the land has room for more).
    this.grains = this.grains.filter(g => {
      for (let s = 0; s < 4; s++) {
        let d = (Math.random() * 4) | 0;
        if (this.reliefRise() && Math.random() < P.grainDownhill) { // grains roll downhill: mineral gathers at the foot of slopes and in valleys
          const e = (dx, dy) => this.elevAt((g.x + dx + 0.5) * CELL, (g.y + dy + 0.5) * CELL), opts = [e(1, 0), e(-1, 0), e(0, 1), e(0, -1)];
          d = opts.indexOf(Math.min(...opts));
        }
        g.x = (g.x + (d === 0) - (d === 1) + GW) % GW; g.y = (g.y + (d === 2) - (d === 3) + GH) % GH; g.steps++;
        if (room && this.reefSticks(g.x, g.y)) { const i = at(g.x, g.y); reef[i] = Math.min(1, reef[i] + P.reefBuild); return false; }
        if (g.steps > P.reefSteps) { const i = at(g.x, g.y); this.fertility[i] = Math.min(2, this.fertility[i] + P.reefGrain); return false; }
      }
      return true;
    });
    // Erosion: wetter eras wear faster; thin tips (one neighbour or none) three times faster. What wears away feeds the soil.
    // Gentle turnover: the climate wears reef mostly in wet eras (dry eras barely touch it), thin parts first.
    const wear = P.reefErode * (0.05 + 0.95 * this.climate() ** 2), S = P.reefSolid;
    for (let i = 0; i < n; i++) {
      const busy = Math.min(1, this.traffic[i] / P.busy);
      this.traffic[i] *= P.trafficFade;
      if (!(reef[i] > 0)) continue;
      const x = i % GW, y = (i / GW) | 0;
      const near = (reef[at(x + 1, y)] > 0.3) + (reef[at(x - 1, y)] > 0.3) + (reef[at(x, y + 1)] > 0.3) + (reef[at(x, y - 1)] > 0.3);
      let loss = wear * (near === 0 ? 3 : near <= 2 ? 1.5 : 1); // the climate: lone specks wear fastest, thin ridges next, thick walls least
      if (reef[i] < S) loss += P.trample * busy;  // feet wear paths through reef that is not yet solid
      if (reef[i] < 0.3) loss += P.dustErode;      // the haze clears
      if (this.reliefRise() && this.tempAt((y + 0.5) * CELL, undefined, (x + 0.5) * CELL) < P.frostAt) loss += P.frostCrack; // frost cracks reef on the heights
      else if (reef[i] >= S) {                     // a cell walled in on all eight sides hollows out
        let walled = true;
        for (let dy = -1; dy <= 1 && walled; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && reef[at(x + dx, y + dy)] < S) { walled = false; break; }
        if (walled) loss += P.hollow;
      }
      const d = Math.min(reef[i], loss);
      reef[i] -= d;
      this.fertility[i] = Math.min(2, this.fertility[i] + d);
    }
  }

  // The thicket's life: beside solid reef, or (rollout.shrubland) spreading from its own patch on suitable soil.
  // Drought and heavy traffic wear it; whatever it loses returns to the soil.
  updateThicket() {
    const th = this.thicket, reef = this.reef, S = P.reefSolid, at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW);
    const shrub = this.rolled('shrubland'), N = shrub ? this.climbNeed() : null;
    for (let i = 0; i < GW * GH; i++) {
      const x = i % GW, y = (i / GW) | 0;
      const edge = reef[i] < S && (reef[at(x + 1, y)] >= S || reef[at(x - 1, y)] >= S || reef[at(x, y + 1)] >= S || reef[at(x, y - 1)] >= S);
      const m = this.moisture[i] ?? 0.5, f = this.fertility[i];
      if (edge && m >= 0.3) {
        const g = P.thicketGrow * (P.thicketMax - th[i]) * (m + f) * (f / (f + (P.soilNeed || 0.1)));
        if (g > 0) { th[i] += g; this.fertility[i] = Math.max(0, f - g * P.thicketUptake); }
      } else if (shrub && !edge && m >= P.shrubWet && f >= P.shrubSoil &&
        reef[i] < S && this.water[i] <= P.treeDeep && this.rockOf(i) !== 4 && N[i] <= 0.5 &&
        !(this.trees[i] >= P.treeMature) && (th[i] > 0 ||
          th[at(x + 1, y)] >= P.shrubSeed || th[at(x - 1, y)] >= P.shrubSeed ||
          th[at(x, y + 1)] >= P.shrubSeed || th[at(x, y - 1)] >= P.shrubSeed)) {
        const g = Math.min(P.shrubMax - th[i], P.shrubGrow * (P.shrubMax - th[i]) * (m + f) * (f / (f + (P.soilNeed || 0.1))));
        if (g > 0) { th[i] += g; this.fertility[i] = Math.max(0, f - g * P.thicketUptake); }
      } else if (edge ? m >= P.thicketHardy : shrub && m >= P.shrubHold) { // (s2085) soil shrubs persist only on moist ground
        // Thorny scrub is drought-hardy: in ordinary dryness it holds on, neither growing nor dying.
      } else if (th[i] > 0) {
        const d = Math.min(th[i], P.thicketDie);
        th[i] -= d; this.fertility[i] = Math.min(2, this.fertility[i] + d * P.thicketUptake);
      }
      const busy = Math.min(1, this.traffic[i] / P.busy);
      if (busy > 0 && th[i] > 0) { const d = Math.min(th[i], P.trample * busy); th[i] -= d; this.fertility[i] = Math.min(2, this.fertility[i] + d * P.thicketUptake); }
    }
  }

  // What hides and slows a body: the thicket, and with rollout.trees also the canopy (the greater of the two, per cell).
  get shelter() { return this._shelter ?? this.thicket; }

  // TREES (rollout.trees; see the TREES block in PHYSICS). One update with the thicket's cadence. Suitability of a kind at a cell
  // (0 … 1): rock, temperature and moisture. Nothing for basement, deep water, crags and cliffs, or solid reef.
  treeSuit(kind, i, T, m, rk) {
    if (kind === 1) { const t2 = this.rolled('trees2'); return rk === 1 || rk === 3 ? clamp01((T - (t2 ? 0.3 : 0.35)) / 0.1) * clamp01((m - (t2 ? 0.3 : 0.4)) / 0.2) : 0; } // (trees2) fruit trees: a wider warm, moist window
    if (kind === 2) return rk === 2 ? clamp01((T - 0.3) / 0.1) * clamp01((0.75 - T) / 0.1) * clamp01((m - 0.2) / 0.2) : 0;
    return rk === 0 || T < 0.4 ? clamp01((T - P.treeFrost) / 0.05) * clamp01((m - 0.05) / 0.1) : 0; // conifers: hard rock, and the cold heights up to the treeline
  }
  treeBarred(i, rk, N = this.climbNeed()) { return rk === 4 || this.water[i] > P.treeDeep || N[i] > 0.5 || this.reef[i] >= P.reefSolid; }
  // A sapling of this kind at cell j if the ground suits it well enough and holds no tree.
  seedTree(j, kind) {
    if (this.trees[j] > 0) return false;
    const rk = this.rolled('geology') ? this.rockOf(j) : 1; if (this.treeBarred(j, rk)) return false;
    if (this.treeSuit(kind, j, this.tempAt(((j / GW | 0) + 0.5) * CELL, undefined, ((j % GW) + 0.5) * CELL), this.moisture[j] ?? 0.5, rk) <= 0.2) return false;
    this.trees[j] = P.treeSeed; this.treeKind[j] = kind; this.treesBorn = (this.treesBorn ?? 0) + 1; return true;
  }
  // How well a body reaches each tree food (0 … 1): fruit by size beyond fruitReach or by climbing (a share has fallen); nuts and cones
  // by the hard mouth (bite), a little from size and gape; cones come easier.
  treeAccess(c, kind) {
    const size = this.bodySize(c);
    if (kind === 1) return P.fruitFall + (1 - P.fruitFall) * (this.rolled('smallfood') ? clamp01((c.climb ?? 0) * (1.4 - 0.4 * size / 5)) : Math.max(clamp01((size - P.fruitReach) / 4), c.climb ?? 0)); // (smallfood) fruit is climbed for, and light bodies climb best
    const a = clamp01(0.9 * (c.bite ?? 0) + 0.08 * clamp01((size - 4) / 6) + 0.12 * (c.gape ?? 0.5));
    return kind === 2 ? a : Math.min(1, 1.5 * a + 0.05);
  }
  // The best tree food at a cell as a body sees it (0 … 1, comparable to a grass patch): store × access × 2.
  treeFood(c, ci) {
    const a = this.fruit[ci] * this.treeAccess(c, 1), b = this.nuts[ci] * this.treeAccess(c, 2), d = this.cones[ci] * this.treeAccess(c, 3);
    return Math.min(1, 2 * Math.max(a, b, d));
  }
  updateTrees() {
    const tr = this.trees, kd = this.treeKind, fr = this.fruit, nu = this.nuts, co = this.cones, th = this.thicket, n = GW * GH, F = this.flow, era = this.tempEra(), N = this.climbNeed();
    const at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW), geo = this.rolled('geology'), insOn = this.rolled('insects');
    const sh = (this._shelter ??= new Float32Array(n)), growK = this.treeFast ?? 1; // treeFast: tests only (growth and seeding × k)
    const Tn = i => this.tempAt(((i / GW | 0) + 0.5) * CELL, era, ((i % GW) + 0.5) * CELL), rockN = i => geo ? this.rockOf(i) : 1;
    const seed = (i, T, m, rk, kinds) => { // a sapling of the best-suited kind in kinds (succession from thicket)
      let best = 0, bs = 0.05;
      for (const k of kinds) { const s = this.treeSuit(k, i, T, m, rk); if (s > bs) { bs = s; best = k; } }
      if (best) { tr[i] = P.treeSeed; kd[i] = best; this.treesBorn = (this.treesBorn ?? 0) + 1; }
    };
    const spread = [];
    for (let i = 0; i < n; i++) {
      const c = tr[i];
      if (c <= 0) {
        fr[i] = nu[i] = co[i] = 0;
        if (th[i] > P.treeFromThicket && Math.random() < P.treeEstab * growK * th[i]) { // succession: thicket turns to saplings
          const rk = rockN(i);
          if (!this.treeBarred(i, rk, N)) seed(i, Tn(i), this.moisture[i] ?? 0.5, rk, [1, 2, 3]);
        }
        sh[i] = th[i]; continue;
      }
      const m = this.moisture[i] ?? 0.5, rk = rockN(i), T = Tn(i), kind = kd[i], f = this.fertility[i];
      const barred = this.treeBarred(i, rk, N), suit = barred ? 0 : this.treeSuit(kind, i, T, m, rk);
      let c2 = c;
      if (suit > 0) { // grows (logistic), drawing a little fertility; leaf litter gives some back
        const vigor = suit * (0.5 + 0.5 * Math.min(1, f)) * Math.min(1, m + 0.2), g = P.treeGrow * growK * vigor * (c + (this.rolled('trees2') ? P.saplingBase : 0.01)) * (1 - c / P.treeMax); // (trees2) a sapling grows at a real rate from the start
        if (g > 0) { c2 += g; this.fertility[i] = Math.max(0, f - g * P.treeUptake); }
        this.fertility[i] = Math.min(2, this.fertility[i] + P.treeLitter * c);
      }
      let dead = 0; // wear: unsuitable ground, drought, frost, the flood
      const L = (this.treeLoss ??= { unsuited: 0, drought: 0, frost: 0, flood: 0 }); // what has taken canopy (diagnostic)
      // (s1898) on its own rock, a tree out of its climate range only stops growing: drought and frost below are its climate deaths
      if (suit === 0 && (barred || !(this.treeSuit(kind, i, 0.5, 0.6, rk) > 0))) { const d = P.treeDie * (barred ? 20 : 4); dead += d; L.unsuited += Math.min(c2, d); }
      if (m < (kind === 3 ? P.treeDrought * 0.6 : P.treeDrought)) { dead += P.treeDie; L.drought += Math.min(c2, P.treeDie); }
      if (T < P.treeFrost) { dead += P.treeDie * 3; L.frost += Math.min(c2, P.treeDie * 3); }
      if (F[i] > P.treeFlood) { const d = P.treeBreak * (F[i] - P.treeFlood); dead += d; L.flood += Math.min(c2, d); }
      dead = Math.min(c2, dead); c2 -= dead; if (dead) this.fertility[i] = Math.min(2, this.fertility[i] + dead * P.treeUptake * 2);
      if (c2 < 0.005) { tr[i] = 0; kd[i] = 0; fr[i] = nu[i] = co[i] = 0; sh[i] = th[i]; continue; }
      tr[i] = c2;
      // seed to a neighbour, from mature trees
      if (c2 >= P.treeMature && Math.random() < P.treeSpread * growK * c2) spread.push(i);
      // foods: ∝ canopy, in the season each kind likes (fruit warm, nuts and cones cool), and spoil
      const warm = clamp01((T - 0.38) / 0.2), cool = clamp01((0.66 - T) / 0.2), mature = c2 >= P.treeMature ? c2 : 0, lose = (a, rot) => { const d = a * rot; this.fertility[i] = Math.min(2, this.fertility[i] + d * P.rotAsh); return a - d; };
      if (kind === 1) {
        let make = P.fruitMake * mature * warm;
        if (insOn && make > 0) { // (insects) pollination: the fruit set follows the insects that visited the flowers
          const pol = P.insPollMin + (1 - P.insPollMin) * (1 - Math.exp(-P.insPollK * Math.min(1, P.insSeen * this.insects[i])));
          this.fruitPot = (this.fruitPot ?? 0) + make; make *= pol; this.fruitMade = (this.fruitMade ?? 0) + make;
        }
        fr[i] = Math.min(P.treeStoreMax, lose(fr[i], P.fruitRot) + make);
      }
      else if (kind === 2) nu[i] = Math.min(P.treeStoreMax, lose(nu[i], P.nutRot) + P.nutMake * mature * cool);
      else co[i] = Math.min(P.treeStoreMax, lose(co[i], P.coneRot) + P.coneMake * mature * cool);
      sh[i] = Math.max(th[i], c2);
    }
    for (const i of spread) { // seeds fall on a neighbour, if it suits that kind
      const x = i % GW, y = (i / GW) | 0, j = at(x + Math.floor(Math.random() * 3) - 1, y + Math.floor(Math.random() * 3) - 1);
      if (tr[j] > 0) continue;
      if (this.seedTree(j, kd[i])) { sh[j] = Math.max(th[j], P.treeSeed); this.treesSpread = (this.treesSpread ?? 0) + 1; }
    }
    this.burn(at);
  }
  // Lightning in the worst drought: dense wood in very dry ground may catch, and fire runs through dry wooded neighbours,
  // a bounded front each update. Burnt canopy goes to ash (fertility); the thicket burns; grass is untouched.
  burn(at) {
    const tr = this.trees, th = this.thicket, sh = this._shelter, m = this.moisture, n = GW * GH, B = (this.burning ??= new Uint8Array(n));
    this.fireCells ??= 0; this.fires ??= 0;
    if (this.fireLive) { let live = 0; for (let i = 0; i < n; i++) if (B[i] > 0) { B[i]--; live++; } this.fireLive = live; } // flames die down
    if (!(P.fireChance > 0)) return;
    const dense = i => { if (tr[i] < P.fireDense) return false; const x = i % GW, y = (i / GW) | 0; let k = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && tr[at(x + dx, y + dy)] >= P.fireDense) k++; return k >= 3; };
    const queue = []; let burnt = 0, burning = 0;
    for (let i = 0; i < n; i++) if (tr[i] >= P.fireDense && m[i] < P.fireDry && Math.random() < P.fireChance * (1 + 4 * (P.fireDry - m[i]) / P.fireDry) * (this.fireK ?? 1) && dense(i)) { queue.push(i); break; } // at most one strike an update
    if (!queue.length) return;
    this.fires++;
    const lit = new Set(queue);
    while (queue.length && burnt < P.fireSpreadMax) {
      const i = queue.shift(); burnt++;
      this.fertility[i] = Math.min(2, this.fertility[i] + P.fireAsh * tr[i] * P.treeUptake * 4 + P.fireAsh * th[i] * P.thicketUptake);
      tr[i] = 0; this.treeKind[i] = 0; this.fruit[i] = this.nuts[i] = this.cones[i] = 0; th[i] = 0; sh[i] = 0; B[i] = P.fireTime; this.fireLive = (this.fireLive ?? 0) + 1;
      const x = i % GW, y = (i / GW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = at(x + dx, y + dy); if (!lit.has(j) && tr[j] >= P.fireWood && m[j] < P.fireDry * 1.5) { lit.add(j); queue.push(j); } }
    }
    this.fireCells += burnt;
    if (burnt >= 12) this.log(`Lightning in the drought: fire burned ${burnt} cells of wood`);
  }

  // Whether a grain at (x, y) sticks. Like maze coral: branches grow at their tips, solid masses rarely thicken,
  // and a branch will not grow toward other reef closer than reefGap cells, so corridors stay open between ridges.
  reefSticks(x, y) {
    const reef = this.reef, at = (a, b) => ((b + GH) % GH) * GW + ((a + GW) % GW), S = P.reefSolid;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let solid = 0, faint = 0, bx = 0, by = 0;
    for (const [dx, dy] of dirs) { const v = reef[at(x + dx, y + dy)]; if (v >= S) { solid++; bx += dx; by += dy; } else if (v > 0.3) faint++; }
    if (!solid && !faint) return false;
    const quiet = 1 - Math.min(1, this.traffic[at(x, y)] / P.busy);
    const chance = (solid === 0 ? P.reefStick : solid === 1 ? P.reefTip : P.reefFill) * (0.1 + (0.9 + P.quietBoost) * quiet);
    if (Math.random() >= chance) return false;
    if (solid === 1) {
      // Growing away from the branch it joins (direction -bx, -by): no other solid reef ahead within the gap.
      const g = P.reefGap;
      for (let dy = -g; dy <= g; dy++) for (let dx = -g; dx <= g; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 2) continue;
        if (-(dx * bx + dy * by) <= 0) continue; // behind or beside the tip: its own branch
        if (reef[at(x + dx, y + dy)] >= S) return false;
      }
    }
    return true;
  }

  // A slender giant brushes lone reef cells near it toward the densest reef close by, so scattered specks gather
  // into compact coral and open water is left behind it. Light work: a small cost in energy for each cell moved.
  gatherReef(c) {
    const reef = this.reef, at = (a, b) => ((b + GH) % GH) * GW + ((a + GW) % GW);
    const cx = Math.floor(c.x / CELL), cy = Math.floor(c.y / CELL), R = P.gatherRadius;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const x = cx + dx, y = cy + dy, i = at(x, y), v = reef[i];
      if (!(v > 0)) continue;
      if (reef[at(x + 1, y)] > 0.3 || reef[at(x - 1, y)] > 0.3 || reef[at(x, y + 1)] > 0.3 || reef[at(x, y - 1)] > 0.3) continue; // not alone
      // Toward the weight of reef around it (within 3 cells), one step.
      let mx = 0, my = 0;
      for (let ey = -3; ey <= 3; ey++) for (let ex = -3; ex <= 3; ex++) { if (!ex && !ey) continue; const w = reef[at(x + ex, y + ey)]; mx += ex * w; my += ey * w; }
      if (!mx && !my) continue; // nothing to gather toward
      const sx = Math.abs(mx) >= Math.abs(my) ? Math.sign(mx) : 0, sy = Math.abs(my) > Math.abs(mx) ? Math.sign(my) : 0, j = at(x + sx, y + sy);
      reef[j] = Math.min(1, reef[j] + v); reef[i] = 0;
      c.energy -= P.gatherCost * v;
    }
  }

  // A whale fall: when a giant dies, its skeleton becomes reef where it lay (a ring for its body, its arms or spine
  // trailing behind along its last heading), paid for out of its carcass; what is left lies four times as long.
  whaleFall(c, corpse) {
    const at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW), cx = c.x / CELL, cy = c.y / CELL;
    const R = Math.max(2, Math.round(this.bodySize(c) / 8)), h = Math.atan2(c.vy, c.vx) || Math.random() * Math.PI * 2;
    const cells = new Set();
    for (let a = 0; a < Math.PI * 2; a += 0.25) cells.add(at(Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R)));
    const arms = this.registry[c.species].shape === 'kraken' ? 6 : 1;
    for (let j = 0; j < arms; j++) {
      const a = h + Math.PI + (arms > 1 ? (j - (arms - 1) / 2) * 0.35 : 0);
      for (let r = R; r <= R * 3; r++) cells.add(at(Math.round(cx + Math.cos(a) * r + Math.sin(r * 0.6 + j) * 0.8), Math.round(cy + Math.sin(a) * r)));
    }
    for (const i of cells) { this.reef[i] = Math.max(this.reef[i], 0.85); corpse.energy = Math.max(0, corpse.energy - P.boneCost); }
    corpse.lasts = 4;
    this.log(`The ${c.species}'s body settles. Its bones become reef where it fell.`);
  }

  // Rage (Luis): seeing plenty of food it cannot reach, a giant heaves the reef ahead of it outward, leaving a clearing ringed
  // by a raised wall. Nothing is destroyed, only moved. It costs a third of its store and it cannot rage again for a day.
  rage(c) {
    const at = (a, b) => ((b + GH) % GH) * GW + ((a + GW) % GW), v = Math.hypot(c.vx, c.vy) || 1, R = P.rageRadius;
    const cx = Math.round(c.x / CELL + (c.vx / v) * R * 0.8), cy = Math.round(c.y / CELL + (c.vy / v) * R * 0.8);
    let moved = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy); if (d > R || (!dx && !dy)) continue;
      const i = at(cx + dx, cy + dy); if (!(this.reef[i] > 0)) continue;
      const j = at(cx + Math.round(dx / d * (R + 1)), cy + Math.round(dy / d * (R + 1)));
      this.reef[j] = Math.min(1, this.reef[j] + this.reef[i]); moved += this.reef[i]; this.reef[i] = 0;
    }
    c.energy -= P.rageCost; c.rageReady = this.tick + P.rageCooldown; c.raged = this.tick; if (c.book) c.book.rages++;
    this.log(`The ${c.species} rages and heaves the reef aside${moved > 3 ? ', opening a clearing ringed by a new wall' : ''}.`);
  }

  // Dormancy (Luis): a giant that can sleep (sp.dormancy) goes dormant when the world holds under dormantBelow of its room,
  // its life paused, and wakes once it holds wakeAt again; waking walled in, it breaks away to open ground.
  // Is this a kraken season? One in every krakenEvery (season index divisible by it).
  krakenSeason(t = this.tick) { return Math.floor(t / SEASON_TICKS) % P.krakenEvery === 0; }
  dormancy() {
    const share = this.creatures.length / (this.maxCreatures ?? MAX_CREATURES), season = this.krakenSeason();
    for (const c of this.creatures) {
      if (c.dead || !this.registry[c.species].dormancy) continue;
      if (!c.dormant && !season) { c.dormant = true; c.shove = false; this.log(`The ${c.species}'s season is over. It sinks into the deep and sleeps; its life is paused until it rises again.`); }
      else if (!c.dormant && share < P.dormantBelow) { c.dormant = true; c.shove = false; this.log(`The world is nearly empty. The ${c.species} sinks into slumber; its life is paused.`); }
      else if (c.dormant && season && share >= P.wakeAt) {
        c.dormant = false;
        const [x, y] = this.openGround(c.x, c.y), moved = Math.hypot(delta(c.x, x, W), delta(c.y, y, H)) > 1;
        if (moved) { c.x = x; c.y = y; }
        this.log(`The ${c.species} rises from the deep for its season${moved ? ', breaking free of the reef' : ''}.`);
      }
    }
  }

  // Waves: a species comes back in P.waves waves of P.waveShare of its seed base, a third of its average life apart,
  // each landing on its own, so its members are of mixed ages and do not all age out (or get hunted out) at once.
  scheduleWaves(name, scavengers = false, hunter = false) {
    const scav = scavengers ? this.speciesNames.find(n => this.registry[n].scavenger && !this.registry[n].parent) : null, n = scav ?? name;
    const sp = this.registry[n]; if (!sp) return;
    const per = Math.max(2, Math.round((sp.seedBase ?? sp.immigrants) * P.waveShare));
    const life = sp.lifespan / ((mass(sp.size) / mass(P.heartSize)) ** -P.heartPower * 0.75);
    (this.waves ??= []);
    for (let k = 0; k < P.waves; k++) this.waves.push({ name: n, count: per, hunter, scavengers, at: this.tick + Math.round(k * life / 3) });
    this.log(`The god will send ${plural(n)} in ${P.waves} waves of ${per}, about ${Math.round(life / 3)} ticks apart.`);
  }

  releaseWaves() {
    if (!this.waves?.length) return;
    this.waves = this.waves.filter(v => {
      if (this.tick < v.at) return true;
      if (IMMIGRATION.paused && !v.steward) return true; // the god's own waves wait while its hand is held; the steward's go
      if (v.scavengers) this.reintroduceScavengers(v.count); else this.reintroduce(v.hunter, v.name, v.count, v.traits, !!v.steward);
      return false;
    });
  }

  // Targeted hunger (Luis; by species again since 01:40 Oct 15): the giant goes for the most numerous species first.
  // preyRank[species] = 0 for the most numerous, 1 for the next, …; it only turns to a lesser species when none of a
  // commoner one is in sight (or in reach).
  rankPrey() {
    const n = {};
    for (const c of this.creatures) if (!c.dead && !this.registry[c.species].unique) n[c.species] = (n[c.species] ?? 0) + 1;
    this.preyRank = Object.fromEntries(Object.keys(n).sort((a, b) => n[b] - n[a]).map((name, i) => [name, i]));
  }

  // What a giant can feed on: every living creature that is not one of the unique giants (whatever it eats itself).
  preyCount() { let n = 0; for (const c of this.creatures) if (!c.dead && !this.registry[c.species].unique && !(this.toxinOf(c) > 0.3)) n++; return n; } // toxic ones are spat out, not food

  // Flystrike: parasite beetles infest grazers that are weak AND crowded; an infestation drains its host, spreads by touch
  // through crowded weak kin, feeds the beetles on it, and clears once the host is well fed again. Small or healthy
  // herds never catch it, so it brakes a plague without ending a line.
  crowded(c) { let n = 0; this.near(c.x, c.y, P.crowdRange * (this.rolled('footprint') ? P.footprint : 1), o => { if (o !== c && !o.dead && o.species === c.species) n++; }); return n >= P.crowdCount; }
  // The beetle's role follows its life: a parasite-line body that lives on plants is a grazer (and a possible host).
  // How well a hunter's jaws suit a prey: 1 at its gape (prey/self size ratio), falling off with distance, never below gapeFloor.
  gapeFit(c, o) { const r = this.bodySize(o) / this.bodySize(c); return Math.max(P.gapeFloor, Math.exp(-(((r - (c.gape ?? 0.5)) / P.gapeWidth) ** 2))); }
  browses(c) { return (c.browse ?? 0) > P.browseMin && this.bodySize(c) >= P.browseSize && !this.registry[c.species].unique; }
  isParasite(c) { return (!!this.registry[c.species].parasite && this.dietOf(c) !== 'plant') || (c.parasitism ?? 0) > P.parasiteMin; } // what it lives on, not its jaws (or, since 13:20, an evolved parasite)
  weakHost(c) { return c.energy < P.infestWeak * this.capOf(c) && !this.registry[c.species].unique && !this.isParasite(c); }
  // Honest dung: take up to `want` from the 3×3 cells around a body, bury part of it, return how much was eaten.
  eatDung(b, want) {
    const D = this.dungMap; if (!D || !(want > 0)) return 0;
    const gx = Math.floor(b.x / CELL), gy = Math.floor(b.y / CELL); let got = 0;
    for (let y = Math.max(0, gy - 1); y <= Math.min(GH - 1, gy + 1) && got < want; y++) for (let x = Math.max(0, gx - 1); x <= Math.min(GW - 1, gx + 1) && got < want; x++) {
      const i = y * GW + x, t = Math.min(D[i], want - got); if (t > 0) { D[i] -= t; got += t; }
    }
    if (got > 0) { const i = cellAt(b.x, b.y); this.fertility[i] = Math.min(2, this.fertility[i] + got * P.dungBury); }
    return got;
  }
  // Honest dung: uneaten dung breaks down into fertility, faster in the warmth (called every 10 ticks).
  rotDung() {
    const D = this.dungMap, climate = this.rolled('climate'); if (!D) return;
    for (let i = 0; i < D.length; i++) if (D[i] > 1e-5) {
      const T = climate ? this.tempAt((Math.floor(i / GW) + 0.5) * CELL, undefined, ((i % GW) + 0.5) * CELL) : 0.5, r = 1 - (1 - P.dungDecay * (0.6 + 0.8 * T)) ** 10, d = D[i] * r;
      D[i] -= d; this.fertility[i] = Math.min(2, this.fertility[i] + d);
    }
  }
  dungGift() { if (!this.rolled('honestdung')) return 1; return Math.max(0, 1 - (this.season + (this.tick % SEASON_TICKS) / SEASON_TICKS - this.rollout.honestdung) / P.honestFade); } // the old free gift: 1 → 0
  infestations() {
    const dt = 10, honest = this.rolled('honestdung'), gift = this.dungGift();
    if (honest) { this.dungMap ??= new Float32Array(GW * GH); this.rotDung(); }
    for (const b of this.creatures) {
      if (b.dead || !this.isParasite(b) || this.isClimbing(b) || this.digestFull(b)) continue;
      const evolved = !this.registry[b.species].parasite, power = evolved ? b.parasitism : 1; // an evolved parasite works as hard as its ability
      this.near(b.x, b.y, this.bodySize(b) + 6, o => {
        if (o.dead || o === b || (evolved && o.species === b.species) || this.digestFull(b)) return; // evolved parasites spare their own kind
        if (o.infest > 0) { const take = Math.min(0.04 * power, o.energy); o.energy -= take;
          if (evolved) this.feed(b, take * 0.5, 2, 'host'); else { b.energy += take * 0.5; const bd = this.diet[b.species]; bd.host = (bd.host ?? 0) + take * 0.5; bd.energy += take * 0.5; } } // feeding on a host
        else if (this.weakHost(o) && Math.random() < P.infestCatch * power * (this.rolled('climate') ? 0.5 + this.tempAt(o.y, undefined, o.x) : 1) && this.crowded(o)) o.infest = 0.5; // flies thrive in the warmth
      });
      if (evolved) continue; // the dung-and-brood life below is the beetles'
      // Dung: droppings lie all around a herd, so a beetle within dungRange of a grazer feeds on them and buries part.
      let dung = false, host = false;
      this.near(b.x, b.y, P.dungRange, o => {
        if (o.dead || this.isParasite(o) || this.registry[o.species].unique) return;
        if (o.infest > 0) host = true; else if (o.gut < 0.5) dung = true;
      });
      // An infested host nearby feeds the brood living on it (twice what dung gives): beetles boom with the infestation.
      const bd = this.diet[b.species];
      if (host) { b.energy += P.dungFeed * 2; bd.host = (bd.host ?? 0) + P.dungFeed * 2; bd.energy += P.dungFeed * 2; }
      else {
        if (honest) { const got = this.eatDung(b, P.dungTake); if (got > 0) { const e = got * P.dungEff; bd.dung = (bd.dung ?? 0) + e; bd.energy += e; b.energy += e; } }
        if (dung && gift > 0) { const e = P.dungFeed * gift; bd.dung = (bd.dung ?? 0) + e; bd.energy += e; b.energy += e; const i = cellAt(b.x, b.y); this.fertility[i] = Math.min(2, this.fertility[i] + e); } // the old free gift (fading, if honest)
      }
    }
    // Evolved decomposers: droppings lie around other grazers; past decompMin a body feeds on them and buries part.
    for (const d of this.creatures) {
      const floor = this.rolled('smooth') ? 0.005 : P.decompMin; // smooth: any ability above a trace feeds a little
      if (d.dead || this.isClimbing(d) || this.digestFull(d) || !((d.decomp ?? 0) > floor) || this.registry[d.species].unique || this.registry[d.species].parasite) continue;
      if (honest) { // eats what lies on the ground around it, and it is gone
        const got = this.eatDung(d, P.dungTake * d.decomp * this.habit(d, 'dung') * (this.rolled('climate') ? 0.6 + 0.8 * this.tempAt(d.y, undefined, d.x) : 1));
        if (got > 0) { this.feed(d, got * P.dungEff, 1, 'dung'); this.dungEaten = (this.dungEaten ?? 0) + got; }
        if (!(gift > 0)) continue;
      }
      let dung = false;
      this.near(d.x, d.y, P.dungRange, o => { if (!o.dead && o !== d && o.species !== d.species && o.gut < 0.5 && !this.registry[o.species].unique) dung = true; });
      // (dung breaks down faster in the warmth)
      if (dung) { const e = gift * P.dungFeed * 2 * d.decomp * (this.rolled('climate') ? 0.6 + 0.8 * this.tempAt(d.y, undefined, d.x) : 1); this.feed(d, e, 1, 'dung'); this.giftEnergy = (this.giftEnergy ?? 0) + e; const i = cellAt(d.x, d.y); this.fertility[i] = Math.min(2, this.fertility[i] + e); }
    }
    // Smooth parasitism: below the threshold a body still feeds a little on infested bodies of other kinds it touches.
    if (this.rolled('smooth')) for (const b of this.creatures) {
      const pw = b.parasitism ?? 0;
      if (b.dead || this.isClimbing(b) || this.digestFull(b) || pw <= 0.005 || this.isParasite(b) || this.registry[b.species].unique || this.registry[b.species].parasite) continue;
      const spread = this.rolled('parasitesmooth');
      this.near(b.x, b.y, this.bodySize(b) + 6, o => {
        if (o.dead || o === b || o.species === b.species || this.digestFull(b)) return;
        if (!(o.infest > 0)) { // smooth parasitism: any ability can infest a weak, crowded host, more likely the stronger it is
          if (spread && this.weakHost(o) && Math.random() < P.infestCatch * P.infestSmooth * pw * (this.rolled('climate') ? 0.5 + this.tempAt(o.y, undefined, o.x) : 1) && this.crowded(o)) o.infest = 0.5;
          return;
        }
        const take = Math.min(0.04 * pw, o.energy); o.energy -= take; this.feed(b, take * 0.5, 2, 'host');
      });
    }
    for (const c of this.creatures) {
      if (c.dead || !(c.infest > 0)) continue;
      c.energy -= P.infestDrain * c.infest * dt;
      if (c.energy > 0.6 * this.capOf(c)) c.infest = Math.max(0, c.infest - P.infestHeal * dt);
      else c.infest = Math.min(1, c.infest + 0.002 * dt);
      const ci = cellAt(c.x, c.y); this.foul[ci] = Math.min(1, this.foul[ci] + P.foulShed * c.infest);
      if (Math.random() < P.infestSpread) this.near(c.x, c.y, this.bodySize(c) * 2 + 4, o => {
        if (o !== c && !o.dead && o.species === c.species && !(o.infest > 0) && this.weakHost(o) && this.crowded(o)) o.infest = 0.3;
      });
      if (c.energy <= 0) this.die(c, 'starved');
    }
    // Fouled ground: the eggs a carrier drops along its way. Any weak grazer crossing it may pick them up, crowded or
    // not, of its kind or not, so a straggler carries the infestation out of its herd. The healthy never catch it.
    for (let i = 0; i < this.foul.length; i++) this.foul[i] *= P.foulFade;
    for (const o of this.creatures) {
      if (o.dead || o.infest > 0) continue;
      const f = this.foul[cellAt(o.x, o.y)];
      if (f > 0.02 && this.weakHost(o) && Math.random() < P.foulCatch * f) o.infest = 0.3;
    }
  }

  // The nearest spot with no solid reef within 3 cells (searching outward), for hatchlings and the stuck.
  openGround(x, y) {
    const at = (a, b) => ((b + GH) % GH) * GW + ((a + GW) % GW), cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let r = 0; r < 40; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      let clear = true;
      for (let ey = -3; ey <= 3 && clear; ey++) for (let ex = -3; ex <= 3; ex++) if (this.reef[at(cx + dx + ex, cy + dy + ey)] >= P.reefSolid) { clear = false; break; }
      if (clear) return [wrap((cx + dx + 0.5) * CELL, W), wrap((cy + dy + 0.5) * CELL, H)];
    }
    return [x, y];
  }

  // Eggs hatch into a young one of their kind, with its parent's genes and code numbers (slightly drifted).
  hatchEggs() {
    this.eggs = this.eggs.filter(e => {
      if (this.tick < e.hatch) return true;
      const sp = this.registry[e.species];
      if (!sp) return false;
      if (sp.extinct !== null) { sp.extinct = null; this.compile(e.species); this.onRevive?.(e.species); } this.touchRegistry();
      const [hx, hy] = this.openGround(e.x, e.y); // the young crawl out of the bones to open water
      const c = this.spawn(e.species, hx, hy, e.gen, e.genes, sp.size, e.gut);
      if (e.k?.length) c.k = e.k;
      if (e.resist !== undefined) c.resist = e.resist;
      if (e.eyes !== undefined) c.eyes = e.eyes;
      if (e.mind) { c.mind = { trap: e.mind.trap, food: e.mind.food }; c.inheritedMind = true; } // it hatches knowing what its parent learned
      c.energy = sp.maxEnergy * 0.8;
      this.creatures.push(c);
      this.lastCounts[e.species] = (this.lastCounts[e.species] ?? 0) + 1;
      this.log(`A young ${e.species} hatches (generation ${e.gen}).`);
      this.onSpecies?.();
      return false;
    });
  }

  // The reef as bytes for the viewer.
  reefMap() {
    return Buffer.from(Uint8Array.from(this.reef, v => Math.round(Math.min(1, v) * 255))).toString('base64');
  }

  // INSECTS (rollout.insects; see the INSECTS block in PHYSICS). A body opens a carcass if it is a decomposer in practice (ability and diet).
  opens(c) {
    if (!((c.decomp ?? 0) > P.openMin) || !this.rolled('insects')) return false;
    const r = c.recent; return !!r && r.ate > 0.3 && ((r.dung ?? 0) + (r.carrion ?? 0)) / r.ate >= P.openDiet;
  }
  // Insects are digested best by a middle gut (a bump around snapGut), which bridges the valley between plant and meat guts.
  insectGut(g, c) { if (this.gutCurves(c)) return (this.rolled('foodvalues') ? P.foodSnapEff : P.snapEff) * this.gutFit(g, 'insect'); return P.snapEff * Math.exp(-(((g - P.snapGut) / P.snapWidth) ** 2)); }
  // A snapping body takes a share of the swarm on its own cell; what the gut does not extract goes on as dung (honest dung).
  eatInsects(c, k) {
    if (this.digestFull(c) || (this.digests(c) && this.isClimbing(c))) return;
    const i = cellAt(c.x, c.y), I = this.insects, d = I[i]; if (!(d > 0.01)) return;
    const take = d * Math.min(1, P.snapBite * Math.max(c.snap ?? 0, P.snapBase) * Math.sqrt(k) * this.habit(c, 'insect')), L = this.insLedger ??= {}; // (snapBase) any mouth takes a few insects
    I[i] -= take; const raw = take * P.insScale, dig = raw * this.insectGut(c.gut, c);
    L.eaten = (L.eaten ?? 0) + raw; L.eatenGot = (L.eatenGot ?? 0) + dig;
    this.feed(c, dig, 2, 'insect'); // insects eat plants (level 2), so their eater sits at ~3
    if (this.rolled('honestdung') && raw > dig) c.dungE = (c.dungE ?? 0) + raw - dig;
  }
  // Bloom and insects, one pass (every insEvery ticks). Every birth is paid by a store that shrinks by the same energy (nectar from the cell's
  // fertility, fruit, dung, carcasses, leaves): insEff of it becomes insects, insSoil returns to the soil, the rest is heat. insLedger keeps the books.
  updateInsects() {
    const n = GW * GH, I = this.insects, B = this.bloom, tr = this.rolled('trees') ? this.trees : null, kd = this.treeKind, D = this.dungMap, fr = this.fruit, pl = this.plants, f = this.fertility, m = this.moisture;
    const k = this.insFast ?? 1, S = P.insScale, E = P.insEff, SO = P.insSoil, L = this.insLedger ??= {}, add = (key, v) => { L[key] = (L[key] ?? 0) + v; };
    if (!this._insT || this.tick - this._insTT >= 300) { // temperature changes slowly: refreshed every 300 ticks
      const T = this._insT ??= new Float32Array(n), era = this.tempEra();
      for (let i = 0; i < n; i++) T[i] = this.tempAt(((i / GW | 0) + 0.5) * CELL, era, ((i % GW) + 0.5) * CELL);
      this._insTT = this.tick;
    }
    const Tc = this._insT, attract = this._insA ??= new Float32Array(n), nxt = this._insN ??= new Float32Array(n);
    let nectar = 0, fruit = 0, dung = 0, leaf = 0, die = 0, lost = 0, heat = 0, toSoil = 0, toIns = 0;
    for (let i = 0; i < n; i++) {
      const T = Tc[i], warm = clamp01((T - 0.25) / 0.25), mi = m[i];
      // bloom: opens in warmth and moisture on mature fruit trees and on wet meadows, then fades
      let target = 0;
      if (tr && kd[i] === 1 && tr[i] >= P.treeMature) target = clamp01(tr[i] / 0.6) * clamp01((T - P.bloomWarm) / 0.1) * clamp01((mi - 0.4) / 0.2);
      else if (pl[i] > 0.5) target = 0.7 * clamp01((pl[i] - 0.5) / 0.4) * clamp01((mi - P.bloomMeadow) / 0.2) * clamp01((T - P.bloomWarm) / 0.1);
      B[i] += (target - B[i]) * (target > B[i] ? P.bloomUp : P.bloomDown);
      if (B[i] < 0.002) B[i] = 0;
      let d = I[i], e = 0;
      if (B[i] > 0.02) { // nectar: a meadow's flowers are paid by its grass, a fruit tree's by the soil it drew on
        if (tr && kd[i] === 1 && tr[i] >= P.treeMature) { const t = Math.min(f[i] * 0.1, P.insNectarTree * k * B[i] * warm); f[i] -= t; e += t; nectar += t; }
        else if (pl[i] > P.roots + 0.05) { const en = Math.min((pl[i] - P.roots) * P.plantEnergy, P.insNectar * k * B[i] * warm); pl[i] -= en / P.plantEnergy; e += en; nectar += en; }
      }
      if (fr[i] > 0.01) { const t = fr[i] * P.insFruit * k * warm; fr[i] -= t; const en = t * P.fruitEnergy * P.plantEnergy; e += en; fruit += en; } // fruit that is going over
      if (D && D[i] > 1e-4) { const t = Math.min(D[i], D[i] * P.insDung * k * (P.insArrive + d) * warm); D[i] -= t; e += t; dung += t; } // dung breaks down faster under insects
      const over = Math.max(0, Math.min(1, d * P.insSeen) - P.insOutbreak) / (1 - P.insOutbreak); // leaves: a little always, more in an outbreak
      if (pl[i] > P.roots + 0.05) { const t = Math.min(pl[i] - P.roots, pl[i] * (P.insLeafBase * warm + P.insGrassChew * over) * k); pl[i] -= t; const en = t * P.plantEnergy; e += en; leaf += en; }
      if (tr && tr[i] > 0.05) { const t = Math.min(tr[i] * 0.5, tr[i] * (P.insLeafBase * warm + P.insCanopyChew * over) * k); tr[i] -= t; const en = t * P.insLeafE; e += en; leaf += en; }
      if (e > 0) { f[i] = Math.min(2, f[i] + e * SO); d += e * E / S; toSoil += e * SO; toIns += e * E; heat += e * (1 - E - SO); }
      if (d > P.insMax) { lost += (d - P.insMax) * S; d = P.insMax; }
      if (d > 0) { // short-lived: they die off (faster in the cold); the dead fall to the soil
        const dec = d * Math.min(1, P.insDecay * (1 + P.insCold * clamp01((0.35 - T) / 0.15))), en = dec * S;
        d -= dec; f[i] = Math.min(2, f[i] + en * P.insDie); die += en; toSoil += en * P.insDie; heat += en * (1 - P.insDie);
        if (d < 1e-5) { die += d * S; heat += d * S * (1 - P.insDie); toSoil += d * S * P.insDie; f[i] = Math.min(2, f[i] + d * S * P.insDie); d = 0; }
      }
      I[i] = d; attract[i] = 0.5 * warm + B[i];
    }
    // carcasses: flies come first; insects take a share of what is left, and the rest of that goes to the soil
    for (const c of this.corpses) {
      if (!(c.energy > 0.01)) continue;
      const i = cellAt(c.x, c.y), warm = clamp01((Tc[i] - 0.25) / 0.25), held = this.tick - (c.opened ?? -1e9) < P.openHold ? P.openRot : 1;
      const t = Math.min(c.energy, c.energy * P.insCarcass * k * (P.insArrive + I[i]) * warm * held, (P.insMax - I[i]) * S / E); if (!(t > 0)) continue; // no more than the swarm can hold
      c.energy -= t; add('carcass', t); f[i] = Math.min(2, f[i] + t * SO); toSoil += t * SO; toIns += t * E; heat += t * (1 - E - SO);
      const room = P.insMax - I[i], g = Math.min(room, t * E / S); I[i] += g; lost += (t * E / S - g) * S;
    }
    // flight: each pass a share of a cell goes to its 4 neighbours (wrapping at the edges), more toward the warmer and flowering ones
    nxt.set(I);
    const share = P.insSpread / 4;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const i = y * GW + x, v = I[i]; if (v < 1e-5) continue;
      const a = attract[i], xl = x === 0 ? GW - 1 : x - 1, xr = x === GW - 1 ? 0 : x + 1, yu = (y === 0 ? GH - 1 : y - 1) * GW, yd = (y === GH - 1 ? 0 : y + 1) * GW;
      const j0 = y * GW + xl, j1 = y * GW + xr, j2 = yu + x, j3 = yd + x;
      const w0 = Math.max(0, 1 + P.insDrift * (attract[j0] - a)), w1 = Math.max(0, 1 + P.insDrift * (attract[j1] - a)), w2 = Math.max(0, 1 + P.insDrift * (attract[j2] - a)), w3 = Math.max(0, 1 + P.insDrift * (attract[j3] - a));
      nxt[i] -= v * share * (w0 + w1 + w2 + w3); nxt[j0] += v * share * w0; nxt[j1] += v * share * w1; nxt[j2] += v * share * w2; nxt[j3] += v * share * w3;
    }
    I.set(nxt);
    add('nectar', nectar); add('fruit', fruit); add('dung', dung); add('leaf', leaf); add('die', die); add('lost', lost); add('heat', heat); add('toSoil', toSoil); add('toIns', toIns);
  }
  // Insects and bloom for the viewer: density 0–255 and bloom 0–255 per cell. Null before rollout.insects.
  updateFish() {
    const n = GW * GH, Wd = this.water, A = this.aqua, f = this.fertility;
    if (!this.fish) { this.fish = new Float32Array(n); for (let i = 0; i < n; i++) if ((Wd?.[i] ?? 0) > 0.08) this.fish[i] = P.fishSeed; this.fishLedger = { seeded: this.fish.reduce((a, x) => a + x, 0) * P.fishScale }; }
    const F = this.fish, nx = this._fishN ??= new Float32Array(n), L = this.fishLedger ??= {}, era = this.tempEra(), at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW);
    nx.fill(0); let grazed = 0, died = 0;
    for (let i = 0; i < n; i++) {
      let d = F[i]; if (!(d > 0)) continue;
      const wet = (Wd?.[i] ?? 0) > P.fishDepth, T = this.tempAt(((i / GW | 0) + 0.5) * CELL, era, ((i % GW) + 0.5) * CELL), frozen = T < P.freezeAt;
      if (wet && !frozen && A) { // graze water plants: paid by them
        const eat = Math.min(A[i] * 0.5, P.fishGraze * d * A[i] * (0.5 + T)), e = eat * P.aquaEnergy * P.plantEnergy;
        A[i] -= eat; d += e * P.fishEff / P.fishScale; f[i] = Math.min(2, f[i] + e * P.fishSoil); grazed += e;
      }
      const loss = d * (!wet ? P.fishDry : frozen ? P.fishDie * 3 : P.fishDie); d -= loss; f[i] = Math.min(2, f[i] + loss * P.fishScale * 0.5); died += loss * P.fishScale;
      if (d > P.fishMax) { f[i] = Math.min(2, f[i] + (d - P.fishMax) * P.fishScale * 0.5); d = P.fishMax; }
      if (!wet) { nx[i] += d; continue; }
      const x = i % GW, y = (i / GW) | 0, nb = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].filter(j => (Wd?.[j] ?? 0) > P.fishDepth);
      let stay = d;
      if (nb.length) { const go = d * P.fishSpread; for (const j of nb) nx[j] += go / nb.length; stay -= go; }
      if (this.flowDir) { const j = at(x + Math.round(this.flowDir[i * 2]), y + Math.round(this.flowDir[i * 2 + 1])); if (j !== i && (Wd?.[j] ?? 0) > P.fishDepth) { const go = stay * P.fishDrift; nx[j] += go; stay -= go; } }
      nx[i] += stay;
    }
    F.set(nx); L.grazed = (L.grazed ?? 0) + grazed; L.died = (L.died ?? 0) + died;
  }
  // A body takes fish from its own cell if it is in the water: wading 0.2 × swim, swim-deep 1 × swim (× habits).
  eatFish(c, k) {
    if (this.digestFull(c) || (this.digests(c) && this.isClimbing(c))) return;
    const w = this.waterAt(c.x, c.y), d = this.fish[w.i]; if (!(d > 0.005) || !(w.d > 0)) return;
    const deep = w.d * P.depthPx / Math.max(1, (c.legs ?? 1) * this.bodySize(c)), acc = (deep > 1 ? 1 : P.fishWade) * (c.swim ?? 0); if (!(acc > 0.01)) return;
    const take = d * Math.min(1, P.fishBite * acc * Math.sqrt(k) * this.habit(c, 'fish')); this.fish[w.i] -= take;
    const raw = take * P.fishScale, dig = raw * (this.gutCurves(c) ? this.gutFit(c.gut, 'fish') : this.carrionDigests(c.gut, c) / P.carrionEfficiency);
    this.feed(c, dig, 3, 'fish'); if (this.rolled('honestdung') && raw > dig) c.dungE = (c.dungE ?? 0) + raw - dig;
    const L = this.fishLedger ??= {}; L.eaten = (L.eaten ?? 0) + raw;
  }
  fishMap() { if (!this.rolled('fish') || !this.fish) return null; return Buffer.from(Uint8Array.from(this.fish, v => Math.round(Math.min(1, v * 4) * 255))).toString('base64'); }
  insectMap() {
    if (!this.rolled('insects')) return null;
    const b = a => Buffer.from(Uint8Array.from(a, v => Math.round(Math.min(1, v) * 255))).toString('base64');
    return { density: b(Float32Array.from(this.insects, v => v * P.insSeen)), bloom: b(this.bloom) };
  }

  // Trees for the viewer: per cell, canopy 0–255, kind 0–3, leaf 0–255 (cover: always full, canopy is the cover), food bits (1 fruit, 2 nuts,
  // 4 cones: a store above 0.05) and the burning timer 0–255. Null before rollout.trees.
  treeMap() {
    if (!this.rolled('trees')) return null;
    const n = GW * GH, b = a => Buffer.from(a).toString('base64'), food = new Uint8Array(n), B = this.burning;
    for (let i = 0; i < n; i++) food[i] = (this.fruit[i] > 0.05 ? 1 : 0) | (this.nuts[i] > 0.05 ? 2 : 0) | (this.cones[i] > 0.05 ? 4 : 0);
    return { canopy: b(Uint8Array.from(this.trees, v => Math.round(Math.min(1, v) * 255))), kind: b(this.treeKind), leaf: b(new Uint8Array(n).fill(255)), food: b(food), burning: b(B ?? new Uint8Array(n)) };
  }

  thicketMap() {
    return Buffer.from(Uint8Array.from(this.thicket, v => Math.round(Math.min(1, v) * 255))).toString('base64');
  }

  // Plants are a cellular automaton: logistic growth, seeding from lush neighbours, drought, rot.
  updatePlants() {
    const tr = this.rolled('trees') ? this.trees : null; // (trees) shade
    const t = this.tick, rain = this.rain(), prev = this.prev, fresh = t % (PLANT_EVERY * 8) === 0 || !this.moistureAt;
    if (fresh) this.moistureAt = t;
    if (P.smother) {
      (this.smothered ??= new Uint8Array(GW * GH)).fill(0);
      for (const k of this.corpses) if (k.energy > P.smother) this.smothered[cellAt(k.x, k.y)] = 1;
    }
    prev.set(this.plants);
    const geo = this.rolled('geology'), climate = this.rolled('climate'), era = this.tempEra(), gv = this.rolled('grassvar'), Hd = this.grassHardy, Sw = this.grassSweet;
    for (let gy = 0; gy < GH; gy++) {
      const Trow = this.tempAt((gy + 0.5) * CELL, era), relief = this.reliefRise() > 0; // the temperature of this row …
      for (let gx = 0; gx < GW; gx++) {
        const i = gy * GW + gx, T = relief ? this.tempAt((gy + 0.5) * CELL, era, (gx + 0.5) * CELL) : Trow; // … or of this cell, on relief
        if (relief && this.rolled('highfood')) { const e = this.elevAt((gx + 0.5) * CELL, (gy + 0.5) * CELL); if (e > P.lichenAbove) this.lichen[i] += P.lichenGrow * (1 - this.lichen[i]) * (T < 0.45 ? 1 : 0.3); else if (this.lichen[i] > 0) this.lichen[i] *= 0.99; } // lichen on the heights, best in the cold
        // Moisture drifts slowly, so its noise is only redrawn about once a second.
        const rk = geo ? this.rockOf(i) : -1, m = fresh ? (this.moisture[i] = Math.max(clamp01(rain + (noise3(gx * 0.05, gy * 0.05, t * 0.0003) - 0.5) * 0.9 + (geo ? P.rockWet[rk] + P.alluvWet * this.alluv[i] : 0)), this.bank?.[i] ?? 0)) : this.moisture[i]; // river banks stay wet; soils hold water by their rock, alluvium most
        let lush = 0;
        const up = (gy === 0 ? GH - 1 : gy - 1) * GW, mid = gy * GW, down = (gy === GH - 1 ? 0 : gy + 1) * GW;
        const left = gx === 0 ? GW - 1 : gx - 1, right = gx === GW - 1 ? 0 : gx + 1;
        lush = (prev[up + left] > 0.4) + (prev[up + gx] > 0.4) + (prev[up + right] > 0.4) + (prev[mid + left] > 0.4) + (prev[mid + right] > 0.4)
          + (prev[down + left] > 0.4) + (prev[down + gx] > 0.4) + (prev[down + right] > 0.4);
        let b = prev[i];
        if (b > 0) {
          const f = this.fertility[i], before = b;
          if (!(P.smother && this.smothered[i])) {
            const warm = climate ? (T < P.frostAt ? 0 : (1 - P.coldGrowth * Math.max(0, 0.5 - T)) * (1 + 0.5 * Math.max(0, T - 0.5))) : 1; // cold slows grass, frost stops it
            const grow = 0.05 * b * (1 - b) * (m + f) * (P.soilNeed ? f / (f + P.soilNeed) : 1) * (1 - P.thicketShade * this.thicket[i]) * (tr ? 1 - P.treeShade * tr[i] : 1) * this.rootHealth[i] * warm * (gv ? 1 - P.hardyGrow * Hd[i] : 1) * (geo ? P.rockGrow[rk] * (1 + P.alluvGrow * this.alluv[i]) : 1); // soils by rock; river plains richest
            b += grow;
            if (P.soilNeed) this.fertility[i] = Math.max(0, f - grow * P.uptake);
          }
          if (m < 0.3) b -= 0.02 * (0.3 - m) * (climate ? 1 + P.heatWither * Math.max(0, T - 0.5) * 2 : 1) // heat withers dry grass faster
            * (gv ? (1 - P.hardyWither * Hd[i]) * (1 + P.sweetWither * Sw[i]) : 1); // hardy grass holds on, sweet grass gives up
          if (this.rootHealth[i] < 0.05) b = 0; // grazed to death: bare ground until seed comes back
          if ((this.water?.[i] ?? 0) > P.drownAt) b = 0; // under deep water grass drowns
          if (lush === 8 && Math.random() < 0.003) b *= 0.3; // crowded meadows rot from inside
          if (b < 0.02) b = 0;
          if (P.soilNeed && b < before) this.fertility[i] = Math.min(2, this.fertility[i] + (before - b) * P.uptake); // withered plants return to the soil
        } else if ((lush && Math.random() < 0.006 * lush * m) || Math.random() < P.seedBank * m * (0.1 + this.fertility[i])) {
          b = 0.05; this.rootHealth[i] = Math.max(this.rootHealth[i], 0.5); // a new sprout has young roots
          if (gv) { // its strain: from one lush neighbour if it spread from them, else the seed bank's (what last grew here)
            if (lush) {
              const near = [up + left, up + gx, up + right, mid + left, mid + right, down + left, down + gx, down + right].filter(j => prev[j] > 0.4);
              const j = near[Math.floor(Math.random() * near.length)]; Hd[i] = Hd[j]; Sw[i] = Sw[j];
            }
            this.mutateGrass(i);
          }
        }
        this.rootHealth[i] = Math.min(1, this.rootHealth[i] + P.rootHeal * m); // rest heals
        if (this.thicket[i] > 0.4 && m >= P.thicketHardy && b < P.thicketRoots) b = P.thicketRoots; // the thicket keeps grass alive through dry spells: a seed bank
        this.plants[i] = this.reef[i] >= P.reefSolid ? 0 : Math.min(1, b); // nothing grows on solid reef
        this.fertility[i] = this.fertility[i] * (1 - P.leach) + (P.soilNeed ? P.weathering * m : 0);
      }
    }
  }

  // Scent spreads to the four neighbouring cells and fades.
  spreadScent(a) {
    const b = this.scentTmp, k = P.scentSpread, f = P.scentFade;
    for (let gy = 0; gy < GH; gy++)
      for (let gx = 0; gx < GW; gx++) {
        const i = gy * GW + gx;
        const around = a[gy * GW + wrap(gx + 1, GW)] + a[gy * GW + wrap(gx - 1, GW)] + a[wrap(gy + 1, GH) * GW + gx] + a[wrap(gy - 1, GH) * GW + gx];
        b[i] = f * ((1 - k) * a[i] + k * around / 4);
      }
    a.set(b);
  }

  // Which way a scent grows stronger, felt from two cells around: {x, y} a unit direction, strength what is here.
  smellOf(a, x, y) {
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL), at = (dx, dy) => a[wrap(gy + dy, GH) * GW + wrap(gx + dx, GW)];
    const sx = at(2, 0) - at(-2, 0) + 0.5 * (at(2, 2) - at(-2, 2) + at(2, -2) - at(-2, -2));
    const sy = at(0, 2) - at(0, -2) + 0.5 * (at(2, 2) - at(2, -2) + at(-2, 2) - at(-2, -2));
    const m = Math.hypot(sx, sy);
    return { x: m ? r2(sx / m) : 0, y: m ? r2(sy / m) : 0, strength: r2(at(0, 0)) };
  }

  // --- creatures ---

  buildBuckets() {
    this.buckets = Array.from({ length: BW * BH }, () => []);
    for (const c of this.creatures) this.buckets[Math.floor(c.y / BUCKET) * BW + Math.floor(c.x / BUCKET)].push(c);
  }

  // Calls fn(other, dx, dy) for every creature within r of (x, y), across the wrapped edges.
  near(x, y, r, fn) {
    for (let by = Math.floor((y - r) / BUCKET); by <= Math.floor((y + r) / BUCKET); by++)
      for (let bx = Math.floor((x - r) / BUCKET); bx <= Math.floor((x + r) / BUCKET); bx++)
        for (const o of this.buckets[wrap(by, BH) * BW + wrap(bx, BW)]) {
          const dx = delta(x, o.x, W), dy = delta(y, o.y, H);
          if (dx * dx + dy * dy <= r * r) fn(o, dx, dy);
        }
  }

  // How far a body sees: its species' perception, scaled by its size against the species' reference, by age (the young
  // see less, the old a little less), by its eyes, and cut short inside dense thicket.
  sight(c) {
    const sp = this.registry[c.species], m = P.maturity * (c.mature ?? 1), life = c.lifespan || 1;
    const size = Math.min(1.4, Math.max(0.7, (this.bodySize(c) / sp.size) ** 0.25));
    const age = c.age < m ? 0.6 + 0.4 * c.age / m : c.age > 0.8 * life ? 1 - 0.2 * Math.min(1, (c.age / life - 0.8) / 0.2) : 1;
    const cover = this.shelter[cellAt(c.x, c.y)] > 0.4 ? P.sightThicket : 1;
    return sp.perception * size * age * (0.5 + (c.eyes ?? P.eyesStart)) * cover;
  }
  // The reef as a body sees it: in 8 directions (east first, turning clockwise on screen), the distance to the first solid
  // cell as a share of its sight (1 = open as far as it can see).
  reefRays(c, r) {
    const rays = [];
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, dx = Math.cos(a), dy = Math.sin(a);
      let d = CELL, hit = 1;
      for (; d <= r; d += CELL) if (this.reef[cellAt(wrap(c.x + dx * d, W), wrap(c.y + dy * d, H))] >= P.reefSolid) { hit = d / r; break; }
      rays.push(r2(hit));
    }
    return rays;
  }

  // The map an egg inherits: each cell blended with its neighbours, and weakened to mindKeep.
  blurMind(mind) {
    const out = { trap: [], food: [], inherited: true }, W2 = P.mindW, H2 = P.mindH;
    for (const key of ['trap', 'food'])
      for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
        let sum = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const w = dx || dy ? 0.5 : 1; sum += w * mind[key][((y + dy + H2) % H2) * W2 + (x + dx + W2) % W2]; n += w; }
        out[key].push(r2(sum / n * P.mindKeep));
      }
    return out;
  }
  // The kraken's mind: learn where it gets stuck and where it eats (every 10 ticks), and keep its life's measures.
  mindCell(x, y) { return Math.floor(wrap(y, H) / H * P.mindH) * P.mindW + Math.floor(wrap(x, W) / W * P.mindW); }
  learn(c) {
    const n = P.mindW * P.mindH;
    c.mind ??= { trap: new Array(n).fill(0), food: new Array(n).fill(0) };
    c.book ??= { ticks: 0, stuck: 0, meals: 0, rages: 0, dist: 0 };
    const { trap, food } = c.mind, i = this.mindCell(c.x, c.y), stuck = (c.bumps ?? 0) > 2;
    for (let j = 0; j < n; j++) { trap[j] *= P.mindForget; food[j] *= P.mindForget; }
    if (stuck) trap[i] += P.mindTrap * (1 - trap[i]);
    for (let m = 0; m < (c.mealsNew ?? 0); m++) food[i] += P.mindFeed * (1 - food[i]);
    c.book.ticks += 10; if (stuck) c.book.stuck += 10; c.book.meals += c.mealsNew ?? 0; c.book.dist += Math.hypot(c.vx, c.vy) * 10;
    c.mealsNew = 0;
  }
  // Where its map pulls it: toward remembered feeding grounds, away from remembered traps, one and two cells out.
  mindPull(c) {
    if (!c.mind) return [0, 0];
    const cw = W / P.mindW, ch = H / P.mindH; let px = 0, py = 0;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, dx = Math.cos(a), dy = Math.sin(a);
      for (const step of [1, 2]) {
        const j = this.mindCell(c.x + dx * cw * step, c.y + dy * ch * step), v = (c.mind.food[j] - 1.5 * c.mind.trap[j]) / step;
        px += dx * v; py += dy * v;
      }
    }
    return [px, py];
  }

  hasJaws(c) { return c.gut > (this.rolled('valley') && !this.registry[c.species].unique ? P.valleyJaws : P.jaws); }
  // How much of a kill's energy a gut keeps: gut ** fleshPower, flatter with the valley switch.
  // A sprouting grass cell's strain drifts a little (hardiness and sweetness, kept within 0…1).
  mutateGrass(i) { const w = () => (Math.random() - 0.5) * 2 * P.grassMut; this.grassHardy[i] = clamp01(this.grassHardy[i] + w()); this.grassSweet[i] = clamp01(this.grassSweet[i] + w()); }
  fleshEff(c) { if (!this.rolled('pyramid') || this.registry[c.species].unique) return P.fleshEfficiency;
    return this.rolled('meatspec') ? P.pyramidFlesh + (P.fleshEfficiency - P.pyramidFlesh) * clamp01(((c.gut ?? 0) - 0.5) / 0.4) : P.pyramidFlesh; } // a meat gut keeps more of a kill
  fleshGut(c) { if (this.gutCurves(c)) return this.gutFit(c.gut, 'flesh'); return c.gut ** (this.rolled('valley') && !this.registry[c.species].unique ? P.valleyPower : P.fleshPower); }
  grazes(c) { return c.gut < 1 - P.jaws; }
  // The body as it is now: juveniles are smaller than the adult size their genes promise.
  tissueOn(c) { return this.rolled('tissue') && !this.registry[c.species].unique; }
  tissueSeason() {
    if (!this.rolled('tissue') || this.tissueSeasonAt === this.season) return;
    this.tissueSeasonAt = this.season;
    if (this.creatures.filter(c => !c.dead).length < 160) this.tissueFrozen = true;
    if (!this.tissueFrozen) this.tissueLevel = clamp01((this.season - this.rollout.tissue + 1) / P.tissueRamp);
  }
  tissueRise() { return this.tissueLevel ?? 0; }

  // Residents keep their present size and stores: no free retrospective tissue or shrinking on release.
  // The unpaid deficit is caught up at the same rate as new growth, before further size is earned.
  // ISOLATION (Luis, s2417: "do it directly in the world… so no specimen can leave the area"): a boundary around a box of land that
  // no body crosses, either way: walking, being swept or falling are undone, and young are born on their parents' side. The box is
  // world.isoBox {x0, y0, x1, y1, since}; isoBlocked counts the crossings stopped.
  inIso(x, y) { const b = this.isoBox; if (!b) return false; if (b.rx) { const dx = delta(b.cx, x, W) / b.rx, dy = delta(b.cy, y, H) / b.ry; return dx * dx + dy * dy <= 1; } return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1; } // a box, or (s2428) an oval on the wrapping map
  growTissue(c) {
    const r = this.tissueRise(), oldFrac = P.growTicks ? Math.min(1, 0.4 + 0.6 * c.age / P.growTicks) : 1;
    c.grownFrac ??= oldFrac;
    c.body ??= mass(this.bodySize(c)) * P.bodyEnergy * (c.gen > 0 ? P.bornBody : 1);
    let grown = c.grown ?? 1;
    if (this.rolled('growon') && c.grownFrac >= 1 && c.age > P.growTicks && grown < P.growOnMax && c.energy > P.growOnFed * this.capOf(c)) grown = Math.min(P.growOnMax, grown + P.growOnRate);
    const desired = Math.max(c.grownFrac, oldFrac), target = mass(c.size * desired * grown) * P.bodyEnergy * r;
    const paid = Math.min(Math.max(0, target - c.body), P.tissueRate * r, Math.max(0, c.energy));
    c.energy -= paid; c.body += paid;
    const supported = r > 0 ? Math.sqrt(c.body / (mass(c.size) * P.bodyEnergy * r)) : Infinity;
    c.grownFrac = Math.max(c.grownFrac, Math.min(desired, supported / (c.grown ?? 1)));
    if (c.grownFrac >= 1) c.grown = Math.max(c.grown ?? 1, Math.min(grown, supported));
  }

  // The tissue share is additional to the ordinary gift. An unaffordable child is born smaller.
  birthTissue(kid, parents, remaining = 1) {
    const r = this.tissueRise(), cost = mass(kid.size * (P.growTicks ? 0.4 : 1)) * P.bodyEnergy * P.tissueBirth * r;
    const available = parents.reduce((s, c) => s + Math.max(0, c.energy), 0), paid = Math.min(cost, available / remaining);
    for (const c of parents) c.energy -= available > 0 ? paid * Math.max(0, c.energy) / available : 0;
    kid.body = paid;
    kid.grownFrac = (P.growTicks ? 0.4 : 1) * (cost > 0 ? Math.sqrt(paid / cost) : 1);
  }

  bodySize(c) { if (this.tissueOn(c) && c.grownFrac !== undefined) return c.size * c.grownFrac * (c.grown ?? 1); return (P.growTicks ? c.size * Math.min(1, 0.4 + 0.6 * c.age / P.growTicks) : c.size) * (c.grown ?? 1); } // (× growth after adulthood, growon)
  // The defence a body actually carries: its gene's ceiling × what its food has supplied. Parasite lines (beetles)
  // and unique giants make theirs without help.
  toxinOf(c) { const sp = this.registry[c.species]; return (c.toxin ?? 0) * (sp.parasite || sp.unique ? 1 : c.toxStock ?? 1); }
  armorOf(c) { return (c.armor ?? 0) * (this.registry[c.species].unique ? 1 : c.minStock ?? 1); }
  canOverpower(c, o) {
    if (!this.hasJaws(c)) return false;
    const shield = this.rolled('crush') && !this.registry[c.species].unique ? Math.max(0, 1 - P.crushSize * Math.max(0, this.bodySize(c) / this.bodySize(o) - 1) - P.crushGape * Math.max(0, (c.gape ?? 0.5) - 0.7)) : 1; // a big or wide mouth cracks shells
    let need = this.bodySize(o) * P.overpower * (1 + P.armorGuard * this.armorOf(o) * shield);
    if (this.rolled('weak') && !this.registry[o.species].unique) need *= 1 - this.weakness(o); // a weak body is easier to take
    if (this.rolled('skill') && !this.registry[c.species].unique) need *= 1 - P.skillHelp * this.huntSkill(c); // built to hunt
    const mine = this.bodySize(c);
    if (mine >= need) return true; // strong enough alone: no need to count the pack
    if (this.rolled('pack') && !this.registry[c.species].unique) { // hunting together: kin with jaws close to the prey
      if (mine < need * (1 - P.packHelp * P.packMax)) return false; // even a full pack would not be enough
      let pack = 0;
      const branch = this.rolled('packkin');
      // The jawed bodies around a prey, found once per tick per prey and shared by every hunter that considers it.
      if (this._packTick !== this.tick) { this._packTick = this.tick; this._packNear = new Map(); }
      let around = this._packNear.get(o);
      if (!around) { around = []; this.near(o.x, o.y, P.packRange, k => { if (k !== o && !k.dead && this.hasJaws(k)) around.push(k); }); this._packNear.set(o, around); }
      for (const k of around) if (k !== c && (k.species === c.species || (branch && this.sameBranch(k.species, c.species)))) pack++;
      need *= 1 - P.packHelp * Math.min(P.packMax, pack);
    }
    return this.bodySize(c) >= need;
  }
  // How well a body is built to hunt, 0…1: a wide mouth and long legs (each counts half, from 0.4 up to 1).
  huntSkill(c) { const f = v => Math.min(1, Math.max(0, (v - 0.4) / 0.6)); return 0.5 * f(c.gape ?? 0.5) + 0.5 * f(c.legs ?? 1); }
  // Two kinds of one branch: the same species, one the parent of the other, or sisters from the same parent line.
  sameBranch(a, b) {
    if (a === b) return true;
    const la = this.registry[a]?.lineage, lb = this.registry[b]?.lineage; if (!la || !lb) return false;
    const key = a + '|' + b, memo = (this._branch ??= new Map()); if (memo.has(key)) return memo.get(key); // lineages never change: remember
    const up = l => l.slice(0, Math.max(0, l.lastIndexOf('.')));
    const same = up(la) === up(lb) || up(la) === lb || up(lb) === la; memo.set(key, same); return same;
  }
  // How much smaller a body counts to a hunter because it is weak: starving, old, or infested.
  weakness(o) {
    const cap = this.capOf(o), starving = o.energy < 0.3 * cap ? P.weakStarving * (1 - o.energy / (0.3 * cap)) : 0;
    const old = o.lifespan && o.age > 0.85 * o.lifespan ? P.weakOld : 0, sick = o.infest > 0 ? P.weakInfested : 0;
    return Math.min(P.weakMax, starving + old + sick);
  }
  // Hunger overrides kinship: only a starving creature will eat its own kind.
  wouldEat(c, o) {
    // A creature that was sickened by prey of some colour shuns that colour until the memory fades.
    if (c.aversion?.s > 0.3 && hueApart(shownHue(o), c.aversion.hue) < P.aversionRange) return false;
    const hungry = c.energy < P.cannibalHunger * this.registry[c.species].maxEnergy;
    if (o.species !== c.species && this.rolled('founders') && this.registry[o.species].speciated && this.graceOn(this.registry[o.species]) && this.sameBranch(c.species, o.species)) { this.spStat().spared++; return false; } // (founders) a new kind is never eaten by its own branch through grace, hungry or not
    if (o.species !== c.species && this.rolled('founders') && this.sameBranch(c.species, o.species)) return hungry; // (founders, Luis s2449: close kin are kin) a sister kind of the same branch is eaten only in hunger, like one's own
    if (o.species !== c.species && !hungry && this.rolled('speciate2') && (this.graceOn(this.registry[c.species]) || this.graceOn(this.registry[o.species])) && this.sameBranch(c.species, o.species)) { // (speciate2) no hunting of kin through a new species' first season
      this.spStat().spared++; return false;
    }
    return o.species !== c.species || hungry;
  }

  // What a creature knows. Positions are unwrapped relative to it, so plain subtraction works.
  // Its food is whatever it could actually eat: plants if it grazes, creatures it could overpower if it has jaws.
  sense(c) {
    const world = this, sp = this.registry[c.species], r = this.sight(c);
    const others = [], food = [];
    // Attention is limited: in a crowd a creature notices only its nearest neighbours.
    // Its own kind are always noticed first (up to KIN_ATTENTION), then the nearest of the rest (up to ATTENTION); in a
    // small crowd (ATTENTION or fewer in range) everyone is noticed. Kept as running nearest-k lists, not a full sort.
    const hide2 = P.hideRange ** 2, stealth2 = P.stealth ** 2, thicket2 = (sp.unique ? P.stealth : P.hideRange) ** 2;
    const all = [], kinTop = [], restTop = [], shelter = this.shelter; // shelter: thicket, or with trees the greater of thicket and canopy
    let count = 0;
    const keep = (list, k, e) => {
      if (list.length === k && e.d2 >= list[k - 1].d2) return;
      let i = list.length < k ? list.length : k - 1;
      if (list.length < k) list.push(e);
      while (i > 0 && list[i - 1].d2 > e.d2) { list[i] = list[i - 1]; i--; }
      list[i] = e;
    };
    // (The neighbour scan is written out here rather than through near(): it is the hottest loop in the world.)
    const r2max = r * r, cx = c.x, cy = c.y, HW = W / 2, HH = H / 2;
    for (let by = Math.floor((cy - r) / BUCKET); by <= Math.floor((cy + r) / BUCKET); by++) {
      const row = ((by % BH) + BH) % BH * BW;
      for (let bx = Math.floor((cx - r) / BUCKET); bx <= Math.floor((cx + r) / BUCKET); bx++) {
        for (const o of this.buckets[row + ((bx % BW) + BW) % BW]) {
          let dx = o.x - cx; if (dx > HW) dx -= W; else if (dx < -HW) dx += W;
          let dy = o.y - cy; if (dy > HH) dy -= H; else if (dy < -HH) dy += H;
          const d2 = dx * dx + dy * dy;
          if (d2 > r2max || o === c || o.dead) continue;
          if (d2 > hide2) {
            const ci = cellAt(o.x, o.y);
            if (this.plants[ci] > P.cover) continue; // hidden in tall grass
            if (shelter[ci] > 0.4 && d2 > thicket2 && this.bodySize(o) < P.thicketHide) continue; // hidden in thicket (or under trees) (a giant feels through it within its reach)
          } else if (sp.unique && d2 > thicket2 && shelter[cellAt(o.x, o.y)] > 0.4 && this.bodySize(o) < P.thicketHide) continue;
          if (this.registry[o.species].unique && (o.dormant || d2 > stealth2)) continue; // a giant glides unseen until it is close; asleep in the deep, not at all
          const e = { o, dx, dy, d2 }, kin = o.species === c.species;
          if (++count <= ATTENTION) all.push(e);
          keep(kin ? kinTop : restTop, kin ? KIN_ATTENTION : ATTENTION, e);
        }
      }
    }
    const noticed = count > ATTENTION ? kinTop.concat(restTop) : all;
    for (const { o, dx, dy } of noticed) {
      const seen = {
        x: c.x + dx, y: c.y + dy, vx: o.vx, vy: o.vy, size: r1(this.bodySize(o)), species: o.species, kin: o.species === c.species,
        willing: o.willing, signal: o.signal, energy: r1(o.energy),
      };
      others.push(seen);
      if (this.wouldEat(c, o) && this.canOverpower(c, o) && !(this.registry[c.species].unique && this.toxinOf(o) > (c.resist ?? 0.3))) food.push({ ...seen, plant: false }); // a giant does not chase what it would spit out
    }
    if (P.targetedHunger && this.registry[c.species].unique && this.preyRank) { // targeted hunger: it follows only the commonest kind in sight
      const rank = f => f.plant || f.corpse ? Infinity : this.preyRank[f.species] ?? 99, best = Math.min(...food.map(rank));
      if (best < Infinity) for (let i = food.length - 1; i >= 0; i--) if (!food[i].plant && !food[i].corpse && rank(food[i]) > best) food.splice(i, 1);
    }
    if (this.grazes(c)) {
      const browser = this.browses(c), tOn = this.rolled('trees'), TR = this.trees; // a big body with a browsing gut sees thicket shoots as food; trees bear fruit, nuts and cones
      const patches = [], gx0 = Math.floor(c.x / CELL), gy0 = Math.floor(c.y / CELL), aquaOn = this.rolled('waterfood'), highOn = this.rolled('highfood'), snapW = this.rolled('insects') ? Math.max(c.snap ?? 0, P.snapBase) : 0, INS = this.insects, FISH = this.fish, swimW = FISH ? (c.swim ?? 0) : 0; // (insects) a snapping body sees a swarm as food
      let enough = Infinity; // once ATTENTION patches are found, cells more than 1.5 cells further out cannot be nearer
      for (const [dx, dy, ring] of cellsWithin(Math.ceil(r / CELL) * CELL)) { // whole cells for the cache key (sight varies continuously); exact distance is checked below
        if (ring > enough) break;
        if (patches.length >= ATTENTION && enough === Infinity) enough = ring + 1.5;
        const gx = gx0 + dx, gy = gy0 + dy;
        const ci = (gy < 0 ? gy + GH : gy >= GH ? gy - GH : gy) * GW + (gx < 0 ? gx + GW : gx >= GW ? gx - GW : gx), b = Math.max(this.plants[ci], aquaOn ? this.aqua[ci] * (0.4 + 0.6 * (c.swim ?? 0)) : 0, highOn ? this.lichen[ci] * 0.8 : 0, snapW > 0.03 ? Math.min(1, 2 * snapW * P.insSeen * INS[ci]) : 0, swimW > 0.05 ? Math.min(1, swimW * P.fishSeen * FISH[ci]) : 0); // water plants, lichen, swarms and (s2428) fish are food to see too
        const th = this.thicket[ci], shoots = browser ? (th - P.browseFloor) * (c.browse ?? 0) * 2 : 0;
        if (tOn && TR[ci] > 0.1) { const tf = this.treeFood(c, ci); if (tf > 0.25 && tf >= b && !(this.burning?.[ci] > 0)) { const fx = (gx + 0.5) * CELL, fy = (gy + 0.5) * CELL, d2 = (fx - c.x) ** 2 + (fy - c.y) ** 2; if (d2 <= r * r) patches.push({ fx, fy, b: tf, d2 }); continue; } }
        if (shoots > 0.25 && shoots >= b) { const fx = (gx + 0.5) * CELL, fy = (gy + 0.5) * CELL, d2 = (fx - c.x) ** 2 + (fy - c.y) ** 2; if (d2 <= r * r) patches.push({ fx, fy, b: Math.min(1, shoots), d2 }); continue; }
        if (b < 0.25 || th >= 0.5) continue; // grass guarded by dense thicket is not food: it cannot be reached
        const fx = (gx + 0.5) * CELL, fy = (gy + 0.5) * CELL, d2 = (fx - c.x) ** 2 + (fy - c.y) ** 2;
        if (d2 <= r * r) patches.push({ fx, fy, b, d2 });
      }
      if (patches.length > ATTENTION) { patches.sort((a, b) => a.d2 - b.d2); patches.length = ATTENTION; }
      for (const { fx, fy, b } of patches) food.push({ x: fx, y: fy, vx: 0, vy: 0, size: 0, plant: true, amount: r2(b) });
    }
    if (this.hasJaws(c)) {
      for (const corpse of this.corpses) {
        if (!(corpse.energy > 0.05)) continue;
        const dx = delta(c.x, corpse.x, W), dy = delta(c.y, corpse.y, H);
        if (dx * dx + dy * dy <= r * r) food.push({ x: c.x + dx, y: c.y + dy, vx: 0, vy: 0, size: 0, plant: false, corpse: true, species: corpse.species, amount: r2(corpse.energy) });
      }
    }
    return [
      { x: c.x, y: c.y, vx: c.vx, vy: c.vy, energy: c.energy, age: c.age, hue: c.hue, memory: c.memory,
        size: r1(this.bodySize(c)), gut: r2(c.gut), genes: [...c.genes], fertile: this.fertile(c),
        legs: r2(c.legs), fat: r2(c.fat ?? 0), maxSpeed: r2(this.cruise(c)),
        smell: { prey: this.smellOf(this.scentPrey, c.x, c.y), danger: this.smellOf(this.scentHunt, c.x, c.y) }, bumped: r1(c.bumps ?? 0), stamina: r2(c.wind > 0 ? c.stamina / (c.wind * P.windTicks) : 0) },
      { width: W, height: H, t: this.tick, season: r2((this.tick % SEASON_TICKS) / SEASON_TICKS), food, others, noise: this.noiseFn, get reef() { return world.reefRays(c, r); } }, // reef rays only if a mind asks (none do today: they cost a fifth of sensing) // season: 0 at its start … 1 at its end
    ];
  }

  step() {
    const t = ++this.tick;
    if (this.rolled('tissue')) this.tissueSeason();
    if (t % P.reefEvery === 0) { this.updateThicket(); if (this.rolled('trees')) this.updateTrees(); else this._shelter = null; this.updateReef(); }
    if (t % P.waterEvery === 0 && this.rolled('water')) this.updateWater();
    if (t % P.insEvery === 0 && this.rolled('insects')) this.updateInsects();
    if (t % P.fishEvery === 0 && this.rolled('fish')) this.updateFish();
    if (t % 135 === 0 && this.rollout?.upheaval !== undefined && !this.upheaval?.done) this.upheavalStep();
    if (t % 135 === 0 && this.rollout?.sloppy !== undefined && this.sloppyRise() > 0 && this.sloppyRise() < 1) this.easeSeams();
    if (t % PLANT_EVERY === 0) { this.updatePlants(); this.spreadScent(this.scentPrey); this.spreadScent(this.scentHunt); }
    this.noiseFn = (x, y) => noise3(x * 0.01, y * 0.01, t * 0.005) * 2 - 1;
    this.buildBuckets();

    // Sense → decide, one batch per species, so a hung behavior only freezes its own kind.
    const bySpecies = new Map();
    for (const c of this.creatures) { let g = bySpecies.get(c.species); if (!g) bySpecies.set(c.species, g = []); g.push(c); }
    for (const name of this.living()) {
      // Each creature re-decides every other tick (half the world on each), steering by its last decision between.
      const thinking = (bySpecies.get(name) ?? []).filter(c => !c.broken && (c.id + t) % THINK_EVERY === 0);
      const batches = new Map(); // one batch per mind: the species' own, and each hidden mind it carries
      for (const c of thinking) { const key = this.mindKey(c); let b = batches.get(key); if (!b) batches.set(key, b = []); b.push(c); }
      for (const [key, group] of batches) {
      const inputs = group.map(c => [...this.sense(c), c.k]);
      let forces;
      try {
        forces = this.behaviors[key](inputs);
      } catch {
        this.stats[name].seizures++;
        continue;
      }
      group.forEach((c, k) => {
        const f = forces[k];
        c.memory = inputs[k][0].memory;
        const seen = inputs[k][1];
        c.scarce = seen.food.filter(f => f.plant).length <= P.bareGround && seen.others.filter(o => o.kin).length >= P.crowd;
        if (!f || f.error) { c.broken = true; this.stats[name].broken++; return; }
        if (f.hue !== undefined) {
          // A behavior may sway its colour, but only around its species' hue, so species stay recognisable.
          const base = this.registry[name].hue, d = wrap(f.hue - base + 180, 360) - 180;
          c.hue = Math.round(wrap(base + Math.max(-HUE_SWAY, Math.min(HUE_SWAY, d)), 360));
        }
        c.willing = f.mate;
        c.eats = f.eat;
        c.sprint = f.sprint;
        c.shove = !!f.shove; // a desperate slender giant may shove even solid reef aside
        // Rage: its own (plenty in sight, yet walled off), or trapped and hungry, whatever it sees (Luis, 00:25 Oct 15).
        const giant = this.registry[name].unique, trapped = giant && (c.bumps ?? 0) > P.rageBumps && c.energy < P.rageHunger;
        if ((f.rage || trapped) && giant && !c.dormant && !(c.rageReady > this.tick) && c.energy > P.rageCost + 0.5) this.rage(c); // never in its sleep
        if (f.give !== undefined) c.give = clamp01(f.give);
        if (f.signal !== undefined) c.signal = r2(clamp01(f.signal));
        c.fx = f.x; c.fy = f.y;
        if (c.mind && this.registry[name].unique) { const [mx, my] = this.mindPull(c); c.fx += mx * P.mindPull; c.fy += my * P.mindPull; } // the kraken's map turns it
        if (!this.rolled('homerange') && this.rolled('home') && !this.registry[name].unique) { // rollout 4: a home range, so local populations can form
          c.home ??= { x: c.x, y: c.y };
          const hx = delta(c.x, c.home.x, W), hy = delta(c.y, c.home.y, H), away = Math.hypot(hx, hy);
          if (away > P.homeRange) { const pull = P.oldHomePull * Math.min(1.5, (away - P.homeRange) / P.homeRange); c.fx += hx / away * pull; c.fy += hy / away * pull; }
        }
        if (c.wall && this.tick < c.wall.until) { const d = c.fx * c.wall.x + c.fy * c.wall.y; if (d > 0) { c.fx -= d * c.wall.x; c.fy -= d * c.wall.y; } } // a wall it was kept back by: no pressing into it
        this.steer(c, c.fx, c.fy);
        c.thought = t;
      });
      }
    }
    for (const c of this.creatures) if (c.thought !== t && !c.broken && c.fx !== undefined) this.steer(c, c.fx, c.fy);

    // Act: move, pay for it, eat, die or breed. Bigger bodies cost more to run and to move.
    const born = [];
    for (const c of this.creatures) {
      if (c.dead) continue;
      if (this.rolled('habitat') && (c.id + t) % P.habEvery === 0) this.rememberHabitat(c);
      const sp = this.registry[c.species], k = this.scale(c);
      if (c.dormant) { c.vx = 0; c.vy = 0; continue; } // asleep: no movement, no hunger, no ageing
      if (c.bumps > 0) c.bumps *= 0.995;
      // Only bodies heavy enough wear a trail, by their weight: a swarm of small grazers leaves the ground as it was.
      if (this.bodySize(c) >= P.trailSize) this.traffic[cellAt(c.x, c.y)] += mass(this.bodySize(c));
      // Solid reef: a body that would walk into it turns aside instead, left or right, by a random angle.
      // One that keeps bumping strikes off in a new direction altogether, so nothing circles a reef for ever.
      // A big body feels reef sooner: thinner reef stops it, and it feels it at the front of its body, not its middle.
      // A long thin body (girth, like a snake) passes wherever its head fits: only its girth counts against the reef.
      const bulk = sp.girth ?? this.bodySize(c), solidFor = P.reefSolid * Math.min(1, P.reefBig / bulk), reach = Math.max(0, bulk * 0.5 - 4);
      const ahead = (vx, vy) => { const v = Math.hypot(vx, vy) || 1; return this.reef[cellAt(wrap(c.x + vx + vx / v * reach, W), wrap(c.y + vy + vy / v * reach, H))]; };
      // Squeezing through: a slender body may push through reef its full size could not pass, at a cost in energy.
      if (sp.girth) this.gatherReef(c);
      if (sp.girth) {
        const i = cellAt(c.x, c.y), here = this.reef[i], fullFor = P.reefSolid * Math.min(1, P.reefBig / this.bodySize(c));
        if (here >= fullFor) c.energy -= P.reefSqueeze * (sp.squeeze ?? 1) * here; // a soft body squeezes cheaper
        // It pushes reef aside rather than breaking it: what it moves through is shoved to either side of its path,
        // so a road opens where it goes and banks rise along it. Nothing is lost; the reef is only reshaped.
        if (here > 0 && here < solidFor) {
          const moved = Math.min(here, P.reefPush), v = Math.hypot(c.vx, c.vy) || 1, px = -c.vy / v * CELL, py = c.vx / v * CELL;
          this.reef[i] -= moved;
          for (const s of [1, -1]) { const j = cellAt(wrap(c.x + px * s, W), wrap(c.y + py * s, H)); if (j !== i) this.reef[j] = Math.min(1, this.reef[j] + moved / 2); else this.reef[i] += moved / 2; }
        }
      }
      // The way to shove (Luis, 00:40 Oct 15): reef straight ahead, or a little to either side (a cone of ±30°), or
      // toward where it wants to go: sliding along a wall it still pushes into the wall between it and its goal.
      let push = null;
      if (sp.girth && c.shove && this.tick - (c.shoved ?? -1e9) >= P.shoveEvery) {
        const sp0 = Math.max(0.5, Math.hypot(c.vx, c.vy)), h = Math.atan2(c.vy, c.vx), goal = Math.hypot(c.fx ?? 0, c.fy ?? 0) > 0.01 ? Math.atan2(c.fy, c.fx) : h;
        for (const a of [h, h + Math.PI / 6, h - Math.PI / 6, goal]) { const dx = Math.cos(a) * sp0, dy = Math.sin(a) * sp0; if (ahead(dx, dy) >= solidFor) { push = [dx, dy]; break; } }
      }
      if (push) {
        c.shoved = this.tick; // a shove is a heave, not a grind: at most once every shoveEvery ticks
        // Desperate: it shoves the reef in its way to either side of its path, at a cost in energy, and goes on.
        const [qx, qy] = push, v = Math.hypot(qx, qy) || 1, nx = wrap(c.x + qx + qx / v * reach, W), ny = wrap(c.y + qy + qy / v * reach, H);
        const j = cellAt(nx, ny), d = this.reef[j], px = -qy / v * CELL, py = qx / v * CELL;
        c.energy -= P.reefShove * d;
        this.reef[j] = 0;
        for (const s of [1, -1]) { const k = cellAt(wrap(nx + px * s, W), wrap(ny + py * s, H)); this.reef[k] = Math.min(1, this.reef[k] + d / 2); }
      } else if (ahead(c.vx, c.vy) >= solidFor && this.reef[cellAt(c.x, c.y)] < solidFor) {
        c.bumps = (c.bumps ?? 0) + 1;
        const speed = Math.hypot(c.vx, c.vy), heading = Math.atan2(c.vy, c.vx), open = a => ahead(Math.cos(a) * speed, Math.sin(a) * speed) < solidFor;
        let a;
        if (c.bumps > P.reefRestless) { a = heading + Math.PI * (0.5 + Math.random()); c.bumps = 0; } // restless: strike off somewhere new
        else {
          // Slide along the wall, like water round a rock: the smallest turn either way that finds open ground.
          const side = Math.random() < 0.5 ? 1 : -1;
          a = heading + side * Math.PI / 2;
          for (const turn of [Math.PI / 6, Math.PI / 3, Math.PI / 2, (2 * Math.PI) / 3]) {
            if (open(heading + side * turn)) { a = heading + side * turn; break; }
            if (open(heading - side * turn)) { a = heading - side * turn; break; }
          }
        }
        c.vx = Math.cos(a) * speed * 0.9; c.vy = Math.sin(a) * speed * 0.9;
        if (!open(a)) { c.vx = 0; c.vy = 0; }
      }
      const isoX = c.x, isoY = c.y; // (isolation) where it stood before moving, falling or being swept
      if (this.rolled('sections') && !this.registry[c.species].unique) this.crossGate(c); // crags, cliffs and deep water ask for skill
      const climbing = this.isClimbing(c);
      if (climbing) { this.climbTicks = (this.climbTicks ?? 0) + 1; c.energy -= P.climbHold * mass(this.bodySize(c)) / mass(7); }
      const z0 = this.reliefRise() ? this.elevAt(c.x, c.y) : 0;
      c.x = wrap(c.x + c.vx, W);
      c.y = wrap(c.y + c.vy, H);
      if (z0 || this.reliefRise()) { const climb = this.elevAt(c.x, c.y) - z0; // climbing costs: heavier, fatter and short-legged bodies pay more
        if (this.rolled('wading') && !this.registry[c.species].unique) { // water deeper than the legs are long slows, tires and sweeps
          const w = this.waterAt(c.x, c.y);
          if (w.d > 0) {
            const size = this.bodySize(c), deep = w.d * P.depthPx / Math.max(1, (c.legs ?? 1) * size), swim = c.swim ?? 0;
            c.energy -= P.wadeCost * Math.min(1.5, deep) * (mass(size) / mass(7)) * (1 + P.fatDrag * (c.fat ?? 0) / mass(size)) * (1 - 0.7 * swim);
            if (this.rolled('physics')) c.swimming = deep > 1;
            if (deep > 1 && this.flowDir) { const k = P.sweep * (1 - swim) * Math.min(2, 7 / size) * (this.rolled('physics') ? 1 / Math.max(0.5, this.strength(c)) : 1); c.x = wrap(c.x + this.flowDir[w.i * 2] * k, W); c.y = wrap(c.y + this.flowDir[w.i * 2 + 1] * k, H); }
            c.wading = Math.min(1, deep) * (1 - swim);
          } else { c.wading = 0; if (this.rolled('physics')) c.swimming = false; }
        }
        if (climb > 0 && !this.registry[c.species].unique) c.energy -= P.climbCost * climb * (mass(this.bodySize(c)) / mass(7)) * (1 + P.fatDrag * (c.fat ?? 0) / mass(this.bodySize(c))) * (1.3 - 0.5 * (c.legs ?? 1)); }
      if (this.isoBox) { const inside = this.inIso(c.x, c.y); if (c.isoSide === undefined) c.isoSide = inside; else if (inside !== c.isoSide && !this.isoBox.block) { this.isoCrossed = (this.isoCrossed ?? 0) + 1; (inside ? (this.isoIn = (this.isoIn ?? 0) + 1) : (this.isoOut = (this.isoOut ?? 0) + 1)); c.isoSide = inside; } else if (inside !== c.isoSide) { const dx = delta(isoX, c.x, W), dy = delta(isoY, c.y, H), l = Math.hypot(dx, dy) || 1; c.wall = { x: dx / l, y: dy / l, until: this.tick + P.wallMemory }; c.x = isoX; c.y = isoY; c.vx = 0; c.vy = 0; this.isoBlocked = (this.isoBlocked ?? 0) + 1; } } // remembered like any wall, so it steers along or away // (isolation) nobody crosses the boundary
      (c.gut >= 0.5 ? this.scentHunt : this.scentPrey)[cellAt(c.x, c.y)] += P.scent * mass(this.bodySize(c));
      c.pulse = this.heartRate(c);
      if (this.tissueOn(c)) this.growTissue(c);
      c.age += c.pulse; // age is counted in heartbeats
      if (c.digesting > 0) c.digesting--;
      if (this.digests(c)) this.digest(c);
      if (c.cooldown > 0) c.cooldown -= c.pulse;
      if (this.rolled('homerange') && c.homeSeen && !c.homeDispersed && this.fertile(c)) this.disperseHome(c); // maturity can arrive on this heartbeat, before breeding
      const upkeep = Math.max(0.4, 1 + P.legUpkeep * (c.legs - 1) + P.windUpkeep * (c.wind - 0.5)) * (1 + P.fatUpkeep * this.fatLoad(c))
        * (1 + P.armorUpkeep * (c.armor ?? 0) + P.toxinUpkeep * (c.toxin ?? 0) + P.resistUpkeep * (c.resist ?? P.resistStart) + P.eyesUpkeep * ((c.eyes ?? P.eyesStart) - 0.5) + P.decompUpkeep * (c.decomp ?? 0) + P.parasiteUpkeep * (c.parasitism ?? 0) + P.swimUpkeep * (c.swim ?? 0) + P.climbUpkeep * (c.climb ?? 0) + P.biteUpkeep * (c.bite ?? 0) + P.snapUpkeep * (c.snap ?? 0)) * this.climateCost(c) * this.breadthCost(c);
      if (c.aversion) { c.aversion.s *= P.aversionFade; if (c.aversion.s < 0.3) c.aversion = null; }
      const drag = 1 + P.fatDrag * (c.fat ?? 0) / mass(this.bodySize(c));
      if (this.rolled('growon') && !this.tissueOn(c) && !sp.unique && c.age > P.growTicks && (c.grown ?? 1) < P.growOnMax && c.energy > P.growOnFed * this.capOf(c)) c.grown = Math.min(P.growOnMax, (c.grown ?? 1) + P.growOnRate); // a well-fed adult keeps growing
      c.energy -= sp.metabolism * k ** 0.75 * upkeep + sp.moveCost * k * drag * (c.vx * c.vx + c.vy * c.vy);
      if (c.fat > 0 && c.energy < this.capOf(c) * 0.3) { const d = Math.min(c.fat, P.fatBurn); c.fat -= d; c.energy += d * P.fatEfficiency; }
      if (!climbing) this.eat(c, sp, k);
      this.plasticity(c, sp);
      let burnt = false;
      if (this.fireLive && this.burning[cellAt(c.x, c.y)] > 0 && !sp.unique) { c.energy -= P.fireBurn * this.capOf(c) * (c.age < P.maturity * (c.mature ?? 1) ? 2 : 1); burnt = true; } // standing in flames
      if (c.energy <= 0) this.die(c, burnt ? 'burnt' : 'starved');
      else if (c.age > c.lifespan) this.die(c, 'old');
      else if (!climbing && c.willing && !sp.unique && this.fertile(c) && this.room(c.species, this.creatures.length + born.length, c)) this.breed(c, sp, k, born);
      if (climbing && --c.climbing.left <= 0) c.climbing = null;
    }
    this.creatures = this.creatures.filter(c => !c.dead).concat(born);

    const climateOn = this.rolled('climate'), eraNow = climateOn ? this.tempEra() : 0, insOn = this.rolled('insects');
    for (const corpse of this.corpses) {
      let spoil = (climateOn ? 0.5 + P.rotHeat * this.tempAt(corpse.y, eraNow, corpse.x) : 1) * (this.rolled('carcass') ? P.carcassKeep : 1); // the cold keeps the dead, heat spoils them
      if (insOn && this.tick - (corpse.opened ?? -1e9) < P.openHold) spoil *= P.openRot; // (insects) where a decomposer is feeding, the rot slows
      corpse.age += spoil;
      if (t % PLANT_EVERY === 0 && corpse.energy > 0) {
        const rotted = corpse.energy * P.rot * spoil, i = cellAt(corpse.x, corpse.y);
        corpse.energy -= rotted;
        this.fertility[i] = Math.min(2, this.fertility[i] + rotted * P.rotToSoil);
        this.mineral[i] += rotted * P.reefShare;
      }
    }
    // A corpse that lies out its time crumbles into the soil where it lies: nothing leaves the world's nutrient loop.
    this.corpses = this.corpses.filter(corpse => {
      if (corpse.age < CORPSE_TICKS * P.corpseLife * (corpse.lasts ?? 1) && corpse.energy > P.husk) return true;
      // Picked clean (too little left for anyone to eat) or out of time: the last trace goes into the soil.
      if (corpse.energy > 0) { const i = cellAt(corpse.x, corpse.y), e = corpse.energy * (corpse.energy <= P.husk ? 1 : P.crumble); this.fertility[i] = Math.min(2, this.fertility[i] + e * (1 - P.reefCrumble)); this.mineral[i] += e * P.reefCrumble; }
      return false;
    });
    this.census();
    if (this.eggs?.length && t % 30 === 0) this.hatchEggs();
    if (t % 10 === 0) this.infestations();
    if (t % 30 === 0) { this.releaseWaves(); this.dormancy(); this.rankPrey(); this.greatDivide(); }
    if (t % 10 === 0) for (const c of this.creatures) if (!c.dead && !c.dormant && this.registry[c.species].egg) this.learn(c);
    // Scarcity calms the kraken at once (checked daily): few grazers, it feeds only when truly hungry.
    if (t % TICKS_PER_DAY === 0 && this.satiation !== undefined) {
      const g = this.preyCount(), floor = g < 50 ? 0.7 : g < 200 ? 0.8 : 1;
      if (this.satiation > floor) { this.satiation = floor; this.log(`Grazers are scarce (${g}). The kraken grows calm: it feeds below ${Math.round(floor * 100)}% now.`); }
    }
    if (t % TICKS_PER_DAY === 0) { if (this.rolled('speciate2')) this.blendBack(); this.checkSplits(); }
    if (t % SEASON_TICKS === 0) this.endSeason();
  }

  // Big bodies turn slowly.
  // A grazer starving in a crowd on bare ground may start turning toward meat: rarely, one at a time, by chance.
  plasticity(c, sp) {
    c.hunger = c.energy < this.capOf(c) * P.starving ? (c.hunger ?? 0) + 1 : 0;
    c.bornGut ??= c.gut; c.shift ??= 0; c.plastic ??= 0.2;
    if (!c.turning) {
      if (c.bornGut < 0.5 && c.hunger >= P.hungerTicks && c.scarce && Math.random() < c.plastic * P.convertRate) {
        c.turning = true;
        const day = Math.floor(this.tick / TICKS_PER_DAY);
        if (this.turnedDay?.[c.species] !== day) {
          (this.turnedDay ??= {})[c.species] = day;
          this.log(`A starving ${c.species} on bare ground begins to turn: its gut is changing toward meat.`);
        }
      }
    } else if (c.hunger > 0 && c.shift < P.maxShift) {
      const d = Math.min(P.shiftRate, P.maxShift - c.shift);
      c.shift += d;
      c.gut = clamp01(c.gut + d);
    }
  }

  // The gut a creature passes on: the one it was born with, plus part of what its life changed.
  heritableGut(c) {
    return clamp01((c.bornGut ?? c.gut) + P.shiftInherited * (c.shift ?? 0));
  }

  // Beats per tick: mass^-¼, quickened by effort (speed, sprinting) and by the bulk a body carries (legs, wind, fat,
  // armour, toxin: the same things that raise its upkeep).
  heartRate(c) {
    const speed = Math.min(1, Math.hypot(c.vx, c.vy) / (this.cruise(c) || 1));
    const bulk = Math.max(0.4, 1 + P.legUpkeep * ((c.legs ?? 1) - 1) + P.windUpkeep * ((c.wind ?? 0.5) - 0.5))
      * (1 + P.fatUpkeep * this.fatLoad(c)) * (1 + P.armorUpkeep * (c.armor ?? 0) + P.toxinUpkeep * (c.toxin ?? 0) + P.resistUpkeep * (c.resist ?? P.resistStart) + P.eyesUpkeep * ((c.eyes ?? P.eyesStart) - 0.5) + P.decompUpkeep * (c.decomp ?? 0) + P.parasiteUpkeep * (c.parasitism ?? 0) + P.swimUpkeep * (c.swim ?? 0) + P.climbUpkeep * (c.climb ?? 0) + P.biteUpkeep * (c.bite ?? 0) + P.snapUpkeep * (c.snap ?? 0)) * this.climateCost(c);
    return (mass(this.bodySize(c)) / mass(P.heartSize)) ** -P.heartPower * (P.idleHeart + P.runHeart * speed) * (c.sprinting ? P.sprintHeart : 1) * Math.sqrt(bulk);
  }

  // Legs set the cruising speed. A sprint, while the stamina lasts, lifts the limit for a short burst.
  cruise(c) {
    const sp = this.registry[c.species];
    // A body that grows (the leviathan) slows as it grows: speed falls with the square root of its size.
    return sp.maxSpeed * (c.legs ?? 1) * (sp.grows ? Math.sqrt(sp.size / Math.max(sp.size, c.size)) : 1);
  }

  // SKILLS COST (Luis, s2101 "not everyone can be a master of everything"; s2235; rollout.skillcost): keeping many skills costs
  // more than the sum of each: upkeep × (1 + k × S²), S = climb + swim + browse + snap + bite + decomp + parasitism, so a
  // generalist pays more than a specialist. k ramps from 0 to skillCost over skillRamp seasons from the rollout season.
  breadthCost(c) {
    if (!this.rolled('skillcost') || this.registry[c.species].unique) return 1;
    const k = P.skillCost * clamp01((this.season - this.rollout.skillcost + 1) / P.skillRamp);
    const S = (c.climb ?? 0) + (c.swim ?? 0) + (c.browse ?? 0) + (c.snap ?? 0) + (c.bite ?? 0) + (c.decomp ?? 0) + (c.parasitism ?? 0);
    return 1 + k * S * S;
  }
  isClimbing(c) { return this.rolled('physics') && !this.registry[c.species].unique && (c.climbing?.left ?? 0) > 0; }

  strength(c) {
    // Cached only for this heartbeat; hunger and movement during it use the same muscle strength.
    if (c.strengthTick !== this.tick) {
      c.strengthTick = this.tick;
      c.strengthNow = (mass(this.bodySize(c)) / mass(5)) ** (2 / 3) * (0.5 + 0.5 * clamp01(c.energy / (this.capOf(c) * P.weakAt)));
    }
    return c.strengthNow;
  }

  tobler(g) { return Math.max(P.slopeFloor, Math.min(1, Math.exp(-P.toblerRate * Math.abs(g + P.toblerDown)) / Math.exp(-P.toblerRate * P.toblerDown))); }

  canCatch(c, o) { return !this.isClimbing(o) || this.registry[c.species].unique || (c.climb ?? 0) >= (o.climb ?? 0); }

  steer(c, fx, fy) {
    const sp = this.registry[c.species];
    // A starving body is weak: slower, and slow to get its wind back. Fat weighs a body down.
    const weak = P.weakest + (1 - P.weakest) * Math.min(1, c.energy / (this.capOf(c) * P.weakAt));
    const load = this.fatLoad(c), heavy = 1 - P.fatSlows * Math.min(1, load), nimble = Math.max(0.4, 1 - P.fatClumsy * load);
    const physics = this.rolled('physics') && !sp.unique, climbing = this.isClimbing(c);
    c.sprinting = !climbing && !!c.sprint && c.stamina >= 1;
    if (c.sprinting) c.stamina -= 1 + load;
    else c.stamina = Math.min(c.wind * P.windTicks, c.stamina + P.recover * weak * Math.max(0.3, 1 - 0.5 * load));
    const maxForce = sp.maxForce / Math.sqrt(this.scale(c)) * (c.sprinting ? P.sprintForce : 1) * nimble;
    const brush = 1 - P.thicketDrag * this.shelter[cellAt(c.x, c.y)] * Math.min(1, (sp.girth ?? this.bodySize(c)) / P.thicketBig); // thicket slows, big bodies most
    const steep = !physics && this.reliefRise() ? Math.min(1, this.steepAt(c.x, c.y) / P.steepRef) : 0;
    let wade = 1 - P.wadeSlow * (c.wading ?? 0), slope = 1 - P.slopeSlow * steep * Math.min(1, Math.max(0.3, 1.3 - 0.5 * (c.legs ?? 1))); // steep ground slows, long legs less
    if (physics) {
      const step = Math.hypot(c.vx, c.vy);
      const g = step > 0 && this.reliefRise() ? (this.elevAt(c.x + c.vx, c.y + c.vy) - this.elevAt(c.x, c.y)) * P.heightMetres / (step * P.unitMetres) : 0;
      slope = 1 - (1 - this.tobler(g)) * Math.min(1, Math.max(0.3, 1.3 - 0.5 * (c.legs ?? 1)));
      if (c.swimming) wade = Math.min(1, (P.swimBase + P.swimSkill * (c.swim ?? 0)) * Math.sqrt(this.strength(c)));
    }
    const limit = Math.min(P.speedCap, this.cruise(c) * (c.sprinting ? P.sprintBoost : 1) * weak * heavy * (1 - P.armorSlow * this.armorOf(c)) * brush * slope * wade);
    if (climbing) { // Committed to the ascent: neither danger nor home can turn it, and no sprint.
      const speed = Math.hypot(c.vx, c.vy), cap = limit * P.climbSpeed;
      if (speed > cap) { c.vx *= cap / speed; c.vy *= cap / speed; }
      return;
    }
    const m = Math.hypot(fx, fy);
    if (m > maxForce) { fx *= maxForce / m; fy *= maxForce / m; }
    if (this.fireLive) { const away = this.fireAway(c); if (away) { fx += away[0] * P.fireFlee * maxForce; fy += away[1] * P.fireFlee * maxForce; c.fled = (c.fled ?? 0) + 1; } } // flames: run
    if (this.rolled('homerange')) {
      const pull = this.homeForce(c, maxForce), dot = fx * pull[0] + fy * pull[1];
      // Keep danger and fire steering dominant when home lies against the escape direction.
      const share = dot < 0 ? Math.min(1, P.homeOppose * (fx * fx + fy * fy) / -dot) : 1;
      fx += pull[0] * share; fy += pull[1] * share;
    }
    if (this.rolled('calls') && !sp.unique && c.willing) { // (calls) a willing body heads for willing kin it can see
      const pull = this.callForce(c, maxForce), dot = fx * pull[0] + fy * pull[1];
      const share = dot < 0 ? Math.min(1, P.homeOppose * (fx * fx + fy * fy) / -dot) : 1;
      fx += pull[0] * share; fy += pull[1] * share;
    }
    if (this.rolled('follow') && !sp.unique && c.mom != null) { // (follow) the young keep near their mother
      const pull = this.followForce(c, maxForce), dot = fx * pull[0] + fy * pull[1];
      const share = dot < 0 ? Math.min(1, P.homeOppose * (fx * fx + fy * fy) / -dot) : 1;
      fx += pull[0] * share; fy += pull[1] * share;
    }
    if (this.rolled('flock') && !sp.unique) { // (flock) kin seek kin, giving way to danger like the home pull
      const pull = this.flockForce(c, maxForce), dot = fx * pull[0] + fy * pull[1];
      const share = dot < 0 ? Math.min(1, P.homeOppose * (fx * fx + fy * fy) / -dot) : 1;
      fx += pull[0] * share; fy += pull[1] * share;
    }
    c.vx += fx;
    c.vy += fy;
    const s = Math.hypot(c.vx, c.vy);
    if (s > limit) { c.vx *= limit / s; c.vy *= limit / s; }
  }

  homeRadius(c) { return Math.max(P.homeMin, Math.min(P.homeMax, P.homeR * mass(this.bodySize(c)) / mass(5))); }

  disperseHome(c, R = this.homeRadius(c)) {
    c.homeDispersed = true; c.homeFed = 0;
    const N = this.climbNeed();
    for (let k = 0; k < P.homeTries; k++) {
      const a = Math.random() * Math.PI * 2, d = R * (1 + Math.random() * (P.dispersal - 1));
      const x = wrap(c.home.x + Math.cos(a) * d, W), y = wrap(c.home.y + Math.sin(a) * d, H), i = cellAt(x, y);
      if (N[i] < 0.5 && this.reef[i] < P.reefSolid && this.waterAt(x, y).d * P.depthPx <= Math.max(1, (c.legs ?? 1) * this.bodySize(c))) { c.home = { x, y }; break; }
    }
  }

  // FLOCK (Luis, s2425: "make them flock together… groups of 6 or 8, so small species replace themselves"): a body with fewer than
  // flockSize kin within flockNear is pulled toward the centre of the kin it sees within flockRange; the pull fades as the group
  // fills, and is strongest for small species (full under flockRare bodies, flockBase of it for a big one). Cached species counts.
  // How rare a species is (1 under flockRare bodies, fading to flockBase for a common one), cached per tick.
  rarity(c) {
    if (this._flockT !== this.tick) { this._flockT = this.tick; const n = this._flockN = {}; for (const o of this.creatures) if (!o.dead) n[o.species] = (n[o.species] ?? 0) + 1; }
    const count = this._flockN[c.species] ?? 0; return Math.max(P.flockBase, Math.min(1, (P.flockRare * 2 - count) / P.flockRare));
  }
  // CALLS (Luis, s2427, option B): a willing, fertile body senses willing, fertile kin within callRange (song, scent) and steers to
  // the nearest, stronger for small species; off when one is already within mating reach.
  callForce(c, maxForce) {
    if (!this.fertile(c)) return [0, 0];
    let best = null, bd = Infinity;
    const gb = this.graceBoost(c);
    this.near(c.x, c.y, P.callRange * gb.reach, (o, dx, dy) => { if (o === c || o.dead || !o.willing || !this.interbreeds(c.species, o.species) || !this.fertile(o)) return; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [dx, dy]; } });
    if (!best || Math.sqrt(bd) <= P.mateReach) return [0, 0];
    const l = Math.sqrt(bd), k = P.callPull * maxForce * (gb.pull > 1 ? 1 : this.rarity(c)) * gb.pull; return [best[0] / l * k, best[1] / l * k];
  }
  // SAFETY IN NUMBERS (Luis, s2427, option D): each kin within guardRange of a prey cuts a hunter's catch by guardEach, up to guardMax kin.
  groupGuard(o) {
    if (!this.rolled('guard')) return 1;
    let n = 0; this.near(o.x, o.y, P.guardRange, k => { if (k !== o && !k.dead && k.species === o.species) n++; });
    return 1 / (1 + P.guardEach * Math.min(n, P.guardMax));
  }
  followForce(c, maxForce) {
    if (c.age >= P.maturity * (c.mature ?? 1)) { c.mom = null; return [0, 0]; } // grown: on its own
    if (this._byIdT !== this.tick) { this._byIdT = this.tick; this._byId = new Map(); for (const o of this.creatures) if (!o.dead) this._byId.set(o.id, o); }
    const m = this._byId.get(c.mom); if (!m) { c.mom = null; return [0, 0]; } // an orphan fends for itself
    const dx = delta(c.x, m.x, W), dy = delta(c.y, m.y, H), d = Math.hypot(dx, dy);
    if (d <= P.followNear || d > P.followRange) return [0, 0];
    const k = P.followPull * maxForce * Math.min(1, (d - P.followNear) / P.followNear); return [dx / d * k, dy / d * k];
  }
  graceBoost(c) { const r = this.registry[c.species]; return this.rolled('founders') && r.speciated && this.graceOn(r) ? { pull: P.graceFlock, reach: P.graceReach } : { pull: 1, reach: 1 }; } // (founders) a new kind gathers hard through its grace
  flockForce(c, maxForce) {
    if (this._flockT !== this.tick) { this._flockT = this.tick; const n = this._flockN = {}; for (const o of this.creatures) if (!o.dead) n[o.species] = (n[o.species] ?? 0) + 1; }
    const count = this._flockN[c.species] ?? 0, rare = Math.max(P.flockBase, Math.min(1, (P.flockRare * 2 - count) / P.flockRare));
    let close = 0, sx = 0, sy = 0, seen = 0; const gb = this.graceBoost(c);
    this.near(c.x, c.y, P.flockRange * gb.reach, (o, dx, dy) => { if (o === c || o.dead || o.species !== c.species) return; seen++; sx += dx; sy += dy; if (dx * dx + dy * dy < P.flockNear * P.flockNear) close++; });
    if (!seen || close >= P.flockSize) return [0, 0];
    const mx = sx / seen, my = sy / seen, l = Math.hypot(mx, my) || 1, k = P.flockPull * maxForce * (gb.pull > 1 ? 1 : rare) * gb.pull * (1 - close / P.flockSize);
    return [mx / l * k, my / l * k];
  }
  homeForce(c, maxForce) {
    if (!c.homeSeen) {
      c.home ??= { x: c.x, y: c.y };
      // Already mature residents do not all disperse on rollout day.
      c.homeDispersed ??= c.age > Math.max(P.maturity * (c.mature ?? 1) * (this.rolled('climate') ? 1 + P.waterSlow * (c.water ?? P.waterStart) : 1), P.growTicks * 0.75); c.homeSeen = true;
    }
    const R = this.homeRadius(c);
    if (!c.homeDispersed && this.fertile(c)) this.disperseHome(c, R);
    const hx = delta(c.x, c.home.x, W), hy = delta(c.y, c.home.y, H), d = Math.hypot(hx, hy), hungry = c.energy / this.capOf(c) < P.homeHunger;
    c.homeFed = !hungry && d > R ? (c.homeFed ?? 0) + 1 : 0;
    if (c.homeFed >= P.homeShift) { c.home = { x: c.x, y: c.y }; c.homeFed = 0; return [0, 0]; }
    if (d <= P.homeInner * R) return [0, 0];
    const pull = maxForce * P.homePull * (d / R - P.homeInner) / (1 - P.homeInner) * (hungry ? P.homeHungryPull : 1);
    return [hx / d * pull, hy / d * pull];
  }

  // Away from flames: a unit-ish vector (length up to 1, stronger the nearer) from burning cells within fireSmoke cells, or null.
  fireAway(c) {
    const B = this.burning, R = P.fireSmoke, gx0 = Math.floor(c.x / CELL), gy0 = Math.floor(c.y / CELL);
    let sx = 0, sy = 0, near = 99;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const gx = ((gx0 + dx) % GW + GW) % GW, gy = ((gy0 + dy) % GH + GH) % GH;
      if (!(B[gy * GW + gx] > 0)) continue;
      const vx = c.x - (gx0 + dx + 0.5) * CELL, vy = c.y - (gy0 + dy + 0.5) * CELL, d = Math.hypot(vx, vy) / CELL + 0.3;
      if (d > R + 0.5) continue;
      sx += vx / d / d / d; sy += vy / d / d / d; near = Math.min(near, d);
    }
    const l = Math.hypot(sx, sy); if (!l) return null;
    const mag = Math.min(1, 1.5 / near);
    return [sx / l * mag, sy / l * mag];
  }

  // Grazing nibbles the cell underfoot; jaws take the first thing touched that is small enough.
  // Whether to eat at all is the behavior's choice (eat: false). Energy is digested by gut, and much is lost.
  // A filter-feeder swims mouth-open: it takes every small creature in reach (up to P.gulp a tick), keeps the whole
  // meal, needs no time to handle it, and grows on what it cannot store.
  gulp(c, sp) {
    // Satiation follows the herds (this.satiation, adjusted each season): above it, it lets prey pass.
    const full = (sp.unique ? this.satiation * P.krakenAppetite : 0.95) * sp.maxEnergy;
    if (c.energy >= full) return this.growOn(c, sp);
    const me = this.bodySize(c), eaten = [];
    this.near(c.x, c.y, me * (sp.gulpReach ?? 1) + 20, (o, dx, dy) => {
      const reach = (me + this.bodySize(o)) * (sp.gulpReach ?? P.gulpReach) * (this.rolled('footprint') ? P.footprint : 1) + 2;
      if (eaten.length < (sp.gulp ?? P.gulp) && o !== c && !o.dead && !(this.toxinOf(o) > (c.resist ?? 0.3) + P.tolerate) && this.canCatch(c, o) && this.canOverpower(c, o) && this.wouldEat(c, o) && dx * dx + dy * dy <= reach * reach) eaten.push(o);
    });
    if (P.targetedHunger && this.preyRank && eaten.length) { // targeted hunger: of what is in reach, only the commonest kind
      const best = Math.min(...eaten.map(o => this.preyRank[o.species] ?? 99));
      for (let i = eaten.length - 1; i >= 0; i--) if ((this.preyRank[eaten[i].species] ?? 99) > best) eaten.splice(i, 1);
    }
    for (const prey of eaten) {
      if (c.energy >= full) break; // full: the rest slip away
      const meat = Math.max(0, prey.energy) + this.bodyHeld(prey), level = this.registry[prey.species].tl;
      this.die(prey, 'eaten');
      this.stats[c.species].kills++;
      c.mealsNew = (c.mealsNew ?? 0) + 1; // for its map
      // Acquired tolerance: prey a little more toxic than it can handle still goes down, at a price (less of the meal
      // kept, a little sickness), and the liver adapts: resistance creeps up with every such meal (and passes to the egg).
      const over = Math.max(0, this.toxinOf(prey) - (c.resist ?? 0.3));
      this.feed(c, meat * (1 - P.scraps) * this.fleshGut(c) * this.fleshEff(c) * (1 - over), level, 'flesh');
      if (over > 0) { c.energy -= over * P.tolerateHarm; c.resist = Math.min(1, (c.resist ?? 0.3) + over * P.tolerateRate); }
    }
    this.growOn(c, sp);
  }

  // What a filter-feeder does with a full stomach: stay lean, and grow.
  growOn(c, sp) {
    // A lean species (the leviathan) carries little fat (sp.lean: share of its fat capacity): the rest is burned off.
    const leanShare = sp.lean === true ? 0.05 : sp.lean;
    if (leanShare && c.fat > leanShare * this.fatCap(c)) c.fat = leanShare * this.fatCap(c);
    // Growth: well fed, it turns spare energy into body, up to its greatest size.
    if (sp.grows && c.energy > 0.7 * sp.maxEnergy && c.size < sp.maxSize) {
      const spend = Math.min(P.growRate, c.energy - 0.7 * sp.maxEnergy), m = mass(c.size) + spend * P.growEfficiency / P.bodyEnergy;
      c.energy -= spend;
      c.size = Math.min(sp.maxSize, 5 * Math.sqrt(m));
      c.body = (c.body ?? 0) + spend * P.growEfficiency;
    }
  }

  // Share of the 8 neighbouring cells that are solid reef (minerals weathering out of it).
  reefNear(i) {
    const x = i % GW, y = (i - x) / GW; let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) { if (this.reef[((y + dy + GH) % GH) * GW + (x + dx + GW) % GW] >= P.reefSolid) n++; }
    return n / 8;
  }
  eat(c, sp, k) {
    // The stomach empties as it digests; a full one cannot take more (experiment, see P.stomach).
    let full = false;
    if (P.stomach && !sp.unique) { const bite = sp.biteSize * Math.sqrt(k); c.bulk = Math.max(0, (c.bulk ?? 0) - P.stomachEmpty * bite); full = c.bulk >= P.stomachHold * bite; }
    full ||= this.digestFull(c) || (this.digests(c) && this.isClimbing(c));
    // What a grazer carries: dung dropped as it goes (fertility moves to where it rests), seeds that sprout on bare ground.
    if (c.dung > 0.001 || c.seeds > 0.05 || c.dungE > 0.0001) {
      const j = cellAt(c.x, c.y);
      if (c.dung > 0.001) { const d = c.dung * P.dungDrop; c.dung -= d; this.fertility[j] = Math.min(2, this.fertility[j] + d); }
      if (c.dungE > 0.0001) { const d = c.dungE * P.dungDrop; c.dungE -= d; this.dungMap ??= new Float32Array(GW * GH); this.dungMap[j] += d; this.dungDropped = (this.dungDropped ?? 0) + d; } // (honest dung)
      if (c.seeds > 0.05) {
        if (this.plants[j] === 0 && this.reef[j] < P.reefSolid && Math.random() < P.seedDrop * c.seeds * this.moisture[j]) { this.plants[j] = 0.05; this.rootHealth[j] = Math.max(this.rootHealth[j], 0.5);
          if (this.rolled('grassvar') && c.seedH !== undefined) { this.grassHardy[j] = c.seedH; this.grassSweet[j] = c.seedS; this.mutateGrass(j); } } // the seed carries the strain it came from
        c.seeds *= P.seedCarry;
      }
    }
    if (c.tseeds > 0.05) { // fruit seeds in the dung: a sapling where the ground suits it
      if (Math.random() < P.treeSeedDrop * c.tseeds && this.seedTree(cellAt(c.x, c.y), c.tkind)) this.treesDunged = (this.treesDunged ?? 0) + 1;
      c.tseeds *= P.seedCarry;
    }
    c.toxStock = (c.toxStock ?? 1) * (1 - P.storeFade); c.minStock = (c.minStock ?? 1) * (1 - P.storeFade); // defences fade without supply
    if (c.eats !== false && !full) {
      if (this.grazes(c)) {
        const i = cellAt(c.x, c.y), guard = Math.max(0, 1 - this.thicket[i] / 0.5); // grass inside dense thicket is out of reach
        const bite = Math.max(0, Math.min(sp.biteSize * Math.sqrt(k) * (1 - c.gut) * guard, this.plants[i] - P.roots)); // roots survive
        this.plants[i] -= bite;
        const quality = Math.min(P.grassQuality[1], Math.max(P.grassQuality[0], 0.5 + this.moisture[i])); // dry grass is poor food
        const otherWays = Math.max(0.2, 1 - P.decompGrass * (c.decomp ?? 0) - P.parasiteGrass * (c.parasitism ?? 0)); // a gut built for dung or hosts grazes worse
        const strain = this.rolled('grassvar') ? (1 - P.hardyEnergy * this.grassHardy[i]) * (1 + P.sweetEnergy * this.grassSweet[i]) : 1; // tough grass is poorer, sweet grass richer
        const raw = bite * quality * otherWays * strain * (this.grassFood ?? 1) * (this.grassLean ?? 1) * P.plantEnergy, dig = raw * this.grassGut(c.gut, c) * (1 - P.browseCost * (c.browse ?? 0));
        this.feed(c, dig, 1, 'plant'); // a browsing gut grazes worse
        if (this.rolled('honestdung') && raw > dig) c.dungE = (c.dungE ?? 0) + raw - dig; // honest dung: what it ate and did not digest goes on as dung
        if (bite > 0) {
          if (this.plants[i] < P.roots + 0.05) this.rootHealth[i] = Math.max(0, this.rootHealth[i] - P.rootWear * (this.rolled('grassvar') ? 1 + P.sweetRoots * this.grassSweet[i] : 1)); // bitten to the roots (sweet grass's roots are weaker)
          c.dung = (c.dung ?? 0) + bite * P.dungShare; c.seeds = 1; c.seedH = this.grassHardy[i]; c.seedS = this.grassSweet[i]; // it carries the meal on as dung, and seeds
        }
        if (!this.digestFull(c) && this.rolled('waterfood') && this.aqua[i] > 0.02) { const acc = this.aquaAccess(c, i); if (acc > 0) { // water plants, for waders and swimmers
          const b2 = Math.min(this.aqua[i], P.aquaBite * Math.sqrt(k) * acc * (1 - c.gut)); this.aqua[i] -= b2;
          const nf = this.rolled('nichefood'); // (nichefood) water plants are the waders' and swimmers' own: richer, and not grass
          this.feed(c, b2 * (nf ? P.nicheAqua : P.aquaEnergy) * P.plantEnergy * this.grassGut(c.gut, c) * (nf ? 1 : this.grassFood ?? 1), 1, 'plant'); } }
        if (!this.digestFull(c) && this.rolled('highfood') && this.lichen[i] > 0.02) { // lichen on the heights, worth more to a thick coat
          const nf = this.rolled('nichefood'), acc = nf ? clamp01(((c.climb ?? 0) - P.nicheClimb0) / P.nicheClimbSpan) : 1; // (nichefood) lichen is the climbers' own
          const b3 = Math.min(this.lichen[i], P.lichenBite * Math.sqrt(k) * (1 - c.gut) * acc); this.lichen[i] -= b3;
          this.feed(c, b3 * (nf ? P.nicheLichen : P.lichenEnergy) * (0.5 + (c.coat ?? P.coatStart)) * P.plantEnergy * this.grassGut(c.gut, c) * (nf ? 1 : this.grassFood ?? 1), 1, 'plant'); }
        if (this.trees[i] > 0.05 && this.rolled('trees')) this.eatTrees(c, sp, k, i); // fruit, nuts and cones; saplings
        // Defences from food: hedge plants carry toxin, ground by the reef carries minerals for a shell.
        // Toxin: a body in the hedge nibbles its leaves whether or not there is grass to bite.
        if (!this.rolled('carcass2')) c.toxStock = Math.min(1, (c.toxStock ?? 1) + P.toxinGain * this.thicket[i]); // (carcass2) toxin comes only from shoots eaten
        if (bite > 0) c.minStock = Math.min(1, (c.minStock ?? 1) + P.mineralGain * Math.min(1, this.reefNear(i) + this.mineral[i] * 4 + (this.rolled('geology') ? P.rockMineral[this.rockOf(i)] : 0))); // limestone country feeds shells
        // Browse: a big enough body with a browsing gut eats thicket shoots, down to a floor (the hedge survives as a refuge).
        const floor = this.rolled('shrubbrowse') && this.reefNear(i) === 0 ? P.shrubFloor : P.browseFloor; // (s2093) open scrub is browsed lower than the reef's hedge
        if (!this.digestFull(c) && this.browses(c) && this.thicket[i] > floor) {
          const shoots = Math.min(this.thicket[i] - floor, P.browseBite * Math.sqrt(k) * c.browse * this.habit(c, 'browse'));
          this.thicket[i] -= shoots;
          const T = this.tempAt(c.y, undefined, c.x), buds = 1 + P.winterBuds * Math.max(0, 0.5 - T) * 2; // in the cold, the hedge's buds are the food
          const juicy = Math.min(P.shootQuality[1], Math.max(P.shootQuality[0], 1.5 - this.moisture[i])) * buds; // shoots are best when the grass is dry
          this.feed(c, shoots * juicy * P.browseEnergy * this.browseGut(c) * c.browse, 1, 'browse');
          c.toxStock = Math.min(1, (c.toxStock ?? 1) + (this.rolled('carcass2') ? P.toxinShoot * shoots : P.toxinGain * 2 * this.thicket[i]));
        }
      }
      if (Math.max(c.snap ?? 0, P.snapBase) > 0.01 && this.insects) this.eatInsects(c, k);
      if (this.fish && (c.swim ?? 0) > 0.01 && !sp.unique) this.eatFish(c, k); // (fish) a swimmer fishes its own cell // (insects) snap: the swarm on its own cell
      if (sp.filter) this.gulp(c, sp);
      else if (!this.digestFull(c) && this.hasJaws(c) && !(c.digesting > 0)) {
        let prey = null;
        const me = this.bodySize(c);
        this.near(c.x, c.y, me + 8, (o, dx, dy) => {
          const reach = (me + this.bodySize(o)) * 0.6 * (this.rolled('footprint') ? P.footprint : 1) + 2;
          if (!prey && o !== c && !o.dead && dx * dx + dy * dy <= reach * reach && this.canCatch(c, o) && this.wouldEat(c, o) && this.canOverpower(c, o)) { // cheap checks first
            if (Math.random() < this.gapeFit(c, o) * this.groupGuard(o)) prey = o; // (guard) kin around the prey make it harder to take
            else if (this.rolled('lunge')) c.energy -= P.lungeCost; // it slipped away: a failed attack costs
          } // ill-fitting prey often slip away
        });
        if (prey) {
          const preyMass = mass(this.bodySize(prey)), meat = Math.max(0, prey.energy) + this.bodyHeld(prey), level = this.registry[prey.species].tl;
          this.die(prey, 'eaten');
          const carcass = this.corpses.at(-1); // (carcass2) what no diner takes stays on this one
          this.stats[c.species].kills++;
          // Everyone with jaws nearby grabs a share, the killer included; the more crowded, the less each gets.
          const diners = [c];
          this.near(c.x, c.y, P.shareRange, o => { if (o !== c && !o.dead && this.hasJaws(o) && o.eats !== false && !this.isClimbing(o)) diners.push(o); });
          // The killer eats first (killerShare); the rest is shared among everyone at the kill, the killer included.
          const served = meat * (1 - P.scraps), rest = served * (1 - P.killerShare) / diners.length, toxin = this.toxinOf(prey);
          const c2 = this.rolled('carcass2'); let taken = 0;
          for (const d of diners) {
            if (this.digestFull(d)) continue;
            const bite = Math.max(0, toxin - (d.resist ?? 0)); // only toxin beyond the eater's resistance harms it
            let raw = d === c ? served * P.killerShare * this.gapeFit(c, prey) + rest : rest;
            if (c2) { raw = Math.min(raw, P.mealSize * mass(this.bodySize(d)) / mass(7)); taken += raw; } // a diner takes at most a meal
            this.feed(d, raw * this.fleshGut(d) * this.fleshEff(d) * (1 - bite), level, 'flesh'); // the killer gets most from prey its jaws suit
            if (bite > 0.05) {
              d.energy -= bite * P.toxinHarm; const hue = shownHue(prey); d.aversion = { hue, s: 1 };
              // Watching one of its own get sick teaches the others nearby too (a little less strongly).
              this.near(d.x, d.y, P.warnRange, o => { if (o !== d && !o.dead && o.species === d.species && !(o.aversion?.s > 0.8)) o.aversion = { hue, s: 0.8 }; });
            }
          }
          if (c2) { // the rest stays on the carcass, less its toxin like the scraps
            const left = Math.max(0, served - taken); if (carcass) carcass.energy += left * (1 - toxin);
            const L = (this.mealLedger ??= { kills: 0, served: 0, taken: 0, left: 0 }); L.kills++; L.served += served; L.taken += taken; L.left += left;
          }
          c.digesting = Math.round(P.handling * Math.sqrt(preyMass / mass(me)));
        }
      }
      // Carrion does not fight back: a gut barely past grass can already tear at a corpse it touches (a step toward meat).
      const opens = this.opens(c); // (insects) a decomposer with a plant gut can still open a carcass
      if (!this.digestFull(c) && (c.gut > P.carrionGut || opens)) {
        const me = this.bodySize(c), k2 = Math.sqrt(k);
        for (const corpse of this.corpses) {
          if (!(corpse.energy > 0.01)) continue;
          const dx = delta(c.x, corpse.x, W), dy = delta(c.y, corpse.y, H), reach = me * 0.6 + 4;
          if (dx * dx + dy * dy > reach * reach) continue;
          const bite = Math.min(corpse.energy, (this.rolled('carrion') ? P.carrionBite2 : P.carrionBite) * k2 * this.habit(c, 'carrion') * (sp.soilEngineer ? 2 : 1) * (opens ? 1 + P.openBite * (c.decomp ?? 0) : 1)); // beetles break carcasses down fast; openers tear more off
          if (sp.soilEngineer) { const ci = cellAt(corpse.x, corpse.y); this.fertility[ci] = Math.min(2, this.fertility[ci] + bite * P.beetleSoil); }
          corpse.energy -= bite;
          if (opens) { corpse.opened = this.tick; this.carcassOpened = (this.carcassOpened ?? 0) + bite; } // (insects) the carcass is opened; its rot slows while they feed
          if (P.carrionDung) { const i = cellAt(corpse.x, corpse.y); this.fertility[i] = Math.min(2, this.fertility[i] + bite * P.carrionDung); }
          const carrionMult = this.carrionDigests(c.gut, c) * (1 + (c.decomp ?? 0)) * (this.rolled('carcass') ? P.carcassRich : 1), c2 = this.rolled('carcass2');
          if (c2) this.carrionBitten = (this.carrionBitten ?? 0) + bite; // (carcass2) never more than the bite taken
          this.feed(c, bite * (c2 ? Math.min(1, carrionMult) : carrionMult), this.registry[corpse.species]?.tl ?? 2, 'carrion'); // a decomposer's gut gets more from the dead
          break;
        }
      }
    }
    const cap = this.capOf(c);
    if (c.energy > cap) { this.store(c, c.energy - cap); c.energy = cap; }
  }

  // Tree foods under the cell (rollout.trees): each store is bitten by the body's access to it and digested by the plant gut.
  // Fruit seeds ride along (c.tseeds); a browser also nibbles saplings (canopy under treeSapling).
  eatTrees(c, sp, k, i) {
    if (this.digests(c) && this.isClimbing(c)) return;
    const fv = this.rolled('foodvalues'), food = [[this.fruit, 1, 'fruit', fv ? P.foodValue.fruit : P.fruitEnergy], [this.nuts, 2, 'nut', fv ? P.foodValue.nut : P.nutEnergy], [this.cones, 3, 'cone', fv ? P.foodValue.cone : P.coneEnergy]];
    for (const [store, kind, name, e] of food) {
      if (this.digestFull(c)) break;
      if (!(store[i] > 0.01)) continue;
      const acc = this.treeAccess(c, kind); if (acc < 0.02) continue;
      const bite = Math.min(store[i], sp.biteSize * (this.rolled('smallfood') ? 1 : Math.sqrt(k)) * (1 - c.gut) * acc * this.habit(c, 'browse')); // (smallfood) picking is handling-limited, not mass-limited
      if (!(bite > 0)) continue;
      store[i] -= bite;
      const raw = bite * e * P.plantEnergy * (fv ? 1 : this.grassFood ?? 1), dig = raw * this.treeGut(c); // (foodvalues) tree food is not grass: its worth does not fall with the grass's
      this.feed(c, dig, 1, name);
      if (this.rolled('honestdung') && raw > dig) c.dungE = (c.dungE ?? 0) + raw - dig;
      c.dung = (c.dung ?? 0) + bite * P.dungShare;
      if (kind === 1) { c.tseeds = 1; c.tkind = this.treeKind[i]; }
    }
    if (!this.digestFull(c) && this.browses(c) && this.trees[i] < P.treeSapling) { // browsing saplings
      const d = Math.min(this.trees[i], P.treeBrowse * Math.sqrt(k) * c.browse * (this.rolled('trees2') ? Math.max(0, 1 - this.thicket[i] / P.nurseThicket) : 1)); // (trees2) thorny thicket nurses its saplings
      this.trees[i] -= d; this.saplingsBrowsed = (this.saplingsBrowsed ?? 0) + d;
      this.feed(c, d * P.treeBrowseEnergy * this.browseGut(c) * c.browse, 1, 'browse');
    }
  }

  // How much energy a body can hold: bigger bodies hold more (mass^¼, like their slower hearts), so size buys
  // endurance through famine. Relative to a body of capSize, within capRange of the species' store; the unique
  // giants keep their own fixed store.
  capOf(c) {
    const sp = this.registry[c.species];
    if (sp.unique) return sp.maxEnergy;
    return sp.maxEnergy * Math.min(P.capRange[1], Math.max(P.capRange[0], (mass(this.bodySize(c)) / mass(P.capSize)) ** 0.25)) * (1 + P.matureStore * ((c.mature ?? 1) - 1)); // late maturers store more
  }

  store(c, energy) {
    c.fat = Math.min(this.fatCap(c), (c.fat ?? 0) + energy * P.fatEfficiency);
  }

  // The most fat a body will carry (thrifty bodies carry more), and how heavily what it carries weighs on it.
  fatCap(c) { return P.maxFat * (0.5 + (c.thrift ?? 0.5)) * mass(this.bodySize(c)); }
  fatLoad(c) {
    const r = Math.min(1, (c.fat ?? 0) / (P.maxFat * mass(this.bodySize(c))));
    return r + 2 * Math.max(0, r - P.obeseAt);
  }

  // Every meal is booked by its trophic level, so each species' role is measured, not declared.
  carrionDigests(gut, c) {
    if (this.gutCurves(c)) return P.carrionEfficiency * this.gutFit(gut, 'carrion');
    const peak = this.rolled('carrion') ? P.carrionPeak2 : P.carrionPeak; // (3) a gut barely past grass digests the dead well
    return peak ? P.carrionEfficiency * Math.max(0, 1 - Math.abs(gut - peak) / P.carrionWidth) : gut * P.carrionEfficiency;
  }

  digests(c) { return this.rolled('digest') && !this.registry[c.species].unique; }
  digestCap(c) { return P.digCap * mass(this.bodySize(c)); }
  digestFull(c) { return this.digests(c) && (c.gutLoad ?? 0) >= this.digestCap(c); }

  // Each kind retains its own energy, raw load and energy-weighted trophic level.
  // Host/dung use the carrion time and neutral/default bulk, without changing honest dung at the bite.
  digest(c) {
    if (!this.digests(c) || !(c.gutE > 0)) return;
    let energy = 0, load = 0;
    for (const [kind, pool] of Object.entries(c.gutPools ?? {})) {
      const fraction = -Math.expm1(-1 / (P.digTime[kind] ?? P.digTime.carrion));
      const out = pool.energy * fraction;
      this.feedNow(c, out, pool.level, kind);
      pool.energy -= out; pool.load *= 1 - fraction;
      energy += pool.energy; load += pool.load;
    }
    c.gutE = energy; c.gutLoad = load;
  }

  feed(c, energy, foodLevel, kind) {
    if (energy <= 0) return;
    if (!this.digests(c)) return this.feedNow(c, energy, foodLevel, kind);
    // Intake is gated upstream; food already taken (a diner's share) overfills rather than vanishing.
    const eff = kind === 'plant' ? P.plantEnergy * this.grassGut(c.gut, c) : kind === 'browse' ? P.browseEnergy * this.browseGut(c) * (c.browse ?? 0)
      : kind === 'fruit' || kind === 'nut' || kind === 'cone' ? P.plantEnergy * this.treeGut(c)
      : kind === 'flesh' ? this.fleshGut(c) * this.fleshEff(c) : kind === 'carrion' ? this.carrionDigests(c.gut, c) : kind === 'insect' ? this.insectGut(c.gut, c) : 1;
    const load = energy * (P.digBulk[kind] ?? 0.5) / Math.max(0.05, eff);
    const pool = (c.gutPools ??= {})[kind] ??= { energy: 0, load: 0, level: foodLevel };
    pool.level = (pool.level * pool.energy + foodLevel * energy) / (pool.energy + energy);
    pool.energy += energy; pool.load += load;
    c.gutE = (c.gutE ?? 0) + energy; c.gutLoad = (c.gutLoad ?? 0) + load;
  }

  feedNow(c, energy, foodLevel, kind) {
    if (energy <= 0) return;
    const carrion = kind === 'carrion', max = this.capOf(c);
    const richness = Math.max(P.stomach, P.fatRich), thrift = c.thrift ?? 0.5, rich = richness && !this.registry[c.species].unique ? 1 + richness * (((this.rolled('foodvalues') && P.foodRich[kind]) || (P.stomachRich[kind] ?? 1)) - 1) : 1;
    const share = P.fatShare * (0.5 + thrift) * rich;
    if (P.stomach && !this.registry[c.species].unique) { // the stomach fills by the food's raw amount: energy ÷ how well this gut extracts it
      const eff = kind === 'plant' ? P.plantEnergy * this.grassGut(c.gut, c) : kind === 'browse' ? P.browseEnergy * this.browseGut(c) * (c.browse ?? 0)
        : kind === 'fruit' || kind === 'nut' || kind === 'cone' ? P.plantEnergy * this.treeGut(c)
        : kind === 'flesh' ? this.fleshGut(c) * this.fleshEff(c) : kind === 'carrion' ? this.carrionDigests(c.gut, c) : kind === 'insect' ? this.insectGut(c.gut, c) : 1;
      c.bulk = (c.bulk ?? 0) + P.stomach * (P.stomachBulk[kind] ?? 0.5) * energy / Math.max(0.05, eff);
    }
    if (c.energy > max * (P.fatAbove + (0.5 - thrift) * 0.4)) { this.store(c, energy * share); c.energy += energy * (1 - share); }
    else c.energy += energy;
    c.ate = (c.ate ?? 0) + energy;
    if (carrion) c.carrion = (c.carrion ?? 0) + energy;
    const treeFood = kind === 'fruit' || kind === 'nut' || kind === 'cone'; // (trees) browsers' foods
    if (kind === 'plant' || kind === 'browse' || treeFood || kind === 'insect') c.grazed = (c.grazed ?? 0) + energy; // (insects count with plants for dietOf: they are not flesh)
    if (kind === 'browse') c.browsed = (c.browsed ?? 0) + energy;
    // The recent diet: older meals fade (time constant nicheRecent), so it shows how the body lives now.
    const r = c.recent ??= { ate: 0, meat: 0, browse: 0, t: this.tick }, fade = Math.exp(-(this.tick - r.t) / P.nicheRecent);
    r.ate = r.ate * fade + energy; r.meat *= fade; r.browse *= fade; r.carrion = (r.carrion ?? 0) * fade; r.t = this.tick;
    if (kind === 'flesh' || kind === 'carrion' || kind === 'fish') r.meat += energy; else if (kind === 'browse' || treeFood) r.browse += energy;
    if (kind === 'fish' || r.fish) r.fish = (r.fish ?? 0) * fade + (kind === 'fish' ? energy : 0); // (fish) its own share too
    if (kind === 'carrion') r.carrion += energy;
    r.dung = (r.dung ?? 0) * fade + (kind === 'dung' ? energy : 0); r.host = (r.host ?? 0) * fade + (kind === 'host' ? energy : 0);
    if (kind === 'insect' || r.insect) r.insect = (r.insect ?? 0) * fade + (kind === 'insect' ? energy : 0); // (insects) its own share of the recent diet
    r.apex = (r.apex ?? 0) * fade + (kind === 'flesh' && foodLevel >= P.apexPrey ? energy : 0); // meat from other meat-eaters
    const i = cellAt(c.x, c.y);
    this.fertility[i] = Math.min(2, this.fertility[i] + energy * P.dung); // dung: what is digested feeds the soil
    const d = this.diet[c.species];
    d.energy += energy;
    d.levels += energy * foodLevel;
    if (carrion) d.carrion = (d.carrion ?? 0) + energy;
    const food = kind === 'plant' ? 'grass' : kind; // grass, browse, carrion, flesh
    d[food] = (d[food] ?? 0) + energy;
  }

  // Who eats what is measured, not declared. A species scavenges while most of what it eats is carrion
  // (until it has eaten enough to tell, the seed's label stands). A creature scavenges while most of what it
  // has eaten in its life was carrion; one that has hardly eaten yet goes by its species.
  scavenging(name) {
    const sp = this.registry[name];
    if (sp.extinct !== null || sp.waiting) return !!sp.scavenger; // the dead and the held are judged by their nature, not their last meals
    return sp.scavenging ?? !!sp.scavenger;
  }
  dietOf(c) {
    if (c.ate > 0.05) {
      const carrion = c.carrion ?? 0, plant = c.grazed ?? 0, flesh = c.ate - carrion - plant;
      if (carrion > c.ate / 2) return 'carrion';
      if (c.grazed === undefined && flesh > 0) return c.gut >= 0.5 ? 'flesh' : 'plant'; // fed before plant meals were booked
      return plant >= flesh ? 'plant' : 'flesh';
    }
    if (this.scavenging(c.species)) return 'carrion';
    return c.gut >= 0.5 ? 'flesh' : 'plant';
  }

  fertile(c) {
    if (this.isClimbing(c)) return false;
    if (this.tissueOn(c) && (c.grownFrac ?? 1) < 0.85) return false;
    const thrifty = this.rolled('climate') ? 1 + P.waterSlow * (c.water ?? P.waterStart) : 1; // water-thrifty bodies grow up slower
    return c.age > Math.max(P.maturity * (c.mature ?? 1) * thrifty, P.growTicks * 0.75) && !(c.cooldown > 0) && !c.broken;
  }

  // Two willing kin who touch have a child together, each giving their chosen share of energy.
  // A willing creature with no partner can bud alone, but only when very well fed, and most of the gift is lost.
  // Children inherit body and genes (from one parent or the other) with a little drift.
  breed(c, sp, k, born) {
    let partner = null;
    this.near(c.x, c.y, (this.rolled('footprint') ? Math.max(P.mateFloor, Math.max(P.mateReach, c.size * 2) * P.footprint) : Math.max(P.mateReach, c.size * 2)), o => { // tiny bodies still need a little room to find each other
      if (!partner && o !== c && !o.dead && this.interbreeds(c.species, o.species) && o.willing && this.fertile(o)) {
        // Choosy mating: the more two differ (genes, body, colour), the less likely they pair; past isolation, never.
        // The wish to mate comes first: the longer a body waits, the less it minds, and after a long wait any of its kind will do.
        const gap = this.relatedGap(c, o), hue = Math.abs((c.hueShift ?? 0) - (o.hueShift ?? 0)) / 180 * P.hueChoice;
        const longing = c.longing ?? 0, picky = P.choosiness * (1 + longing / P.longingRelax);
        const mindGap = (c.morph ?? 0) !== (o.morph ?? 0) ? P.morphChoice : 0; // like prefers like
        if (gap < P.isolation && (longing >= P.anyMate || Math.random() < Math.exp(-(gap + hue + mindGap) / picky))) partner = o;
      }
    });
    if (partner) {
      c.longing = 0; partner.longing = 0;
      let gift = c.give * c.energy + partner.give * partner.energy;
      if (gift < P.minChild) return;
      if (this.tissueOn(c) && (1 - c.give) * c.energy + (1 - partner.give) * partner.energy <= 0) return;
      if (this.rolled('protein')) { // (2) protein: meat in the mother's recent diet makes her young better provisioned
        const r = c.recent, share = r?.ate > 0.3 ? (r.meat + (this.rolled('foodvalues') ? r.insect ?? 0 : 0)) / r.ate : 0; // (foodvalues) insects build young too
        gift *= 1 + P.proteinBonus * Math.min(1, share / P.proteinShare);
      }
      c.energy -= c.give * c.energy;
      partner.energy -= partner.give * partner.energy;
      const pick = pickOf, n = this.litterOf(pick(c.litter, partner.litter), gift), mixed = c.species !== partner.species || (c.morph ?? 0) !== (partner.morph ?? 0);
      for (let i = 0; i < n; i++) {
        const genes = c.genes.map((g, j) => drift(pick(g, partner.genes[j])));
        // Same kind: code numbers mix. Across a slip: the child takes one parent's whole mind.
        const mind = mixed ? this.graceHeir(c, partner) ?? pick(c, partner) : c; // (graceheir) a grace-season cross belongs to the new species
        const k = mixed ? mind.k.map(driftK) : c.k.map((v, j) => driftK(pick(v, partner.k[j])));
        born.push(this.child(mind, (c.x + partner.x) / 2, (c.y + partner.y) / 2, gift / n, genes, (mixed ? mind.gen : Math.max(c.gen, partner.gen)) + 1,
          driftSize(pick(c.sizeGene ?? c.size, partner.sizeGene ?? partner.size), this.rolled('sizevar') ? P.sizeDriftWide : P.sizeDrift), driftGut(pick(this.heritableGut(c), this.heritableGut(partner))), k,
          this.inherit(c, partner), [c, partner], n - i));
      }
      this.maybeSlip(born.slice(-n));
      partner.cooldown = P.refractory;
      this.stats[c.species].mated++;
    } else if ((c.longing = (c.longing ?? 0) + 1) >= P.budWait && c.energy >= sp.reproduceAt) { // budding alone: a last resort after a long, fruitless wait
      c.longing = 0;
      const gift = c.give * c.energy, kept = gift * (1 - P.budLoss);
      if (kept < P.minChild) return;
      if (this.tissueOn(c) && (1 - c.give) * c.energy <= 0) return;
      c.energy -= gift;
      const n = this.litterOf(c.litter, kept);
      for (let i = 0; i < n; i++)
        born.push(this.child(c, c.x, c.y, kept / n, c.genes.map(drift), c.gen + 1, driftSize(c.sizeGene ?? c.size, this.rolled('sizevar') ? P.sizeDriftWide : P.sizeDrift), driftGut(this.heritableGut(c)), c.k.map(driftK),
          this.inherit(c, c), [c], n - i));
      this.maybeSlip(born.slice(-n));
      this.stats[c.species].budded++;
    } else {
      return;
    }
    c.cooldown = P.refractory;
  }

  // How many children one birth makes: the litter it inherited, but never so many that a child starts below minChild.
  litterOf(litter, gift) {
    return Math.max(1, Math.min(Math.round(litter ?? 1), Math.floor(gift / P.minChild)));
  }

  // The body traits a child inherits: each from one parent or the other, drifting (or now and then leaping).
  inherit(a, b) {
    const pick = (x, y) => (Math.random() < 0.5 ? x : y), before = sports;
    const t = {
      legs: driftLegs(pick(a.legs, b.legs)), wind: driftWind(pick(a.wind, b.wind)), plastic: driftPlastic(pick(a.plastic, b.plastic)),
      thrift: driftThrift(pick(a.thrift, b.thrift)), armor: driftArmor(pick(a.armor, b.armor)), toxin: driftToxin(pick(a.toxin, b.toxin)),
      litter: driftLitter(pick(a.litter, b.litter)), hueShift: driftHue(pick(a.hueShift, b.hueShift)),
      mature: driftMature(pick(a.mature, b.mature)), browse: driftBrowse(pick(a.browse, b.browse)), gape: driftGape(pick(a.gapeGene ?? a.gape, b.gapeGene ?? b.gape)), resist: driftResist(pick(a.resist, b.resist)), eyes: driftEyes(pick(a.eyes, b.eyes)), decomp: driftAbility(pick(a.decomp, b.decomp), P.decompStart), parasitism: driftAbility(pick(a.parasitism, b.parasitism), P.parasiteStart), coat: driftCoat(pick(a.coat, b.coat)), swim: driftSwim(pick(a.swim, b.swim)), climb: driftClimb(pick(a.climb, b.climb)), bite: driftBite(pick(a.bite, b.bite)), ...(this.rolled('insects') ? { snap: driftSnap(pick(a.snap, b.snap)) } : {}), water: driftWater(pick(a.water, b.water)),
      toxStock: P.storeBirth * ((a.toxStock ?? 1) + (b.toxStock ?? 1)) / 2, minStock: P.storeBirth * ((a.minStock ?? 1) + (b.minStock ?? 1)) / 2,
    };
    if (sports > before) this.noteSport(a.species);
    return t;
  }

  // A slip strikes a whole litter at once (as often per child as before), so its founders have each other.
  maybeSlip(litter) {
    if (litter.length && Math.random() < P.mindSlip * litter.length && litter.every(k => k.species === litter[0].species)) this.slipMind(litter);
  }

  // Children born with a slip in their code: if the slipped code runs, they found a species of their own.
  slipMind(litter) {
    const kid = litter[0], parent = kid.species, g = this.genome[parent];
    if (!g?.consts.length || kid.k?.length !== g.consts.length) return;
    const s = slip(fillTemplate(g.template, kid.k));
    if (!s) return;
    const mg = genomeOf(s.code);
    try {
      const run = compileBehavior('slip', mg.template, mg.consts), [me, world] = this.sense(kid);
      const out = run([[me, world, mg.consts]])[0];
      if (!out || out.error || !Number.isFinite(out.x) || !Number.isFinite(out.y)) return; // stillborn idea: the child is born as usual
    } catch { return; }
    // The slip stays hidden in the species (Luis, 10:10 Oct 15): its carriers are a mind among others, inherited and
    // mixed like any trait; only when splitMin of them stand together does the drift split make them a species.
    const p = this.registry[parent], id = p.morphSeq = (p.morphSeq ?? 0) + 1;
    (p.morphs ??= {})[id] = { code: s.code, what: s.what, born: this.tick };
    this.compileMorphs(parent);
    for (const k of litter) Object.assign(k, { morph: id, k: mg.consts.map(v => v * (1 + (Math.random() - 0.5) * 0.02)) });
    this.log(`A new way of thinking (${s.what}) appears among the ${plural(parent)}: ${litter.length === 1 ? 'one young carries' : `${litter.length} young carry`} it.`);
  }

  // The chronicle mentions a strange birth now and then (at most once a day per species).
  noteSport(name) {
    const day = Math.floor(this.tick / TICKS_PER_DAY);
    if ((this.sportDay ??= {})[name] === day) return;
    this.sportDay[name] = day;
    this.log(`A ${name} is born strange: something in its body has leapt far from its parents'.`);
  }

  child(parent, x, y, energy, genes, gen, size, gut, k, traits, parents = [parent], remaining = 1) {
    const kid = this.spawn(parent.species, x + Math.random() * 8 - 4, y + Math.random() * 8 - 4, gen, genes, size, gut);
    Object.assign(kid, traits);
    kid.mom = parents[0]?.id; // (follow) who it keeps near while young
    // Birth variation: the body differs by chance from the genes it carries (sizeGene, bornGut, gapeGene pass on; the luck does not).
    kid.sizeGene = size; kid.size = Math.min(P.maxSize, Math.max(P.minSize, size * (1 + gauss() * P.birthSize)));
    kid.bornGut = gut; kid.gut = clamp01(gut + gauss() * P.birthGut);
    kid.gapeGene = kid.gape; kid.gape = Math.min(P.gapeMax, Math.max(P.gapeMin, (kid.gape ?? 0.5) + gauss() * P.birthGape));
    kid.lifespan = Math.round(kid.lifespan * (1 + P.matureLife * ((kid.mature ?? 1) - 1))); // late maturers live longer
    kid.energy = energy * (1 - P.bodyShare);
    kid.body += energy * P.bodyShare;
    if (this.tissueOn(kid)) { kid.energy = energy; this.birthTissue(kid, parents, remaining); }
    kid.k = k;
    if (this.isoBox) { const side = this.inIso(parent.x, parent.y); if (this.isoBox.block && this.inIso(kid.x, kid.y) !== side) { kid.x = parent.x; kid.y = parent.y; } kid.isoSide = this.inIso(kid.x, kid.y); } // (isolation) born on the parent's side
    if (this.rolled('habits') && parent.recent?.ate > 0) { const r = parent.recent, f = P.habitBirth / r.ate; kid.recent = Object.fromEntries(Object.entries(r).map(([key, v]) => [key, key === 't' ? this.tick : v * f])); } // (habits) the young start with the parent's way of life
    kid.morph = parent.morph ?? 0; // the mind it took (its parent's hidden slip, if any)
    kid.home = this.rolled('homerange') ? { x: wrap(x, W), y: wrap(y, H) } : { x: kid.x, y: kid.y };
    if (this.rolled('homerange')) { kid.homeSeen = true; kid.homeDispersed = false; } // where it was born
    if (!this.registry[parent.species].unique) this.record('parents', parent); // who breeds (the mind-giving parent stands for the pair)
    kid.hue = parent.hue;
    const name = parent.species, sp = this.registry[name], rec = this.records[name];
    this.stats[name].born++;

    if (gen > rec.generation) {
      rec.generation = gen;
      if (gen % 25 === 0) this.log(`The ${gen}th generation of ${plural(name)} is born.`);
      if (gen - sp.lastBranchGen >= GENERATIONS_PER_MUTATION) {
        sp.lastBranchGen = gen;
        this.onEarned?.(name);
      }
    }
    return kid;
  }

  // Energy locked in a body. Creatures restored from before bodies were booked count as born or sent.
  bodyHeld(c) {
    if (this.digests(c)) return (c.body ?? mass(this.bodySize(c)) * P.bodyEnergy * (c.gen > 0 ? P.bornBody : 1)) + (c.fat ?? 0) + (c.gutE ?? 0);
    return (c.body ?? mass(this.bodySize(c)) * P.bodyEnergy * (c.gen > 0 ? P.bornBody : 1)) + (c.fat ?? 0);
  }

  // The selection ledger (for the reports): sums of key traits for the dead, by cause, and for parents at each birth.
  // Comparing their means with the living shows which traits are being selected for or against, and by what.
  record(book, c) {
    const L = (this.ledger ??= { deaths: {}, parents: { n: 0 } }), e = book === 'parents' ? L.parents : (L.deaths[book] ??= { n: 0 });
    e.n++;
    for (const [k, f] of LEDGER) e[k] = (e[k] ?? 0) + f(c);
  }
  die(c, cause) {
    if (!this.registry[c.species]?.unique) this.record(cause, c);
    c.dead = true;
    // A giant that lays an egg (the kraken, like an octopus) leaves one when it dies of old age: its line goes on.
    const sp0 = this.registry[c.species];
    if (sp0.egg && c.book) { // the kraken's life, measured: how often stuck, how well fed, how often it raged
      const b = c.book;
      (this.mindBook ??= []).push({ gen: c.gen, cause, ticks: b.ticks, stuck: r2(b.stuck / Math.max(1, b.ticks)), mealsPer1000: r2(b.meals / Math.max(1, b.ticks) * 1000), rages: b.rages, distPerMeal: Math.round(b.dist / Math.max(1, b.meals)), inherited: !!c.inheritedMind });
      if (this.mindBook.length > 200) this.mindBook.shift();
    }
    if (sp0.egg && cause === 'old') {
      (this.eggs ??= []).push({ species: c.species, x: c.x, y: c.y, laid: this.tick, hatch: this.tick + P.eggTicks, genes: c.genes.map(drift), k: c.k?.map(driftK), gen: c.gen + 1, gut: c.gut,
        resist: Math.min(1, Math.max(0, (c.resist ?? 0.3) + wobble(P.resistDrift) + leap() * 0.3)), // toxin resistance passes on, drifting
        eyes: driftEyes(c.eyes), mind: c.mind ? this.blurMind(c.mind) : undefined }); // and what it learned of the world (Lamarckian)
      this.log(`The old ${c.species} lays an egg before it dies. Something will hatch from it.`);
    }
    this.stats[c.species][cause]++;
    this.lastDeath = { species: c.species, cause };
    const body = Math.max(0, c.energy) + this.bodyHeld(c);
    this.corpses.push({ x: c.x, y: c.y, species: c.species, cause, age: 0, energy: (cause === 'eaten' ? body * P.scraps : body) * (1 - this.toxinOf(c)) });
    if (sp0.unique) this.whaleFall(c, this.corpses.at(-1));
    const i = cellAt(c.x, c.y);
    const rec = this.records[c.species];
    if (c.age > rec.oldest) {
      const beatenBy = c.age / Math.max(1, rec.oldest);
      rec.oldest = c.age;
      if (c.age > this.registry[c.species].lifespan / 2 && beatenBy > 1.1)
        this.log(`The oldest ${c.species} ever recorded (age ${c.age.toLocaleString('en')}, generation ${c.gen}) ${cause === 'old' ? 'dies of old age' : cause === 'eaten' ? 'is eaten' : cause === 'burnt' ? 'burns' : 'starves'}.`);
    }
  }

  census() {
    const counts = Object.fromEntries(this.living().map(n => [n, 0]));
    for (const c of this.creatures) counts[c.species]++;
    for (const name of this.living()) {
      if (this.lastCounts[name] > 0 && counts[name] === 0) this.markExtinct(name);
      this.records[name].peak = Math.max(this.records[name].peak, counts[name]);
    }
    this.immigration();
    for (const name of this.living()) this.lastCounts[name] = counts[name] || this.lastCounts[name] || 0;

    if (this.tick % HISTORY_EVERY === 0) {
      this.measureRoles();
      const pops = {};
      for (const c of this.creatures) pops[c.species] = (pops[c.species] ?? 0) + 1;
      const traits = Object.fromEntries(this.living().map(n => [n, { size: this.registry[n].avgSize, drift: this.registry[n].drift ?? 0, driftRoot: this.registry[n].driftRoot, bodyRoot: this.registry[n].bodyRoot }]));
      const entry = { t: this.tick, pops, plants: Math.round(this.plants.reduce((a, b) => a + b, 0)), traits };
      this.history.push(entry);
      // When full, thin by age: an entry is kept only if it is at least (its age / 150) after the next one kept, so
      // detail fades smoothly into the past (dense for the last seasons, about 100 points for every doubling of age
      // further back) and the 3-, 30- and 300-season views and the whole era all have points. (Thinning the older half
      // over and over, as before, left almost nothing older than ~30 seasons.)
      if (this.history.length > HISTORY_MAX) {
        const h = this.history, now = this.tick, kept = [h.at(-1)];
        for (let i = h.length - 2; i > 0; i--) if (kept.at(-1).t - h[i].t >= (now - h[i].t) / 150) kept.push(h[i]);
        kept.push(h[0]);
        this.history = kept.reverse();
      }
      this.onHistory?.(entry);
    }
  }

  // Trophic level = 1 + the energy-weighted level of recent meals (plants are level 1), with old meals fading.
  // When a species' measured role changes, the chronicle says so.
  measureRoles() {
    for (const name of this.living()) {
      const sp = this.registry[name], d = this.diet[name];
      if (d.energy > 0.5) sp.tl = r2(1 + d.levels / d.energy);
      const group = this.creatures.filter(c => c.species === name);
      if (group.length) {
        sp.avgSize = r2(group.reduce((a, c) => a + c.size, 0) / group.length);
        sp.avgGut = r2(group.reduce((a, c) => a + c.gut, 0) / group.length);
        sp.avgLegs = r2(group.reduce((a, c) => a + (c.legs ?? 1), 0) / group.length);
        sp.avgWind = r2(group.reduce((a, c) => a + (c.wind ?? 0.5), 0) / group.length);
        sp.avgPlastic = r2(group.reduce((a, c) => a + (c.plastic ?? 0.2), 0) / group.length);
        sp.avgThrift = r2(group.reduce((a, c) => a + (c.thrift ?? 0.5), 0) / group.length);
        const mean = f => r2(group.reduce((a, c) => a + f(c), 0) / group.length);
        sp.avgArmor = mean(c => c.armor ?? 0); sp.avgToxin = mean(c => c.toxin ?? 0); sp.avgLitter = mean(c => c.litter ?? 1);
        sp.avgHueShift = mean(c => c.hueShift ?? 0);
        const g = this.genome[name];
        if (g?.consts.length) {
          const own = group.filter(c => !c.morph && c.k?.length === g.consts.length); // hidden minds have numbers of their own
          const mean = g.consts.map((_, i) => own.length ? Math.exp(own.reduce((a, c) => a + Math.log(c.k[i]), 0) / own.length) : g.consts[i]);
          sp.meanK = mean.map(v => Number(v.toPrecision(4)));
          sp.drift = r2(this.genomeGap(mean, g.consts));
        }
        // How far it has come from its line's founder, across every split: code numbers and body (Luis, 08:55 Oct 15).
        const root = this.rootRef(name);
        if (root) {
          if (sp.meanK?.length) { const n = Math.min(sp.meanK.length, root.consts.length); let gap = 0; for (let i = 0; i < n; i++) gap += Math.abs(Math.log(sp.meanK[i] / root.consts[i])); sp.driftRoot = n ? r2(gap / n) : 0; }
          sp.bodyRoot = r2(BODY.reduce((a, [f, start, scale]) => { const v = mean(f), r = start(root); return a + (scale === 'log' ? Math.abs(Math.log(v / r)) : Math.abs(v - r) / scale); }, 0) / BODY.length);
        }
      }
      if (d.energy > 0.5) {
        const share = (d.carrion ?? 0) / d.energy, was = this.scavenging(name);
        const now = was ? share > 0.4 : share > 0.5;
        sp.scavenging = now;
        // What the species lives on, by measured food: its diet label (shown on the Life panel and logged when it changes).
        const foods = ['grass', 'browse', 'carrion', 'flesh', 'host', 'dung', 'insect'], total = foods.reduce((t, k) => t + (d[k] ?? 0), 0) || 1;
        const f = k => (d[k] ?? 0) / total, plants = f('grass') + f('browse');
        let label = f('host') + f('dung') > 0.5 ? (f('host') >= f('dung') ? 'parasite' : 'decomposer')
          : f('insect') > P.niche.insectivore ? 'insectivore'
          : f('carrion') > 0.5 ? 'scavenger'
          : f('flesh') > 0.5 ? (sp.role === 'apex' ? 'apex' : 'hunter')
          // Omnivore only with real meat in the diet (dung and hosts are side foods, shown as 'part decomposer/parasite').
          : f('carrion') + f('flesh') >= P.niche.omnivore ? 'omnivore'
          : f('browse') > 0.6 * plants ? 'browser' : f('browse') > 0.2 * plants ? 'mixed feeder' : 'grazer';
        if (this.rolled('habitat') && group.length) label = this.habitatLabel(label, { water: group.reduce((s, c) => s + (c.hab?.water ?? 0), 0) / group.length, high: group.reduce((s, c) => s + (c.hab?.high ?? 0), 0) / group.length });
        if (label !== sp.dietLabel && sp.dietLabel && (this.lastCounts[name] ?? 0) >= 5 && this.tick - (sp.labelLogged ?? -1e9) > TICKS_PER_DAY) {
          sp.labelLogged = this.tick; // at most one announcement a day per species, so a borderline diet does not flicker
          const said = { grazer: 'grazers: they live on grass', browser: 'browsers: they live on thicket shoots', 'mixed feeder': 'mixed feeders: grass and thicket shoots alike',
            aquatic: 'aquatic plant feeders: they live in swim-deep water', highland: 'highland plant feeders: they live in the heights',
            scavenger: 'scavengers: they live on the dead', hunter: 'hunters: they live on what they kill', apex: 'apex predators: they hunt hunters',
            omnivore: 'omnivores: plants and flesh alike', insectivore: 'insectivores: they live on insects', decomposer: 'decomposers: they live on dung and remains', parasite: 'parasites: they live on infested hosts' }[label];
          this.log(`The ${plural(name)} (${sp.lineage}) have become ${said}.`);
        }
        sp.dietLabel = label;
        sp.food = Object.fromEntries(['grass', 'browse', 'carrion', 'flesh', 'host', 'dung', 'insect'].map(k => [k, r2(f(k))]));
      }
      // The species' food memory fades over about a day (Luis, s1233), like each body's recent diet (nicheRecent), so its label
      // follows how it lives, not the last shower (it was × 0.95 per measure: a memory of ~1/10 season).
      const fadeDiet = Math.exp(-HISTORY_EVERY / P.nicheRecent);
      for (const k of ['energy', 'levels', 'carrion', 'grass', 'browse', 'flesh', 'host', 'dung', 'insect']) d[k] = (d[k] ?? 0) * fadeDiet;
      // A role changes only once the trophic level is clearly past a boundary (by 0.1), so it does not flicker.
      const role = roleOf(sp.tl - 0.1) === roleOf(sp.tl + 0.1) ? roleOf(sp.tl) : sp.role ?? roleOf(sp.tl);
      sp.role = role; // trophic role (from the food chain); what it is called on screen is its diet label
    }
  }

  // Once a day: has a species drifted into two groups whose code numbers are too different to breed together?
  // Then it has become two species, without the god: the smaller group gets a new name and lineage code.
  checkSplits() {
    // Each creature as its code numbers (log) plus its body; the gap matches relatedGap.
    const kin = this.rolled('kin');
    const gap = (a, b) => kin
      ? P.kinCode * a.l.reduce((s, v, i) => s + Math.abs(v - b.l[i]), 0) / a.l.length + P.kinBody * a.b.reduce((s, v, i) => s + Math.abs(v - b.b[i]), 0) / a.b.length + P.kinGenes * a.e.reduce((s, v, i) => s + Math.abs(v - b.e[i]), 0) / a.e.length
      : a.l.reduce((s, v, i) => s + Math.abs(v - b.l[i]), 0) / a.l.length + P.gutIsolation * Math.abs(a.g - b.g) + P.sizeIsolation * Math.abs(a.s - b.s);
    const avg = (rows, key) => rows[0][key].map((_, i) => rows.reduce((s, r) => s + r[key][i], 0) / rows.length);
    const mean = rows => ({ l: avg(rows, 'l'), b: avg(rows, 'b'), e: avg(rows, 'e'),
      g: rows.reduce((s, r) => s + r.g, 0) / rows.length, s: rows.reduce((s, r) => s + r.s, 0) / rows.length });
    for (const name of this.living()) {
      // A hidden mind carried by splitMin or more becomes a kind of its own (the drift split for slips).
      const minds = {};
      for (const c of this.creatures) if (c.species === name && c.morph && !c.dead) (minds[c.morph] ??= []).push(c);
      for (const id of Object.keys(this.registry[name].morphs ?? {})) {
        const carriers = minds[id] ?? [];
        if (!carriers.length) { delete this.registry[name].morphs[id]; continue; } // a mind nobody carries any more
        if (carriers.length < P.splitMin) continue;
        const s2 = this.rolled('speciate2'), founders = s2 ? this.gather(carriers, P.splitRange) : carriers; // (speciate2) 15–40 carriers gathered in one place, and a body that differs too
        if (s2 && (founders.length < P.speciateMin || !this.realDifference(name, founders, 'mind'))) continue;
        const g = this.genome[`${name}#${id}`], n = g.consts.length, values = [];
        for (let j = 0; j < n; j++) values.push(Math.exp(founders.reduce((a, c) => a + Math.log(Math.max(1e-9, c.k[j])), 0) / founders.length));
        const what = this.registry[name].morphs[id].what;
        this.splitSpecies(name, founders, values, `${name}#${id}`, `${founders.length} ${plural(name)} who think differently (${what}) have become a kind of their own`);
        if (founders.length === carriers.length) delete this.registry[name].morphs[id]; // (the carriers left behind keep the mind)
      }
      if (this.rolled('niche')) this.nicheSplit(name);
      if (this.rolled('genebands')) this.geneSplit(name);
      const group = this.creatures.filter(c => c.species === name && !c.morph && c.k?.length);
      if (group.length < P.splitMin * 2) continue;
      const logs = group.map(c => ({ l: c.k.map(Math.log), g: c.gut, s: Math.log(c.size),
        b: KIN_BODY.map(([k, sc, d]) => sc === 'log' ? Math.log(geneOf(c, k)) : (geneOf(c, k) ?? d) / sc), e: c.genes.slice() }));
      // Two-means in log space, seeded with two far-apart creatures.
      let a = logs[Math.floor(Math.random() * logs.length)];
      let b = logs.reduce((f, r) => (gap(r, a) > gap(f, a) ? r : f));
      a = logs.reduce((f, r) => (gap(r, b) > gap(f, b) ? r : f));
      let side = logs.map(r => gap(r, a) <= gap(r, b));
      for (let it = 0; it < 6; it++) {
        const A = logs.filter((_, i) => side[i]), B = logs.filter((_, i) => !side[i]);
        if (!A.length || !B.length) break;
        a = mean(A); b = mean(B);
        side = logs.map(r => gap(r, a) <= gap(r, b));
      }
      const sizeA = side.filter(Boolean).length, sizeB = side.length - sizeA;
      if (Math.min(sizeA, sizeB) < P.splitMin || gap(a, b) < P.isolation) continue;
      const smallIsA = sizeA <= sizeB;
      // Only the cluster's members gathered in one place split off (a founder group, like an island population);
      // the scattered rest stay with the parent kind. Too few in any one place, and nothing splits yet.
      const cluster = group.filter((_, i) => side[i] === smallIsA), near = (p, q) => Math.hypot(delta(p.x, q.x, W), delta(p.y, q.y, H)) < P.splitRange;
      let local = [];
      for (const centre of cluster.length > 80 ? Array.from({ length: 80 }, () => cluster[Math.floor(Math.random() * cluster.length)]) : cluster) {
        const here = cluster.filter(c => near(centre, c));
        if (here.length > local.length) local = here;
      }
      if (local.length < P.splitMin) continue;
      if (this.rolled('speciate2')) { // (speciate2) at most speciateMax founders from the densest spot, and the body test
        local = this.gather(cluster, P.splitRange);
        if (local.length < P.speciateMin || !this.realDifference(name, local, 'drift')) continue;
      }
      this.splitSpecies(name, local, (smallIsA ? a : b).l.map(Math.exp));
    }
  }

  // Habitat observations fade over a day and share the movement test for swim-deep water, including ice.
  rememberHabitat(c) {
    const h = c.hab ??= { water: 0, high: 0, t: this.tick }, a = 1 - Math.exp(-Math.max(0, this.tick - h.t) / P.habRecent);
    const w = this.waterAt(c.x, c.y), water = w.d * P.depthPx > Math.max(1, (c.legs ?? 1) * this.bodySize(c)) ? 1 : 0;
    h.water += a * (water - h.water); h.high += a * ((this.elevMap()[w.i] >= P.habHeight ? 1 : 0) - h.high); h.t = this.tick;
  }
  habitatLabel(label, hab) {
    if (!this.rolled('habitat') || (label !== 'grazer' && label !== 'mixed feeder')) return label;
    return (hab?.water ?? 0) >= P.habAquatic ? 'aquatic' : (hab?.high ?? 0) >= P.habHigh ? 'highland' : label;
  }
  // How a body lives now (rollout 3, label-based since 11:45 Oct 15), from its RECENT diet: hunter (meat ≥ 60%, mostly live
  // prey), scavenger (meat ≥ 30%, mostly carrion), omnivore (meat 20–60%), browser (browse ≥ 50%), mixed feeder (grass and
  // browse ≥ 20% each), else grazer.
  nicheOf(c) {
    const r = c.recent; if (!r || r.ate < 0.3) return this.habitatLabel('grazer', c.hab);
    if ((r.host ?? 0) / r.ate >= P.niche.parasite) return 'parasite';
    if ((r.dung ?? 0) / r.ate >= P.niche.decomposer) return 'decomposer';
    if ((r.insect ?? 0) / r.ate >= P.niche.insectivore) return 'insectivore'; // lives on insects (snap + a middle gut)
    if (this.rolled('apexniche') && (r.apex ?? 0) / r.ate >= P.niche.apex) return 'apex'; // lives mostly on other meat-eaters
    const meat = r.meat / r.ate, browse = r.browse / r.ate, grass = 1 - meat - browse - ((r.dung ?? 0) + (r.host ?? 0) + (r.insect ?? 0)) / r.ate, dead = r.meat > 0 ? (r.carrion ?? 0) / r.meat : 0;
    if (meat >= P.niche.hunter) return dead >= 0.5 ? 'scavenger' : 'hunter';
    if (meat >= P.niche.scavenger && dead >= 0.5) return 'scavenger';
    if (meat >= P.niche.omnivore) return 'omnivore';
    if (browse >= P.niche.browser) return 'browser';
    if (browse >= P.niche.mixed && grass >= P.niche.mixed) return this.habitatLabel('mixed feeder', c.hab);
    return this.habitatLabel('grazer', c.hab);
  }
  // A local group of splitMin bodies of a species living differently (browsing, or eating meat), seen on nicheDays daily
  // checks in a row, becomes a kind of its own.
  // (genebands, Luis s2369: option A) Bands by inherited genes, not passing behaviour: meat-leaning guts (gut ≥ jaws), and the
  // top of a skill or the ends of size (≥ geneBandZ SDs from the species' mean). Genes run in families, so these bands are
  // lineages; they still need geneFounders together, nicheMin left behind and a real difference (a syndrome, not one trait).
  geneBands(name, group) {
    const z = (get, sign = 1) => { const v = group.map(get), m = v.reduce((a, x) => a + x, 0) / v.length, sd = Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length) || 1; return c => sign * (get(c) - m) / sd >= P.geneBandZ; };
    const tests = [['meat-leaning guts', c => c.gut >= P.valleyJaws], ['top climbers', z(c => c.climb ?? 0)], ['top swimmers', z(c => c.swim ?? 0)], ['top browsers', z(c => c.browse ?? 0)],
      ['top dung-eaters', z(c => c.decomp ?? 0)], ['insect catchers', z(c => c.snap ?? 0)], ['hard biters', z(c => c.bite ?? 0)], ['small bodies', z(c => c.sizeGene ?? c.size, -1)], ['big bodies', z(c => c.sizeGene ?? c.size)]];
    return tests.map(([label, t]) => [label, group.filter(t)]);
  }
  geneSplit(name) {
    const group = this.creatures.filter(c => !c.dead && c.species === name && !c.morph && c.k?.length); if (group.length < P.speciateMin * 2) return;
    for (const [label, them] of this.geneBands(name, group)) {
      if (them.length < P.geneFounders || group.length - them.length < P.nicheMin) continue;
      if (P.splitCooldown && this.tick - (this.registry[name].geneSplitAt?.[label] ?? -Infinity) < P.splitCooldown) continue; // (s2408, Luis) the same kind of band rests after a split
      const local = this.gather(them, this.foundRange());
      if (local.length < P.geneFounders || !this.realDifference(name, local, 'gene')) continue;
      const values = local[0].k.map((_, j) => Math.exp(local.reduce((a, c) => a + Math.log(Math.max(1e-9, c.k[j])), 0) / local.length));
      (this.registry[name].geneSplitAt ??= {})[label] = this.tick;
      this.splitSpecies(name, local, values, name, `${local.length} ${plural(name)} with ${label} have become a kind of their own`);
      return;
    }
  }
  nicheSplit(name) {
    const sp = this.registry[name], group = this.creatures.filter(c => !c.dead && c.species === name && !c.morph && c.k?.length);
    sp.nicheSeen ??= {};
    const of = new Map(group.map(c => [c, this.nicheOf(c)])), count = {};
    for (const n of of.values()) count[n] = (count[n] ?? 0) + 1;
    const usual = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0];
    const near = (p, q) => Math.hypot(delta(p.x, q.x, W), delta(p.y, q.y, H)) < P.nicheRange;
    for (const niche of Object.keys(P.niche).concat('grazer', 'mixed feeder', ...(this.rolled('habitat') ? ['aquatic', 'highland'] : [])).filter((n, i, a) => a.indexOf(n) === i)) {
      const them = group.filter(c => of.get(c) === niche);
      const s2 = this.rolled('speciate2'), floor = s2 ? (P.nicheFounders || P.speciateMin) : P.nicheMin; // (speciate2) the founders' floor falls 30 → 15 (nicheFounders, s2315: a stricter floor for niche splits); the rest left behind still needs nicheMin
      if (niche === usual || them.length < floor || group.length - them.length < P.nicheMin) { delete sp.nicheSeen[niche]; continue; }
      let local = [];
      for (const centre of them) { const here = them.filter(c => near(centre, c)); if (here.length > local.length) local = here; }
      if (local.length < floor) { delete sp.nicheSeen[niche]; continue; }
      if ((sp.nicheSeen[niche] = (sp.nicheSeen[niche] ?? 0) + 1) < (P.nicheHold[niche] ?? P.nicheDays + 1)) continue;
      if (s2) { local = this.gather(them, this.foundRange()); if (local.length < floor || !this.realDifference(name, local, 'niche')) continue; } // (the count keeps running: it is tried again on the next check)
      const values = local[0].k.map((_, j) => Math.exp(local.reduce((a, c) => a + Math.log(Math.max(1e-9, c.k[j])), 0) / local.length));
      this.splitSpecies(name, local, values, name, `${local.length} ${plural(name)} that live as ${niche === 'omnivore' ? 'omnivores' : niche === 'apex' ? 'apex predators' : niche + 's'} have become a kind of their own`);
      delete sp.nicheSeen[niche];
      return;
    }
  }


  // Vicariance (Luis): a species is divided along its own seams. K-means on where its members live (on the wrapped
  // land: each axis as a circle) and what they are (body traits, standardised), place weighted divideGeo : 1 over
  // kind; 2 to divideMaxK groups, as many as separate best (silhouette). Groups under divideMin join their nearest neighbour.
  // With no real structure (silhouette below divideSeam), the faintest seam is promoted: the same search forced to two
  // groups (s1527; it used to cut four equal parts at the medians). Every piece needs divideMin founders, or no divide.
  // The largest group keeps the name.
  vicariance(parent) {
    const group = this.creatures.filter(c => !c.dead && c.species === parent && c.k?.length);
    if (group.length < 2 * P.divideMin) return;
    // Luis (s1527): the divide speeds up seams that are emerging; with none clear, it promotes the faintest (the same
    // search forced to two groups) instead of cutting by geometry; no founding group under divideMin (40), or no divide.
    let parts = this.divideByKind(group);
    const seams = !!parts;
    if (!parts) parts = this.divideByKind(group, true);
    if (!parts) return;
    const order = parts.filter(q => q.length >= P.divideMin).sort((a, b) => b.length - a.length);
    if (order.length < 2) return;
    this.log(seams
      ? `The ${plural(parent)} divide along their own seams: ${order.length} groups${this.divideNote ? ` (${this.divideNote})` : ''}. None can breed with the others any more.`
      : `The ${plural(parent)} part along their faintest seam: ${order.length} groups${this.divideNote ? ` (${this.divideNote})` : ''}. None can breed with the others any more.`);
    for (const q of order.slice(1)) {
      const own = q.filter(c => !c.morph).length ? q.filter(c => !c.morph) : q; // the species' own mind sets the new code's numbers
      const n = Math.min(...own.map(c => c.k.length)), values = [];
      for (let j = 0; j < n; j++) values.push(Math.exp(own.reduce((a, c) => a + Math.log(Math.max(1e-9, c.k[j])), 0) / own.length));
      this.splitSpecies(parent, q, values);
    }
  }

  // When the kraken next rises (or, in its season, sinks): { awake, ticks } for the viewer's clock.
  krakenClock() {
    const idx = Math.floor(this.tick / SEASON_TICKS), awake = idx % P.krakenEvery === 0;
    const next = awake ? (idx + 1) * SEASON_TICKS : (Math.floor(idx / P.krakenEvery) + 1) * P.krakenEvery * SEASON_TICKS;
    return { awake, ticks: next - this.tick };
  }

  // The temperature by row for the viewer's climate tint (null while the climate is not rolled out), and the era.
  tempFrame() {
    if (!this.rolled('climate')) return null;
    const era = this.tempEra(), rows = [];
    const r = this.reliefRise();
    for (let gy = 0; gy < GH; gy += 4) { // the row's temperature (averaged across, once the land has relief)
      if (!r) { rows.push(Math.round(this.tempAt((gy + 2) * CELL, era) * 100) / 100); continue; }
      let t = 0; for (let gx = 0; gx < GW; gx += 4) t += this.tempAt((gy + 2) * CELL, era, (gx + 2) * CELL); rows.push(Math.round(t / (GW / 4) * 100) / 100);
    }
    const relief = r ? { rise: Math.round(r * 1000) / 1000, low: P.tempLow, lapse: this.lapseNow(), ns: [P.tempNorth, P.tempSouth], elev: Buffer.from(Uint8Array.from(this.reliefMap(), (v, i) => Math.round(Math.min(1, Math.max(0, v + ((this.tectonic?.[i] ?? 0) - (this.carve?.[i] ?? 0)) / Math.max(r, 0.05))) * 255))).toString('base64') } : null;
    if (relief && this.rolled('geology')) { // GEOLOGY for the viewer (s1544): rock per cell (0 hard, 1 soft, 2 soluble, 3 sediment, 4 basement), alluvium 0–255, and the full height −1 … 1.5 as 0–255 (elev above stays 0 … 1 for old viewers)
      const R = this.reliefMap(), n = GW * GH, rock = new Uint8Array(n), al = new Uint8Array(n), e2 = new Uint8Array(n);
      for (let i = 0; i < n; i++) { rock[i] = this.rockOf(i); al[i] = Math.round(Math.min(1, this.alluv?.[i] ?? 0) * 255); e2[i] = Math.round(Math.min(1, Math.max(0, (R[i] * r + (this.tectonic?.[i] ?? 0) - (this.carve?.[i] ?? 0) + 1) / 2.5)) * 255); }
      const N = this.climbNeed(), need = Uint8Array.from(N, v => Math.round(Math.min(1, v) * 255)), carve = Uint8Array.from(this.carve ?? [], v => Math.round(Math.min(1, Math.max(0, v)) * 255));
      Object.assign(relief, { rock: Buffer.from(rock).toString('base64'), alluv: Buffer.from(al).toString('base64'), elev2: Buffer.from(e2).toString('base64'), elev2Range: [-1, 1.5], elev3: Buffer.from(Uint8Array.from(R, (v, i) => Math.round(Math.min(1, Math.max(0, (v * r + (this.tectonic?.[i] ?? 0) - (this.carve?.[i] ?? 0) + 1) / 3.5)) * 255))).toString('base64'), elev3Range: [-1, 2.5], // (s1642: the upheaval lifts the peak past 1.5)
        need: Buffer.from(need).toString('base64'), carve: Buffer.from(carve).toString('base64'), quakes: (this.quakeLog ?? []).slice(-20) });
      if (this.rolled('sections')) { // the four sections per cell, as the crossing counter reads them (viewer request, s1611): 0 NW, 1 NE, 2 SW, 3 SE, 4 the heights (range, meseta, wall), 5 a river channel
        const S = new Uint8Array(GW * GH), R2 = this.reliefMap(), rr = this.reliefRise();
        for (let i = 0; i < GW * GH; i++) { const x = (i % GW + 0.5) * CELL, y = ((i / GW | 0) + 0.5) * CELL, xs = wrap(x - P.seamX, W), rx = wrap(P.riverX * W + 22 * Math.sin(y / 70) - P.seamX, W);
          S[i] = Math.min(xs, W - xs, Math.abs(xs - rx)) < this.bandHalf() ? 5 : R2[i] * rr + (this.tectonic?.[i] ?? 0) >= 0.5 ? 4 : (wrap(y, H) < P.ridgeY * H ? 0 : 2) + (xs < rx ? 0 : 1); }
        relief.section = Buffer.from(S).toString('base64'); relief.sectionNames = ['north-west', 'north-east', 'south-west', 'south-east', 'heights', 'river'];
      } // for the viewer's X-ray (s1560): climbing need 0…1, carved depth 0…1, quake faults {season, x, y, ang, len, mag, big}
    }
    // For the viewer's climate dial: where the world sits now on both axes (wetness of the slow climate, mean warmth),
    // and the path it took over the last 30 seasons, every half season (both are clocks, so the past is recomputed).
    const r2 = v => Math.round(v * 100) / 100, wetAt = t => 0.5 + 0.5 * Math.sin(t / (SEASON_TICKS * P.climateSeasons) * Math.PI * 2), trail = [];
    for (let k = 60; k >= 1; k--) { const t = this.tick - k * SEASON_TICKS / 2; if (t >= 0) trail.push([r2(wetAt(t)), r2(0.5 + this.tempEra(t))]); }
    return { rows, era: r2(era), frost: P.frostAt, north: r2(r ? this.tempAt(P.ridgeY * H, era, P.peakX * W) : this.tempAt(0, era)), south: r2(r ? this.tempAt(0, era, P.riverX * W) : this.tempAt(H - 1, era)), relief, now: [r2(this.climate()), r2(0.5 + era)], trail };
  }

  // The kraken's map for the viewer (its 'mind' overlay): trap and food values, rounded.
  mindFrame() {
    const k = this.creatures.find(c => !c.dead && c.mind);
    return k ? { w: P.mindW, h: P.mindH, trap: k.mind.trap.map(v => Math.round(v * 100) / 100), food: k.mind.food.map(v => Math.round(v * 100) / 100) } : null;
  }

  // The next great divide, as the world stands: the species over divideShare of all life now, and the ticks until its
  // rest after its last divide is over (0: it divides at the next check). Null when no species is that dominant.
  nextDivide() {
    if (this.rolled('speciate2')) return null; // (speciate2) no great divide
    const [name, share] = this.leader();
    if (!name || share <= P.divideShare) return null;
    return { name, ticks: Math.max(0, (this.registry[name].dividedAt ?? -Infinity) + P.divideRest - this.tick) }; // 0: as soon as it is checked
  }
  // The most numerous species (not the unique giants) and its share of all living bodies.
  leader() {
    let total = 0; const n = {};
    for (const c of this.creatures) if (!c.dead) { total++; if (!this.registry[c.species].unique) n[c.species] = (n[c.species] ?? 0) + 1; }
    const [name, count] = Object.entries(n).sort((a, b) => b[1] - a[1])[0] ?? [];
    return name ? [name, count / total] : [null, 0];
  }
  // The great divide (Luis, 09:05 Oct 15): at any time, a species holding over a third of all life is divided, unless
  // it (or the split it came from) was divided less than divideRest ago.
  greatDivide() {
    if (this.rolled('speciate2')) return; // (speciate2) cancelled: its pieces were near-copies told apart only by place
    const [name, share] = this.leader();
    if (!name || share <= P.divideShare || this.tick - (this.registry[name].dividedAt ?? -Infinity) < P.divideRest) return;
    const before = new Set(this.speciesNames);
    this.vicariance(name);
    this.registry[name].dividedAt = this.tick;
    for (const n of this.speciesNames) if (!before.has(n)) this.registry[n].dividedAt = this.tick; // the new species rest too
  }

  // K-means over place and kind; returns the groups, or null when the members show no real structure.
  divideByKind(group, force) {
    const TRAITS = [c => this.bodySize(c), c => c.gut, c => this.armorOf(c), c => this.toxinOf(c), c => c.legs ?? 1, c => c.wind ?? 0.5,
      c => c.mature ?? 1, c => c.browse ?? 0, c => c.gape ?? 0.5, c => c.resist ?? P.resistStart, c => c.litter ?? 1];
    const minds = [...new Set(group.map(c => c.morph).filter(Boolean))].slice(0, 3); // hidden minds count as kind too
    for (const id of minds) TRAITS.push(c => (c.morph === id ? 1 : 0));
    const raw = group.map(c => TRAITS.map(f => f(c))), m = TRAITS.length;
    const mean = TRAITS.map((_, j) => raw.reduce((a, r) => a + r[j], 0) / raw.length);
    const sd = TRAITS.map((_, j) => { const v = Math.sqrt(raw.reduce((a, r) => a + (r[j] - mean[j]) ** 2, 0) / raw.length); return v > 1e-6 ? v : Infinity; }); // a trait all share counts for nothing
    // Place: each axis on a circle (so a herd across an edge stays whole), scaled so place weighs divideGeo against kind 1.
    const geo = Math.sqrt(P.divideGeo / 2), kind = Math.sqrt(1 / m);
    const pts = group.map((c, i) => {
      const ax = 2 * Math.PI * c.x / W, ay = 2 * Math.PI * c.y / H;
      return [Math.cos(ax) * geo, Math.sin(ax) * geo, Math.cos(ay) * geo, Math.sin(ay) * geo, ...raw[i].map((v, j) => (v - mean[j]) / sd[j] * kind)];
    });
    const d2 = (a, b) => { let s = 0; for (let j = 0; j < a.length; j++) s += (a[j] - b[j]) ** 2; return s; };
    const kmeans = k => {
      let best = null;
      for (let restart = 0; restart < 5; restart++) {
        const cs = [pts[Math.floor(Math.random() * pts.length)]];
        while (cs.length < k) { // k-means++: the next centre far from those chosen
          const w = pts.map(p => Math.min(...cs.map(c => d2(p, c)))), tot = w.reduce((a, b) => a + b, 0);
          let r = Math.random() * tot, i = 0; while (i < w.length - 1 && (r -= w[i]) > 0) i++;
          cs.push(pts[i]);
        }
        let label = new Array(pts.length).fill(0);
        for (let it = 0; it < 25; it++) {
          label = pts.map(p => { let bi = 0, bd = Infinity; cs.forEach((c, i) => { const d = d2(p, c); if (d < bd) { bd = d; bi = i; } }); return bi; });
          for (let i = 0; i < k; i++) { const mine = pts.filter((_, n) => label[n] === i); if (mine.length) cs[i] = mine[0].map((_, j) => mine.reduce((a, p) => a + p[j], 0) / mine.length); }
        }
        const inertia = pts.reduce((a, p, n) => a + d2(p, cs[label[n]]), 0);
        if (!best || inertia < best.inertia) best = { label, cs, inertia };
      }
      // Too-small groups join the nearest other centre.
      for (let pass = 0; pass < k; pass++) {
        const sizes = best.cs.map((_, i) => best.label.filter(l => l === i).length), small = sizes.findIndex(n => n > 0 && n < P.divideMin);
        if (small < 0) break;
        best.label = best.label.map((l, n) => { if (l !== small) return l; let bi = -1, bd = Infinity; best.cs.forEach((c, i) => { if (i !== small && sizes[i] >= P.divideMin) { const d = d2(pts[n], c); if (d < bd) { bd = d; bi = i; } } }); return bi < 0 ? l : bi; });
      }
      return best.label;
    };
    const silhouette = label => { // mean (b − a) / max(a, b) over members
      const ks = [...new Set(label)]; if (ks.length < 2) return -1;
      let sum = 0;
      pts.forEach((p, n) => {
        const dist = {}; const cnt = {};
        pts.forEach((q, o) => { if (o === n) return; const l = label[o]; dist[l] = (dist[l] ?? 0) + Math.sqrt(d2(p, q)); cnt[l] = (cnt[l] ?? 0) + 1; });
        const a = cnt[label[n]] ? dist[label[n]] / cnt[label[n]] : 0, b = Math.min(...ks.filter(l => l !== label[n] && cnt[l]).map(l => dist[l] / cnt[l]));
        sum += (b - a) / (Math.max(a, b) || 1);
      });
      return sum / pts.length;
    };
    let best = null;
    for (let k = 2; k <= P.divideMaxK; k++) { const label = kmeans(k), sc = silhouette(label); if (!best || sc > best.sc) best = { label, sc, k }; }
    if (best.sc < P.divideSeam || new Set(best.label).size < 2) {
      if (!force) { this.divideNote = null; return null; }
      // Forced (no clear seam, s1527): the faintest seam — along the direction the group varies most (place and kind),
      // cut at the widest gap that leaves divideMin or more on each side.
      const n = pts.length, d = pts[0].length; if (n < 2 * P.divideMin) { this.divideNote = null; return null; }
      const mu = pts[0].map((_, j) => pts.reduce((a, p) => a + p[j], 0) / n), cen = pts.map(p => p.map((v, j) => v - mu[j]));
      let v = mu.map(() => Math.random() - 0.5);
      for (let it = 0; it < 30; it++) { const nv = new Array(d).fill(0); for (const p of cen) { const s = p.reduce((a, x, j) => a + x * v[j], 0); for (let j = 0; j < d; j++) nv[j] += s * p[j]; } const l = Math.hypot(...nv) || 1; v = nv.map(x => x / l); }
      const proj = cen.map(p => p.reduce((a, x, j) => a + x * v[j], 0)), idx = proj.map((_, i) => i).sort((a, b) => proj[a] - proj[b]);
      let cut = P.divideMin, gap = -1;
      for (let i = P.divideMin; i <= n - P.divideMin; i++) { const g = proj[idx[i]] - proj[idx[i - 1]]; if (g > gap) { gap = g; cut = i; } }
      const label = new Array(n).fill(0); for (let i = cut; i < n; i++) label[idx[i]] = 1;
      best = { label, sc: silhouette(label), k: 2 };
    }
    const parts = [...new Set(best.label)].map(l => group.filter((_, n) => best.label[n] === l));
    // What sets each group apart: its most distinctive trait against the whole.
    const NAMES = [['larger', 'smaller'], ['meat-leaning', 'plant-leaning'], ['more shelled', 'softer'], ['more toxic', 'less toxic'], ['longer-legged', 'shorter-legged'],
      ['longer-winded', 'shorter-winded'], ['later-maturing', 'earlier-maturing'], ['more browsing', 'less browsing'], ['wider-mouthed', 'narrower-mouthed'], ['more resistant', 'less resistant'], ['bigger litters', 'smaller litters'], ...minds.map(() => ['of a new mind', 'of the old mind'])];
    this.divideNote = parts.map(q => {
      const z = TRAITS.map((f, j) => (q.reduce((a, c) => a + f(c), 0) / q.length - mean[j]) / sd[j]);
      const j = z.reduce((bj, v, i) => Math.abs(v) > Math.abs(z[bj]) ? i : bj, 0);
      return `${q.length} ${Math.abs(z[j]) > 0.3 ? NAMES[j][z[j] > 0 ? 0 : 1] : 'like the rest'}`;
    }).join(', ');
    return parts;
  }

  // (speciate2) The counters of the speciation rule (not saved): splits let through and blocked by kind, merges, kin spared, and the body gaps seen.
  spStat() { return (this.speciate ??= { passed: {}, blocked: {}, merged: 0, spared: 0, gaps: [] }); }
  // The densest spot of a pool (within range; 80 random centres at most), and the speciateMax members nearest to it.
  foundRange() { return this.rolled('founders') ? P.founderRange : P.nicheRange; } // (founders) how close a split's founders must live
  gather(pool, range) {
    let best = [], at = null;
    for (const centre of pool.length > 80 ? Array.from({ length: 80 }, () => pool[Math.floor(Math.random() * pool.length)]) : pool) {
      const here = pool.filter(c => Math.hypot(delta(centre.x, c.x, W), delta(centre.y, c.y, H)) < range);
      if (here.length > best.length) { best = here; at = centre; }
    }
    if (best.length <= P.speciateMax) return best;
    const d = c => Math.hypot(delta(at.x, c.x, W), delta(at.y, c.y, H));
    return best.sort((a, b) => d(a) - d(b)).slice(0, P.speciateMax);
  }
  // The body traits a new species must differ in (the 11 the great divide used).
  bodyTraits(c, way = false) { return [this.bodySize(c), c.gut, this.armorOf(c), this.toxinOf(c), c.legs ?? 1, c.wind ?? 0.5, c.mature ?? 1, c.browse ?? 0, c.gape ?? 0.5, c.resist ?? P.resistStart, c.litter ?? 1, ...(this.rolled('bodytest2') ? [c.swim ?? 0, c.climb ?? 0, c.bite ?? 0, c.snap ?? 0, c.coat ?? P.coatStart ] : []), ...(way ? this.wayTraits(c) : [])]; } // (s2235, bodytest2) the skills the newest rules select on
  // (lifediff, Luis s2298: "that should count as difference") how a body lives, for the split test alongside its body: the recent
  // diet's shares (meat, browse and tree food, dung, insects, hosts) and its habitat (time in swim-deep water, on the heights).
  // Ways of life, not mere place, so groups that only live apart still need a real difference.
  // Which splits weigh ways of life: mind splits (does a new way of thinking lead to a new way of living?); niche splits only with
  // P.lifeDiffNiche, since a niche band is chosen by its way of life and would always pass.
  // The split bar above random founders: gene bands (lineages by inherited genes) may use a lower bar (Luis, s2383).
  // (habits) foraging skill from experience: a body gathers a side food faster the more of its recent diet it has been.
  habit(c, kind) { if (!this.rolled('habits')) return 1; const r = c.recent; if (!r || !(r.ate > 0)) return 1; return 1 + P.habitGain * Math.min(1, (r[kind] ?? 0) / r.ate); }
  splitGap(kind) { return kind === 'gene' && P.geneGap ? P.geneGap : P.speciateGap; }
  wayCounts(kind) { return this.rolled('lifediff') && (kind === 'mind' || (kind === 'niche' && P.lifeDiffNiche)); }
  wayTraits(c) {
    const r = c.recent, a = r && r.ate > 0.3 ? r.ate : 0, sh = v => a ? (v ?? 0) / a : 0;
    return [sh(r?.meat), sh(r?.browse), sh(r?.dung), sh(r?.insect), sh(r?.host), c.hab?.water ?? 0, c.hab?.high ?? 0];
  }
  // Do these founders differ from the rest of their species in body, beyond chance? The rms over the traits of (founders' mean − rest's mean) in the species' SDs,
  // against the median of speciateNull random groups of the same size; it must beat the null by speciateGap.
  // How far founders' bodies stand from the rest of their species, and what random founders of the same number would give
  // (the median of speciateNull draws). Shared by the split rule and the viewer's bands (which pass their own random source).
  bodyDifference(name, founders, rand = Math.random, way = false) {
    const all = this.creatures.filter(c => !c.dead && c.species === name), n = all.length, f = founders.length;
    const raw = all.map(c => this.bodyTraits(c, way)), m = raw[0].length, mean = [], sd = [];
    for (let j = 0; j < m; j++) { mean[j] = raw.reduce((a, r) => a + r[j], 0) / n; const v = Math.sqrt(raw.reduce((a, r) => a + (r[j] - mean[j]) ** 2, 0) / n); sd[j] = v > 1e-6 ? v : Infinity; }
    const rms = pick => { // pick: indexes of the founders
      let s = 0; for (let j = 0; j < m; j++) { const sf = pick.reduce((a, i) => a + raw[i][j], 0), mf = sf / f, mr = (mean[j] * n - sf) / Math.max(1, n - f); s += ((mf - mr) / sd[j]) ** 2; }
      return Math.sqrt(s / m);
    };
    const set = new Set(founders), real = rms(all.map((c, i) => set.has(c) ? i : -1).filter(i => i >= 0)), idx = all.map((_, i) => i), nulls = [];
    for (let r = 0; r < P.speciateNull; r++) { for (let i = 0; i < f; i++) { const j = i + Math.floor(rand() * (n - i)); [idx[i], idx[j]] = [idx[j], idx[i]]; } nulls.push(rms(idx.slice(0, f))); }
    nulls.sort((a, b) => a - b);
    return { real, nul: nulls[nulls.length >> 1], n, f };
  }
  realDifference(name, founders, kind) {
    const st = this.spStat(), { real, nul, n, f } = this.bodyDifference(name, founders, Math.random, this.wayCounts(kind)), ok = n > f && real >= nul + this.splitGap(kind);
    st.gaps.push({ kind, season: this.season, name, founders: f, of: n, rms: +real.toFixed(3), nul: +nul.toFixed(3), ok });
    if (st.gaps.length > 200) st.gaps.splice(0, st.gaps.length - 200); // (s2235) keep the latest 200 in the save
    (ok ? st.passed : st.blocked)[kind] = ((ok ? st.passed : st.blocked)[kind] ?? 0) + 1;
    return ok;
  }
  // (s2261, Luis) Bands inside each species for the viewer: groups living differently (ways of life and habitats other than the
  // usual one) and mind variants, with how many stand together, how different their bodies are against random founders, and
  // how ready they are to split (0 … 1 of speciateGap above random). Read-only: a private random source, nothing recorded.
  bands() {
    let seed = this.tick >>> 0; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const out = {}, st = this.spStat();
    for (const name of this.living()) {
      const group = this.creatures.filter(c => !c.dead && c.species === name && c.k?.length); if (group.length < P.speciateMin * 2) continue;
      const list = [], of = new Map(group.map(c => [c, this.nicheOf(c)])), count = {};
      for (const v of of.values()) count[v] = (count[v] ?? 0) + 1;
      const usual = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0];
      const add = (kind, label, members, range) => {
        if (members.length < 5) return;
        const together = members.length >= P.speciateMin ? this.gather(members, range) : members, d = this.bodyDifference(name, together, rand, this.wayCounts(kind));
        list.push({ kind, label, n: members.length, together: together.length, needTogether: kind === 'niche' ? (P.nicheFounders || P.speciateMin) : P.speciateMin, rms: +d.real.toFixed(3), nul: +d.nul.toFixed(3), need: +(d.nul + this.splitGap(kind)).toFixed(3),
          ready: +Math.max(0, Math.min(1, (d.real - d.nul) / this.splitGap(kind))).toFixed(3), ids: members.map(c => c.id), seen: this.registry[name].nicheSeen?.[label] ?? 0,
          range, rest: group.length - members.length, needRest: kind === 'niche' ? P.nicheMin : 0, needSeen: kind === 'niche' ? (P.nicheHold[label] ?? P.nicheDays + 1) : 0 });
      };
      for (const [label, k] of Object.entries(count)) if (label !== usual) add('niche', label, group.filter(c => of.get(c) === label), this.foundRange());
      if (this.rolled('genebands')) for (const [label, members] of this.geneBands(name, group)) add('gene', label, members, this.foundRange());
      for (const [id, m] of Object.entries(this.registry[name].morphs ?? {})) add('mind', m.what ?? `mind ${id}`, group.filter(c => String(c.morph) === String(id)), P.splitRange);
      list.sort((a, b) => b.ready - a.ready || b.n - a.n);
      const tries = st.gaps.filter(g => g.name === name).slice(-20).map(({ kind, season, founders, rms, nul, ok }) => ({ kind, season, founders, rms, nul, ok }));
      out[name] = { usual, bands: list, tries, passed: st.passed, blocked: st.blocked, gap: P.speciateGap };
    }
    return out;
  }

  // (speciate2) At the end of its first season, a new species under speciateMin bodies blends back into its parent (if that still lives); mind-born ones do not (their numbers are another layout).
  blendBack() {
    for (const name of this.living()) {
      const sp = this.registry[name]; if (!sp.speciated || this.graceOn(sp)) continue;
      delete sp.speciated;
      const mine = this.creatures.filter(c => !c.dead && c.species === name), parent = this.registry[sp.parent];
      if (!mine.length || mine.length >= P.speciateMin || sp.mindBorn || !parent || parent.extinct !== null || parent.waiting) continue;
      for (const c of mine) { c.species = sp.parent; c.hue = parent.hue; }
      this.lastCounts[sp.parent] = (this.lastCounts[sp.parent] ?? 0) + mine.length;
      sp.extinct = this.season; sp.blended = true; this.touchRegistry();
      delete this.behaviors[name]; delete this.lastCounts[name];
      this.spStat().merged++;
      this.log(`The ${plural(name)} blend back into the ${plural(sp.parent)}: too few to stand apart.`);
      this.onSpecies?.();
    }
  }

  splitSpecies(parent, members, values, mindKey = parent, story = null) {
    const p = this.registry[parent], g = this.genome[mindKey];
    let name;
    do { name = inventName(); } while (this.speciesNames.includes(name) || this.isTaken?.(name));
    p.branches = (p.branches ?? 0) + 1;
    this.touchRegistry(); this.registry[name] = { ...p, ...this.distinctLook(p.tl >= 2.5), parent, born: this.season, extinct: null, waiting: false, lastBranchGen: 0,
      lineage: `${p.lineage}.${p.branches}`, branches: 0, meanK: undefined, drift: 0, releasedAt: this.tick,
      // A split keeps its parent's reference body: physiology scales from it, and a new reference at the members' own size
      // would make a split pay more upkeep per meal than its parents, beside them, and starve.
      morphs: undefined, morphSeq: 0, size: p.size, gut: r2(members.reduce((a, c) => a + c.gut, 0) / members.length),
      avgSize: undefined, avgGut: undefined, slip: undefined, variant: false, graduated: undefined,
      ...(this.rolled('speciate2') ? { bornAt: this.tick, speciated: true, mindBorn: mindKey !== parent } : {}) };
    this.code[name] = fillTemplate(g.template, values); // its own evolved numbers become its written code
    this.compile(name);
    this.ensureBooks();
    this.registry[name].statsAtRelease = { ...this.stats[name] };
    // Members that carry a hidden mind keep it in the new species (a divide cuts through minds, it does not erase them).
    const carried = mindKey === parent ? [...new Set(members.filter(c => c.morph).map(c => c.morph))] : [];
    if (carried.length) { this.registry[name].morphs = Object.fromEntries(carried.map(id => [id, p.morphs?.[id]]).filter(([, m]) => m)); this.registry[name].morphSeq = p.morphSeq ?? 0; this.compileMorphs(name); }
    for (const c of members) Object.assign(c, { species: name, hue: this.registry[name].hue, gen: 0, morph: mindKey === parent ? c.morph ?? 0 : 0 });
    this.lastCounts[name] = members.length;
    this.lastCounts[parent] -= members.length;
    this.log(story ? `${story}: they are ${plural(name)} (${this.registry[name].lineage}) now.` : `The ${plural(parent)} have drifted apart. ${members.length} of them can no longer breed with the rest: they are ${plural(name)} (${this.registry[name].lineage}) now.`);
    this.onSplit?.(name, parent);
    this.onSpecies?.();
  }

  // A species born last season that is still alive now has survived its first full season.
  // The river: rain and snowmelt off the heights, routed downhill and toward the bottom of the map, carving its bed.
  updateWater() {
    const Wt = this.water, D = this.carve, Sn = this.snow, F = this.flow, FD = this.flowDir, E = this.reliefMap(), r = this.reliefRise(), n = GW * GH;
    const rain = this.rain(), era = this.tempEra(), at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW);
    const sTilt = this.sectionsRise(), tr = this.rolled('trees') ? this.trees : null; // roots hold the bed and the reef
    if (!this.grooved) { // the first time: a faint groove along the river line, so water has a path to start from (it finds its own way after)
      for (let gy = 0; gy < GH; gy++) { const crx = P.riverX * W + 22 * Math.sin((gy + 0.5) * CELL / 70); for (let dx = -1; dx <= 1; dx++) { const i = at(Math.floor(crx / CELL) + dx, gy); D[i] = Math.max(D[i], P.grooveDepth * (dx ? 0.5 : 1)); } }
      this.grooved = true;
    }
    const temp = new Float32Array(n), surf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const gx = i % GW, gy = (i / GW) | 0;
      temp[i] = this.tempAt((gy + 0.5) * CELL, era, (gx + 0.5) * CELL);
      const e = E[i] * r + this.tectonic[i] - sTilt * (P.tiltBase + P.tiltWest * (1 - (gx + 0.5) * CELL / W)); // height above the lowland (tilted by the sections)
      if (e > 0.12) { // rain on the heights: snow when cold, runoff when not; snow melts when warm
        const p = P.precip * rain * P.waterEvery;
        if (temp[i] < P.snowAt) Sn[i] += p; else Wt[i] += p;
        if (Sn[i] > 0 && temp[i] > P.snowAt) { const m = Math.min(Sn[i], P.meltRate * (temp[i] - P.snowAt) * P.waterEvery); Sn[i] -= m; Wt[i] += m; }
      } else if (Sn[i] > 0) { const m = Math.min(Sn[i], P.meltRate * P.waterEvery); Sn[i] -= m; Wt[i] += m; }
      if (Wt[i] > 0) Wt[i] = Math.max(0, Wt[i] * (1 - P.seep * (0.5 + temp[i]) * (1.2 - rain)) - (e > 0.12 ? 0 : P.evap * (0.5 + temp[i]) * (1.2 - rain) * P.waterEvery * 0.125)); // soaks away; standing water on low ground evaporates (heat, dry air)
      const toRiver = Math.abs(((gx + 0.5) * CELL - P.riverX * W + W * 1.5) % W - W / 2) / CELL; // the valley floor leans toward the river line
      surf[i] = e - D[i] + Wt[i] + P.valleyTilt * toRiver;
      F[i] *= 0.9;
    }
    if (this.rolled('bigriver')) this.feedSprings(Wt, E, r, D, temp); // perennial water at the head of the big river
    const W2 = Float32Array.from(Wt);
    const dep = this.rolled('deposition'), Sd = (this.sed ??= new Float32Array(n)), Sd2 = new Float32Array(n), geo = this.rolled('geology'), Al = (this.alluv ??= new Float32Array(n));
    if (geo) for (let i = 0; i < n; i++) Al[i] *= P.alluvFade; // alluvium fades where nothing new is laid down
    for (let i = 0; i < n; i++) {
      if (dep && !(Wt[i] > 1e-4) && Sd[i] > 0) { if (geo) Al[i] = Math.min(1, Al[i] + P.alluvGain * Sd[i]); D[i] = Math.max(-P.fillMax, D[i] - Sd[i]); Sd[i] = 0; } // dried out: the load is left behind
      if (!(Wt[i] > 1e-4) || temp[i] < P.freezeAt) continue; // frozen water stays put
      const gx = i % GW, gy = (i / GW) | 0, tilt = gy < GH / 2 ? P.tiltTop + (P.tiltHalf - P.tiltTop) * Math.max(gy / (GH / 2), sTilt) : P.tiltHalf; // the sections ease the steep top pull: the wall's gorges carry the water round now // steep at the top, gentle from halfway down
      let best = -1, low = surf[i], bdx = 0, bdy = 0, steepest = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const j = at(gx + dx, gy + dy), s2 = surf[j] - tilt * dy, slope = (surf[i] - s2) / (dx && dy ? Math.SQRT2 : 1); // a tilt toward the bottom of the map
        if (slope > steepest) { steepest = slope; low = s2; best = j; bdx = dx; bdy = dy; } // water takes the steepest way down (a diagonal step is longer)
      }
      const f = best < 0 ? 0 : Math.min(Wt[i], (surf[i] - low) / 2, P.flowMax);
      if (f <= 0) { if (dep && Sd[i] > 0) { const d = Sd[i] * P.pondDrop; Sd[i] -= d; D[i] = Math.max(-P.fillMax, D[i] - d); if (geo) Al[i] = Math.min(1, Al[i] + P.alluvGain * d); } continue; } // still water lets its load settle
      W2[i] -= f; W2[best] += f; F[i] += f; FD[i * 2] = bdx; FD[i * 2 + 1] = bdy;
      // Flowing water carves its bed and wears the reef in it; what it takes enriches the ground downstream.
      let carve = P.carveRate * f * (1 - Math.min(1, this.reef[i])) * (geo ? P.rockErode[this.rockOf(i)] : 1) * (tr ? 1 - P.rootHold * tr[i] : 1); // the rock decides how fast
      if (dep) {
        const cap = P.sedCap * f * Math.min(1, steepest / P.sedDropRef); // fast water carries more
        carve = Math.max(0, Math.min(carve, cap - Sd[i])); // it carves only into spare capacity
        if (Sd[i] > cap) { const d = (Sd[i] - cap) * P.depRate; Sd[i] -= d; D[i] = Math.max(-P.fillMax, D[i] - d); if (geo) Al[i] = Math.min(1, Al[i] + P.alluvGain * d); } // where it slows, it drops the excess
      }
      const cmax = geo ? P.geoCarveMax : P.carveMax; // geology: the basement is the base level, not a cap
      if (D[i] < cmax) { const c = Math.min(carve, cmax - D[i]); D[i] += c; if (dep) Sd[i] += c; }
      if (dep && Sd[i] > 0) { const m = Sd[i] * f / Wt[i]; Sd[i] -= m; Sd2[best] += m; } // the load travels with the water
      if (this.reef[i] > 0) { const wash = Math.min(this.reef[i], P.reefWash * f * (tr ? 1 - P.rootHold * tr[i] : 1)); this.reef[i] -= wash; this.fertility[best] = Math.min(2, this.fertility[best] + wash); }
    }
    this.water = W2; this.landChanged(); // carving and deposits moved the land
    if (dep) for (let i = 0; i < n; i++) Sd[i] += Sd2[i]; // what arrived this update
    if (this.rolled('waterfood')) for (let i = 0; i < n; i++) { // water plants: grow where water stands and is not frozen, wither where it dries
      if (W2[i] > 0.01 && temp[i] >= P.freezeAt) this.aqua[i] += P.aquaGrow * (1 - this.aqua[i]) * (0.5 + temp[i]);
      else if (this.aqua[i] > 0) this.aqua[i] *= W2[i] > 0.01 ? 0.995 : 0.97;
    }
    // Wet banks: water and the cells around it stay moist.
    const B = this.bank; B.fill(0);
    for (let i = 0; i < n; i++) if (W2[i] > 0.01) {
      const gx = i % GW, gy = (i / GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = at(gx + dx, gy + dy); B[j] = Math.max(B[j], dx || dy ? P.bankWet : 1); }
    }
  }
  // Springs of the big river: at bigSprings rows along its course, springFlow of water enters the lowest cell near the river's line.
  // (The line is the lowest relief of each row near the seam, found once.)
  feedSprings(Wt, E, r, D, temp) {
    const k = this.riverRise(), R = this.reliefMap(), x0 = Math.round(P.seamX / CELL), far = Math.round(P.bigFloodHalf / CELL);
    if (this._springRel !== R) { // the line of the bed in each spring row, remembered per relief
      this._springRel = R; this._springAt = [];
      for (let s = 0; s < P.bigSprings; s++) { const gy = Math.round((0.03 + (P.bigSpringReach - 0.03) * s / Math.max(1, P.bigSprings - 1)) * GH) % GH; let best = x0, low = Infinity;
        for (let dx = -far; dx <= far; dx++) { const gx = (x0 + dx + GW) % GW, z = R[gy * GW + gx]; if (z < low) { low = z; best = gx; } }
        this._springAt.push([best, gy]); }
    }
    for (const [gx, gy] of this._springAt) {
      let best = -1, low = Infinity;
      for (let dx = -2; dx <= 2; dx++) { const i = gy * GW + ((gx + dx + GW) % GW), z = E[i] * r + this.tectonic[i] - D[i] + Wt[i]; if (z < low) { low = z; best = i; } }
      if (temp[best] >= P.freezeAt) Wt[best] += P.springFlow * k;
    }
  }
  // FOUR SECTIONS: a step onto harder ground than a body stands on — crags or cliffs past its climbing, water deeper
  // past its swimming — is refused (it turns back), with a soft margin either side of the need. Bodies already on hard
  // ground may always move toward easier. Counts lowland section changes (crossings) for the readout.
  crossGate(c) {
    const i0 = cellAt(c.x, c.y), i1 = cellAt(c.x + c.vx, c.y + c.vy), n0 = this.climbNeed()[i0], climb = c.climb ?? 0;
    const physics = this.rolled('physics') && !this.registry[c.species].unique, N = this.climbNeed();
    const descending = physics && i0 !== i1 && Math.max(n0, N[i1]) > P.needFloor && this.elevAt(c.x + c.vx, c.y + c.vy) < this.elevAt(c.x, c.y);
    const fall = descending && Math.random() < P.downFall * (1 - climb) * Math.max(n0, N[i1]);
    if (fall || (n0 > P.needFloor && n0 > climb + P.skillMargin)) { // on crags or a cliff beyond its climbing (the land rose under it): it falls, a cell a tick, down the steepest way
      const gx = i0 % GW, gy = (i0 / GW) | 0, x = (gx + 0.5) * CELL, y = (gy + 0.5) * CELL; let bx = 0, by = 0, low = this.elevAt(x, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const e = this.elevAt(x + dx * CELL, y + dy * CELL); if ((dx || dy) && e < low) { low = e; bx = dx; by = dy; } }
      if (bx || by) {
        c.x = wrap(c.x + bx * CELL, W); c.y = wrap(c.y + by * CELL, H); c.vx = 0; c.vy = 0;
        c.energy -= P.fallCost * (fall ? Math.max(n0, N[i1]) : n0 - climb) * (mass(this.bodySize(c)) / mass(7)); // heavier bodies are hurt more
        if (physics) c.climbing = null;
        this.fell = (this.fell ?? 0) + 1; return;
      }
    }
    if (physics && c.climbEntry !== i0 && c.climbEntry !== i1) c.climbEntry = undefined;
    const committed = physics && (this.isClimbing(c) || c.climbEntry === i1);
    const allowed = i0 === i1 || committed || this.canStep(c, i0, i1, true);
    if (physics && i0 !== i1 && allowed && !committed && N[i1] > P.needFloor && N[i1] > n0 && this.elevAt(c.x + c.vx, c.y + c.vy) > this.elevAt(c.x, c.y)) {
      const rise = Math.max(P.climbMinRise, (this.elevAt(c.x + c.vx, c.y + c.vy) - this.elevAt(c.x, c.y)) * P.heightMetres);
      c.climbing = { left: Math.min(P.climbMaxTicks, Math.ceil(rise / (P.climbUp * P.tickSeconds * climb * (this.rolled('climbweight') ? this.strength(c) / (mass(this.bodySize(c)) / mass(5)) : this.strength(c))))) };
      c.climbEntry = i1;
      const stamina = c.stamina; this.steer(c, 0, 0); c.stamina = stamina; // Limit the first step without a second wind recovery.
    }
    if (i0 !== i1 && !allowed) {
      // Like water round a rock (the reef rule): the smallest turn either way that finds passable ground; it remembers
      // the wall for a while, so its steering stops pressing into it and it walks along or away.
      const speed = Math.hypot(c.vx, c.vy), h = Math.atan2(c.vy, c.vx), side = Math.random() < 0.5 ? 1 : -1;
      const open = a => this.canStep(c, i0, cellAt(c.x + Math.cos(a) * speed, c.y + Math.sin(a) * speed), false);
      let a = null;
      for (const turn of [Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) { if (open(h + side * turn)) { a = h + side * turn; break; } if (open(h - side * turn)) { a = h - side * turn; break; } }
      if (a === null) { c.vx *= -0.5; c.vy *= -0.5; } else { c.vx = Math.cos(a) * speed * 0.9; c.vy = Math.sin(a) * speed * 0.9; }
      let nx = 0, ny = 0; // the wall's direction: toward the neighbouring cells it may not enter
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !this.canStep(c, i0, cellAt(c.x + dx * CELL, c.y + dy * CELL), false)) { const l = Math.hypot(dx, dy); nx += dx / l; ny += dy / l; }
      const nl = Math.hypot(nx, ny); c.wall = nl > 0.01 ? { x: nx / nl, y: ny / nl, until: this.tick + P.wallMemory } : { x: Math.cos(h), y: Math.sin(h), until: this.tick + P.wallMemory };
      this.turnedBack = (this.turnedBack ?? 0) + 1;
      if ((c.gateHits = (c.gateHits ?? 0) + 1) > 30) { c.home = { x: c.x, y: c.y }; c.gateHits = 0; } // kept back long enough, it makes this side its home
    }
    if (this.tick % 30 === 0) { // which lowland section it is in: north/south of the ridge line, west/east of the river (seam river to river)
      const xs = wrap(c.x - P.seamX, W), rx = wrap(P.riverX * W + 22 * Math.sin(c.y / 70) - P.seamX, W);
      const sec = (wrap(c.y, H) < P.ridgeY * H ? 'N' : 'S') + (xs < rx ? 'W' : 'E'), i = cellAt(c.x, c.y);
      const nearLine = Math.min(xs, W - xs, Math.abs(xs - rx)) < this.bandHalf(); // inside a channel bed it is on neither side yet
      if (!nearLine && this.reliefMap()[i] * this.reliefRise() + (this.tectonic?.[i] ?? 0) < 0.5) { // lowland by the land's shape (an eroded bed on the meseta is still the meseta)
        if (c.sec && c.sec !== sec) { const k = `${c.sec}>${sec}`; (this.crossings ??= {})[k] = (this.crossings[k] ?? 0) + 1; (this.crossAt ??= []).push([Math.round(c.x), Math.round(c.y), k]); if (this.crossAt.length > 60) this.crossAt.shift(); }
        c.sec = sec;
      }
    }
  }
  // Whether a body may step from cell i0 to i1 (chance: the soft margin is a coin; false: only a sure pass counts).
  canStep(c, i0, i1, chance) {
    if (i0 === i1) return true;
    const N = this.climbNeed(), m = P.skillMargin, pass = (skill, need) => chance ? Math.random() < clamp01((skill - need + m) / (2 * m)) : skill >= need;
    if (this.rolled('physics') && !this.registry[c.species].unique && N[i1] > P.needFloor && N[i1] > N[i0] && (c.climb ?? 0) <= N[i1]) return false;
    if (N[i1] > P.needFloor && N[i1] > N[i0] && !pass(c.climb ?? 0, N[i1])) return false; // gentle ground (a need under needFloor) asks nothing
    const s = this.sectionsRise(), legs = Math.max(1, (c.legs ?? 1) * this.bodySize(c));
    const need = i => { const d = this.water?.[i] ?? 0; if (d < 0.005) return 0; const w = this.waterAt(((i % GW) + 0.5) * CELL, (((i / GW) | 0) + 0.5) * CELL); return s * clamp01((w.d * P.depthPx / legs - 1) / P.swimSpan); };
    const n0 = need(i0), n1 = need(i1);
    if (n1 > P.needFloor && n1 > n0) return pass(c.swim ?? 0, n1);
    if (n0 > (c.swim ?? 0) + m && c.sec) { // caught in deep water past its swimming: it can only scramble out on its own side
      const gx = i1 % GW, gy = (i1 / GW) | 0, x1 = (gx + 0.5) * CELL, y1 = (gy + 0.5) * CELL;
      const side = wrap(x1 - P.seamX, W) < wrap(P.riverX * W + 22 * Math.sin(y1 / 70) - P.seamX, W) ? 'W' : 'E';
      if (side !== c.sec[1]) return false;
    }
    return true;
  }
  // How well a body reaches water plants where it stands: waders at the edge (water no deeper than its legs), swimmers anywhere.
  aquaAccess(c, i) { const d = this.water?.[i] ?? 0; if (d < 0.005) return 0; const deep = d * P.depthPx / Math.max(1, (c.legs ?? 1) * this.bodySize(c)), swim = c.swim ?? 0; return deep <= 1 ? 0.4 + 0.6 * swim : Math.min(1, 2 * swim); }
  // Water underfoot for a creature: its depth (0 if frozen or dry) and whether it is ice.
  waterAt(x, y) { const i = cellAt(x, y), d = this.water?.[i] ?? 0; if (d < 0.005) return { d: 0, ice: false, i }; const ice = this.tempAt(y, undefined, x) < P.freezeAt; return { d: ice ? 0 : d, ice, i }; }

  // Earthquakes, checked once a season: the next small one comes after a random 15–30 seasons; a big one is due at the
  // latest quakeBigWithin seasons after the last (and each quake has a small chance to be big anyway).
  quakeSeason() {
    if (!this.rolled('quakes')) return;
    const span = ([a, b]) => a + Math.random() * (b - a);
    this.lastBigQuake ??= this.season; this.nextQuake ??= this.season + Math.round(span(P.quakeEvery));
    const bigDue = this.season - this.lastBigQuake >= P.quakeBigWithin;
    if (this.season < this.nextQuake && !bigDue) return;
    const big = bigDue || Math.random() < P.quakeBigChance;
    this.earthquake(big);
    this.nextQuake = this.season + Math.round(span(P.quakeEvery));
    if (big) this.lastBigQuake = this.season;
  }
  earthquake(big, at) {
    const span = ([a, b]) => a + Math.random() * (b - a);
    const x0 = at?.x ?? Math.random() * W, y0 = at?.y ?? Math.random() * H, ang = Math.random() * Math.PI;
    const len = span(big ? P.quakeLenBig : P.quakeLenSmall), mag = span(big ? P.quakeBig : P.quakeSmall), ux = Math.cos(ang), uy = Math.sin(ang);
    const delta = (a, b, m) => { let d = (a - b) % m; if (d > m / 2) d -= m; if (d < -m / 2) d += m; return d; };
    let raised = 0, shattered = 0;
    for (let i = 0; i < GW * GH; i++) {
      const x = (i % GW + 0.5) * CELL, y = ((i / GW | 0) + 0.5) * CELL, dx = delta(x, x0, W), dy = delta(y, y0, H);
      const along = dx * ux + dy * uy, across = -dx * uy + dy * ux; // distance along the fault and across it
      if (Math.abs(along) > len / 2 + P.quakeWidth * 2) continue;
      const endFade = Math.max(0, Math.min(1, (len / 2 + P.quakeWidth * 2 - Math.abs(along)) / (P.quakeWidth * 2)));
      const fade = Math.exp(-((across / (P.quakeWidth * (big ? 2 : 1))) ** 2)) * endFade;
      if (fade < 0.02) continue;
      const lift = mag * fade * Math.sign(across || 1); // one side rises, the other drops
      this.tectonic[i] += lift; if (lift > 0) raised++;
      const near = Math.exp(-((across / 10) ** 2)) * endFade; // reef on the break shatters; its grains roll downhill
      if (near > 0.2 && this.reef[i] > 0.05) {
        const lost = this.reef[i] * P.quakeShatter * near; this.reef[i] -= lost; shattered++;
        for (let k = 0; k < Math.floor(lost / P.reefBuild * 2); k++) if (this.grains.length < P.reefGrains) this.grains.push({ x: i % GW, y: i / GW | 0, steps: 0 });
      }
    }
    // FOUR SECTIONS: the shaking brings cliffs down along the break: the land within screeWidth of the fault is smoothed
    // toward its neighbours (rock falls into scree), so a quake across a wall or an escarpment can open a way over it.
    if (this.rolled('sections')) {
      const R = this.reliefMap(), r = this.reliefRise(), at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW), zone = [];
      for (let i = 0; i < GW * GH; i++) { const x = (i % GW + 0.5) * CELL, y = ((i / GW | 0) + 0.5) * CELL, dx = delta(x, x0, W), dy = delta(y, y0, H); if (Math.abs(dx * ux + dy * uy) < len / 2 && Math.abs(-dx * uy + dy * ux) < P.screeWidth) zone.push(i); }
      const elev = i => R[i] * r + this.tectonic[i] - this.carve[i];
      for (let pass = 0; pass < 3; pass++) for (const i of zone) {
        const gx = i % GW, gy = i / GW | 0; let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += elev(at(gx + dx, gy + dy));
        this.tectonic[i] += 0.5 * (s / 9 - elev(i));
      }
    }
    // Bodies near the epicentre take fright.
    this.near(x0, y0, big ? 200 : 100, c => { if (!c.dead && !this.registry[c.species].unique) c.energy -= P.quakeFright * (big ? 1 : 0.4); });
    const dir = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][Math.round(((ang + Math.PI / 2) / (Math.PI * 2)) * 8) % 8];
    const where = Math.abs(delta(y0, P.ridgeY * H, H)) < P.mesetaHalf * H ? 'in the mountains' : 'in the lowlands';
    this.log(`${big ? 'A great earthquake' : 'The earth shakes'} ${where} (strength ${mag.toFixed(2)}): a fault ${Math.round(len)} px long breaks the ground; the land on its ${dir} side rises, the other side sinks${shattered ? `; reef shatters in ${shattered} places` : ''}.`);
    this.quakeNow = { x: Math.round(x0), y: Math.round(y0), ang: +ang.toFixed(3), len: Math.round(len), mag: +mag.toFixed(3), big, until: this.tick + 300 };
    (this.quakeLog ??= []).push({ season: this.season, x: this.quakeNow.x, y: this.quakeNow.y, ang: this.quakeNow.ang, len: this.quakeNow.len, mag: this.quakeNow.mag, big }); // for the reports' orography view
    if (this.quakeLog.length > 50) this.quakeLog.shift();
    this._reliefKey = null; this._needKey = null; this._rock = null; this.landChanged();
    return this.quakeNow;
  }

  // GRASS RAMP (Luis, s2013; proposal s2008 decision 7; rollout.grassramp): grass alone (not fruit, nuts, water plants or lichen)
  // grows poorer by grassRampCut over grassRampSeasons, so richer foods pay relatively more. The ramp freezes (what is applied stays)
  // if bodies fall under grassRampFloor or starvation is over grassRampStarve of a season's deaths: a brake on the change, not a rescue.
  grassRampSeason() {
    if (!this.rolled('grassramp') || this.grassRampFrozen) return;
    const tot = k => Object.values(this.stats).reduce((a, s) => a + (s[k] ?? 0), 0), now = { starved: tot('starved'), all: tot('starved') + tot('eaten') + tot('old') };
    const last = this.grassRampLast ?? now; this.grassRampLast = now;
    const died = now.all - last.all, starvedShare = died > 0 ? (now.starved - last.starved) / died : 0, bodies = this.creatures.filter(c => !c.dead).length;
    if ((this.grassLean ?? 1) < 1 && (bodies < P.grassRampFloor || starvedShare > P.grassRampStarve)) { this.grassRampFrozen = true; this.log(`The grass stops growing poorer: it holds at ${Math.round(this.grassLean * 100)}% (${bodies} bodies, ${Math.round(starvedShare * 100)}% of the season's deaths by hunger).`); return; }
    const f = Math.min(1, (this.season - this.rollout.grassramp + 1) / P.grassRampSeasons), lean = Math.round((1 - P.grassRampCut * f) * 1000) / 1000;
    if (lean !== this.grassLean) { this.grassLean = lean; this.log(`The grass grows poorer: it is worth ${Math.round(lean * 100)}% of what it was a few seasons ago.`); }
  }
  // Leaner grass, once a season: step the grass's worth down every leanEvery seasons until the room ceiling stops being touched.
  leanSeason() {
    if (!this.rolled('leaner') || this.leanDone) return;
    this.grassFood ??= 1; this.ceilingAt ??= this.tick; this.leanLast ??= this.season - P.leanEvery;
    const quiet = (this.tick - this.ceilingAt) / SEASON_TICKS;
    if (quiet >= P.leanQuiet) { this.leanDone = true; this.log(`The grass settles at ${Math.round(this.grassFood * 100)}% of its old worth: for ${P.leanQuiet} seasons the world has not filled its room — food sets the numbers now.`); return; }
    if (this.season - this.leanLast < P.leanEvery || this.grassFood <= P.leanFloor) return;
    const family = this.creatures.filter(c => !c.dead && !this.registry[c.species].unique).length;
    if (family < P.leanPause) { this.log(`The grass waits: only ${family} creatures live (under ${P.leanPause}).`); return; }
    this.grassFood = Math.max(P.leanFloor, Math.round(this.grassFood * P.leanStep * 1000) / 1000); this.leanLast = this.season;
    this.log(`The grass grows poorer: it is worth ${Math.round(this.grassFood * 100)}% of what it was.`);
  }

  endSeason() {
    this.leanSeason();
    this.grassRampSeason();
    this.quakeSeason();
    if (this.rollout?.sections !== undefined) { // the four sections: the season's crossings, and the chronicle of the change
      const s0 = this.rollout.sections, done = s0 + P.sectionsSeasons;
      if (this.season >= s0) { (this.records.sections ??= []).push({ season: this.season, rise: +this.sectionsRise().toFixed(2), crossings: this.crossings ?? {}, turnedBack: this.turnedBack ?? 0, fell: this.fell ?? 0 }); if (this.records.sections.length > 120) this.records.sections.shift(); }
      this.crossings = {}; this.turnedBack = 0; this.fell = 0;
      if (this.season === s0 - 1) this.log('The edges of the world begin to stir: a wall will rise along the top and bottom, a river cut along the left and right, a spine of crags along the range; the lowlands tilt toward the east.');
      if (this.season === done - 1) this.log('The land has settled into four lands, parted by crags and deep water: only climbers and swimmers pass, and the ice, the droughts and the quakes open the ways now and then.');
    }
    // For the machine's sake (Luis): the creature cap shrinks 10% a season until it is below capTarget.
    if (this.maxCreatures >= P.capTarget) {
      this.maxCreatures = Math.round(this.maxCreatures * 0.9);
      this.log(`The world grows smaller: room for ${this.maxCreatures} creatures now.`);
    }
    // The kraken's satiation follows the herds: hungrier while grazers are many, calmer as they thin (faster when scarce).
    const grazers = this.preyCount(), before = this.satiation;
    if (grazers > 500) this.satiation = Math.min(1, this.satiation + 0.01);
    else if (grazers >= 200) this.satiation = Math.max(0.85, this.satiation - 0.01);
    this.satiation = Math.round(this.satiation * 100) / 100;
    if (this.satiation !== before && this.speciesNames.some(n => this.registry[n].unique && this.lastCounts[n] > 0))
      this.log(`The kraken grows ${this.satiation > before ? 'hungrier' : 'calmer'}: it feeds below ${Math.round(this.satiation * 100)}% now (${grazers} grazers).`);
    const alive = this.living().filter(n => this.lastCounts[n] > 0);
    // A variant becomes a species when it can no longer breed with its parents' kind: they are gone, or its bodies
    // have grown too different (the same body gap that keeps any two creatures apart).
    for (const n of alive) {
      if (!this.isVariant(n)) continue;
      const r = this.registry[n], p = this.registry[r.parent];
      const gone = !p || p.extinct !== null || !(this.lastCounts[r.parent] > 0);
      const gap = p ? P.gutIsolation * Math.abs((r.avgGut ?? r.gut) - (p.avgGut ?? p.gut)) + P.sizeIsolation * Math.abs(Math.log((r.avgSize ?? r.size) / (p.avgSize ?? p.size))) : 0;
      if (!gone && gap < P.isolation) continue;
      r.graduated = this.season;
      this.log(`The ${plural(n)} (${r.lineage}), once a variant of the ${plural(r.parent)}, are a species of their own now: ${gone ? `the ${plural(r.parent)} are gone` : `their bodies have grown too different to breed with the ${plural(r.parent)}`}.`);
      this.onGraduate?.(n);
    }
    const variants = alive.filter(n => this.isVariant(n)).length;
    for (const n of alive) if (this.tick - (this.registry[n].releasedAt ?? 0) >= SEASON_TICKS) this.registry[n].established = true;
    const established = alive.filter(n => this.registry[n].born === this.season - 1); // born last season, alive through this one
    this.log(`Season ${this.season} ends. ${alive.length - variants} species live${variants ? `, and ${variants} variant${variants > 1 ? 's' : ''}` : ''}.` +
      (established.length ? ` ${established.map(plural).join(', ')} survived their first season.` : ''));
    this.season++;
    this.onSeason?.();
  }

  // --- for the viewer ---

  speciesList() {
    return this.speciesNames.map(name => {
      const { lineage, hue, shape, mark, parent, born, extinct, waiting, lastBranchGen } = this.registry[name];
      return { name, lineage, hue: tint(hue, this.registry[name].avgGut ?? this.registry[name].gut), shape, mark, parent, born, extinct, waiting: !!waiting, lastBranchGen, drift: this.registry[name].drift ?? 0, driftRoot: this.registry[name].driftRoot, bodyRoot: this.registry[name].bodyRoot, root: this.rootRef(name)?.name,
        variant: this.isVariant(name),
        code: extinct === null ? this.evolvedCode(name) : undefined };
    });
  }

  // Living species' measured roles and average bodies.
  traits() {
    const t = {};
    for (const name of this.living()) {
      const group = this.creatures.filter(c => c.species === name), n = group.length || 1;
      const sp = this.registry[name];
      t[name] = { tl: sp.tl, role: sp.role, size: r1(group.reduce((a, c) => a + c.size, 0) / n), gut: r2(group.reduce((a, c) => a + c.gut, 0) / n),
        legs: r2(group.reduce((a, c) => a + (c.legs ?? 1), 0) / n), fat: r2(group.reduce((a, c) => a + (c.fat ?? 0) / mass(this.bodySize(c)) / P.maxFat, 0) / n), wind: r2(group.reduce((a, c) => a + (c.wind ?? 0.5), 0) / n),
        plastic: r2(group.reduce((a, c) => a + (c.plastic ?? 0.2), 0) / n),
        armor: r2(group.reduce((a, c) => a + (c.armor ?? 0), 0) / n), toxin: r2(group.reduce((a, c) => a + (c.toxin ?? 0), 0) / n),
        label: sp.dietLabel ?? sp.role, food: sp.food,
        mature: r2(group.reduce((a, c) => a + (c.mature ?? 1), 0) / n), browse: r2(group.reduce((a, c) => a + (c.browse ?? 0), 0) / n), gape: r2(group.reduce((a, c) => a + (c.gape ?? 0.5), 0) / n), browsers: group.filter(c => this.browses(c)).length,
        minds: Object.entries(group.reduce((m, c) => { if (c.morph) m[c.morph] = (m[c.morph] ?? 0) + 1; return m; }, {})).map(([id, count]) => ({ what: sp.morphs?.[id]?.what, count })).sort((a, b) => b.count - a.count),
        decomp: r2(group.reduce((a, c) => a + (c.decomp ?? 0.03), 0) / n), parasitism: r2(group.reduce((a, c) => a + (c.parasitism ?? 0.03), 0) / n),
        swim: r2(group.reduce((a, c) => a + (c.swim ?? 0), 0) / n), climb: r2(group.reduce((a, c) => a + (c.climb ?? 0), 0) / n), bite: r2(group.reduce((a, c) => a + (c.bite ?? 0), 0) / n), snap: r2(group.reduce((a, c) => a + (c.snap ?? 0), 0) / n), coat: r2(group.reduce((a, c) => a + (c.coat ?? P.coatStart), 0) / n), water: r2(group.reduce((a, c) => a + (c.water ?? P.waterStart), 0) / n),
        resist: r2(group.reduce((a, c) => a + (c.resist ?? P.resistStart), 0) / n), eyes: r2(group.reduce((a, c) => a + (c.eyes ?? P.eyesStart), 0) / n),
        litter: r1(group.reduce((a, c) => a + (c.litter ?? 1), 0) / n), thrift: r2(group.reduce((a, c) => a + (c.thrift ?? 0.5), 0) / n), turning: group.filter(c => c.turning).length,
        // Who is what, one by one: bodies by gut (no jaws / both / meat only) and what each has mostly been eating.
        bodies: [group.filter(c => c.gut <= P.jaws).length, group.filter(c => c.gut > P.jaws && c.gut < 1 - P.jaws).length, group.filter(c => c.gut >= 1 - P.jaws).length],
        eating: ['plant', 'carrion', 'flesh'].map(d => group.filter(c => this.dietOf(c) === d).length) };
    }
    return t;
  }

  // Compact snapshot: [id, species, x, y, angle, energy, hue, flags (1 broken, 2 willing, 4 sprinting), size, legs, fatness, armour, heart rate] per creature.
  frame() {
    if (this._idxV !== (this._regVer ?? 0) || !this._idx) { this._idx = Object.fromEntries(this.speciesNames.map((n, i) => [n, i])); this._idxV = this._regVer ?? 0; } // cached per registry version
    const index = this._idx;
    const c = [];
    for (const k of this.creatures)
      c.push(k.id, index[k.species], r2(k.x), r2(k.y), r2(Math.atan2(k.vy, k.vx)), r2(k.energy / this.capOf(k)),
        shownHue(k), (k.broken ? 1 : 0) | (k.willing ? 2 : 0) | (k.sprinting ? 4 : 0) | (k.shove ? 8 : 0) | (k.infest > 0 ? 16 : 0) | (k.dormant ? 32 : 0) | (this.tick - (k.raged ?? -1e9) < 60 ? 64 : 0) | (k.age >= P.maturity * (k.mature ?? 1) ? 128 : 0), r1(this.bodySize(k)), r2(k.legs ?? 1), r2((k.fat ?? 0) / mass(this.bodySize(k)) / P.maxFat), r2(this.armorOf(k)), r2(k.pulse ?? 1),
        r2(Math.min(1.5, k.age / (k.lifespan || 1)))); // 128: mature (the breeding-age rule); last: age share of its natural life (viewer: young / adult / elder)
    const corpses = [];
    for (const k of this.corpses) corpses.push(Math.round(k.x), Math.round(k.y), r2(k.age / CORPSE_TICKS), k.cause === 'eaten' ? 1 : 0);
    const eggs = (this.eggs ?? []).flatMap(e => [Math.round(e.x), Math.round(e.y), Math.round((this.tick - e.laid) / (e.hatch - e.laid) * 1e4) / 1e4, index[e.species] ?? -1]); // progress, fine enough for a countdown
    return { iso: this.isoBox?.block ? this.isoBox : null, t: this.tick, season: this.season, rain: r2(this.rain()), c, corpses, eggs, cap: this.maxCreatures, divide: this.nextDivide(), kraken: this.krakenClock(), food: this.grassFood ?? 1, quake: this.quakeNow && this.tick < this.quakeNow.until ? this.quakeNow : undefined, temp: this.tick % 300 === 0 ? this.tempFrame() : undefined, mind: this.tick % 30 === 0 ? this.mindFrame() : undefined };
  }

  // Plants, moisture and fertility per cell, as base64 bytes.
  // The river for the viewer: depth per cell (0 to 127), +128 where it is frozen; and snow cover (0 to 255).
  waterFrame() {
    if (!this.rolled('water')) return null;
    const n = GW * GH, w = new Uint8Array(n), w2 = new Uint8Array(n), sn = new Uint8Array(n), era = this.tempEra();
    for (let i = 0; i < n; i++) {
      const d = this.water[i];
      if (d > 0.005) { const gx = i % GW, gy = (i / GW) | 0, ice = this.tempAt((gy + 0.5) * CELL, era, (gx + 0.5) * CELL) < P.freezeAt ? 128 : 0; w[i] = Math.min(127, Math.round(d * 600)) + ice; w2[i] = Math.min(127, Math.round(Math.sqrt(Math.min(1.5, d) / 1.5) * 127)) + ice; } // w2 (s1706, viewer request): finer, sqrt over 0…1.5
      sn[i] = Math.min(255, Math.round(this.snow[i] * 2000));
    }
    const aq = Uint8Array.from(this.aqua ?? [], v => Math.round(Math.min(1, v) * 255)), li = Uint8Array.from(this.lichen ?? [], v => Math.round(Math.min(1, v) * 255));
    return { w: Buffer.from(w).toString('base64'), w2: Buffer.from(w2).toString('base64'), w2Enc: 'sqrt1.5', snow: Buffer.from(sn).toString('base64'), aqua: Buffer.from(aq).toString('base64'), lichen: Buffer.from(li).toString('base64') };
  }

  terrain() {
    const buf = Buffer.alloc(GW * GH * 3);
    for (let i = 0; i < GW * GH; i++) {
      buf[i * 3] = this.plants[i] * 255;
      buf[i * 3 + 1] = this.moisture[i] * 255;
      buf[i * 3 + 2] = Math.min(1, this.fertility[i]) * 255;
    }
    return buf.toString('base64');
  }

  // --- persistence ---

  toJSON() {
    const round = a => Array.from(a, v => Math.round(v * 1000) / 1000);
    return {
      ...(this.rolled('physics') ? { climbTicks: this.climbTicks ?? 0 } : {}),
      ...(this.rollout?.tissue !== undefined ? { tissueLevel: this.tissueLevel, tissueFrozen: this.tissueFrozen, tissueSeasonAt: this.tissueSeasonAt } : {}),
      version: 3, tick: this.tick, season: this.season, nextId: this.nextId,
      registry: this.registry, code: this.code,
      plants: round(this.plants), fertility: round(this.fertility), reef: round(this.reef), mineral: round(this.mineral), grains: this.grains,
      creatures: this.creatures.map(c => { const { strengthTick, strengthNow, ...body } = c; return { ...body, memory: safeMemory(c.memory) }; }),
      corpses: this.corpses, eggs: this.eggs ?? [], waves: this.waves ?? [], satiation: this.satiation, grassFood: this.grassFood ?? 1, grassLean: this.grassLean, grassRampFrozen: this.grassRampFrozen, grassRampLast: this.grassRampLast, leanLast: this.leanLast, leanDone: this.leanDone ?? false, ceilingAt: this.ceilingAt, dominance: this.dominance ?? {}, rollout: this.rollout, ledger: this.ledger, mindBook: this.mindBook ?? [], maxCreatures: this.maxCreatures, thicket: round(this.thicket ?? []), rootHealth: round(this.rootHealth ?? []), grassHardy: round(this.grassHardy ?? []), grassSweet: round(this.grassSweet ?? []), water: Array.from(this.water ?? [], v => Math.round(v * 10000) / 10000), carve: Array.from(this.carve ?? [], v => Math.round(v * 10000) / 10000), sed: Array.from(this.sed ?? [], v => Math.round(v * 100000) / 100000), upheaval: this.upheaval ? { ...this.upheaval, applied: Array.from(this.upheaval.applied ?? [], v => Math.round(v * 10000) / 10000), byQuake: Array.from(this.upheaval.byQuake ?? [], v => Math.round(v * 10000) / 10000) } : undefined, alluv: Array.from(this.alluv ?? [], v => Math.round(v * 1000) / 1000), dungMap: Array.from(this.dungMap ?? [], v => Math.round(v * 100000) / 100000), snow: Array.from(this.snow ?? [], v => Math.round(v * 10000) / 10000), tectonic: Array.from(this.tectonic ?? [], v => Math.round(v * 10000) / 10000), aqua: Array.from(this.aqua ?? [], v => Math.round(v * 1000) / 1000), lichen: Array.from(this.lichen ?? [], v => Math.round(v * 1000) / 1000), insects: this.rolled('insects') ? Array.from(this.insects ?? [], v => Math.round(v * 1000) / 1000) : undefined, bloom: this.rolled('insects') ? Array.from(this.bloom ?? [], v => Math.round(v * 1000) / 1000) : undefined, trees: Array.from(this.trees ?? [], v => Math.round(v * 1000) / 1000), treeKind: Array.from(this.treeKind ?? []), fruit: Array.from(this.fruit ?? [], v => Math.round(v * 1000) / 1000), nuts: Array.from(this.nuts ?? [], v => Math.round(v * 1000) / 1000), cones: Array.from(this.cones ?? [], v => Math.round(v * 1000) / 1000), nextQuake: this.nextQuake, lastBigQuake: this.lastBigQuake, quakeLog: this.quakeLog ?? [], grooved: this.grooved ?? false, history: this.history, events: this.events,
      speciate: this.speciate ?? null,
      ...(this.fish ? { fish: Array.from(this.fish, v => Math.round(v * 1e4) / 1e4), fishLedger: this.fishLedger } : {}),
      ...(this.isoBox ? { isoBox: this.isoBox, isoBlocked: this.isoBlocked ?? 0, isoIn: this.isoIn ?? 0, isoOut: this.isoOut ?? 0 } : {}),
      ...(this.tune ? { tune: this.tune } : {}), // (s2235) the split counters survive restarts
      stats: this.stats, records: this.records, diet: this.diet, lastCounts: this.lastCounts, since: this.since, lessons: this.lessons, pendingStudies: this.pendingStudies,
    };
  }

  restore(s) {
    Object.assign(this, {
      tick: s.tick, season: s.season, nextId: s.nextId, registry: s.registry, code: s.code,
      creatures: s.creatures, corpses: s.corpses, eggs: s.eggs ?? [], waves: s.waves ?? [], maxCreatures: s.maxCreatures, satiation: s.satiation ?? 0.9, grassFood: s.grassFood ?? 1, grassLean: s.grassLean, grassRampFrozen: s.grassRampFrozen, grassRampLast: s.grassRampLast, leanLast: s.leanLast, leanDone: s.leanDone ?? false, ceilingAt: s.ceilingAt, dominance: s.dominance ?? {}, rollout: s.rollout, ledger: s.ledger, mindBook: s.mindBook ?? [], history: s.history, events: s.events,
      stats: s.stats, records: s.records, diet: s.diet, lastCounts: s.lastCounts, since: s.since, lessons: s.lessons ?? [], pendingStudies: s.pendingStudies ?? [],
    });
    this.tissueLevel = s.tissueLevel; this.tissueFrozen = s.tissueFrozen; this.tissueSeasonAt = s.tissueSeasonAt;
    this.climbTicks = s.climbTicks ?? 0;
    if (s.tune) { this.tune = s.tune; Object.assign(P, s.tune); } // (s2303, Luis's food-loop directive) live tuning saved with the world: parameter overrides, set by tools/restart.sh key=value
    if (s.speciate) this.speciate = s.speciate;
    if (s.isoBox) { this.isoBox = s.isoBox; this.isoBlocked = s.isoBlocked ?? 0; this.isoIn = s.isoIn ?? 0; this.isoOut = s.isoOut ?? 0; }
    this.plants = Float32Array.from(s.plants);
    this.fertility = Float32Array.from(s.fertility);
    if (s.thicket?.length) this.thicket = Float32Array.from(s.thicket);
    if (s.rootHealth?.length) this.rootHealth = Float32Array.from(s.rootHealth);
    if (s.grassHardy?.length) this.grassHardy = Float32Array.from(s.grassHardy);
    if (s.grassSweet?.length) this.grassSweet = Float32Array.from(s.grassSweet);
    if (s.water?.length) this.water = Float32Array.from(s.water);
    if (s.carve?.length) this.carve = Float32Array.from(s.carve);
    if (s.sed?.length) this.sed = Float32Array.from(s.sed);
    if (s.upheaval) this.upheaval = { ...s.upheaval, applied: Float32Array.from(s.upheaval.applied ?? []), byQuake: Float32Array.from(s.upheaval.byQuake ?? []) };
    if (s.alluv?.length) this.alluv = Float32Array.from(s.alluv);
    if (s.dungMap?.length) this.dungMap = Float32Array.from(s.dungMap);
    if (s.snow?.length) this.snow = Float32Array.from(s.snow);
    if (s.tectonic?.length) this.tectonic = Float32Array.from(s.tectonic);
    if (s.aqua?.length) this.aqua = Float32Array.from(s.aqua);
    if (s.lichen?.length) this.lichen = Float32Array.from(s.lichen);
    if (s.insects?.length) this.insects = Float32Array.from(s.insects);
    if (s.fish?.length) { this.fish = Float32Array.from(s.fish); this.fishLedger = s.fishLedger ?? {}; }
    if (s.bloom?.length) this.bloom = Float32Array.from(s.bloom);
    if (s.trees?.length) { this.trees = Float32Array.from(s.trees); this.treeKind = Uint8Array.from(s.treeKind ?? []); this.fruit = Float32Array.from(s.fruit ?? []); this.nuts = Float32Array.from(s.nuts ?? []); this.cones = Float32Array.from(s.cones ?? []); }
    this.nextQuake = s.nextQuake; this.lastBigQuake = s.lastBigQuake; this.quakeNow = null; this.quakeLog = s.quakeLog ?? [];
    this.grooved = s.grooved ?? false;
    if (s.reef) { this.reef = Float32Array.from(s.reef); this.mineral = Float32Array.from(s.mineral); this.grains = s.grains ?? []; }
    this.ensureBooks();
    // Older saves: judge each species from its record. Hunters by their lessons (a release that lasted a season);
    // others by having outlived the season after they were born.
    for (const [name, sp] of Object.entries(this.registry)) {
      if (sp.established !== undefined) continue;
      const runs = (this.lessons ?? []).filter(l => l.name === name);
      sp.established = runs.length ? runs.some(l => l.days * TICKS_PER_DAY >= SEASON_TICKS)
        : sp.extinct !== null ? sp.extinct - sp.born >= 2
        : !sp.waiting && (this.season - sp.born >= 2 || this.tick - (sp.releasedAt ?? 0) >= SEASON_TICKS);
    }
    // The seed species follow their files: if the god has rewritten one, the living world takes it up.
    // Bodies and looks stay as the world has evolved them.
    const strip = code => code.replace(/^\/\/ [†↺].*\n/gm, '');
    for (const [name, seed] of Object.entries(loadSeed())) {
      if (!this.registry[name]) {
        // A seed species new to this world: it joins the registry, extinct until the god sets it down.
        this.touchRegistry(); this.registry[name] = { ...seed, mark: 'none', parent: null, born: this.season, extinct: this.season, lastBranchGen: 0,
          lineage: this.rootLineage(name), branches: 0, role: roleOf(seed.tl), established: true };
        this.code[name] = readCode(name);
        this.ensureBooks();
        this.newSeeds = [...(this.newSeeds ?? []), name];
        continue;
      }
      const sp = this.registry[name];
      const { size, gut, tl, hue, shape, ...physiology } = seed;
      Object.assign(sp, physiology);
      const code = readCode(name);
      if (strip(code) !== strip(this.code[name])) {
        // Evolved numbers carry over only when the new code merely adds numbers after the old ones;
        // a real rewrite starts again from the numbers it was written with.
        const before = genomeOf(this.code[name]).consts, after = genomeOf(code).consts;
        if (!(after.length >= before.length && before.every((v, i) => after[i] === v))) {
          sp.meanK = undefined;
          (this.freshK ??= new Set()).add(name);
        }
        this.code[name] = code;
        this.log(`The god rewrites the ${plural(name)} (${sp.lineage}).`);
        this.rewritten = [...(this.rewritten ?? []), name];
      }
    }
  }
}
