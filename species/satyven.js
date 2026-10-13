// satyven (S.4.1.2.1.3.193): drifted apart from the prowess (S.4.1.2.1.3) in season 167; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.69 + me.genes[2] * 0.414, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0962, give: 0.178 + generosity * 48.4,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 44.8, signal: 0.673 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 1.94, y = world.height / 2.02;
  if (world.food.length < 4.75) {
    for (let i = 0; i < 13.1; i++) {
      const a = Math.random() * Math.PI * 1.4;
      x += Math.cos(a) * 9.92;
      y += Math.sin(a) * 9.63;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.551)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.21, 0.884 + foresight * 0.0109);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.03;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.118, give: 0.137 + generosity * 50.1,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 28.3, signal: 0.645 + nose };
}
