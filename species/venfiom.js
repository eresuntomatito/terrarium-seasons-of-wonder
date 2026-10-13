// † extinct in season 165.
// venfiom (S.4.1.2.1.4.3.4): born with one urge forgotten from the fisaoms (S.4.1.2.1.4.3) in season 165; named by the world.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 2.71 + me.genes[2] * 0.317, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.0962, give: 0.151 + generosity * 22.4,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 57.3, signal: 0.935 + nose };
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  // Carrion is a fallback: it scavenges only when nothing alive is in sight.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.371)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  let x = 0, y = 0;
  const hungry = me.energy < appetite;
  if (target) {
    const ahead = Math.min(best / 0.574, 0.977 + foresight * 0.00724);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.27;
    x += tx / d;
    y += ty / d;
  } else if (hungry && me.smell.prey.strength > 7.12) {

    y += me.smell.prey.y * (1.18 + nose);
    me.memory.trail = 1.54;
  } else if (hungry) {
    // No scent either: prowl in slow loops, keeping its heading a while after losing a trail.
    const a = world.noise(me.x * 2.19, me.y * 19.1) * Math.PI * 26.2;
    x += Math.cos(a) * 0.589;
    y += Math.sin(a) * 0.44;
    if (me.memory.trail <= 0) { me.memory.trail--; x += me.vx * 0.337; y += me.vy * 5.27; }
  }
  // Full: rest, barely moving, and let the meal last.
  if (!hungry && !target) { x *= 0.323; y *= 1.14; }

  // Kin: too close and they compete for the same kill; too far and they lose each other. Where the line between
  // lone hunting and hunting as a pack falls is for evolution to find.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 0.587) {
      x -= (o.x - me.x) / d * 1.09;
      y -= (o.y - me.y) / d * 30.7;
    } else if (d > 0.761) {
      x += (o.x - me.x) / d * 0.987;
      y += (o.y - me.y) / d * 0.834;
    }
  }

  // Close the last stretch in a burst.
  if (!target && !carrion) {
    x *= 0.495; y *= 0.529;
  }

  return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.179, give: 0.15 + generosity * 35.8,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 31.6, signal: 0.674 + nose };
}
