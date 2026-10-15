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
const ATTENTION = 20, KIN_ATTENTION = 10, THINK_EVERY = 2; // the most neighbours, and the most patches of plants, a creature notices at once
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
  waves: 3, waveShare: 0.4, // returns come in this many waves, each this share of the species' seed base
  dungRange: 20,         // a beetle this close to a grazer finds its droppings …
  dungFeed: 0.018,       // energy a beetle near a grazer gets from its dung each pass (10 ticks), and soil it buries
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
  divideShare: 0.6, divideRest: TICKS_PER_DAY, divideMin: 15, divideGeo: 2, divideSeam: 0.15, // the great divide: whenever a species holds over divideShare of all life it is divided (checked every 30 ticks), then rests divideRest ticks; groups under divideMin join their neighbours
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
  splitMin: 15,          // a species splits in two when a group this big can no longer breed with the rest (10 → 15, Luis 10:10 Oct 15: groups under 10 never lasted, 15–24 lasted twice as long as 10–14)
  morphChoice: 0.1,
  // Rollout (Luis, 10:25 Oct 15), one per season: (1) kin — relatedness over the whole creature; (4) home — the
  // descendants keep a home range; (3) niche — a local group living differently splits off. world.rollout holds the seasons.
  kinCode: 0.5,          // (1) code numbers count at half weight (most drift neutrally) …
  kinBody: 1,            // … the 12 body traits from the genes (scaled as in the ancestry measure) at full weight …
  kinGenes: 0.3,         // … and the 4 personal genes at this weight
  homeRange: 120,        // (4) beyond this distance from its birthplace a body is pulled home …
  homePull: 1.0,         // … harder the further it strays (up to 1.5 × this)
  nicheShare: 0.6,       // (3) a body lives 'differently' when over this share of its food is browse, or meat (flesh + carrion) …
  nicheDays: 1,          // … and a local group of splitMin such bodies, held this many days, splits off      // a different mind (a hidden slip) counts this much against a pairing: like prefers like
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
const driftSize = s => Math.min(P.maxSize, Math.max(P.minSize, s * (1 + wobble(P.sizeDrift) + leap())));
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
const kinGenes = (a, b) => a.genes.reduce((s, g, i) => s + Math.abs(g - (b.genes[i] ?? g)), 0) / a.genes.length;
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
    this.traffic = new Float32Array(GW * GH);
    this.foul = new Float32Array(GW * GH); // ground soiled by infested hosts; fades, never saved
    for (const name of this.living()) { this.compile(name); this.compileMorphs(name); }
    this.ensureGenomes();
    this.rollout ??= { kin: this.season + 1, home: this.season + 2, niche: this.season + 3 }; // one change a season
    if (this.newSeeds?.some(n => this.registry[n].scavenger)) this.reintroduceScavengers();
    // A seed designed to be set down at once (the steward's new hunters) arrives as a pack.
    for (const n of this.newSeeds ?? []) if (this.registry[n].releaseOnArrival && (this.registry[n].avgGut ?? this.registry[n].gut) >= 0.5) this.reintroduce(true, n);
    this.updatePlants();
  }

  get speciesNames() { return Object.keys(this.registry); }
  living() { return this.speciesNames.filter(n => this.registry[n].extinct === null && !this.registry[n].waiting); }

  seed() {
    this.tick = 0;
    this.season = 1;
    this.nextId = 1;
    this.registry = {};
    this.code = {};
    for (const [name, sp] of Object.entries(loadSeed())) {
      this.registry[name] = { ...sp, mark: 'none', parent: null, born: 0, extinct: null, lastBranchGen: 0,
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
    return !!((mixes(ra) && ra.parent === b) || (mixes(rb) && rb.parent === a) || (mixes(ra) && mixes(rb) && ra.parent === rb.parent));
  }

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
    if (this.rolled('kin')) return P.kinCode * code + P.kinBody * kinBody(a, b) + P.kinGenes * kinGenes(a, b);
    return code + P.gutIsolation * Math.abs(a.gut - b.gut) + P.sizeIsolation * Math.abs(Math.log(a.size / b.size));
  }
  rolled(key) { return this.season >= (this.rollout?.[key] ?? Infinity); }

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
      energy: 1, age: 0, lifespan: Math.round(sp.lifespan * (0.7 + Math.random() * 0.6)), mature: driftMature(sp.avgMature ?? 1), browse: driftBrowse(sp.avgBrowse ?? 0.05), gape: driftGape(sp.avgGape ?? 0.5), resist: driftResist(sp.avgResist ?? P.resistStart), eyes: driftEyes(sp.avgEyes ?? P.eyesStart),
      gen, genes, size, gut, hue: sp.hue, memory: {}, broken: false,
      willing: false, give: 0.45, signal: 0, cooldown: 0, eats: true, k: this.jitterK(name),
      body: mass(size) * P.bodyEnergy * (gen > 0 ? P.bornBody : 1), // the god's newcomers arrive with full bodies
      legs: driftLegs(sp.avgLegs ?? 1), wind: driftWind(sp.avgWind ?? 0.5), stamina: 0, sprinting: false,
      plastic: driftPlastic(sp.avgPlastic ?? 0.2), bornGut: gut, shift: 0, hunger: 0, thrift: driftThrift(sp.avgThrift ?? 0.5),
      armor: driftArmor(sp.avgArmor ?? 0), toxin: driftToxin(sp.avgToxin ?? 0), litter: driftLitter(sp.avgLitter ?? 1), hueShift: driftHue(sp.avgHueShift ?? 0),
    };
  }

  // Room to breed. The creature cap is a limit of the machine, not of the land, so it must not protect whoever filled it
  // first: when the world is full only the crowded species stop breeding; a small one (under a fifth of the cap)
  // may still breed, up to a hard ceiling a little above the cap.
  room(name, total) {
    // Gradual crowding (Luis): births grow less likely as the world fills past crowdStart of its room, and most for the
    // commonest families, so rare lines keep a foothold and no family can monopolise it. A hard ceiling stays for the machine.
    const cap = this.maxCreatures ?? MAX_CREATURES;
    if (total >= cap * P.capCeiling) return false;
    const crowd = Math.max(0, (total / cap - P.crowdStart) / (P.capCeiling - P.crowdStart));
    if (!crowd) return true;
    if (this.familyTick !== this.tick) { // family counts, once per tick
      this.familyTick = this.tick; this.families = {};
      for (const c of this.creatures) if (!c.dead) { const r = (this.registry[c.species].lineage ?? c.species).split('.')[0]; this.families[r] = (this.families[r] ?? 0) + 1; }
    }
    const share = (this.families[(this.registry[name].lineage ?? name).split('.')[0]] ?? 0) / Math.max(1, total);
    return Math.random() < 1 - crowd * (0.3 + 0.7 * share);
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
    this.registry[name] = { ...p, ...this.distinctLook(p.tl >= 2.5), parent, born: this.season, extinct: null, lastBranchGen: 0,
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
    this.registry[name] = { ...p, ...this.distinctLook((p.avgGut ?? p.gut) >= 0.5), parent, born: this.season, extinct: null, waiting: true,
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
    sp.extinct = this.season;
    delete this.behaviors[name];
    delete this.lastCounts[name];
    const how = { starved: 'starving', old: 'of old age', eaten: 'in someone\'s jaws' }[this.lastDeath?.cause] ?? '';
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
    Object.assign(sp, { extinct: null, waiting: false, lastBranchGen: 0, releasedAt: this.tick, statsAtRelease: { ...this.stats[name] } });
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
      Object.assign(sp, { extinct: null, waiting: false, lastBranchGen: 0, releasedAt: this.tick, statsAtRelease: { ...this.stats[name] } });
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
        const d = (Math.random() * 4) | 0;
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

  // The thicket's life: it grows beside solid reef (from soil, with moisture), dies back where the reef is gone or
  // the ground is dry, and is worn by heavy traffic; whatever it loses returns to the soil.
  updateThicket() {
    const th = this.thicket, reef = this.reef, S = P.reefSolid, at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW);
    for (let i = 0; i < GW * GH; i++) {
      const x = i % GW, y = (i / GW) | 0;
      const edge = reef[i] < S && (reef[at(x + 1, y)] >= S || reef[at(x - 1, y)] >= S || reef[at(x, y + 1)] >= S || reef[at(x, y - 1)] >= S);
      const m = this.moisture[i] ?? 0.5, f = this.fertility[i];
      if (edge && m >= 0.3) {
        const g = P.thicketGrow * (P.thicketMax - th[i]) * (m + f) * (f / (f + (P.soilNeed || 0.1)));
        if (g > 0) { th[i] += g; this.fertility[i] = Math.max(0, f - g * P.thicketUptake); }
      } else if (edge && m >= P.thicketHardy) {
        // Thorny scrub is drought-hardy: in ordinary dryness it holds on, neither growing nor dying.
      } else if (th[i] > 0) {
        const d = Math.min(th[i], P.thicketDie);
        th[i] -= d; this.fertility[i] = Math.min(2, this.fertility[i] + d * P.thicketUptake);
      }
      const busy = Math.min(1, this.traffic[i] / P.busy);
      if (busy > 0 && th[i] > 0) { const d = Math.min(th[i], P.trample * busy); th[i] -= d; this.fertility[i] = Math.min(2, this.fertility[i] + d * P.thicketUptake); }
    }
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
  crowded(c) { let n = 0; this.near(c.x, c.y, P.crowdRange, o => { if (o !== c && !o.dead && o.species === c.species) n++; }); return n >= P.crowdCount; }
  // The beetle's role follows its life: a parasite-line body that lives on plants is a grazer (and a possible host).
  // How well a hunter's jaws suit a prey: 1 at its gape (prey/self size ratio), falling off with distance, never below gapeFloor.
  gapeFit(c, o) { const r = this.bodySize(o) / this.bodySize(c); return Math.max(P.gapeFloor, Math.exp(-(((r - (c.gape ?? 0.5)) / P.gapeWidth) ** 2))); }
  browses(c) { return (c.browse ?? 0) > P.browseMin && this.bodySize(c) >= P.browseSize && !this.registry[c.species].unique; }
  isParasite(c) { return !!this.registry[c.species].parasite && this.dietOf(c) !== 'plant'; } // what it lives on, not its jaws
  weakHost(c) { return c.energy < P.infestWeak * this.capOf(c) && !this.registry[c.species].unique && !this.isParasite(c); }
  infestations() {
    const dt = 10;
    for (const b of this.creatures) {
      if (b.dead || !this.isParasite(b)) continue;
      this.near(b.x, b.y, this.bodySize(b) + 6, o => {
        if (o.dead || o === b) return;
        if (o.infest > 0) { const take = Math.min(0.04, o.energy); o.energy -= take; b.energy += take * 0.5; const bd = this.diet[b.species]; bd.host = (bd.host ?? 0) + take * 0.5; bd.energy += take * 0.5; } // feeding on a host
        else if (this.weakHost(o) && Math.random() < P.infestCatch && this.crowded(o)) o.infest = 0.5;
      });
      // Dung: droppings lie all around a herd, so a beetle within dungRange of a grazer feeds on them and buries part.
      let dung = false, host = false;
      this.near(b.x, b.y, P.dungRange, o => {
        if (o.dead || this.isParasite(o) || this.registry[o.species].unique) return;
        if (o.infest > 0) host = true; else if (o.gut < 0.5) dung = true;
      });
      // An infested host nearby feeds the brood living on it (twice what dung gives): beetles boom with the infestation.
      const bd = this.diet[b.species];
      if (host) { b.energy += P.dungFeed * 2; bd.host = (bd.host ?? 0) + P.dungFeed * 2; bd.energy += P.dungFeed * 2; }
      else if (dung) { bd.dung = (bd.dung ?? 0) + P.dungFeed; bd.energy += P.dungFeed; b.energy += P.dungFeed; const i = cellAt(b.x, b.y); this.fertility[i] = Math.min(2, this.fertility[i] + P.dungFeed); }
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
      if (sp.extinct !== null) { sp.extinct = null; this.compile(e.species); this.onRevive?.(e.species); }
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

  thicketMap() {
    return Buffer.from(Uint8Array.from(this.thicket, v => Math.round(Math.min(1, v) * 255))).toString('base64');
  }

  // Plants are a cellular automaton: logistic growth, seeding from lush neighbours, drought, rot.
  updatePlants() {
    const t = this.tick, rain = this.rain(), prev = this.prev, fresh = t % (PLANT_EVERY * 8) === 0 || !this.moistureAt;
    if (fresh) this.moistureAt = t;
    if (P.smother) {
      (this.smothered ??= new Uint8Array(GW * GH)).fill(0);
      for (const k of this.corpses) if (k.energy > P.smother) this.smothered[cellAt(k.x, k.y)] = 1;
    }
    prev.set(this.plants);
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const i = gy * GW + gx;
        // Moisture drifts slowly, so its noise is only redrawn about once a second.
        const m = fresh ? (this.moisture[i] = clamp01(rain + (noise3(gx * 0.05, gy * 0.05, t * 0.0003) - 0.5) * 0.9)) : this.moisture[i];
        let lush = 0;
        const up = (gy === 0 ? GH - 1 : gy - 1) * GW, mid = gy * GW, down = (gy === GH - 1 ? 0 : gy + 1) * GW;
        const left = gx === 0 ? GW - 1 : gx - 1, right = gx === GW - 1 ? 0 : gx + 1;
        lush = (prev[up + left] > 0.4) + (prev[up + gx] > 0.4) + (prev[up + right] > 0.4) + (prev[mid + left] > 0.4) + (prev[mid + right] > 0.4)
          + (prev[down + left] > 0.4) + (prev[down + gx] > 0.4) + (prev[down + right] > 0.4);
        let b = prev[i];
        if (b > 0) {
          const f = this.fertility[i], before = b;
          if (!(P.smother && this.smothered[i])) {
            const grow = 0.05 * b * (1 - b) * (m + f) * (P.soilNeed ? f / (f + P.soilNeed) : 1) * (1 - P.thicketShade * this.thicket[i]) * this.rootHealth[i];
            b += grow;
            if (P.soilNeed) this.fertility[i] = Math.max(0, f - grow * P.uptake);
          }
          if (m < 0.3) b -= 0.02 * (0.3 - m);
          if (this.rootHealth[i] < 0.05) b = 0; // grazed to death: bare ground until seed comes back
          if (lush === 8 && Math.random() < 0.003) b *= 0.3; // crowded meadows rot from inside
          if (b < 0.02) b = 0;
          if (P.soilNeed && b < before) this.fertility[i] = Math.min(2, this.fertility[i] + (before - b) * P.uptake); // withered plants return to the soil
        } else if ((lush && Math.random() < 0.006 * lush * m) || Math.random() < P.seedBank * m * (0.1 + this.fertility[i])) {
          b = 0.05; this.rootHealth[i] = Math.max(this.rootHealth[i], 0.5); // a new sprout has young roots
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
    const cover = this.thicket[cellAt(c.x, c.y)] > 0.4 ? P.sightThicket : 1;
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

  hasJaws(c) { return c.gut > P.jaws; }
  grazes(c) { return c.gut < 1 - P.jaws; }
  // The body as it is now: juveniles are smaller than the adult size their genes promise.
  bodySize(c) { return P.growTicks ? c.size * Math.min(1, 0.4 + 0.6 * c.age / P.growTicks) : c.size; }
  // The defence a body actually carries: its gene's ceiling × what its food has supplied. Parasite lines (beetles)
  // and unique giants make theirs without help.
  toxinOf(c) { const sp = this.registry[c.species]; return (c.toxin ?? 0) * (sp.parasite || sp.unique ? 1 : c.toxStock ?? 1); }
  armorOf(c) { return (c.armor ?? 0) * (this.registry[c.species].unique ? 1 : c.minStock ?? 1); }
  canOverpower(c, o) { return this.hasJaws(c) && this.bodySize(c) >= this.bodySize(o) * P.overpower * (1 + P.armorGuard * this.armorOf(o)); }
  // Hunger overrides kinship: only a starving creature will eat its own kind.
  wouldEat(c, o) {
    // A creature that was sickened by prey of some colour shuns that colour until the memory fades.
    if (c.aversion?.s > 0.3 && hueApart(shownHue(o), c.aversion.hue) < P.aversionRange) return false;
    return o.species !== c.species || c.energy < P.cannibalHunger * this.registry[c.species].maxEnergy;
  }

  // What a creature knows. Positions are unwrapped relative to it, so plain subtraction works.
  // Its food is whatever it could actually eat: plants if it grazes, creatures it could overpower if it has jaws.
  sense(c) {
    const sp = this.registry[c.species], r = this.sight(c);
    const others = [], food = [];
    // Attention is limited: in a crowd a creature notices only its nearest neighbours.
    // Its own kind are always noticed first (up to KIN_ATTENTION), then the nearest of the rest (up to ATTENTION); in a
    // small crowd (ATTENTION or fewer in range) everyone is noticed. Kept as running nearest-k lists, not a full sort.
    const hide2 = P.hideRange ** 2, stealth2 = P.stealth ** 2, thicket2 = (sp.unique ? P.stealth : P.hideRange) ** 2;
    const all = [], kinTop = [], restTop = [];
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
            if (this.thicket[ci] > 0.4 && d2 > thicket2 && this.bodySize(o) < P.thicketHide) continue; // hidden in thicket (a giant feels through it within its reach)
          } else if (sp.unique && d2 > thicket2 && this.thicket[cellAt(o.x, o.y)] > 0.4 && this.bodySize(o) < P.thicketHide) continue;
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
      if (this.canOverpower(c, o) && this.wouldEat(c, o) && !(this.registry[c.species].unique && this.toxinOf(o) > (c.resist ?? 0.3))) food.push({ ...seen, plant: false }); // a giant does not chase what it would spit out
    }
    if (P.targetedHunger && this.registry[c.species].unique && this.preyRank) { // targeted hunger: it follows only the commonest kind in sight
      const rank = f => f.plant || f.corpse ? Infinity : this.preyRank[f.species] ?? 99, best = Math.min(...food.map(rank));
      if (best < Infinity) for (let i = food.length - 1; i >= 0; i--) if (!food[i].plant && !food[i].corpse && rank(food[i]) > best) food.splice(i, 1);
    }
    if (this.grazes(c)) {
      const browser = this.browses(c); // a big body with a browsing gut sees thicket shoots as food
      const patches = [], gx0 = Math.floor(c.x / CELL), gy0 = Math.floor(c.y / CELL);
      let enough = Infinity; // once ATTENTION patches are found, cells more than 1.5 cells further out cannot be nearer
      for (const [dx, dy, ring] of cellsWithin(Math.ceil(r / CELL) * CELL)) { // whole cells for the cache key (sight varies continuously); exact distance is checked below
        if (ring > enough) break;
        if (patches.length >= ATTENTION && enough === Infinity) enough = ring + 1.5;
        const gx = gx0 + dx, gy = gy0 + dy;
        const ci = (gy < 0 ? gy + GH : gy >= GH ? gy - GH : gy) * GW + (gx < 0 ? gx + GW : gx >= GW ? gx - GW : gx), b = this.plants[ci];
        const th = this.thicket[ci], shoots = browser ? (th - P.browseFloor) * (c.browse ?? 0) * 2 : 0;
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
      { width: W, height: H, t: this.tick, season: r2((this.tick % SEASON_TICKS) / SEASON_TICKS), food, others, noise: this.noiseFn, reef: this.reefRays(c, r) }, // season: 0 at its start … 1 at its end
    ];
  }

  step() {
    const t = ++this.tick;
    if (t % P.reefEvery === 0) { this.updateThicket(); this.updateReef(); }
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
        if (this.rolled('home') && !this.registry[name].unique) { // rollout 4: a home range, so local populations can form
          c.home ??= { x: c.x, y: c.y };
          const hx = delta(c.x, c.home.x, W), hy = delta(c.y, c.home.y, H), away = Math.hypot(hx, hy);
          if (away > P.homeRange) { const pull = P.homePull * Math.min(1.5, (away - P.homeRange) / P.homeRange); c.fx += hx / away * pull; c.fy += hy / away * pull; }
        }
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
      c.x = wrap(c.x + c.vx, W);
      c.y = wrap(c.y + c.vy, H);
      (c.gut >= 0.5 ? this.scentHunt : this.scentPrey)[cellAt(c.x, c.y)] += P.scent * mass(this.bodySize(c));
      c.pulse = this.heartRate(c);
      c.age += c.pulse; // age is counted in heartbeats
      if (c.digesting > 0) c.digesting--;
      if (c.cooldown > 0) c.cooldown -= c.pulse;
      const upkeep = Math.max(0.4, 1 + P.legUpkeep * (c.legs - 1) + P.windUpkeep * (c.wind - 0.5)) * (1 + P.fatUpkeep * this.fatLoad(c))
        * (1 + P.armorUpkeep * (c.armor ?? 0) + P.toxinUpkeep * (c.toxin ?? 0) + P.resistUpkeep * (c.resist ?? P.resistStart) + P.eyesUpkeep * ((c.eyes ?? P.eyesStart) - 0.5));
      if (c.aversion) { c.aversion.s *= P.aversionFade; if (c.aversion.s < 0.3) c.aversion = null; }
      const drag = 1 + P.fatDrag * (c.fat ?? 0) / mass(this.bodySize(c));
      c.energy -= sp.metabolism * k ** 0.75 * upkeep + sp.moveCost * k * drag * (c.vx * c.vx + c.vy * c.vy);
      if (c.fat > 0 && c.energy < this.capOf(c) * 0.3) { const d = Math.min(c.fat, P.fatBurn); c.fat -= d; c.energy += d * P.fatEfficiency; }
      this.eat(c, sp, k);
      this.plasticity(c, sp);
      if (c.energy <= 0) this.die(c, 'starved');
      else if (c.age > c.lifespan) this.die(c, 'old');
      else if (c.willing && !sp.unique && this.fertile(c) && this.room(c.species, this.creatures.length + born.length)) this.breed(c, sp, k, born);
    }
    this.creatures = this.creatures.filter(c => !c.dead).concat(born);

    for (const corpse of this.corpses) {
      corpse.age++;
      if (t % PLANT_EVERY === 0 && corpse.energy > 0) {
        const rotted = corpse.energy * P.rot, i = cellAt(corpse.x, corpse.y);
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
    if (t % TICKS_PER_DAY === 0) this.checkSplits();
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
      * (1 + P.fatUpkeep * this.fatLoad(c)) * (1 + P.armorUpkeep * (c.armor ?? 0) + P.toxinUpkeep * (c.toxin ?? 0) + P.resistUpkeep * (c.resist ?? P.resistStart) + P.eyesUpkeep * ((c.eyes ?? P.eyesStart) - 0.5));
    return (mass(this.bodySize(c)) / mass(P.heartSize)) ** -P.heartPower * (P.idleHeart + P.runHeart * speed) * (c.sprinting ? P.sprintHeart : 1) * Math.sqrt(bulk);
  }

  // Legs set the cruising speed. A sprint, while the stamina lasts, lifts the limit for a short burst.
  cruise(c) {
    const sp = this.registry[c.species];
    // A body that grows (the leviathan) slows as it grows: speed falls with the square root of its size.
    return sp.maxSpeed * (c.legs ?? 1) * (sp.grows ? Math.sqrt(sp.size / Math.max(sp.size, c.size)) : 1);
  }

  steer(c, fx, fy) {
    const sp = this.registry[c.species];
    // A starving body is weak: slower, and slow to get its wind back. Fat weighs a body down.
    const weak = P.weakest + (1 - P.weakest) * Math.min(1, c.energy / (this.capOf(c) * P.weakAt));
    const load = this.fatLoad(c), heavy = 1 - P.fatSlows * Math.min(1, load), nimble = Math.max(0.4, 1 - P.fatClumsy * load);
    c.sprinting = !!c.sprint && c.stamina >= 1;
    if (c.sprinting) c.stamina -= 1 + load;
    else c.stamina = Math.min(c.wind * P.windTicks, c.stamina + P.recover * weak * Math.max(0.3, 1 - 0.5 * load));
    const maxForce = sp.maxForce / Math.sqrt(this.scale(c)) * (c.sprinting ? P.sprintForce : 1) * nimble;
    const brush = 1 - P.thicketDrag * this.thicket[cellAt(c.x, c.y)] * Math.min(1, (sp.girth ?? this.bodySize(c)) / P.thicketBig); // thicket slows, big bodies most
    const limit = Math.min(P.speedCap, this.cruise(c) * (c.sprinting ? P.sprintBoost : 1) * weak * heavy * (1 - P.armorSlow * this.armorOf(c)) * brush);
    const m = Math.hypot(fx, fy);
    if (m > maxForce) { fx *= maxForce / m; fy *= maxForce / m; }
    c.vx += fx;
    c.vy += fy;
    const s = Math.hypot(c.vx, c.vy);
    if (s > limit) { c.vx *= limit / s; c.vy *= limit / s; }
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
      const reach = (me + this.bodySize(o)) * (sp.gulpReach ?? P.gulpReach) + 2;
      if (eaten.length < (sp.gulp ?? P.gulp) && o !== c && !o.dead && !(this.toxinOf(o) > (c.resist ?? 0.3) + P.tolerate) && this.canOverpower(c, o) && this.wouldEat(c, o) && dx * dx + dy * dy <= reach * reach) eaten.push(o);
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
      this.feed(c, meat * (1 - P.scraps) * c.gut ** P.fleshPower * P.fleshEfficiency * (1 - over), level, 'flesh');
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
    // What a grazer carries: dung dropped as it goes (fertility moves to where it rests), seeds that sprout on bare ground.
    if (c.dung > 0.001 || c.seeds > 0.05) {
      const j = cellAt(c.x, c.y);
      if (c.dung > 0.001) { const d = c.dung * P.dungDrop; c.dung -= d; this.fertility[j] = Math.min(2, this.fertility[j] + d); }
      if (c.seeds > 0.05) {
        if (this.plants[j] === 0 && this.reef[j] < P.reefSolid && Math.random() < P.seedDrop * c.seeds * this.moisture[j]) { this.plants[j] = 0.05; this.rootHealth[j] = Math.max(this.rootHealth[j], 0.5); }
        c.seeds *= P.seedCarry;
      }
    }
    c.toxStock = (c.toxStock ?? 1) * (1 - P.storeFade); c.minStock = (c.minStock ?? 1) * (1 - P.storeFade); // defences fade without supply
    if (c.eats !== false) {
      if (this.grazes(c)) {
        const i = cellAt(c.x, c.y), guard = Math.max(0, 1 - this.thicket[i] / 0.5); // grass inside dense thicket is out of reach
        const bite = Math.max(0, Math.min(sp.biteSize * Math.sqrt(k) * (1 - c.gut) * guard, this.plants[i] - P.roots)); // roots survive
        this.plants[i] -= bite;
        this.feed(c, bite * P.plantEnergy * (1 - c.gut) ** 2 * (1 - P.browseCost * (c.browse ?? 0)), 1, 'plant'); // a browsing gut grazes worse
        if (bite > 0) {
          if (this.plants[i] < P.roots + 0.05) this.rootHealth[i] = Math.max(0, this.rootHealth[i] - P.rootWear); // bitten to the roots
          c.dung = (c.dung ?? 0) + bite * P.dungShare; c.seeds = 1; // it carries the meal on as dung, and seeds
        }
        // Defences from food: hedge plants carry toxin, ground by the reef carries minerals for a shell.
        // Toxin: a body in the hedge nibbles its leaves whether or not there is grass to bite.
        c.toxStock = Math.min(1, (c.toxStock ?? 1) + P.toxinGain * this.thicket[i]);
        if (bite > 0) c.minStock = Math.min(1, (c.minStock ?? 1) + P.mineralGain * Math.min(1, this.reefNear(i) + this.mineral[i] * 4));
        // Browse: a big enough body with a browsing gut eats thicket shoots, down to a floor (the hedge survives as a refuge).
        if (this.browses(c) && this.thicket[i] > P.browseFloor) {
          const shoots = Math.min(this.thicket[i] - P.browseFloor, P.browseBite * Math.sqrt(k) * c.browse);
          this.thicket[i] -= shoots;
          this.feed(c, shoots * P.browseEnergy * (1 - c.gut) * c.browse, 1, 'browse');
          c.toxStock = Math.min(1, (c.toxStock ?? 1) + P.toxinGain * 2 * this.thicket[i]);
        }
      }
      if (sp.filter) this.gulp(c, sp);
      else if (this.hasJaws(c) && !(c.digesting > 0)) {
        let prey = null;
        const me = this.bodySize(c);
        this.near(c.x, c.y, me + 8, (o, dx, dy) => {
          const reach = (me + this.bodySize(o)) * 0.6 + 2;
          if (!prey && o !== c && !o.dead && this.canOverpower(c, o) && this.wouldEat(c, o) && dx * dx + dy * dy <= reach * reach && Math.random() < this.gapeFit(c, o)) prey = o; // ill-fitting prey often slip away
        });
        if (prey) {
          const preyMass = mass(this.bodySize(prey)), meat = Math.max(0, prey.energy) + this.bodyHeld(prey), level = this.registry[prey.species].tl;
          this.die(prey, 'eaten');
          this.stats[c.species].kills++;
          // Everyone with jaws nearby grabs a share, the killer included; the more crowded, the less each gets.
          const diners = [c];
          this.near(c.x, c.y, P.shareRange, o => { if (o !== c && !o.dead && this.hasJaws(o) && o.eats !== false) diners.push(o); });
          // The killer eats first (killerShare); the rest is shared among everyone at the kill, the killer included.
          const served = meat * (1 - P.scraps), rest = served * (1 - P.killerShare) / diners.length, toxin = this.toxinOf(prey);
          for (const d of diners) {
            const bite = Math.max(0, toxin - (d.resist ?? 0)); // only toxin beyond the eater's resistance harms it
            this.feed(d, (d === c ? served * P.killerShare * this.gapeFit(c, prey) + rest : rest) * d.gut ** P.fleshPower * P.fleshEfficiency * (1 - bite), level, 'flesh'); // the killer gets most from prey its jaws suit
            if (bite > 0.05) {
              d.energy -= bite * P.toxinHarm; const hue = shownHue(prey); d.aversion = { hue, s: 1 };
              // Watching one of its own get sick teaches the others nearby too (a little less strongly).
              this.near(d.x, d.y, P.warnRange, o => { if (o !== d && !o.dead && o.species === d.species && !(o.aversion?.s > 0.8)) o.aversion = { hue, s: 0.8 }; });
            }
          }
          c.digesting = Math.round(P.handling * Math.sqrt(preyMass / mass(me)));
        }
      }
      // Carrion does not fight back: a gut barely past grass can already tear at a corpse it touches (a step toward meat).
      if (c.gut > P.carrionGut) {
        const me = this.bodySize(c), k2 = Math.sqrt(k);
        for (const corpse of this.corpses) {
          if (!(corpse.energy > 0.01)) continue;
          const dx = delta(c.x, corpse.x, W), dy = delta(c.y, corpse.y, H), reach = me * 0.6 + 4;
          if (dx * dx + dy * dy > reach * reach) continue;
          const bite = Math.min(corpse.energy, P.carrionBite * k2 * (sp.soilEngineer ? 2 : 1)); // beetles break carcasses down fast
          if (sp.soilEngineer) { const ci = cellAt(corpse.x, corpse.y); this.fertility[ci] = Math.min(2, this.fertility[ci] + bite * P.beetleSoil); }
          corpse.energy -= bite;
          if (P.carrionDung) { const i = cellAt(corpse.x, corpse.y); this.fertility[i] = Math.min(2, this.fertility[i] + bite * P.carrionDung); }
          this.feed(c, bite * this.carrionDigests(c.gut), this.registry[corpse.species]?.tl ?? 2, 'carrion');
          break;
        }
      }
    }
    const cap = this.capOf(c);
    if (c.energy > cap) { this.store(c, c.energy - cap); c.energy = cap; }
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
  carrionDigests(gut) {
    return P.carrionPeak ? P.carrionEfficiency * Math.max(0, 1 - Math.abs(gut - P.carrionPeak) / P.carrionWidth) : gut * P.carrionEfficiency;
  }

  feed(c, energy, foodLevel, kind) {
    if (energy <= 0) return;
    const carrion = kind === 'carrion', max = this.capOf(c);
    const thrift = c.thrift ?? 0.5, share = P.fatShare * (0.5 + thrift);
    if (c.energy > max * (P.fatAbove + (0.5 - thrift) * 0.4)) { this.store(c, energy * share); c.energy += energy * (1 - share); }
    else c.energy += energy;
    c.ate = (c.ate ?? 0) + energy;
    if (carrion) c.carrion = (c.carrion ?? 0) + energy;
    if (kind === 'plant' || kind === 'browse') c.grazed = (c.grazed ?? 0) + energy;
    if (kind === 'browse') c.browsed = (c.browsed ?? 0) + energy;
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
    return c.age > Math.max(P.maturity * (c.mature ?? 1), P.growTicks * 0.75) && !(c.cooldown > 0) && !c.broken;
  }

  // Two willing kin who touch have a child together, each giving their chosen share of energy.
  // A willing creature with no partner can bud alone, but only when very well fed, and most of the gift is lost.
  // Children inherit body and genes (from one parent or the other) with a little drift.
  breed(c, sp, k, born) {
    let partner = null;
    this.near(c.x, c.y, Math.max(P.mateReach, c.size * 2), o => { // tiny bodies still need a little room to find each other
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
      const gift = c.give * c.energy + partner.give * partner.energy;
      if (gift < P.minChild) return;
      c.energy -= c.give * c.energy;
      partner.energy -= partner.give * partner.energy;
      const pick = pickOf, n = this.litterOf(pick(c.litter, partner.litter), gift), mixed = c.species !== partner.species || (c.morph ?? 0) !== (partner.morph ?? 0);
      for (let i = 0; i < n; i++) {
        const genes = c.genes.map((g, j) => drift(pick(g, partner.genes[j])));
        // Same kind: code numbers mix. Across a slip: the child takes one parent's whole mind.
        const mind = mixed ? pick(c, partner) : c;
        const k = mixed ? mind.k.map(driftK) : c.k.map((v, j) => driftK(pick(v, partner.k[j])));
        born.push(this.child(mind, (c.x + partner.x) / 2, (c.y + partner.y) / 2, gift / n, genes, (mixed ? mind.gen : Math.max(c.gen, partner.gen)) + 1,
          driftSize(pick(c.sizeGene ?? c.size, partner.sizeGene ?? partner.size)), driftGut(pick(this.heritableGut(c), this.heritableGut(partner))), k,
          this.inherit(c, partner)));
      }
      this.maybeSlip(born.slice(-n));
      partner.cooldown = P.refractory;
      this.stats[c.species].mated++;
    } else if ((c.longing = (c.longing ?? 0) + 1) >= P.budWait && c.energy >= sp.reproduceAt) { // budding alone: a last resort after a long, fruitless wait
      c.longing = 0;
      const gift = c.give * c.energy, kept = gift * (1 - P.budLoss);
      if (kept < P.minChild) return;
      c.energy -= gift;
      const n = this.litterOf(c.litter, kept);
      for (let i = 0; i < n; i++)
        born.push(this.child(c, c.x, c.y, kept / n, c.genes.map(drift), c.gen + 1, driftSize(c.sizeGene ?? c.size), driftGut(this.heritableGut(c)), c.k.map(driftK),
          this.inherit(c, c)));
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
      mature: driftMature(pick(a.mature, b.mature)), browse: driftBrowse(pick(a.browse, b.browse)), gape: driftGape(pick(a.gapeGene ?? a.gape, b.gapeGene ?? b.gape)), resist: driftResist(pick(a.resist, b.resist)), eyes: driftEyes(pick(a.eyes, b.eyes)),
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

  child(parent, x, y, energy, genes, gen, size, gut, k, traits) {
    const kid = this.spawn(parent.species, x + Math.random() * 8 - 4, y + Math.random() * 8 - 4, gen, genes, size, gut);
    Object.assign(kid, traits);
    // Birth variation: the body differs by chance from the genes it carries (sizeGene, bornGut, gapeGene pass on; the luck does not).
    kid.sizeGene = size; kid.size = Math.min(P.maxSize, Math.max(P.minSize, size * (1 + gauss() * P.birthSize)));
    kid.bornGut = gut; kid.gut = clamp01(gut + gauss() * P.birthGut);
    kid.gapeGene = kid.gape; kid.gape = Math.min(P.gapeMax, Math.max(P.gapeMin, (kid.gape ?? 0.5) + gauss() * P.birthGape));
    kid.lifespan = Math.round(kid.lifespan * (1 + P.matureLife * ((kid.mature ?? 1) - 1))); // late maturers live longer
    kid.energy = energy * (1 - P.bodyShare);
    kid.body += energy * P.bodyShare;
    kid.k = k;
    kid.morph = parent.morph ?? 0; // the mind it took (its parent's hidden slip, if any)
    kid.home = { x: kid.x, y: kid.y }; // where it was born
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
    return (c.body ?? mass(this.bodySize(c)) * P.bodyEnergy * (c.gen > 0 ? P.bornBody : 1)) + (c.fat ?? 0);
  }

  die(c, cause) {
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
        this.log(`The oldest ${c.species} ever recorded (age ${c.age.toLocaleString('en')}, generation ${c.gen}) ${cause === 'old' ? 'dies of old age' : cause === 'eaten' ? 'is eaten' : 'starves'}.`);
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
      // When full, thin out only the older half, so recent seasons keep their detail.
      if (this.history.length > HISTORY_MAX) { const half = this.history.length >> 1; this.history = this.history.filter((_, i) => i >= half || i % 2 === 0); }
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
        const foods = ['grass', 'browse', 'carrion', 'flesh', 'host', 'dung'], total = foods.reduce((t, k) => t + (d[k] ?? 0), 0) || 1;
        const f = k => (d[k] ?? 0) / total, plants = f('grass') + f('browse');
        const label = f('host') + f('dung') > 0.5 ? (f('host') >= f('dung') ? 'parasite' : 'decomposer')
          : f('carrion') > 0.5 ? 'scavenger'
          : f('flesh') > 0.5 ? (sp.role === 'apex' ? 'apex' : 'hunter')
          : plants > 0.7 ? (f('browse') > 0.6 * plants ? 'browser' : f('browse') > 0.2 * plants ? 'mixed feeder' : 'grazer')
          : 'omnivore';
        if (label !== sp.dietLabel && sp.dietLabel && (this.lastCounts[name] ?? 0) >= 5 && this.tick - (sp.labelLogged ?? -1e9) > TICKS_PER_DAY) {
          sp.labelLogged = this.tick; // at most one announcement a day per species, so a borderline diet does not flicker
          const said = { grazer: 'grazers: they live on grass', browser: 'browsers: they live on thicket shoots', 'mixed feeder': 'mixed feeders: grass and thicket shoots alike',
            scavenger: 'scavengers: they live on the dead', hunter: 'hunters: they live on what they kill', apex: 'apex predators: they hunt hunters',
            omnivore: 'omnivores: plants and flesh alike', decomposer: 'decomposers: they live on dung and remains', parasite: 'parasites: they live on infested hosts' }[label];
          this.log(`The ${plural(name)} (${sp.lineage}) have become ${said}.`);
        }
        sp.dietLabel = label;
        sp.food = Object.fromEntries(['grass', 'browse', 'carrion', 'flesh', 'host', 'dung'].map(k => [k, r2(f(k))]));
      }
      for (const k of ['energy', 'levels', 'carrion', 'grass', 'browse', 'flesh', 'host', 'dung']) d[k] = (d[k] ?? 0) * 0.95;
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
        const g = this.genome[`${name}#${id}`], n = g.consts.length, values = [];
        for (let j = 0; j < n; j++) values.push(Math.exp(carriers.reduce((a, c) => a + Math.log(Math.max(1e-9, c.k[j])), 0) / carriers.length));
        const what = this.registry[name].morphs[id].what;
        this.splitSpecies(name, carriers, values, `${name}#${id}`, `${carriers.length} ${plural(name)} who think differently (${what}) have become a kind of their own`);
        delete this.registry[name].morphs[id];
      }
      if (this.rolled('niche')) this.nicheSplit(name);
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
      this.splitSpecies(name, local, (smallIsA ? a : b).l.map(Math.exp));
    }
  }

  // How a body lives (rollout 3): 'browse' or 'meat' when over nicheShare of what it has eaten comes from there, else 'grass'.
  nicheOf(c) {
    const ate = c.ate ?? 0; if (ate < 0.5) return 'grass';
    const meat = ate - (c.grazed ?? 0);
    return meat / ate > P.nicheShare ? 'meat' : (c.browsed ?? 0) / ate > P.nicheShare ? 'browse' : 'grass';
  }
  // A local group of splitMin bodies of a species living differently (browsing, or eating meat), seen on nicheDays daily
  // checks in a row, becomes a kind of its own.
  nicheSplit(name) {
    const sp = this.registry[name], group = this.creatures.filter(c => !c.dead && c.species === name && !c.morph && c.k?.length);
    sp.nicheSeen ??= {};
    for (const niche of ['browse', 'meat']) {
      const them = group.filter(c => this.nicheOf(c) === niche);
      if (them.length < P.splitMin || them.length > group.length - P.splitMin) { delete sp.nicheSeen[niche]; continue; }
      const near = (p, q) => Math.hypot(delta(p.x, q.x, W), delta(p.y, q.y, H)) < P.splitRange;
      let local = [];
      for (const centre of them) { const here = them.filter(c => near(centre, c)); if (here.length > local.length) local = here; }
      if (local.length < P.splitMin) { delete sp.nicheSeen[niche]; continue; }
      if ((sp.nicheSeen[niche] = (sp.nicheSeen[niche] ?? 0) + 1) < P.nicheDays + 1) continue;
      const values = local[0].k.map((_, j) => Math.exp(local.reduce((a, c) => a + Math.log(Math.max(1e-9, c.k[j])), 0) / local.length));
      this.splitSpecies(name, local, values, name, `${local.length} ${plural(name)} that live ${niche === 'meat' ? 'on meat' : 'by browsing'} have become a kind of their own`);
      delete sp.nicheSeen[niche];
      return;
    }
  }

  // Vicariance (Luis): a species is divided along its own seams. K-means on where its members live (on the wrapped
  // land: each axis as a circle) and what they are (body traits, standardised), place weighted divideGeo : 1 over
  // kind; 2 to 4 groups, as many as separate best (silhouette). Groups under divideMin join their nearest neighbour.
  // With no real structure (silhouette below divideSeam), it falls back to four equal parts cut at the medians.
  // The largest group keeps the name.
  vicariance(parent) {
    const group = this.creatures.filter(c => !c.dead && c.species === parent && c.k?.length);
    if (group.length < 2 * P.divideMin) return;
    let parts = this.divideByKind(group);
    const seams = !!parts;
    if (!parts) { // the median cut
      const byX = group.slice().sort((a, b) => a.x - b.x), half = Math.ceil(byX.length / 2);
      parts = [];
      for (const side of [byX.slice(0, half), byX.slice(half)]) {
        const byY = side.sort((a, b) => a.y - b.y), mid = Math.ceil(byY.length / 2);
        parts.push(byY.slice(0, mid), byY.slice(mid));
      }
    }
    const order = parts.filter(q => q.length >= P.divideMin).sort((a, b) => b.length - a.length);
    if (order.length < 2) return;
    this.log(seams
      ? `The ${plural(parent)} divide along their own seams: ${order.length} groups${this.divideNote ? ` (${this.divideNote})` : ''}. None can breed with the others any more.`
      : `The land is cut in four. The ${plural(parent)} of each part can no longer breed with the others.`);
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

  // The kraken's map for the viewer (its 'mind' overlay): trap and food values, rounded.
  mindFrame() {
    const k = this.creatures.find(c => !c.dead && c.mind);
    return k ? { w: P.mindW, h: P.mindH, trap: k.mind.trap.map(v => Math.round(v * 100) / 100), food: k.mind.food.map(v => Math.round(v * 100) / 100) } : null;
  }

  // The next great divide, as the world stands: the species over divideShare of all life now, and the ticks until its
  // rest after its last divide is over (0: it divides at the next check). Null when no species is that dominant.
  nextDivide() {
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
    const [name, share] = this.leader();
    if (!name || share <= P.divideShare || this.tick - (this.registry[name].dividedAt ?? -Infinity) < P.divideRest) return;
    const before = new Set(this.speciesNames);
    this.vicariance(name);
    this.registry[name].dividedAt = this.tick;
    for (const n of this.speciesNames) if (!before.has(n)) this.registry[n].dividedAt = this.tick; // the new species rest too
  }

  // K-means over place and kind; returns the groups, or null when the members show no real structure.
  divideByKind(group) {
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
    for (let k = 2; k <= 4; k++) { const label = kmeans(k), sc = silhouette(label); if (!best || sc > best.sc) best = { label, sc, k }; }
    if (best.sc < P.divideSeam) { this.divideNote = null; return null; }
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

  splitSpecies(parent, members, values, mindKey = parent, story = null) {
    const p = this.registry[parent], g = this.genome[mindKey];
    let name;
    do { name = inventName(); } while (this.speciesNames.includes(name) || this.isTaken?.(name));
    p.branches = (p.branches ?? 0) + 1;
    this.registry[name] = { ...p, ...this.distinctLook(p.tl >= 2.5), parent, born: this.season, extinct: null, waiting: false, lastBranchGen: 0,
      lineage: `${p.lineage}.${p.branches}`, branches: 0, meanK: undefined, drift: 0, releasedAt: this.tick,
      // A split keeps its parent's reference body: physiology scales from it, and a new reference at the members' own size
      // would make a split pay more upkeep per meal than its parents, beside them, and starve.
      morphs: undefined, morphSeq: 0, size: p.size, gut: r2(members.reduce((a, c) => a + c.gut, 0) / members.length),
      avgSize: undefined, avgGut: undefined, slip: undefined, variant: false, graduated: undefined };
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
  endSeason() {
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
    const index = Object.fromEntries(this.speciesNames.map((n, i) => [n, i]));
    const c = [];
    for (const k of this.creatures)
      c.push(k.id, index[k.species], r2(k.x), r2(k.y), r2(Math.atan2(k.vy, k.vx)), r2(k.energy / this.capOf(k)),
        shownHue(k), (k.broken ? 1 : 0) | (k.willing ? 2 : 0) | (k.sprinting ? 4 : 0) | (k.shove ? 8 : 0) | (k.infest > 0 ? 16 : 0) | (k.dormant ? 32 : 0) | (this.tick - (k.raged ?? -1e9) < 60 ? 64 : 0), r1(this.bodySize(k)), r2(k.legs ?? 1), r2((k.fat ?? 0) / mass(this.bodySize(k)) / P.maxFat), r2(this.armorOf(k)), r2(k.pulse ?? 1));
    const corpses = [];
    for (const k of this.corpses) corpses.push(Math.round(k.x), Math.round(k.y), r2(k.age / CORPSE_TICKS), k.cause === 'eaten' ? 1 : 0);
    const eggs = (this.eggs ?? []).flatMap(e => [Math.round(e.x), Math.round(e.y), Math.round((this.tick - e.laid) / (e.hatch - e.laid) * 1e4) / 1e4, index[e.species] ?? -1]); // progress, fine enough for a countdown
    return { t: this.tick, season: this.season, rain: r2(this.rain()), c, corpses, eggs, cap: this.maxCreatures, divide: this.nextDivide(), kraken: this.krakenClock(), mind: this.tick % 30 === 0 ? this.mindFrame() : undefined };
  }

  // Plants, moisture and fertility per cell, as base64 bytes.
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
      version: 3, tick: this.tick, season: this.season, nextId: this.nextId,
      registry: this.registry, code: this.code,
      plants: round(this.plants), fertility: round(this.fertility), reef: round(this.reef), mineral: round(this.mineral), grains: this.grains,
      creatures: this.creatures.map(c => ({ ...c, memory: safeMemory(c.memory) })),
      corpses: this.corpses, eggs: this.eggs ?? [], waves: this.waves ?? [], satiation: this.satiation, dominance: this.dominance ?? {}, rollout: this.rollout, mindBook: this.mindBook ?? [], maxCreatures: this.maxCreatures, thicket: round(this.thicket ?? []), rootHealth: round(this.rootHealth ?? []), history: this.history, events: this.events,
      stats: this.stats, records: this.records, diet: this.diet, lastCounts: this.lastCounts, since: this.since, lessons: this.lessons, pendingStudies: this.pendingStudies,
    };
  }

  restore(s) {
    Object.assign(this, {
      tick: s.tick, season: s.season, nextId: s.nextId, registry: s.registry, code: s.code,
      creatures: s.creatures, corpses: s.corpses, eggs: s.eggs ?? [], waves: s.waves ?? [], maxCreatures: s.maxCreatures, satiation: s.satiation ?? 0.9, dominance: s.dominance ?? {}, rollout: s.rollout, mindBook: s.mindBook ?? [], history: s.history, events: s.events,
      stats: s.stats, records: s.records, diet: s.diet, lastCounts: s.lastCounts, since: s.since, lessons: s.lessons ?? [], pendingStudies: s.pendingStudies ?? [],
    });
    this.plants = Float32Array.from(s.plants);
    this.fertility = Float32Array.from(s.fertility);
    if (s.thicket?.length) this.thicket = Float32Array.from(s.thicket);
    if (s.rootHealth?.length) this.rootHealth = Float32Array.from(s.rootHealth);
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
        this.registry[name] = { ...seed, mark: 'none', parent: null, born: this.season, extinct: this.season, lastBranchGen: 0,
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
