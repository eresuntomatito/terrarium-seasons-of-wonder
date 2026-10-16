// † extinct in season 1322.
// quility (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.4): drifted apart from the tyormos (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6) in season 1169; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.508 + me.genes[1] * 1.2, meat = me.genes[2], restless = 0.31 + me.genes[3] * 0.741;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.98) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d >= (14.1 + o.size * 4.8) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.924;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.52, signal: 0, sprint: threatD < 17.2 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.222) * (0.916 - meat) : f.corpse ? (f.amount ?? 0.289) * (0.212 + meat) : (0.509 + meat) * 0.724;
    const s = worth - d / 81.8;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.05;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 16.8 && me.energy > 0.667;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00424) { x += me.smell.prey.x * 0.528; y += me.smell.prey.y * 0.829; }
    const a = world.noise(me.x * 0.262, me.y * 0.625) * Math.PI * 3.31;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 0.856;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 11.9) { x -= (o.x - me.x) / d * 0.243; y -= (o.y - me.y) / d * 0.336; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 1.12; y += (mate.y - me.y) / mateD * 1.18; }

  return { x, y, eat: true, mate: ready, give: 0.282 + generosity * 0.261, signal: ready ? 1.12 : 0, sprint };
}

