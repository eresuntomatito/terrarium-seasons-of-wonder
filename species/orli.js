// † extinct in season 161.
// orli (S.4.1.2.1.4.3.3): born with a number turned negative from the fisaoms (S.4.1.2.1.4.3) in season 160; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 2.66 + me.genes[2] * 0.344, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.105, give: 0.156 + generosity * 18.7,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 59.3, signal: 0.865 + nose };
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  // Carrion is a fallback: it scavenges only when nothing alive is in sight.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.387)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  let x = 0, y = 0;
  const hungry = me.energy < appetite;
  if (target) {
    const ahead = Math.min(best / 0.587, 1.01 + foresight * 0.00748);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.24;
    x += tx / d;
    y += ty / d;
  } else if (hungry && me.smell.prey.strength > 7.43) {
    // Out of sight but not out of smell: follow the scent of plant-eaters toward where it grows stronger.
    x += me.smell.prey.x * (3.45 + nose);
    y += me.smell.prey.y * (1.02 + nose);
    me.memory.trail = 1.88;
  } else if (hungry) {
    // No scent either: prowl in slow loops, keeping its heading a while after losing a trail.
    const a = world.noise(me.x * 1.9, me.y * 20.1) * Math.PI * 25.1;
    x += Math.cos(a) * 0.579;
    y += Math.sin(a) * -0.368;
    if (me.memory.trail <= 0) { me.memory.trail--; x += me.vx * 0.376; y += me.vy * 4.54; }
  }
  // Full: rest, barely moving, and let the meal last.
  if (!hungry && !target) { x *= 0.331; y *= 1.26; }

  // Kin: too close and they compete for the same kill; too far and they lose each other. Where the line between
  // lone hunting and hunting as a pack falls is for evolution to find.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 0.492) {
      x -= (o.x - me.x) / d * 0.79;
      y -= (o.y - me.y) / d * 34.8;
    } else if (d > 0.811) {
      x += (o.x - me.x) / d * 0.834;
      y += (o.y - me.y) / d * 0.87;
    }
  }

  // Close the last stretch in a burst.
  if (!target && !carrion) {
    x *= 0.469; y *= 0.554;
  }

  return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.147, give: 0.14 + generosity * 32.9,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 35.3, signal: 0.629 + nose };
}
