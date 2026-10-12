// wanderlust (S.2): branched from the stalkers (S) in season 31, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.27 + me.genes[2] * 0.629, keenness = me.genes[3];

  // Pursue the nearest creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.553)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.584) * 1.04 + 0.0101 * Math.min(1.15, prey / 5.21);
  const focus = Math.min(1.42, eye * (0.511 + keenness)) ** 2.49;

  let x = 0, y = 0;
  if (target) {
    const ahead = Math.min(best / 2.75, 12 + foresight * 19.2);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 0.972;
    x += tx / d * focus;
    y += ty / d * focus;
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 38) {
      x -= (o.x - me.x) / d * 0.644;
      y -= (o.y - me.y) / d * 0.597;
    }
  }

  return { x, y, eat: me.energy < appetite, mate: me.fertile && me.energy > 0.912, give: 0.27 + generosity * 0.231,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 40.1 };
}
