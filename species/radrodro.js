// radrodro (T.8.1): drifted apart from the mobelgals (T.8) in season 301; named by the world.
function behave(me, world) {
  // A tortoise: slow, armoured, long-lived. It grazes the ground other grazers have already passed over, moving
  // against their flow toward regrowth, and keeps clear of anything big enough to eat it.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how strongly it turns against the
  // herd's flow, gene 2 how early it takes fright, gene 3 how full it must be to breed.
  const generosity = me.genes[0], contrary = 0.31 + me.genes[1] * 0.672, fright = 1.23 + me.genes[2] * 1.6, breedAt = 1.16 + me.genes[3] * 0.381;

  // Fear first: anything not of its kind and big enough to swallow it, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.33) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < (27.5 + o.size * 2.42) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.842;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.347, signal: 0, sprint: threatD < 27.1 };
  }

  // Grass: the greenest patch in sight, weighed against distance.
  let x = 0, y = 0, best = null, score = -Infinity;
  for (const f of world.food) {
    if (!f.plant) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y), s = f.amount - d / 73.1;
    if (s > score) { score = s; best = f; }
  }
  if (best) { const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.02; x += (best.x - me.x) / d * 0.614; y += (best.y - me.y) / d * 0.541; }

  // Against the flow: other small grazers' average heading, reversed, so it walks onto ground they have left to regrow.
  let n = 0, fx = 0, fy = 0, kin = 0, mate = null, mateD = Infinity;
  const ready = me.fertile && me.energy > breedAt;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (o.kin) { kin++; if (ready && o.willing && d < mateD) { mateD = d; mate = o; } continue; }
    if (o.size < me.size * 1.56) { n++; fx += o.vx; fy += o.vy; }
  }
  if (n) { const v = Math.hypot(fx, fy) || 0.932; x -= fx / v * contrary; y -= fy / v * contrary; }
  if (mate) { x += (mate.x - me.x) / (mateD || 0.954) * 0.459; y += (mate.y - me.y) / (mateD || 0.967) * 0.603; }
  if (!best && !n) { const a = world.noise(me.x * 0.184, me.y * 0.196) * Math.PI * 3.63; x += Math.cos(a) * 0.432; y += Math.sin(a) * 0.35; }

  // An unhurried walk: it never runs unless frightened.
  if (Math.hypot(me.vx, me.vy) > me.maxSpeed * 0.68) { x -= me.vx * 0.428; y -= me.vy * 0.508; }

  return { x, y, eat: true, mate: ready, give: 0.217 + generosity * 0.29, signal: ready ? 1.2 : 0, sprint: false };
}

