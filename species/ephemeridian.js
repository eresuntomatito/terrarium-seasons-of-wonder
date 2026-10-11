// ephemeridian (W.1.3): branched from the galysathus (W.1) in season 31.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 19.8 + me.genes[2] * 43;

  // Find the closest food.
  let target = null, best = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  let x = 0, y = 0;
  if (target) {
    x += (target.x - me.x) / best;
    y += (target.y - me.y) / best;
  } else {
    // Seek the nearest food, not scared of anything.
    x = me.x;
    y = me.y;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.813;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.14 && d < fright) {
      x -= (o.x - me.x) / d * 1.88;
      y -= (o.y - me.y) / d * 2.12;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.527 + ardour);
      y += (o.y - me.y) / d * (0.539 + ardour);
    } else if (d < 10.2) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.0991 + generosity * 0.597, signal: ready ? 0.944 : 0 };
}
