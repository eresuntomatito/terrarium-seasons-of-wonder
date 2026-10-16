// orzuven (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.1): drifted apart from the kethus (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1) in season 1057; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.501 + me.genes[1] * 1.73, meat = me.genes[2], restless = 0.285 + me.genes[3] * 0.651;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.83) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d >= (15.5 + o.size * 4.43) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.916;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.55, signal: 0, sprint: threatD < 15.9 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.281) * (1.07 - meat) : f.corpse ? (f.amount ?? 0.318) * (0.191 + meat) : (0.488 + meat) * 0.769;
    const s = worth - d / 70.1;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.28;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 20.9 && me.size > 0.63;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00577) { x += me.smell.prey.x * 0.662; y += me.smell.prey.y * 0.843; }
    const a = world.noise(me.x * 0.284, me.y * 0.767) * Math.PI * 3.53;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 0.874;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 22.5) { x -= (o.x - me.x) / d * 0.229; y -= (o.y - me.y) / d * 0.354; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 1.22; y += (mate.y - me.y) / mateD * 1.05; }

  return { x, y, eat: true, mate: ready, give: 0.266 + generosity * 0.213, signal: ready ? 1.15 : 0, sprint };
}

