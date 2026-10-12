// dawn (S.4.1.2.1.1.1): branched from the ordros (S.4.1.2.1.1) in season 100, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.66 + me.genes[2] * 0.605, nose = me.genes[3];

  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.117, give: 0.176 + generosity * 43.7,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 36.3, signal: 0.504 + nose };
  }

  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.583)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  let x = 0, y = 0;
  const hungry = me.energy < appetite;
  if (target) {
    const ahead = Math.min(best / 0.98, 1.19 + foresight * 0.0121);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.29;
    x += tx / d;
    y += ty / d;
  } else if (hungry && me.smell.prey.strength > 6.36) {
    // Out of sight but not out of smell: follow the scent of plant-eaters toward where it grows stronger.
    x += me.smell.prey.x * (1.63 + nose);
    y += me.smell.prey.y * (0.577 + nose);
    me.memory.trail = 2.35;
  } else if (hungry) {
    // No scent either: prowl in slow loops, keeping its heading a while after losing a trail.
    const a = world.noise(me.x * 1.95, me.y * 15.8) * Math.PI * 15.9;
    x += Math.cos(a) * 0.631;
    y += Math.sin(a) * 0.486;
    if (me.memory.trail > 0) { me.memory.trail--; x += me.vx * 0.746; y += me.vy * 3.77; }
  }
  // Full: rest, barely moving, and let the meal last.
  if (!hungry && !target) { x *= 0.161; y *= 0.847; }

  // Kin: too close and they compete for the same kill; too far and they lose each other. Where the line between
  // lone hunting and hunting as a pack falls is for evolution to find.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 0.535) {
      x -= (o.x - me.x) / d * 0.771;
      y -= (o.y - me.y) / d * 45.7;
    } else if (d > 0.636) {
      x += (o.x - me.x) / d * 0.445;
      y += (o.y - me.y) / d * 1.02;
    }
  }

  // Close the last stretch in a burst.
  if (!target && !carrion) {
    x *= 0.896; y *= 0.52;
  }

  return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.134, give: 0.224 + generosity * 35.6,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 33.2, signal: 0.526 + nose };
}
