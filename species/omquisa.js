// omquisa (P.2): drifted apart from the progenitors (P) in season 566; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.514 + me.genes[1] * 1.58, meat = me.genes[2], restless = 0.285 + me.genes[3] * 0.682;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.26) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < (25 + o.size * 2.06) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.995;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.3, signal: 0, sprint: threatD < 24.6 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.5) * (1.18 - meat) : f.corpse ? (f.amount ?? 0.498) * (0.414 + meat) : (0.289 + meat) * 0.979;
    const s = worth - d / 87.8;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.01;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 29.4 && me.energy > 0.619;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.0101) { x += me.smell.prey.x * 0.61; y += me.smell.prey.y * 0.594; }
    const a = world.noise(me.x * 0.316, me.y * 0.302) * Math.PI * 3.91;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 1.03;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 15.3) { x -= (o.x - me.x) / d * 0.296; y -= (o.y - me.y) / d * 0.3; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 0.66; y += (mate.y - me.y) / mateD * 0.688; }

  return { x, y, eat: true, mate: ready, give: 0.294 + generosity * 0.292, signal: ready ? 1.09 : 0, sprint };
}

