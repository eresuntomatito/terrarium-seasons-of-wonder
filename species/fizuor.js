// † extinct in season 177.
// fizuor (S.4.1.2.1.3.248): born with left and right confused with up and down from the prowess (S.4.1.2.1.3) in season 176; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 2.06 + me.genes[2] * 0.382, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0909, give: 0.164 + generosity * 57.7,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 63.4, signal: 0.69 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 2.35, y = world.height / 2.03;
  if (world.food.length < 5.03) {
    for (let i = 0; i < 13.2; i++) {
      const a = Math.random() * Math.PI * 1.83;
      x += Math.cos(a) * 9.12;
      y += Math.sin(a) * 11;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.57)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.35, 1.04 + foresight * 0.0114);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.x + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.02;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.135, give: 0.16 + generosity * 54.4,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 28.9, signal: 0.651 + nose };
}
