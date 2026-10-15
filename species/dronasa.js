// dronasa (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.1): drifted apart from the ushradros (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1) in season 974; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.513 + me.genes[1] * 1.17, meat = me.genes[2], restless = 0.266 + me.genes[3] * 0.616;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.96) continue;
    if (o.kin || o.size < me.size * 3.73) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d >= (17.3 + o.size * 3.93) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.753;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.52, signal: 0, sprint: threatD < 13.1 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.334) * (0.962 - meat) : f.corpse ? (f.amount ?? 0.4) * (0.212 + meat) : (0.447 + meat) * 0.8;
    const s = worth - d / 72.9;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.07;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 18 && me.energy > 0.783;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00512) { x += me.smell.prey.x * 0.551; y += me.smell.prey.y * 0.855; }
    const a = world.noise(me.x * 0.328, me.y * 0.455) * Math.PI * 2.75;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 1.16;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 22.8) { x -= (o.x - me.x) / d * 0.256; y -= (o.y - me.y) / d * 0.498; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 1.75; y += (mate.y - me.y) / mateD * 1.02; }

  return { x, y, eat: true, mate: ready, give: 0.242 + generosity * 0.199, signal: ready ? 1.16 : 0, sprint };
}

