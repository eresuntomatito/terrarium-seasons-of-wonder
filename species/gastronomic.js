// gastronomic (S.2.1.1.1.1.1.1): written by qwen2.5-coder:1.5b after the gnomes (S.2.1.1.1.1.1) collapsed, in season 52.
// lesson the gnomes (S.2.1.1.1.1.1) lasted 0.5 days, grew to 6, killed 7; then 6 starved, 0 were eaten, 0 died old. 652 plant-eaters were left.
// lesson the gnomes (S.2.1.1.1.1.1) lasted 0.3 days, grew to 6, killed 14; then 6 starved, 0 were eaten, 0 died old. 736 plant-eaters were left.
// lesson the gnomes (S.2.1.1.1.1.1) lasted 0.8 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 955 plant-eaters were left.
// lesson the gnomes (S.2.1.1.1.1.1) lasted 1.6 days, grew to 6, killed 24; then 5 starved, 0 were eaten, 1 died old. 653 plant-eaters were left.
// lesson the gnomes (S.2.1.1.1.1.1) lasted 0.8 days, grew to 8, killed 33; then 8 starved, 0 were eaten, 0 died old. 231 plant-eaters were left.
// lesson the gnomes (S.2.1.1.1.1.1) lasted 0.8 days, grew to 7, killed 17; then 7 starved, 0 were eaten, 0 died old. 231 plant-eaters were left.
// lesson the gnomes (S.2.1.1.1.1.1) lasted 0.6 days, grew to 8, killed 13; then 8 starved, 0 were eaten, 0 died old. 423 plant-eaters were left.
// lesson the stalkers (S) lasted 21.5 days, grew to 20, killed 431; then 255 starved, 9 were eaten, 19 died old. 786 plant-eaters were left.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.34 + me.genes[2] * 0.628, keenness = me.genes[3];

  // Focus on the food it could eat, aiming where it is going to be.
  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.742)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Stalkers stay nearby to their last eaten prey, searching for food while in their vision range.
  let x = me.memory.lastX ?? me.x, y = me.memory.lastY ?? me.y, lastDistance = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < lastDistance && f.plant || (f.kin && me.energy > 0.527)) {
      lastDistance = d;
      target = f;
      x = me.memory.lastX = target.x;
      y = me.memory.lastY = target.y;
    }
  }

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.399) * 1.12 + 0.013 * Math.min(1.05, prey / 4.35);
  const focus = Math.min(1.54, eye * (0.631 + keenness)) ** 2.88;

  // If close to the prey, start running at full speed.
  if (target && Math.hypot(target.x - me.x, target.y - me.y) < 25) {
    return { x: me.x + me.vx * 2 * focus, y: me.y + me.vy * 2 * focus, sprint: true };
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 54.3) {
      x -= (o.x - me.x) / d * 0.588;
      y -= (o.y - me.y) / d * 0.544;
    }
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 40.5) {
      x -= (o.x - me.x) / d * 0.768;
      y -= (o.y - me.y) / d * 0.558;
    }
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 40.3) {
      x -= (o.x - me.x) / d * 0.616;
      y -= (o.y - me.y) / d * 0.578;
    }
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 45.7) {
      x -= (o.x - me.x) / d * 0.531;
      y -= (o.y - me.y) / d * 0.547;
    }
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 45.7) {
      x -= (o.x - me.x) / d * 0.531;
      y -= (o.y - me.y) / d * 0.547;
    }
  }

  return { x: me.x + me.vx * focus, y: me.y + me.vy * focus, eat: prey > 0, mate: me.fertile && me.energy > 1.1, give: 0.226 + generosity * 0.223 };
}
