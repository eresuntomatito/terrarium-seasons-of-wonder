// † extinct in season 20.
// ↺ returned in season 19.
// † extinct in season 18.
// ↺ returned in season 18.
// † extinct in season 18.
// ↺ returned in season 17.
// † extinct in season 17.
// ↺ returned in season 17.
// † extinct in season 16.
// ↺ returned in season 16.
// † extinct in season 15.
// ↺ returned in season 15.
// † extinct in season 15.
// ↺ returned in season 15.
// † extinct in season 15.
// ↺ returned in season 14.
// † extinct in season 13.
// ↺ returned in season 12.
// † extinct in season 11.
// ↺ returned in season 10.
// † extinct in season 10.
// ↺ returned in season 9.
// † extinct in season 8.
// ↺ returned in season 8.
// † extinct in season 8.
// ↺ returned in season 7.
// † extinct in season 7.
// ↺ returned in season 6.
// † extinct in season 5.
// ↺ returned in season 4.
// † extinct in season 3.
// ↺ returned in season 2.
// † extinct in season 1.
// † extinct in season 1.
// ↺ returned in season 1.
// † extinct in season 1.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how keen its eye is.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.2 + me.genes[2] * 0.8, keenness = me.genes[3];

  // Pursue the nearest creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.5)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.5) * 0.99 + 0.01 * Math.min(1, prey / 4);
  const focus = Math.min(1, eye * (0.5 + keenness)) ** 2;

  let x = 0, y = 0;
  if (target) {
    const ahead = Math.min(best / 3, 10 + foresight * 20);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1;
    x += tx / d * focus;
    y += ty / d * focus;
  }
  // Whatever its eye misses, it prowls past in slow loops.
  const a = world.noise(me.x * 0.5, me.y * 0.5) * Math.PI * 4;
  x += Math.cos(a) * 0.4 * (1 - focus);
  y += Math.sin(a) * 0.4 * (1 - focus);

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
