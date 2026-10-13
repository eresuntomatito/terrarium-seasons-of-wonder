// † extinct in season 232.
// prowes (S.4.1.2.1.3): written by qwen2.5-coder:1.5b after the ketys (S.4.1.2.1) collapsed, in season 105.
// lesson the jades (S.4.1) lasted 14.5 days, grew to 238, killed 4651; then 967 starved, 144 were eaten, 36 died old. 414 plant-eaters were left.
// lesson the quisas (S.4.1.1) lasted 11.8 days, grew to 47, killed 1814; then 390 starved, 44 were eaten, 37 died old. 49 plant-eaters were left.
// lesson the gliders (S.4.1.2) lasted 20.2 days, grew to 209, killed 5604; then 1145 starved, 272 were eaten, 113 died old. 237 plant-eaters were left.
// lesson the ketys (S.4.1.2.1) lasted 15 days, grew to 436, killed 5348; then 1159 starved, 179 were eaten, 51 died old. 3 plant-eaters were left.
// lesson the ordros (S.4.1.2.1.1) lasted 20 days, grew to 192, killed 5494; then 1200 starved, 214 were eaten, 1 died old. 8 plant-eaters were left.
// lesson the mothubels (S.4.1.2.1.1.2) lasted 4.1 days, grew to 101, killed 1030; then 313 starved, 46 were eaten, 0 died old. 8 plant-eaters were left.
// lesson the dawns (S.4.1.2.1.1.1) lasted 5.6 days, grew to 132, killed 1481; then 433 starved, 52 were eaten, 0 died old. 5 plant-eaters were left.
// lesson the ketys (S.4.1.2.1) lasted 30.7 days, grew to 359, killed 11337; then 2643 starved, 568 were eaten, 180 died old. 7 plant-eaters were left.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.67 + me.genes[2] * 0.449, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.125, give: 0.152 + generosity * 50,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 36.2, signal: 0.801 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 2, y = world.height / 2;
  if (world.food.length < 5) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      x += Math.cos(a) * 10;
      y += Math.sin(a) * 10;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.711)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 0.972, 1.06 + foresight * 0.00905);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.2;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.147, give: 0.168 + generosity * 37,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 31.2, signal: 0.625 + nose };
}
