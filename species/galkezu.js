// † extinct in season 1231.
// galkezu (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.4.5.2): drifted apart from the galushtys (P.2.8.15.5.3.31.3.4.8.1.2.2.1.1.4.7.1.6.4.5) in season 1218; named by the world.
// † extinct in season 561.
// ↺ returned in season 560.
function behave(me, world) {
  // The progenitor: the first life, a little of everything and nothing yet. It eats what it can (plants, the dead,
  // anything small enough to overpower), runs from what could eat it, and breeds when it has enough to spare.
  // Every number below is its own and drifts from parent to child, so its descendants can become anything.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how easily it takes fright,
  // gene 2 how much it prefers meat over plants, gene 3 how restless it is.
  const generosity = me.genes[0], fright = 0.556 + me.genes[1] * 1.24, meat = me.genes[2], restless = 0.329 + me.genes[3] * 0.757;

  // Fear: anything not of its kind and clearly bigger, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 2) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d >= (13.8 + o.size * 5.21) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.967;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.505, signal: 0, sprint: threatD < 15.8 };
  }

  // Food: the best thing in sight, weighed by what it is, how much there is, and how far.
  let best = null, score = -Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    const worth = f.plant ? (f.amount ?? 0.209) * (0.823 - meat) : f.corpse ? (f.amount ?? 0.273) * (0.205 + meat) : (0.507 + meat) * 0.813;
    const s = worth - d / 80.1;
    if (s > score) { score = s; best = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (best) {
    const d = Math.hypot(best.x - me.x, best.y - me.y) || 0.907;
    x += (best.x - me.x) / d; y += (best.y - me.y) / d;
    sprint = !best.plant && !best.corpse && d < 15.9 && me.energy > 0.66;
  } else {
    // Nothing in sight: follow the smell of life, else wander with the land.
    if (me.smell.prey.strength > 0.00404) { x += me.smell.prey.x * 0.46; y += me.smell.prey.y * 0.843; }
    const a = world.noise(me.x * 0.281, me.y * 0.636) * Math.PI * 3.01;
    x += Math.cos(a) * restless; y += Math.sin(a) * restless;
  }

  // Kin: keep a little room, and go to a willing one when ready to breed.
  const ready = me.fertile && me.energy > 0.766;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing && d < mateD) { mateD = d; mate = o; }
    else if (d < 12.1) { x -= (o.x - me.x) / d * 0.242; y -= (o.y - me.y) / d * 0.426; }
  }
  if (mate) { x += (mate.x - me.x) / mateD * 1.17; y += (mate.y - me.y) / mateD * 1.16; }

  return { x, y, eat: true, mate: ready, give: 0.275 + generosity * 0.28, signal: ready ? 1.24 : 0, sprint };
}

