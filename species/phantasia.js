// phantasia (W.1.4): branched from the galysathus (W.1) in season 36, written by claude-haiku.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 16.7 + me.genes[2] * 37.6;

  let target = null, best = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  let x = 0, y = 0;

  // STRANGE CHANGE 1: FLEE FROM FOOD
  // Inverts the feeding instinct: runs away from food instead of towards it
  if (target) {
    x -= (target.x - me.x) / best * 1.2;
    y -= (target.y - me.y) / best * 1.2;
  } else {
    // Reverse the noise drift direction
    const a = world.noise(me.x, me.y) * Math.PI * 2.38;
    x -= Math.cos(a) * 0.88;
    y -= Math.sin(a) * 0.88;
  }

  // STRANGE CHANGE 2: ATTRACTED TO DANGER, REPELLED BY MATES
  // Inverts threat avoidance: pursues predators instead of fleeing them
  // Inverts reproduction: only mates when starving and isolated
  const ready = me.fertile && me.energy < 0.12;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;

    // Actively pursue anything large enough to kill it
    if (!o.kin && o.size >= me.size * 1.06 && d < fright * 3) {
      x += (o.x - me.x) / d * 2.1;
      y += (o.y - me.y) / d * 2.1;
    }
    // Flee from willing kin (rejects mating partners)
    else if (ready && o.kin && o.willing) {
      x -= (o.x - me.x) / d * (1.2 + ardour * 0.8);
      y -= (o.y - me.y) / d * (1.2 + ardour * 0.8);
    }
    // Chase other creatures aggressively
    else if (d < 20) {
      x += (o.x - me.x) / d * 0.7;
      y += (o.y - me.y) / d * 0.7;
    }
  }

  return { x, y, mate: ready, give: 0.103 + generosity * 0.672, signal: ready ? 0.801 : 0 };
}
