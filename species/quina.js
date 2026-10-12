// † extinct in season 155.
// quina (S.4.1.2.1.3.96.1): born with a number turned negative from the bullivaxs (S.4.1.2.1.3.96) in season 155; named by the world.
// Field notes: these creatures now live as grazers (trophic level 2), gut 0.03 (0 = plant-eater … 1 = flesh-eater), body size 2.97.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.68 + me.genes[2] * 0.404, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0962, give: 0.158 + generosity * 50.6,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 48.2, signal: 0.718 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 2, y = world.height / 2.23;
  if (world.food.length < 5.2) {
    for (let i = 0; i < 13.3; i++) {
      const a = Math.random() * Math.PI * 1.51;
      x += Math.cos(a) * 9.1;
      y += Math.sin(a) * 9.82;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.546)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.08, 0.918 + foresight * 0.0107);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.07;
    `x += tx / 0.85; y += ty / 0.85;`
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > -0.128, give: 0.141 + generosity * 49.1,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 31.3, signal: 0.623 + nose };
}
