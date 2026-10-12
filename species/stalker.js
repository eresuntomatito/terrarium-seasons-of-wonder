// ↺ returned in season 44.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.2 + me.genes[2] * 0.8, nose = me.genes[3];

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  // Carrion is a fallback: it scavenges only when nothing alive is in sight.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.5)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  let x = 0, y = 0;
  const hungry = me.energy < appetite;
  if (target) {
    const ahead = Math.min(best / 3, 10 + foresight * 20);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1;
    x += tx / d;
    y += ty / d;
  } else if (hungry && me.smell.prey.strength > 0.02) {
    // Out of sight but not out of smell: follow the scent of plant-eaters toward where it grows stronger.
    x += me.smell.prey.x * (0.5 + nose);
    y += me.smell.prey.y * (0.5 + nose);
    me.memory.trail = 30;
  } else if (hungry) {
    // No scent either: prowl in slow loops, keeping its heading a while after losing a trail.
    const a = world.noise(me.x * 0.5, me.y * 0.5) * Math.PI * 4;
    x += Math.cos(a) * 0.5;
    y += Math.sin(a) * 0.5;
    if (me.memory.trail > 0) { me.memory.trail--; x += me.vx * 0.3; y += me.vy * 0.3; }
  }
  // Full: rest, barely moving, and let the meal last.
  if (!hungry && !target) { x *= 0.2; y *= 0.2; }

  // Kin: too close and they compete for the same kill; too far and they lose each other. Where the line between
  // lone hunting and hunting as a pack falls is for evolution to find.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 25) {
      x -= (o.x - me.x) / d * 0.5;
      y -= (o.y - me.y) / d * 0.5;
    } else if (d > 60) {
      x += (o.x - me.x) / d * 0.15;
      y += (o.y - me.y) / d * 0.15;
    }
  }

  return { x, y, eat: hungry, mate: me.fertile && me.energy > 1.3, give: 0.4 + generosity * 0.3,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 35 };
}
