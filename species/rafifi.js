// † extinct in season 166.
// rafifi (S.4.1.2.1.3.180): born with left and right confused with up and down from the prowess (S.4.1.2.1.3) in season 166; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.81 + me.genes[2] * 0.291, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0713, give: 0.205 + generosity * 48.7,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 40.5, signal: 0.645 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 1.94, y = world.height / 2.45;
  if (world.food.length < 3.64) {
    for (let i = 0; i < 13.7; i++) {
      const a = Math.random() * Math.PI * 1.18;
      x += Math.cos(a) * 9.14;
      y += Math.sin(a) * 10.3;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.44)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 0.927, 0.753 + foresight * 0.00925);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.x + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.09;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.129, give: 0.132 + generosity * 66.6,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 28.2, signal: 0.692 + nose };
}
