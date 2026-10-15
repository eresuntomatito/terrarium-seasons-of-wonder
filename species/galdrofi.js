// galdrofi (P.2.8.15.5.3.31.2): drifted apart from the fibeltys (P.2.8.15.5.3.31) in season 709; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.51 + me.genes[1] * 1.66, meat = me.genes[2], restless = 0.282 + me.genes[3] * 1.05;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.39) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < (20.4 + o.size * 2.88) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.734;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.36, signal: 0, sprint: threatD < 20.1 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.493) * (1.19 - meat) : f.corpse ? (f.amount ?? 0.464) * (0.311 + meat) : (0.378 + meat) * 0.7;
    const s = worth - d / 71.8;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.35;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 17.5 && me.energy > 0.987;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00722) { x += me.smell.prey.x * 0.619; y += me.smell.prey.y * 0.928; }
    const a = world.noise(me.x * 0.301, me.y * 0.371) * Math.PI * 4.26;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 0.984;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 19.6) { x -= (o.x - me.x) / d * 0.236; y -= (o.y - me.y) / d * 0.332; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 1.12; y += (mate.y - me.y) / mateD * 0.649; }

  return { x, y, eat: true, mate: ready, give: 0.313 + generosity * 0.233, signal: ready ? 1.19 : 0, sprint };
}

