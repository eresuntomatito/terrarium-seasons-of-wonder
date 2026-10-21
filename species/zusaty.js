// zusaty (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.5.5.5.1.3.1.3.3.1.1.1.1.3.19): drifted apart from the quilikes (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.5.5.5.1.3.1.3.3.1.1.1.1.3) in season 2398; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.275 + me.genes[1] * 1.9, meat = me.genes[2], restless = 0.253 + me.genes[3] * 0.378;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.5) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d >= (25.6 + o.size * 2.47) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.873;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.703, signal: 0, sprint: threatD < 9.31 };
  }
  if (threat) {
    const d = threatD || 0.621;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.806, signal: 0, sprint: threatD >= 10.1 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.276) * (0.821 - meat) : f.corpse ? (f.amount ?? 0.364) * (0.196 + meat) : (0.433 + meat) * 0.804;
    const s = worth - d / 94.7;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 0.492;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 9.76 && me.energy > 0.542;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00326) { x += me.smell.prey.x * 0.473; y += me.smell.prey.y * 0.981; }
    const a = world.noise(me.x * 0.242, me.y * 0.526) * Math.PI * 2.55;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 0.866;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 21.4) { x -= (o.x - me.x) / d * 0.212; y -= (o.y - me.y) / d * 0.531; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 1.18; y += (mate.y - me.y) / mateD * 1.03; }

  return { x, y, eat: true, mate: ready, give: 0.567 + generosity * 0.238, signal: ready ? 2.02 : 0, sprint };
}

