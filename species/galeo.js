// ↺ returned in season 108.
// † extinct in season 107.
// galeo (S.4.1.2.1.2): branched from the ketys (S.4.1.2.1) in season 101, written by qwen2.5-coder:1.5b.
// Behavior of the new species that differs significantly from the original creature's behavior.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.57 + me.genes[2] * 0.509, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.125, give: 0.146 + generosity * 45,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 41, signal: 0.798 + nose };
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  // Carrion is a fallback: it scavenges only when nothing alive is in sight.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.611)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  let x = 0, y = 0;
  const hungry = me.energy < appetite;
  if (target) {
    const ahead = Math.min(best / 1.04, 0.991 + foresight * 0.00941);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.28;
    x += tx / d;
    y += ty / d;
  } else if (hungry && me.smell.prey.strength > 6.48) {
    // Out of sight but not out of smell: follow the scent of plant-eaters toward where it grows stronger.
    x += me.smell.prey.x * (1.97 + nose);
    y += me.smell.prey.y * (0.541 + nose);
    me.memory.trail = 2.72;
  } else if (hungry) {
    // No scent either: prowl in slow loops, keeping its heading a while after losing a trail.
    const a = world.noise(me.x * 1.96, me.y * 13.5) * Math.PI * 21.4;
    x += Math.cos(a) * 0.81;
    y += Math.sin(a) * 0.543;
    if (me.memory.trail > 0) { me.memory.trail--; x += me.vx * 0.603; y += me.vy * 3.41; }
  }
  // Full: rest, barely moving, and let the meal last.
  if (!hungry && !target) { x *= 0.199; y *= 0.795; }

  // Kin: too close and they compete for the same kill; too far and they lose each other. Where the line between
  // lone hunting and hunting as a pack falls is for evolution to find.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 0.53) {
      x -= (o.x - me.x) / d * 0.826;
      y -= (o.y - me.y) / d * 46.2;
    } else if (d > 0.57) {
      x += (o.x - me.x) / d * 0.514;
      y += (o.y - me.y) / d * 0.955;
    }
  }

  // Close the last stretch in a burst.
  if (!target && !carrion) {
    x *= 0.804; y *= 0.494;
  }

  return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.147, give: 0.166 + generosity * 40.9,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 33.2, signal: 0.663 + nose };
}
