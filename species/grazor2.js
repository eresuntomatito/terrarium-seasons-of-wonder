// grazor2 (S.4.1.2.1.3.51): branched from the prowess (S.4.1.2.1.3) in season 147, written by qwen2.5-coder:1.5b.
// Field notes: these creatures now live as grazers (trophic level 2.02), gut 0.05 (0 = plant-eater … 1 = flesh-eater), body size 3.32.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.66 + me.genes[2] * 0.419, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
  const x = me.memory.lastHunt.x;
  const y = me.memory.lastHunt.y;
  return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.101, give: 0.157 + generosity * 49,
  // Close the last stretch in a burst.
  sprint: !!target && !target.corpse && best < 58.3, signal: 0.722 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 2.19, y = world.height / 2.1;
  if (world.food.length < 5.01) {
    for (let i = 0; i < 12.4; i++) {
      const a = Math.random() * Math.PI * 1.49;
      x += Math.cos(a) * 9.12;
      y += Math.sin(a) * 9.88;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.538)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.1, 0.937 + foresight * 0.0103);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.13;
    x += tx / d;
    y += ty / d;
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.127, give: 0.143 + generosity * 45.4,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 31.8, signal: 0.68 + nose };
}
