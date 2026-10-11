// † extinct in season 2.
// kezuven: branched from the stalkers in season 2.
// Fithu: Seeker
function behave(me, world) {
  let target = null, best = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  let x = 0, y = 0;
  if (target) {
    const ahead = Math.min(best / 3, 20);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1;
    x += tx / d;
    y += ty / d;
  } else {
    // Nothing to hunt: prowl in slow loops.
    const a = world.noise(me.x * 0.5, me.y * 0.5) * Math.PI * 4;
    x += Math.cos(a) * 0.4;
    y += Math.sin(a) * 0.4;
  }

  // Stalkers hunt alone.
  for (const o of world.others) {
    if (o.species !== 'stalker') continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 40) {
      x -= (o.x - me.x) / d * 0.5;
      y -= (o.y - me.y) / d * 0.5;
    }
  }

  const hue = 300 + Math.random() * 300; // Random hue for Fithu
  return { x, y, hue };
}
