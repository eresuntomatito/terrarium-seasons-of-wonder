// † extinct in season 1.
// ↺ returned in season 1.
// † extinct in season 1.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.2 + me.genes[2] * 0.8;

  // Pursue the nearest creature it could eat (never its own kind), aiming where it is going to be.
  let target = null, best = Infinity;
  for (const f of world.food) {
    if (f.plant || f.kin) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  let x = 0, y = 0;
  if (target) {
    const ahead = Math.min(best / 3, 10 + foresight * 20);
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

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 40) {
      x -= (o.x - me.x) / d * 0.5;
      y -= (o.y - me.y) / d * 0.5;
    }
  }

  return { x, y, eat: me.energy < appetite, mate: me.fertile && me.energy > 1.3, give: 0.4 + generosity * 0.3 };
}
