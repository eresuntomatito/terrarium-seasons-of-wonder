// The god's one power: rewrite a behavior and see if it lives.
// CLI: node god/mutate.mjs wanderer   (the miniature: mutates species/<name>.mutant.js in place)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = process.env.GOD_MODEL ?? 'qwen2.5-coder:1.5b';
const ATTEMPTS = 4;
// Over the bridge, the server drops each prompt in data/god/requests/ and waits for data/god/responses/. Naming stays local.
// The god is a hybrid: when a Claude Code session is listening (its watcher keeps data/god/bridge.alive fresh),
// new species are designed by a Claude Haiku subagent over the bridge; otherwise local Qwen answers.
export const HAIKU = 'claude-haiku';
const GOD_DIR = path.join(ROOT, 'data', 'god');
export const QWEN = MODEL;
const HEARTBEAT = path.join(GOD_DIR, 'bridge.alive');
const heartbeatAge = () => { try { return Date.now() - fs.statSync(HEARTBEAT).mtimeMs; } catch { return Infinity; } };
export const bridgeAlive = () => heartbeatAge() < 30_000;

const WORLD_DESCRIPTION = `Each frame it is called as behave(me, world) and must return {x, y}: a steering force.
me: {x, y, vx, vy, energy, age, size, gut, hue, fertile, genes, memory, legs, maxSpeed, stamina, fat}
  fat is stored food: it builds up when well fed, is burnt when hungry, slows it down, and feeds whoever eats it.
  smell: {prey: {x, y, strength}, danger: {x, y, strength}}: which way the scent of plant-eaters (prey) and of flesh-eaters (danger)
    grows stronger, and how strong it is here. Scent trails reach far beyond sight and fade in seconds.
  A starving body is slower; fat weighs it down.
  legs sets its cruising speed (maxSpeed); stamina is 0..1, what is left for sprinting.
  size is its body size; gut is 0 for a plant-eater up to 1 for a flesh-eater.
  Only a gut below 0.75 can graze plants, and only a gut above 0.25 has jaws to eat creatures or corpses.
  genes is an array of 4 numbers between 0 and 1, different for each creature and inherited by its children.
  memory is an object you may store anything in; it persists between frames.
me.bumped: how much it has run into reef lately (0 = not at all); solid reef blocks the way and turns it aside.
world: {width, height, t, season (0 at the start of a season … 1 at its end, then again), food, others, noise(x, y) -> -1..1}
  food: [{x, y, vx, vy, size, plant, species, kin}] everything it could eat right now: plants (plant: true) and creatures small enough to overpower.
  others: [{x, y, vx, vy, size, species, kin, willing, signal, energy}] creatures nearby. Anything 1.2 times its size or bigger could eat it.
  kin is true when the other creature is the same species; willing is true when it wants to mate.
The returned object may also contain:
  mate: true to be willing to reproduce. Two willing kin that touch have a child together; a willing creature with lots of energy and no partner buds a weaker child alone.
  give: 0..1, the share of its energy it puts into a child.
  signal: 0..1, a display the others can see.
  eat: false to leave alone the food it touches (otherwise it eats whatever food it touches).
  sprint: true to burst at 1.6 times its speed while stamina lasts (it drains fast, and recovers slowly when not sprinting).
  hue: 0..360, its colour.`;

const MINIATURE_PROMPT = (name, code) => `You are the god of a tiny terrarium. Below is the JavaScript behavior of a creature called "${name}".
${WORLD_DESCRIPTION}

Mutate this behavior: make one or two strange, surprising changes so the creature acts differently.
Keep the exact signature \`function behave(me, world)\`. Use only plain JavaScript and Math.
Return only the code in one \`\`\`js block, no explanation.

\`\`\`js
${code}
\`\`\``;

// The blind god: no census, no goal, just strangeness. The world decides what lasts.
const SPECIATE_PROMPT = code => `Below is the JavaScript behavior of a creature living in a terrarium.
${WORLD_DESCRIPTION}

A new species is branching off from this one. Write its behavior: make one or two strange, surprising changes to how it moves, courts, mates or treats others, so it acts differently. Changing only colours or comments does not count.
Keep the exact signature \`function behave(me, world)\`. Use only plain JavaScript and Math.
Return only the code in one \`\`\`js block, no explanation.

\`\`\`js
${code}
\`\`\``;

// The small god's usual way to branch a species: one changed line, steered by a random nudge.
// Short answers come back fast and whole, and a slip in one line is often the most interesting kind of change.
const NUDGES = [
  'make it use its memory (me.memory) to remember something about the last few moments',
  'make it react to the signals of its own kind (o.signal)',
  'make it care about the smell of danger or of prey (me.smell)',
  'make it behave differently when it is fat (me.fat) or tired (me.stamina)',
  'make it move differently when it is with many of its own kind than when it is alone',
  'make it bolder or more timid toward bigger creatures',
  'make it choose a different kind of food first',
  'make it change how much it gives to its children, or when it is willing to mate',
  'make it wander in a stranger pattern when it has nothing to do',
  'make it sprint at a different moment',
  'make it keep closer to, or further from, its own kind',
  'make it follow, shadow or copy the movement of another creature',
];
export const EDIT_PROMPT = (nudge, focus) => code => `Below is the JavaScript behavior of a creature living in a terrarium.
${WORLD_DESCRIPTION}

A new species is branching off from this one. Change exactly ONE line of its behavior so it acts differently. Idea: ${nudge}.${focus ? `
This line shapes its behavior more than most, so a change there will show: ${focus.trim()}
Change that line, or the line that best fits the idea.` : ''}
Pick a line that actually runs: a line inside a branch that never happens changes nothing, and will be thrown away.
Answer in exactly this format, copying the old line exactly as it appears:
OLD: <the line as it is now>
NEW: <the line as it should become>

\`\`\`js
${code}
\`\`\``;
const pickNudge = () => NUDGES[Math.floor(Math.random() * NUDGES.length)];

// Put a changed line in place of the old one: an exact match, else the most similar line (if it is similar enough).
function applyEdit(code, oldText, newText) {
  const lines = code.split('\n');
  const olds = oldText.trim().split('\n').map(l => l.trim()).filter(Boolean), news = newText.trim().split('\n');
  if (!olds.length || !news.join('').trim()) return null;
  if (olds.length > 1) {
    // A block: find the same lines in a row (ignoring indentation) and put the new block in their place.
    for (let i = 0; i + olds.length <= lines.length; i++) {
      if (olds.every((o, j) => lines[i + j].trim() === o)) {
        const indent = lines[i].match(/^\s*/)[0];
        lines.splice(i, olds.length, ...news.map(l => indent + l.trim()));
        return lines.join('\n');
      }
    }
    return null;
  }
  const want = olds[0], newLine = news.join(' ');
  let at = lines.findIndex(l => l.trim() === want);
  if (at < 0) {
    const words = s => new Set(s.match(/[A-Za-z_][\w.]*|\d+(\.\d+)?|[<>=!+\-*/]+/g) ?? []);
    const w = words(want);
    let best = 0;
    lines.forEach((l, i) => { const v = words(l), common = [...w].filter(t => v.has(t)).length, score = common / Math.max(w.size, v.size, 1); if (score > best) { best = score; at = i; } });
    if (best < 0.6) return null;
  }
  const indent = lines[at].match(/^\s*/)[0];
  lines[at] = indent + newLine.trim();
  return lines.join('\n');
}

// A god that runs out of words mid-function: close what it left open, and see whether what it wrote can live.
function closeBrackets(code) {
  const bare = code.replace(/\/\/[^\n]*/g, '').replace(/(['"\`])(?:\\.|(?!\1).)*\1/g, '');
  const open = (bare.match(/[({[]/g) ?? []).length - (bare.match(/[)}\]]/g) ?? []).length;
  if (open <= 0 || open > 6) return code;
  const stack = [];
  for (const ch of bare) { if ('({['.includes(ch)) stack.push(ch); else if (')}]'.includes(ch)) stack.pop(); }
  return code + '\n' + stack.reverse().map(ch => ({ '(': ')', '{': '}', '[': ']' })[ch]).join('');
}

// The reflecting god: after hunters collapse, it studies what happened to every attempt and tries something else.
export const lessonText = l =>
  `- the ${l.name}s (${l.lineage}) lasted ${l.days} days, grew to ${l.peak}, killed ${l.kills}; then ${l.starved} starved, ${l.eaten} were eaten, ${l.old} died old. ${l.preyLeft} plant-eaters were left.` +
  (l.belief ? `\n  You had designed them because you believed: "${l.belief}"` : '');
// A small god cannot invent a strategy from 'try something different', so each attempt draws one natural idea.
const HUNTING_IDEAS = [
  'wait almost still in tall grass until prey comes within 25 units, then pounce',
  'hunt as a pack: move toward other hunters of its own kind and chase the prey they chase',
  'only chase prey when its own energy is below 1; otherwise rest and drift slowly',
  'follow herds from about 60 units away and only strike at prey that is far from the others',
  'chase the smallest prey it can see instead of the nearest one',
  'remember in me.memory where it last ate, and go back there when no prey is in sight',
  'spread out: move away from other hunters of its kind so each keeps its own hunting ground',
  'patrol in a wide slow circle when prey is scarce, and only chase prey that comes close',
  'chase prey only if that prey is moving slower than itself',
  'when prey is scarce, eat plants it walks over (return eat: true) and stop chasing',
];
const REFLECT_PROMPT = (lessons) => code => `You are the god of a terrarium. Your hunters keep dying out. This is what happened to them, oldest first:
${lessons.map(lessonText).join('\n')}

Below is the JavaScript behavior of the last hunter.
${WORLD_DESCRIPTION}

Write a new hunter behavior that is clearly different, so hunters last longer without wiping out the creatures they eat.
The new hunter must do this: ${HUNTING_IDEAS[Math.floor(Math.random() * HUNTING_IDEAS.length)]}.
Change the code itself to do it; renaming or changing comments does not count.
Keep the exact signature \`function behave(me, world)\`. Use only plain JavaScript and Math.
Return only the code in one \`\`\`js block, no explanation.

\`\`\`js
${code}
\`\`\``;

// The branching god over the bridge: strange new relatives, written with the record of earlier branches.
export const BRANCH_PROMPT = past => code => `Below is the JavaScript behavior of a creature living in a terrarium.
${WORLD_DESCRIPTION}

A new species is branching off from this one. Write its behavior: make one or two strange, surprising changes to how it moves, courts, mates or treats others, so it acts differently. Changing only colours, comments or numbers does not count.
${past.length ? `What earlier branches of this family tried, and what became of them (learn from this: strange is good, but ideas that died within a season were dead ends):\n${past.join('\n')}\n` : ''}
Keep the exact signature \`function behave(me, world)\`. Use only plain JavaScript and Math.
Answer in exactly this format:
INTENT:
<one sentence: what you changed and what you hope it does>
CODE:
\`\`\`js
function behave(me, world) { ... }
\`\`\`

\`\`\`js
${code}
\`\`\``;

// The studying god (Claude, over the bridge): gets the whole evidence, writes a diagnosis, then a design.
const STUDY_PROMPT = (lessons, ev) => code => `You are the god of a terrarium. Your hunters keep dying out. Study what happened, then design a better hunter.

Every collapse so far, oldest first:
${lessons.map(lessonText).join('\n')}

How the last hunters fared after their release:
${ev.series.join('\n')}

The prey now:
${ev.preyLines.join('\n')}
The last hunter's body: ${ev.hunterBody}. From now on hunters are released at about 1.5 times the prey's size.
Running costs scale with body size (bigger is costlier and turns slower); energy storage and breeding thresholds do not.

What the hunters eat, the plant-eaters' behavior:
\`\`\`js
${ev.preyCode}
\`\`\`

The last hunter's behavior:
\`\`\`js
${code}
\`\`\`
${WORLD_DESCRIPTION}

First write your study: 3 to 5 sentences on why these hunters died and what a hunter would need to do differently.
Then write the new behavior, keeping the exact signature \`function behave(me, world)\`, plain JavaScript and Math only.
Answer in exactly this format:
STUDY:
<your study>
CODE:
\`\`\`js
function behave(me, world) { ... }
\`\`\``;

// Runs inside the vm right after the candidate's code. Throws if the creature is unviable;
// otherwise returns a fingerprint of everything it did, so a child can be compared with its parent.
// Randomness is seeded so the same code always leaves the same fingerprint. Colour is left out on purpose.
const TRIAL = `
;(() => {
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  Math.random = rnd;
  const others = Array.from({ length: 12 }, (_, i) => ({ x: rnd() * 400, y: rnd() * 400, vx: rnd() - 0.5, vy: rnd() - 0.5,
    size: 3 + rnd() * 8, species: i % 3 ? 'wanderer' : 'stalker', kin: i % 2 === 0, willing: i % 4 === 0, signal: rnd(), energy: Math.round(rnd() * 15) / 10 }));
  const food = Array.from({ length: 14 }, () => ({ x: rnd() * 400, y: rnd() * 400, vx: 0, vy: 0, size: 0, plant: true, amount: rnd() }))
    .concat(others.filter(o => o.size < 5).map(o => ({ ...o, plant: false })))
    .concat(Array.from({ length: 4 }, () => ({ x: rnd() * 400, y: rnd() * 400, vx: 0, vy: 0, size: 0, plant: false, corpse: true, species: 'wanderer', amount: rnd() })));
  const me = { x: 200, y: 200, vx: 0, vy: 0, energy: 1, age: 0, size: 6, gut: 0.5, hue: 140, fertile: false, genes: [0.2, 0.8, 0.5, 0.35], memory: {}, legs: 1, maxSpeed: 2.2, stamina: 1, fat: 0, smell: { prey: { x: 1, y: 0, strength: 0.3 }, danger: { x: 0, y: 1, strength: 0.1 } } };
  const trace = [];
  for (let t = 0; t < 300; t++) {
    // Many moments in one scene: hungry and full, fat and lean, tired, alone or crowded, smelling prey or danger.
    me.energy = 1 + 0.95 * Math.sin(t / 15); me.fertile = t % 40 > 10; me.bumped = t % 100 < 20 ? 3 : 0;
    me.fat = t % 90 < 30 ? 0.6 : 0; me.stamina = t % 60 < 15 ? 0.1 : 1;
    me.smell.prey.strength = 0.1 + 0.8 * Math.sin(t / 11) ** 2; me.smell.danger.strength = t % 80 < 20 ? 0.8 : 0.05;
    for (const o of others) o.signal = (o.signal + 0.37) % 1;
    const world = { width: 400, height: 400, t, season: (t % 100) / 100, food: t % 50 < 10 ? [] : food, others: t % 70 < 10 ? [] : t % 70 < 25 ? others.slice(0, 3) : others,
      noise: (x, y) => Math.sin(x * 0.01 + t * 0.01) * Math.cos(y * 0.013) };
    const f = behave(me, world);
    if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y))
      throw new Error('tick ' + t + ' returned ' + JSON.stringify(f));
    trace.push(f.x.toFixed(3), f.y.toFixed(3), f.mate ? 1 : 0, Number(f.give).toFixed(2), Number(f.signal).toFixed(2), f.eat === false ? 0 : 1, f.sprint ? 1 : 0);
    me.vx += f.x * 0.1; me.vy += f.y * 0.1;
    me.x = (me.x + me.vx + 400) % 400; me.y = (me.y + me.vy + 400) % 400;
    me.age++;
  }
  return trace.join(',');
})();`;

function extractCode(text) {
  const block = text.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/);
  return (block ? block[1] : text).replace(/^\s*export\s+(default\s+)?/m, '').trim();
}

// Not a security boundary (node:vm can be escaped), just a crash/hang filter for a dumb local god.
export function trial(code) {
  if (!code.includes('function behave')) return { error: 'no behave() function' };
  try {
    return { fingerprint: vm.runInNewContext(code + TRIAL, {}, { timeout: 1000 }) };
  } catch (e) {
    return { error: e.message };
  }
}

async function ask(prompt, numPredict = 1200, temperature = 1.0) {
  const t0 = Date.now();
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({ model: MODEL, prompt, stream: false, options: { temperature, num_predict: numPredict, num_ctx: 8192 } }),
  });
  if (!res.ok) throw new Error(`Ollama said ${res.status}: ${await res.text()}`);
  return { text: (await res.json()).response, seconds: (Date.now() - t0) / 1000 };
}

function stillbirth(label, code, error) {
  const dir = path.join(ROOT, 'stillbirths');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${label}-${Date.now()}.js`), `// stillborn: ${error}\n${code}\n`);
}

const SYLLABLES = ['mo', 'ra', 'ke', 'li', 'thu', 'ven', 'sa', 'or', 'qui', 'bel', 'dro', 'na', 'zu', 'fi', 'gal', 'om'];
const invent = () => Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)]).join('');

// The name the god gave, made safe as a file name and unique among all species that ever lived.
function christen(word, taken) {
  let name = (word.match(/[A-Za-z][A-Za-z-]*/)?.[0] ?? '').toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, '').slice(0, 16);
  if (name.length < 3 || ['behave', 'creature', 'species', 'name'].includes(name)) name = invent();
  const base = name;
  for (let i = 2; taken.has(name); i++) name = base + i;
  return name;
}

// Branch a new species off a parent's code. A child that crashes, hangs, or behaves exactly like its parent
// does not count; the god gets a few tries. Returns { born, name, code, error, seconds, attempts }.
// How differently a child behaves from its parent in the trial scene: mean gap between their recorded outputs.
function difference(a, b) {
  const x = a.split(',').map(Number), y = b.split(',').map(Number);
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += Math.min(1, Math.abs((x[i] || 0) - (y[i] || 0)));
  return sum / x.length;
}

// Hand a prompt across the bridge and wait for the answer: up to 20 minutes, or until the listener goes quiet.
async function askBridge(prompt, kind) {
  const id = `${Date.now()}-${kind}`;
  for (const d of ['requests', 'responses']) fs.mkdirSync(path.join(GOD_DIR, d), { recursive: true });
  const request = path.join(GOD_DIR, 'requests', `${id}.json`), response = path.join(GOD_DIR, 'responses', `${id}.json`);
  fs.writeFileSync(request, JSON.stringify({ id, kind, prompt }, null, 2));
  const t0 = Date.now();
  try {
    while (!fs.existsSync(response)) {
      if (Date.now() - t0 > 20 * 60_000 || heartbeatAge() > 90_000) throw new Error('the bridge went quiet');
      await new Promise(r => setTimeout(r, 2000));
    }
    const { text, study } = JSON.parse(fs.readFileSync(response, 'utf8'));
    return { text, study, seconds: (Date.now() - t0) / 1000 };
  } finally {
    fs.rmSync(request, { force: true });
    fs.rmSync(response, { force: true });
  }
}

// A name, asked for on its own once the code is known to live, so the code request has a single job.
async function nameFor(code, taken) {
  const { text, seconds } = await ask(`Here is the behavior of a new creature in a terrarium:\n\`\`\`js\n${code}\n\`\`\`\n` +
    'Invent a name for this creature: one new word that is not a real word. Answer with the word only.', 12);
  return { name: christen(text, taken), seconds };
}

// Which lines shape a behavior most, measured in the trial scene: each line is nudged in turn (its numbers halved,
// or, without numbers, left out) and the change in what the creature does is weighed. Like regulatory genes,
// a few lines decide most of what a body does. Returns one line: usually the strongest, sometimes one of the next few.
export function focusLine(code, print) {
  if (!print) return null;
  const lines = code.split('\n'), scored = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t || t.startsWith('//') || /^[{}()\[\];,]*$/.test(t) || /^function behave/.test(t)) return;
    const probes = /\d/.test(t.replace(/\/\/.*$/, ''))
      ? [line.replace(/(?<![\w.])(\d+(\.\d+)?)(?![\w.])/g, m => String(Number(m) / 2))]
      : [/[{}]/.test(t) ? null : '// ' + line].filter(Boolean);
    let best = 0;
    for (const probe of probes) {
      const r = trial([...lines.slice(0, i), probe, ...lines.slice(i + 1)].join('\n'));
      if (r.fingerprint) best = Math.max(best, difference(print, r.fingerprint));
    }
    if (best > 0) scored.push({ line, best });
  });
  if (!scored.length) return null;
  scored.sort((a, b) => b.best - a.best);
  return (Math.random() < 0.6 ? scored[0] : scored[Math.floor(Math.random() * Math.min(5, scored.length))]).line;
}

// Branch a new species off a parent's code. A child that crashes, hangs, or behaves exactly like its parent
// does not count; the god gets a few tries. Once one lives, the god makes one more, and the child that
// differs most from its parent is kept. Returns { born, name, code, error, failures, seconds, attempts }.
export async function speciate(parentName, parentCode, taken, makePrompt = null, viaBridge = false) {
  parentCode = parentCode.replace(/^\/\/ [†↺].*\n/gm, '');
  const editing = !makePrompt && !viaBridge, nudge = pickNudge();
  const parentPrint = trial(parentCode).fingerprint;
  makePrompt ??= EDIT_PROMPT(nudge, editing ? focusLine(parentCode, parentPrint) : null);
  let seconds = 0, attempts = 0, best = null, last = {}, study, god = viaBridge ? HAIKU : QWEN;
  const failures = [];
  while (attempts < ATTEMPTS + (best ? 1 : 0) && !(best && best.extra)) {
    attempts++;
    let answer = null;
    if (viaBridge) answer = await askBridge(makePrompt(parentCode), parentName).catch(e => { console.log(`bridge: ${e.message}; Qwen answers instead`); viaBridge = false; return null; });
    if (!answer) { answer = await ask(makePrompt(parentCode), editing ? 900 : 1200, editing ? 1.2 : 1.0); god = QWEN; }
    seconds += answer.seconds;
    study = answer.study ?? answer.text.match(/(?:STUDY|INTENT):\s*([\s\S]*?)\s*CODE:/)?.[1]?.trim().replace(/\s+/g, ' ') ?? study;
    let code;
    if (editing) {
      // Qwen answers as it likes: one line each, fenced blocks, or a whole new function. All three are taken.
      const edit = answer.text.match(/OLD:\s*(?:```\w*\n)?([\s\S]*?)(?:```)?\s*NEW:\s*(?:```\w*\n)?([\s\S]*?)(?:```|$)/);
      code = edit ? applyEdit(parentCode, edit[1], edit[2]) : null;
      if (code) study = `${nudge}: "${edit[1].trim().split('\n')[0]}" became "${edit[2].trim().split('\n')[0]}"`;
      else if (/function behave/.test(answer.text)) { code = extractCode(answer.text).trim(); study = `${nudge} (rewritten whole)`; }
      if (!code) { stillbirth(`${parentName}-child`, answer.text, 'no usable edit'); failures.push('no usable edit'); last = { code: answer.text, error: 'no usable edit' }; continue; }
    } else code = extractCode(answer.text).replace(/^\s*\/\/\s*name\s*:.*$/gim, '').trim();
    let t = trial(code);
    if (t.error && /end of input|missing \)|Unexpected end/i.test(t.error)) { const fixed = closeBrackets(code); const t2 = trial(fixed); if (!t2.error) { code = fixed; t = t2; } }
    // The trial scene runs through hunger, fat, fatigue, smell, signals and crowding, so an edit that changes
    // nothing there is an edit to a line that never runs: a copy of its parent.
    const same = t.fingerprint === parentPrint;
    const error = t.error ?? (same ? 'a copy of its parent' : null);
    if (error) {
      stillbirth(`${parentName}-child`, answer.text, error);
      failures.push(error);
      last = { code, error };
      if (best) break; // the extra try failed: keep the first child
      continue;
    }
    const candidate = { code, distance: difference(parentPrint, t.fingerprint) };
    if (!best) best = candidate;
    else { if (candidate.distance > best.distance) best = candidate; best.extra = true; }
    if (god === HAIKU) break; // a capable god needs no second draft
  }
  if (!best) return { born: false, ...last, failures, seconds, attempts, study, god };
  const named = await nameFor(best.code, taken);
  // A one-line edit is a mutation, not a new species: its carriers can still breed with their parents' kind.
  return { born: true, name: named.name, code: best.code, seconds: seconds + named.seconds, attempts, study, god, variant: editing };
}

// After a collapse: a new hunter written with the lessons of every collapse so far.
export const reflect = (parentName, parentCode, lessons, taken, evidence, viaBridge = false) =>
  speciate(parentName, parentCode, taken, viaBridge && evidence ? STUDY_PROMPT(lessons, evidence) : REFLECT_PROMPT(lessons), viaBridge);

// The miniature: mutate species/<name>.mutant.js (or the original) in place.
export async function mutate(name) {
  const mutantFile = path.join(ROOT, 'species', `${name}.mutant.js`);
  const parentFile = fs.existsSync(mutantFile) ? mutantFile : path.join(ROOT, 'species', `${name}.js`);
  const { text, seconds } = await ask(MINIATURE_PROMPT(name, fs.readFileSync(parentFile, 'utf8')));
  const code = extractCode(text);
  const { error } = trial(code);
  if (error) {
    stillbirth(name, code, error);
    return { born: false, error, code, seconds };
  }
  fs.writeFileSync(mutantFile, code + '\n');
  return { born: true, code, seconds };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = await mutate(process.argv[2] ?? 'wanderer');
  console.log(r.code);
  console.log(`\n${r.born ? 'BORN' : 'STILLBORN: ' + r.error} (${r.seconds.toFixed(1)}s)`);
}
