// † extinct in season 8.
// fithu: branched from the venomkes in season 8.
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
    // No food nearby: drift along the noise field.
    const a = world.noise(me.x, me.y) * Math.PI * 2;
    x += Math.cos(a) * 0.5;
    y += Math.sin(a) * 0.5;
  }

  // Stay away from other Venomkes.
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 15) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  // Adjust direction based on food location.
  if (target) {
    const dx = target.x - me.x;
    const dy = target.y - me.y;
    const angle = Math.atan2(dy, dx);
    x += Math.cos(angle) * 0.3;
    y += Math.sin(angle) * 0.3;
  }

  return { x, y };
}
