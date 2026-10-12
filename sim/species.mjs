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
    return { x: f.x, y: f.y, hue: num(f.hue), mate: !!f.mate, give: num(f.give), signal: num(f.signal), eat: f.eat !== false };
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
