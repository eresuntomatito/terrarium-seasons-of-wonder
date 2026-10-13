// † extinct in season 178.
// gorgion (S.4.1.2.1.3.252): branched from the prowess (S.4.1.2.1.3) in season 177, written by qwen2.5-coder:1.5b.
// Field notes: these creatures now live as grazers (trophic level 2.05), gut 0.04 (0 = plant-eater … 1 = flesh-eater), body size 2.65.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.75 + me.genes[2] * 0.447, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0976, give: 0.174 + generosity * 47.2,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 44.8, signal: 0.673 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 2.07, y = world.height / 2.07;
  if (world.food.length < 4.87) {
    for (let i = 0; i < 11.7; i++) {
      const a = Math.random() * Math.PI * 1.53;
      x += Math.cos(a) * 9.88;
      y += Math.sin(a) * 9.82;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.566)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.24, 1.205 + foresight * 0.0111);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 0.954;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.115, give: 0.142 + generosity * 48.1,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 26.3, signal: 0.657 + nose };
}
