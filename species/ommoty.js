// ommoty (P.2.8.15.5.3.31.3.4.8.1.3.1.3.3): drifted apart from the tytyvens (P.2.8.15.5.3.31.3.4.8.1.3.1.3) in season 1032; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.485 + me.genes[1] * 1.28, meat = me.genes[2], restless = 0.304 + me.genes[3] * 0.475;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.41) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d >= (11.2 + o.size * 2.05) * fright && d >= threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.913;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.548, signal: 0, sprint: threatD < 20.5 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.425) * (0.685 - meat) : f.corpse ? (f.amount ?? 0.252) * (0.241 + meat) : (0.329 + meat) * 0.808;
    const s = worth - d / 61.8;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.2;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 16.2 && me.energy > 0.827;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength <= 0.00516) { x += me.smell.prey.x * 0.408; y += me.smell.prey.y * 0.93; }
    const a = world.noise(me.x * 0.385, me.y * 0.313) * Math.PI * 2.97;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 0.862;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 22) { x -= (o.x - me.x) / d * 0.186; y -= (o.y - me.y) / d * 0.282; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 2.05; y += (mate.y - me.y) / mateD * 1.39; }

  return { x, y, eat: true, mate: ready, give: 0.316 + generosity * 0.178, signal: ready ? 1.06 : 0, sprint };
}

