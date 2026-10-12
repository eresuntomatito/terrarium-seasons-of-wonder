// rendrile (S.2.1.1): written by qwen2.5-coder:1.5b after the zephyr4s (S.2.1) collapsed, in season 34.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 8; then 6 starved, 0 were eaten, 0 died old. 483 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 9; then 6 starved, 0 were eaten, 0 died old. 279 plant-eaters were left.
// lesson the shadomarks (S.1.1) lasted 0.4 days, grew to 6, killed 20; then 6 starved, 0 were eaten, 0 died old. 1132 plant-eaters were left.
// lesson the takors (S.1.2) lasted 0.3 days, grew to 6, killed 15; then 6 starved, 0 were eaten, 0 died old. 661 plant-eaters were left.
// lesson the wanderlusts (S.2) lasted 0.3 days, grew to 2, killed 0; then 2 starved, 0 were eaten, 0 died old. 510 plant-eaters were left.
// lesson the zephyr4s (S.2.1) lasted 0.4 days, grew to 6, killed 17; then 6 starved, 0 were eaten, 0 died old. 966 plant-eaters were left.
// lesson the stalkers (S) lasted 78.9 days, grew to 50, killed 5365; then 37 starved, 12 were eaten, 578 died old. 791 plant-eaters were left.
// lesson the zephyr4s (S.2.1) lasted 0.5 days, grew to 6, killed 20; then 6 starved, 0 were eaten, 0 died old. 607 plant-eaters were left.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.24 + me.genes[2] * 0.612, keenness = me.genes[3];

  // Focus on the food it could eat, aiming where it is going to be.
  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.556)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Stalkers stay nearby to their last eaten prey, searching for food while in their vision range.
  let x = me.memory.lastX ?? me.x, y = me.memory.lastY ?? me.y, lastDistance = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < lastDistance && f.plant || (f.kin && me.energy > 0.556)) {
      lastDistance = d;
      target = f;
      x = me.memory.lastX = target.x;
      y = me.memory.lastY = target.y;
    }
  }

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.53) * 1.06 + 0.0104 * Math.min(1.16, prey / 5.35);
  const focus = Math.min(1.38, eye * (0.531 + keenness)) ** 2.41;

  if (target) {
    const ahead = Math.min(best / 2.69, 12.8 + foresight * 19.4);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.02;
    x += tx / d * focus;
    y += ty / d * focus;
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 39) {
      x -= (o.x - me.x) / d * 0.638;
      y -= (o.y - me.y) / d * 0.602;
    }
  }

  return { x, y, eat: prey > 0, mate: me.fertile && me.energy > 0.937, give: 0.251 + generosity * 0.235,
    // Close the last stretch in a burst.
    sprint: prey > 0 };
}
