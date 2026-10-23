// sabelli (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.5.5.5.1.3.1.3.3.1.1.1.1.3.61.1): drifted apart from the fibelmos (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.5.5.5.1.3.1.3.3.1.1.1.1.3.61) in season 2625; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.26 + me.genes[1] * 1.86, meat = me.genes[2], restless = 0.36 + me.genes[3] * 0.502;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 2.03) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d >= (29.7 + o.size * 2.96) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 1.16;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.732, signal: 0, sprint: threatD < 9.26 };
  }
  if (threat) {
    const d = threatD || 0.523;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.971, signal: 0, sprint: threatD >= 9.4 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.379) * (0.93 - meat) : f.corpse ? (f.amount ?? 0.277) * (0.231 + meat) : (0.398 + meat) * 0.821;
    const s = worth - d / 84.5;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 0.342;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 10.9 && me.energy > 0.617;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00306) { x += me.smell.prey.x * 0.403; y += me.smell.prey.y * 1.12; }
    const a = world.noise(me.x * 0.167, me.y * 0.464) * Math.PI * 1.98;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 1.07;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 11.2) { x -= (o.x - me.x) / d * 0.194; y -= (o.y - me.y) / d * 0.582; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 1.16; y += (mate.y - me.y) / mateD * 1.43; }

  return { x, y, eat: true, mate: ready, give: 0.472 + generosity * 0.248, signal: ready ? 1.82 : 0, sprint };
}

