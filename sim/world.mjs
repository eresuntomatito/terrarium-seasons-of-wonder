// The terrarium: plants on a grid, creatures steered by their species' behavior code, weather over everything.
// Species are not fixed: the god branches new ones off living ones, and the world decides which last.
// Nothing says who eats whom: bodies (size, gut) are inherited and drift, anything can eat what it can overpower,
// and roles (grazer, omnivore, hunter, apex) are read off what each species actually ate.
import { noise3 } from './noise.mjs';
import { loadSeed, readCode, compileBehavior, genomeOf, fillTemplate } from './species.mjs';

export const W = 960, H = 640, CELL = 8, GW = W / CELL, GH = H / CELL;
export const TICKS_PER_DAY = 1800; // one minute at 30 ticks/s
export const SEASON_TICKS = TICKS_PER_DAY * 3;
export const GENERATIONS_PER_MUTATION = 20; // a species earns a new branch by breeding this many generations
const PLANT_EVERY = 4, HISTORY_EVERY = 30, HISTORY_MAX = 2000, EVENTS_MAX = 300;
const MAX_CREATURES = 1500, CORPSE_TICKS = 900, BUCKET = 64, BW = W / BUCKET, BH = H / BUCKET;
const MATURITY = 60, REFRACTORY = 40, GENES = 4, GENE_DRIFT = 0.04, MIN_CHILD_ENERGY = 0.15;

// Bodies. Size scales cost, storage and clumsiness; gut sets what a creature can digest (0 plants … 1 flesh).
export const PHYSICS = {
  sizeDrift: 0.05, gutDrift: 0.04, minSize: 2.5, maxSize: 20,
  overpower: 1.2,        // anything this much smaller can be eaten on contact
  jaws: 0.25,            // guts above this can eat flesh; guts below 1 - this can eat plants
  plantEnergy: 0.55,     // energy per unit of plant, times (1 - gut)²
  bodyEnergy: 1.0,       // energy locked in a body of mass 1, on top of what it was carrying …
  bornBody: 0,           // … but a body born in the world holds only this share of it: its parents never paid for the rest
  bodyShare: 0.2,          // share of a child's gift locked into its body: it cannot spend it, but its corpse holds it
  fleshEfficiency: 0.9,  // share of a kill's energy that survives digestion, times gut²
  handling: 240,         // ticks to digest a kill as big as yourself
  cover: 0.6,            // plants this dense are tall grass: whatever stands in them is hidden …
  hideRange: 20,         // … from anyone further away than this
  shareRange: 40,        // every jaw this close to a kill grabs a share of it (scavenging, crowding)
  growTicks: 0,          // newborns start at 40% of adult size and grow to full size over this many ticks (0 = born grown)
  cannibalHunger: 0.3,   // nobody eats its own kind unless its energy is below this share of its maximum
  budLoss: 0.7,          // share of the gift lost when budding alone (mating loses nothing)
  roots: 0.15,           // what grazing always leaves of a plant, so it can regrow
  seedBank: 0.0003,      // chance a bare cell sprouts on its own, times moisture and (0.1 + fertility): deserts recover
  scraps: 0.15,          // share of a kill left on the ground as carrion
  carrionBite: 0.1,      // energy a mouth can tear from a corpse per tick
  carrionEfficiency: 0.7,// share of carrion energy digested, times gut …
  carrionPeak: 0.6,        // … or, when set, best at this gut and falling to nothing carrionWidth away (a scavenger's niche)
  carrionWidth: 0.4,
  rot: 0.0005,            // share of a corpse's energy that rots into the soil every few ticks
  rotToSoil: 0.2,        // fertility made from each unit of rotting energy
  dung: 0.25,            // fertility a creature returns to the soil for each unit of energy it digests
  corpseLife: 12,         // corpses vanish after this many × 900 ticks, whatever is left of them lost
  carrionDung: 1,        // fertility returned for each unit of carrion torn from a corpse (eaten bodies feed the soil fast)
  smother: 0.3,            // nothing grows under a corpse holding more than this energy (0 = off)
  soilNeed: 0.05,           // nutrient loop (0 = off): plants grow at f / (f + this), and their growth uses up the soil …
  uptake: 0.5,           // … this much fertility per unit of growth, given back when plants wither or rot
  weathering: 0.003,    // … while rain slowly frees a little new fertility everywhere
  leach: 0.005,          // share of the soil's fertility washed away at every plant update
  codeDrift: 0.04,       // every number in a creature's code drifts by up to this share at each birth
  isolation: 0.2,        // mates whose code numbers differ by more than this (mean |log ratio|) cannot breed
  splitMin: 10,          // a species splits in two when a group this big can no longer breed with the rest
};
const P = PHYSICS;
const mass = size => (size / 5) ** 2;
// The god reintroduces life: plant-eaters a day after the last one dies; flesh-eaters only once
// plant-eaters have settled (this many, for a full day) and a day after the last flesh-eater died, and never while
// the god is still studying the last collapse.
// It brings back the most recent species of that diet, with its last code and body.
export const IMMIGRATION = { delay: TICKS_PER_DAY, settledPopulation: 100, huntersAt: 150, hunters: 6, huntersGap: TICKS_PER_DAY / 4, freshPrey: 50, scavengerFlock: true };
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
const driftSize = s => Math.min(P.maxSize, Math.max(P.minSize, s * (1 + (Math.random() - 0.5) * 2 * P.sizeDrift)));
const driftGut = g => clamp01(g + (Math.random() - 0.5) * 2 * P.gutDrift);
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
    this.behaviors = {};
    this.genome = {};
    this.onEvent = this.onHistory = this.onSeason = this.onSpecies = this.onExtinct = this.onRevive = this.onEarned = this.onCollapse = this.onSplit = null;
    if (saved?.version === 3) this.restore(saved); else this.seed();
    for (const name of this.living()) this.compile(name);
    this.ensureGenomes();
    if (this.newSeeds?.some(n => this.registry[n].scavenger)) this.reintroduceScavengers();
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
    const base = latest?.length === g.consts.length ? latest : g.consts;
    return base.map(v => v * (1 + (Math.random() - 0.5) * 0.1));
  }

  ensureGenomes() {
    for (const c of this.creatures) {
      const n = this.genome[c.species]?.consts.length ?? 0;
      if (!Array.isArray(c.k) || c.k.length !== n) c.k = this.jitterK(c.species);
    }
  }

  // How different two creatures' code numbers are: mean |log ratio|. Too different, and they cannot breed.
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
      energy: 1, age: 0, lifespan: Math.round(sp.lifespan * (0.7 + Math.random() * 0.6)),
      gen, genes, size, gut, hue: sp.hue, memory: {}, broken: false,
      willing: false, give: 0.45, signal: 0, cooldown: 0, eats: true, k: this.jitterK(name),
      body: mass(size) * P.bodyEnergy * (gen > 0 ? P.bornBody : 1), // the god's newcomers arrive with full bodies
    };
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
  addSpecies(name, parent, code) {
    const p = this.registry[parent];
    p.branches = (p.branches ?? 0) + 1;
    this.registry[name] = { ...p, ...this.distinctLook(p.tl >= 2.5), parent, born: this.season, extinct: null, lastBranchGen: 0,
      lineage: `${p.lineage}.${p.branches}`, branches: 0, meanK: undefined, drift: 0 };
    this.code[name] = code;
    this.compile(name);
    this.ensureBooks();
    const pool = this.creatures.filter(c => c.species === parent);
    // A quarter of the parent's population, but never fewer than half of a small one (up to 8).
    const count = Math.max(Math.ceil(pool.length / 4), Math.min(Math.floor(pool.length / 2), 8));
    // The god takes the best-fed members, so a new design gets a fair start instead of a starving one.
    const founders = pool.sort((a, b) => b.energy - a.energy).slice(0, count);
    // Founders start over: new minds, generation zero. They keep their own genes and bodies.
    for (const c of founders) Object.assign(c, { species: name, hue: this.registry[name].hue, memory: {}, broken: false, gen: 0, cooldown: 0,
      lifespan: c.age + Math.round(p.lifespan * (0.7 + Math.random() * 0.6)), k: this.jitterK(name) });
    // The species' reference body is its founders' average, so physiology scales from where they actually are.
    this.registry[name].size = r2(founders.reduce((a, c) => a + c.size, 0) / founders.length);
    for (const c of founders) c.energy = Math.min(c.energy, this.registry[name].maxEnergy);
    this.lastCounts[name] = founders.length;
    this.lastCounts[parent] -= founders.length;
    Object.assign(this.registry[name], { releasedAt: this.tick, statsAtRelease: { ...this.stats[name] } });
    this.log(`${founders.length} ${plural(parent)} wake up changed. They are ${plural(name)} (${this.registry[name].lineage}) now.`);
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
    this.log(`The last ${name} dies ${how}. ${plural(name)[0].toUpperCase() + plural(name).slice(1)} (${sp.lineage}) are extinct.${span}`);
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
    const diet = n => !this.scavenging(n) && ((this.registry[n].avgGut ?? this.registry[n].gut) >= 0.5) === fleshEater;
    const held = this.speciesNames.filter(n => diet(n) && this.registry[n].waiting);
    if (held.length) return held[held.length - 1];
    // Only species that established themselves (a full season alive after release) come back; failed experiments stay fossils.
    const dead = this.speciesNames.filter(n => diet(n) && this.registry[n].extinct !== null && (this.registry[n].established || !this.registry[n].parent));
    const order = n => this.speciesNames.indexOf(n);
    dead.sort((a, b) => this.registry[b].extinct - this.registry[a].extinct || order(b) - order(a));
    return dead[0] ?? this.speciesNames.find(n => diet(n) && this.registry[n].parent === null);
  }

  // The god sets a species back down, as it last was: its code, and bodies like its last ones.
  // The scavengers come back as their latest established species, scattered among the dead.
  reintroduceScavengers() {
    const names = this.speciesNames.filter(n => this.registry[n].scavenger);
    const name = names.filter(n => this.registry[n].extinct !== null && (this.registry[n].established || !this.registry[n].parent))
      .sort((a, b) => this.registry[b].extinct - this.registry[a].extinct)[0] ?? names[0];
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
    for (let i = 0; i < sp.immigrants; i++) {
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
    const flesh = n => !this.scavenging(n) && (this.registry[n].avgGut ?? this.registry[n].gut) >= 0.5;
    const held = this.speciesNames.filter(n => flesh(n) && this.registry[n].waiting);
    if (held.length) return held.at(-1);
    const released = this.speciesNames.filter(n => flesh(n) && this.registry[n].releasedAt !== undefined);
    return released.sort((a, b) => this.registry[b].releasedAt - this.registry[a].releasedAt)[0] ?? this.latest(true);
  }

  reintroduce(fleshEater, name = this.latest(fleshEater), count) {
    if (!name) return;
    const sp = this.registry[name];
    const returning = sp.extinct !== null, held = !!sp.waiting;
    Object.assign(sp, { extinct: null, waiting: false, lastBranchGen: 0, releasedAt: this.tick, statsAtRelease: { ...this.stats[name] } });
    this.records[name].peak = 0;
    this.records[name].generation = 0;
    this.compile(name);
    // Hunters are shaped to the prey they will meet: bodies about 1.5 times the plant-eaters' average size.
    const prey = this.creatures.filter(c => !c.dead && this.dietOf(c) === 'plant'), preySize = prey.length ? prey.reduce((a, c) => a + c.size, 0) / prey.length : 0;
    const shaped = fleshEater && preySize ? Math.max(P.minSize, preySize * 1.5) : null;
    // A herd is set down somewhere green and as far as possible from anything that eats flesh.
    const hunters = this.creatures.filter(c => !c.dead && this.dietOf(c) === 'flesh');
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
    const size = shaped ?? sp.avgSize ?? sp.size, gut = sp.avgGut ?? sp.gut;
    count ??= sp.immigrants;
    // Grazers arrive as a herd. Hunters are spread out: each near some prey, and well apart from the others,
    // so they do not start out competing for the same kills.
    const placed = [];
    const spot = () => {
      if (!fleshEater) return [x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60];
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
      this.creatures.push(this.spawn(name, px, py, 0, undefined, size * (0.9 + Math.random() * 0.2), clamp01(gut + (Math.random() - 0.5) * 0.1)));
    }
    this.lastCounts[name] = count;
    if (returning) this.onRevive?.(name);
    const who = `${count} ${plural(name)} (${sp.lineage})`, hand = held ? 'opens its hand and ' : '';
    this.log(fleshEater
      ? `${this.freshFromStudy ? 'Fresh from its study, the' : `The plant-eaters number ${prey.length}. The`} god ${hand}releases ${who} among them${shaped ? `, shaped to their prey (size ${r1(shaped)})` : ''}.`
      : `Nothing eats plants any more. The god ${hand}sets ${who} down in the meadow.`);
    this.onSpecies?.();
  }

  // Plant-eaters come back a day after the last one dies. Flesh-eaters only once plant-eaters
  // have settled, and a day after the last flesh-eater died. Never both at the same time.
  // Scavengers are neither: they eat the dead and plants, and nobody is released to hunt them.
  diets() {
    let plantEaters = 0, fleshEaters = 0;
    for (const c of this.creatures) { if (c.dead) continue; const d = this.dietOf(c); if (d === 'flesh') fleshEaters++; else if (d === 'plant') plantEaters++; }
    return { plantEaters, fleshEaters };
  }

  immigration() {
    const t = this.tick, since = this.since;
    const { plantEaters, fleshEaters } = this.diets();
    // Scavengers: the god scatters them among the dead whenever none are left and carrion lies about.
    if (t % TICKS_PER_DAY === 0 && !this.creatures.some(c => !c.dead && this.dietOf(c) === 'carrion') && this.corpses.length >= 20) this.reintroduceScavengers();
    if (plantEaters) since.plantsGone = null; else since.plantsGone ??= t;
    if (fleshEaters) since.fleshGone = null; else since.fleshGone ??= t;
    if (plantEaters >= IMMIGRATION.settledPopulation) since.settled ??= t; else since.settled = null;
    if (!plantEaters && t - since.plantsGone >= IMMIGRATION.delay) return this.reintroduce(false);
    // Hunters: as soon as the plant-eaters number 150, a batch of the most recently written hunters comes back,
    // even while the god is still writing their next generation (which is released the moment it is ready).
    if (!fleshEaters && plantEaters >= IMMIGRATION.huntersAt && t - since.fleshGone >= IMMIGRATION.huntersGap)
      this.reintroduce(true, this.lastReleasedHunter(), IMMIGRATION.hunters);
  }

  // --- weather and plants ---

  // Global rainfall: a wet/dry cycle every five days, roughened by noise.
  rain() {
    const t = this.tick;
    return clamp01(0.5 + 0.3 * Math.sin(t / (TICKS_PER_DAY * 5) * Math.PI * 2) + 0.5 * (noise3(t / 3000, 0.5, 3.3) - 0.5));
  }

  // Plants are a cellular automaton: logistic growth, seeding from lush neighbours, drought, rot.
  updatePlants() {
    const t = this.tick, rain = this.rain(), prev = this.prev;
    if (P.smother) {
      (this.smothered ??= new Uint8Array(GW * GH)).fill(0);
      for (const k of this.corpses) if (k.energy > P.smother) this.smothered[cellAt(k.x, k.y)] = 1;
    }
    prev.set(this.plants);
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const i = gy * GW + gx;
        const m = this.moisture[i] = clamp01(rain + (noise3(gx * 0.05, gy * 0.05, t * 0.0003) - 0.5) * 0.9);
        let lush = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if ((dx || dy) && prev[wrap(gy + dy, GH) * GW + wrap(gx + dx, GW)] > 0.4) lush++;
        let b = prev[i];
        if (b > 0) {
          const f = this.fertility[i], before = b;
          if (!(P.smother && this.smothered[i])) {
            const grow = 0.05 * b * (1 - b) * (m + f) * (P.soilNeed ? f / (f + P.soilNeed) : 1);
            b += grow;
            if (P.soilNeed) this.fertility[i] = Math.max(0, f - grow * P.uptake);
          }
          if (m < 0.3) b -= 0.02 * (0.3 - m);
          if (lush === 8 && Math.random() < 0.003) b *= 0.3; // crowded meadows rot from inside
          if (b < 0.02) b = 0;
          if (P.soilNeed && b < before) this.fertility[i] = Math.min(2, this.fertility[i] + (before - b) * P.uptake); // withered plants return to the soil
        } else if ((lush && Math.random() < 0.006 * lush * m) || Math.random() < P.seedBank * m * (0.1 + this.fertility[i])) {
          b = 0.05;
        }
        this.plants[i] = Math.min(1, b);
        this.fertility[i] = this.fertility[i] * (1 - P.leach) + (P.soilNeed ? P.weathering * m : 0);
      }
    }
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

  hasJaws(c) { return c.gut > P.jaws; }
  grazes(c) { return c.gut < 1 - P.jaws; }
  // The body as it is now: juveniles are smaller than the adult size their genes promise.
  bodySize(c) { return P.growTicks ? c.size * Math.min(1, 0.4 + 0.6 * c.age / P.growTicks) : c.size; }
  canOverpower(c, o) { return this.hasJaws(c) && this.bodySize(c) >= this.bodySize(o) * P.overpower; }
  // Hunger overrides kinship: only a starving creature will eat its own kind.
  wouldEat(c, o) { return o.species !== c.species || c.energy < P.cannibalHunger * this.registry[c.species].maxEnergy; }

  // What a creature knows. Positions are unwrapped relative to it, so plain subtraction works.
  // Its food is whatever it could actually eat: plants if it grazes, creatures it could overpower if it has jaws.
  sense(c) {
    const sp = this.registry[c.species], r = sp.perception;
    const others = [], food = [];
    this.near(c.x, c.y, r, (o, dx, dy) => {
      if (o === c || o.dead) return;
      if (this.plants[cellAt(o.x, o.y)] > P.cover && dx * dx + dy * dy > P.hideRange ** 2) return; // hidden in tall grass
      const seen = () => ({
        x: c.x + dx, y: c.y + dy, vx: o.vx, vy: o.vy, size: r1(this.bodySize(o)), species: o.species, kin: o.species === c.species,
        willing: o.willing, signal: o.signal, energy: r1(o.energy),
      });
      others.push(seen());
      if (this.canOverpower(c, o) && this.wouldEat(c, o)) food.push({ ...seen(), plant: false });
    });
    if (this.grazes(c)) {
      for (let gy = Math.floor((c.y - r) / CELL); gy <= Math.floor((c.y + r) / CELL); gy++)
        for (let gx = Math.floor((c.x - r) / CELL); gx <= Math.floor((c.x + r) / CELL); gx++) {
          const b = this.plants[wrap(gy, GH) * GW + wrap(gx, GW)];
          if (b < 0.25) continue;
          const fx = (gx + 0.5) * CELL, fy = (gy + 0.5) * CELL;
          if ((fx - c.x) ** 2 + (fy - c.y) ** 2 <= r * r) food.push({ x: fx, y: fy, vx: 0, vy: 0, size: 0, plant: true, amount: r2(b) });
        }
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
        size: r1(this.bodySize(c)), gut: r2(c.gut), genes: [...c.genes], fertile: this.fertile(c) },
      { width: W, height: H, t: this.tick, food, others, noise: this.noiseFn },
    ];
  }

  step() {
    const t = ++this.tick;
    if (t % PLANT_EVERY === 0) this.updatePlants();
    this.noiseFn = (x, y) => noise3(x * 0.01, y * 0.01, t * 0.005) * 2 - 1;
    this.buildBuckets();

    // Sense → decide, one batch per species, so a hung behavior only freezes its own kind.
    for (const name of this.living()) {
      const group = this.creatures.filter(c => c.species === name && !c.broken);
      if (!group.length) continue;
      const inputs = group.map(c => [...this.sense(c), c.k]);
      let forces;
      try {
        forces = this.behaviors[name](inputs);
      } catch {
        this.stats[name].seizures++;
        continue;
      }
      group.forEach((c, k) => {
        const f = forces[k];
        c.memory = inputs[k][0].memory;
        if (!f || f.error) { c.broken = true; this.stats[name].broken++; return; }
        if (f.hue !== undefined) {
          // A behavior may sway its colour, but only around its species' hue, so species stay recognisable.
          const base = this.registry[name].hue, d = wrap(f.hue - base + 180, 360) - 180;
          c.hue = Math.round(wrap(base + Math.max(-HUE_SWAY, Math.min(HUE_SWAY, d)), 360));
        }
        c.willing = f.mate;
        c.eats = f.eat;
        if (f.give !== undefined) c.give = clamp01(f.give);
        if (f.signal !== undefined) c.signal = r2(clamp01(f.signal));
        this.steer(c, f.x, f.y);
      });
    }

    // Act: move, pay for it, eat, die or breed. Bigger bodies cost more to run and to move.
    const born = [];
    for (const c of this.creatures) {
      if (c.dead) continue;
      const sp = this.registry[c.species], k = this.scale(c);
      c.x = wrap(c.x + c.vx, W);
      c.y = wrap(c.y + c.vy, H);
      c.age++;
      if (c.digesting > 0) c.digesting--;
      if (c.cooldown > 0) c.cooldown--;
      c.energy -= sp.metabolism * k ** 0.75 + sp.moveCost * k * (c.vx * c.vx + c.vy * c.vy);
      this.eat(c, sp, k);
      if (c.energy <= 0) this.die(c, 'starved');
      else if (c.age > c.lifespan) this.die(c, 'old');
      else if (c.willing && this.fertile(c) && this.creatures.length + born.length < MAX_CREATURES) this.breed(c, sp, k, born);
    }
    this.creatures = this.creatures.filter(c => !c.dead).concat(born);

    for (const corpse of this.corpses) {
      corpse.age++;
      if (t % PLANT_EVERY === 0 && corpse.energy > 0) {
        const rotted = corpse.energy * P.rot, i = cellAt(corpse.x, corpse.y);
        corpse.energy -= rotted;
        this.fertility[i] = Math.min(2, this.fertility[i] + rotted * P.rotToSoil);
      }
    }
    this.corpses = this.corpses.filter(corpse => corpse.age < CORPSE_TICKS * P.corpseLife && corpse.energy > 0.01);
    this.census();
    if (t % TICKS_PER_DAY === 0) this.checkSplits();
    if (t % SEASON_TICKS === 0) this.endSeason();
  }

  // Big bodies turn slowly.
  steer(c, fx, fy) {
    const sp = this.registry[c.species], maxForce = sp.maxForce / Math.sqrt(this.scale(c));
    const m = Math.hypot(fx, fy);
    if (m > maxForce) { fx *= maxForce / m; fy *= maxForce / m; }
    c.vx += fx;
    c.vy += fy;
    const s = Math.hypot(c.vx, c.vy);
    if (s > sp.maxSpeed) { c.vx *= sp.maxSpeed / s; c.vy *= sp.maxSpeed / s; }
  }

  // Grazing nibbles the cell underfoot; jaws take the first thing touched that is small enough.
  // Whether to eat at all is the behavior's choice (eat: false). Energy is digested by gut, and much is lost.
  eat(c, sp, k) {
    if (c.eats !== false) {
      if (this.grazes(c)) {
        const i = cellAt(c.x, c.y), bite = Math.max(0, Math.min(sp.biteSize * Math.sqrt(k) * (1 - c.gut), this.plants[i] - P.roots)); // roots survive
        this.plants[i] -= bite;
        this.feed(c, bite * P.plantEnergy * (1 - c.gut) ** 2, 1, 'plant');
      }
      if (this.hasJaws(c) && !(c.digesting > 0)) {
        let prey = null;
        const me = this.bodySize(c);
        this.near(c.x, c.y, me + 8, (o, dx, dy) => {
          const reach = (me + this.bodySize(o)) * 0.6 + 2;
          if (!prey && o !== c && !o.dead && this.canOverpower(c, o) && this.wouldEat(c, o) && dx * dx + dy * dy <= reach * reach) prey = o;
        });
        if (prey) {
          const preyMass = mass(this.bodySize(prey)), meat = Math.max(0, prey.energy) + this.bodyHeld(prey), level = this.registry[prey.species].tl;
          this.die(prey, 'eaten');
          this.stats[c.species].kills++;
          // Everyone with jaws nearby grabs a share, the killer included; the more crowded, the less each gets.
          const diners = [c];
          this.near(c.x, c.y, P.shareRange, o => { if (o !== c && !o.dead && this.hasJaws(o) && o.eats !== false) diners.push(o); });
          for (const d of diners) this.feed(d, meat * (1 - P.scraps) / diners.length * d.gut ** 2 * P.fleshEfficiency, level, 'flesh');
          c.digesting = Math.round(P.handling * Math.sqrt(preyMass / mass(me)));
        }
      }
      // Carrion does not fight back: any jaws can tear at a corpse they touch.
      if (this.hasJaws(c)) {
        const me = this.bodySize(c), k2 = Math.sqrt(k);
        for (const corpse of this.corpses) {
          if (!(corpse.energy > 0.01)) continue;
          const dx = delta(c.x, corpse.x, W), dy = delta(c.y, corpse.y, H), reach = me * 0.6 + 4;
          if (dx * dx + dy * dy > reach * reach) continue;
          const bite = Math.min(corpse.energy, P.carrionBite * k2);
          corpse.energy -= bite;
          if (P.carrionDung) { const i = cellAt(corpse.x, corpse.y); this.fertility[i] = Math.min(2, this.fertility[i] + bite * P.carrionDung); }
          this.feed(c, bite * this.carrionDigests(c.gut), this.registry[corpse.species]?.tl ?? 2, 'carrion');
          break;
        }
      }
    }
    c.energy = Math.min(c.energy, sp.maxEnergy);
  }

  // Every meal is booked by its trophic level, so each species' role is measured, not declared.
  carrionDigests(gut) {
    return P.carrionPeak ? P.carrionEfficiency * Math.max(0, 1 - Math.abs(gut - P.carrionPeak) / P.carrionWidth) : gut * P.carrionEfficiency;
  }

  feed(c, energy, foodLevel, kind) {
    if (energy <= 0) return;
    const carrion = kind === 'carrion';
    c.energy += energy;
    c.ate = (c.ate ?? 0) + energy;
    if (carrion) c.carrion = (c.carrion ?? 0) + energy;
    if (kind === 'plant') c.grazed = (c.grazed ?? 0) + energy;
    const i = cellAt(c.x, c.y);
    this.fertility[i] = Math.min(2, this.fertility[i] + energy * P.dung); // dung: what is digested feeds the soil
    const d = this.diet[c.species];
    d.energy += energy;
    d.levels += energy * foodLevel;
    if (carrion) d.carrion = (d.carrion ?? 0) + energy;
  }

  // Who eats what is measured, not declared. A species scavenges while most of what it eats is carrion
  // (until it has eaten enough to tell, the seed's label stands). A creature scavenges while most of what it
  // has eaten in its life was carrion; one that has hardly eaten yet goes by its species.
  scavenging(name) {
    const sp = this.registry[name];
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
    return c.age > Math.max(MATURITY, P.growTicks * 0.75) && !(c.cooldown > 0) && !c.broken;
  }

  // Two willing kin who touch have a child together, each giving their chosen share of energy.
  // A willing creature with no partner can bud alone, but only when very well fed, and most of the gift is lost.
  // Children inherit body and genes (from one parent or the other) with a little drift.
  breed(c, sp, k, born) {
    let partner = null;
    this.near(c.x, c.y, c.size * 2, o => {
      if (!partner && o !== c && !o.dead && o.species === c.species && o.willing && this.fertile(o) && this.genomeGap(c.k, o.k) < P.isolation) partner = o;
    });
    if (partner) {
      const gift = c.give * c.energy + partner.give * partner.energy;
      if (gift < MIN_CHILD_ENERGY) return;
      c.energy -= c.give * c.energy;
      partner.energy -= partner.give * partner.energy;
      const pick = (a, b) => (Math.random() < 0.5 ? a : b);
      const genes = c.genes.map((g, i) => drift(pick(g, partner.genes[i])));
      born.push(this.child(c, (c.x + partner.x) / 2, (c.y + partner.y) / 2, gift, genes, Math.max(c.gen, partner.gen) + 1,
        driftSize(pick(c.size, partner.size)), driftGut(pick(c.gut, partner.gut)), c.k.map((v, i) => driftK(pick(v, partner.k[i])))));
      partner.cooldown = REFRACTORY;
      this.stats[c.species].mated++;
    } else if (c.energy >= sp.reproduceAt) {
      const gift = c.give * c.energy, kept = gift * (1 - P.budLoss);
      if (kept < MIN_CHILD_ENERGY) return;
      c.energy -= gift;
      born.push(this.child(c, c.x, c.y, kept, c.genes.map(drift), c.gen + 1, driftSize(c.size), driftGut(c.gut), c.k.map(driftK)));
      this.stats[c.species].budded++;
    } else {
      return;
    }
    c.cooldown = REFRACTORY;
  }

  child(parent, x, y, energy, genes, gen, size, gut, k) {
    const kid = this.spawn(parent.species, x + Math.random() * 8 - 4, y + Math.random() * 8 - 4, gen, genes, size, gut);
    kid.energy = energy * (1 - P.bodyShare);
    kid.body += energy * P.bodyShare;
    kid.k = k;
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
    return c.body ?? mass(this.bodySize(c)) * P.bodyEnergy * (c.gen > 0 ? P.bornBody : 1);
  }

  die(c, cause) {
    c.dead = true;
    this.stats[c.species][cause]++;
    this.lastDeath = { species: c.species, cause };
    const body = Math.max(0, c.energy) + this.bodyHeld(c);
    this.corpses.push({ x: c.x, y: c.y, species: c.species, cause, age: 0, energy: cause === 'eaten' ? body * P.scraps : body });
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
      const traits = Object.fromEntries(this.living().map(n => [n, { size: this.registry[n].avgSize, drift: this.registry[n].drift ?? 0 }]));
      const entry = { t: this.tick, pops, plants: Math.round(this.plants.reduce((a, b) => a + b, 0)), traits };
      this.history.push(entry);
      if (this.history.length > HISTORY_MAX) this.history = this.history.filter((_, i) => i % 2 === 0);
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
        const g = this.genome[name];
        if (g?.consts.length) {
          const mean = g.consts.map((_, i) => Math.exp(group.reduce((a, c) => a + Math.log(c.k[i]), 0) / group.length));
          sp.meanK = mean.map(v => Number(v.toPrecision(4)));
          sp.drift = r2(this.genomeGap(mean, g.consts));
        }
      }
      if (d.energy > 0.5) {
        const share = (d.carrion ?? 0) / d.energy, was = this.scavenging(name);
        const now = was ? share > 0.4 : share > 0.5;
        if (now !== was && (this.lastCounts[name] ?? 0) >= 5)
          this.log(now ? `The ${plural(name)} (${sp.lineage}) have turned to the dead: most of what they eat is carrion.`
            : `The ${plural(name)} (${sp.lineage}) have given up the dead: they live on what they graze and kill.`);
        sp.scavenging = now;
      }
      d.energy *= 0.95;
      d.levels *= 0.95;
      d.carrion = (d.carrion ?? 0) * 0.95;
      // A role changes only once the trophic level is clearly past a boundary (by 0.1), so it does not flicker.
      const role = roleOf(sp.tl - 0.1) === roleOf(sp.tl + 0.1) ? roleOf(sp.tl) : sp.role ?? roleOf(sp.tl);
      if (role !== sp.role && (this.lastCounts[name] ?? 0) >= 5) {
        const said = { grazer: 'grazers again: they live on plants', omnivore: 'omnivores: they eat both plants and flesh',
          hunter: 'hunters: they live on the flesh of plant-eaters', apex: 'apex predators: most of what they eat hunts too' }[role];
        this.log(`The ${plural(name)} (${sp.lineage}) have become ${said}.`);
      }
      sp.role = role;
    }
  }

  // Once a day: has a species drifted into two groups whose code numbers are too different to breed together?
  // Then it has become two species, without the god: the smaller group gets a new name and lineage code.
  checkSplits() {
    const gap = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
    const mean = rows => rows[0].map((_, i) => rows.reduce((s, r) => s + r[i], 0) / rows.length);
    for (const name of this.living()) {
      const group = this.creatures.filter(c => c.species === name && c.k?.length);
      if (group.length < P.splitMin * 2) continue;
      const logs = group.map(c => c.k.map(Math.log));
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
      this.splitSpecies(name, group.filter((_, i) => side[i] === smallIsA), (smallIsA ? a : b).map(Math.exp));
    }
  }

  splitSpecies(parent, members, values) {
    const p = this.registry[parent], g = this.genome[parent];
    let name;
    do { name = inventName(); } while (this.speciesNames.includes(name) || this.isTaken?.(name));
    p.branches = (p.branches ?? 0) + 1;
    this.registry[name] = { ...p, ...this.distinctLook(p.tl >= 2.5), parent, born: this.season, extinct: null, waiting: false, lastBranchGen: 0,
      lineage: `${p.lineage}.${p.branches}`, branches: 0, meanK: undefined, drift: 0, releasedAt: this.tick,
      size: r2(members.reduce((a, c) => a + c.size, 0) / members.length) };
    this.code[name] = fillTemplate(g.template, values); // its own evolved numbers become its written code
    this.compile(name);
    this.ensureBooks();
    this.registry[name].statsAtRelease = { ...this.stats[name] };
    for (const c of members) Object.assign(c, { species: name, hue: this.registry[name].hue, gen: 0 });
    this.lastCounts[name] = members.length;
    this.lastCounts[parent] -= members.length;
    this.log(`The ${plural(parent)} have drifted apart. ${members.length} of them can no longer breed with the rest: they are ${plural(name)} (${this.registry[name].lineage}) now.`);
    this.onSplit?.(name, parent);
    this.onSpecies?.();
  }

  // A species born last season that is still alive now has survived its first full season.
  endSeason() {
    const alive = this.living().filter(n => this.lastCounts[n] > 0);
    for (const n of alive) if (this.tick - (this.registry[n].releasedAt ?? 0) >= SEASON_TICKS) this.registry[n].established = true;
    const established = alive.filter(n => this.registry[n].born === this.season);
    this.log(`Season ${this.season} ends. ${alive.length} species live.` +
      (established.length ? ` ${established.map(plural).join(', ')} survived their first season.` : ''));
    this.season++;
    this.onSeason?.();
  }

  // --- for the viewer ---

  speciesList() {
    return this.speciesNames.map(name => {
      const { lineage, hue, shape, mark, parent, born, extinct, waiting, lastBranchGen } = this.registry[name];
      return { name, lineage, hue, shape, mark, parent, born, extinct, waiting: !!waiting, lastBranchGen, drift: this.registry[name].drift ?? 0,
        code: extinct === null ? this.evolvedCode(name) : undefined };
    });
  }

  // Living species' measured roles and average bodies.
  traits() {
    const t = {};
    for (const name of this.living()) {
      const group = this.creatures.filter(c => c.species === name), n = group.length || 1;
      const sp = this.registry[name];
      t[name] = { tl: sp.tl, role: sp.role, size: r1(group.reduce((a, c) => a + c.size, 0) / n), gut: r2(group.reduce((a, c) => a + c.gut, 0) / n) };
    }
    return t;
  }

  // Compact snapshot: [id, species, x, y, angle, energy, hue, flags (1 broken, 2 willing), size] per creature.
  frame() {
    const index = Object.fromEntries(this.speciesNames.map((n, i) => [n, i]));
    const c = [];
    for (const k of this.creatures)
      c.push(k.id, index[k.species], r2(k.x), r2(k.y), r2(Math.atan2(k.vy, k.vx)), r2(k.energy / this.registry[k.species].maxEnergy),
        k.hue, (k.broken ? 1 : 0) | (k.willing ? 2 : 0), r1(this.bodySize(k)));
    const corpses = [];
    for (const k of this.corpses) corpses.push(Math.round(k.x), Math.round(k.y), r2(k.age / CORPSE_TICKS), k.cause === 'eaten' ? 1 : 0);
    return { t: this.tick, season: this.season, rain: r2(this.rain()), c, corpses };
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
      plants: round(this.plants), fertility: round(this.fertility),
      creatures: this.creatures.map(c => ({ ...c, memory: safeMemory(c.memory) })),
      corpses: this.corpses, history: this.history, events: this.events,
      stats: this.stats, records: this.records, diet: this.diet, lastCounts: this.lastCounts, since: this.since, lessons: this.lessons, pendingStudies: this.pendingStudies,
    };
  }

  restore(s) {
    Object.assign(this, {
      tick: s.tick, season: s.season, nextId: s.nextId, registry: s.registry, code: s.code,
      creatures: s.creatures, corpses: s.corpses, history: s.history, events: s.events,
      stats: s.stats, records: s.records, diet: s.diet, lastCounts: s.lastCounts, since: s.since, lessons: s.lessons ?? [], pendingStudies: s.pendingStudies ?? [],
    });
    this.plants = Float32Array.from(s.plants);
    this.fertility = Float32Array.from(s.fertility);
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
          lineage: name[0].toUpperCase(), branches: 0, role: roleOf(seed.tl), established: true };
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
        this.code[name] = code;
        this.log(`The god rewrites the ${plural(name)} (${sp.lineage}).`);
        this.rewritten = [...(this.rewritten ?? []), name];
      }
    }
  }
}
