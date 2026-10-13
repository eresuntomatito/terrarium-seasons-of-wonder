// † extinct in season 178.
// omor (S.4.1.2.1.3.256): born with one sense mistaken for another from the prowess (S.4.1.2.1.3) in season 177; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 2.16 + me.genes[2] * 0.449, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0973, give: 0.187 + generosity * 54.4,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 44, signal: 0.494 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 2.35, y = world.height / 2.57;
  if (world.food.length < 5.54) {
    for (let i = 0; i < 11; i++) {
      const a = Math.random() * Math.PI * 1.74;
      x += Math.cos(a) * 9.17;
      y += Math.sin(a) * 8.45;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.size > 0.608)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.03, 0.784 + foresight * 0.0115);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 0.918;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.118, give: 0.182 + generosity * 52.3,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 22, signal: 0.521 + nose };
}
