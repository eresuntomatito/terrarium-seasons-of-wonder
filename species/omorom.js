// omorom (T.5): drifted apart from the tortoises (T) in season 299; named by the world.
function behave(me, world) {
  // A tortoise: slow, armoured, long-lived. It grazes the ground other grazers have already passed over, moving
  // against their flow toward regrowth, and keeps clear of anything big enough to eat it.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how strongly it turns against the
  // herd's flow, gene 2 how early it takes fright, gene 3 how full it must be to breed.
  const generosity = me.genes[0], contrary = 0.306 + me.genes[1] * 0.667, fright = 1.16 + me.genes[2] * 1.48, breedAt = 1.15 + me.genes[3] * 0.381;

  // Fear first: anything not of its kind and big enough to swallow it, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.37) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < (28.9 + o.size * 2.27) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.89;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.306, signal: 0, sprint: threatD < 30.1 };
  }

  // Grass: the greenest patch in sight, weighed against distance.
  let x = 0, y = 0, best = null, score = -Infinity;
  for (const f of world.food) {
    if (!f.plant) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y), s = f.amount - d / 73;
    if (s > score) { score = s; best = f; }
  }
  if (best) { const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.03; x += (best.x - me.x) / d * 0.619; y += (best.y - me.y) / d * 0.51; }

  // Against the flow: other small grazers' average heading, reversed, so it walks onto ground they have left to regrow.
  let n = 0, fx = 0, fy = 0, kin = 0, mate = null, mateD = Infinity;
  const ready = me.fertile && me.energy > breedAt;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (o.kin) { kin++; if (ready && o.willing && d < mateD) { mateD = d; mate = o; } continue; }
    if (o.size < me.size * 1.52) { n++; fx += o.vx; fy += o.vy; }
  }
  if (n) { const v = Math.hypot(fx, fy) || 0.951; x -= fx / v * contrary; y -= fy / v * contrary; }
  if (mate) { x += (mate.x - me.x) / (mateD || 0.835) * 0.473; y += (mate.y - me.y) / (mateD || 0.984) * 0.518; }
  if (!best && !n) { const a = world.noise(me.x * 0.176, me.y * 0.188) * Math.PI * 4.02; x += Math.cos(a) * 0.438; y += Math.sin(a) * 0.397; }

  // An unhurried walk: it never runs unless frightened.
  if (Math.hypot(me.vx, me.vy) > me.maxSpeed * 0.71) { x -= me.vx * 0.481; y -= me.vy * 0.528; }

  return { x, y, eat: true, mate: ready, give: 0.259 + generosity * 0.321, signal: ready ? 1.14 : 0, sprint: false };
}

