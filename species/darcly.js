// † extinct in season 144.
// ↺ returned in season 136.
// † extinct in season 136.
// ↺ returned in season 131.
// † extinct in season 127.
// darcly (S.4.1.2.1.4): written by qwen2.5-coder:1.5b after the ketys (S.4.1.2.1) collapsed, in season 112.
// lesson the jades (S.4.1) lasted 14.5 days, grew to 238, killed 4651; then 967 starved, 144 were eaten, 36 died old. 414 plant-eaters were left.
// lesson the quisas (S.4.1.1) lasted 11.8 days, grew to 47, killed 1814; then 390 starved, 44 were eaten, 37 died old. 49 plant-eaters were left.
// lesson the gliders (S.4.1.2) lasted 20.2 days, grew to 209, killed 5604; then 1145 starved, 272 were eaten, 113 died old. 237 plant-eaters were left.
// lesson the ketys (S.4.1.2.1) lasted 15 days, grew to 436, killed 5348; then 1159 starved, 179 were eaten, 51 died old. 3 plant-eaters were left.
// lesson the ordros (S.4.1.2.1.1) lasted 20 days, grew to 192, killed 5494; then 1200 starved, 214 were eaten, 1 died old. 8 plant-eaters were left.
// lesson the mothubels (S.4.1.2.1.1.2) lasted 4.1 days, grew to 101, killed 1030; then 313 starved, 46 were eaten, 0 died old. 8 plant-eaters were left.
// lesson the dawns (S.4.1.2.1.1.1) lasted 5.6 days, grew to 132, killed 1481; then 433 starved, 52 were eaten, 0 died old. 5 plant-eaters were left.
// lesson the ketys (S.4.1.2.1) lasted 30.7 days, grew to 359, killed 11337; then 2643 starved, 568 were eaten, 180 died old. 7 plant-eaters were left.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.55 + me.genes[2] * 0.449, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.125, give: 0.152 + generosity * 50,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 36.2, signal: 0.801 + nose };
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  // Carrion is a fallback: it scavenges only when nothing alive is in sight.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.711)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  let x = 0, y = 0;
  const hungry = me.energy < appetite;
  if (target) {
    const ahead = Math.min(best / 0.972, 1.06 + foresight * 0.00905);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.2;
    x += tx / d;
    y += ty / d;
  } else if (hungry && me.smell.prey.strength > 7.81) {
    // Out of sight but not out of smell: follow the scent of plant-eaters toward where it grows stronger.
    x += me.smell.prey.x * (2.23 + nose);
    y += me.smell.prey.y * (0.554 + nose);
    me.memory.trail = 2.91;
  } else if (hungry) {
    // No scent either: prowl in slow loops, keeping its heading a while after losing a trail.
    const a = world.noise(me.x * 2.03, me.y * 12.8) * Math.PI * 21.6;
    x += Math.cos(a) * 0.726;
    y += Math.sin(a) * 0.606;
    if (me.memory.trail > 0) { me.memory.trail--; x += me.vx * 0.623; y += me.vy * 3.77; }
  }
  // Full: rest, barely moving, and let the meal last.
  if (!hungry && !target) { x *= 0.213; y *= 0.865; }

  // Kin: too close and they compete for the same kill; too far and they lose each other. Where the line between
  // lone hunting and hunting as a pack falls is for evolution to find.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 0.486) {
      x -= (o.x - me.x) / d * 1.02;
      y -= (o.y - me.y) / d * 47.5;
    } else if (d > 0.714) {
      x += (o.x - me.x) / d * 0.478;
      y += (o.y - me.y) / d * 0.869;
    }
  }

  // Close the last stretch in a burst.
  if (!target && !carrion) {
    x *= 0.717; y *= 0.542;
  }

  return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.147, give: 0.168 + generosity * 37,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 31.2, signal: 0.625 + nose };
}
