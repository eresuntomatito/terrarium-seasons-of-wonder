// ↺ returned in season 25.
// † extinct in season 25.
// ↺ returned in season 25.
// † extinct in season 25.
// ↺ returned in season 25.
// † extinct in season 25.
// ↺ returned in season 25.
// † extinct in season 25.
// ↺ returned in season 25.
// † extinct in season 24.
// ↺ returned in season 24.
// † extinct in season 24.
// thali (S.1): branched from the stalkers (S) in season 24, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how keen its eye is.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.39 + me.genes[2] * 0.693, keenness = me.genes[3];

  // Pursue the nearest creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.64)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.535) * 1.15 + 0.0108 * Math.min(1.15, prey / 5.38);
  const focus = Math.min(1.22, eye * (0.497 + keenness)) ** 2.35;

  let x = 0, y = 0;
  if (target) {
    const ahead = Math.min(best / 2.79, 11.1 + foresight * 18.4);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 0.966;
    x += tx / d * focus;
    y += ty / d * focus;
  }
  // Whatever its eye misses, it prowls past in slow loops.
  const a = world.noise(me.x * 0.638, me.y * 0.609) * Math.PI * 3.55;
  x += Math.cos(a) * 0.401 * (0.957 - focus);
  y += Math.sin(a) * 0.455 * (0.964 - focus);

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 39.2) {
      x -= (o.x - me.x) / d * 0.581;
      y -= (o.y - me.y) / d * 0.597;
    }
  }

  // Close the last stretch in a burst.
  const sprint = !!target && !target.corpse && best < 41.3;
  return { x, y, eat: me.energy < appetite, mate: me.fertile && me.energy > 1.09, give: 0.279 + generosity * 0.257,
    sprint };
}
