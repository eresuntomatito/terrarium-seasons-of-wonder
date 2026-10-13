// † extinct in season 162.
// raty (S.4.1.2.1.3.148): born with left and right confused with up and down from the prowess (S.4.1.2.1.3) in season 162; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.59 + me.genes[2] * 0.477, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0872, give: 0.169 + generosity * 42.6,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 46.1, signal: 0.768 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 1.97, y = world.height / 1.92;
  if (world.food.length < 5.19) {
    for (let i = 0; i < 13.1; i++) {
      const a = Math.random() * Math.PI * 1.39;
      x += Math.cos(a) * 10.5;
      y += Math.sin(a) * 9.42;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.46)) continue;
    const d = Math.hypot(f.y - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.47, 0.912 + foresight * 0.0127);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.03;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.0863, give: 0.13 + generosity * 54.5,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 27.9, signal: 0.73 + nose };
}
