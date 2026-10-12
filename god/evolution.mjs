// The blind god answers breeding, not the calendar: every time a species has bred enough generations,
// it earns a branch, and the god writes it a strange new relative. Earned branches wait in line.
// Every birth, extinction and return is committed to git: the log is the fossil record.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { speciate, reflect, lessonText, bridgeAlive, BRANCH_PROMPT } from './mutate.mjs';
import { GENERATIONS_PER_MUTATION, IMMIGRATION } from '../sim/world.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);
const MIN_PARENT_POPULATION = 6;

// Git calls run one at a time so they never fight over the index lock.
let gitQueue = Promise.resolve();
function fossilize(file, message) {
  gitQueue = gitQueue
    .then(() => run('git', ['add', file], { cwd: ROOT }))
    .then(() => run('git', ['commit', '-q', '-m', message, '--', file], { cwd: ROOT }))
    .catch(e => console.error('fossil record:', e.stderr || e.message));
}

// Names already used by any species, living, dead, or from an earlier era.
function takenNames(world) {
  const files = dir => fs.existsSync(dir) ? fs.readdirSync(dir).map(f => f.replace(/\.js$/, '')) : [];
  return new Set([...world.speciesNames, ...files(path.join(ROOT, 'species')),
    ...fs.readdirSync(path.join(ROOT, 'fossils'), { withFileTypes: true }).filter(d => d.isDirectory()).flatMap(d => files(path.join(ROOT, 'fossils', d.name)))]);
}

// "twice it wrote only a name, once it made another wanderer"
function describeFailures(failures, parent) {
  const what = e => e === 'no behave() function' ? 'it wrote only a name'
    : e === 'a copy of its parent' ? `it made another ${parent}` : 'what came out could not live';
  const counts = new Map();
  for (const f of failures) counts.set(what(f), (counts.get(what(f)) ?? 0) + 1);
  const times = n => ['', 'once', 'twice', 'three times'][n] ?? `${n} times`;
  return [...counts].map(([w, n]) => `${times(n)} ${w}`).join(', ');
}

export function startGod(world, onStatus = () => {}) {
  const queue = [];
  let busy = null;
  const status = () => {
    world.studying = busy?.kind === 'learn' || queue.some(q => q.kind === 'learn'); // hunters wait for the lesson
    onStatus({ state: busy ? 'thinking' : 'idle', parent: busy?.name, queue: queue.map(q => q.name) });
  };

  const enqueue = task => {
    if ((busy?.name === task.name && busy?.kind === task.kind) || queue.some(q => q.name === task.name && q.kind === task.kind)) return false;
    queue.push(task);
    status();
    next();
    return true;
  };

  world.onEarned = name => {
    if (enqueue({ kind: 'branch', name }))
      world.log(`The ${name}s have bred ${GENERATIONS_PER_MUTATION} generations. The god takes notice.`);
  };

  // Hunters collapsed: study the bones, and try a different hunter, held until the grazers settle.
  world.onCollapse = (name, l) => {
    world.log(`The god studies the bones of the ${name}s (${l.lineage}): they lasted ${l.days} days, grew to ${l.peak}, killed ${l.kills}, then ${l.starved >= l.eaten ? 'starved' : 'were eaten'}.`);
    enqueue({ kind: 'learn', name });
  };

  // The god builds on the best hunter it has made so far. Only a line that has done worse than the seed
  // hunter, twice in a row, is set aside to start again from the seed.
  function reflectFrom(latest) {
    const seed = world.speciesNames.find(n => !world.registry[n].parent && (world.registry[n].avgGut ?? world.registry[n].gut) >= 0.5);
    const lessons = world.lessons ?? [], bestOf = pred => Math.max(0, ...lessons.filter(pred).map(l => l.days));
    const line = world.registry[latest].lineage.split('.').slice(0, 2).join('.');
    const lineBest = bestOf(l => l.lineage.startsWith(line) && l.lineage.includes('.')), seedBest = bestOf(l => !l.lineage.includes('.'));
    const recent = lessons.slice(-2);
    if (seed && seed !== latest && recent.length === 2 && recent.every(l => l.lineage.startsWith(line)) && lineBest < seedBest) {
      world.log(`The god sets the ${line} line aside and starts again from the ${seed}s.`);
      return seed;
    }
    // Otherwise, build on whichever hunter of this line lasted longest.
    const best = lessons.filter(l => l.lineage.startsWith(line) && world.registry[l.name]).sort((a, b) => b.days - a.days)[0];
    return best?.name ?? latest;
  }

  // The whole evidence of a collapse, for a god that studies before it designs.
  function evidence(dead) {
    const flesh = n => (world.registry[n]?.avgGut ?? world.registry[n]?.gut ?? 0) >= 0.5;
    const sp = world.registry[dead], from = (sp.releasedAt ?? 0) - 600;
    const h = world.history.filter(e => e.t >= from), step = Math.max(1, Math.floor(h.length / 12));
    const series = h.filter((_, i) => i % step === 0).map(e => {
      let hunters = 0, prey = 0;
      for (const [n, c] of Object.entries(e.pops)) if (flesh(n)) hunters += c; else prey += c;
      return `day ${(e.t / 1800).toFixed(1)}: ${hunters} hunters, ${prey} plant-eaters, plant cover ${e.plants}`;
    });
    const grazers = world.living().filter(n => !flesh(n)).sort((a, b) => (world.lastCounts[b] ?? 0) - (world.lastCounts[a] ?? 0));
    const preyLines = grazers.map(n => { const r = world.registry[n]; return `the ${n}s: ${world.lastCounts[n]} alive, size ${r.avgSize}, max speed ${r.maxSpeed}, perception ${r.perception}`; });
    return { series, preyLines, preyCode: grazers[0] ? world.evolvedCode(grazers[0]) : '',
      hunterBody: `size ${sp.avgSize ?? sp.size}, max speed ${sp.maxSpeed}, turning ${sp.maxForce}, perception ${sp.perception}, metabolism ${sp.metabolism}; ` +
        `energy can never exceed ${sp.maxEnergy}; budding alone needs at least ${sp.reproduceAt} energy and loses most of the gift; mating needs a willing partner of its own kind within touching distance` };
  }

  // The god's notebook: every study, intent and outcome, readable by people.
  const NOTEBOOK = path.join(ROOT, 'data', 'god', 'notebook.md');
  const note = text => { fs.mkdirSync(path.dirname(NOTEBOOK), { recursive: true }); fs.appendFileSync(NOTEBOOK, `${text}\n\n`); };

  // What earlier branches of a family tried, and what became of them.
  function pastBranches(parent) {
    const root = world.registry[parent].lineage.split('.').slice(0, 2).join('.');
    return world.speciesNames.filter(n => world.registry[n].parent && world.registry[n].lineage.startsWith(root) && !world.registry[n].waiting)
      .slice(-8).map(n => {
        const r = world.registry[n], st = world.stats[n];
        const fate = r.extinct === null ? `still alive (${world.lastCounts[n] ?? 0})`
          : `extinct after ${Math.max(0, r.extinct - r.born)} seasons, ${st.starved >= st.eaten ? 'starving' : 'eaten'}`;
        return `- the ${n}s (${r.lineage}): ${r.intent ? `"${r.intent}"` : '(intent not recorded)'} → ${fate}, peak ${world.records[n]?.peak ?? '?'}`;
      });
  }

  // As soon as a study produces a new hunter, a batch of it is released, whatever else is alive.
  function releaseFresh(name) {
    if (world.diets().plantEaters < IMMIGRATION.freshPrey) return; // too little to hunt yet: it waits for the 150 rule
    world.freshFromStudy = true;
    world.reintroduce(true, name, IMMIGRATION.hunters);
    world.freshFromStudy = false;
  }

  async function learn(latest) {
    const parent = reflectFrom(latest);
    const viaBridge = bridgeAlive();
    const r = await reflect(parent, world.evolvedCode(parent), world.lessons, takenNames(world), viaBridge ? evidence(latest) : null, viaBridge);
    world.pendingStudies = (world.pendingStudies ?? []).filter(n => n !== latest);
    if (r.study) world.log(`The god's study: ${r.study}`);
    if (r.study) note(`## Season ${world.season}: study after the ${latest}s collapsed\n${world.lessons.at(-1) ? lessonText(world.lessons.at(-1)) : ''}\n\n${r.study}`);
    console.log(`god studies ${parent}: ${r.born ? `holds ${r.name}` : `nothing new (${r.error})`} after ${r.attempts} tries, ${r.seconds.toFixed(1)}s`);
    if (!r.born) return world.log(`The god finds nothing new. The ${world.latest(true)}s will return as they were.`);
    world.holdSpecies(r.name, parent, r.code, lin => `It tries something new, and holds the ${r.name}s (${lin}) in its hand.`);
    world.registry[r.name].study = r.study;
    releaseFresh(r.name);
    const file = path.join('species', `${r.name}.js`), lin = n => world.registry[n].lineage;
    const studyLines = r.study ? r.study.replace(/(.{1,100})(\s|$)/g, '// study: $1\n') : '';
    fs.writeFileSync(path.join(ROOT, file), `// ${r.name} (${lin(r.name)}): written by ${r.god} after the ${parent}s (${lin(parent)}) collapsed, in season ${world.season}.\n` +
      world.lessons.map(l => `// lesson ${lessonText(l).slice(2)}`).join('\n') + `\n${studyLines}${r.code}\n`);
    fossilize(file, `Season ${world.season}: after the ${parent}s (${lin(parent)}) collapsed, the god writes the ${r.name}s (${lin(r.name)})`);
  }

  async function next() {
    if (busy || !queue.length) return;
    const task = busy = queue.shift(), parent = task.name;
    status();
    try {
      if (task.kind === 'learn') return await learn(parent);
      if (world.registry[parent].extinct !== null || (world.lastCounts[parent] ?? 0) < MIN_PARENT_POPULATION) {
        world.log(`The god turns to the ${parent}s, but too few are left to change.`);
        return;
      }
      const viaBridge = bridgeAlive();
      const r = await speciate(parent, world.evolvedCode(parent), takenNames(world), viaBridge ? BRANCH_PROMPT(pastBranches(parent)) : undefined, viaBridge);
      console.log(`god → ${parent}: ${r.born ? `born ${r.name}` : `stillborn (${r.error})`} after ${r.attempts} tries, ${r.seconds.toFixed(1)}s`);
      if (!r.born) {
        world.log(`The god reached into the ${parent}s ${r.failures.length} times: ${describeFailures(r.failures, parent)}.`);
      } else {
        // Parents gone or too few to spare: the god keeps the new species until the meadow is empty of its kind.
        const held = world.registry[parent].extinct !== null || (world.lastCounts[parent] ?? 0) < 3;
        if (held) world.holdSpecies(r.name, parent, r.code); else world.addSpecies(r.name, parent, r.code);
        if (r.study) {
          world.registry[r.name].intent = r.study;
          world.log(`The god's intent for the ${r.name}s: ${r.study}`);
          note(`## Season ${world.season}: the ${r.name}s (${world.registry[r.name].lineage}) branch from the ${parent}s\nIntent: ${r.study}`);
        }
        const file = path.join('species', `${r.name}.js`), lin = n => world.registry[n].lineage;
        const how = held ? 'held by the god after the' : 'branched from the';
        fs.writeFileSync(path.join(ROOT, file), `// ${r.name} (${lin(r.name)}): ${how} ${parent}s (${lin(parent)}) in season ${world.season}, written by ${r.god}.\n${r.code}\n`);
        fossilize(file, `Season ${world.season}: the ${r.name}s (${lin(r.name)}) ${held ? 'are held by the god' : 'branch'} from the ${parent}s (${lin(parent)})`);
      }
    } catch (e) {
      console.error('god:', e.message);
      world.log(`The god is silent about the ${parent}s.`);
    } finally {
      busy = null;
      status();
      next();
    }
  }

  // A hunter the god finished before a restart is released straight away.
  const heldHunter = world.speciesNames.find(n => world.registry[n].waiting && (world.registry[n].avgGut ?? world.registry[n].gut) >= 0.5);
  if (heldHunter) releaseFresh(heldHunter);

  // A study interrupted by a restart: no flesh-eaters, none held, lessons on record.
  const flesh = n => (world.registry[n].avgGut ?? world.registry[n].gut) >= 0.5;
  for (const name of world.pendingStudies ?? []) if (world.registry[name]) enqueue({ kind: 'learn', name });

  // Mark the fossil, so `git log species/` reads as a history of life.
  const mark = (name, line, message) => {
    const file = path.join('species', `${name}.js`);
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) return;
    fs.writeFileSync(full, `// ${line} in season ${world.season}.\n` + fs.readFileSync(full, 'utf8'));
    fossilize(file, `Season ${world.season}: ${message}`);
  };
  world.onExtinct = name => {
    mark(name, '† extinct', `the ${name}s (${world.registry[name].lineage}) are extinct`);
    const r = world.registry[name], st = world.stats[name];
    if (r.intent || r.study) note(`Outcome, season ${world.season}: the ${name}s (${r.lineage}) are extinct after ${Math.max(0, r.extinct - r.born)} seasons; ` +
      `peak ${world.records[name]?.peak ?? '?'}, ${st.starved} starved, ${st.eaten} eaten, ${st.kills} kills.`);
  };
  world.onRevive = name => mark(name, '↺ returned', `the ${name}s return`);

  // Species the world splits on its own, by drift: fossilize their evolved code.
  world.isTaken = name => takenNames(world).has(name);
  world.onSplit = (name, parent) => {
    const file = path.join('species', `${name}.js`), lin = n => world.registry[n].lineage;
    fs.writeFileSync(path.join(ROOT, file), `// ${name} (${lin(name)}): drifted apart from the ${parent}s (${lin(parent)}) in season ${world.season}; named by the world.\n${world.code[name]}\n`);
    fossilize(file, `Season ${world.season}: the ${name}s (${lin(name)}) drift apart from the ${parent}s (${lin(parent)})`);
  };
  for (const name of world.rewritten ?? []) fossilize(path.join('species', `${name}.js`), `Season ${world.season}: the god rewrites the ${name}s (${world.registry[name].lineage})`);
}
