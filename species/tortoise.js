// ↺ returned in season 347.
// † extinct in season 344.
// ↺ returned in season 341.
// † extinct in season 341.
// ↺ returned in season 294.
// † extinct in season 293.
// ↺ returned in season 291.
// † extinct in season 290.
// ↺ returned in season 290.
function behave(me, world) {
  // A tortoise: slow, armoured, long-lived. It grazes the ground other grazers have already passed over, moving
  // against their flow toward regrowth, and keeps clear of anything big enough to eat it.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how strongly it turns against the
  // herd's flow, gene 2 how early it takes fright, gene 3 how full it must be to breed.
  const generosity = me.genes[0], contrary = 0.3 + me.genes[1] * 0.7, fright = 1.2 + me.genes[2] * 1.5, breedAt = 1.2 + me.genes[3] * 0.4;

  // Fear first: anything not of its kind and big enough to swallow it, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.4) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < (30 + o.size * 2) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 1;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.3, signal: 0, sprint: threatD < 30 };
  }

  // Grass: the greenest patch in sight, weighed against distance.
  let x = 0, y = 0, best = null, score = -Infinity;

  // Home: it remembers where it was born and drifts back when it strays too far (neighbourhoods stay local).
  me.memory.home ??= { x: me.x, y: me.y };
  let hx = me.memory.home.x - me.x, hy = me.memory.home.y - me.y;
  if (hx > world.width / 2) hx -= world.width; else if (hx < -world.width / 2) hx += world.width;
  if (hy > world.height / 2) hy -= world.height; else if (hy < -world.height / 2) hy += world.height;
  const away = Math.hypot(hx, hy);
  // The further it strays, the harder home pulls: beyond its range, homing outweighs grazing and the herd's flow.
  if (away > 80) { const pull = 1.2 * Math.min(1.5, (away - 80) / 80); x += hx / away * pull; y += hy / away * pull; }
  for (const f of world.food) {
    if (!f.plant) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y), s = f.amount - d / 80;
    if (s > score) { score = s; best = f; }
  }
  if (best) { const d = Math.hypot(best.x - me.x, best.y - me.y) || 1; x += (best.x - me.x) / d * 0.6; y += (best.y - me.y) / d * 0.6; }

  // Against the flow: other small grazers' average heading, reversed, so it walks onto ground they have left to regrow.
  let n = 0, fx = 0, fy = 0, kin = 0, mate = null, mateD = Infinity;
  const ready = me.fertile && me.energy > breedAt;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (o.kin) { kin++; if (ready && o.willing && d < mateD) { mateD = d; mate = o; } continue; }
    if (o.size < me.size * 1.4) { n++; fx += o.vx; fy += o.vy; }
  }
  if (n) { const v = Math.hypot(fx, fy) || 1; x -= fx / v * contrary; y -= fy / v * contrary; }
  if (mate) { x += (mate.x - me.x) / (mateD || 1) * 0.5; y += (mate.y - me.y) / (mateD || 1) * 0.5; }
  if (!best && !n) { const a = world.noise(me.x * 0.2, me.y * 0.2) * Math.PI * 4; x += Math.cos(a) * 0.4; y += Math.sin(a) * 0.4; }

  // An unhurried walk: it never runs unless frightened.
  if (Math.hypot(me.vx, me.vy) > me.maxSpeed * 0.6) { x -= me.vx * 0.5; y -= me.vy * 0.5; }

  return { x, y, eat: true, mate: ready, give: 0.3 + generosity * 0.3, signal: ready ? 1 : 0, sprint: false };
}
