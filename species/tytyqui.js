// † extinct in season 164.
// tytyqui (S.4.1.2.1.3.165): born with left and right confused with up and down from the prowess (S.4.1.2.1.3) in season 164; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.91 + me.genes[2] * 0.498, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0924, give: 0.15 + generosity * 46.1,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 43.9, signal: 0.596 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 3.15, y = world.height / 2.19;
  if (world.food.length < 4.34) {
    for (let i = 0; i < 15.3; i++) {
      const a = Math.random() * Math.PI * 1.67;
      x += Math.cos(a) * 11.6;
      y += Math.sin(a) * 10.2;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.658)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.16, 1.07 + foresight * 0.00901);
    const tx = target.y + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 0.958;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.121, give: 0.126 + generosity * 60.3,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 30.4, signal: 0.603 + nose };
}
