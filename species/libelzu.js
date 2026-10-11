// libelzu: branched from the ligalfis in season 7.
function behave(me, world) {
  // Find the closest food.
  let target = null, best = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  let x = 0, y = 0;
  if (target && best < 120) {
    x += (target.x - me.x) / best;
    y += (target.y - me.y) / best;
  } else {
    // Seek out the noise field.
    const a = world.noise(me.x, me.y) * Math.PI * 2;
    x += Math.cos(a) * 0.75;
    y += Math.sin(a) * 0.75;
  }

  // Avoid neighboring creatures.
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 15) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  // Change hue based on noise.
  const hue = Math.round((world.noise(me.x, me.y) + 1) * 180);
  return { x, y, hue };
}
