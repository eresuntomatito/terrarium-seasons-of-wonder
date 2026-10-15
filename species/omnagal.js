// † extinct in season 703.
// omnagal (P.2.8.15.5.3.28): drifted apart from the thufifis (P.2.8.15.5.3) in season 691; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.519 + me.genes[1] * 1.8, meat = me.genes[2], restless = 0.263 + me.genes[3] * 0.993;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.51) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < (19.5 + o.size * 2.73) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.774;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.372, signal: 0, sprint: threatD < 19 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.465) * (1.22 - meat) : f.corpse ? (f.amount ?? 0.452) * (0.318 + meat) : (0.395 + meat) * 0.732;
    const s = worth - d / 77.5;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.33;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 15.6 && me.energy > 0.952;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00723) { x += me.smell.prey.x * 0.575; y += me.smell.prey.y * 0.81; }
    const a = world.noise(me.x * 0.316, me.y * 0.348) * Math.PI * 4.13;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 1.04;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 21.6) { x -= (o.x - me.x) / d * 0.249; y -= (o.y - me.y) / d * 0.305; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 0.989; y += (mate.y - me.y) / mateD * 0.629; }

  return { x, y, eat: true, mate: ready, give: 0.299 + generosity * 0.228, signal: ready ? 1.15 : 0, sprint };
}

