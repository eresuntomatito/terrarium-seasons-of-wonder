// The god's one power: rewrite a species' behavior and see if it lives.
// CLI: node god/mutate.mjs wanderer
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = process.env.GOD_MODEL ?? 'qwen2.5-coder:1.5b';

const PROMPT = (name, code) => `You are the god of a tiny terrarium. Below is the JavaScript behavior of a creature called "${name}".
Each frame it is called as behave(me, world) and must return a steering force {x, y}.
me: {x, y, vx, vy, energy, age, memory}  (memory is an object you may store anything in; it persists between frames)
world: {width, height, t, food: [{x, y}], others: [{x, y, vx, vy}], noise(x, y) -> number between -1 and 1}
You may also return hue (0-360) to change the creature's colour.

Mutate this behavior: make one or two strange, surprising changes so the creature acts differently.
Keep the exact signature \`function behave(me, world)\`. Use only plain JavaScript and Math.
Return only the code in one \`\`\`js block, no explanation.

\`\`\`js
${code}
\`\`\``;

// Runs inside the vm right after the mutant's code. Throws if the creature is unviable.
const TRIAL = `
;(() => {
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const food = Array.from({ length: 20 }, () => ({ x: rnd() * 400, y: rnd() * 400 }));
  const others = Array.from({ length: 10 }, () => ({ x: rnd() * 400, y: rnd() * 400, vx: 0, vy: 0 }));
  const me = { x: 200, y: 200, vx: 0, vy: 0, energy: 1, age: 0, memory: {} };
  for (let t = 0; t < 300; t++) {
    const world = { width: 400, height: 400, t, food, others,
      noise: (x, y) => Math.sin(x * 0.01 + t * 0.01) * Math.cos(y * 0.013) };
    const f = behave(me, world);
    if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y))
      throw new Error('tick ' + t + ' returned ' + JSON.stringify(f));
    me.vx += f.x * 0.1; me.vy += f.y * 0.1;
    me.x = (me.x + me.vx + 400) % 400; me.y = (me.y + me.vy + 400) % 400;
    me.age++;
  }
})();`;

function extractCode(text) {
  const block = text.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/);
  return (block ? block[1] : text).replace(/^\s*export\s+(default\s+)?/m, '').trim();
}

// Not a security boundary (node:vm can be escaped), just a crash/hang filter for a dumb local god.
export function trial(code) {
  try {
    vm.runInNewContext(code + TRIAL, { Math, JSON }, { timeout: 1000 });
    return null;
  } catch (e) {
    return e.message;
  }
}

export async function mutate(name) {
  const mutantFile = path.join(ROOT, 'species', `${name}.mutant.js`);
  const parentFile = fs.existsSync(mutantFile) ? mutantFile : path.join(ROOT, 'species', `${name}.js`);
  const parent = fs.readFileSync(parentFile, 'utf8');

  const t0 = Date.now();
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: MODEL, prompt: PROMPT(name, parent), stream: false,
      options: { temperature: 1.0, num_predict: 800 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama said ${res.status}: ${await res.text()}`);
  const code = extractCode((await res.json()).response);
  const seconds = (Date.now() - t0) / 1000;

  const error = code.includes('function behave') ? trial(code) : 'no behave() function';
  if (error) {
    const dir = path.join(ROOT, 'stillbirths');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${name}-${Date.now()}.js`), `// stillborn: ${error}\n${code}\n`);
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
