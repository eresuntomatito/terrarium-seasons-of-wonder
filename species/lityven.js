// † extinct in season 1239.
// lityven (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.5.3): drifted apart from the navennas (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.5) in season 1196; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.48 + me.genes[1] * 1.27, meat = me.genes[2], restless = 0.323 + me.genes[3] * 0.699;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 2.1) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d >= (13.7 + o.size * 4.64) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.944;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.535, signal: 0, sprint: threatD < 18.7 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.239) * (0.955 - meat) : f.corpse ? (f.amount ?? 0.3) * (0.198 + meat) : (0.539 + meat) * 0.665;
    const s = worth - d / 83;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.08;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 14.9 && me.energy > 0.659;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00431) { x += me.smell.prey.x * 0.412; y += me.smell.prey.y * 0.912; }
    const a = world.noise(me.x * 0.277, me.y * 0.639) * Math.PI * 3.41;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 0.981;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 12.5) { x -= (o.x - me.x) / d * 0.253; y -= (o.y - me.y) / d * 0.303; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 1.08; y += (mate.y - me.y) / mateD * 1.22; }

  return { x, y, eat: true, mate: ready, give: 0.297 + generosity * 0.246, signal: ready ? 1.23 : 0, sprint };
}

