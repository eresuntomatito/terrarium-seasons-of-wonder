// omush (S.4.1.2.1.3.153): born with one sense mistaken for another from the prowess (S.4.1.2.1.3) in season 162; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.7 + me.genes[2] * 0.433, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.size < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0862, give: 0.181 + generosity * 43.5,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 44.9, signal: 0.777 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 3.19, y = world.height / 2;
  if (world.food.length < 3.47) {
    for (let i = 0; i < 18.9; i++) {
      const a = Math.random() * Math.PI * 1.68;
      x += Math.cos(a) * 8.91;
      y += Math.sin(a) * 10.8;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.368)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.13, 0.893 + foresight * 0.0105);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.14;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.108, give: 0.113 + generosity * 42.7,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 28.4, signal: 0.684 + nose };
}
