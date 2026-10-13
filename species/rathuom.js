// rathuom (S.4.1.2.1.3.194.1): born with left and right confused with up and down from the grazor3s (S.4.1.2.1.3.194) in season 168; named by the world.
// Field notes: these creatures now live as grazers (trophic level 2), gut 0.03 (0 = plant-eater … 1 = flesh-eater), body size 2.75.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.69 + me.genes[2] * 0.435, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0973, give: 0.186 + generosity * 49.7,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 45.3, signal: 0.64 + nose };
  }

  // Patrol the area when prey is scarce.
  let x = world.width / 1.99, y = world.height / 2.1;
  if (world.food.length < 5.09) {
    for (let i = 0; i < 13; i++) {
      const a = Math.random() * Math.PI * 1.47;
      x += Math.cos(a) * 10;
      y += Math.sin(a) * 10.1;
    }
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.543)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  if (target) {
    const ahead = Math.min(best / 1.24, 0.837 + foresight * 0.0102);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.x;
    const d = Math.hypot(tx, ty) || 1.03;
    x += tx / d;
    y += ty / d;
    // Eat only plants, and only if the plant has a larger size than the grass.
    const closestPlant = world.food.find(f => f.plant && Math.hypot(f.x - me.x, f.y - me.y) < best);
    if (closestPlant && closestPlant.size > best) {
    best = closestPlant.size;
    target = closestPlant;
    }
  }

  // Eat whatever food it touches.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.118, give: 0.132 + generosity * 49.1,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 28.3, signal: 0.635 + nose };
}
