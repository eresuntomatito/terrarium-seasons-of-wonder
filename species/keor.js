// keor (S.4.1.2.1.3.15): born with a yes turned to no from the prowess (S.4.1.2.1.3) in season 141; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.57 + me.genes[2] * 0.401, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0993, give: 0.156 + generosity * 52.9,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 36.2, signal: 0.866 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 2.18, y = world.height / 1.87;
  if (world.food.length < 5.63) {
    for (let i = 0; i < 11.6; i++) {
      const a = Math.random() * Math.PI * 1.42;
      x += Math.cos(a) * 11.3;
      y += Math.sin(a) * 10.8;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.593)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.14, 0.721 + foresight * 0.00917);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.59;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: false, mate: me.fertile && me.energy > 0.119, give: 0.132 + generosity * 45.9,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 30.8, signal: 0.798 + nose };
}
