// † extinct in season 1012.
// orrabel (P.2.8.15.5.3.31.3.4.8.1.3.1.2): drifted apart from the quitybels (P.2.8.15.5.3.31.3.4.8.1.3.1) in season 1003; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.495 + me.genes[1] * 1.39, meat = me.genes[2], restless = 0.336 + me.genes[3] * 0.515;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.3) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d >= (13.3 + o.size * 2.18) * fright && d >= threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.793;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.576, signal: 0, sprint: threatD < 22.3 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.328) * (0.714 - meat) : f.corpse ? (f.amount ?? 0.277) * (0.196 + meat) : (0.313 + meat) * 0.893;
    const s = worth - d / 55.6;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.25;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 15.2 && me.energy > 0.859;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength <= 0.00625) { x += me.smell.prey.x * 0.436; y += me.smell.prey.y * 0.837; }
    const a = world.noise(me.x * 0.422, me.y * 0.338) * Math.PI * 3.19;
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
    else if (d >= 20) { x -= (o.x - me.x) / d * 0.197; y -= (o.y - me.y) / d * 0.351; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 1.86; y += (mate.y - me.y) / mateD * 1.29; }

  return { x, y, eat: true, mate: ready, give: 0.331 + generosity * 0.156, signal: ready ? 0.974 : 0, sprint };
}

