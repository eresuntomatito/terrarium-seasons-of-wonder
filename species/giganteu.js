// † extinct in season 42.
// ↺ returned in season 41.
// † extinct in season 41.
// ↺ returned in season 41.
// † extinct in season 41.
// ↺ returned in season 41.
// † extinct in season 41.
// ↺ returned in season 41.
// † extinct in season 41.
// ↺ returned in season 41.
// † extinct in season 41.
// ↺ returned in season 41.
// † extinct in season 41.
// ↺ returned in season 40.
// † extinct in season 40.
// ↺ returned in season 40.
// † extinct in season 40.
// ↺ returned in season 40.
// † extinct in season 40.
// ↺ returned in season 40.
// † extinct in season 40.
// ↺ returned in season 40.
// † extinct in season 40.
// ↺ returned in season 39.
// † extinct in season 39.
// giganteu (S.2.1.1.1.1): written by qwen2.5-coder:1.5b after the stalker3s (S.2.1.1.1) collapsed, in season 39.
// lesson the stalker3s (S.2.1.1.1) lasted 0.6 days, grew to 6, killed 21; then 6 starved, 0 were eaten, 0 died old. 1005 plant-eaters were left.
// lesson the stalker3s (S.2.1.1.1) lasted 1.7 days, grew to 6, killed 27; then 5 starved, 0 were eaten, 1 died old. 316 plant-eaters were left.
// lesson the stalker3s (S.2.1.1.1) lasted 1.4 days, grew to 6, killed 12; then 6 starved, 0 were eaten, 0 died old. 195 plant-eaters were left.
// lesson the stalker3s (S.2.1.1.1) lasted 0.5 days, grew to 6, killed 8; then 6 starved, 0 were eaten, 0 died old. 360 plant-eaters were left.
// lesson the stalker3s (S.2.1.1.1) lasted 0.3 days, grew to 6, killed 4; then 6 starved, 0 were eaten, 0 died old. 507 plant-eaters were left.
// lesson the stalker3s (S.2.1.1.1) lasted 0.3 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 627 plant-eaters were left.
// lesson the stalker3s (S.2.1.1.1) lasted 0.4 days, grew to 6, killed 9; then 6 starved, 0 were eaten, 0 died old. 668 plant-eaters were left.
// lesson the stalker3s (S.2.1.1.1) lasted 0.2 days, grew to 7, killed 14; then 7 starved, 0 were eaten, 0 died old. 626 plant-eaters were left.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.22 + me.genes[2] * 0.612, keenness = me.genes[3];

  // Focus on the food it could eat, aiming where it is going to be.
  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.562)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Stalkers stay nearby to their last eaten prey, searching for food while in their vision range.
  let x = me.memory.lastX ?? me.x, y = me.memory.lastY ?? me.y, lastDistance = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < lastDistance && f.plant || (f.kin && me.energy > 0.638)) {
      lastDistance = d;
      target = f;
      x = me.memory.lastX = target.x;
      y = me.memory.lastY = target.y;
    }
  }

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.511) * 1.05 + 0.0106 * Math.min(1.18, prey / 4.91);
  const focus = Math.min(1.38, eye * (0.532 + keenness)) ** 2.46;

  if (target) {
    const ahead = Math.min(best / 2.94, 12.3 + foresight * 18.1);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.11;
    x += tx / d * focus;
    y += ty / d * focus;
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 46.1) {
      x -= (o.x - me.x) / d * 0.611;
      y -= (o.y - me.y) / d * 0.635;
    }
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 41.2) {
      x -= (o.x - me.x) / d * 0.625;
      y -= (o.y - me.y) / d * 0.644;
    }
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 41.2) {
      x -= (o.x - me.x) / d * 0.625;
      y -= (o.y - me.y) / d * 0.644;
    }
  }

  return { x, y, eat: prey > 0, mate: me.fertile && me.energy > 1.04, give: 0.235 + generosity * 0.246,
    // Close the last stretch in a burst.
    sprint: prey > 0 };
}
