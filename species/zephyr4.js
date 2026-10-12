// † extinct in season 33.
// zephyr4 (S.2.1): written by qwen2.5-coder:1.5b after the wanderlusts (S.2) collapsed, in season 33.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 12; then 6 starved, 0 were eaten, 0 died old. 1313 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 1084 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 808 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 8; then 6 starved, 0 were eaten, 0 died old. 483 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 9; then 6 starved, 0 were eaten, 0 died old. 279 plant-eaters were left.
// lesson the shadomarks (S.1.1) lasted 0.4 days, grew to 6, killed 20; then 6 starved, 0 were eaten, 0 died old. 1132 plant-eaters were left.
// lesson the takors (S.1.2) lasted 0.3 days, grew to 6, killed 15; then 6 starved, 0 were eaten, 0 died old. 661 plant-eaters were left.
// lesson the wanderlusts (S.2) lasted 0.3 days, grew to 2, killed 0; then 2 starved, 0 were eaten, 0 died old. 510 plant-eaters were left.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.3 + me.genes[2] * 0.621, keenness = me.genes[3];

  // Focus on the food it could eat, aiming where it is going to be.
  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.561)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.556) * 1.04 + 0.00993 * Math.min(1.19, prey / 5.19);
  const focus = Math.min(1.36, eye * (0.528 + keenness)) ** 2.42;

  let x = 0, y = 0;
  if (target) {
    const ahead = Math.min(best / 2.62, 12.5 + foresight * 18.7);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 0.974;
    x += tx / d * focus;
    y += ty / d * focus;
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 38.1) {
      x -= (o.x - me.x) / d * 0.645;
      y -= (o.y - me.y) / d * 0.593;
    }
  }

  return { x, y, eat: prey > 0, mate: me.fertile && me.energy > 0.903, give: 0.264 + generosity * 0.231,
    // Close the last stretch in a burst.
    sprint: prey > 0 };
}
