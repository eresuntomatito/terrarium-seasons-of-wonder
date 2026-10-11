// Ask the local god something. Usage: node god/ask.mjs "your prompt"
const MODEL = process.env.GOD_MODEL ?? 'qwen2.5-coder:1.5b';
const prompt = process.argv.slice(2).join(' ') || 'Invent a creature that lives in a terrarium. One sentence.';

const t0 = Date.now();
const res = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({ model: MODEL, prompt, stream: false }),
});
if (!res.ok) throw new Error(`Ollama said ${res.status}: ${await res.text()}`);

const { response } = await res.json();
console.log(response.trim());
console.log(`\n— ${MODEL}, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
