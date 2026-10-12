// ↺ returned in season 39.
// † extinct in season 39.
// ↺ returned in season 39.
// † extinct in season 39.
// ↺ returned in season 38.
// † extinct in season 38.
// ↺ returned in season 38.
// † extinct in season 38.
// ↺ returned in season 37.
// † extinct in season 37.
// stalker3 (S.2.1.1.1): written by qwen2.5-coder:1.5b after the rendriles (S.2.1.1) collapsed, in season 37.
// lesson the stalker2s (S.3) lasted 0.5 days, grew to 6, killed 17; then 6 starved, 0 were eaten, 0 died old. 778 plant-eaters were left.
// lesson the stalker2s (S.3) lasted 0.3 days, grew to 6, killed 14; then 6 starved, 0 were eaten, 0 died old. 902 plant-eaters were left.
// lesson the stalker2s (S.3) lasted 0.3 days, grew to 6, killed 15; then 6 starved, 0 were eaten, 0 died old. 978 plant-eaters were left.
// lesson the stalker2s (S.3) lasted 0.3 days, grew to 6, killed 15; then 6 starved, 0 were eaten, 0 died old. 930 plant-eaters were left.
// lesson the stalker2s (S.3) lasted 0.4 days, grew to 6, killed 17; then 6 starved, 0 were eaten, 0 died old. 764 plant-eaters were left.
// lesson the stalker2s (S.3) lasted 0.5 days, grew to 6, killed 15; then 6 starved, 0 were eaten, 0 died old. 419 plant-eaters were left.
// lesson the stalker2s (S.3) lasted 0.4 days, grew to 6, killed 12; then 6 starved, 0 were eaten, 0 died old. 200 plant-eaters were left.
// lesson the stalker2s (S.3) lasted 0.4 days, grew to 6, killed 7; then 6 starved, 0 were eaten, 0 died old. 173 plant-eaters were left.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.27 + me.genes[2] * 0.628, keenness = me.genes[3];

  // Focus on the food it could eat, aiming where it is going to be.
  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.564)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Stalkers stay nearby to their last eaten prey, searching for food while in their vision range.
  let x = me.memory.lastX ?? me.x, y = me.memory.lastY ?? me.y, lastDistance = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < lastDistance && f.plant || (f.kin && me.energy > 0.614)) {
      lastDistance = d;
      target = f;
      x = me.memory.lastX = target.x;
      y = me.memory.lastY = target.y;
    }
  }

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.532) * 1.09 + 0.0103 * Math.min(1.12, prey / 5.4);
  const focus = Math.min(1.46, eye * (0.541 + keenness)) ** 2.43;

  if (target) {
    const ahead = Math.min(best / 2.69, 12 + foresight * 19.2);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.07;
    x += tx / d * focus;
    y += ty / d * focus;
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 41.5) {
      x -= (o.x - me.x) / d * 0.624;
      y -= (o.y - me.y) / d * 0.618;
    }
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 41.5) {
      x -= (o.x - me.x) / d * 0.624;
      y -= (o.y - me.y) / d * 0.618;
    }
  }

  return { x, y, eat: prey > 0, mate: me.fertile && me.energy > 1.03, give: 0.249 + generosity * 0.235,
    // Close the last stretch in a burst.
    sprint: prey > 0 };
}
