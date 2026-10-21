// ushnamo (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.5.5.5.1.3.1.3.3.1.1.1.1.3.51): drifted apart from the quilikes (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.5.5.5.1.3.1.3.3.1.1.1.1.3) in season 2461; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.294 + me.genes[1] * 1.68, meat = me.genes[2], restless = 0.257 + me.genes[3] * 0.385;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.76) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d >= (29.1 + o.size * 4.72) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.865;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.674, signal: 0, sprint: threatD < 9.76 };
  }
  if (threat) {
    const d = threatD || 0.63;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.764, signal: 0, sprint: threatD >= 11.7 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.342) * (0.874 - meat) : f.corpse ? (f.amount ?? 0.287) * (0.197 + meat) : (0.388 + meat) * 0.85;
    const s = worth - d / 95.4;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 0.418;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 9.1 && me.energy > 0.524;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00296) { x += me.smell.prey.x * 0.429; y += me.smell.prey.y * 0.975; }
    const a = world.noise(me.x * 0.228, me.y * 0.478) * Math.PI * 1.97;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 0.931;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 14.1) { x -= (o.x - me.x) / d * 0.178; y -= (o.y - me.y) / d * 0.593; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 1.19; y += (mate.y - me.y) / mateD * 1.27; }

  return { x, y, eat: true, mate: ready, give: 0.6 + generosity * 0.261, signal: ready ? 1.88 : 0, sprint };
}

