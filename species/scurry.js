// † extinct in season 40.
// scurry (W.1.8): branched from the galysathus (W.1) in season 40, written by claude-haiku.
function behave(me, world) {
  const generosity = me.genes[0], fright = 15.6 + me.genes[2] * 34.8;

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
    // Drift along the noise field.
    const a = world.noise(me.x, me.y) * Math.PI * 2.63;
    x += Math.cos(a) * 0.784;
    y += Math.sin(a) * 0.745;
  }

  // Flee only predators; skip all other social logic.
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.08 && d < fright) {
      x -= (o.x - me.x) / d * 1.79;
      y -= (o.y - me.y) / d * 2.51;
    }
  }

  // Breed solo, cheaply, and earlier: willing at 15% energy, giving only 2-10% per child.
  const ready = me.fertile && me.energy > 0.15;
  return { x, y, mate: ready, give: 0.02 + generosity * 0.08, signal: 0 };
}
