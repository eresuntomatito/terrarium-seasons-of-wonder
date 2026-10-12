// † extinct in season 42.
// ↺ returned in season 42.
// † extinct in season 42.
// gnome (S.2.1.1.1.1.1): written by qwen2.5-coder:1.5b after the giganteus (S.2.1.1.1.1) collapsed, in season 42.
// lesson the giganteus (S.2.1.1.1.1) lasted 0.2 days, grew to 6, killed 3; then 6 starved, 0 were eaten, 0 died old. 213 plant-eaters were left.
// lesson the giganteus (S.2.1.1.1.1) lasted 0.4 days, grew to 6, killed 6; then 6 starved, 0 were eaten, 0 died old. 189 plant-eaters were left.
// lesson the giganteus (S.2.1.1.1.1) lasted 0.5 days, grew to 6, killed 8; then 6 starved, 0 were eaten, 0 died old. 246 plant-eaters were left.
// lesson the giganteus (S.2.1.1.1.1) lasted 0.4 days, grew to 6, killed 7; then 6 starved, 0 were eaten, 0 died old. 355 plant-eaters were left.
// lesson the giganteus (S.2.1.1.1.1) lasted 0.4 days, grew to 6, killed 8; then 6 starved, 0 were eaten, 0 died old. 505 plant-eaters were left.
// lesson the giganteus (S.2.1.1.1.1) lasted 0.3 days, grew to 6, killed 9; then 6 starved, 0 were eaten, 0 died old. 544 plant-eaters were left.
// lesson the giganteus (S.2.1.1.1.1) lasted 0.3 days, grew to 6, killed 10; then 6 starved, 0 were eaten, 0 died old. 577 plant-eaters were left.
// lesson the giganteus (S.2.1.1.1.1) lasted 1.2 days, grew to 6, killed 20; then 6 starved, 0 were eaten, 0 died old. 407 plant-eaters were left.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.2 + me.genes[2] * 0.644, keenness = me.genes[3];

  // Focus on the food it could eat, aiming where it is going to be.
  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.615)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Stalkers stay nearby to their last eaten prey, searching for food while in their vision range.
  let x = me.memory.lastX ?? me.x, y = me.memory.lastY ?? me.y, lastDistance = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < lastDistance && f.plant || (f.kin && me.energy > 0.567)) {
      lastDistance = d;
      target = f;
      x = me.memory.lastX = target.x;
      y = me.memory.lastY = target.y;
    }
  }

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.514) * 1.04 + 0.0116 * Math.min(1.17, prey / 4.54);
  const focus = Math.min(1.44, eye * (0.564 + keenness)) ** 2.45;

  if (target) {
    const ahead = Math.min(best / 2.92, 12.2 + foresight * 17.2);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.16;
    x += tx / d * focus;
    y += ty / d * focus;
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 46) {
      x -= (o.x - me.x) / d * 0.647;
      y -= (o.y - me.y) / d * 0.573;
    }
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 42.3) {
      x -= (o.x - me.x) / d * 0.644;
      y -= (o.y - me.y) / d * 0.615;
    }
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 42) {
      x -= (o.x - me.x) / d * 0.605;
      y -= (o.y - me.y) / d * 0.617;
    }
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 40) {
      x -= (o.x - me.x) / d * 0.598;
      y -= (o.y - me.y) / d * 0.616;
    }
  }

  return { x, y, eat: prey > 0, mate: me.fertile && me.energy > 1.04, give: 0.238 + generosity * 0.226,
    // Close the last stretch in a burst.
    sprint: prey > 0 };
}
