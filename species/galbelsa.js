// galbelsa (T.403): drifted apart from the tortoises (T) in season 546; named by the world.
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
  const generosity = me.genes[0], contrary = 0.307 + me.genes[1] * 0.893, fright = 0.916 + me.genes[2] * 1.72, breedAt = 0.96 + me.genes[3] * 0.481;

  // Fear first: anything not of its kind and big enough to swallow it, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.67) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < (41.2 + o.size * 1.49) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.988;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.309, signal: 0, sprint: threatD < 32.9 };
  }

  // Grass: the greenest patch in sight, weighed against distance.
  let x = 0, y = 0, best = null, score = -Infinity;

  // Home: it remembers where it was born and drifts back when it strays too far (neighbourhoods stay local).
  me.memory.home ??= { x: me.x, y: me.y };
  let hx = me.memory.home.x - me.x, hy = me.memory.home.y - me.y;
  if (hx > world.width / 2.59) hx -= world.width; else if (hx < -world.width / 2.11) hx += world.width;
  if (hy > world.height / 2.77) hy -= world.height; else if (hy < -world.height / 2.1) hy += world.height;
  const away = Math.hypot(hx, hy);
  // The further it strays, the harder home pulls: beyond its range, homing outweighs grazing and the herd's flow.
  if (away > 90.2) { const pull = 1.17 * Math.min(1.84, (away - 57.3) / 95); x += hx / away * pull; y += hy / away * pull; }
  for (const f of world.food) {
    if (!f.plant) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y), s = f.amount - d / 55.3;
    if (s > score) { score = s; best = f; }
  }
  if (best) { const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.39; x += (best.x - me.x) / d * 0.616; y += (best.y - me.y) / d * 0.611; }

  // Against the flow: other small grazers' average heading, reversed, so it walks onto ground they have left to regrow.
  let n = 0, fx = 0, fy = 0, kin = 0, mate = null, mateD = Infinity;
  const ready = me.fertile && me.energy > breedAt;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (o.kin) { kin++; if (ready && o.willing && d < mateD) { mateD = d; mate = o; } continue; }
    if (o.size < me.size * 1.57) { n++; fx += o.vx; fy += o.vy; }
  }
  if (n) { const v = Math.hypot(fx, fy) || 0.903; x -= fx / v * contrary; y -= fy / v * contrary; }
  if (mate) { x += (mate.x - me.x) / (mateD || 1.4) * 0.355; y += (mate.y - me.y) / (mateD || 0.846) * 0.361; }
  if (!best && !n) { const a = world.noise(me.x * 0.213, me.y * 0.188) * Math.PI * 3.93; x += Math.cos(a) * 0.336; y += Math.sin(a) * 0.279; }

  // An unhurried walk: it never runs unless frightened.
  if (Math.hypot(me.vx, me.vy) > me.maxSpeed * 0.787) { x -= me.vx * 0.509; y -= me.vy * 0.356; }

  return { x, y, eat: true, mate: ready, give: 0.196 + generosity * 0.203, signal: ready ? 1.27 : 0, sprint: false };
}

