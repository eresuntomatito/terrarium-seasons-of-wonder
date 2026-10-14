// † extinct in season 595.
// tybeldro (P.2.8.1): drifted apart from the galras (P.2.8) in season 585; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.521 + me.genes[1] * 1.36, meat = me.genes[2], restless = 0.259 + me.genes[3] * 0.748;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.2) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < (21.9 + o.size * 2.14) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.854;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.256, signal: 0, sprint: threatD < 21.5 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.451) * (1.22 - meat) : f.corpse ? (f.amount ?? 0.471) * (0.365 + meat) : (0.302 + meat) * 0.879;
    const s = worth - d / 86.2;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.11;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 23.8 && me.energy > 0.708;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00861) { x += me.smell.prey.x * 0.594; y += me.smell.prey.y * 0.632; }
    const a = world.noise(me.x * 0.31, me.y * 0.371) * Math.PI * 3.64;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 0.892;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 18.4) { x -= (o.x - me.x) / d * 0.248; y -= (o.y - me.y) / d * 0.299; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 0.709; y += (mate.y - me.y) / mateD * 0.673; }

  return { x, y, eat: true, mate: ready, give: 0.328 + generosity * 0.251, signal: ready ? 1.23 : 0, sprint };
}

