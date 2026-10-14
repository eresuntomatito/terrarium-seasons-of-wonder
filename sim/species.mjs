// The seed species (hand-written) and the compiler that turns any behavior source into a callable batch.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadSeed() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'species', 'registry.json'), 'utf8'));
}

export function readCode(name) {
  return fs.readFileSync(path.join(ROOT, 'species', `${name}.js`), 'utf8');
}

// The numbers in a behavior are genes. Every numeric literal (except 0 and array indices like genes[2])
// becomes __K[i]; each creature carries its own values, inherited and drifting at every birth.
// Returns the template and the literal values it was written with.
export function genomeOf(code) {
  // Blank out comments and strings, keeping positions, so their digits are left alone.
  const blank = code.replace(/\/\/.*$|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/gm, m => ' '.repeat(m.length));
  const consts = [], cuts = [];
  for (const m of blank.matchAll(/(?<![\w$.])(\d+\.\d*|\.\d+|\d+)(?![\w$.])/g)) {
    const before = blank.slice(0, m.index).trimEnd().at(-1), after = blank.slice(m.index + m[0].length).trimStart()[0];
    if (Number(m[1]) === 0 || (before === '[' && after === ']')) continue;
    cuts.push([m.index, m[0].length]);
    consts.push(Number(m[1]));
  }
  let template = '', last = 0;
  cuts.forEach(([at, len], i) => { template += code.slice(last, at) + `__K[${i}]`; last = at + len; });
  return { template: template + code.slice(last), consts };
}

// Writes numbers back into a template, e.g. a population's average genes, so the code reads as it has evolved.
export function fillTemplate(template, values) {
  return template.replace(/__K\[(\d+)\]/g, (_, i) => String(Number(values[i].toPrecision(3))));
}

// Runs a whole species' batch inside its context so one timeout covers every call.
// Each item carries the creature's own numbers, which the template reads as __K.
const RUNNER = new vm.Script(`__out = __batch.map(([me, world, k]) => {
  globalThis.__K = k;
  try {
    const f = behave(me, world);
    if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y)) return { error: 'bad force' };
    const num = v => Number.isFinite(v) ? v : undefined;
    return { x: f.x, y: f.y, hue: num(f.hue), mate: !!f.mate, give: num(f.give), signal: num(f.signal), eat: f.eat !== false, sprint: !!f.sprint };
  } catch (e) {
    return { error: String(e && e.message) };
  }
});`);

// Returns batch => forces. Not a security boundary, just a crash/hang filter.
export function compileBehavior(name, code, consts = []) {
  const ctx = vm.createContext({ __K: consts });
  try {
    vm.runInContext(code + '\n;globalThis.behave = behave;', ctx, { timeout: 1000 });
  } catch (e) {
    console.error(`${name}: behavior failed to load: ${e.message}`);
    return batch => batch.map(() => ({ error: 'stillborn' }));
  }
  return batch => {
    ctx.__batch = batch;
    RUNNER.runInContext(ctx, { timeout: 250 });
    return ctx.__out;
  };
}

// A slip in the code, as at a birth: one small random edit of the kind that changes what a creature does.
// Returns { code, what } or null when no edit applies. Comments are left alone.
// Each slip has a weight: subtle slips (when something happens) are common, crude ones (which way to go) rare,
// since the crude ones nearly always kill their carriers within days.
const FLIP = { ' < ': ' >= ', ' > ': ' <= ', ' <= ': ' > ', ' >= ': ' < ' };
const SENSES = ['me.energy', 'me.stamina', 'me.fat', 'me.size'];
const SLIPS = [
  { what: 'a comparison flipped', weight: 4, re: / (<=|>=|<|>) /g, to: m => FLIP[m] },
  { what: 'a push reversed', weight: 0.5, re: / (\+=|-=) /g, to: m => (m === ' += ' ? ' -= ' : ' += ') },
  { what: '"and" turned to "or"', weight: 3, re: / (&&|\|\|) /g, to: m => (m === ' && ' ? ' || ' : ' && ') },
  { what: 'left and right confused with up and down', weight: 0.5, re: /\.(x|y)\b/g, to: m => (m === '.x' ? '.y' : '.x') },
  { what: 'a number turned negative', weight: 1, re: /(?<=[\s(*+\/,])(\d+(\.\d+)?)(?=[\s),;*])/g, to: m => `-${m}` },
  { what: 'a yes turned to no', weight: 1.5, re: /\b(true|false)\b/g, to: m => (m === 'true' ? 'false' : 'true') },
  { what: 'one sense mistaken for another', weight: 1.5, re: /\bme\.(energy|stamina|fat|size)\b/g,
    to: m => { const all = SENSES.filter(v => v !== m); return all[Math.floor(Math.random() * all.length)]; } },
  { what: 'one urge forgotten', weight: 0.5, re: /^\s*(x|y) [+-]= [^\n]*;[^\n]*$/gm, to: () => '' },
];

// A copy that differs: a comparison flipped, a sense swapped, or its numbers rescaled (they become new genes).
function vary(text) {
  const ways = [
    t => { const h = [...t.matchAll(/ (<=|>=|<|>) /g)]; if (!h.length) return null; const m = h[Math.floor(Math.random() * h.length)];
      return t.slice(0, m.index) + FLIP[m[0]] + t.slice(m.index + m[0].length); },
    t => { const h = [...t.matchAll(/\bme\.(energy|stamina|fat|size)\b/g)]; if (!h.length) return null; const m = h[Math.floor(Math.random() * h.length)];
      const others = SENSES.filter(v => v !== m[0]); return t.slice(0, m.index) + others[Math.floor(Math.random() * others.length)] + t.slice(m.index + m[0].length); },
    t => { const f = 0.5 + Math.random() * 1.5; let n = 0;
      const r = t.replace(/(?<=[\s(*+\/,-])(\d+\.\d+|\d+)(?=[\s),;*])/g, d => { n++; return String(+(Number(d) * f).toPrecision(3)); }); return n ? r : null; },
  ].sort(() => Math.random() - 0.5);
  for (const w of ways) { const r = w(text); if (r && r !== text) return r; }
  return null;
}

// A duplication: one line or one `if` block is copied, and the copy changes. The mind grows a part it did not have,
// which selection can then shape; most new abilities in real genomes began as copies of old genes.
function duplicate(code, bare) {
  const lines = code.split('\n'), bl = bare.split('\n'), spans = [];
  for (let i = 0; i < bl.length; i++) {
    const l = bl[i].trim();
    if (/^(if \(.*\).*;|(x|y) [+-]= .*;)$/.test(l)) spans.push([i, i]);
    else if (/^if \(.*\{$/.test(l)) {
      let depth = 0;
      for (let j = i; j < bl.length; j++) {
        depth += (bl[j].match(/\{/g) ?? []).length - (bl[j].match(/\}/g) ?? []).length;
        if (depth === 0) { if (j - i <= 8 && /^\}$/.test(bl[j].trim())) spans.push([i, j]); break; }
      }
    }
  }
  for (const [a, b] of spans.sort(() => Math.random() - 0.5)) {
    const copy = vary(lines.slice(a, b + 1).join('\n'));
    if (copy) return { code: [...lines.slice(0, b + 1), copy, ...lines.slice(b + 1)].join('\n'), what: 'a part copied and changed' };
  }
  return null;
}

export function slip(code) {
  // Edits only apply outside comments: blank them in a copy to find positions, then edit the original.
  const bare = code.replace(/\/\/[^\n]*/g, m => ' '.repeat(m.length));
  const options = SLIPS.map(s => ({ s, hits: [...bare.matchAll(s.re)] })).filter(o => o.hits.length);
  const total = options.reduce((a, o) => a + o.s.weight, 0) + DUPLICATION;
  let r = Math.random() * total;
  if ((r -= DUPLICATION) < 0) { const d = duplicate(code, bare); if (d) return d; r = Math.random() * (total - DUPLICATION); }
  for (const { s, hits } of options) {
    if ((r -= s.weight) >= 0) continue;
    const h = hits[Math.floor(Math.random() * hits.length)], m = code.slice(h.index, h.index + h[0].length);
    return { code: code.slice(0, h.index) + s.to(m) + code.slice(h.index + h[0].length), what: s.what };
  }
  return null;
}
const DUPLICATION = 3;
