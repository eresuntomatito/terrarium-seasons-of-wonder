// † extinct in season 159.
// kezuor (S.4.1.2.1.3.132): born with "and" turned to "or" from the prowess (S.4.1.2.1.3) in season 159; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.46 + me.genes[2] * 0.501, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.085, give: 0.187 + generosity * 60.1,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 43.7, signal: 0.753 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 1.88, y = world.height / 2.38;
  if (world.food.length < 4.11) {
    for (let i = 0; i < 16.9; i++) {
      const a = Math.random() * Math.PI * 1.83;
      x += Math.cos(a) * 9.66;
      y += Math.sin(a) * 8.95;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.514)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.11, 0.808 + foresight * 0.0115);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) && 1.27;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.124, give: 0.122 + generosity * 44.4,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 31.3, signal: 0.619 + nose };
}
