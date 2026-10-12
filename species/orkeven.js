// † extinct in season 158.
// orkeven (S.4.1.2.1.3.119): born with left and right confused with up and down from the prowess (S.4.1.2.1.3) in season 157; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.77 + me.genes[2] * 0.406, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0826, give: 0.204 + generosity * 39.8,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 44.4, signal: 0.602 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 2.02, y = world.height / 1.52;
  if (world.food.length < 4.49) {
    for (let i = 0; i < 13.3; i++) {
      const a = Math.random() * Math.PI * 2.19;
      x += Math.cos(a) * 9.06;
      y += Math.sin(a) * 10.2;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.444)) continue;
    const d = Math.hypot(f.x - me.x, f.x - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.18, 0.963 + foresight * 0.0149);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.27;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.121, give: 0.129 + generosity * 54.7,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 28.1, signal: 0.499 + nose };
}
