// † extinct in season 1470.
// quidroty (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.5.8.1.2): drifted apart from the mosalis (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.5.8.1) in season 1441; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.45 + me.genes[1] * 0.88, meat = me.genes[2], restless = 0.322 + me.genes[3] * 1;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 2.96) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d >= (11.7 + o.size * 4.26) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.816;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.772, signal: 0, sprint: threatD < 19.7 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.214) * (0.987 - meat) : f.corpse ? (f.amount ?? 0.285) * (0.158 + meat) : (0.545 + meat) * 0.604;
    const s = worth - d / 94.5;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.22;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 11.4 && me.energy > 0.619;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00448) { x += me.smell.prey.x * 0.45; y += me.smell.prey.y * 1.01; }
    const a = world.noise(me.x * 0.219, me.y * 0.433) * Math.PI * 3.2;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 0.6;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 11) { x -= (o.x - me.x) / d * 0.248; y -= (o.y - me.y) / d * 0.245; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 1.38; y += (mate.y - me.y) / mateD * 1.53; }

  return { x, y, eat: true, mate: ready, give: 0.337 + generosity * 0.258, signal: ready ? 0.968 : 0, sprint };
}

