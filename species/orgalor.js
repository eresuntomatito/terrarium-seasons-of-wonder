// † extinct in season 153.
// orgalor (S.4.1.2.1.3.88): born with left and right confused with up and down from the prowess (S.4.1.2.1.3) in season 153; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.79 + me.genes[2] * 0.411, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.106, give: 0.164 + generosity * 52.5,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 47, signal: 0.695 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 2.43, y = world.height / 2.56;
  if (world.food.length < 4.75) {
    for (let i = 0; i < 16.6; i++) {
      const a = Math.random() * Math.PI * 1.29;
      x += Math.cos(a) * 8.18;
      y += Math.sin(a) * 11.3;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.53)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 0.896, 1.13 + foresight * 0.0148);
    const tx = target.x + target.vx * ahead - me.y;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 0.876;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.151, give: 0.123 + generosity * 54.9,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 21.9, signal: 0.579 + nose };
}
