// † extinct in season 631.
// fiorna (P.2.8.15.5.1): drifted apart from the lisagals (P.2.8.15.5) in season 625; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.524 + me.genes[1] * 1.73, meat = me.genes[2], restless = 0.275 + me.genes[3] * 0.798;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.42) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < (21.9 + o.size * 2.33) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.836;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.32, signal: 0, sprint: threatD < 19.6 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.512) * (1.14 - meat) : f.corpse ? (f.amount ?? 0.482) * (0.338 + meat) : (0.349 + meat) * 0.92;
    const s = worth - d / 83.3;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.38;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 19.4 && me.energy > 0.784;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00656) { x += me.smell.prey.x * 0.675; y += me.smell.prey.y * 0.695; }
    const a = world.noise(me.x * 0.348, me.y * 0.359) * Math.PI * 4.05;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 1.13;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 17) { x -= (o.x - me.x) / d * 0.266; y -= (o.y - me.y) / d * 0.223; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 0.759; y += (mate.y - me.y) / mateD * 0.728; }

  return { x, y, eat: true, mate: ready, give: 0.305 + generosity * 0.203, signal: ready ? 1.35 : 0, sprint };
}

