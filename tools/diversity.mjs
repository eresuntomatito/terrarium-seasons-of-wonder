// Diversity for a status report's window (Luis, s1337): richness, turnover, how species were born (kind and founding size)
// and how they died (cause and lifetime), plus the whole era's founding-size → lifetime table, so every report adds a point
// to the whitepaper's series.  node tools/diversity.mjs <from season> [to season]   (prints Markdown)
import fs from 'fs';
const S = 5400, w = JSON.parse(fs.readFileSync('data/world.json', 'utf8'));
const from = +process.argv[2], to = +process.argv[3] || w.season, len = Math.max(1, to - from);
const R = w.registry, gen = Object.entries(R).filter(([, r]) => (r.lineage || '').startsWith('P') && !r.variant);
// Species alive per season (from the register).
// Species alive per season: from the world's history of populations (exact; dense for recent seasons); the register only as a
// fallback (it keeps a few stale entries — species whose last members left in a split were never marked extinct).
const hist = (w.history ?? []).filter(e => e.pops);
const alive = s => {
  let best = null; for (const e of hist) if (Math.abs(e.t / S - s) < 1 && (!best || Math.abs(e.t / S - s) < Math.abs(best.t / S - s))) best = e;
  if (best) return Object.entries(best.pops).filter(([n, v]) => v > 0 && !R[n]?.unique && (R[n]?.lineage || '').startsWith('P')).length;
  return gen.filter(([, r]) => r.born <= s && (r.extinct == null || r.extinct > s)).length;
};
const rich = []; for (let s = from; s <= to; s++) rich.push(alive(s));
// Births and deaths from the chronicle.
const born = {}, died = {}, divideTicks = new Set();
for (const l of fs.readFileSync('data/server.log', 'utf8').split('\n')) {
  const m = l.match(/^\[(\d+)\]/); if (!m) continue; const t = +m[1]; let k;
  if (/divide along their own seams/.test(l)) divideTicks.add(t);
  if ((k = l.match(/(\d+) \w+ who think differently .* they are (\w+) \((P[\d.]+)\)/))) born[k[3]] = { kind: 'mind split', n: +k[1], t, name: k[2] };
  else if ((k = l.match(/(\d+) \w+ that live as ([\w ]+?) have become a kind of their own: they are (\w+) \((P[\d.]+)\)/))) born[k[4]] = { kind: 'niche split', n: +k[1], t, name: k[3] };
  else if ((k = l.match(/drifted apart\. (\d+) of them .* they are (\w+) \((P[\d.]+)\)/))) born[k[3]] = { kind: divideTicks.has(t) ? 'great divide' : 'drift split', n: +k[1], t, name: k[2] };
  if ((k = l.match(/The last \w+ dies (of old age|starving|in someone's jaws)\. (\w+) \((P[\d.]+)\) are extinct\. They lasted (\d+|one) season/)))
    died[k[3]] = { cause: k[1] === "in someone's jaws" ? 'eaten' : k[1] === 'starving' ? 'starving' : 'old age', life: k[4] === 'one' ? 1 : +k[4], t, name: k[2] };
}
const inWin = t => t / S >= from && t / S <= to, med = a => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : '–'; };
const B = Object.values(born).filter(b => inWin(b.t)), D = Object.values(died).filter(d => inWin(d.t));
const byKind = {}; for (const b of B) (byKind[b.kind] ??= []).push(b.n);
const byCause = {}; for (const d of D) (byCause[d.cause] ??= []).push(d.life);
// Predation's share of all deaths in the window, from the selection ledger snapshots.
const cycles = fs.readFileSync('data/cycles.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
const near = s => cycles.reduce((best, c) => Math.abs(c.season - s) < Math.abs((best?.season ?? -1e9) - s) ? c : best, null);
const c0 = near(from), c1 = near(to), dd = k => (c1?.deaths[k]?.n ?? 0) - (c0?.deaths[k]?.n ?? 0), tot = dd('old') + dd('starved') + dd('eaten');
// The whole era: founding size → lifetime (species that have died).
const pairs = Object.entries(born).filter(([lin, b]) => b.t >= 700 * S && died[lin]).map(([lin, b]) => [b.n, died[lin].life]);
const bucket = (a, b) => { const v = pairs.filter(p => p[0] >= a && p[0] < b).map(p => p[1]); return `${v.length} species, median ${med(v)}`; };
const out = [];
out.push(`| Measure | s${from} → s${to} (${len} seasons) |`, '|---|---|');
out.push(`| Species alive (mean / min–max) | ${(rich.reduce((a, b) => a + b, 0) / rich.length).toFixed(1)} / ${Math.min(...rich)}–${Math.max(...rich)} |`);
out.push(`| New species / extinctions (per 30 seasons) | ${B.length} / ${D.length} (${(B.length / len * 30).toFixed(1)} / ${(D.length / len * 30).toFixed(1)}) |`);
out.push(`| Born by | ${Object.entries(byKind).map(([k, v]) => `${k} ${v.length} (founders median ${med(v)})`).join(' · ') || 'none'} |`);
out.push(`| Died by | ${Object.entries(byCause).map(([k, v]) => `${k} ${v.length} (lived median ${med(v)} seasons)`).join(' · ') || 'none'} |`);
out.push(`| Lifetime of species that died (median) | ${med(D.map(d => d.life))} seasons |`);
out.push(`| Share of deaths by predation / starvation / old age | ${tot ? `${Math.round(dd('eaten') / tot * 100)}% / ${Math.round(dd('starved') / tot * 100)}% / ${Math.round(dd('old') / tot * 100)}%` : '–'} |`);
out.push('', `*The whole era (s700+), founding size → lifetime: under 20 founders: ${bucket(0, 20)} · 20–39: ${bucket(20, 40)} · 40–79: ${bucket(40, 80)} · 80+: ${bucket(80, 1e9)} (seasons).*`);
console.log(out.join('\n'));
