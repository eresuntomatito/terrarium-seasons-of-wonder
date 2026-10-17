// † extinct in season 1776.
// mozuven (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.5.5.5.1.3.1.3.3.1): drifted apart from the ratytys (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.5.5.5.1.3.1.3.3) in season 1703; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.393 + me.genes[1] * 1.42, meat = me.genes[2], restless = 0.264 + me.genes[3] * 0.444;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.02) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d >= (16 + o.size * 3.2) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.832;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.57, signal: 0, sprint: threatD < 15.6 };
  }
  if (threat) {
    const d = threatD || 0.822;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.603, signal: 0, sprint: threatD >= 10.4 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.192) * (0.965 - meat) : f.corpse ? (f.amount ?? 0.341) * (0.176 + meat) : (0.517 + meat) * 0.719;
    const s = worth - d / 110;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 0.657;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 11.8 && me.energy > 0.718;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00478) { x += me.smell.prey.x * 0.337; y += me.smell.prey.y * 1.03; }
    const a = world.noise(me.x * 0.219, me.y * 0.452) * Math.PI * 3.95;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 0.742;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 10.4) { x -= (o.x - me.x) / d * 0.224; y -= (o.y - me.y) / d * 0.497; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 1.22; y += (mate.y - me.y) / mateD * 1.54; }

  return { x, y, eat: true, mate: ready, give: 0.373 + generosity * 0.208, signal: ready ? 1.43 : 0, sprint };
}

