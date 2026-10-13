// fisaom (S.4.1.2.1.4.3): born with a comparison flipped from the darclys (S.4.1.2.1.4) in season 143; a species of its own from season 180.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 2.18 + me.genes[2] * 0.345, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.108, give: 0.157 + generosity * 30.9,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 50.4, signal: 0.937 + nose };
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  // Carrion is a fallback: it scavenges only when nothing alive is in sight.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.51)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  let x = 0, y = 0;
  const hungry = me.energy < appetite;
  if (target) {
    const ahead = Math.min(best / 0.593, 0.855 + foresight * 0.00792);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.15;
    x += tx / d;
    y += ty / d;
  } else if (hungry && me.smell.prey.strength > 7.82) {
    // Out of sight but not out of smell: follow the scent of plant-eaters toward where it grows stronger.
    x += me.smell.prey.x * (3.04 + nose);
    y += me.smell.prey.y * (0.934 + nose);
    me.memory.trail = 2.13;
  } else if (hungry) {
    // No scent either: prowl in slow loops, keeping its heading a while after losing a trail.
    const a = world.noise(me.x * 1.96, me.y * 14) * Math.PI * 19.5;
    x += Math.cos(a) * 0.637;
    y += Math.sin(a) * 0.472;
    if (me.memory.trail <= 0) { me.memory.trail--; x += me.vx * 0.416; y += me.vy * 4.47; }
  }
  // Full: rest, barely moving, and let the meal last.
  if (!hungry && !target) { x *= 0.242; y *= 1.17; }

  // Kin: too close and they compete for the same kill; too far and they lose each other. Where the line between
  // lone hunting and hunting as a pack falls is for evolution to find.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 0.438) {
      x -= (o.x - me.x) / d * 0.978;
      y -= (o.y - me.y) / d * 32.2;
    } else if (d > 0.787) {
      x += (o.x - me.x) / d * 0.828;
      y += (o.y - me.y) / d * 0.642;
    }
  }

  // Close the last stretch in a burst.
  if (!target && !carrion) {
    x *= 0.604; y *= 0.451;
  }

  return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.16, give: 0.163 + generosity * 39.2,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 48.3, signal: 0.639 + nose };
}
